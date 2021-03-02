"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var Crawler = require("crawler");
var Keyv = require("keyv");
var keyv_file_1 = require("keyv-file");
var userSelector = "#js-repo-pjax-container > div > div > div > h1 > span > a";
var nameSelector = "#js-repo-pjax-container > div > div > div > h1 > strong > a";
var aboutSelector = "#js-repo-pjax-container > div > div > div > div > div > div > div > p";
var starsSelector = "#js-repo-pjax-container > div > div > ul > li > a.social-count.js-social-count";
var tagsSelector = ".topic-tag";
var imagesSelector = "#readme img";
var crawler = new Crawler({
    maxConnections: 1
});
var keyv = new Keyv({
    store: new keyv_file_1["default"]({
        expiredCheckDelay: 0,
        filename: './cache/keyv-file.json'
    })
});
var cacheExpired = 60 * 60 * 24 * 7 * 1000;
function doCrawler(URL) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, new Promise(function (resolve, reject) {
                    crawler.queue({
                        uri: URL,
                        callback: function (err, res, done) {
                            console.log("[hexo-renderer-github] Crawler done: " + URL);
                            if (err || res.statusCode != 200) {
                                reject(err ? err : new Error("[hexo-renderer-github] statusCode of response from " + URL + " is not 200: statusCode: " + res.statusCode + ", statusMessage: " + res.statusMessage));
                            }
                            else {
                                var $_1 = res.$;
                                var repo = {
                                    user: $_1(userSelector).text().trim(),
                                    name: $_1(nameSelector).text().trim(),
                                    about: $_1(aboutSelector).text().trim(),
                                    starsString: $_1(starsSelector).text().trim(),
                                    stars: +$_1(starsSelector).attr('aria-label').replace(/ .*/s, ""),
                                    tags: $_1(tagsSelector).map(function (index, repo) {
                                        return $_1(repo).text().trim();
                                    }).get(),
                                    images: $_1(imagesSelector).map(function (index, repo) {
                                        var URL = repo.attribs.src;
                                        if (URL.startsWith('/')) {
                                            URL = 'https://github.com' + URL;
                                        }
                                        if (!URL.includes('%')) {
                                            URL = encodeURI(URL);
                                        }
                                        return URL;
                                    }).get()
                                };
                                if (!repo.name || !repo.starsString) {
                                    reject(new Error("[hexo-renderer-github] Repo from " + URL + " is wrong: " + JSON.stringify(repo)));
                                }
                                else {
                                    resolve(repo);
                                }
                            }
                            done();
                        }
                    });
                })];
        });
    });
}
function generateRepo(URL) {
    return __awaiter(this, void 0, void 0, function () {
        var repoInCache, repoFromCrawler, saved;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, keyv.get(URL)];
                case 1:
                    repoInCache = _a.sent();
                    if (repoInCache) {
                        console.log("[hexo-renderer-github] Cache hit: " + URL);
                        return [2 /*return*/, repoInCache];
                    }
                    return [4 /*yield*/, doCrawler(URL)];
                case 2:
                    repoFromCrawler = _a.sent();
                    return [4 /*yield*/, keyv.set(URL, repoFromCrawler, cacheExpired)];
                case 3:
                    saved = _a.sent();
                    if (!saved) {
                        throw new Error('saved error');
                    }
                    return [2 /*return*/, repoFromCrawler];
            }
        });
    });
}
function generateCategories(categoryConfigs) {
    return __awaiter(this, void 0, void 0, function () {
        var all;
        return __generator(this, function (_a) {
            all = categoryConfigs.map(function (categoryConfig) {
                var all = categoryConfig.repos.map(function (URL) {
                    return generateRepo(URL);
                });
                return Promise.all(all).then(function (repos) {
                    repos = repos.sort(function (a, b) {
                        return b.stars - a.stars;
                    });
                    return {
                        name: categoryConfig.category,
                        repos: repos
                    };
                });
            });
            return [2 /*return*/, Promise.all(all)];
        });
    });
}
function getRepoURL(user, name) {
    return "https://github.com/" + user + "/" + name;
}
function getMarkdownWithRepo(repo) {
    var markdown = "";
    // name
    markdown += "### [" + repo.name + "](" + getRepoURL(repo.user, repo.name) + ")\n\n";
    // stars and tags
    var starsAndTags = "stars:" + repo.starsString;
    if (repo.tags.length > 0) {
        starsAndTags += "    <" + repo.tags.join(', ') + ">";
    }
    markdown += starsAndTags + '\n\n';
    // about
    if (repo.about) {
        markdown += "> " + repo.about + "\n\n";
    }
    // image
    if (repo.images) {
        repo.images.forEach(function (imageURL) {
            // image lazy load
            // markdown += `<p><img data-src="${imageURL}" class="lazyload"></p>\n\n`
            markdown += "![](" + imageURL + ")";
        });
    }
    return markdown;
}
function getMarkdownWithCategory(category) {
    var markdown = "";
    markdown += "## " + category.name + "\n\n";
    category.repos.forEach(function (repo) {
        markdown += getMarkdownWithRepo(repo) + '\n\n';
    });
    return markdown;
}
function getMarkdownWithCategories(categories) {
    var markdown = "";
    categories.forEach(function (category) {
        markdown += getMarkdownWithCategory(category) + '\n\n';
    });
    return markdown;
}
hexo.extend.renderer.register('github', 'html', function (data, options) {
    return __awaiter(this, void 0, void 0, function () {
        var json, categoryConfigs, categories, markdown, htmlPromise, html;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    json = data.text.replace(/---.*?---/s, "");
                    categoryConfigs = JSON.parse(json);
                    return [4 /*yield*/, generateCategories(categoryConfigs)];
                case 1:
                    categories = _a.sent();
                    markdown = getMarkdownWithCategories(categories);
                    console.log("\n[hexo-renderer-github] markdown log:\n/**\n\n" + markdown + "\n\n**/\n[hexo-renderer-github] markdown end\n");
                    htmlPromise = hexo.extend.renderer.get('md').call(hexo, {
                        text: markdown,
                        path: data.path
                    }, options);
                    return [4 /*yield*/, htmlPromise
                        // image lazy load
                        // html = '<script src="https://afarkas.github.io/lazysizes/lazysizes.min.js" async=""></script>' + html
                    ];
                case 2:
                    html = _a.sent();
                    // image lazy load
                    // html = '<script src="https://afarkas.github.io/lazysizes/lazysizes.min.js" async=""></script>' + html
                    return [2 /*return*/, html];
            }
        });
    });
});
