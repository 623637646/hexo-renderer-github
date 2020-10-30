import * as Hexo from 'hexo'
import * as Crawler from 'crawler'
import * as Keyv from "keyv";
import KeyvFile from 'keyv-file'

interface CategoryConfig {
    category: string
    repos: string[]
}

interface Repo {
    user: string
    name: string
    about: string
    stars: number
    starsString: string
    tags: string[]
    images: string[]
}

interface Category {
    name: string
    repos: Repo[]
}

const userSelector = "#js-repo-pjax-container > div > div > div > h1 > span > a"
const nameSelector = "#js-repo-pjax-container > div > div > div > h1 > strong > a"
const aboutSelector = "#js-repo-pjax-container > div > div > div > div > div > div > div > p"
const starsSelector = "#js-repo-pjax-container > div > div > ul > li > a.social-count.js-social-count"
const tagsSelector = ".topic-tag"
const imagesSelector = "#readme img"
const crawler = new Crawler({
    maxConnections: 1
});
const keyv = new Keyv({
    store: new KeyvFile({
        expiredCheckDelay: 0,
        filename: './cache/keyv-file.json'
    })
})
const cacheExpired = 60 * 60 * 24 * 7 * 1000

async function doCrawler(URL: string) {
    return new Promise<Repo>(function (resolve, reject): void {
        crawler.queue({
            uri: URL,
            callback: function (err: Error, res: Crawler.CrawlerRequestResponse, done: () => void): void {
                console.log(`[hexo-renderer-github] Crawler done: ${URL}`)
                if (err || res.statusCode != 200) {
                    reject(err ? err : new Error(`[hexo-renderer-github] statusCode of response from ${URL} is not 200: statusCode: ${res.statusCode}, statusMessage: ${res.statusMessage}`))
                } else {
                    let $ = res.$
                    let repo: Repo = {
                        user: $(userSelector).text().trim(),
                        name: $(nameSelector).text().trim(),
                        about: $(aboutSelector).text().trim(),
                        starsString: $(starsSelector).text().trim(),
                        stars: +$(starsSelector).attr('aria-label').replace(/ .*/s, ""),
                        tags: $(tagsSelector).map(function (index, repo) {
                            return $(repo).text().trim()
                        }).get(),
                        images: $(imagesSelector).map(function (index, repo) {
                            let URL = repo.attribs.src
                            if (URL.startsWith('/')) {
                                URL = 'https://github.com' + URL
                            }
                            if (!URL.includes('%')) {
                                URL = encodeURI(URL)
                            }
                            return URL
                        }).get().filter(function (URL: string) {
                            return !URL.startsWith('https://camo.githubusercontent.com')
                        })
                    }
                    if (!repo.name || !repo.starsString) {
                        reject(new Error(`[hexo-renderer-github] Repo from ${URL} is wrong: ${JSON.stringify(repo)}`))
                    } else {
                        resolve(repo)
                    }
                }
                done()
            }
        })
    })
}

async function generateRepo(URL: string) {
    let repoInCache = await keyv.get(URL) as Repo
    if (repoInCache) {
        console.log(`[hexo-renderer-github] Cache hit: ${URL}`)
        return repoInCache
    }
    let repoFromCrawler = await doCrawler(URL)
    let saved = await keyv.set(URL, repoFromCrawler, cacheExpired)
    if (!saved) {
        throw new Error('saved error')
    }
    return repoFromCrawler
}

async function generateCategories(categoryConfigs: CategoryConfig[]) {
    let all = categoryConfigs.map(function (categoryConfig) {
        let all = categoryConfig.repos.map(function (URL) {
            return generateRepo(URL)
        })
        return Promise.all(all).then((repos) => {
            repos = repos.sort(function (a, b) {
                return b.stars - a.stars
            })
            return {
                name: categoryConfig.category,
                repos: repos
            } as Category
        })
    })

    return Promise.all(all)
}

function getRepoURL(user: string, name: string) {
    return `https://github.com/${user}/${name}`
}

function getMarkdownWithRepo(repo: Repo) {
    let markdown = ""

    // name
    markdown += `### [${repo.name}](${getRepoURL(repo.user, repo.name)})\n\n`

    // stars and tags
    let starsAndTags = `stars:${repo.starsString}`
    if (repo.tags.length > 0) {
        starsAndTags += `    <${repo.tags.join(', ')}>`
    }
    markdown += starsAndTags + '\n\n'

    // about
    if (repo.about) {
        markdown += `> ${repo.about}\n\n`
    }

    // image
    if (repo.images) {
        repo.images.forEach(imageURL => {
            markdown += `<p><img data-src="${imageURL}" class="lazyload"></p>\n\n`
        });
    }
    return markdown
}

function getMarkdownWithCategory(category: Category) {
    let markdown = ""
    markdown += `## ${category.name}\n\n`
    category.repos.forEach(repo => {
        markdown += getMarkdownWithRepo(repo) + '\n\n'
    })
    return markdown
}

function getMarkdownWithCategories(categories: Category[]) {
    let markdown = ""
    categories.forEach(category => {
        markdown += getMarkdownWithCategory(category) + '\n\n'
    });
    return markdown
}

hexo.extend.renderer.register('github', 'html', async function (data, options) {
    let json = data.text.replace(/---.*?---/s, "")
    let categoryConfigs: CategoryConfig[] = JSON.parse(json);
    let categories = await generateCategories(categoryConfigs)
    let markdown = getMarkdownWithCategories(categories)
    console.log(`\n[hexo-renderer-github] markdown log:\n/**\n\n${markdown}\n\n**/\n[hexo-renderer-github] markdown end\n`)

    let htmlPromise: Promise<string> = (hexo.extend.renderer as any).get('md').call(hexo, {
        text: markdown,
        path: data.path
    }, options)

    let html = await htmlPromise
    html = '<script src="https://afarkas.github.io/lazysizes/lazysizes.min.js" async=""></script>' + html
    return html
})

