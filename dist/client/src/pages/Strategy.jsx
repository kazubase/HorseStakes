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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import MainLayout from "@/components/layout/MainLayout";
import { Brain, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { calculateBetProposals } from '@/lib/betCalculator';
import { getGeminiStrategy } from '@/lib/geminiApi';
import { BettingStrategyTable } from "@/components/BettingStrategyTable";
function GeminiStrategy(_a) {
    var _this = this;
    var recommendedBets = _a.recommendedBets, budget = _a.budget, riskRatio = _a.riskRatio;
    var id = useParams().id;
    var renderCount = useRef(0);
    var _b = useState({
        strategy: null,
        isLoading: false,
        error: null,
        isRequesting: false,
        requestId: undefined
    }), state = _b[0], setState = _b[1];
    var _c = useState(0), lastRequestTime = _c[0], setLastRequestTime = _c[1];
    var MIN_REQUEST_INTERVAL = 5000;
    var _d = useState(0), countdown = _d[0], setCountdown = _d[1];
    // デバッグ用のレンダリングカウント
    useEffect(function () {
        renderCount.current += 1;
        console.log('GeminiStrategy render:', {
            count: renderCount.current,
            recommendedBetsLength: recommendedBets === null || recommendedBets === void 0 ? void 0 : recommendedBets.length,
            budget: budget,
            riskRatio: riskRatio,
            timestamp: new Date().toISOString()
        });
    }, []); // 初回レンダリング時のみ実行
    var horses = useQuery({
        queryKey: ["/api/horses/".concat(id)],
        enabled: !!id,
    }).data;
    var latestOdds = useQuery({
        queryKey: ["/api/tan-odds-history/latest/".concat(id)],
        enabled: !!id,
    }).data;
    var winProbsStr = new URLSearchParams(window.location.search).get("winProbs") || "{}";
    var placeProbsStr = new URLSearchParams(window.location.search).get("placeProbs") || "{}";
    var winProbs = JSON.parse(winProbsStr);
    var placeProbs = JSON.parse(placeProbsStr);
    var fetchGeminiStrategy = useCallback(function () { return __awaiter(_this, void 0, void 0, function () {
        var now, currentRequestId, allBettingOptions, response_1, err_1;
        var _a, _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    now = Date.now();
                    // 連続リクエストの制限チェックのみを行い、カウントダウンは開始しない
                    if (now - lastRequestTime < MIN_REQUEST_INTERVAL) {
                        setState(function (prev) { return (__assign(__assign({}, prev), { error: '再分析は5秒以上の間隔を空けてください' })); });
                        return [2 /*return*/];
                    }
                    if (state.isRequesting || !(recommendedBets === null || recommendedBets === void 0 ? void 0 : recommendedBets.length) || !horses)
                        return [2 /*return*/];
                    currentRequestId = crypto.randomUUID();
                    _d.label = 1;
                case 1:
                    _d.trys.push([1, 3, , 4]);
                    setState(function (prev) { return (__assign(__assign({}, prev), { isRequesting: true, isLoading: true, error: null, requestId: currentRequestId })); });
                    allBettingOptions = {
                        horses: horses.map(function (horse) {
                            var _a;
                            return ({
                                name: horse.name,
                                odds: Number(((_a = latestOdds === null || latestOdds === void 0 ? void 0 : latestOdds.find(function (odd) { return Number(odd.horseId) === horse.number; })) === null || _a === void 0 ? void 0 : _a.odds) || 0),
                                winProb: winProbs[horse.id],
                                placeProb: placeProbs[horse.id],
                                frame: horse.frame,
                                number: horse.number
                            });
                        }),
                        bettingOptions: (recommendedBets === null || recommendedBets === void 0 ? void 0 : recommendedBets.map(function (bet) { return ({
                            type: bet.type,
                            horseName: bet.horses.join(bet.type.includes('単') ? '→' : '-'),
                            odds: bet.expectedReturn / bet.stake,
                            prob: bet.probability,
                            ev: bet.expectedReturn - bet.stake,
                            frame1: 0,
                            frame2: 0,
                            frame3: 0,
                            horse1: 0,
                            horse2: 0,
                            horse3: 0
                        }); })) || []
                    };
                    console.log('Fetching Gemini strategy:', {
                        timestamp: new Date().toISOString(),
                        recommendedBetsCount: recommendedBets.length
                    });
                    return [4 /*yield*/, getGeminiStrategy([], budget, allBettingOptions, riskRatio)];
                case 2:
                    response_1 = _d.sent();
                    console.log('Gemini strategy response:', {
                        hasStrategy: !!response_1.strategy,
                        strategy: response_1.strategy,
                        bettingTable: (_a = response_1.strategy) === null || _a === void 0 ? void 0 : _a.bettingTable,
                        recommendations: (_b = response_1.strategy) === null || _b === void 0 ? void 0 : _b.recommendations
                    });
                    if (!((_c = response_1.strategy) === null || _c === void 0 ? void 0 : _c.bettingTable)) {
                        throw new Error('Invalid strategy response format');
                    }
                    if (!id)
                        return [2 /*return*/];
                    saveToSessionStorage(response_1.strategy, {
                        budget: budget,
                        riskRatio: riskRatio,
                        recommendedBets: recommendedBets
                    }, id);
                    // レスポンス受信後にカウントダウンを開始
                    setLastRequestTime(Date.now());
                    setState(function (prev) {
                        if (prev.requestId !== currentRequestId)
                            return prev;
                        return __assign(__assign({}, prev), { strategy: response_1.strategy, isLoading: false, isRequesting: false });
                    });
                    return [3 /*break*/, 4];
                case 3:
                    err_1 = _d.sent();
                    setState(function (prev) {
                        if (prev.requestId !== currentRequestId)
                            return prev;
                        return __assign(__assign({}, prev), { error: 'AIからの戦略取得に失敗しました', isLoading: false, isRequesting: false });
                    });
                    console.error('Strategy Error:', err_1);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); }, [id, budget, riskRatio, recommendedBets, horses, lastRequestTime, state.isRequesting]);
    // 初期化とstrategy復元
    useEffect(function () {
        if (!(recommendedBets === null || recommendedBets === void 0 ? void 0 : recommendedBets.length))
            return;
        if (!id)
            return; // nullを返さず、単にreturn
        var savedData = getFromSessionStorage(id);
        if (savedData) {
            var strategy_1 = savedData.strategy, params = savedData.params;
            if (params.budget === budget &&
                params.riskRatio === riskRatio &&
                JSON.stringify(params.recommendedBets) === JSON.stringify(recommendedBets)) {
                setState(function (prev) { return (__assign(__assign({}, prev), { strategy: strategy_1 })); });
                return;
            }
        }
        if (!state.strategy && !state.isRequesting) {
            fetchGeminiStrategy();
        }
    }, [id, budget, riskRatio, recommendedBets]);
    // カウントダウンの更新
    useEffect(function () {
        if (lastRequestTime === 0)
            return;
        var updateCountdown = function () {
            var remaining = Math.max(0, MIN_REQUEST_INTERVAL - (Date.now() - lastRequestTime));
            setCountdown(remaining);
            if (remaining > 0) {
                setTimeout(updateCountdown, 100);
            }
        };
        updateCountdown();
        return function () {
            setCountdown(0);
        };
    }, [lastRequestTime]);
    // BettingStrategyTableコンポーネントをメモ化
    var strategyTable = useMemo(function () {
        if (!state.strategy)
            return null;
        return (<BettingStrategyTable strategy={state.strategy} totalBudget={budget}/>);
    }, [state.strategy, budget]);
    if (state.isLoading) {
        return (<Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 animate-pulse"/>
            AI戦略分析中
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recommendedBets === null || recommendedBets === void 0 ? void 0 : recommendedBets.slice(0, 3).map(function (bet, index) { return (<div key={index} className="border rounded-lg p-3 animate-pulse bg-gradient-to-r from-background to-muted" style={{
                    animationDelay: "".concat(index * 200, "ms"),
                    opacity: 1 - (index * 0.2)
                }}>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-4 bg-muted rounded animate-pulse"/>
                    <div className="w-24 h-4 bg-muted rounded animate-pulse"/>
                  </div>
                  <div className="w-16 h-4 bg-muted rounded animate-pulse"/>
                </div>
              </div>); })}
            <div className="flex items-center justify-center mt-6 text-muted-foreground">
              <span className="loading loading-spinner loading-md mr-2"/>
              AIが最適な投資戦略を分析中...
            </div>
          </div>
        </CardContent>
      </Card>);
    }
    if (state.error) {
        return (<div className="space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4"/>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
        <div className="flex justify-end">
          <Button onClick={fetchGeminiStrategy} disabled={state.isLoading || state.isRequesting || countdown > 0} className="gap-2">
            {state.isLoading ? (<>
                <Brain className="h-4 w-4"/>
                戦略を再分析
              </>) : countdown > 0 ? (<>
                <Brain className="h-4 w-4"/>
                {Math.ceil(countdown / 1000)}秒後に再分析可能
              </>) : (<>
                <Brain className="h-4 w-4"/>
                戦略を再分析
              </>)}
          </Button>
        </div>
      </div>);
    }
    if (!state.strategy) {
        if ((recommendedBets === null || recommendedBets === void 0 ? void 0 : recommendedBets.length) === 0) {
            return (<Alert>
          <AlertCircle className="h-4 w-4"/>
          <AlertTitle>最適な馬券が見つかりませんでした</AlertTitle>
          <AlertDescription>
            予算とリスク設定を調整して、再度試してください。
            <ul className="list-disc list-inside mt-2 text-sm">
              <li>予算を増やす</li>
              <li>リスク設定を下げる</li>
              <li>的中確率の見直し</li>
            </ul>
          </AlertDescription>
        </Alert>);
        }
        return null;
    }
    return (<div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={fetchGeminiStrategy} disabled={state.isLoading || state.isRequesting || countdown > 0} className="gap-2">
          {state.isLoading ? (<>
              <Brain className="h-4 w-4 animate-pulse"/>
              分析中...
            </>) : countdown > 0 ? (<>
              <Brain className="h-4 w-4"/>
              {Math.ceil(countdown / 1000)}秒後に再分析可能
            </>) : (<>
              <Brain className="h-4 w-4"/>
              戦略を再分析
            </>)}
        </Button>
      </div>
      {strategyTable}
    </div>);
}
var saveToSessionStorage = function (strategy, params, id) {
    try {
        var storageKey = "strategy-".concat(id);
        var paramsKey = "strategy-params-".concat(id);
        sessionStorage.setItem(storageKey, JSON.stringify({
            strategy: strategy,
            timestamp: Date.now()
        }));
        sessionStorage.setItem(paramsKey, JSON.stringify(__assign(__assign({}, params), { timestamp: Date.now() })));
    }
    catch (error) {
        console.error('Session storage error:', error);
    }
};
var getFromSessionStorage = function (id) {
    try {
        var storageKey = "strategy-".concat(id);
        var paramsKey = "strategy-params-".concat(id);
        var savedStrategyData = sessionStorage.getItem(storageKey);
        var savedParamsData = sessionStorage.getItem(paramsKey);
        if (!savedStrategyData || !savedParamsData)
            return null;
        var _a = JSON.parse(savedStrategyData), strategy = _a.strategy, strategyTimestamp = _a.timestamp;
        var _b = JSON.parse(savedParamsData), paramsTimestamp = _b.timestamp, params = __rest(_b, ["timestamp"]);
        // 5分以上経過したデータは無効とする
        if (Date.now() - strategyTimestamp > 5 * 60 * 1000)
            return null;
        return { strategy: strategy, params: params };
    }
    catch (error) {
        console.error('Session storage error:', error);
        return null;
    }
};
export default function Strategy() {
    var _this = this;
    var id = useParams().id;
    var params = new URLSearchParams(window.location.search);
    var budget = Number(params.get("budget")) || 0;
    var riskRatio = Number(params.get("risk")) || 1;
    var winProbsStr = params.get("winProbs") || "{}";
    var placeProbsStr = params.get("placeProbs") || "{}";
    var winProbs = useMemo(function () {
        try {
            return JSON.parse(winProbsStr);
        }
        catch (e) {
            console.error('単勝確率のパース失敗:', e);
            return {};
        }
    }, [winProbsStr]);
    var placeProbs = useMemo(function () {
        try {
            return JSON.parse(placeProbsStr);
        }
        catch (e) {
            console.error('複勝確率のパース失敗:', e);
            return {};
        }
    }, [placeProbsStr]);
    var horses = useQuery({
        queryKey: ["/api/horses/".concat(id)],
        enabled: !!id,
    }).data;
    var latestOdds = useQuery({
        queryKey: ["/api/tan-odds-history/latest/".concat(id)],
        enabled: !!id,
    }).data;
    var latestFukuOdds = useQuery({
        queryKey: ["/api/fuku-odds/latest/".concat(id)],
        enabled: !!id,
    }).data;
    var latestWakurenOdds = useQuery({
        queryKey: ["/api/wakuren-odds/latest/".concat(id)],
        enabled: !!id,
    }).data;
    var latestUmarenOdds = useQuery({
        queryKey: ["/api/umaren-odds/latest/".concat(id)],
        enabled: !!id,
    }).data;
    var latestWideOdds = useQuery({
        queryKey: ["/api/wide-odds/latest/".concat(id)],
        enabled: !!id,
    }).data;
    var latestUmatanOdds = useQuery({
        queryKey: ["/api/umatan-odds/latest/".concat(id)],
        enabled: !!id,
    }).data;
    var latestSanrenpukuOdds = useQuery({
        queryKey: ["/api/sanrenpuku-odds/latest/".concat(id)],
        enabled: !!id,
    }).data;
    var latestSanrentanOdds = useQuery({
        queryKey: ["/api/sanrentan-odds/latest/".concat(id)],
        enabled: !!id,
    }).data;
    var queryKey = useMemo(function () {
        return ["/api/betting-strategy/".concat(id), { budget: budget, riskRatio: riskRatio, winProbs: winProbs, placeProbs: placeProbs }];
    }, [id, budget, riskRatio, winProbs, placeProbs]);
    var _a = useQuery({
        queryKey: queryKey,
        queryFn: function () { return __awaiter(_this, void 0, void 0, function () {
            var horseDataList, wakurenData, umarenData, wideData, umatanData, sanrenpukuData, sanrentanData, fukuData, result;
            return __generator(this, function (_a) {
                if (!horses || !latestOdds || !latestFukuOdds || !latestWakurenOdds ||
                    !latestUmarenOdds || !latestWideOdds || !latestUmatanOdds ||
                    !latestSanrenpukuOdds || !latestSanrentanOdds)
                    return [2 /*return*/, []];
                horseDataList = horses.map(function (horse) {
                    var _a, _b;
                    return ({
                        name: horse.name,
                        odds: Number(((_a = latestOdds.find(function (odd) { return Number(odd.horseId) === horse.number; })) === null || _a === void 0 ? void 0 : _a.odds) || 0),
                        fukuOdds: Number(((_b = latestFukuOdds.find(function (odd) { return Number(odd.horseId) === horse.number; })) === null || _b === void 0 ? void 0 : _b.oddsMin) || 0),
                        winProb: winProbs[horse.id] / 100,
                        placeProb: placeProbs[horse.id] / 100,
                        frame: horse.frame,
                        number: horse.number
                    });
                });
                wakurenData = latestWakurenOdds.map(function (odd) { return ({
                    frame1: odd.frame1,
                    frame2: odd.frame2,
                    odds: Number(odd.odds)
                }); });
                umarenData = latestUmarenOdds.map(function (odd) { return ({
                    horse1: odd.horse1,
                    horse2: odd.horse2,
                    odds: Number(odd.odds)
                }); });
                wideData = latestWideOdds.map(function (odd) { return ({
                    horse1: odd.horse1,
                    horse2: odd.horse2,
                    oddsMin: Number(odd.oddsMin),
                    oddsMax: Number(odd.oddsMax)
                }); });
                umatanData = latestUmatanOdds.map(function (odd) { return ({
                    horse1: odd.horse1,
                    horse2: odd.horse2,
                    odds: Number(odd.odds)
                }); });
                sanrenpukuData = latestSanrenpukuOdds.map(function (odd) { return ({
                    horse1: odd.horse1,
                    horse2: odd.horse2,
                    horse3: odd.horse3,
                    odds: Number(odd.odds)
                }); });
                sanrentanData = latestSanrentanOdds.map(function (odd) { return ({
                    horse1: odd.horse1,
                    horse2: odd.horse2,
                    horse3: odd.horse3,
                    odds: Number(odd.odds)
                }); });
                fukuData = (latestFukuOdds === null || latestFukuOdds === void 0 ? void 0 : latestFukuOdds.map(function (odd) { return ({
                    horse1: odd.horseId,
                    oddsMin: Number(odd.oddsMin),
                    oddsMax: Number(odd.oddsMax)
                }); })) || [];
                console.log('馬券計算開始:', {
                    queryKey: queryKey,
                    horseCount: horseDataList.length,
                    budget: budget,
                    riskRatio: riskRatio
                });
                result = calculateBetProposals(horseDataList, budget, riskRatio, fukuData, wakurenData, umarenData, wideData, umatanData, sanrenpukuData, sanrentanData);
                console.log('馬券計算完了:', {
                    queryKey: queryKey,
                    resultCount: result.length
                });
                return [2 /*return*/, result];
            });
        }); },
        enabled: !!id && !!horses && !!latestOdds && !!latestFukuOdds &&
            !!latestWakurenOdds && !!latestUmarenOdds && !!latestWideOdds &&
            !!latestUmatanOdds && !!latestSanrenpukuOdds && !!latestSanrentanOdds &&
            budget > 0 && Object.keys(winProbs).length > 0,
        staleTime: 30000,
        cacheTime: 60000,
        retry: 2,
        retryDelay: function (attemptIndex) { return Math.min(1000 * Math.pow(2, attemptIndex), 10000); },
        refetchOnWindowFocus: false,
        refetchOnReconnect: false
    }), recommendedBets = _a.data, isLoading = _a.isLoading;
    useEffect(function () {
        if (process.env.NODE_ENV === 'development') {
            console.log('Strategy params updated:', {
                budget: budget,
                riskRatio: riskRatio,
                winProbs: winProbs,
                placeProbs: placeProbs,
                URLパラメータ: {
                    winProbsStr: winProbsStr,
                    placeProbsStr: placeProbsStr
                }
            });
        }
    }, [budget, riskRatio, winProbs, placeProbs, winProbsStr, placeProbsStr]);
    if (!horses) {
        return (<MainLayout>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4"/>
          <AlertDescription>
            レースデータの読み込みに失敗しました。
          </AlertDescription>
        </Alert>
      </MainLayout>);
    }
    if (!budget || budget <= 0) {
        return (<MainLayout>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4"/>
          <AlertDescription>
            予算が設定されていません。
          </AlertDescription>
        </Alert>
      </MainLayout>);
    }
    var hasValidProbabilities = Object.keys(winProbs).length > 0 ||
        Object.keys(placeProbs).length > 0;
    if (!hasValidProbabilities) {
        return (<MainLayout>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4"/>
          <AlertDescription>
            確率データが不足しています。確率入力画面からやり直してください。
          </AlertDescription>
        </Alert>
      </MainLayout>);
    }
    var totalInvestment = (recommendedBets === null || recommendedBets === void 0 ? void 0 : recommendedBets.reduce(function (sum, bet) { return sum + bet.stake; }, 0)) || 0;
    var betDetails = (recommendedBets === null || recommendedBets === void 0 ? void 0 : recommendedBets.map(function (bet) {
        var weight = bet.stake / totalInvestment;
        console.log("\u99AC\u5238\u8A73\u7D30:", {
            馬名: bet.horses.join(', '),
            投資額: bet.stake,
            ウェイト: weight.toFixed(4),
            期待払戻金: bet.expectedReturn,
            的中確率: bet.probability
        });
        return {
            weight: weight,
            expectedPayout: bet.expectedReturn * bet.probability
        };
    })) || [];
    var expectedTotalPayout = betDetails.reduce(function (sum, detail) {
        return sum + detail.expectedPayout;
    }, 0);
    var totalExpectedReturn = totalInvestment > 0 ?
        (expectedTotalPayout / totalInvestment) - 1 :
        0;
    console.log('ポートフォリオ全体:', {
        総投資額: totalInvestment,
        期待払戻金: expectedTotalPayout,
        期待リターン: "".concat((totalExpectedReturn * 100).toFixed(2), "%"),
        馬券数: betDetails.length
    });
    var expectedROI = totalInvestment > 0 ?
        "+".concat((totalExpectedReturn * 100).toFixed(1), "%") :
        '0%';
    if ((recommendedBets === null || recommendedBets === void 0 ? void 0 : recommendedBets.length) === 0) {
        return (<MainLayout>
        <Alert>
          <AlertCircle className="h-4 w-4"/>
          <AlertTitle>最適な馬券が見つかりませんでした</AlertTitle>
          <AlertDescription>
            以下の点を確認して、再度試してください：
            <ul className="list-disc list-inside mt-2">
              <li>予算: {budget.toLocaleString()}円</li>
              <li>リスク設定: {riskRatio}</li>
            </ul>
            <div className="mt-2">
              <Button variant="outline" onClick={function () { return window.history.back(); }} className="mt-2">
                戻る
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </MainLayout>);
    }
    return (<MainLayout>
      <div className="space-y-4">
        <GeminiStrategy recommendedBets={recommendedBets} budget={budget} riskRatio={riskRatio}/>
      </div>
    </MainLayout>);
}
