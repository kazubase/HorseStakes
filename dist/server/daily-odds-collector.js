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
import { OddsCollector } from './odds-collector';
import { db } from '../db';
import { races, horses } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { chromium } from 'playwright';
import * as cheerio from 'cheerio';
import schedule from 'node-schedule';
var DailyOddsCollector = /** @class */ (function () {
    function DailyOddsCollector() {
        this.browser = null;
        this.activeJobs = new Map();
        this.collector = new OddsCollector();
    }
    DailyOddsCollector.prototype.initialize = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _a = this;
                        return [4 /*yield*/, chromium.launch({
                                headless: true,
                                args: ['--no-sandbox']
                            })];
                    case 1:
                        _a.browser = _b.sent();
                        return [4 /*yield*/, this.collector.initialize()];
                    case 2:
                        _b.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    // JRAページから当日の重賞レース情報を取得
    DailyOddsCollector.prototype.getTodayGradeRaces = function () {
        return __awaiter(this, void 0, void 0, function () {
            var context, page, raceInfos, html, $, today, todayStr, kaisaiElements, promises, _i, _a, element, $kaisai, dateHeader, kaisaiLinks, _b, _c, link, kaisaiText, _d, kai, venue, nichi, kaisaiName, raceListHtml, $races, rows, _e, rows_1, row, $row, $raceName, $raceNum, $raceTime, raceName, gradeIcon, isGrade, raceNumber, timeText, year_1, venueCode_1, raceId_1, _f, hours, minutes, raceTime, utcRaceTime, year, venueCode, raceId, error_1;
            var _g, _h;
            return __generator(this, function (_j) {
                switch (_j.label) {
                    case 0:
                        if (!this.browser)
                            throw new Error('Browser not initialized');
                        return [4 /*yield*/, this.browser.newContext({
                                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                            })];
                    case 1:
                        context = _j.sent();
                        return [4 /*yield*/, context.newPage()];
                    case 2:
                        page = _j.sent();
                        raceInfos = [];
                        _j.label = 3;
                    case 3:
                        _j.trys.push([3, , 28, 30]);
                        // JRAトップページからオッズページへ遷移
                        return [4 /*yield*/, page.goto('https://www.jra.go.jp/')];
                    case 4:
                        // JRAトップページからオッズページへ遷移
                        _j.sent();
                        return [4 /*yield*/, page.waitForLoadState('networkidle')];
                    case 5:
                        _j.sent();
                        return [4 /*yield*/, page.getByRole('link', { name: 'オッズ', exact: true }).click()];
                    case 6:
                        _j.sent();
                        return [4 /*yield*/, page.waitForLoadState('networkidle')];
                    case 7:
                        _j.sent();
                        return [4 /*yield*/, page.content()];
                    case 8:
                        html = _j.sent();
                        $ = cheerio.load(html);
                        today = new Date();
                        todayStr = "".concat(today.getMonth() + 1, "\u6708").concat(today.getDate(), "\u65E5");
                        console.log('Looking for races on:', todayStr);
                        kaisaiElements = $('.thisweek .panel.no-padding.no-border[class*="mt"]');
                        console.log('Found kaisai elements:', kaisaiElements.length);
                        promises = [];
                        _i = 0, _a = kaisaiElements.toArray();
                        _j.label = 9;
                    case 9:
                        if (!(_i < _a.length)) return [3 /*break*/, 27];
                        element = _a[_i];
                        $kaisai = $(element);
                        dateHeader = $kaisai.find('.sub_header').text().trim();
                        console.log('Date header:', dateHeader);
                        if (!dateHeader.includes(todayStr)) return [3 /*break*/, 26];
                        console.log('Processing kaisai for today');
                        kaisaiLinks = $kaisai.find('.link_list a');
                        console.log('Found kaisai links:', kaisaiLinks.length);
                        _b = 0, _c = kaisaiLinks.toArray();
                        _j.label = 10;
                    case 10:
                        if (!(_b < _c.length)) return [3 /*break*/, 26];
                        link = _c[_b];
                        kaisaiText = $(link).text().trim();
                        console.log('Kaisai text:', kaisaiText);
                        _d = ((_g = kaisaiText.match(/(\d+)回(.+?)(\d+)日/)) === null || _g === void 0 ? void 0 : _g.slice(1)) || [], kai = _d[0], venue = _d[1], nichi = _d[2];
                        console.log('Parsed values:', { kai: kai, venue: venue, nichi: nichi });
                        _j.label = 11;
                    case 11:
                        _j.trys.push([11, 24, , 25]);
                        kaisaiName = "".concat(kai, "\u56DE").concat(venue).concat(nichi, "\u65E5");
                        return [4 /*yield*/, page.getByRole('link', { name: kaisaiName }).click()];
                    case 12:
                        _j.sent();
                        return [4 /*yield*/, page.waitForLoadState('networkidle')];
                    case 13:
                        _j.sent();
                        return [4 /*yield*/, page.content()];
                    case 14:
                        raceListHtml = _j.sent();
                        $races = cheerio.load(raceListHtml);
                        console.log('Checking races for:', kaisaiName);
                        rows = $races('tr').toArray();
                        _e = 0, rows_1 = rows;
                        _j.label = 15;
                    case 15:
                        if (!(_e < rows_1.length)) return [3 /*break*/, 19];
                        row = rows_1[_e];
                        $row = $races(row);
                        $raceName = $row.find('.race_name');
                        $raceNum = $row.find('.race_num');
                        $raceTime = $row.find('.time');
                        raceName = $raceName.find('.stakes').text().trim();
                        gradeIcon = $raceName.find('.grade_icon img').attr('src');
                        isGrade = gradeIcon === null || gradeIcon === void 0 ? void 0 : gradeIcon.includes('icon_grade_s_g');
                        if (!isGrade) return [3 /*break*/, 18];
                        raceNumber = parseInt(((_h = $raceNum.find('img').attr('alt')) === null || _h === void 0 ? void 0 : _h.replace('レース', '')) || '0');
                        timeText = $raceTime.text().trim();
                        console.log('Race time text:', timeText); // デバッグ用
                        if (!(timeText === '発走済')) return [3 /*break*/, 17];
                        year_1 = today.getFullYear();
                        venueCode_1 = this.getVenueCode(venue);
                        raceId_1 = parseInt("".concat(year_1).concat(venueCode_1).concat(kai.padStart(2, '0')).concat(nichi.padStart(2, '0')).concat(raceNumber.toString().padStart(2, '0')));
                        console.log("Race ".concat(raceName, " has already started, updating status to done for ID: ").concat(raceId_1));
                        return [4 /*yield*/, db.update(races)
                                .set({ status: 'done' })
                                .where(eq(races.id, raceId_1))];
                    case 16:
                        _j.sent();
                        return [3 /*break*/, 18];
                    case 17:
                        _f = timeText.replace(/[時分]/g, ':').split(':').map(Number), hours = _f[0], minutes = _f[1];
                        raceTime = new Date();
                        raceTime.setHours(hours, minutes, 0, 0); // 日本時間で設定
                        utcRaceTime = new Date(raceTime.getTime() - (9 * 60 * 60 * 1000));
                        year = today.getFullYear();
                        venueCode = this.getVenueCode(venue);
                        raceId = parseInt("".concat(year).concat(venueCode).concat(kai.padStart(2, '0')).concat(nichi.padStart(2, '0')).concat(raceNumber.toString().padStart(2, '0')));
                        raceInfos.push({
                            id: raceId,
                            name: raceName,
                            venue: venue,
                            startTime: utcRaceTime, // UTC時間で保存
                            isGrade: true
                        });
                        console.log('Found grade race:', { raceName: raceName, raceId: raceId, timeText: timeText, raceNumber: raceNumber });
                        _j.label = 18;
                    case 18:
                        _e++;
                        return [3 /*break*/, 15];
                    case 19:
                        console.log('Found races for venue:', venue, raceInfos);
                        // 開催選択ページに戻る
                        return [4 /*yield*/, page.goto('https://www.jra.go.jp/keiba/')];
                    case 20:
                        // 開催選択ページに戻る
                        _j.sent();
                        return [4 /*yield*/, page.waitForLoadState('networkidle')];
                    case 21:
                        _j.sent();
                        return [4 /*yield*/, page.getByRole('link', { name: 'オッズ', exact: true }).click()];
                    case 22:
                        _j.sent();
                        return [4 /*yield*/, page.waitForLoadState('networkidle')];
                    case 23:
                        _j.sent();
                        return [3 /*break*/, 25];
                    case 24:
                        error_1 = _j.sent();
                        console.error("Error processing ".concat(kaisaiText, ":"), error_1);
                        return [3 /*break*/, 25];
                    case 25:
                        _b++;
                        return [3 /*break*/, 10];
                    case 26:
                        _i++;
                        return [3 /*break*/, 9];
                    case 27: return [3 /*break*/, 30];
                    case 28: return [4 /*yield*/, context.close()];
                    case 29:
                        _j.sent();
                        return [7 /*endfinally*/];
                    case 30:
                        console.log('Found grade races:', raceInfos);
                        return [2 /*return*/, raceInfos];
                }
            });
        });
    };
    // レース情報をDBに登録
    DailyOddsCollector.prototype.registerRace = function (race) {
        return __awaiter(this, void 0, void 0, function () {
            var existingRace;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db.query.races.findFirst({
                            where: eq(races.id, race.id)
                        })];
                    case 1:
                        existingRace = _a.sent();
                        if (!!existingRace) return [3 /*break*/, 3];
                        return [4 /*yield*/, db.insert(races).values({
                                id: race.id,
                                name: race.name,
                                venue: race.venue,
                                startTime: race.startTime,
                                status: "upcoming"
                            })];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // オッズ収集のスケジュール設定
    DailyOddsCollector.prototype.scheduleOddsCollection = function (race) {
        return __awaiter(this, void 0, void 0, function () {
            var existingJob, rule, job;
            var _this = this;
            return __generator(this, function (_a) {
                // 既存のジョブがあれば削除
                if (this.activeJobs.has(race.id)) {
                    existingJob = this.activeJobs.get(race.id);
                    existingJob === null || existingJob === void 0 ? void 0 : existingJob.cancel();
                    this.activeJobs.delete(race.id);
                }
                console.log("Setting up schedule for race: ".concat(race.id));
                rule = new schedule.RecurrenceRule();
                rule.minute = new Array(6).fill(0).map(function (_, i) { return i * 10; }); // 10分間隔
                job = schedule.scheduleJob(rule, function () { return __awaiter(_this, void 0, void 0, function () {
                    var now, timeToRace;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                now = new Date();
                                timeToRace = race.startTime.getTime() - now.getTime();
                                if (!(timeToRace > 0)) return [3 /*break*/, 5];
                                if (!(timeToRace <= 30 * 60 * 1000)) return [3 /*break*/, 2];
                                return [4 /*yield*/, this.collectOdds(race.id)];
                            case 1:
                                _a.sent();
                                return [3 /*break*/, 4];
                            case 2:
                                if (!(now.getMinutes() % 30 === 0)) return [3 /*break*/, 4];
                                return [4 /*yield*/, this.collectOdds(race.id)];
                            case 3:
                                _a.sent();
                                _a.label = 4;
                            case 4: return [3 /*break*/, 6];
                            case 5:
                                // レース終了後はジョブをキャンセル
                                job.cancel();
                                this.activeJobs.delete(race.id);
                                _a.label = 6;
                            case 6: return [2 /*return*/];
                        }
                    });
                }); });
                this.activeJobs.set(race.id, job);
                return [2 /*return*/];
            });
        });
    };
    // オッズ収集実行
    DailyOddsCollector.prototype.collectOdds = function (raceId) {
        return __awaiter(this, void 0, void 0, function () {
            var race, now, jstNow, jstStartTime, betTypes, _i, betTypes_1, betType, odds, _a, odds_1, odd, existingHorse, error_2, updateMethod, error_3, error_4;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 25, , 26]);
                        return [4 /*yield*/, db.query.races.findFirst({
                                where: eq(races.id, raceId)
                            })];
                    case 1:
                        race = _b.sent();
                        if (!race || race.status === 'done')
                            return [2 /*return*/];
                        now = new Date();
                        jstNow = new Date(now.getTime() + (9 * 60 * 60 * 1000));
                        jstStartTime = new Date(race.startTime.getTime() + (9 * 60 * 60 * 1000));
                        console.log("Checking race ".concat(raceId, " - Start time (JST): ").concat(jstStartTime.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })));
                        if (!(jstStartTime < jstNow && race.status === 'upcoming')) return [3 /*break*/, 3];
                        console.log("Race ".concat(raceId, " has finished. Updating status to done"));
                        return [4 /*yield*/, db.update(races)
                                .set({ status: 'done' })
                                .where(eq(races.id, raceId))];
                    case 2:
                        _b.sent();
                        return [2 /*return*/];
                    case 3:
                        console.log("Collecting odds for race ".concat(raceId));
                        betTypes = ['tanpuku', 'wakuren', 'umaren', 'wide', 'umatan', 'fuku3', 'tan3'];
                        _i = 0, betTypes_1 = betTypes;
                        _b.label = 4;
                    case 4:
                        if (!(_i < betTypes_1.length)) return [3 /*break*/, 24];
                        betType = betTypes_1[_i];
                        _b.label = 5;
                    case 5:
                        _b.trys.push([5, 22, , 23]);
                        console.log("Collecting ".concat(betType, " odds for race ID: ").concat(raceId));
                        return [4 /*yield*/, this.collector.collectOddsForBetType(raceId, betType)];
                    case 6:
                        odds = _b.sent();
                        console.log("Collected ".concat(betType, " odds data:"), odds);
                        if (!(odds.length > 0)) return [3 /*break*/, 21];
                        if (!(betType === 'tanpuku')) return [3 /*break*/, 18];
                        _a = 0, odds_1 = odds;
                        _b.label = 7;
                    case 7:
                        if (!(_a < odds_1.length)) return [3 /*break*/, 16];
                        odd = odds_1[_a];
                        _b.label = 8;
                    case 8:
                        _b.trys.push([8, 14, , 15]);
                        return [4 /*yield*/, db.query.horses.findFirst({
                                where: and(eq(horses.name, odd.horseName), eq(horses.raceId, raceId))
                            })];
                    case 9:
                        existingHorse = _b.sent();
                        if (!!existingHorse) return [3 /*break*/, 11];
                        console.log("Registering horse: ".concat(odd.horseName, " (Race: ").concat(raceId, ", Frame: ").concat(odd.frame, ", Number: ").concat(odd.number, ")"));
                        return [4 /*yield*/, db.insert(horses).values({
                                name: odd.horseName,
                                raceId: raceId,
                                frame: odd.frame,
                                number: odd.number,
                                status: odd.odds === '取消' ? 'scratched' : 'running'
                            })];
                    case 10:
                        _b.sent();
                        return [3 /*break*/, 13];
                    case 11:
                        if (!(odd.odds === '取消' && existingHorse.status !== 'scratched')) return [3 /*break*/, 13];
                        console.log("Updating horse status to scratched: ".concat(odd.horseName, " (Race: ").concat(raceId, ")"));
                        return [4 /*yield*/, db.update(horses)
                                .set({ status: 'scratched' })
                                .where(and(eq(horses.name, odd.horseName), eq(horses.raceId, raceId)))];
                    case 12:
                        _b.sent();
                        _b.label = 13;
                    case 13: return [3 /*break*/, 15];
                    case 14:
                        error_2 = _b.sent();
                        console.error("Error handling horse ".concat(odd.horseName, " for race ").concat(raceId, ":"), error_2);
                        return [3 /*break*/, 15];
                    case 15:
                        _a++;
                        return [3 /*break*/, 7];
                    case 16: return [4 /*yield*/, this.collector.saveOddsHistory(odds)];
                    case 17:
                        _b.sent();
                        return [3 /*break*/, 20];
                    case 18:
                        updateMethod = {
                            wakuren: this.collector.updateWakurenOdds.bind(this.collector),
                            umaren: this.collector.updateUmarenOdds.bind(this.collector),
                            wide: this.collector.updateWideOdds.bind(this.collector),
                            umatan: this.collector.updateUmatanOdds.bind(this.collector),
                            fuku3: this.collector.updateFuku3Odds.bind(this.collector),
                            tan3: this.collector.updateTan3Odds.bind(this.collector)
                        }[betType];
                        return [4 /*yield*/, updateMethod(odds)];
                    case 19:
                        _b.sent();
                        _b.label = 20;
                    case 20:
                        console.log("".concat(betType, " odds data saved successfully"));
                        _b.label = 21;
                    case 21: return [3 /*break*/, 23];
                    case 22:
                        error_3 = _b.sent();
                        console.error("Error collecting ".concat(betType, " odds for race ").concat(raceId, ":"), error_3);
                        return [3 /*break*/, 23];
                    case 23:
                        _i++;
                        return [3 /*break*/, 4];
                    case 24: return [3 /*break*/, 26];
                    case 25:
                        error_4 = _b.sent();
                        console.error('Error in collectOdds:', error_4);
                        return [3 /*break*/, 26];
                    case 26: return [2 /*return*/];
                }
            });
        });
    };
    DailyOddsCollector.prototype.getVenueCode = function (venue) {
        var venueMap = {
            "札幌": "01", "函館": "02", "福島": "03", "新潟": "04",
            "東京": "05", "中山": "06", "中京": "07", "京都": "08",
            "阪神": "09", "小倉": "10"
        };
        return venueMap[venue] || "00";
    };
    DailyOddsCollector.prototype.cleanup = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.collector.cleanup()];
                    case 1:
                        _a.sent();
                        Array.from(this.activeJobs.values()).forEach(function (job) { return job.cancel(); });
                        this.activeJobs.clear();
                        return [2 /*return*/];
                }
            });
        });
    };
    DailyOddsCollector.prototype.checkUpcomingRaces = function () {
        return __awaiter(this, void 0, void 0, function () {
            var upcomingRaces, _i, upcomingRaces_1, race;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db.query.races.findMany({
                            where: eq(races.status, 'upcoming')
                        })];
                    case 1:
                        upcomingRaces = _a.sent();
                        console.log('Found upcoming races:', upcomingRaces);
                        _i = 0, upcomingRaces_1 = upcomingRaces;
                        _a.label = 2;
                    case 2:
                        if (!(_i < upcomingRaces_1.length)) return [3 /*break*/, 5];
                        race = upcomingRaces_1[_i];
                        return [4 /*yield*/, this.scheduleOddsCollection({
                                id: race.id,
                                name: race.name,
                                venue: race.venue,
                                startTime: race.startTime,
                                isGrade: true
                            })];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4:
                        _i++;
                        return [3 /*break*/, 2];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    return DailyOddsCollector;
}());
// メイン実行関数
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var dailyCollector, races_3, _i, races_1, race, races_4, _a, races_2, race, error_5;
        var _this = this;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    dailyCollector = new DailyOddsCollector();
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 18, , 19]);
                    console.log('Starting odds collector with NODE_ENV:', process.env.NODE_ENV);
                    return [4 /*yield*/, dailyCollector.initialize()];
                case 2:
                    _b.sent();
                    if (!(process.env.NODE_ENV === 'production')) return [3 /*break*/, 9];
                    // 本番環境では単発実行のみ
                    console.log('Production mode: Running single collection cycle');
                    return [4 /*yield*/, dailyCollector.getTodayGradeRaces()];
                case 3:
                    races_3 = _b.sent();
                    console.log('Found races:', races_3);
                    _i = 0, races_1 = races_3;
                    _b.label = 4;
                case 4:
                    if (!(_i < races_1.length)) return [3 /*break*/, 8];
                    race = races_1[_i];
                    console.log('Processing race:', race);
                    return [4 /*yield*/, dailyCollector.registerRace(race)];
                case 5:
                    _b.sent();
                    return [4 /*yield*/, dailyCollector.collectOdds(race.id)];
                case 6:
                    _b.sent();
                    _b.label = 7;
                case 7:
                    _i++;
                    return [3 /*break*/, 4];
                case 8: return [3 /*break*/, 17];
                case 9:
                    // 開発環境では全ての機能を使用
                    // 定期的にupcomingレースをチェック（5分ごと）
                    console.log('Setting up 5-min check schedule');
                    schedule.scheduleJob('*/5 * * * *', function () { return __awaiter(_this, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    console.log('Running upcoming races check...');
                                    return [4 /*yield*/, dailyCollector.checkUpcomingRaces()];
                                case 1:
                                    _a.sent();
                                    return [2 /*return*/];
                            }
                        });
                    }); });
                    // 初回実行
                    console.log('Running initial race collection...');
                    return [4 /*yield*/, dailyCollector.getTodayGradeRaces()];
                case 10:
                    races_4 = _b.sent();
                    console.log('Found races:', races_4);
                    _a = 0, races_2 = races_4;
                    _b.label = 11;
                case 11:
                    if (!(_a < races_2.length)) return [3 /*break*/, 16];
                    race = races_2[_a];
                    console.log('Processing race:', race);
                    return [4 /*yield*/, dailyCollector.registerRace(race)];
                case 12:
                    _b.sent();
                    return [4 /*yield*/, dailyCollector.scheduleOddsCollection(race)];
                case 13:
                    _b.sent();
                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 5000); })];
                case 14:
                    _b.sent();
                    _b.label = 15;
                case 15:
                    _a++;
                    return [3 /*break*/, 11];
                case 16:
                    // 毎日8:55に再取得
                    console.log('Setting up 8:55 schedule');
                    schedule.scheduleJob('55 8 * * *', function () { return __awaiter(_this, void 0, void 0, function () {
                        var races, _i, races_5, race;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    console.log('Running 8:55 race collection...');
                                    return [4 /*yield*/, dailyCollector.getTodayGradeRaces()];
                                case 1:
                                    races = _a.sent();
                                    _i = 0, races_5 = races;
                                    _a.label = 2;
                                case 2:
                                    if (!(_i < races_5.length)) return [3 /*break*/, 6];
                                    race = races_5[_i];
                                    return [4 /*yield*/, dailyCollector.registerRace(race)];
                                case 3:
                                    _a.sent();
                                    return [4 /*yield*/, dailyCollector.scheduleOddsCollection(race)];
                                case 4:
                                    _a.sent();
                                    _a.label = 5;
                                case 5:
                                    _i++;
                                    return [3 /*break*/, 2];
                                case 6: return [2 /*return*/];
                            }
                        });
                    }); });
                    _b.label = 17;
                case 17: return [3 /*break*/, 19];
                case 18:
                    error_5 = _b.sent();
                    console.error('Error in main process:', error_5);
                    return [3 /*break*/, 19];
                case 19: return [2 /*return*/];
            }
        });
    });
}
// スクリプト実行
main().catch(console.error);
