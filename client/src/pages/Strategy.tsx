import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import MainLayout from "@/components/layout/MainLayout";
import { Calculator, Brain, TrendingUp, Wallet, Target, Scale, AlertCircle } from "lucide-react";
import { Horse, TanOddsHistory, FukuOdds, WakurenOdds, UmarenOdds, WideOdds, UmatanOdds, Fuku3Odds, Tan3Odds } from "@db/schema";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import RiskAssessment from "@/components/RiskAssessment";
import { Progress } from "@/components/ui/progress";
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { calculateBetProposals, type BetProposal } from '@/lib/betCalculator';
import { getGeminiStrategy, type BettingCandidate, type GeminiResponse, DetailedGeminiResponse, type GeminiStrategy } from '@/lib/geminiApi';
import { BettingStrategyTable } from "@/components/BettingStrategyTable";

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
  strategy: GeminiStrategy | null;
  isLoading: boolean;
  error: string | null;
  isRequesting: boolean;
}

function GeminiStrategy({ recommendedBets, budget, riskRatio }: GeminiStrategyProps) {
  const { id } = useParams();
  const renderCount = useRef(0);
  const [state, setState] = useState<GeminiStrategyState>({
    strategy: null,
    isLoading: false,
    error: null,
    isRequesting: false
  });

  // デバッグ用のレンダリングカウント
  useEffect(() => {
    renderCount.current += 1;
    console.log('GeminiStrategy render:', {
      count: renderCount.current,
      recommendedBetsLength: recommendedBets?.length,
      budget,
      riskRatio,
      timestamp: new Date().toISOString()
    });
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
    if (state.isRequesting || !recommendedBets?.length || !horses) return;

    try {
      setState(prev => ({ ...prev, isRequesting: true, isLoading: true, error: null }));
      
      const allBettingOptions = {
        horses: horses.map((horse: Horse) => ({
          name: horse.name,
          odds: Number(latestOdds?.find((odd: TanOddsHistory) => Number(odd.horseId) === horse.number)?.odds || 0),
          winProb: winProbs[horse.id],
          placeProb: placeProbs[horse.id]
        })),
        winBets: recommendedBets?.filter(bet => bet.type === '単勝'),
        placeBets: recommendedBets?.filter(bet => bet.type === '複勝'),
        bracketQuinellaBets: recommendedBets?.filter(bet => bet.type === '枠連'),
        quinellaBets: recommendedBets?.filter(bet => bet.type === '馬連'),
        wideBets: recommendedBets?.filter(bet => bet.type === 'ワイド'),
        exactaBets: recommendedBets?.filter(bet => bet.type === '馬単'),
        trioBets: recommendedBets?.filter(bet => bet.type === '３連複'),
        trifectaBets: recommendedBets?.filter(bet => bet.type === '３連単'),
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

      console.log('Fetching Gemini strategy:', {
        timestamp: new Date().toISOString(),
        recommendedBetsCount: recommendedBets.length
      });

      const response = await getGeminiStrategy([], budget, allBettingOptions, riskRatio);
      
      console.log('Gemini strategy response:', {
        hasStrategy: !!response.strategy,
        strategy: response.strategy,
        bettingTable: response.strategy?.bettingTable,
        recommendations: response.strategy?.recommendations
      });

      if (!response.strategy?.bettingTable) {
        throw new Error('Invalid strategy response format');
      }

      sessionStorage.setItem(`strategy-${id}`, JSON.stringify(response.strategy));
      sessionStorage.setItem(`strategy-params-${id}`, JSON.stringify({
        budget,
        riskRatio,
        recommendedBets
      }));

      setState(prev => ({
        ...prev,
        strategy: response.strategy,
        isLoading: false,
        isRequesting: false
      }));
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: 'AIからの戦略取得に失敗しました',
        isLoading: false,
        isRequesting: false
      }));
      console.error('Strategy Error:', err);
    }
  }, [id, budget, riskRatio, recommendedBets, horses]);

  // 初期化とstrategy復元
  useEffect(() => {
    if (!recommendedBets?.length) return;

    const savedStrategy = sessionStorage.getItem(`strategy-${id}`);
    const savedParams = sessionStorage.getItem(`strategy-params-${id}`);
    
    if (savedStrategy && savedParams) {
      const params = JSON.parse(savedParams);
      if (params.budget === budget && 
          params.riskRatio === riskRatio && 
          JSON.stringify(params.recommendedBets) === JSON.stringify(recommendedBets)) {
        setState(prev => ({
          ...prev,
          strategy: JSON.parse(savedStrategy)
        }));
        return;
      }
    }

    if (!state.strategy && !state.isRequesting) {
      fetchGeminiStrategy();
    }
  }, [id, budget, riskRatio, recommendedBets]); // state.strategyとstate.isRequestingを依存配列から削除

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
            disabled={state.isLoading || state.isRequesting}
            className="gap-2"
          >
            <Brain className="h-4 w-4" />
            戦略を再分析
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
      <div className="flex justify-end">
        <Button
          onClick={fetchGeminiStrategy}
          disabled={state.isLoading || state.isRequesting}
          className="gap-2"
        >
          {state.isLoading ? (
            <>
              <Brain className="h-4 w-4 animate-pulse" />
              分析中...
            </>
          ) : (
            <>
              <Brain className="h-4 w-4" />
              戦略を再分析
            </>
          )}
        </Button>
      </div>
      {strategyTable}
    </div>
  );
}

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

      console.log('馬券計算開始:', {
        queryKey,
        horseCount: horseDataList.length,
        budget,
        riskRatio
      });

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

      console.log('馬券計算完了:', {
        queryKey,
        resultCount: result.length
      });

      return result;
    },
    enabled: !!id && !!horses && !!latestOdds && !!latestFukuOdds && 
             !!latestWakurenOdds && !!latestUmarenOdds && !!latestWideOdds && 
             !!latestUmatanOdds && !!latestSanrenpukuOdds && !!latestSanrentanOdds && 
             budget > 0 && Object.keys(winProbs).length > 0,
    staleTime: 30000,
    cacheTime: 60000,
  } as UseQueryOptions<BetProposal[], Error>);

  useEffect(() => {
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
  }, [budget, riskRatio, winProbs, placeProbs, winProbsStr, placeProbsStr]);

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
    
    console.log(`馬券詳細:`, {
      馬名: bet.horses.join(', '),
      投資額: bet.stake,
      ウェイト: weight.toFixed(4),
      期待払戻金: bet.expectedReturn,
      的中確率: bet.probability
    });
    
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

  console.log('ポートフォリオ全体:', {
    総投資額: totalInvestment,
    期待払戻金: expectedTotalPayout,
    期待リターン: `${(totalExpectedReturn * 100).toFixed(2)}%`,
    馬券数: betDetails.length
  });

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
      <div className="space-y-4">
        <GeminiStrategy 
          recommendedBets={recommendedBets} 
          budget={budget} 
          riskRatio={riskRatio}
        />
      </div>
    </MainLayout>
  );
}