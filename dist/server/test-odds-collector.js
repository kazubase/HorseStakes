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
function testCurrentRaceOddsCollection() {
    return __awaiter(this, void 0, void 0, function () {
        var collector, raceId, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    collector = new OddsCollector();
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, 5, 7]);
                    console.log('Initializing browser...');
                    return [4 /*yield*/, collector.initialize()];
                case 2:
                    _a.sent();
                    raceId = 202510010111;
                    return [4 /*yield*/, collectOddsForRace(collector, raceId)];
                case 3:
                    _a.sent();
                    return [3 /*break*/, 7];
                case 4:
                    error_1 = _a.sent();
                    console.error('Error during test:', error_1);
                    return [3 /*break*/, 7];
                case 5: return [4 /*yield*/, collector.cleanup()];
                case 6:
                    _a.sent();
                    console.log('Test completed');
                    return [7 /*endfinally*/];
                case 7: return [2 /*return*/];
            }
        });
    });
}
function testPastRaceOddsCollection() {
    return __awaiter(this, void 0, void 0, function () {
        var collector, raceId, pastRaceUrl, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    collector = new OddsCollector();
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, 5, 7]);
                    console.log('Initializing browser...');
                    return [4 /*yield*/, collector.initialize()];
                case 2:
                    _a.sent();
                    raceId = 202406050811;
                    pastRaceUrl = 'https://www.jra.go.jp/JRADB/accessS.html?CNAME=pw01sde1006202405081120241222/AF';
                    return [4 /*yield*/, collectOddsForRace(collector, raceId, pastRaceUrl)];
                case 3:
                    _a.sent();
                    return [3 /*break*/, 7];
                case 4:
                    error_2 = _a.sent();
                    console.error('Error during test:', error_2);
                    return [3 /*break*/, 7];
                case 5: return [4 /*yield*/, collector.cleanup()];
                case 6:
                    _a.sent();
                    console.log('Test completed');
                    return [7 /*endfinally*/];
                case 7: return [2 /*return*/];
            }
        });
    });
}
function collectOddsForRace(collector, raceId, pastRaceUrl) {
    return __awaiter(this, void 0, void 0, function () {
        var existingRace, betTypes, _i, betTypes_1, betType, odds, _a, odds_1, odd, existingHorse, error_3, updateMethod;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, db.query.races.findFirst({
                        where: eq(races.id, raceId)
                    })];
                case 1:
                    existingRace = _b.sent();
                    if (!!existingRace) return [3 /*break*/, 3];
                    console.log('Registering new race...');
                    return [4 /*yield*/, db.insert(races).values({
                            id: raceId,
                            name: "\u5C0F\u5009\u725D\u99AC\u30B9\u30C6\u30FC\u30AF\u30B9",
                            venue: "小倉",
                            startTime: new Date('2025-01-25T15:25:00'),
                            status: "upcoming"
                        })];
                case 2:
                    _b.sent();
                    console.log('Race registered successfully');
                    _b.label = 3;
                case 3:
                    betTypes = ['tanpuku', 'wakuren', 'umaren', 'wide', 'umatan', 'fuku3', 'tan3'];
                    _i = 0, betTypes_1 = betTypes;
                    _b.label = 4;
                case 4:
                    if (!(_i < betTypes_1.length)) return [3 /*break*/, 22];
                    betType = betTypes_1[_i];
                    console.log("Collecting ".concat(betType, " odds for race ID: ").concat(raceId));
                    return [4 /*yield*/, collector.collectOddsForBetType(raceId, betType, pastRaceUrl)];
                case 5:
                    odds = _b.sent();
                    console.log("Collected ".concat(betType, " odds data:"), odds);
                    if (!(odds.length > 0)) return [3 /*break*/, 21];
                    if (!(betType === 'tanpuku')) return [3 /*break*/, 18];
                    _a = 0, odds_1 = odds;
                    _b.label = 6;
                case 6:
                    if (!(_a < odds_1.length)) return [3 /*break*/, 16];
                    odd = odds_1[_a];
                    _b.label = 7;
                case 7:
                    _b.trys.push([7, 14, , 15]);
                    return [4 /*yield*/, db.query.horses.findFirst({
                            where: and(eq(horses.name, odd.horseName), eq(horses.raceId, raceId))
                        })];
                case 8:
                    existingHorse = _b.sent();
                    if (!!existingHorse) return [3 /*break*/, 10];
                    console.log("Registering horse: ".concat(odd.horseName, " (Race: ").concat(raceId, ", Frame: ").concat(odd.frame, ", Number: ").concat(odd.number, ", Status: ").concat(odd.odds === '取消' ? '取消' : '出走', ")"));
                    return [4 /*yield*/, db.insert(horses).values({
                            name: odd.horseName,
                            raceId: raceId,
                            frame: odd.frame,
                            number: odd.number,
                            status: odd.odds === '取消' ? 'scratched' : 'running' // ステータスカラムを追加
                        })];
                case 9:
                    _b.sent();
                    return [3 /*break*/, 13];
                case 10:
                    if (!(odd.odds === '取消' && existingHorse.status !== 'scratched')) return [3 /*break*/, 12];
                    console.log("Updating horse status to scratched: ".concat(odd.horseName, " (Race: ").concat(raceId, ")"));
                    return [4 /*yield*/, db.update(horses)
                            .set({ status: 'scratched' })
                            .where(and(eq(horses.name, odd.horseName), eq(horses.raceId, raceId)))];
                case 11:
                    _b.sent();
                    _b.label = 12;
                case 12:
                    console.log("Horse ".concat(odd.horseName, " already exists for race ").concat(raceId, " with status ").concat(existingHorse.status));
                    _b.label = 13;
                case 13: return [3 /*break*/, 15];
                case 14:
                    error_3 = _b.sent();
                    console.error("Error handling horse ".concat(odd.horseName, " for race ").concat(raceId, ":"), error_3);
                    return [3 /*break*/, 15];
                case 15:
                    _a++;
                    return [3 /*break*/, 6];
                case 16: return [4 /*yield*/, collector.saveOddsHistory(odds)];
                case 17:
                    _b.sent();
                    return [3 /*break*/, 20];
                case 18:
                    updateMethod = {
                        wakuren: collector.updateWakurenOdds.bind(collector),
                        umaren: collector.updateUmarenOdds.bind(collector),
                        wide: collector.updateWideOdds.bind(collector),
                        umatan: collector.updateUmatanOdds.bind(collector),
                        fuku3: collector.updateFuku3Odds.bind(collector),
                        tan3: collector.updateTan3Odds.bind(collector)
                    }[betType];
                    return [4 /*yield*/, updateMethod(odds)];
                case 19:
                    _b.sent();
                    _b.label = 20;
                case 20:
                    console.log("".concat(betType, " odds data saved successfully"));
                    _b.label = 21;
                case 21:
                    _i++;
                    return [3 /*break*/, 4];
                case 22: return [2 /*return*/];
            }
        });
    });
}
// 実行したい方のコメントアウトを外して使用
testCurrentRaceOddsCollection();
// testPastRaceOddsCollection();
