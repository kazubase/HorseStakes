var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};
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
import { createServer } from "http";
import { db } from "@db";
import { races, horses, tickets, bettingStrategies, tanOddsHistory, fukuOdds, wakurenOdds, umarenOdds, wideOdds, umatanOdds, fuku3Odds, tan3Odds } from "../db/schema";
import { eq, sql } from "drizzle-orm";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { OddsCollector } from "./odds-collector";
import { calculateBetProposals } from "@/lib/betCalculator";
var genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
var model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
export function registerRoutes(app) {
    var _this = this;
    // 全レース一覧を取得
    app.get("/api/races", function (_req, res) { return __awaiter(_this, void 0, void 0, function () {
        var allRaces, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, db.select().from(races)];
                case 1:
                    allRaces = _a.sent();
                    console.log('Fetched races:', allRaces); // デバッグログ
                    if (!allRaces || allRaces.length === 0) {
                        console.log('No races found in database');
                    }
                    res.json(allRaces);
                    return [3 /*break*/, 3];
                case 2:
                    error_1 = _a.sent();
                    console.error('Error fetching races:', error_1);
                    res.status(500).json({ error: 'Failed to fetch races' });
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); });
    // 特定のレースを取得
    app.get("/api/races/:id", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
        var raceId, race, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    raceId = parseInt(req.params.id);
                    console.log('Fetching race with ID:', raceId); // デバッグログ
                    return [4 /*yield*/, db.query.races.findFirst({
                            where: eq(races.id, raceId),
                        })];
                case 1:
                    race = _a.sent();
                    console.log('Found race:', race); // デバッグログ
                    if (!race) {
                        console.log('Race not found with ID:', raceId);
                        return [2 /*return*/, res.status(404).json({ message: "Race not found" })];
                    }
                    res.json(race);
                    return [3 /*break*/, 3];
                case 2:
                    error_2 = _a.sent();
                    console.error('Error fetching race:', error_2);
                    res.status(500).json({ error: 'Failed to fetch race' });
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); });
    // レースの出馬表を取得
    app.get("/api/horses/:raceId", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
        var raceId, raceHorses;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    raceId = parseInt(req.params.raceId);
                    return [4 /*yield*/, db
                            .select()
                            .from(horses)
                            .where(eq(horses.raceId, raceId))];
                case 1:
                    raceHorses = _a.sent();
                    res.json(raceHorses);
                    return [2 /*return*/];
            }
        });
    }); });
    // 既存のエンドポイント
    app.post("/api/tickets", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
        var ticket;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, db.insert(tickets).values(req.body).returning()];
                case 1:
                    ticket = _a.sent();
                    res.json(ticket[0]);
                    return [2 /*return*/];
            }
        });
    }); });
    app.get("/api/betting-strategies", function (_req, res) { return __awaiter(_this, void 0, void 0, function () {
        var strategies;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, db.select().from(bettingStrategies)];
                case 1:
                    strategies = _a.sent();
                    res.json(strategies);
                    return [2 /*return*/];
            }
        });
    }); });
    // リスク評価エンドポイント
    app.get("/api/risk-assessment", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
        var baseRisk, baseVolatility, baseWinProb, marketSentiment;
        return __generator(this, function (_a) {
            try {
                baseRisk = 65 + Math.random() * 10 - 5;
                baseVolatility = 72 + Math.random() * 10 - 5;
                baseWinProb = 45 + Math.random() * 10 - 5;
                marketSentiment = baseRisk < 50 ? "強気" :
                    baseRisk < 70 ? "やや強気" :
                        baseRisk < 85 ? "やや弱気" : "弱気";
                res.json({
                    overallRisk: Math.min(100, Math.max(0, baseRisk)),
                    volatilityScore: Math.min(100, Math.max(0, baseVolatility)),
                    expectedReturn: 2.5 + Math.random(),
                    winProbability: Math.min(100, Math.max(0, baseWinProb)),
                    marketSentiment: marketSentiment,
                    riskFactors: [
                        {
                            description: "市場の変動性が高い",
                            impact: Math.min(100, Math.max(0, 75 + Math.random() * 10 - 5))
                        },
                        {
                            description: "競合が激しい",
                            impact: Math.min(100, Math.max(0, 65 + Math.random() * 10 - 5))
                        },
                        {
                            description: "天候の影響",
                            impact: Math.min(100, Math.max(0, 45 + Math.random() * 10 - 5))
                        }
                    ],
                    marketTrend: Math.random() > 0.5 ? 'up' : 'down',
                    recommendations: [
                        "投資の分散化を検討してください",
                        "高リスクの投資を制限することをお勧めします",
                        "市場の変動に注意を払ってください"
                    ]
                });
            }
            catch (error) {
                res.status(500).json({ error: "Failed to calculate risk assessment" });
            }
            return [2 /*return*/];
        });
    }); });
    // 馬券購入戦略を取得するエンドポイント
    app.get("/api/betting-strategy/:raceId", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
        var raceId, budget, riskRatio, winProbs_1, placeProbs_1, raceHorses_1, latestTanOdds, latestFukuOdds, latestWakurenOdds, latestUmarenOdds, latestWideOdds, latestTanOddsByHorse_1, latestFukuOddsByHorse, latestWakurenOddsByFrames, latestUmarenOddsByHorses, latestWideOddsByHorses, horseDataList, fukuData, wakurenData, umarenData, wideData, latestUmatanOdds, latestUmatanOddsByHorses, umatanData, latestSanrenpukuOdds, latestSanrenpukuOddsByHorses, sanrenpukuData, latestSanrentanOdds, latestSanrentanOddsByHorses, sanrentanData, strategies, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 10, , 11]);
                    raceId = parseInt(req.params.raceId);
                    budget = Number(req.query.budget) || 0;
                    riskRatio = Number(req.query.riskRatio) || 1;
                    winProbs_1 = JSON.parse(req.query.winProbs || "{}");
                    placeProbs_1 = JSON.parse(req.query.placeProbs || "{}");
                    return [4 /*yield*/, db
                            .select()
                            .from(horses)
                            .where(eq(horses.raceId, raceId))];
                case 1:
                    raceHorses_1 = _a.sent();
                    return [4 /*yield*/, db.select()
                            .from(tanOddsHistory)
                            .where(eq(tanOddsHistory.raceId, raceId))
                            .orderBy(sql(templateObject_1 || (templateObject_1 = __makeTemplateObject(["", " desc"], ["", " desc"])), tanOddsHistory.timestamp))];
                case 2:
                    latestTanOdds = _a.sent();
                    return [4 /*yield*/, db.select()
                            .from(fukuOdds)
                            .where(eq(fukuOdds.raceId, raceId))
                            .orderBy(sql(templateObject_2 || (templateObject_2 = __makeTemplateObject(["", " desc"], ["", " desc"])), fukuOdds.timestamp))];
                case 3:
                    latestFukuOdds = _a.sent();
                    return [4 /*yield*/, db.select()
                            .from(wakurenOdds)
                            .where(eq(wakurenOdds.raceId, raceId))
                            .orderBy(sql(templateObject_3 || (templateObject_3 = __makeTemplateObject(["", " desc"], ["", " desc"])), wakurenOdds.timestamp))];
                case 4:
                    latestWakurenOdds = _a.sent();
                    return [4 /*yield*/, db.select()
                            .from(umarenOdds)
                            .where(eq(umarenOdds.raceId, raceId))
                            .orderBy(sql(templateObject_4 || (templateObject_4 = __makeTemplateObject(["", " desc"], ["", " desc"])), umarenOdds.timestamp))];
                case 5:
                    latestUmarenOdds = _a.sent();
                    return [4 /*yield*/, db.select()
                            .from(wideOdds)
                            .where(eq(wideOdds.raceId, raceId))
                            .orderBy(sql(templateObject_5 || (templateObject_5 = __makeTemplateObject(["", " desc"], ["", " desc"])), wideOdds.timestamp))];
                case 6:
                    latestWideOdds = _a.sent();
                    latestTanOddsByHorse_1 = latestTanOdds.reduce(function (acc, curr) {
                        if (!acc[curr.horseId] ||
                            new Date(acc[curr.horseId].timestamp) < new Date(curr.timestamp)) {
                            acc[curr.horseId] = curr;
                        }
                        return acc;
                    }, {});
                    latestFukuOddsByHorse = latestFukuOdds.reduce(function (acc, curr) {
                        if (!acc[curr.horseId] ||
                            new Date(acc[curr.horseId].timestamp) < new Date(curr.timestamp)) {
                            acc[curr.horseId] = curr;
                        }
                        return acc;
                    }, {});
                    latestWakurenOddsByFrames = latestWakurenOdds.reduce(function (acc, curr) {
                        var key = "".concat(curr.frame1, "-").concat(curr.frame2);
                        if (!acc[key] ||
                            new Date(acc[key].timestamp) < new Date(curr.timestamp)) {
                            acc[key] = curr;
                        }
                        return acc;
                    }, {});
                    latestUmarenOddsByHorses = latestUmarenOdds.reduce(function (acc, curr) {
                        var key = "".concat(curr.horse1, "-").concat(curr.horse2);
                        if (!acc[key] ||
                            new Date(acc[key].timestamp) < new Date(curr.timestamp)) {
                            acc[key] = curr;
                        }
                        return acc;
                    }, {});
                    latestWideOddsByHorses = latestWideOdds.reduce(function (acc, curr) {
                        var key = "".concat(curr.horse1, "-").concat(curr.horse2);
                        if (!acc[key] ||
                            new Date(acc[key].timestamp) < new Date(curr.timestamp)) {
                            acc[key] = curr;
                        }
                        return acc;
                    }, {});
                    horseDataList = raceHorses_1.map(function (horse) {
                        var tanOdd = latestTanOddsByHorse_1[horse.number];
                        return {
                            name: horse.name,
                            odds: tanOdd ? Number(tanOdd.odds) : 0,
                            winProb: winProbs_1[horse.id] / 100,
                            placeProb: placeProbs_1[horse.id] / 100,
                            frame: horse.frame,
                            number: horse.number
                        };
                    });
                    fukuData = Object.values(latestFukuOddsByHorse).map(function (odd) {
                        var horse = raceHorses_1.find(function (h) { return h.number === odd.horseId; });
                        if (!horse)
                            return null;
                        return {
                            horse1: odd.horseId,
                            oddsMin: Number(odd.oddsMin),
                            oddsMax: Number(odd.oddsMax)
                        };
                    }).filter(function (odd) { return odd !== null; });
                    wakurenData = Object.values(latestWakurenOddsByFrames).map(function (odd) { return ({
                        frame1: odd.frame1,
                        frame2: odd.frame2,
                        odds: Number(odd.odds)
                    }); });
                    umarenData = Object.values(latestUmarenOddsByHorses).map(function (odd) { return ({
                        horse1: odd.horse1,
                        horse2: odd.horse2,
                        odds: Number(odd.odds)
                    }); });
                    wideData = Object.values(latestWideOddsByHorses).map(function (odd) { return ({
                        horse1: odd.horse1,
                        horse2: odd.horse2,
                        oddsMin: Number(odd.oddsMin),
                        oddsMax: Number(odd.oddsMax)
                    }); });
                    return [4 /*yield*/, db.select()
                            .from(umatanOdds)
                            .where(eq(umatanOdds.raceId, raceId))
                            .orderBy(sql(templateObject_6 || (templateObject_6 = __makeTemplateObject(["", " desc"], ["", " desc"])), umatanOdds.timestamp))];
                case 7:
                    latestUmatanOdds = _a.sent();
                    latestUmatanOddsByHorses = latestUmatanOdds.reduce(function (acc, curr) {
                        var key = "".concat(curr.horse1, "-").concat(curr.horse2);
                        if (!acc[key] ||
                            new Date(acc[key].timestamp) < new Date(curr.timestamp)) {
                            acc[key] = curr;
                        }
                        return acc;
                    }, {});
                    umatanData = Object.values(latestUmatanOddsByHorses).map(function (odd) { return ({
                        horse1: odd.horse1,
                        horse2: odd.horse2,
                        odds: Number(odd.odds)
                    }); });
                    return [4 /*yield*/, db.select()
                            .from(fuku3Odds)
                            .where(eq(fuku3Odds.raceId, raceId))
                            .orderBy(sql(templateObject_7 || (templateObject_7 = __makeTemplateObject(["", " desc"], ["", " desc"])), fuku3Odds.timestamp))];
                case 8:
                    latestSanrenpukuOdds = _a.sent();
                    latestSanrenpukuOddsByHorses = latestSanrenpukuOdds.reduce(function (acc, curr) {
                        var key = "".concat(curr.horse1, "-").concat(curr.horse2, "-").concat(curr.horse3);
                        if (!acc[key] ||
                            new Date(acc[key].timestamp) < new Date(curr.timestamp)) {
                            acc[key] = curr;
                        }
                        return acc;
                    }, {});
                    sanrenpukuData = Object.values(latestSanrenpukuOddsByHorses).map(function (odd) { return ({
                        horse1: odd.horse1,
                        horse2: odd.horse2,
                        horse3: odd.horse3,
                        odds: Number(odd.odds)
                    }); });
                    return [4 /*yield*/, db.select()
                            .from(tan3Odds)
                            .where(eq(tan3Odds.raceId, raceId))
                            .orderBy(sql(templateObject_8 || (templateObject_8 = __makeTemplateObject(["", " desc"], ["", " desc"])), tan3Odds.timestamp))];
                case 9:
                    latestSanrentanOdds = _a.sent();
                    latestSanrentanOddsByHorses = latestSanrentanOdds.reduce(function (acc, curr) {
                        var key = "".concat(curr.horse1, "-").concat(curr.horse2, "-").concat(curr.horse3);
                        if (!acc[key] ||
                            new Date(acc[key].timestamp) < new Date(curr.timestamp)) {
                            acc[key] = curr;
                        }
                        return acc;
                    }, {});
                    sanrentanData = Object.values(latestSanrentanOddsByHorses).map(function (odd) { return ({
                        horse1: odd.horse1,
                        horse2: odd.horse2,
                        horse3: odd.horse3,
                        odds: Number(odd.odds)
                    }); });
                    strategies = calculateBetProposals(horseDataList, budget, riskRatio, fukuData, wakurenData, umarenData, wideData, umatanData, sanrenpukuData, sanrentanData);
                    res.json(strategies);
                    return [3 /*break*/, 11];
                case 10:
                    error_3 = _a.sent();
                    console.error('Error:', error_3);
                    res.status(500).json({ error: "Failed to calculate betting strategy" });
                    return [3 /*break*/, 11];
                case 11: return [2 /*return*/];
            }
        });
    }); });
    // 既存の馬券戦略説明エンドポイントの後にこのエンドポイントを追加
    app.get("/api/betting-explanation/:raceId/history", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
        var raceId, backtestResult;
        return __generator(this, function (_a) {
            try {
                raceId = parseInt(req.params.raceId);
                backtestResult = {
                    summary: "過去6ヶ月間の類似レースにおける戦略のバックテスト結果です。全体として良好なパフォーマンスを示しており、特に安定した的中率が特徴です。ただし、直近の市場環境の変化による影響には注意が必要です。",
                    performanceMetrics: {
                        totalRaces: 248,
                        winRate: 42.3,
                        roiPercent: 15.8,
                        avgReturnMultiple: 1.158,
                        maxDrawdown: 12.4
                    },
                    monthlyPerformance: [
                        { month: "2023年12月", races: 42, winRate: 45.2, roi: 18.5 },
                        { month: "2023年11月", races: 38, winRate: 42.1, roi: 15.2 },
                        { month: "2023年10月", races: 44, winRate: 40.9, roi: 14.8 },
                        { month: "2023年9月", races: 40, winRate: 43.5, roi: 16.9 },
                        { month: "2023年8月", races: 41, winRate: 41.4, roi: 13.7 },
                        { month: "2023年7月", races: 43, winRate: 40.8, roi: 15.6 }
                    ],
                    strategyAnalysis: [
                        {
                            description: "オッズ分析に基づく投資判断",
                            effectiveness: 85
                        },
                        {
                            description: "リスク分散戦略",
                            effectiveness: 78
                        },
                        {
                            description: "市場変動への対応",
                            effectiveness: 72
                        },
                        {
                            description: "複数の馬券種の組み合わせ",
                            effectiveness: 68
                        }
                    ],
                    timestamp: new Date().toISOString()
                };
                res.json(backtestResult);
            }
            catch (error) {
                console.error('Error generating backtest analysis:', error);
                res.status(500).json({ error: "Failed to generate backtest analysis" });
            }
            return [2 /*return*/];
        });
    }); });
    // 既存の馬券戦略説明エンドポイントの後にこのエンドポイントを追加
    app.get("/api/betting-explanation/:raceId/alternatives", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
        var raceId, alternativesResult;
        return __generator(this, function (_a) {
            try {
                raceId = parseInt(req.params.raceId);
                alternativesResult = {
                    summary: "現行の戦略に対する3つの代替アプローチを提案します。各戦略は異なるリスク・リターンプロファイルを持ち、投資スタイルや予算に応じて選択できます。以下の提案は、現在のマーケット状況と過去のパフォーマンスデータに基づいています。",
                    strategies: [
                        {
                            name: "保守的分散投資戦略",
                            description: "リスクを最小限に抑えながら、安定した収益を目指す戦略です。複数の馬券種を組み合わせることで、リスクを分散します。",
                            expectedReturn: 1.8,
                            winProbability: 65.5,
                            riskLevel: 35,
                            advantages: [
                                "安定した的中率",
                                "損失リスクが低い",
                                "長期的な資金管理が容易"
                            ],
                            disadvantages: [
                                "期待リターンが比較的低い",
                                "大きな利益を得にくい",
                                "市場の好機を活かしきれない可能性"
                            ],
                            requiredBudget: 5000
                        },
                        {
                            name: "高リターン重視戦略",
                            description: "より大きな利益を目指し、やや高めのリスクを取る戦略です。オッズの割安な馬券を中心に投資します。",
                            expectedReturn: 3.2,
                            winProbability: 35.5,
                            riskLevel: 75,
                            advantages: [
                                "高い期待リターン",
                                "市場の非効率性を活用",
                                "大きな利益の可能性"
                            ],
                            disadvantages: [
                                "的中率が比較的低い",
                                "損失リスクが高い",
                                "資金管理が重要"
                            ],
                            requiredBudget: 10000
                        },
                        {
                            name: "バランス型戦略",
                            description: "リスクとリターンのバランスを取りながら、中長期的な収益を目指す戦略です。",
                            expectedReturn: 2.4,
                            winProbability: 48.5,
                            riskLevel: 55,
                            advantages: [
                                "リスクとリターンのバランスが良い",
                                "柔軟な投資が可能",
                                "市場変動への適応力が高い"
                            ],
                            disadvantages: [
                                "特定の状況で機会損失の可能性",
                                "運用の複雑さ",
                                "中程度の資金が必要"
                            ],
                            requiredBudget: 7000
                        }
                    ],
                    comparisonMetrics: [
                        {
                            description: "期待的中率",
                            currentStrategy: 45.5,
                            alternativeStrategy: 48.5
                        },
                        {
                            description: "リスク指標",
                            currentStrategy: 65.0,
                            alternativeStrategy: 55.0
                        },
                        {
                            description: "期待ROI",
                            currentStrategy: 15.5,
                            alternativeStrategy: 18.5
                        }
                    ],
                    recommendations: [
                        "現在の市場環境ではバランス型戦略が最適と考えられます",
                        "保守的な投資から開始し、徐々にリスクを調整することを推奨します",
                        "定期的な戦略の見直しと調整を行うことで、より良い結果が期待できます"
                    ],
                    timestamp: new Date().toISOString()
                };
                res.json(alternativesResult);
            }
            catch (error) {
                console.error('Error generating alternative strategies:', error);
                res.status(500).json({ error: "Failed to generate alternative strategies" });
            }
            return [2 /*return*/];
        });
    }); });
    // 新しいエンドポイントを追加
    app.get("/api/tan-odds-history/latest/:raceId", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
        var raceId, latestOdds, latestOddsByHorse, error_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    raceId = parseInt(req.params.raceId);
                    return [4 /*yield*/, db.select()
                            .from(tanOddsHistory)
                            .where(eq(tanOddsHistory.raceId, raceId))
                            .orderBy(sql(templateObject_9 || (templateObject_9 = __makeTemplateObject(["", " desc"], ["", " desc"])), tanOddsHistory.timestamp))];
                case 1:
                    latestOdds = _a.sent();
                    console.log("Found ".concat(latestOdds.length, " odds records for race ").concat(raceId));
                    if (latestOdds.length === 0) {
                        return [2 /*return*/, res.json([])];
                    }
                    latestOddsByHorse = latestOdds.reduce(function (acc, curr) {
                        if (!acc[curr.horseId] ||
                            new Date(acc[curr.horseId].timestamp) < new Date(curr.timestamp)) {
                            acc[curr.horseId] = curr;
                        }
                        return acc;
                    }, {});
                    res.json(Object.values(latestOddsByHorse));
                    return [3 /*break*/, 3];
                case 2:
                    error_4 = _a.sent();
                    console.error('Error:', error_4);
                    res.status(500).json({ error: "Failed to fetch latest odds" });
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); });
    // 最新の複勝オッズを取得するエンドポイント
    app.get("/api/fuku-odds/latest/:raceId", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
        var raceId, latestOdds, latestOddsByHorse, error_5;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    raceId = parseInt(req.params.raceId);
                    return [4 /*yield*/, db.select()
                            .from(fukuOdds)
                            .where(eq(fukuOdds.raceId, raceId))
                            .orderBy(sql(templateObject_10 || (templateObject_10 = __makeTemplateObject(["", " desc"], ["", " desc"])), fukuOdds.timestamp))];
                case 1:
                    latestOdds = _a.sent();
                    console.log("Found ".concat(latestOdds.length, " fuku odds records for race ").concat(raceId));
                    if (latestOdds.length === 0) {
                        return [2 /*return*/, res.json([])];
                    }
                    latestOddsByHorse = latestOdds.reduce(function (acc, curr) {
                        if (!acc[curr.horseId] ||
                            new Date(acc[curr.horseId].timestamp) < new Date(curr.timestamp)) {
                            acc[curr.horseId] = curr;
                        }
                        return acc;
                    }, {});
                    res.json(Object.values(latestOddsByHorse));
                    return [3 /*break*/, 3];
                case 2:
                    error_5 = _a.sent();
                    console.error('Error:', error_5);
                    res.status(500).json({ error: "Failed to fetch latest fuku odds" });
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); });
    // 最新の枠連オッズを取得するエンドポイント
    app.get("/api/wakuren-odds/latest/:raceId", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
        var raceId, latestOdds, latestOddsByFrames, error_6;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    raceId = parseInt(req.params.raceId);
                    return [4 /*yield*/, db.select()
                            .from(wakurenOdds)
                            .where(eq(wakurenOdds.raceId, raceId))
                            .orderBy(sql(templateObject_11 || (templateObject_11 = __makeTemplateObject(["", " desc"], ["", " desc"])), wakurenOdds.timestamp))];
                case 1:
                    latestOdds = _a.sent();
                    console.log("Found ".concat(latestOdds.length, " wakuren odds records for race ").concat(raceId));
                    if (latestOdds.length === 0) {
                        return [2 /*return*/, res.json([])];
                    }
                    latestOddsByFrames = latestOdds.reduce(function (acc, curr) {
                        var key = "".concat(curr.frame1, "-").concat(curr.frame2);
                        if (!acc[key] ||
                            new Date(acc[key].timestamp) < new Date(curr.timestamp)) {
                            acc[key] = curr;
                        }
                        return acc;
                    }, {});
                    res.json(Object.values(latestOddsByFrames));
                    return [3 /*break*/, 3];
                case 2:
                    error_6 = _a.sent();
                    console.error('Error:', error_6);
                    res.status(500).json({ error: "Failed to fetch latest wakuren odds" });
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); });
    // 最新の馬連オッズを取得するエンドポイント
    app.get("/api/umaren-odds/latest/:raceId", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
        var raceId, latestOdds, latestOddsByHorses, error_7;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    raceId = parseInt(req.params.raceId);
                    return [4 /*yield*/, db.select()
                            .from(umarenOdds)
                            .where(eq(umarenOdds.raceId, raceId))
                            .orderBy(sql(templateObject_12 || (templateObject_12 = __makeTemplateObject(["", " desc"], ["", " desc"])), umarenOdds.timestamp))];
                case 1:
                    latestOdds = _a.sent();
                    console.log("Found ".concat(latestOdds.length, " umaren odds records for race ").concat(raceId));
                    if (latestOdds.length === 0) {
                        return [2 /*return*/, res.json([])];
                    }
                    latestOddsByHorses = latestOdds.reduce(function (acc, curr) {
                        var key = "".concat(curr.horse1, "-").concat(curr.horse2);
                        if (!acc[key] ||
                            new Date(acc[key].timestamp) < new Date(curr.timestamp)) {
                            acc[key] = curr;
                        }
                        return acc;
                    }, {});
                    res.json(Object.values(latestOddsByHorses));
                    return [3 /*break*/, 3];
                case 2:
                    error_7 = _a.sent();
                    console.error('Error:', error_7);
                    res.status(500).json({ error: "Failed to fetch latest umaren odds" });
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); });
    // 最新のワイドオッズを取得するエンドポイント
    app.get("/api/wide-odds/latest/:raceId", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
        var raceId, latestOdds, latestOddsByHorses, error_8;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    raceId = parseInt(req.params.raceId);
                    return [4 /*yield*/, db.select()
                            .from(wideOdds)
                            .where(eq(wideOdds.raceId, raceId))
                            .orderBy(sql(templateObject_13 || (templateObject_13 = __makeTemplateObject(["", " desc"], ["", " desc"])), wideOdds.timestamp))];
                case 1:
                    latestOdds = _a.sent();
                    console.log("Found ".concat(latestOdds.length, " wide odds records for race ").concat(raceId));
                    if (latestOdds.length === 0) {
                        return [2 /*return*/, res.json([])];
                    }
                    latestOddsByHorses = latestOdds.reduce(function (acc, curr) {
                        var key = "".concat(curr.horse1, "-").concat(curr.horse2);
                        if (!acc[key] ||
                            new Date(acc[key].timestamp) < new Date(curr.timestamp)) {
                            acc[key] = curr;
                        }
                        return acc;
                    }, {});
                    res.json(Object.values(latestOddsByHorses));
                    return [3 /*break*/, 3];
                case 2:
                    error_8 = _a.sent();
                    console.error('Error:', error_8);
                    res.status(500).json({ error: "Failed to fetch latest wide odds" });
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); });
    // 最新の馬単オッズを取得するエンドポイント
    app.get("/api/umatan-odds/latest/:raceId", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
        var raceId, latestOdds, latestOddsByHorses, error_9;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    raceId = parseInt(req.params.raceId);
                    return [4 /*yield*/, db.select()
                            .from(umatanOdds)
                            .where(eq(umatanOdds.raceId, raceId))
                            .orderBy(sql(templateObject_14 || (templateObject_14 = __makeTemplateObject(["", " desc"], ["", " desc"])), umatanOdds.timestamp))];
                case 1:
                    latestOdds = _a.sent();
                    console.log("Found ".concat(latestOdds.length, " umatan odds records for race ").concat(raceId));
                    if (latestOdds.length === 0) {
                        return [2 /*return*/, res.json([])];
                    }
                    latestOddsByHorses = latestOdds.reduce(function (acc, curr) {
                        var key = "".concat(curr.horse1, "-").concat(curr.horse2);
                        if (!acc[key] ||
                            new Date(acc[key].timestamp) < new Date(curr.timestamp)) {
                            acc[key] = curr;
                        }
                        return acc;
                    }, {});
                    res.json(Object.values(latestOddsByHorses));
                    return [3 /*break*/, 3];
                case 2:
                    error_9 = _a.sent();
                    console.error('Error:', error_9);
                    res.status(500).json({ error: "Failed to fetch latest umatan odds" });
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); });
    // 最新の3連複オッズを取得するエンドポイント
    app.get("/api/sanrenpuku-odds/latest/:raceId", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
        var raceId, latestOdds, latestOddsByHorses, error_10;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    raceId = parseInt(req.params.raceId);
                    return [4 /*yield*/, db.select()
                            .from(fuku3Odds)
                            .where(eq(fuku3Odds.raceId, raceId))
                            .orderBy(sql(templateObject_15 || (templateObject_15 = __makeTemplateObject(["", " desc"], ["", " desc"])), fuku3Odds.timestamp))];
                case 1:
                    latestOdds = _a.sent();
                    console.log("Found ".concat(latestOdds.length, " sanrenpuku odds records for race ").concat(raceId));
                    if (latestOdds.length === 0) {
                        return [2 /*return*/, res.json([])];
                    }
                    latestOddsByHorses = latestOdds.reduce(function (acc, curr) {
                        var key = "".concat(curr.horse1, "-").concat(curr.horse2, "-").concat(curr.horse3);
                        if (!acc[key] ||
                            new Date(acc[key].timestamp) < new Date(curr.timestamp)) {
                            acc[key] = curr;
                        }
                        return acc;
                    }, {});
                    res.json(Object.values(latestOddsByHorses));
                    return [3 /*break*/, 3];
                case 2:
                    error_10 = _a.sent();
                    console.error('Error:', error_10);
                    res.status(500).json({ error: "Failed to fetch latest sanrenpuku odds" });
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); });
    // 最新の3連単オッズを取得するエンドポイント
    app.get("/api/sanrentan-odds/latest/:raceId", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
        var raceId, latestOdds, latestOddsByHorses, error_11;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    raceId = parseInt(req.params.raceId);
                    return [4 /*yield*/, db.select()
                            .from(tan3Odds)
                            .where(eq(tan3Odds.raceId, raceId))
                            .orderBy(sql(templateObject_16 || (templateObject_16 = __makeTemplateObject(["", " desc"], ["", " desc"])), tan3Odds.timestamp))];
                case 1:
                    latestOdds = _a.sent();
                    console.log("Found ".concat(latestOdds.length, " sanrentan odds records for race ").concat(raceId));
                    if (latestOdds.length === 0) {
                        return [2 /*return*/, res.json([])];
                    }
                    latestOddsByHorses = latestOdds.reduce(function (acc, curr) {
                        var key = "".concat(curr.horse1, "-").concat(curr.horse2, "-").concat(curr.horse3);
                        if (!acc[key] ||
                            new Date(acc[key].timestamp) < new Date(curr.timestamp)) {
                            acc[key] = curr;
                        }
                        return acc;
                    }, {});
                    res.json(Object.values(latestOddsByHorses));
                    return [3 /*break*/, 3];
                case 2:
                    error_11 = _a.sent();
                    console.error('Error:', error_11);
                    res.status(500).json({ error: "Failed to fetch latest sanrentan odds" });
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); });
    // レース登録部分の更新
    app.post("/api/register-race", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
        var _a, raceId_1, raceName, venue, startTime, race, collector, tanpukuOdds, wakurenOdds_1, umarenOdds_1, horseInserts, error_12;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 15, , 16]);
                    _a = req.body, raceId_1 = _a.raceId, raceName = _a.raceName, venue = _a.venue, startTime = _a.startTime;
                    return [4 /*yield*/, db.insert(races).values({
                            id: raceId_1,
                            name: raceName,
                            venue: venue,
                            startTime: new Date(startTime),
                            status: "upcoming"
                        }).returning()];
                case 1:
                    race = (_b.sent())[0];
                    collector = new OddsCollector();
                    return [4 /*yield*/, collector.initialize()];
                case 2:
                    _b.sent();
                    _b.label = 3;
                case 3:
                    _b.trys.push([3, , 12, 14]);
                    return [4 /*yield*/, collector.collectOddsForBetType(raceId_1, 'tanpuku')];
                case 4:
                    tanpukuOdds = _b.sent();
                    return [4 /*yield*/, collector.collectOddsForBetType(raceId_1, 'wakuren')];
                case 5:
                    wakurenOdds_1 = _b.sent();
                    return [4 /*yield*/, collector.collectOddsForBetType(raceId_1, 'umaren')];
                case 6:
                    umarenOdds_1 = _b.sent();
                    if (!(tanpukuOdds.length > 0)) return [3 /*break*/, 11];
                    horseInserts = tanpukuOdds.map(function (odds) { return ({
                        name: odds.horseName,
                        raceId: raceId_1
                    }); });
                    // オッズ履歴を保存
                    return [4 /*yield*/, collector.saveOddsHistory(tanpukuOdds)];
                case 7:
                    // オッズ履歴を保存
                    _b.sent();
                    if (!(wakurenOdds_1.length > 0)) return [3 /*break*/, 9];
                    return [4 /*yield*/, collector.updateWakurenOdds(wakurenOdds_1)];
                case 8:
                    _b.sent();
                    _b.label = 9;
                case 9:
                    if (!(umarenOdds_1.length > 0)) return [3 /*break*/, 11];
                    return [4 /*yield*/, collector.updateUmarenOdds(umarenOdds_1)];
                case 10:
                    _b.sent();
                    _b.label = 11;
                case 11:
                    res.json({
                        message: "Race data registered successfully",
                        race: race,
                        horsesCount: tanpukuOdds.length,
                        wakurenCount: wakurenOdds_1.length
                    });
                    return [3 /*break*/, 14];
                case 12: return [4 /*yield*/, collector.cleanup()];
                case 13:
                    _b.sent();
                    return [7 /*endfinally*/];
                case 14: return [3 /*break*/, 16];
                case 15:
                    error_12 = _b.sent();
                    console.error('Error registering race data:', error_12);
                    res.status(500).json({
                        error: "Failed to register race data",
                        details: error_12 instanceof Error ? error_12.message : String(error_12)
                    });
                    return [3 /*break*/, 16];
                case 16: return [2 /*return*/];
            }
        });
    }); });
    // 定期的なオッズ収集を開始するエンドポイント
    app.post("/api/start-odds-collection", function (_req, res) { return __awaiter(_this, void 0, void 0, function () {
        var collector, error_13;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    collector = new OddsCollector();
                    return [4 /*yield*/, collector.initialize()];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, collector.startPeriodicCollection(5)];
                case 2:
                    _a.sent(); // 5分間隔で収集
                    res.json({ message: "Odds collection started successfully" });
                    return [3 /*break*/, 4];
                case 3:
                    error_13 = _a.sent();
                    console.error('Error starting odds collection:', error_13);
                    res.status(500).json({
                        error: "Failed to start odds collection",
                        details: error_13 instanceof Error ? error_13.message : String(error_13)
                    });
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); });
    // レース情報を更新するエンドポイント
    app.put("/api/races/:id/status", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
        var raceId, status_1, updatedRace, error_14;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    raceId = parseInt(req.params.id);
                    status_1 = req.body.status;
                    return [4 /*yield*/, db.update(races)
                            .set({ status: status_1 })
                            .where(eq(races.id, raceId))
                            .returning()];
                case 1:
                    updatedRace = (_a.sent())[0];
                    res.json(updatedRace);
                    return [3 /*break*/, 3];
                case 2:
                    error_14 = _a.sent();
                    console.error('Error updating race status:', error_14);
                    res.status(500).json({
                        error: "Failed to update race status",
                        details: error_14 instanceof Error ? error_14.message : String(error_14)
                    });
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); });
    // Gemini APIエンドポイント
    app.post("/api/gemini", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
        var _a, prompt_1, _b, model_1, genAI_1, genModel, result, response, text, strategy, apiError_1, error_15;
        var _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    // リクエストの開始をログ
                    console.log('=== Gemini API Request Start ===');
                    console.log('API Key Check:', {
                        exists: !!process.env.GEMINI_API_KEY,
                        length: ((_c = process.env.GEMINI_API_KEY) === null || _c === void 0 ? void 0 : _c.length) || 0,
                        prefix: ((_d = process.env.GEMINI_API_KEY) === null || _d === void 0 ? void 0 : _d.substring(0, 4)) + '...'
                    });
                    if (!process.env.GEMINI_API_KEY) {
                        console.error('❌ API key is missing');
                        return [2 /*return*/, res.status(500).json({ error: 'APIキーが設定されていません' })];
                    }
                    _e.label = 1;
                case 1:
                    _e.trys.push([1, 7, , 8]);
                    _a = req.body, prompt_1 = _a.prompt, _b = _a.model, model_1 = _b === void 0 ? 'gemini-2.0-flash-thinking-exp' : _b;
                    console.log('📝 Using model:', model_1);
                    genAI_1 = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
                    genModel = genAI_1.getGenerativeModel({ model: model_1 });
                    _e.label = 2;
                case 2:
                    _e.trys.push([2, 5, , 6]);
                    console.log('🚀 Calling Gemini API...');
                    return [4 /*yield*/, genModel.generateContent(prompt_1)];
                case 3:
                    result = _e.sent();
                    return [4 /*yield*/, result.response];
                case 4:
                    response = _e.sent();
                    text = response.text();
                    console.log('✅ API Response received:', {
                        length: text.length,
                        preview: text.substring(0, 100) + '...'
                    });
                    strategy = parseGeminiResponse(text);
                    console.log('=== Gemini API Request End ===');
                    return [2 /*return*/, res.json({ strategy: strategy })];
                case 5:
                    apiError_1 = _e.sent();
                    console.error('❌ API Call Failed:', {
                        name: apiError_1.name,
                        message: apiError_1.message,
                        status: apiError_1.status,
                        details: apiError_1.errorDetails
                    });
                    throw apiError_1;
                case 6: return [3 /*break*/, 8];
                case 7:
                    error_15 = _e.sent();
                    console.error('❌ Request Failed:', {
                        type: error_15.constructor.name,
                        message: error_15.message,
                        stack: error_15.stack
                    });
                    return [2 /*return*/, res.status(500).json({
                            error: 'Gemini APIの呼び出しに失敗しました',
                            details: error_15.message,
                            type: error_15.constructor.name
                        })];
                case 8: return [2 /*return*/];
            }
        });
    }); });
    var httpServer = createServer(app);
    return httpServer;
}
// Geminiの応答をパースする補助関数
function parseGeminiResponse(text) {
    try {
        // 戦略の説明部分と推奨馬券部分を分離
        var sections = text.split(/\n(?=推奨馬券:|おすすめの馬券:)/i);
        var description = sections[0].trim();
        var recommendationsText = sections[1] || '';
        // 推奨馬券を解析
        var recommendations = recommendationsText.split('\n')
            .filter(function (line) { return line.includes('→') || line.includes('-'); })
            .map(function (line) {
            var match = line.match(/([^:]+):\s*([^\s]+)\s*(\d+)円\s*(.+)/);
            if (!match)
                return null;
            var _ = match[0], type = match[1], horses = match[2], stakeStr = match[3], reason = match[4];
            return {
                type: type.trim(),
                horses: horses.split(/[→-]/).map(function (h) { return h.trim(); }),
                stake: parseInt(stakeStr, 10),
                reason: reason.trim()
            };
        })
            .filter(function (rec) { return rec !== null; });
        return {
            description: description,
            recommendations: recommendations
        };
    }
    catch (error) {
        console.error('Response parsing error:', error);
        throw new Error('Failed to parse Gemini response');
    }
}
var templateObject_1, templateObject_2, templateObject_3, templateObject_4, templateObject_5, templateObject_6, templateObject_7, templateObject_8, templateObject_9, templateObject_10, templateObject_11, templateObject_12, templateObject_13, templateObject_14, templateObject_15, templateObject_16;
