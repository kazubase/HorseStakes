var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
import { getGeminiStrategy } from './geminiApi';
export var calculateBetProposals = function (horses, totalBudget, riskRatio, fukuData, wakurenData, umarenData, wideData, umaTanData, sanrenpukuData, sanrentanData) {
    var MIN_STAKE = 100;
    if (process.env.NODE_ENV === 'development') {
        console.group('馬券購入戦略の計算過程');
        // デバッグ用：入力値の確認
        console.log('入力パラメータ:', {
            horses: horses.map(function (h) { return ({
                name: h.name,
                odds: h.odds,
                winProb: (h.winProb * 100).toFixed(1) + '%',
                placeProb: (h.placeProb * 100).toFixed(1) + '%'
            }); }),
            totalBudget: totalBudget,
            riskRatio: riskRatio
        });
        console.groupEnd();
    }
    // オッズ行列の作成（期待値がプラスの馬券のみを対象とする）
    var bettingOptions = horses.flatMap(function (horse) {
        var options = [];
        // 単勝オプション
        var winEV = horse.odds * horse.winProb - 1;
        if (horse.winProb > 0 && winEV > 0) {
            options.push({
                type: "単勝",
                horseName: "".concat(horse.number, " ").concat(horse.name),
                odds: horse.odds,
                prob: horse.winProb,
                ev: winEV,
                frame1: 0,
                frame2: 0,
                frame3: 0,
                horse1: 0,
                horse2: 0,
                horse3: 0
            });
            console.log("\u5358\u52DD\u5019\u88DC: ".concat(horse.number, " ").concat(horse.name), {
                オッズ: horse.odds.toFixed(1),
                的中確率: (horse.winProb * 100).toFixed(2) + '%',
                期待値: winEV.toFixed(2)
            });
        }
        return options;
    });
    // 複勝オプションの追加
    fukuData.forEach(function (fuku) {
        var horse = horses.find(function (h) { return h.number === fuku.horse1; });
        if (!horse)
            return;
        // 複勝の平均オッズ計算
        var avgOdds = Math.round(((fuku.oddsMin + fuku.oddsMax) / 2) * 10) / 10;
        var placeEV = avgOdds * horse.placeProb - 1;
        if (horse.placeProb > 0 && placeEV > 0) {
            bettingOptions.push({
                type: "複勝",
                horseName: "".concat(horse.number, " ").concat(horse.name),
                odds: avgOdds,
                prob: horse.placeProb,
                ev: placeEV,
                frame1: 0,
                frame2: 0,
                frame3: 0,
                horse1: 0,
                horse2: 0,
                horse3: 0
            });
            console.log("\u8907\u52DD\u5019\u88DC: ".concat(horse.number, " ").concat(horse.name), {
                オッズ: avgOdds.toFixed(1),
                的中確率: (horse.placeProb * 100).toFixed(2) + '%',
                期待値: placeEV.toFixed(2)
            });
        }
    });
    // 枠連オプションの追加
    wakurenData.forEach(function (wakuren) {
        // 対象の枠の馬を取得
        var frame1Horses = horses.filter(function (h) { return h.frame === wakuren.frame1; });
        var frame2Horses = horses.filter(function (h) { return h.frame === wakuren.frame2; });
        // 枠連的中確率の計算
        var wakurenProb = 0;
        // 同じ枠の場合（例：1-1）
        if (wakuren.frame1 === wakuren.frame2) {
            // 同じ枠内の異なる馬の組み合わせのみを計算
            for (var i = 0; i < frame1Horses.length; i++) {
                for (var j = i + 1; j < frame1Horses.length; j++) {
                    var h1 = frame1Horses[i];
                    var h2 = frame1Horses[j];
                    // h1が1着、h2が2着のケース
                    wakurenProb += h1.winProb * ((h2.placeProb - h2.winProb) / 2);
                    // h2が1着、h1が2着のケース
                    wakurenProb += h2.winProb * ((h1.placeProb - h1.winProb) / 2);
                }
            }
        }
        else {
            // 異なる枠の場合（例：1-2, 7-8）
            // 全ての組み合わせを計算
            frame1Horses.forEach(function (h1) {
                frame2Horses.forEach(function (h2) {
                    // h1が1着、h2が2着のケース
                    wakurenProb += h1.winProb * ((h2.placeProb - h2.winProb) / 2);
                    // h2が1着、h1が2着のケース
                    wakurenProb += h2.winProb * ((h1.placeProb - h1.winProb) / 2);
                });
            });
        }
        var wakurenEV = wakuren.odds * wakurenProb - 1;
        if (wakurenProb > 0 && wakurenEV > 0) {
            bettingOptions.push({
                type: "枠連",
                horseName: "".concat(wakuren.frame1, "-").concat(wakuren.frame2),
                frame1: wakuren.frame1,
                frame2: wakuren.frame2,
                frame3: 0,
                odds: wakuren.odds,
                prob: wakurenProb,
                ev: wakurenEV,
                horse1: 0,
                horse2: 0,
                horse3: 0
            });
            console.log("\u67A0\u9023\u5019\u88DC: ".concat(wakuren.frame1, "-").concat(wakuren.frame2), {
                オッズ: wakuren.odds.toFixed(1),
                的中確率: (wakurenProb * 100).toFixed(2) + '%',
                期待値: wakurenEV.toFixed(2)
            });
        }
    });
    // 馬連オプションの追加
    umarenData.forEach(function (umaren) {
        var horse1 = horses.find(function (h) { return h.number === umaren.horse1; });
        var horse2 = horses.find(function (h) { return h.number === umaren.horse2; });
        if (!horse1 || !horse2)
            return;
        // 馬連的中確率の計算
        var umarenProb = 0;
        // horse1が1着、horse2が2着のケース
        var h2SecondProb = (horse2.placeProb - horse2.winProb) / 2;
        umarenProb += horse1.winProb * h2SecondProb;
        // horse2が1着、horse1が2着のケース
        var h1SecondProb = (horse1.placeProb - horse1.winProb) / 2;
        umarenProb += horse2.winProb * h1SecondProb;
        var umarenEV = umaren.odds * umarenProb - 1;
        if (umarenProb > 0 && umarenEV > 0) {
            bettingOptions.push({
                type: "馬連",
                horseName: "".concat(horse1.number, "-").concat(horse2.number),
                frame1: horse1.frame,
                frame2: horse2.frame,
                frame3: 0,
                horse1: horse1.number,
                horse2: horse2.number,
                horse3: 0,
                odds: umaren.odds,
                prob: umarenProb,
                ev: umarenEV
            });
            console.log("\u99AC\u9023\u5019\u88DC: ".concat(horse1.number, "-").concat(horse2.number), {
                オッズ: umaren.odds.toFixed(1),
                的中確率: (umarenProb * 100).toFixed(2) + '%',
                期待値: umarenEV.toFixed(2)
            });
        }
    });
    // ワイドオプションの追加
    wideData.forEach(function (wide) {
        var horse1 = horses.find(function (h) { return h.number === wide.horse1; });
        var horse2 = horses.find(function (h) { return h.number === wide.horse2; });
        if (!horse1 || !horse2)
            return;
        // ワイド的中確率の計算（両方が複勝圏内に入る確率）
        var wideProb = horse1.placeProb * horse2.placeProb;
        // ワイドの平均オッズ計算
        var avgOdds = Math.round(((wide.oddsMin + wide.oddsMax) / 2) * 10) / 10;
        var wideEV = avgOdds * wideProb - 1;
        if (wideProb > 0 && wideEV > 0) {
            bettingOptions.push({
                type: "ワイド",
                horseName: "".concat(horse1.number, "-").concat(horse2.number),
                frame1: horse1.frame,
                frame2: horse2.frame,
                frame3: 0,
                horse1: horse1.number,
                horse2: horse2.number,
                horse3: 0,
                odds: avgOdds,
                prob: wideProb,
                ev: wideEV
            });
            console.log("\u30EF\u30A4\u30C9\u5019\u88DC: ".concat(horse1.number, "-").concat(horse2.number), {
                オッズ: avgOdds.toFixed(1),
                的中確率: (wideProb * 100).toFixed(2) + '%',
                期待値: wideEV.toFixed(2)
            });
        }
    });
    // 馬単オプションの追加
    umaTanData.forEach(function (umatan) {
        var horse1 = horses.find(function (h) { return h.number === umatan.horse1; });
        var horse2 = horses.find(function (h) { return h.number === umatan.horse2; });
        if (!horse1 || !horse2)
            return;
        // 馬単的中確率の計算（1着と2着の順番が重要）
        var umatanProb = horse1.winProb * ((horse2.placeProb - horse2.winProb) / 2);
        var umatanEV = umatan.odds * umatanProb - 1;
        if (umatanProb > 0 && umatanEV > 0) {
            bettingOptions.push({
                type: "馬単",
                horseName: "".concat(horse1.number, "\u2192").concat(horse2.number),
                frame1: horse1.frame,
                frame2: horse2.frame,
                frame3: 0,
                horse1: horse1.number,
                horse2: horse2.number,
                horse3: 0,
                odds: umatan.odds,
                prob: umatanProb,
                ev: umatanEV
            });
            console.log("\u99AC\u5358\u5019\u88DC: ".concat(horse1.number, "\u2192").concat(horse2.number), {
                オッズ: umatan.odds.toFixed(1),
                的中確率: (umatanProb * 100).toFixed(2) + '%',
                期待値: umatanEV.toFixed(2)
            });
        }
    });
    // 3連複オプションの追加
    sanrenpukuData.forEach(function (sanren) {
        var horse1 = horses.find(function (h) { return h.number === sanren.horse1; });
        var horse2 = horses.find(function (h) { return h.number === sanren.horse2; });
        var horse3 = horses.find(function (h) { return h.number === sanren.horse3; });
        if (!horse1 || !horse2 || !horse3)
            return;
        // 3連複的中確率の計算（順不同で3頭が上位3着以内に入る確率）
        var sanrenProb = 0;
        // 全ての順列パターンを考慮
        // 1-2-3のパターン
        sanrenProb += horse1.winProb *
            ((horse2.placeProb - horse2.winProb) / 2) *
            ((horse3.placeProb - horse3.winProb) / 2);
        // 1-3-2のパターン
        sanrenProb += horse1.winProb *
            ((horse3.placeProb - horse3.winProb) / 2) *
            ((horse2.placeProb - horse2.winProb) / 2);
        // 2-1-3のパターン
        sanrenProb += horse2.winProb *
            ((horse1.placeProb - horse1.winProb) / 2) *
            ((horse3.placeProb - horse3.winProb) / 2);
        // 2-3-1のパターン
        sanrenProb += horse2.winProb *
            ((horse3.placeProb - horse3.winProb) / 2) *
            ((horse1.placeProb - horse1.winProb) / 2);
        // 3-1-2のパターン
        sanrenProb += horse3.winProb *
            ((horse1.placeProb - horse1.winProb) / 2) *
            ((horse2.placeProb - horse2.winProb) / 2);
        // 3-2-1のパターン
        sanrenProb += horse3.winProb *
            ((horse2.placeProb - horse2.winProb) / 2) *
            ((horse1.placeProb - horse1.winProb) / 2);
        var sanrenEV = sanren.odds * sanrenProb - 1;
        if (sanrenProb > 0 && sanrenEV > 0) {
            bettingOptions.push({
                type: "３連複",
                horseName: "".concat(horse1.number, "-").concat(horse2.number, "-").concat(horse3.number),
                frame1: horse1.frame,
                frame2: horse2.frame,
                frame3: horse3.frame,
                horse1: horse1.number,
                horse2: horse2.number,
                horse3: horse3.number,
                odds: sanren.odds,
                prob: sanrenProb,
                ev: sanrenEV
            });
            console.log("3\u9023\u8907\u5019\u88DC: ".concat(horse1.number, "-").concat(horse2.number, "-").concat(horse3.number), {
                オッズ: sanren.odds.toFixed(1),
                的中確率: (sanrenProb * 100).toFixed(2) + '%',
                期待値: sanrenEV.toFixed(2)
            });
        }
    });
    // 3連単オプションの追加
    sanrentanData.forEach(function (sanren) {
        var horse1 = horses.find(function (h) { return h.number === sanren.horse1; });
        var horse2 = horses.find(function (h) { return h.number === sanren.horse2; });
        var horse3 = horses.find(function (h) { return h.number === sanren.horse3; });
        if (!horse1 || !horse2 || !horse3)
            return;
        // 3連単的中確率の計算（1着2着3着の順番が重要）
        var sanrentanProb = horse1.winProb *
            ((horse2.placeProb - horse2.winProb) / 2) *
            ((horse3.placeProb - horse3.winProb) / 2);
        var sanrentanEV = sanren.odds * sanrentanProb - 1;
        if (sanrentanProb > 0 && sanrentanEV > 0) {
            bettingOptions.push({
                type: "３連単",
                horseName: "".concat(horse1.number, "\u2192").concat(horse2.number, "\u2192").concat(horse3.number),
                frame1: horse1.frame,
                frame2: horse2.frame,
                frame3: horse3.frame,
                horse1: horse1.number,
                horse2: horse2.number,
                horse3: horse3.number,
                odds: sanren.odds,
                prob: sanrentanProb,
                ev: sanrentanEV
            });
            console.log("3\u9023\u5358\u5019\u88DC: ".concat(horse1.number, "\u2192").concat(horse2.number, "\u2192").concat(horse3.number), {
                オッズ: sanren.odds.toFixed(1),
                的中確率: (sanrentanProb * 100).toFixed(2) + '%',
                期待値: sanrentanEV.toFixed(2)
            });
        }
    });
    // デバッグ用：最適化対象の馬券一覧
    console.log('最適化対象馬券数:', bettingOptions.length);
    // 最適化の評価関数を修正
    var findOptimalWeights = function (options) {
        var _a, _b, _c;
        // 馬券種別ごとのリスク特性を定義
        var getBetTypeRiskFactor = function (type) {
            switch (type) {
                case "単勝":
                    return 1.5; // 単勝のリスク
                case "複勝":
                    return 1.0; // 基準
                case "枠連":
                    return 2.0; // 枠連のリスク
                case "馬連":
                    return 3.0; // 馬連のリスク
                case "ワイド":
                    return 2.0; // ワイドのリスク
                case "馬単":
                    return 4.0; // 馬単のリスク
                case "３連複":
                    return 6.0; // 3連複のリスク
                case "３連単":
                    return 8.0; // 3連単のリスク
                default:
                    return 1.0;
            }
        };
        // ポートフォリオの評価関数
        var calculatePortfolioMetrics = function (bets, weights) {
            if (bets.length === 0 || weights.length === 0)
                return null;
            var totalInvestment = weights.reduce(function (a, b) { return a + b; }, 0);
            // 期待リターンの計算（馬券種別のリスク特性を考慮）
            var returns = bets.map(function (bet, i) {
                return weights[i] * (bet.odds - 1) * bet.prob / getBetTypeRiskFactor(bet.type);
            });
            var expectedReturn = returns.reduce(function (a, b) { return a + b; }, 0);
            // リスク（標準偏差）の計算
            var variance = bets.map(function (bet, i) {
                var r = (bet.odds - 1) * weights[i] / getBetTypeRiskFactor(bet.type);
                return bet.prob * (1 - bet.prob) * r * r;
            }).reduce(function (a, b) { return a + b; }, 0);
            var risk = Math.sqrt(variance);
            var sharpeRatio = risk > 0 ? expectedReturn / risk : 0;
            // 目標リターンとの整合性
            var returnDifference = Math.abs(expectedReturn - riskRatio) / riskRatio;
            var isWithinRiskRange = expectedReturn <= riskRatio * 1.5;
            // 分散投資効果（効果を抑制）
            var betTypes = new Set(bets.map(function (b) { return b.type; }));
            var typeBonus = betTypes.size > 1 ? Math.log(betTypes.size) * 0.05 : 0; // 0.1 → 0.05
            var portfolioEffect = Math.log(bets.length) * 0.1 + typeBonus; // 0.2 → 0.1
            // 総合評価スコア（Sharpe比の重みを増加）
            var score = isWithinRiskRange ? (sharpeRatio * 4.0 + // 2.0 → 4.0 Sharpe比の重みを倍増
                portfolioEffect - // 分散効果を半減
                returnDifference * 1.0 // 0.5 → 1.0 リターン整合性の重みを増加
            ) : -Infinity;
            return {
                sharpeRatio: sharpeRatio,
                expectedReturn: expectedReturn,
                risk: risk,
                portfolioEffect: portfolioEffect,
                score: score,
                isWithinRiskRange: isWithinRiskRange,
                betTypes: Array.from(betTypes),
                betsCount: bets.length
            };
        };
        // 事前フィルタリング（統合版）
        var preFilteredOptions = options
            .filter(function (opt) {
            var riskFactor = getBetTypeRiskFactor(opt.type);
            // オッズの下限のみを設定
            var minOdds = Math.max(1.0, riskRatio * 0.5 * riskFactor);
            // リスクリワード比率に応じて最小確率を調整
            var minProbability = Math.max(0.005, 1 / (riskRatio * riskFactor));
            // 最低期待値
            var minEV = 0.5;
            return opt.odds >= minOdds &&
                opt.prob >= minProbability &&
                opt.ev >= minEV;
        })
            .sort(function (a, b) { return b.ev - a.ev; });
        // 馬券種別ごとの選択数を調整
        var adjustBetsByType = function (options) {
            // 馬券種別ごとの最小・最大点数を定義
            var betTypeRanges = {
                "複勝": { min: 0, max: 2 },
                "単勝": { min: 0, max: 3 },
                "枠連": { min: 0, max: 4 },
                "馬連": { min: 0, max: 6 },
                "ワイド": { min: 0, max: 4 },
                "馬単": { min: 0, max: 8 },
                "３連複": { min: 0, max: 12 },
                "３連単": { min: 0, max: 16 }
            };
            // 馬券種別にグループ化
            var betsByType = options.reduce(function (acc, bet) {
                if (!acc[bet.type])
                    acc[bet.type] = [];
                acc[bet.type].push(bet);
                return acc;
            }, {});
            // 各馬券種の選択数を調整
            var adjustedOptions = [];
            Object.entries(betsByType).forEach(function (_a) {
                var type = _a[0], bets = _a[1];
                var range = betTypeRanges[type];
                // 利用可能な候補数と設定された範囲から適切な選択数を決定
                var selectionCount = Math.min(bets.length, // 利用可能な候補数を超えない
                Math.max(range.min, // 最小点数は必ず確保
                Math.min(range.max, bets.length) // 最大点数を超えない
                ));
                // 期待値順で上位n件を選択
                adjustedOptions = adjustedOptions.concat(bets.slice(0, selectionCount));
                console.log("\u99AC\u5238\u7A2E\u5225\u9078\u629E\u6570\u8ABF\u6574: ".concat(type), {
                    設定範囲: "".concat(range.min, "\uFF5E").concat(range.max, "\u70B9"),
                    候補数: bets.length,
                    選択数: selectionCount,
                    選択された馬券: bets.slice(0, selectionCount).map(function (b) { return ({
                        馬番組合せ: b.horseName,
                        期待値: b.ev.toFixed(3)
                    }); })
                });
            });
            return adjustedOptions.sort(function (a, b) { return b.ev - a.ev; });
        };
        // 馬券種別ごとの選択数を調整
        var adjustedOptions = adjustBetsByType(preFilteredOptions);
        console.log('購入点数範囲:', {
            調整後の対象馬券数: adjustedOptions.length,
            馬券種別構成: Object.entries(adjustedOptions.reduce(function (acc, bet) {
                acc[bet.type] = (acc[bet.type] || 0) + 1;
                return acc;
            }, {}))
        });
        var bestBets = [];
        var bestWeights = [];
        var bestMetrics = null;
        // 最適な組み合わせを探索（より少ない点数から開始）
        for (var size = Math.min(5, adjustedOptions.length); size <= adjustedOptions.length; size++) {
            var _loop_1 = function (iter) {
                // ランダムに馬券を選択（馬券種別の構成を維持）
                var selectedBets = adjustedOptions
                    .sort(function () { return Math.random() - 0.5; })
                    .slice(0, size);
                // 重みの最適化
                var weights = selectedBets.map(function () { return 0.6 + (Math.random() * 0.4); });
                var sum = weights.reduce(function (a, b) { return a + b; }, 0);
                var normalizedWeights_1 = weights.map(function (w) { return w / sum; });
                var metrics = calculatePortfolioMetrics(selectedBets, normalizedWeights_1);
                if (!metrics || !metrics.isWithinRiskRange)
                    return "continue";
                var isBetter = !bestMetrics || metrics.score > bestMetrics.score;
                if (isBetter) {
                    bestMetrics = metrics;
                    bestBets = selectedBets;
                    bestWeights = normalizedWeights_1;
                    console.log('改善発見:', {
                        betsCount: selectedBets.length,
                        betTypes: metrics.betTypes,
                        adjustedOdds: metrics.expectedReturn.toFixed(3),
                        sharpeRatio: metrics.sharpeRatio.toFixed(3),
                        risk: metrics.risk.toFixed(3),
                        portfolioEffect: metrics.portfolioEffect.toFixed(3),
                        score: metrics.score.toFixed(3)
                    });
                }
            };
            for (var iter = 0; iter < 100; iter++) {
                _loop_1(iter);
            }
        }
        // 重みの正規化を行う
        var normalizedWeights = __spreadArray([], bestWeights, true);
        if (bestWeights.length > 0) {
            // 重みの合計を計算
            var totalWeight_1 = bestWeights.reduce(function (sum, w) { return sum + w; }, 0);
            // 各重みを調整して、合計が1になるようにする
            normalizedWeights = bestWeights.map(function (w) { return w / totalWeight_1; });
        }
        // 結果を投資額に変換し、ソート
        var proposals = bestBets
            .map(function (bet, i) { return ({
            type: bet.type,
            horses: [bet.horseName],
            horseName: bet.horseName,
            stake: Number((totalBudget * normalizedWeights[i]).toFixed(1)), // 小数点1桁に制限
            expectedReturn: Number((totalBudget * normalizedWeights[i] * bet.odds).toFixed(1)), // 小数点1桁に制限
            probability: bet.prob
        }); })
            .sort(function (a, b) {
            var typeOrder = {
                "単勝": 1,
                "複勝": 2,
                "枠連": 3,
                "馬連": 4,
                "ワイド": 5,
                "馬単": 6,
                "３連複": 7,
                "３連単": 8
            };
            // 馬券種別でソート
            var typeCompare = typeOrder[a.type] - typeOrder[b.type];
            if (typeCompare !== 0)
                return typeCompare;
            // 同じ馬券種別なら投資額の大きい順
            return b.stake - a.stake;
        });
        // 最終結果のログ出力を改善
        console.log('最終結果:', {
            sharpeRatio: (_a = bestMetrics === null || bestMetrics === void 0 ? void 0 : bestMetrics.sharpeRatio.toFixed(3)) !== null && _a !== void 0 ? _a : -Infinity,
            expectedReturn: (_b = bestMetrics === null || bestMetrics === void 0 ? void 0 : bestMetrics.expectedReturn.toFixed(3)) !== null && _b !== void 0 ? _b : 0,
            risk: (_c = bestMetrics === null || bestMetrics === void 0 ? void 0 : bestMetrics.risk.toFixed(3)) !== null && _c !== void 0 ? _c : 0,
            totalBets: proposals.length,
            totalInvestment: proposals.reduce(function (sum, p) { return sum + p.stake; }, 0),
            bets: proposals.map(function (p) { return ({
                type: p.type,
                horses: p.horses,
                horseName: p.horseName,
                stake: p.stake,
                expectedReturn: p.expectedReturn,
                probability: (p.probability * 100).toFixed(1) + '%'
            }); })
        });
        return proposals;
    };
    // メイン処理
    var proposals = findOptimalWeights(bettingOptions);
    return proposals;
};
export var optimizeBetAllocation = function (recommendations, totalBudget) {
    console.group('Sharpe比最大化による資金配分の最適化');
    var processedRecs = recommendations.map(function (rec) { return (__assign(__assign({}, rec), { probability: typeof rec.probability === 'string'
            ? parseFloat(rec.probability.replace('%', '')) / 100
            : rec.probability })); });
    // 馬券間の排反関係を計算する関数
    var calculateMutualExclusivity = function (bet1, bet2) {
        // 同じ馬券種別の場合
        if (bet1.type === bet2.type) {
            // 単勝・枠連・馬連・馬単・3連複・3連単は完全に排反
            if (["単勝", "枠連", "馬連", "馬単", "３連複", "３連単"].includes(bet1.type)) {
                return 1.0;
            }
            // 複勝の場合
            if (bet1.type === "複勝") {
                // 同じ馬を含む場合
                if (bet1.horses.some(function (h) { return bet2.horses.includes(h); })) {
                    return 1.0; // 同じ馬の複勝を重複購入することはないため
                }
                // 異なる馬の場合は、3着以内に入る確率の関係で部分的に排反
                return 0.4; // 簡略化した近似値
            }
            // ワイドの場合
            if (bet1.type === "ワイド") {
                var commonHorses_1 = bet1.horses.filter(function (h) { return bet2.horses.includes(h); });
                if (commonHorses_1.length === 2) {
                    return 1.0; // 完全に同じ組み合わせ
                }
                if (commonHorses_1.length === 1) {
                    return 0.5; // 1頭共通
                }
                return 0.2; // 共通馬なし
            }
        }
        // 異なる馬券種別の場合
        var commonHorses = bet1.horses.filter(function (h) { return bet2.horses.includes(h); });
        if (commonHorses.length === 0)
            return 0;
        // 共通する馬がいる場合、券種の組み合わせに応じて排反度を設定
        if (bet1.type === "単勝" || bet2.type === "単勝") {
            return 0.8; // 単勝が絡む場合は強い排反関係
        }
        if (bet1.type === "複勝" || bet2.type === "複勝") {
            return 0.4; // 複勝が絡む場合は弱い排反関係
        }
        return 0.6; // その他の組み合わせは中程度の排反関係
    };
    var calculateSharpeRatio = function (weights) {
        // 期待リターンの計算（排反事象を考慮）
        var returns = weights.map(function (w, i) {
            var adjustedProb = processedRecs[i].probability;
            // 他の馬券との排反関係を考慮して確率を調整
            weights.forEach(function (otherW, j) {
                if (i !== j && otherW > 0) {
                    var exclusivity = calculateMutualExclusivity(processedRecs[i], processedRecs[j]);
                    adjustedProb *= (1 - exclusivity * processedRecs[j].probability);
                }
            });
            return w * (processedRecs[i].odds - 1) * adjustedProb;
        });
        var expectedReturn = returns.reduce(function (a, b) { return a + b; }, 0);
        // 分散の計算（排反事象を考慮）
        var variance = weights.map(function (w, i) {
            var r = (processedRecs[i].odds - 1) * w;
            var adjustedProb = processedRecs[i].probability;
            // 他の馬券との排反関係を考慮
            weights.forEach(function (otherW, j) {
                if (i !== j && otherW > 0) {
                    var exclusivity = calculateMutualExclusivity(processedRecs[i], processedRecs[j]);
                    adjustedProb *= (1 - exclusivity * processedRecs[j].probability);
                }
            });
            return adjustedProb * (1 - adjustedProb) * r * r;
        }).reduce(function (a, b) { return a + b; }, 0);
        var risk = Math.sqrt(variance);
        return { sharpeRatio: risk > 0 ? expectedReturn / risk : 0, expectedReturn: expectedReturn, risk: risk };
    };
    var bestWeights = [];
    var bestMetrics = { sharpeRatio: -Infinity, expectedReturn: 0, risk: 0 };
    for (var iter = 0; iter < 1000; iter++) {
        var weights = Array(processedRecs.length).fill(0)
            .map(function () { return Math.random(); })
            .map(function (w, _, arr) { return w / arr.reduce(function (a, b) { return a + b; }, 0); });
        var metrics = calculateSharpeRatio(weights);
        if (metrics.sharpeRatio > bestMetrics.sharpeRatio) {
            bestMetrics = metrics;
            bestWeights = weights;
            console.log('改善:', {
                iteration: iter,
                sharpeRatio: metrics.sharpeRatio.toFixed(3),
                expectedReturn: metrics.expectedReturn.toFixed(3),
                risk: metrics.risk.toFixed(3)
            });
        }
    }
    console.groupEnd();
    return processedRecs.map(function (rec, i) { return ({
        type: rec.type,
        horses: rec.horses,
        horseName: ["馬単", "３連単"].includes(rec.type)
            ? rec.horses.join('→')
            : rec.horses.join('-'),
        stake: Math.floor(totalBudget * bestWeights[i] / 100) * 100,
        expectedReturn: rec.odds * Math.floor(totalBudget * bestWeights[i] / 100) * 100,
        probability: rec.probability,
        reason: rec.reason
    }); })
        .filter(function (bet) { return bet.stake >= 100; })
        .sort(function (a, b) {
        var typeOrder = {
            "単勝": 1,
            "複勝": 2,
            "枠連": 3,
            "馬連": 4,
            "ワイド": 5,
            "馬単": 6,
            "3連複": 7,
            "3連単": 8
        };
        // 馬券種別でソート
        var typeCompare = typeOrder[a.type] - typeOrder[b.type];
        if (typeCompare !== 0)
            return typeCompare;
        // 同じ馬券種別なら投資額の大きい順
        return b.stake - a.stake;
    });
};
export var calculateBetProposalsWithGemini = function (horses, totalBudget, allBettingOptions, riskRatio) { return __awaiter(void 0, void 0, void 0, function () {
    var geminiOptions, geminiResponse, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                geminiOptions = {
                    horses: horses.map(function (h) { return ({
                        name: h.name,
                        odds: h.odds,
                        winProb: h.winProb,
                        placeProb: h.placeProb,
                        frame: h.frame,
                        number: h.number
                    }); }),
                    bettingOptions: allBettingOptions.bettingOptions
                };
                return [4 /*yield*/, getGeminiStrategy([], totalBudget, geminiOptions, riskRatio)];
            case 1:
                geminiResponse = _a.sent();
                // 資金配分の最適化
                return [2 /*return*/, optimizeBetAllocation(geminiResponse.strategy.recommendations, totalBudget)];
            case 2:
                error_1 = _a.sent();
                console.error('Bet calculation error:', error_1);
                return [2 /*return*/, []];
            case 3: return [2 /*return*/];
        }
    });
}); };
