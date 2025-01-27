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
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
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
import 'dotenv/config';
import { chromium } from 'playwright';
import { db } from '../db';
import { races, tanOddsHistory, fukuOdds, wakurenOdds, umarenOdds, wideOdds, umatanOdds, fuku3Odds, tan3Odds } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import * as cheerio from 'cheerio';
var BATCH_SIZES = {
    tanpuku: 20, // 単複（比較的少量）
    wakuren: 40, // 枠連（中程度）
    umaren: 200, // 馬連（中程度）
    wide: 200, // ワイド（中程度）
    umatan: 400, // 馬単（多め）
    fuku3: 1000, // 3連複（大量）
    tan3: 1000 // 3連単（大量）
};
var OddsCollector = /** @class */ (function () {
    function OddsCollector() {
        this.browser = null;
        this.betTypes = {
            tanpuku: {
                tabName: '単勝・複勝',
                tableSelector: 'table.basic.narrow-xy.tanpuku',
                parser: this.parseTanpukuOdds.bind(this)
            },
            wakuren: {
                tabName: '枠連',
                tableSelector: 'table.basic.narrow-xy.waku',
                parser: this.parseWakurenOdds.bind(this)
            },
            umaren: {
                tabName: '馬連',
                tableSelector: 'table.basic.narrow-xy.umaren',
                parser: this.parseUmarenOdds.bind(this)
            },
            wide: {
                tabName: 'ワイド',
                tableSelector: 'table.basic.narrow-xy.wide',
                parser: this.parseWideOdds.bind(this)
            },
            umatan: {
                tabName: '馬単',
                tableSelector: 'table.basic.narrow-xy.umatan',
                parser: this.parseUmatanOdds.bind(this)
            },
            fuku3: {
                tabName: '3連複',
                tableSelector: 'table.basic.narrow-xy.fuku3',
                parser: this.parseFuku3Odds.bind(this)
            },
            tan3: {
                tabName: '3連単',
                tableSelector: 'table.basic.narrow-xy.tan3',
                parser: this.parseTan3Odds.bind(this)
            },
            // 他の馬券種別も同様に定義
        };
    }
    OddsCollector.prototype.initialize = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _a = this;
                        return [4 /*yield*/, chromium.launch({
                                headless: true // デバッグ用にheadlessをfalseに設定
                            })];
                    case 1:
                        _a.browser = _b.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    OddsCollector.prototype.collectOddsForBetType = function (raceId, betType, pastRaceUrl) {
        return __awaiter(this, void 0, void 0, function () {
            var context, page, config, html;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.browser || !this.betTypes[betType]) {
                            throw new Error('Invalid configuration');
                        }
                        return [4 /*yield*/, this.browser.newContext()];
                    case 1:
                        context = _a.sent();
                        return [4 /*yield*/, context.newPage()];
                    case 2:
                        page = _a.sent();
                        _a.label = 3;
                    case 3:
                        _a.trys.push([3, , 12, 14]);
                        // 共通のページ遷移ロジック
                        return [4 /*yield*/, this.navigateToRacePage(page, raceId, pastRaceUrl)];
                    case 4:
                        // 共通のページ遷移ロジック
                        _a.sent();
                        config = this.betTypes[betType];
                        if (!(betType !== 'tanpuku')) return [3 /*break*/, 7];
                        return [4 /*yield*/, page.getByRole('link', { name: config.tabName }).click()];
                    case 5:
                        _a.sent();
                        return [4 /*yield*/, page.waitForLoadState('networkidle')];
                    case 6:
                        _a.sent();
                        _a.label = 7;
                    case 7: 
                    // テーブルの待機
                    return [4 /*yield*/, page.waitForSelector(config.tableSelector, { timeout: 30000 })];
                    case 8:
                        // テーブルの待機
                        _a.sent();
                        return [4 /*yield*/, page.waitForTimeout(2000)];
                    case 9:
                        _a.sent(); // 追加：データ読み込み待機
                        return [4 /*yield*/, page.content()];
                    case 10:
                        html = _a.sent();
                        console.log('Current URL:', page.url()); // デバッグ情報
                        console.log('Page content length:', html.length);
                        return [4 /*yield*/, config.parser(html, raceId)];
                    case 11: 
                    // 馬券種別固有のパース処理
                    return [2 /*return*/, _a.sent()];
                    case 12: return [4 /*yield*/, context.close()];
                    case 13:
                        _a.sent();
                        return [7 /*endfinally*/];
                    case 14: return [2 /*return*/];
                }
            });
        });
    };
    OddsCollector.prototype.navigateToRacePage = function (page, raceId, pastRaceUrl) {
        return __awaiter(this, void 0, void 0, function () {
            var oddsButton, raceIdStr, kaisaiKai, kaisaiNichi, kaisaiName, raceNumber;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!pastRaceUrl) return [3 /*break*/, 6];
                        // 過去レースの場合
                        return [4 /*yield*/, page.goto(pastRaceUrl)];
                    case 1:
                        // 過去レースの場合
                        _a.sent();
                        return [4 /*yield*/, page.waitForLoadState('networkidle')];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, page.locator('div.race_related_link a[href="#"]').first()];
                    case 3:
                        oddsButton = _a.sent();
                        return [4 /*yield*/, oddsButton.click()];
                    case 4:
                        _a.sent();
                        return [4 /*yield*/, page.waitForLoadState('networkidle')];
                    case 5:
                        _a.sent();
                        return [3 /*break*/, 15];
                    case 6: 
                    // 現在のレースの場合（既存のロジック）
                    return [4 /*yield*/, page.goto('https://www.jra.go.jp/keiba/')];
                    case 7:
                        // 現在のレースの場合（既存のロジック）
                        _a.sent();
                        return [4 /*yield*/, page.waitForLoadState('networkidle')];
                    case 8:
                        _a.sent();
                        return [4 /*yield*/, page.getByRole('link', { name: 'オッズ', exact: true }).click()];
                    case 9:
                        _a.sent();
                        return [4 /*yield*/, page.waitForLoadState('networkidle')];
                    case 10:
                        _a.sent();
                        raceIdStr = raceId.toString();
                        kaisaiKai = parseInt(raceIdStr.slice(6, 8)).toString();
                        kaisaiNichi = parseInt(raceIdStr.slice(8, 10)).toString();
                        kaisaiName = "".concat(kaisaiKai, "\u56DE").concat(placeMapping[raceIdStr.slice(4, 6)]).concat(kaisaiNichi, "\u65E5");
                        return [4 /*yield*/, page.getByRole('link', { name: kaisaiName }).click()];
                    case 11:
                        _a.sent();
                        return [4 /*yield*/, page.waitForLoadState('networkidle')];
                    case 12:
                        _a.sent();
                        raceNumber = parseInt(raceIdStr.slice(10, 12));
                        return [4 /*yield*/, page.locator("img[alt=\"".concat(raceNumber, "\u30EC\u30FC\u30B9\"]")).click()];
                    case 13:
                        _a.sent();
                        return [4 /*yield*/, page.waitForLoadState('networkidle')];
                    case 14:
                        _a.sent();
                        _a.label = 15;
                    case 15: return [2 /*return*/];
                }
            });
        });
    };
    // 各馬券種別のパーサー関数
    OddsCollector.prototype.parseTanpukuOdds = function (html, raceId) {
        return __awaiter(this, void 0, void 0, function () {
            var $, oddsData, processedHorseIds, currentFrame, remainingRowspan;
            return __generator(this, function (_a) {
                $ = cheerio.load(html);
                oddsData = [];
                processedHorseIds = new Set();
                currentFrame = 0;
                remainingRowspan = 0;
                console.log("Starting to parse odds for race ".concat(raceId));
                $('table.basic.narrow-xy.tanpuku tr').each(function (index, element) {
                    var _a;
                    var row = $(element);
                    // 馬番を取得
                    var horseNumberCell = row.find('td.num');
                    if (!horseNumberCell.length) {
                        console.log("Row ".concat(index, ": No horse number cell found"));
                        return;
                    }
                    var horseNumber = horseNumberCell.text().trim();
                    if (!horseNumber || isNaN(parseInt(horseNumber))) {
                        console.log("Row ".concat(index, ": Invalid horse number: ").concat(horseNumber));
                        return;
                    }
                    var horseId = parseInt(horseNumber);
                    if (processedHorseIds.has(horseId)) {
                        console.log("Row ".concat(index, ": Horse ").concat(horseId, " already processed"));
                        return;
                    }
                    // 枠番を取得
                    var wakuCell = row.find('td.waku');
                    if (wakuCell.length) {
                        var rowspanAttr = wakuCell.attr('rowspan');
                        remainingRowspan = rowspanAttr ? parseInt(rowspanAttr) : 1;
                        var wakuImg = wakuCell.find('img');
                        var wakuSrc = wakuImg.attr('src') || '';
                        var frameMatch = wakuSrc.match(/waku\/(\d+)\.png/);
                        currentFrame = frameMatch ? parseInt(frameMatch[1]) : 0;
                        console.log("Row ".concat(index, ": New frame ").concat(currentFrame, " (rowspan: ").concat(remainingRowspan, ")"));
                    }
                    if (currentFrame === 0) {
                        console.log("Row ".concat(index, ": Warning: Failed to get frame number for horse ").concat(horseId));
                        return;
                    }
                    // 馬名とオッズの取得
                    var horseName = row.find('td.horse a').text().trim();
                    var isCanceled = row.find('td.odds_tan_cancel').length > 0;
                    console.log("Processing horse: ".concat(horseName, " (ID: ").concat(horseId, ", Frame: ").concat(currentFrame, ")"));
                    console.log("Canceled status: ".concat(isCanceled));
                    console.log("HTML for odds cell:", row.find('td.odds_tan, td.odds_tan_cancel').html());
                    var tanOdds = NaN;
                    if (!isCanceled) {
                        var tanOddsText = row.find('td.odds_tan').text().trim().replace(/,/g, '');
                        tanOdds = parseFloat(tanOddsText);
                        console.log("Tan odds: ".concat(tanOddsText, " -> ").concat(tanOdds));
                    }
                    var fukuCell = row.find('td.odds_fuku');
                    var fukuText = fukuCell.text().trim().split('-');
                    var fukuMinText = fukuText[0].trim();
                    var fukuMaxText = ((_a = fukuText[1]) === null || _a === void 0 ? void 0 : _a.trim()) || fukuMinText;
                    var fukuOddsMin = parseFloat(fukuMinText);
                    var fukuOddsMax = parseFloat(fukuMaxText);
                    // データの追加
                    var horseData = {
                        horseId: horseId,
                        horseName: horseName,
                        frame: currentFrame,
                        number: horseId,
                        tanOdds: isCanceled ? -1 : tanOdds,
                        fukuOddsMin: isCanceled ? 0 : fukuOddsMin,
                        fukuOddsMax: isCanceled ? 0 : fukuOddsMax,
                        timestamp: new Date(),
                        raceId: raceId,
                        status: isCanceled ? 'scratched' : 'running'
                    };
                    console.log('Adding horse data:', horseData);
                    oddsData.push(horseData);
                    processedHorseIds.add(horseId);
                });
                console.log("Parsed ".concat(oddsData.length, " horses for race ").concat(raceId));
                console.log('Final odds data:', oddsData);
                return [2 /*return*/, oddsData];
            });
        });
    };
    OddsCollector.prototype.parseWakurenOdds = function (html, raceId) {
        return __awaiter(this, void 0, void 0, function () {
            var $, wakurenOddsData;
            return __generator(this, function (_a) {
                $ = cheerio.load(html);
                wakurenOddsData = [];
                // 全ての枠連テーブルを処理
                $('table.basic.narrow-xy.waku').each(function (_, table) {
                    var $table = $(table);
                    // テーブルのcaptionから軸となる枠番を取得
                    var captionClass = $table.find('caption').attr('class') || '';
                    var frame1 = parseInt(captionClass.replace('waku', ''));
                    console.log("Processing wakuren odds for frame1: ".concat(frame1));
                    // 各行を処理
                    $table.find('tr').each(function (_, row) {
                        var $row = $(row);
                        var frame2Text = $row.find('th').first().text().trim();
                        var frame2 = parseInt(frame2Text);
                        if (!isNaN(frame2)) {
                            var oddsText = $row.find('td').first().text().trim();
                            if (oddsText && oddsText !== '-') {
                                var odds = parseFloat(oddsText.replace(/,/g, ''));
                                if (!isNaN(odds)) {
                                    wakurenOddsData.push({
                                        frame1: frame1,
                                        frame2: frame2,
                                        odds: odds,
                                        timestamp: new Date(),
                                        raceId: raceId
                                    });
                                }
                            }
                        }
                    });
                });
                console.log("Collected total ".concat(wakurenOddsData.length, " wakuren odds combinations"));
                return [2 /*return*/, wakurenOddsData];
            });
        });
    };
    OddsCollector.prototype.parseUmarenOdds = function (html, raceId) {
        return __awaiter(this, void 0, void 0, function () {
            var $, umarenOddsData;
            return __generator(this, function (_a) {
                $ = cheerio.load(html);
                umarenOddsData = [];
                // 全ての馬連テーブルを処理
                $('table.basic.narrow-xy.umaren').each(function (_, table) {
                    var $table = $(table);
                    // テーブルのcaptionから軸となる馬番を取得
                    var captionText = $table.find('caption').text().trim();
                    var horse1 = parseInt(captionText); // 数値のみを取得
                    if (isNaN(horse1)) {
                        console.warn('Failed to parse horse1 number from caption:', captionText);
                        return;
                    }
                    // 各行を処理
                    $table.find('tbody tr').each(function (_, row) {
                        var $row = $(row);
                        var horse2Text = $row.find('th').first().text().trim();
                        var horse2 = parseInt(horse2Text);
                        if (!isNaN(horse2)) {
                            var oddsText = $row.find('td').first().text().trim();
                            if (oddsText && oddsText !== '-') {
                                var odds = parseFloat(oddsText.replace(/,/g, ''));
                                if (!isNaN(odds)) {
                                    umarenOddsData.push({
                                        horse1: horse1,
                                        horse2: horse2,
                                        odds: odds,
                                        timestamp: new Date(),
                                        raceId: raceId
                                    });
                                }
                            }
                        }
                    });
                });
                console.log("Collected total ".concat(umarenOddsData.length, " umaren odds combinations"));
                return [2 /*return*/, umarenOddsData];
            });
        });
    };
    // パーサー関数の実装
    OddsCollector.prototype.parseWideOdds = function (html, raceId) {
        return __awaiter(this, void 0, void 0, function () {
            var $, wideOddsData;
            return __generator(this, function (_a) {
                $ = cheerio.load(html);
                wideOddsData = [];
                // 全てのワイドテーブルを処理
                $('table.basic.narrow-xy.wide').each(function (_, table) {
                    var $table = $(table);
                    // テーブルのcaptionから軸となる馬番を取得
                    var captionText = $table.find('caption').text().trim();
                    var horse1 = parseInt(captionText);
                    if (isNaN(horse1)) {
                        console.warn('Failed to parse horse1 number from caption:', captionText);
                        return;
                    }
                    // 各行を処理
                    $table.find('tbody tr').each(function (_, row) {
                        var $row = $(row);
                        var horse2Text = $row.find('th').first().text().trim();
                        var horse2 = parseInt(horse2Text);
                        if (!isNaN(horse2)) {
                            // span.minとspan.maxから値を取得
                            var $odds = $row.find('td.odds');
                            var oddsMinText = $odds.find('span.min').text().trim();
                            var oddsMaxText = $odds.find('span.max').text().trim();
                            if (oddsMinText && oddsMaxText) {
                                var oddsMin = parseFloat(oddsMinText.replace(/,/g, ''));
                                var oddsMax = parseFloat(oddsMaxText.replace(/,/g, ''));
                                if (!isNaN(oddsMin) && !isNaN(oddsMax)) {
                                    wideOddsData.push({
                                        horse1: horse1,
                                        horse2: horse2,
                                        oddsMin: oddsMin,
                                        oddsMax: oddsMax,
                                        timestamp: new Date(),
                                        raceId: raceId
                                    });
                                }
                            }
                        }
                    });
                });
                console.log("Collected total ".concat(wideOddsData.length, " wide odds combinations"));
                return [2 /*return*/, wideOddsData];
            });
        });
    };
    // パーサー関数の実装
    OddsCollector.prototype.parseUmatanOdds = function (html, raceId) {
        return __awaiter(this, void 0, void 0, function () {
            var $, umatanOddsData;
            return __generator(this, function (_a) {
                $ = cheerio.load(html);
                umatanOddsData = [];
                // 全ての馬単テーブルを処理
                $('table.basic.narrow-xy.umatan').each(function (_, table) {
                    var $table = $(table);
                    // テーブルのcaptionから1着となる馬番を取得
                    var captionText = $table.find('caption').text().trim();
                    var horse1 = parseInt(captionText);
                    if (isNaN(horse1)) {
                        console.warn('Failed to parse horse1 number from caption:', captionText);
                        return;
                    }
                    // 各行を処理
                    $table.find('tbody tr').each(function (_, row) {
                        var $row = $(row);
                        var horse2Text = $row.find('th').first().text().trim();
                        var horse2 = parseInt(horse2Text);
                        if (!isNaN(horse2)) {
                            var oddsText = $row.find('td').first().text().trim();
                            if (oddsText && oddsText !== '-') {
                                var odds = parseFloat(oddsText.replace(/,/g, ''));
                                if (!isNaN(odds)) {
                                    umatanOddsData.push({
                                        horse1: horse1, // 1着となる馬
                                        horse2: horse2, // 2着となる馬
                                        odds: odds,
                                        timestamp: new Date(),
                                        raceId: raceId
                                    });
                                }
                            }
                        }
                    });
                });
                console.log("Collected total ".concat(umatanOddsData.length, " umatan odds combinations"));
                return [2 /*return*/, umatanOddsData];
            });
        });
    };
    // パーサー関数の実装
    OddsCollector.prototype.parseFuku3Odds = function (html, raceId) {
        return __awaiter(this, void 0, void 0, function () {
            var $, fuku3OddsData;
            return __generator(this, function (_a) {
                $ = cheerio.load(html);
                fuku3OddsData = [];
                // 全ての3連複テーブルを処理
                $('table.basic.narrow-xy.fuku3').each(function (_, table) {
                    var $table = $(table);
                    // テーブルのcaptionから最初の2頭の馬番を取得 (例: "1-2")
                    var captionText = $table.find('caption').text().trim();
                    var _a = captionText.split('-').map(function (num) { return parseInt(num); }), horse1 = _a[0], horse2 = _a[1];
                    if (isNaN(horse1) || isNaN(horse2)) {
                        console.warn('Failed to parse horses from caption:', captionText);
                        return;
                    }
                    // 各行を処理
                    $table.find('tbody tr').each(function (_, row) {
                        var $row = $(row);
                        var horse3Text = $row.find('th').first().text().trim();
                        var horse3 = parseInt(horse3Text);
                        if (!isNaN(horse3)) {
                            var oddsText = $row.find('td').first().text().trim();
                            if (oddsText && oddsText !== '-') {
                                var odds = parseFloat(oddsText.replace(/,/g, ''));
                                if (!isNaN(odds)) {
                                    fuku3OddsData.push({
                                        horse1: horse1,
                                        horse2: horse2,
                                        horse3: horse3,
                                        odds: odds,
                                        timestamp: new Date(),
                                        raceId: raceId
                                    });
                                }
                            }
                        }
                    });
                });
                console.log("Collected total ".concat(fuku3OddsData.length, " fuku3 odds combinations"));
                return [2 /*return*/, fuku3OddsData];
            });
        });
    };
    // パーサー関数の実装
    OddsCollector.prototype.parseTan3Odds = function (html, raceId) {
        return __awaiter(this, void 0, void 0, function () {
            var $, tan3OddsData;
            return __generator(this, function (_a) {
                $ = cheerio.load(html);
                tan3OddsData = [];
                // 各馬の3連単テーブルを処理
                $('table.basic.narrow-xy.tan3').each(function (_, table) {
                    var $table = $(table);
                    // テーブルの親要素から1着と2着の馬番を取得
                    var $container = $table.closest('li');
                    var $pLines = $container.find('div.p_line');
                    // 1着となる馬番を取得
                    var horse1Text = $pLines.eq(0).find('div.num').text().trim();
                    var horse1 = parseInt(horse1Text);
                    // 2着となる馬番を取得
                    var horse2Text = $pLines.eq(1).find('div.num').text().trim();
                    var horse2 = parseInt(horse2Text);
                    if (isNaN(horse1) || isNaN(horse2)) {
                        console.warn('Failed to parse horse numbers:', { horse1Text: horse1Text, horse2Text: horse2Text });
                        return;
                    }
                    // 各行を処理（3着となる馬）
                    $table.find('tbody tr').each(function (_, row) {
                        var $row = $(row);
                        var horse3Text = $row.find('th[scope="row"]').text().trim();
                        var horse3 = parseInt(horse3Text);
                        if (!isNaN(horse3)) {
                            var oddsText = $row.find('td').first().text().trim();
                            if (oddsText && oddsText !== '-') {
                                var odds = parseFloat(oddsText.replace(/,/g, ''));
                                if (!isNaN(odds)) {
                                    tan3OddsData.push({
                                        horse1: horse1, // 1着となる馬
                                        horse2: horse2, // 2着となる馬
                                        horse3: horse3, // 3着となる馬
                                        odds: odds,
                                        timestamp: new Date(),
                                        raceId: raceId
                                    });
                                }
                            }
                        }
                    });
                });
                console.log("Collected total ".concat(tan3OddsData.length, " tan3 odds combinations"));
                return [2 /*return*/, tan3OddsData];
            });
        });
    };
    OddsCollector.prototype.saveTanOddsHistory = function (odds) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: 
                    // 単勝オッズは履歴として保存
                    return [4 /*yield*/, db.insert(tanOddsHistory).values({
                            horseId: odds.horseId,
                            odds: odds.tanOdds.toString(),
                            timestamp: odds.timestamp,
                            raceId: odds.raceId
                        })];
                    case 1:
                        // 単勝オッズは履歴として保存
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    OddsCollector.prototype.updateFukuOdds = function (odds) {
        return __awaiter(this, void 0, void 0, function () {
            var existing;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db.query.fukuOdds.findFirst({
                            where: and(eq(fukuOdds.horseId, odds.horseId), eq(fukuOdds.raceId, odds.raceId))
                        })];
                    case 1:
                        existing = _a.sent();
                        if (!existing) return [3 /*break*/, 3];
                        return [4 /*yield*/, db
                                .update(fukuOdds)
                                .set({
                                oddsMin: odds.fukuOddsMin.toString(),
                                oddsMax: odds.fukuOddsMax.toString(),
                                timestamp: odds.timestamp
                            })
                                .where(eq(fukuOdds.id, existing.id))];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 5];
                    case 3: return [4 /*yield*/, db.insert(fukuOdds).values({
                            horseId: odds.horseId,
                            oddsMin: odds.fukuOddsMin.toString(),
                            oddsMax: odds.fukuOddsMax.toString(),
                            timestamp: odds.timestamp,
                            raceId: odds.raceId
                        })];
                    case 4:
                        _a.sent();
                        _a.label = 5;
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    OddsCollector.prototype.updateWakurenOdds = function (oddsDataArray) {
        return __awaiter(this, void 0, void 0, function () {
            var BATCH_SIZE, existingOdds, existingMap, updates, inserts, _i, oddsDataArray_1, odds, key, existing, i, batch, i, batch;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        BATCH_SIZE = BATCH_SIZES.wakuren;
                        return [4 /*yield*/, db.query.wakurenOdds.findMany({
                                where: eq(wakurenOdds.raceId, oddsDataArray[0].raceId)
                            })];
                    case 1:
                        existingOdds = _a.sent();
                        existingMap = new Map(existingOdds.map(function (odds) { return [
                            "".concat(odds.frame1, "-").concat(odds.frame2),
                            odds
                        ]; }));
                        updates = [];
                        inserts = [];
                        for (_i = 0, oddsDataArray_1 = oddsDataArray; _i < oddsDataArray_1.length; _i++) {
                            odds = oddsDataArray_1[_i];
                            key = "".concat(odds.frame1, "-").concat(odds.frame2);
                            existing = existingMap.get(key);
                            if (existing) {
                                updates.push({
                                    id: existing.id,
                                    frame1: odds.frame1,
                                    frame2: odds.frame2,
                                    odds: odds.odds.toString(),
                                    timestamp: odds.timestamp,
                                    raceId: odds.raceId
                                });
                            }
                            else {
                                inserts.push({
                                    frame1: odds.frame1,
                                    frame2: odds.frame2,
                                    odds: odds.odds.toString(),
                                    timestamp: odds.timestamp,
                                    raceId: odds.raceId
                                });
                            }
                        }
                        i = 0;
                        _a.label = 2;
                    case 2:
                        if (!(i < updates.length)) return [3 /*break*/, 5];
                        batch = updates.slice(i, i + BATCH_SIZE);
                        return [4 /*yield*/, Promise.all(batch.map(function (update) {
                                if (!update.id)
                                    return Promise.resolve();
                                return db.update(wakurenOdds)
                                    .set({
                                    odds: update.odds,
                                    timestamp: update.timestamp
                                })
                                    .where(eq(wakurenOdds.id, update.id));
                            }))];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4:
                        i += BATCH_SIZE;
                        return [3 /*break*/, 2];
                    case 5:
                        i = 0;
                        _a.label = 6;
                    case 6:
                        if (!(i < inserts.length)) return [3 /*break*/, 9];
                        batch = inserts.slice(i, i + BATCH_SIZE);
                        return [4 /*yield*/, db.insert(wakurenOdds).values(batch)];
                    case 7:
                        _a.sent();
                        _a.label = 8;
                    case 8:
                        i += BATCH_SIZE;
                        return [3 /*break*/, 6];
                    case 9: return [2 /*return*/];
                }
            });
        });
    };
    OddsCollector.prototype.updateUmarenOdds = function (oddsDataArray) {
        return __awaiter(this, void 0, void 0, function () {
            var BATCH_SIZE, existingOdds, existingMap, updates, inserts, _i, oddsDataArray_2, odds, key, existing, i, batch, i, batch;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        BATCH_SIZE = BATCH_SIZES.umaren;
                        return [4 /*yield*/, db.query.umarenOdds.findMany({
                                where: eq(umarenOdds.raceId, oddsDataArray[0].raceId)
                            })];
                    case 1:
                        existingOdds = _a.sent();
                        existingMap = new Map(existingOdds.map(function (odds) { return [
                            "".concat(odds.horse1, "-").concat(odds.horse2),
                            odds
                        ]; }));
                        updates = [];
                        inserts = [];
                        for (_i = 0, oddsDataArray_2 = oddsDataArray; _i < oddsDataArray_2.length; _i++) {
                            odds = oddsDataArray_2[_i];
                            key = "".concat(odds.horse1, "-").concat(odds.horse2);
                            existing = existingMap.get(key);
                            if (existing) {
                                updates.push({
                                    id: existing.id,
                                    horse1: odds.horse1,
                                    horse2: odds.horse2,
                                    odds: odds.odds.toString(),
                                    timestamp: odds.timestamp,
                                    raceId: odds.raceId
                                });
                            }
                            else {
                                inserts.push({
                                    horse1: odds.horse1,
                                    horse2: odds.horse2,
                                    odds: odds.odds.toString(),
                                    timestamp: odds.timestamp,
                                    raceId: odds.raceId
                                });
                            }
                        }
                        i = 0;
                        _a.label = 2;
                    case 2:
                        if (!(i < updates.length)) return [3 /*break*/, 5];
                        batch = updates.slice(i, i + BATCH_SIZE);
                        return [4 /*yield*/, Promise.all(batch.map(function (update) {
                                if (!update.id)
                                    return Promise.resolve();
                                return db.update(umarenOdds)
                                    .set({
                                    odds: update.odds,
                                    timestamp: update.timestamp
                                })
                                    .where(eq(umarenOdds.id, update.id));
                            }))];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4:
                        i += BATCH_SIZE;
                        return [3 /*break*/, 2];
                    case 5:
                        i = 0;
                        _a.label = 6;
                    case 6:
                        if (!(i < inserts.length)) return [3 /*break*/, 9];
                        batch = inserts.slice(i, i + BATCH_SIZE);
                        return [4 /*yield*/, db.insert(umarenOdds).values(batch)];
                    case 7:
                        _a.sent();
                        _a.label = 8;
                    case 8:
                        i += BATCH_SIZE;
                        return [3 /*break*/, 6];
                    case 9: return [2 /*return*/];
                }
            });
        });
    };
    OddsCollector.prototype.updateWideOdds = function (oddsDataArray) {
        return __awaiter(this, void 0, void 0, function () {
            var BATCH_SIZE, existingOdds, existingMap, updates, inserts, _i, oddsDataArray_3, odds, key, existing, i, batch, i, batch;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        BATCH_SIZE = BATCH_SIZES.wide;
                        return [4 /*yield*/, db.query.wideOdds.findMany({
                                where: eq(wideOdds.raceId, oddsDataArray[0].raceId)
                            })];
                    case 1:
                        existingOdds = _a.sent();
                        existingMap = new Map(existingOdds.map(function (odds) { return [
                            "".concat(odds.horse1, "-").concat(odds.horse2),
                            odds
                        ]; }));
                        updates = [];
                        inserts = [];
                        for (_i = 0, oddsDataArray_3 = oddsDataArray; _i < oddsDataArray_3.length; _i++) {
                            odds = oddsDataArray_3[_i];
                            key = "".concat(odds.horse1, "-").concat(odds.horse2);
                            existing = existingMap.get(key);
                            if (existing) {
                                updates.push({
                                    id: existing.id,
                                    horse1: odds.horse1,
                                    horse2: odds.horse2,
                                    oddsMin: odds.oddsMin.toString(),
                                    oddsMax: odds.oddsMax.toString(),
                                    timestamp: odds.timestamp,
                                    raceId: odds.raceId
                                });
                            }
                            else {
                                inserts.push({
                                    horse1: odds.horse1,
                                    horse2: odds.horse2,
                                    oddsMin: odds.oddsMin.toString(),
                                    oddsMax: odds.oddsMax.toString(),
                                    timestamp: odds.timestamp,
                                    raceId: odds.raceId
                                });
                            }
                        }
                        i = 0;
                        _a.label = 2;
                    case 2:
                        if (!(i < updates.length)) return [3 /*break*/, 5];
                        batch = updates.slice(i, i + BATCH_SIZE);
                        return [4 /*yield*/, Promise.all(batch.map(function (update) {
                                if (!update.id)
                                    return Promise.resolve();
                                return db.update(wideOdds)
                                    .set({
                                    oddsMin: update.oddsMin,
                                    oddsMax: update.oddsMax,
                                    timestamp: update.timestamp
                                })
                                    .where(eq(wideOdds.id, update.id));
                            }))];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4:
                        i += BATCH_SIZE;
                        return [3 /*break*/, 2];
                    case 5:
                        i = 0;
                        _a.label = 6;
                    case 6:
                        if (!(i < inserts.length)) return [3 /*break*/, 9];
                        batch = inserts.slice(i, i + BATCH_SIZE);
                        return [4 /*yield*/, db.insert(wideOdds).values(batch)];
                    case 7:
                        _a.sent();
                        _a.label = 8;
                    case 8:
                        i += BATCH_SIZE;
                        return [3 /*break*/, 6];
                    case 9: return [2 /*return*/];
                }
            });
        });
    };
    OddsCollector.prototype.updateUmatanOdds = function (oddsDataArray) {
        return __awaiter(this, void 0, void 0, function () {
            var BATCH_SIZE, existingOdds, existingMap, updates, inserts, _i, oddsDataArray_4, odds, key, existing, i, batch, i, batch;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        BATCH_SIZE = BATCH_SIZES.umatan;
                        return [4 /*yield*/, db.query.umatanOdds.findMany({
                                where: eq(umatanOdds.raceId, oddsDataArray[0].raceId)
                            })];
                    case 1:
                        existingOdds = _a.sent();
                        existingMap = new Map(existingOdds.map(function (odds) { return [
                            "".concat(odds.horse1, "-").concat(odds.horse2),
                            odds
                        ]; }));
                        updates = [];
                        inserts = [];
                        for (_i = 0, oddsDataArray_4 = oddsDataArray; _i < oddsDataArray_4.length; _i++) {
                            odds = oddsDataArray_4[_i];
                            key = "".concat(odds.horse1, "-").concat(odds.horse2);
                            existing = existingMap.get(key);
                            if (existing) {
                                updates.push({
                                    id: existing.id,
                                    horse1: odds.horse1,
                                    horse2: odds.horse2,
                                    odds: odds.odds.toString(),
                                    timestamp: odds.timestamp,
                                    raceId: odds.raceId
                                });
                            }
                            else {
                                inserts.push({
                                    horse1: odds.horse1,
                                    horse2: odds.horse2,
                                    odds: odds.odds.toString(),
                                    timestamp: odds.timestamp,
                                    raceId: odds.raceId
                                });
                            }
                        }
                        i = 0;
                        _a.label = 2;
                    case 2:
                        if (!(i < updates.length)) return [3 /*break*/, 5];
                        batch = updates.slice(i, i + BATCH_SIZE);
                        return [4 /*yield*/, Promise.all(batch.map(function (update) {
                                if (!update.id)
                                    return Promise.resolve();
                                return db.update(umatanOdds)
                                    .set({
                                    odds: update.odds,
                                    timestamp: update.timestamp
                                })
                                    .where(eq(umatanOdds.id, update.id));
                            }))];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4:
                        i += BATCH_SIZE;
                        return [3 /*break*/, 2];
                    case 5:
                        i = 0;
                        _a.label = 6;
                    case 6:
                        if (!(i < inserts.length)) return [3 /*break*/, 9];
                        batch = inserts.slice(i, i + BATCH_SIZE);
                        return [4 /*yield*/, db.insert(umatanOdds).values(batch)];
                    case 7:
                        _a.sent();
                        _a.label = 8;
                    case 8:
                        i += BATCH_SIZE;
                        return [3 /*break*/, 6];
                    case 9: return [2 /*return*/];
                }
            });
        });
    };
    OddsCollector.prototype.updateFuku3Odds = function (oddsDataArray) {
        return __awaiter(this, void 0, void 0, function () {
            var BATCH_SIZE, existingOdds, existingMap, updates, inserts, _i, oddsDataArray_5, odds, horses_1, key, existing, i, batch, i, batch;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        BATCH_SIZE = BATCH_SIZES.fuku3;
                        return [4 /*yield*/, db.query.fuku3Odds.findMany({
                                where: eq(fuku3Odds.raceId, oddsDataArray[0].raceId)
                            })];
                    case 1:
                        existingOdds = _a.sent();
                        existingMap = new Map(existingOdds.map(function (odds) {
                            var horses = [odds.horse1, odds.horse2, odds.horse3].sort(function (a, b) { return a - b; });
                            return ["".concat(horses[0], "-").concat(horses[1], "-").concat(horses[2]), odds];
                        }));
                        updates = [];
                        inserts = [];
                        for (_i = 0, oddsDataArray_5 = oddsDataArray; _i < oddsDataArray_5.length; _i++) {
                            odds = oddsDataArray_5[_i];
                            horses_1 = [odds.horse1, odds.horse2, odds.horse3].sort(function (a, b) { return a - b; });
                            key = "".concat(horses_1[0], "-").concat(horses_1[1], "-").concat(horses_1[2]);
                            existing = existingMap.get(key);
                            if (existing) {
                                updates.push({
                                    id: existing.id,
                                    horse1: horses_1[0],
                                    horse2: horses_1[1],
                                    horse3: horses_1[2],
                                    odds: odds.odds.toString(),
                                    timestamp: odds.timestamp,
                                    raceId: odds.raceId
                                });
                            }
                            else {
                                inserts.push({
                                    horse1: horses_1[0],
                                    horse2: horses_1[1],
                                    horse3: horses_1[2],
                                    odds: odds.odds.toString(),
                                    timestamp: odds.timestamp,
                                    raceId: odds.raceId
                                });
                            }
                        }
                        i = 0;
                        _a.label = 2;
                    case 2:
                        if (!(i < updates.length)) return [3 /*break*/, 5];
                        batch = updates.slice(i, i + BATCH_SIZE);
                        return [4 /*yield*/, Promise.all(batch.map(function (update) {
                                if (!update.id)
                                    return Promise.resolve();
                                return db.update(fuku3Odds)
                                    .set({
                                    odds: update.odds,
                                    timestamp: update.timestamp
                                })
                                    .where(eq(fuku3Odds.id, update.id));
                            }))];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4:
                        i += BATCH_SIZE;
                        return [3 /*break*/, 2];
                    case 5:
                        i = 0;
                        _a.label = 6;
                    case 6:
                        if (!(i < inserts.length)) return [3 /*break*/, 9];
                        batch = inserts.slice(i, i + BATCH_SIZE);
                        return [4 /*yield*/, db.insert(fuku3Odds).values(batch)];
                    case 7:
                        _a.sent();
                        _a.label = 8;
                    case 8:
                        i += BATCH_SIZE;
                        return [3 /*break*/, 6];
                    case 9: return [2 /*return*/];
                }
            });
        });
    };
    OddsCollector.prototype.updateTan3Odds = function (oddsDataArray) {
        return __awaiter(this, void 0, void 0, function () {
            var BATCH_SIZE, existingOdds, existingMap, updates, inserts, _i, oddsDataArray_6, odds, key, existing, i, batch, i, batch;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        BATCH_SIZE = BATCH_SIZES.tan3;
                        return [4 /*yield*/, db.query.tan3Odds.findMany({
                                where: eq(tan3Odds.raceId, oddsDataArray[0].raceId)
                            })];
                    case 1:
                        existingOdds = _a.sent();
                        existingMap = new Map(existingOdds.map(function (odds) { return [
                            "".concat(odds.horse1, "-").concat(odds.horse2, "-").concat(odds.horse3),
                            odds
                        ]; }));
                        updates = [];
                        inserts = [];
                        // データを振り分け
                        for (_i = 0, oddsDataArray_6 = oddsDataArray; _i < oddsDataArray_6.length; _i++) {
                            odds = oddsDataArray_6[_i];
                            key = "".concat(odds.horse1, "-").concat(odds.horse2, "-").concat(odds.horse3);
                            existing = existingMap.get(key);
                            if (existing) {
                                updates.push({
                                    id: existing.id,
                                    horse1: odds.horse1,
                                    horse2: odds.horse2,
                                    horse3: odds.horse3,
                                    odds: odds.odds.toString(),
                                    timestamp: odds.timestamp,
                                    raceId: odds.raceId
                                });
                            }
                            else {
                                inserts.push({
                                    horse1: odds.horse1,
                                    horse2: odds.horse2,
                                    horse3: odds.horse3,
                                    odds: odds.odds.toString(),
                                    timestamp: odds.timestamp,
                                    raceId: odds.raceId
                                });
                            }
                        }
                        i = 0;
                        _a.label = 2;
                    case 2:
                        if (!(i < updates.length)) return [3 /*break*/, 5];
                        batch = updates.slice(i, i + BATCH_SIZE);
                        return [4 /*yield*/, Promise.all(batch.map(function (update) {
                                if (!update.id)
                                    return Promise.resolve(); // idがない場合はスキップ
                                return db.update(tan3Odds)
                                    .set({
                                    odds: update.odds,
                                    timestamp: update.timestamp
                                })
                                    .where(eq(tan3Odds.id, update.id));
                            }))];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4:
                        i += BATCH_SIZE;
                        return [3 /*break*/, 2];
                    case 5:
                        i = 0;
                        _a.label = 6;
                    case 6:
                        if (!(i < inserts.length)) return [3 /*break*/, 9];
                        batch = inserts.slice(i, i + BATCH_SIZE);
                        return [4 /*yield*/, db.insert(tan3Odds).values(batch)];
                    case 7:
                        _a.sent();
                        _a.label = 8;
                    case 8:
                        i += BATCH_SIZE;
                        return [3 /*break*/, 6];
                    case 9: return [2 /*return*/];
                }
            });
        });
    };
    OddsCollector.prototype.saveOddsHistory = function (oddsData) {
        return __awaiter(this, void 0, void 0, function () {
            var _i, oddsData_1, odds, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 6, , 7]);
                        _i = 0, oddsData_1 = oddsData;
                        _a.label = 1;
                    case 1:
                        if (!(_i < oddsData_1.length)) return [3 /*break*/, 5];
                        odds = oddsData_1[_i];
                        // 単勝オッズを履歴として保存
                        return [4 /*yield*/, this.saveTanOddsHistory(odds)];
                    case 2:
                        // 単勝オッズを履歴として保存
                        _a.sent();
                        // 複勝オッズを更新
                        return [4 /*yield*/, this.updateFukuOdds(odds)];
                    case 3:
                        // 複勝オッズを更新
                        _a.sent();
                        _a.label = 4;
                    case 4:
                        _i++;
                        return [3 /*break*/, 1];
                    case 5:
                        console.log("Saved odds for ".concat(oddsData.length, " horses"));
                        return [3 /*break*/, 7];
                    case 6:
                        error_1 = _a.sent();
                        console.error('Error saving odds:', error_1);
                        throw error_1;
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    OddsCollector.prototype.startPeriodicCollection = function () {
        return __awaiter(this, arguments, void 0, function (intervalMinutes) {
            var _this = this;
            if (intervalMinutes === void 0) { intervalMinutes = 5; }
            return __generator(this, function (_a) {
                setInterval(function () { return __awaiter(_this, void 0, void 0, function () {
                    var activeRaces, _i, activeRaces_1, race, _a, _b, betType, oddsData, error_2;
                    return __generator(this, function (_c) {
                        switch (_c.label) {
                            case 0: return [4 /*yield*/, db.select()
                                    .from(races)
                                    .where(eq(races.status, 'upcoming'))];
                            case 1:
                                activeRaces = _c.sent();
                                _i = 0, activeRaces_1 = activeRaces;
                                _c.label = 2;
                            case 2:
                                if (!(_i < activeRaces_1.length)) return [3 /*break*/, 19];
                                race = activeRaces_1[_i];
                                _a = 0, _b = Object.keys(this.betTypes);
                                _c.label = 3;
                            case 3:
                                if (!(_a < _b.length)) return [3 /*break*/, 18];
                                betType = _b[_a];
                                _c.label = 4;
                            case 4:
                                _c.trys.push([4, 16, , 17]);
                                return [4 /*yield*/, this.collectOddsForBetType(race.id, betType)];
                            case 5:
                                oddsData = _c.sent();
                                if (!(oddsData.length > 0)) return [3 /*break*/, 15];
                                if (!(betType === 'wakuren')) return [3 /*break*/, 7];
                                return [4 /*yield*/, this.updateWakurenOdds(oddsData)];
                            case 6:
                                _c.sent();
                                return [3 /*break*/, 15];
                            case 7:
                                if (!(betType === 'umaren')) return [3 /*break*/, 9];
                                return [4 /*yield*/, this.updateUmarenOdds(oddsData)];
                            case 8:
                                _c.sent();
                                return [3 /*break*/, 15];
                            case 9:
                                if (!(betType === 'wide')) return [3 /*break*/, 11];
                                return [4 /*yield*/, this.updateWideOdds(oddsData)];
                            case 10:
                                _c.sent();
                                return [3 /*break*/, 15];
                            case 11:
                                if (!(betType === 'umatan')) return [3 /*break*/, 13];
                                return [4 /*yield*/, this.updateUmatanOdds(oddsData)];
                            case 12:
                                _c.sent();
                                return [3 /*break*/, 15];
                            case 13: return [4 /*yield*/, this.saveOddsHistory(oddsData)];
                            case 14:
                                _c.sent();
                                _c.label = 15;
                            case 15: return [3 /*break*/, 17];
                            case 16:
                                error_2 = _c.sent();
                                console.error("Error collecting ".concat(betType, " odds for race ").concat(race.id, ":"), error_2);
                                return [3 /*break*/, 17];
                            case 17:
                                _a++;
                                return [3 /*break*/, 3];
                            case 18:
                                _i++;
                                return [3 /*break*/, 2];
                            case 19: return [2 /*return*/];
                        }
                    });
                }); }, intervalMinutes * 60 * 1000);
                return [2 /*return*/];
            });
        });
    };
    OddsCollector.prototype.cleanup = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.browser) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.browser.close()];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2: return [2 /*return*/];
                }
            });
        });
    };
    return OddsCollector;
}());
export { OddsCollector };
// place_mappingの定義を追加
var placeMapping = {
    "01": "札幌",
    "02": "函館",
    "03": "福島",
    "04": "新潟",
    "05": "東京",
    "06": "中山",
    "07": "中京",
    "08": "京都",
    "09": "阪神",
    "10": "小倉"
};
