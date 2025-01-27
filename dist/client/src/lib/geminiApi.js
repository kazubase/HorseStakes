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
// 券種の順序を定義
var betTypeOrder = [
    '単勝',
    '複勝',
    '枠連',
    '馬連',
    'ワイド',
    '馬単',
    '3連複',
    '3連単'
];
var getCsrfToken = function () {
    var _a;
    var token = (_a = document.querySelector('meta[name="csrf-token"]')) === null || _a === void 0 ? void 0 : _a.content;
    if (!token) {
        throw new Error('CSRFトークンが見つかりません');
    }
    return token;
};
// リクエストにリトライロジックを追加
var fetchWithRetry = function (url_1, options_1) {
    var args_1 = [];
    for (var _i = 2; _i < arguments.length; _i++) {
        args_1[_i - 2] = arguments[_i];
    }
    return __awaiter(void 0, __spreadArray([url_1, options_1], args_1, true), void 0, function (url, options, maxRetries) {
        var backoffDelay, _loop_1, i, state_1;
        if (maxRetries === void 0) { maxRetries = 5; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    backoffDelay = function (attempt) {
                        var baseDelay = Math.min(1000 * Math.pow(2, attempt), 10000);
                        return baseDelay + Math.random() * 1000;
                    };
                    _loop_1 = function (i) {
                        var response, error_1;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    _b.trys.push([0, 4, , 6]);
                                    return [4 /*yield*/, fetch(url, __assign(__assign({}, options), { headers: __assign(__assign({}, options.headers), { 'X-Requested-With': 'XMLHttpRequest' }) }))];
                                case 1:
                                    response = _b.sent();
                                    if (!(response.status === 503)) return [3 /*break*/, 3];
                                    console.log("Retry attempt ".concat(i + 1, " after ").concat(backoffDelay(i), "ms due to 503 error"));
                                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, backoffDelay(i)); })];
                                case 2:
                                    _b.sent();
                                    return [2 /*return*/, "continue"];
                                case 3:
                                    if (!response.ok) {
                                        throw new Error("HTTP error! status: ".concat(response.status));
                                    }
                                    return [2 /*return*/, { value: response }];
                                case 4:
                                    error_1 = _b.sent();
                                    if (i === maxRetries - 1)
                                        throw error_1;
                                    console.log("Retry attempt ".concat(i + 1, " after ").concat(backoffDelay(i), "ms"));
                                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, backoffDelay(i)); })];
                                case 5:
                                    _b.sent();
                                    return [3 /*break*/, 6];
                                case 6: return [2 /*return*/];
                            }
                        });
                    };
                    i = 0;
                    _a.label = 1;
                case 1:
                    if (!(i < maxRetries)) return [3 /*break*/, 4];
                    return [5 /*yield**/, _loop_1(i)];
                case 2:
                    state_1 = _a.sent();
                    if (typeof state_1 === "object")
                        return [2 /*return*/, state_1.value];
                    _a.label = 3;
                case 3:
                    i++;
                    return [3 /*break*/, 1];
                case 4: throw new Error('リクエストが失敗しました');
            }
        });
    });
};
export var getGeminiStrategy = function (bettingCandidates, totalBudget, allBettingOptions, riskRatio) { return __awaiter(void 0, void 0, void 0, function () {
    var raceCardInfo, prompt_1, detailedResponse, detailedData, jsonMatch, parsedStrategy, summaryResponse, summarizedData, error_2;
    var _a, _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 5, , 6]);
                raceCardInfo = allBettingOptions.horses
                    .sort(function (a, b) { return a.number - b.number; })
                    .map(function (horse) { return "".concat(horse.frame, "\u67A0").concat(horse.number, "\u756A ").concat(horse.name); })
                    .join('\n');
                prompt_1 = "\u3042\u306A\u305F\u306F\u7AF6\u99AC\u306E\u6295\u8CC7\u30A2\u30C9\u30D0\u30A4\u30B6\u30FC\u3067\u3059\u3002\u5FC5\u305A\u65E5\u672C\u8A9E\u3067\u63A8\u8AD6\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u4EE5\u4E0B\u306E\u99AC\u5238\u5019\u88DC\u304B\u3089\u3001\u4E88\u7B97".concat(totalBudget.toLocaleString(), "\u5186\u3067\u306E\u6700\u9069\u306A\u8CFC\u5165\u6226\u7565\u3092\u63D0\u6848\u3057\u3066\u304F\u3060\u3055\u3044\u3002\n\n\u3010\u30EA\u30B9\u30AF\u9078\u597D\u3011\n- \u30EA\u30B9\u30AF\u9078\u597D\u5EA6: ").concat(riskRatio, "\uFF081\uFF5E20\u306E\u7BC4\u56F2\u3067\u30011\u304C\u6700\u3082\u30ED\u30FC\u30EA\u30B9\u30AF\u300120\u304C\u6700\u3082\u30CF\u30A4\u30EA\u30B9\u30AF\uFF09\n\n\u3010\u5206\u6790\u306E\u89B3\u70B9\u3011\n1. \u5404\u99AC\u5238\u306E\u671F\u5F85\u5024\u3068\u7684\u4E2D\u78BA\u7387\n   - \u30EA\u30B9\u30AF\u9078\u597D\u5EA6\u304C\u9AD8\u3044\u307B\u3069\u671F\u5F85\u5024\u3092\u91CD\u8996\n   - \u30EA\u30B9\u30AF\u9078\u597D\u5EA6\u304C\u4F4E\u3044\u307B\u3069\u7684\u4E2D\u78BA\u7387\u3092\u91CD\u8996\n2. \u99AC\u5238\u9593\u306E\u76F8\u95A2\u95A2\u4FC2\n   - \u540C\u3058\u99AC\u3092\u542B\u3080\u99AC\u5238\u306E\u7D44\u307F\u5408\u308F\u305B\u306F\u6B63\u306E\u76F8\u95A2\n   - \u7570\u306A\u308B\u99AC\u306E\u7D44\u307F\u5408\u308F\u305B\u306F\u8CA0\u306E\u76F8\u95A2\n   - \u5358\u52DD\u3068\u8907\u52DD\u306A\u3069\u3001\u95A2\u9023\u3059\u308B\u99AC\u5238\u7A2E\u306E\u76F8\u95A2\n3. \u30EA\u30B9\u30AF\u5206\u6563\u52B9\u679C\n   - \u8CA0\u306E\u76F8\u95A2\u306E\u99AC\u5238\u306E\u7D44\u307F\u5408\u308F\u305B\u304C\u591A\u3044\u307B\u3069\u30EA\u30B9\u30AF\u5206\u6563\u52B9\u679C\u304C\u9AD8\u3044\n   - \uFF13\u9023\u8907\u3001\uFF13\u9023\u5358\u306A\u3069\u7684\u4E2D\u78BA\u7387\u306E\u4F4E\u3044\u99AC\u5238\u7A2E\u306F\u70B9\u6570\u3092\u5897\u3084\u3059\u307B\u3069\u30EA\u30B9\u30AF\u5206\u6563\u52B9\u679C\u304C\u9AD8\u3044\n\n\u3010\u5236\u7D04\u6761\u4EF6\u3011\n- \u5FC5\u305A\u65E5\u672C\u8A9E\u3067\u5206\u6790\u3068\u63D0\u6848\u3092\u884C\u3046\u3053\u3068\n- \u5404\u99AC\u5238\u306B\u3064\u3044\u3066\u3001\u4ED6\u306E\u99AC\u5238\u3068\u306E\u76F8\u95A2\u95A2\u4FC2\u3092\u7406\u7531\u306B\u542B\u3081\u308B\u3053\u3068\n- \u5404\u99AC\u5238\u306B\u3064\u3044\u3066\u3001\u30EA\u30B9\u30AF\u5206\u6563\u52B9\u679C\u3092\u7406\u7531\u306B\u542B\u3081\u308B\u3053\u3068\n\n\u3010\u51FA\u99AC\u8868\u3011\n").concat(raceCardInfo, "\n\n\u3010\u99AC\u5238\u5019\u88DC\u4E00\u89A7\u3011\n\u5358\u52DD\u5019\u88DC:\n").concat(allBettingOptions.bettingOptions
                    .filter(function (opt) { return opt.type === "単勝"; })
                    .map(function (bet) {
                    var expectedValue = bet.odds * bet.prob - 1;
                    return "".concat(bet.horseName, " [\u30AA\u30C3\u30BA:").concat(bet.odds.toFixed(1), ", \u7684\u4E2D\u78BA\u7387:").concat((bet.prob * 100).toFixed(2), "%, \u671F\u5F85\u5024:").concat(expectedValue.toFixed(2), "]");
                })
                    .join('\n'), "\n\n\u8907\u52DD\u5019\u88DC:\n").concat(allBettingOptions.bettingOptions
                    .filter(function (opt) { return opt.type === "複勝"; })
                    .map(function (bet) {
                    var expectedValue = bet.odds * bet.prob - 1;
                    return "".concat(bet.horseName, " [\u30AA\u30C3\u30BA:").concat(bet.odds.toFixed(1), ", \u7684\u4E2D\u78BA\u7387:").concat((bet.prob * 100).toFixed(2), "%, \u671F\u5F85\u5024:").concat(expectedValue.toFixed(2), "]");
                })
                    .join('\n'), "\n\n\u67A0\u9023\u5019\u88DC:\n").concat(allBettingOptions.bettingOptions
                    .filter(function (opt) { return opt.type === "枠連"; })
                    .map(function (bet) {
                    var expectedValue = bet.odds * bet.prob - 1;
                    return "".concat(bet.horseName, " [\u30AA\u30C3\u30BA:").concat(bet.odds.toFixed(1), ", \u7684\u4E2D\u78BA\u7387:").concat((bet.prob * 100).toFixed(2), "%, \u671F\u5F85\u5024:").concat(expectedValue.toFixed(2), "]");
                })
                    .join('\n'), "\n\n\u99AC\u9023\u5019\u88DC:\n").concat(allBettingOptions.bettingOptions
                    .filter(function (opt) { return opt.type === "馬連"; })
                    .map(function (bet) {
                    var expectedValue = bet.odds * bet.prob - 1;
                    return "".concat(bet.horseName, " [\u30AA\u30C3\u30BA:").concat(bet.odds.toFixed(1), ", \u7684\u4E2D\u78BA\u7387:").concat((bet.prob * 100).toFixed(2), "%, \u671F\u5F85\u5024:").concat(expectedValue.toFixed(2), "]");
                })
                    .join('\n'), "\n\n\u30EF\u30A4\u30C9\u5019\u88DC:\n").concat(allBettingOptions.bettingOptions
                    .filter(function (opt) { return opt.type === "ワイド"; })
                    .map(function (bet) {
                    var expectedValue = bet.odds * bet.prob - 1;
                    return "".concat(bet.horseName, " [\u30AA\u30C3\u30BA:").concat(bet.odds.toFixed(1), ", \u7684\u4E2D\u78BA\u7387:").concat((bet.prob * 100).toFixed(2), "%, \u671F\u5F85\u5024:").concat(expectedValue.toFixed(2), "]");
                })
                    .join('\n'), "\n\n\u99AC\u5358\u5019\u88DC:\n").concat(allBettingOptions.bettingOptions
                    .filter(function (opt) { return opt.type === "馬単"; })
                    .map(function (bet) {
                    var expectedValue = bet.odds * bet.prob - 1;
                    return "".concat(bet.horseName, " [\u30AA\u30C3\u30BA:").concat(bet.odds.toFixed(1), ", \u7684\u4E2D\u78BA\u7387:").concat((bet.prob * 100).toFixed(2), "%, \u671F\u5F85\u5024:").concat(expectedValue.toFixed(2), "]");
                })
                    .join('\n'), "\n\n3\u9023\u8907\u5019\u88DC:\n").concat(allBettingOptions.bettingOptions
                    .filter(function (opt) { return opt.type === "３連複"; })
                    .map(function (bet) {
                    var expectedValue = bet.odds * bet.prob - 1;
                    return "".concat(bet.horseName, " [\u30AA\u30C3\u30BA:").concat(bet.odds.toFixed(1), ", \u7684\u4E2D\u78BA\u7387:").concat((bet.prob * 100).toFixed(2), "%, \u671F\u5F85\u5024:").concat(expectedValue.toFixed(2), "]");
                })
                    .join('\n'), "\n\n3\u9023\u5358\u5019\u88DC:\n").concat(allBettingOptions.bettingOptions
                    .filter(function (opt) { return opt.type === "３連単"; })
                    .map(function (bet) {
                    var expectedValue = bet.odds * bet.prob - 1;
                    return "".concat(bet.horseName, " [\u30AA\u30C3\u30BA:").concat(bet.odds.toFixed(1), ", \u7684\u4E2D\u78BA\u7387:").concat((bet.prob * 100).toFixed(2), "%, \u671F\u5F85\u5024:").concat(expectedValue.toFixed(2), "]");
                })
                    .join('\n'), "\n\n\u4EE5\u4E0B\u306E\u5F62\u5F0F\u3067JSON\u5FDC\u7B54\u3057\u3066\u304F\u3060\u3055\u3044\uFF1A\njson\n{\n  \"strategy\": {\n    \"description\": \"\u6226\u7565\u306E\u8981\u70B9\u30921\u6587\u3067\",\n    \"recommendations\": [\n      {\n        \"type\": \"\u99AC\u5238\u7A2E\u985E\",\n        \"horses\": [\"\u99AC\u756A\"],\n        \"odds\": \u30AA\u30C3\u30BA,\n        \"probability\": \u7684\u4E2D\u78BA\u7387(\u5C11\u6570\u3067\u8868\u793A\uFF1A50%\u306A\u30890.5),\n        \"reason\": \"\u9078\u629E\u7406\u7531\u3092\u8AAC\u660E\"\n      }\n    ],\n    \"summary\": {\n      \"riskLevel\": \"\u30EA\u30B9\u30AF\u30EC\u30D9\u30EB\uFF08\u4F4E/\u4E2D/\u9AD8\uFF09\"\n    }\n  }\n}");
                return [4 /*yield*/, fetchWithRetry('/api/gemini', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRF-Token': getCsrfToken(),
                        },
                        credentials: 'same-origin',
                        body: JSON.stringify({
                            prompt: prompt_1,
                            model: 'gemini-1.5-flash',
                            thought: false,
                            apiVersion: 'v1alpha'
                        })
                    })];
            case 1:
                detailedResponse = (_a = _c.sent()) !== null && _a !== void 0 ? _a : throwError('詳細分析の取得に失敗しました');
                return [4 /*yield*/, detailedResponse.json()];
            case 2:
                detailedData = _c.sent();
                // レスポンス形式チェックを修正
                if (!detailedData || (!detailedData.analysis && !detailedData.strategy)) {
                    throw new Error('詳細分析のレスポンス形式が不正です');
                }
                // 既にstrategy形式で返ってきた場合は要約をスキップ
                if (detailedData.strategy) {
                    jsonMatch = detailedData.strategy.description.match(/```json\n([\s\S]*?)\n```/);
                    if (jsonMatch) {
                        parsedStrategy = JSON.parse(jsonMatch[1]);
                        return [2 /*return*/, {
                                strategy: {
                                    description: parsedStrategy.strategy.description,
                                    recommendations: parsedStrategy.strategy.recommendations.map(function (rec) { return ({
                                        type: rec.type,
                                        horses: rec.horses,
                                        odds: rec.odds,
                                        probability: rec.probability,
                                        reason: rec.reason
                                    }); }),
                                    bettingTable: {
                                        headers: ['券種', '買い目', 'オッズ', '的中率', '投資額', '期待収益'],
                                        rows: parsedStrategy.strategy.recommendations.map(function (rec) { return [
                                            rec.type,
                                            rec.horses.join('-'),
                                            String(rec.odds),
                                            typeof rec.probability === 'number'
                                                ? (rec.probability * 100).toFixed(1) + '%'
                                                : rec.probability,
                                            '0円', // 投資額は後で最適化
                                            '0円' // 期待収益は後で計算
                                        ]; })
                                    },
                                    summary: {
                                        riskLevel: parsedStrategy.strategy.summary.riskLevel
                                    }
                                }
                            }];
                    }
                }
                return [4 /*yield*/, fetchWithRetry('/api/gemini', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRF-Token': getCsrfToken(),
                        },
                        credentials: 'same-origin',
                        body: JSON.stringify({
                            prompt: "\u5FC5\u305A\u65E5\u672C\u8A9E\u3067\u5FDC\u7B54\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u4EE5\u4E0B\u306E\u7AF6\u99AC\u6295\u8CC7\u5206\u6790\u3092\u3001\u8868\u5F62\u5F0F\u3067\u7C21\u6F54\u306B\u8981\u7D04\u3057\u3066\u304F\u3060\u3055\u3044\uFF1A\n\n".concat(JSON.stringify(detailedData, null, 2), "\n\n\u4EE5\u4E0B\u306E\u5F62\u5F0F\u3067JSON\u5FDC\u7B54\u3057\u3066\u304F\u3060\u3055\u3044\uFF1A\njson\n{\n  \"strategy\": {\n    \"description\": \"\u6226\u7565\u306E\u8981\u70B9\u30921\u6587\u3067\",\n    \"recommendations\": [\n      {\n        \"type\": \"\u99AC\u5238\u7A2E\u985E\",\n        \"horses\": [\"\u99AC\u756A\"],\n        \"odds\": \u30AA\u30C3\u30BA,\n        \"probability\": \u7684\u4E2D\u78BA\u7387(\u5C11\u6570\u3067\u8868\u793A\uFF1A50%\u306A\u30890.5),\n        \"reason\": \"\u9078\u629E\u7406\u7531\u3092\u8AAC\u660E\"\n      }\n    ],\n    \"summary\": {\n      \"riskLevel\": \"\u30EA\u30B9\u30AF\u30EC\u30D9\u30EB\uFF08\u4F4E/\u4E2D/\u9AD8\uFF09\"\n    }\n  }\n}"),
                            model: 'gemini-1.5-flash'
                        })
                    })];
            case 3:
                summaryResponse = (_b = _c.sent()) !== null && _b !== void 0 ? _b : throwError('要約の取得に失敗しました');
                return [4 /*yield*/, summaryResponse.json()];
            case 4:
                summarizedData = _c.sent();
                if (!summarizedData || !summarizedData.strategy) {
                    throw new Error('要約のレスポンス形式が不正です');
                }
                return [2 /*return*/, {
                        strategy: {
                            description: summarizedData.strategy.description,
                            bettingTable: {
                                headers: summarizedData.strategy.bettingTable.headers,
                                rows: summarizedData.strategy.bettingTable.rows.map(function (row) { return row.slice(0, 6); })
                            },
                            summary: {
                                riskLevel: summarizedData.strategy.summary.riskLevel
                            },
                            recommendations: summarizedData.strategy.recommendations.map(function (rec) { return (__assign(__assign({}, rec), { expectedReturn: 0, probability: 0, reason: rec.reason })); })
                        }
                    }];
            case 5:
                error_2 = _c.sent();
                throw new Error("Gemini API\u30A8\u30E9\u30FC: ".concat(error_2.message));
            case 6: return [2 /*return*/];
        }
    });
}); };
// ヘルパー関数
function throwError(message) {
    throw new Error(message);
}
