import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import MainLayout from "@/components/layout/MainLayout";
import {  Brain, AlertCircle, X } from "lucide-react";
import { Horse, TanOddsHistory, FukuOdds, WakurenOdds, UmarenOdds, WideOdds, UmatanOdds, Fuku3Odds, Tan3Odds, Race } from "@db/schema";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { calculateBetProposals, type BetProposal } from '@/lib/betCalculator';
import { getGeminiStrategy, type GeminiStrategy } from '@/lib/geminiApi';
import { BettingStrategyTable } from "@/components/BettingStrategyTable";
import { RaceAnalytics } from "@/components/RaceAnalytics";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { BettingOptionsTable } from "@/components/BettingOptionsTable";

interface RecommendedBet {
  type: string;
  horses: string[];
  stake: number;
  expectedReturn: number;
  probability: number;
}

interface GeminiStrategyProps {
  recommendedBets: BetProposal[] | undefined;
  budget: number;
  riskRatio: number;
}

interface GeminiStrategyState {
  strategy: any;
  isLoading: boolean;
  error: string | null;
  isRequesting: boolean;
  requestId?: string;
}

// フィードバックの型定義
interface StrategyFeedback {
  type: 'MORE_RISK' | 'LESS_RISK' | 'FOCUS_HORSE' | 'AVOID_HORSE' | 'PREFER_BET_TYPE' | 'AVOID_BET_TYPE';
  details: {
    horseNumbers?: number[];
    betType?: string;
    description?: string;
  };
}

function GeminiStrategy({ recommendedBets, budget, riskRatio }: GeminiStrategyProps) {
  const { id } = useParams();
  const renderCount = useRef(0);
  const [state, setState] = useState<GeminiStrategyState>({
    strategy: null,
    isLoading: false,
    error: null,
    isRequesting: false,
    requestId: undefined
  });
  const [lastRequestTime, setLastRequestTime] = useState<number>(0);
  const MIN_REQUEST_INTERVAL = 5000;
  const [countdown, setCountdown] = useState<number>(0);
  const [feedbacks, setFeedbacks] = useState<StrategyFeedback[]>([]);

  // デバッグ用のレンダリングカウント
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      renderCount.current += 1;
      console.log('GeminiStrategy render:', {
        count: renderCount.current,
        recommendedBetsLength: recommendedBets?.length,
        budget,
        riskRatio,
        timestamp: new Date().toISOString()
      });
    }
  }, []); // 初回レンダリング時のみ実行

  const { data: horses } = useQuery<Horse[]>({
    queryKey: [`/api/horses/${id}`],
    enabled: !!id,
  });

  const { data: latestOdds } = useQuery<TanOddsHistory[]>({
    queryKey: [`/api/tan-odds-history/latest/${id}`],
    enabled: !!id,
  });

  const winProbsStr = new URLSearchParams(window.location.search).get("winProbs") || "{}";
  const placeProbsStr = new URLSearchParams(window.location.search).get("placeProbs") || "{}";
  
  const winProbs = JSON.parse(winProbsStr);
  const placeProbs = JSON.parse(placeProbsStr);

  const fetchGeminiStrategy = useCallback(async () => {
    const now = Date.now();
    if (now - lastRequestTime < MIN_REQUEST_INTERVAL) {
      setState(prev => ({
        ...prev,
        error: '再分析は5秒以上の間隔を空けてください'
      }));
      return;
    }

    if (state.isRequesting || !recommendedBets?.length || !horses) return;

    const currentRequestId = crypto.randomUUID();

    try {
      setState(prev => ({ 
        ...prev, 
        isRequesting: true, 
        isLoading: true, 
        error: null,
        requestId: currentRequestId 
      }));
      
      const allBettingOptions = {
        horses: horses.map((horse: Horse) => ({
          name: horse.name,
          odds: Number(latestOdds?.find((odd: TanOddsHistory) => Number(odd.horseId) === horse.number)?.odds || 0),
          winProb: winProbs[horse.id],
          placeProb: placeProbs[horse.id],
          frame: horse.frame,
          number: horse.number
        })),
        bettingOptions: recommendedBets?.map(bet => ({
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
        })) || []
      };

      if (process.env.NODE_ENV === 'development') {
        console.log('Fetching Gemini strategy:', {
          timestamp: new Date().toISOString(),
          recommendedBetsCount: recommendedBets.length
        });
      }

      const response = await getGeminiStrategy(
        [], 
        budget, 
        allBettingOptions, 
        riskRatio,
        feedbacks
      );
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Gemini strategy response:', {
          hasStrategy: !!response.strategy,
          strategy: response.strategy,
          bettingTable: response.strategy?.bettingTable,
          recommendations: response.strategy?.recommendations
        });
      }

      if (!response.strategy?.bettingTable) {
        throw new Error('Invalid strategy response format');
      }

      if (!id) return;

      saveToSessionStorage(response.strategy, {
        budget,
        riskRatio,
        recommendedBets,
        feedbacks
      }, id);

      setLastRequestTime(Date.now());

      setState(prev => {
        if (prev.requestId !== currentRequestId) return prev;
        return {
          ...prev,
          strategy: response.strategy,
          isLoading: false,
          isRequesting: false
        };
      });
    } catch (err) {
      setState(prev => {
        if (prev.requestId !== currentRequestId) return prev;
        return {
          ...prev,
          error: 'AIからの戦略取得に失敗しました',
          isLoading: false,
          isRequesting: false
        };
      });
      console.error('Strategy Error:', err);
    }
  }, [id, budget, riskRatio, recommendedBets, horses, lastRequestTime, state.isRequesting, feedbacks]);

  // 初期化とstrategy復元
  useEffect(() => {
    if (!recommendedBets?.length) return;
    if (!id) return;  // nullを返さず、単にreturn

    const savedData = getFromSessionStorage(id);
    
    if (savedData) {
      const { strategy, params } = savedData;
      if (params.budget === budget && 
          params.riskRatio === riskRatio && 
          JSON.stringify(params.recommendedBets) === JSON.stringify(recommendedBets)) {
        setState(prev => ({
          ...prev,
          strategy
        }));
        return;
      }
    }

    if (!state.strategy && !state.isRequesting) {
      fetchGeminiStrategy();
    }
  }, [id, budget, riskRatio, recommendedBets]);

  // カウントダウンの更新
  useEffect(() => {
    if (lastRequestTime === 0) return;

    const updateCountdown = () => {
      const remaining = Math.max(0, MIN_REQUEST_INTERVAL - (Date.now() - lastRequestTime));
      setCountdown(remaining);
      
      if (remaining > 0) {
        setTimeout(updateCountdown, 100);
      }
    };

    updateCountdown();
    
    return () => {
      setCountdown(0);
    };
  }, [lastRequestTime]);

  // BettingStrategyTableコンポーネントをメモ化
  const strategyTable = useMemo(() => {
    if (!state.strategy) return null;
    return (
      <BettingStrategyTable 
        strategy={state.strategy} 
        totalBudget={budget} 
      />
    );
  }, [state.strategy, budget]);

  // フィードバックを追加する関数
  const addFeedback = (feedback: StrategyFeedback) => {
    setFeedbacks(prev => [...prev, feedback]);
  };

  // フィードバックをリセットする関数
  const resetFeedbacks = () => {
    setFeedbacks([]);
  };

  // フィードバックを削除する関数
  const removeFeedback = (index: number) => {
    setFeedbacks(prev => prev.filter((_, i) => i !== index));
  };

  if (state.isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 animate-pulse" />
            AI戦略分析中
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recommendedBets?.slice(0, 3).map((bet, index) => (
              <div 
                key={index} 
                className="border rounded-lg p-3 animate-pulse bg-gradient-to-r from-background to-muted"
                style={{ 
                  animationDelay: `${index * 200}ms`,
                  opacity: 1 - (index * 0.2)
                }}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-4 bg-muted rounded animate-pulse" />
                    <div className="w-24 h-4 bg-muted rounded animate-pulse" />
                  </div>
                  <div className="w-16 h-4 bg-muted rounded animate-pulse" />
                </div>
              </div>
            ))}
            <div className="flex items-center justify-center mt-6 text-muted-foreground">
              <span className="loading loading-spinner loading-md mr-2" />
              AIが最適な投資戦略を分析中...
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (state.error) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
        <div className="flex justify-end">
          <Button
            onClick={fetchGeminiStrategy}
            disabled={state.isLoading || state.isRequesting || countdown > 0}
            className="gap-2"
          >
            {state.isLoading ? (
              <>
                <Brain className="h-4 w-4" />
                戦略を再分析
              </>
            ) : countdown > 0 ? (
              <>
                <Brain className="h-4 w-4" />
                {Math.ceil(countdown / 1000)}秒後に再分析可能
              </>
            ) : (
              <>
                <Brain className="h-4 w-4" />
                戦略を再分析
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  if (!state.strategy) {
    if (recommendedBets?.length === 0) {
      return (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>最適な馬券が見つかりませんでした</AlertTitle>
          <AlertDescription>
            予算とリスク設定を調整して、再度試してください。
            <ul className="list-disc list-inside mt-2 text-sm">
              <li>予算を増やす</li>
              <li>リスク設定を下げる</li>
              <li>的中確率の見直し</li>
            </ul>
          </AlertDescription>
        </Alert>
      );
    }
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Brain className="h-4 w-4" />
              戦略を調整
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-4">
              <h4 className="font-medium">戦略の調整</h4>
              
              {/* リスク選好の調整 */}
              <div className="space-y-2">
                <Label>リスク選好</Label>
                <RadioGroup 
                  onValueChange={(value) => {
                    addFeedback({ 
                      type: value as 'MORE_RISK' | 'LESS_RISK', 
                      details: {} 
                    });
                  }}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="MORE_RISK" id="more-risk" />
                    <Label htmlFor="more-risk">よりリスクを取る</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="LESS_RISK" id="less-risk" />
                    <Label htmlFor="less-risk">よりリスクを抑える</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* 馬の選択 */}
              <div className="space-y-2">
                <Label>注目したい馬</Label>
                <div className="flex flex-wrap gap-2">
                  {horses?.map(horse => (
                    <Button
                      key={horse.number}
                      variant="outline"
                      size="sm"
                      onClick={() => addFeedback({
                        type: 'FOCUS_HORSE',
                        details: { 
                          horseNumbers: [horse.number],
                          description: horse.name
                        }
                      })}
                    >
                      {horse.number}番
                    </Button>
                  ))}
                </div>
              </div>

              {/* 券種の選択 */}
              <div className="space-y-2">
                <Label>重視したい券種</Label>
                <div className="flex flex-wrap gap-2">
                  {['単勝', '複勝', '馬連', 'ワイド', '馬単', '３連複', '３連単'].map(type => (
                    <Button
                      key={type}
                      variant="outline"
                      size="sm"
                      onClick={() => addFeedback({
                        type: 'PREFER_BET_TYPE',
                        details: { betType: type }
                      })}
                    >
                      {type}
                    </Button>
                  ))}
                </div>
              </div>

              {/* フィードバックのリセットと再分析 */}
              <div className="flex flex-col gap-2">
                <Button 
                  variant="outline"
                  onClick={resetFeedbacks}
                  disabled={feedbacks.length === 0}
                >
                  調整をリセット
                </Button>
                <Button 
                  onClick={() => {
                    fetchGeminiStrategy();
                  }}
                  disabled={feedbacks.length === 0}
                >
                  フィードバックを反映して再分析
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* 既存の再分析ボタン */}
        <Button
          onClick={fetchGeminiStrategy}
          disabled={state.isLoading || state.isRequesting || countdown > 0}
          className="gap-2"
        >
          {state.isLoading ? (
            <>
              <Brain className="h-4 w-4 animate-pulse" />
              分析中...
            </>
          ) : countdown > 0 ? (
            <>
              <Brain className="h-4 w-4" />
              {Math.ceil(countdown / 1000)}秒後に再分析可能
            </>
          ) : (
            <>
              <Brain className="h-4 w-4" />
              戦略を再分析
            </>
          )}
        </Button>
      </div>

      {/* フィードバック履歴の表示 */}
      {feedbacks.length > 0 && (
        <div className="rounded-lg border p-4 space-y-2">
          <h4 className="font-medium">反映された調整</h4>
          <div className="flex flex-wrap gap-2">
            {feedbacks.map((feedback, index) => (
              <Badge 
                key={index} 
                variant="secondary"
                className="flex items-center gap-1"
              >
                {feedback.type === 'FOCUS_HORSE' && 
                  `${feedback.details.horseNumbers?.join(',')}番に注目`}
                {feedback.type === 'AVOID_HORSE' && 
                  `${feedback.details.horseNumbers?.join(',')}番を避ける`}
                {feedback.type === 'PREFER_BET_TYPE' && 
                  `${feedback.details.betType}を重視`}
                {feedback.type === 'AVOID_BET_TYPE' && 
                  `${feedback.details.betType}を避ける`}
                {feedback.type === 'MORE_RISK' && 'よりリスクを取る'}
                {feedback.type === 'LESS_RISK' && 'よりリスクを抑える'}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-transparent"
                  onClick={() => removeFeedback(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* 既存のstrategyTable */}
      {strategyTable}
    </div>
  );
}

const saveToSessionStorage = (strategy: any, params: any, id: string) => {
  try {
    const storageKey = `strategy-${id}`;
    const paramsKey = `strategy-params-${id}`;
    
    sessionStorage.setItem(storageKey, JSON.stringify({
      strategy,
      timestamp: Date.now()
    }));
    
    sessionStorage.setItem(paramsKey, JSON.stringify({
      ...params,
      timestamp: Date.now()
    }));
  } catch (error) {
    console.error('Session storage error:', error);
  }
};

const getFromSessionStorage = (id: string) => {
  try {
    const storageKey = `strategy-${id}`;
    const paramsKey = `strategy-params-${id}`;
    
    const savedStrategyData = sessionStorage.getItem(storageKey);
    const savedParamsData = sessionStorage.getItem(paramsKey);
    
    if (!savedStrategyData || !savedParamsData) return null;
    
    const { strategy, timestamp: strategyTimestamp } = JSON.parse(savedStrategyData);
    const { timestamp: paramsTimestamp, ...params } = JSON.parse(savedParamsData);
    
    // 5分以上経過したデータは無効とする
    if (Date.now() - strategyTimestamp > 5 * 60 * 1000) return null;
    
    return { strategy, params };
  } catch (error) {
    console.error('Session storage error:', error);
    return null;
  }
};

export default function Strategy() {
  const { id } = useParams();
  const params = new URLSearchParams(window.location.search);
  const budget = Number(params.get("budget")) || 0;
  const riskRatio = Number(params.get("risk")) || 1;

  const winProbsStr = params.get("winProbs") || "{}";
  const placeProbsStr = params.get("placeProbs") || "{}";
  
  const winProbs = useMemo(() => {
    try {
      return JSON.parse(winProbsStr);
    } catch (e) {
      console.error('単勝確率のパース失敗:', e);
      return {};
    }
  }, [winProbsStr]);

  const placeProbs = useMemo(() => {
    try {
      return JSON.parse(placeProbsStr);
    } catch (e) {
      console.error('複勝確率のパース失敗:', e);
      return {};
    }
  }, [placeProbsStr]);

  const { data: horses } = useQuery<Horse[]>({
    queryKey: [`/api/horses/${id}`],
    enabled: !!id,
  });

  const { data: latestOdds } = useQuery<TanOddsHistory[]>({
    queryKey: [`/api/tan-odds-history/latest/${id}`],
    enabled: !!id,
  });

  const { data: latestFukuOdds } = useQuery<FukuOdds[]>({
    queryKey: [`/api/fuku-odds/latest/${id}`],
    enabled: !!id,
  });

  const { data: latestWakurenOdds } = useQuery<WakurenOdds[]>({
    queryKey: [`/api/wakuren-odds/latest/${id}`],
    enabled: !!id,
  });

  const { data: latestUmarenOdds } = useQuery<UmarenOdds[]>({
    queryKey: [`/api/umaren-odds/latest/${id}`],
    enabled: !!id,
  });

  const { data: latestWideOdds } = useQuery<WideOdds[]>({
    queryKey: [`/api/wide-odds/latest/${id}`],
    enabled: !!id,
  });

  const { data: latestUmatanOdds } = useQuery<UmatanOdds[]>({
    queryKey: [`/api/umatan-odds/latest/${id}`],
    enabled: !!id,
  });

  const { data: latestSanrenpukuOdds } = useQuery<Fuku3Odds[]>({
    queryKey: [`/api/sanrenpuku-odds/latest/${id}`],
    enabled: !!id,
  });

  const { data: latestSanrentanOdds } = useQuery<Tan3Odds[]>({
    queryKey: [`/api/sanrentan-odds/latest/${id}`],
    enabled: !!id,
  });

  const queryKey = useMemo(() => 
    [`/api/betting-strategy/${id}`, { budget, riskRatio, winProbs, placeProbs }], 
    [id, budget, riskRatio, winProbs, placeProbs]
  );

  const { data: recommendedBets, isLoading } = useQuery<BetProposal[], Error>({
    queryKey,
    queryFn: async () => {
      if (!horses || !latestOdds || !latestFukuOdds || !latestWakurenOdds || 
          !latestUmarenOdds || !latestWideOdds || !latestUmatanOdds || 
          !latestSanrenpukuOdds || !latestSanrentanOdds) return [];

      const horseDataList = horses.map(horse => ({
        name: horse.name,
        odds: Number(latestOdds.find((odd: TanOddsHistory) => Number(odd.horseId) === horse.number)?.odds || 0),
        fukuOdds: Number(latestFukuOdds.find(odd => Number(odd.horseId) === horse.number)?.oddsMin || 0),
        winProb: winProbs[horse.id] / 100,
        placeProb: placeProbs[horse.id] / 100,
        frame: horse.frame,
        number: horse.number
      }));

      const wakurenData = latestWakurenOdds.map(odd => ({
        frame1: odd.frame1,
        frame2: odd.frame2,
        odds: Number(odd.odds)
      }));

      const umarenData = latestUmarenOdds.map(odd => ({
        horse1: odd.horse1,
        horse2: odd.horse2,
        odds: Number(odd.odds)
      }));

      const wideData = latestWideOdds.map(odd => ({
        horse1: odd.horse1,
        horse2: odd.horse2,
        oddsMin: Number(odd.oddsMin),
        oddsMax: Number(odd.oddsMax)
      }));

      const umatanData = latestUmatanOdds.map(odd => ({
        horse1: odd.horse1,
        horse2: odd.horse2,
        odds: Number(odd.odds)
      }));

      const sanrenpukuData = latestSanrenpukuOdds.map(odd => ({
        horse1: odd.horse1,
        horse2: odd.horse2,
        horse3: odd.horse3,
        odds: Number(odd.odds)
      }));

      const sanrentanData = latestSanrentanOdds.map(odd => ({
        horse1: odd.horse1,
        horse2: odd.horse2,
        horse3: odd.horse3,
        odds: Number(odd.odds)
      }));

      const fukuData = latestFukuOdds?.map(odd => ({
        horse1: odd.horseId,
        oddsMin: Number(odd.oddsMin),
        oddsMax: Number(odd.oddsMax)
      })) || [];

      if (process.env.NODE_ENV === 'development') {
        console.log('馬券計算開始:', {
          queryKey,
          horseCount: horseDataList.length,
          budget,
          riskRatio
        });
      }

      const result = calculateBetProposals(
        horseDataList, 
        budget, 
        riskRatio, 
        fukuData,
        wakurenData, 
        umarenData, 
        wideData,
        umatanData,
        sanrenpukuData,
        sanrentanData
      );

      if (process.env.NODE_ENV === 'development') {
        console.log('馬券計算完了:', {
          queryKey,
          resultCount: result.length
        });
      }

      return result;
    },
    enabled: !!id && !!horses && !!latestOdds && !!latestFukuOdds && 
             !!latestWakurenOdds && !!latestUmarenOdds && !!latestWideOdds && 
             !!latestUmatanOdds && !!latestSanrenpukuOdds && !!latestSanrentanOdds && 
             budget > 0 && Object.keys(winProbs).length > 0,
    staleTime: 30000,
    cacheTime: 60000,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    refetchOnWindowFocus: false,
    refetchOnReconnect: false
  } as UseQueryOptions<BetProposal[], Error>);

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Strategy params updated:', {
        budget,
        riskRatio,
        winProbs,
        placeProbs,
        URLパラメータ: {
          winProbsStr,
          placeProbsStr
        }
      });
    }
  }, [budget, riskRatio, winProbs, placeProbs, winProbsStr, placeProbsStr]);

  // レース情報を取得
  const { data: race } = useQuery<Race>({
    queryKey: [`/api/races/${id}`],
    enabled: !!id,
  });

  if (!horses) {
    return (
      <MainLayout>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            レースデータの読み込みに失敗しました。
          </AlertDescription>
        </Alert>
      </MainLayout>
    );
  }

  if (!budget || budget <= 0) {
    return (
      <MainLayout>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            予算が設定されていません。
          </AlertDescription>
        </Alert>
      </MainLayout>
    );
  }

  const hasValidProbabilities = 
    Object.keys(winProbs).length > 0 || 
    Object.keys(placeProbs).length > 0;

  if (!hasValidProbabilities) {
    return (
      <MainLayout>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            確率データが不足しています。確率入力画面からやり直してください。
          </AlertDescription>
        </Alert>
      </MainLayout>
    );
  }

  const totalInvestment = recommendedBets?.reduce((sum, bet) => sum + bet.stake, 0) || 0;
  
  const betDetails = recommendedBets?.map(bet => {
    const weight = bet.stake / totalInvestment;
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`馬券詳細:`, {
        馬名: bet.horses.join(', '),
        投資額: bet.stake,
        ウェイト: weight.toFixed(4),
        期待払戻金: bet.expectedReturn,
        的中確率: bet.probability
      });
    }
    
    return {
      weight,
      expectedPayout: bet.expectedReturn * bet.probability
    };
  }) || [];

  const expectedTotalPayout = betDetails.reduce((sum, detail) => 
    sum + detail.expectedPayout, 0);

  const totalExpectedReturn = totalInvestment > 0 ? 
    (expectedTotalPayout / totalInvestment) - 1 : 
    0;

  if (process.env.NODE_ENV === 'development') {
    console.log('ポートフォリオ全体:', {
      総投資額: totalInvestment,
      期待払戻金: expectedTotalPayout,
      期待リターン: `${(totalExpectedReturn * 100).toFixed(2)}%`,
      馬券数: betDetails.length
    });
  }

  const expectedROI = totalInvestment > 0 ? 
    `+${(totalExpectedReturn * 100).toFixed(1)}%` : 
    '0%';

  if (recommendedBets?.length === 0) {
    return (
      <MainLayout>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>最適な馬券が見つかりませんでした</AlertTitle>
          <AlertDescription>
            以下の点を確認して、再度試してください：
            <ul className="list-disc list-inside mt-2">
              <li>予算: {budget.toLocaleString()}円</li>
              <li>リスク設定: {riskRatio}</li>
            </ul>
            <div className="mt-2">
              <Button 
                variant="outline" 
                onClick={() => window.history.back()}
                className="mt-2"
              >
                戻る
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* レース情報ヘッダー */}
        <div className="rounded-lg border border-border/50 bg-card/30 backdrop-blur-sm p-4">
          <h2 className="text-xl font-bold">
            {race?.name || 'レース名を読み込み中...'}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {race?.venue} - {race?.startTime ? new Date(race.startTime).toLocaleString('ja-JP') : ''}
          </p>
        </div>

        {/* メインコンテンツ: モバイルでは1カラム、lg以上で2カラム */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-6">
          {/* 左カラム: AI戦略、分析情報 */}
          <div className="lg:col-span-3 space-y-4">
            {/* AI戦略 */}
            <GeminiStrategy 
              recommendedBets={recommendedBets} 
              budget={budget} 
              riskRatio={riskRatio}
            />

            {/* 分析情報 */}
            {horses && (
              <RaceAnalytics
                winProbs={winProbs}
                placeProbs={placeProbs}
                horses={horses}
                budget={budget}
                riskRatio={riskRatio}
              />
            )}
          </div>

          {/* 右カラム: 馬券候補一覧 */}
          <div className="lg:col-span-2">
            {recommendedBets && recommendedBets.length > 0 && (
              <div className="lg:sticky lg:top-4">
                <BettingOptionsTable bettingOptions={recommendedBets} />
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}