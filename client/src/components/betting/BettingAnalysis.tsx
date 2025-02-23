import { useEffect, useState, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { useAtom } from 'jotai';
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { 
  horsesAtom, 
  winProbsAtom, 
  placeProbsAtom, 
  analysisResultAtom,
  bettingOptionsAtom
} from '@/stores/bettingStrategy';
import type { Horse, TanOddsHistory, FukuOdds, WakurenOdds, UmarenOdds, WideOdds, UmatanOdds, Fuku3Odds, Tan3Odds } from "@db/schema";
import { BettingOptionsTable } from "@/components/BettingOptionsTable";
import { GeminiAnalysisResult } from '@/lib/geminiAnalysis';
import { Spinner } from "@/components/ui/spinner";
import { BetProposal, evaluateBettingOptions } from '@/lib/betEvaluation';
import { analyzeWithGemini } from '@/lib/geminiAnalysis';
import { calculateConditionalProbability } from '@/lib/betConditionalProbability';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Scatter,
  ScatterChart
} from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// 拡張されたBetProposalの型定義
interface ExtendedBetProposal {
  type: string;
  horseName: string;
  horses: string[];
  stake: number;
  expectedReturn: number;
  probability: number;
  frame1?: number;
  frame2?: number;
  frame3?: number;
  horse1?: number;
  horse2?: number;
  horse3?: number;
}

// Geminiオプションの型定義
interface GeminiOptions {
  horses: Array<Horse & {
    odds: number;
    winProb: number;
    placeProb: number;
  }>;
  bettingOptions: Array<{
    type: string;
    horseName: string;
    odds: number;
    prob: number;
    ev: number;
    frame1: number;
    frame2: number;
    frame3: number;
    horse1: number;
    horse2: number;
    horse3: number;
  }>;
  conditionalProbabilities: any[];
}

// リスク分析用のユーティリティ関数を修正
interface BetTypeStats {
  type: string;
  avgEV: number;
  risk: number;
  sharpeRatio: number;
  stdDev: number;
  betCount: number;
}

function calculateBetTypeStats(bets: BetProposal[]): BetTypeStats {
  const returns = bets.map(bet => bet.expectedReturn / bet.stake - 1);
  const probabilities = bets.map(bet => bet.probability);
  
  // 期待値（平均リターン）
  const avgEV = returns.reduce((sum, r, i) => sum + r * probabilities[i], 0);
  
  // 標準偏差（リスク）の計算
  const squaredDeviations = returns.map((r, i) => {
    const deviation = r - avgEV;
    return deviation * deviation * probabilities[i];
  });
  const variance = squaredDeviations.reduce((sum, sq) => sum + sq, 0);
  const stdDev = Math.sqrt(variance);
  
  // シャープレシオの計算（リスクフリーレートは0と仮定）
  const sharpeRatio = stdDev > 0 ? avgEV / stdDev : 0;

  return {
    type: bets[0].type,
    avgEV,
    risk: stdDev,
    sharpeRatio,
    stdDev,
    betCount: bets.length
  };
}

function BetTypeAnalysis({ bettingOptions }: { bettingOptions: BetProposal[] }) {
  const betTypeStats = Object.entries(groupBetsByType(bettingOptions))
    .map(([type, bets]) => calculateBetTypeStats(bets))
    .sort((a, b) => b.sharpeRatio - a.sharpeRatio);

  return (
    <div className="space-y-6">
      {/* リスク/リターン散布図 */}
      <Card className="p-4">
        <CardTitle className="text-base mb-4">券種別リスク/リターン特性</CardTitle>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 60 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                type="number" 
                dataKey="risk" 
                name="リスク（標準偏差）"
                label={{ value: 'リスク（標準偏差）', position: 'bottom' }}
              />
              <YAxis 
                type="number" 
                dataKey="avgEV" 
                name="期待リターン"
                label={{ value: '期待リターン', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                content={({ payload }) => {
                  if (payload && payload.length) {
                    const data = payload[0].payload as BetTypeStats;
                    return (
                      <div className="bg-white p-2 border rounded shadow-lg">
                        <p className="text-black font-medium">{data.type}</p>
                        <p className="text-black">期待リターン: {(data.avgEV * 100).toFixed(1)}%</p>
                        <p className="text-black">リスク: {(data.risk * 100).toFixed(1)}%</p>
                        <p className="text-black">シャープレシオ: {data.sharpeRatio.toFixed(2)}</p>
                        <p className="text-black">馬券数: {data.betCount}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Scatter 
                data={betTypeStats}
                fill="#8884d8"
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* 券種別詳細情報 */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        {betTypeStats.map(stats => (
          <Card key={stats.type} className="p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h4 className="font-medium">{stats.type}</h4>
                <p className="text-sm text-muted-foreground">
                  シャープレシオ: {stats.sharpeRatio.toFixed(2)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm">
                  期待リターン: {(stats.avgEV * 100).toFixed(1)}%
                </p>
                <p className="text-sm text-muted-foreground">
                  リスク: {(stats.risk * 100).toFixed(1)}%
                </p>
              </div>
            </div>
            <div className="h-20">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[stats]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="avgEV" fill="#8884d8" name="期待リターン" />
                  <Bar dataKey="risk" fill="#82ca9d" name="リスク" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function BetCombinationAnalysis({ bettingOptions }: { bettingOptions: BetProposal[] }) {
  const betTypeStats = Object.entries(groupBetsByType(bettingOptions))
    .map(([type, bets]) => calculateBetTypeStats(bets));

  // 券種間の相関を計算
  const correlations = betTypeStats.flatMap((stat1, i) => 
    betTypeStats.slice(i + 1).map(stat2 => {
      const bets1 = bettingOptions.filter(bet => bet.type === stat1.type);
      const bets2 = bettingOptions.filter(bet => bet.type === stat2.type);
      
      return {
        types: [stat1.type, stat2.type] as [string, string],
        correlation: calculateCorrelation(bets1, bets2),
        combinedSharpe: calculateCombinedSharpeRatio(bets1, bets2),
        diversificationBenefit: calculateDiversificationBenefit(bets1, bets2)
      };
    })
  );

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <CardTitle className="text-base mb-4">券種間の相関とリスク分散効果</CardTitle>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 60 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                type="number" 
                dataKey="correlation" 
                name="相関係数"
                domain={[-1, 1]}
                label={{ value: '相関係数', position: 'bottom' }}
              />
              <YAxis 
                type="number" 
                dataKey="diversificationBenefit" 
                name="リスク分散効果"
                label={{ value: 'リスク分散効果 (%)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                content={({ payload }) => {
                  if (payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white p-2 border rounded shadow-lg">
                        <p className="text-black font-medium">{data.types.join(' + ')}</p>
                        <p className="text-black">相関係数: {data.correlation.toFixed(2)}</p>
                        <p className="text-black">リスク分散効果: {data.diversificationBenefit.toFixed(1)}%</p>
                        <p className="text-black">組合せシャープレシオ: {data.combinedSharpe.toFixed(2)}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Scatter data={correlations} fill="#8884d8" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

// 新しい補助関数
function calculateCombinedSharpeRatio(bets1: BetProposal[], bets2: BetProposal[]) {
  const stats1 = calculateBetTypeStats(bets1);
  const stats2 = calculateBetTypeStats(bets2);
  const correlation = calculateCorrelation(bets1, bets2);

  // ポートフォリオの期待リターン
  const combinedReturn = (stats1.avgEV + stats2.avgEV) / 2;

  // ポートフォリオのリスク（相関を考慮）
  const combinedRisk = Math.sqrt(
    Math.pow(stats1.risk, 2) / 4 +
    Math.pow(stats2.risk, 2) / 4 +
    correlation * stats1.risk * stats2.risk / 2
  );

  return combinedRisk > 0 ? combinedReturn / combinedRisk : 0;
}

function calculateDiversificationBenefit(bets1: BetProposal[], bets2: BetProposal[]) {
  const stats1 = calculateBetTypeStats(bets1);
  const stats2 = calculateBetTypeStats(bets2);
  const correlation = calculateCorrelation(bets1, bets2);

  // 単純な加重平均リスク
  const weightedRisk = (stats1.risk + stats2.risk) / 2;

  // 分散効果を考慮したポートフォリオリスク
  const portfolioRisk = Math.sqrt(
    Math.pow(stats1.risk, 2) / 4 +
    Math.pow(stats2.risk, 2) / 4 +
    correlation * stats1.risk * stats2.risk / 2
  );

  // リスク削減効果をパーセンテージで表現
  return ((weightedRisk - portfolioRisk) / weightedRisk) * 100;
}

export function BettingAnalysis() {
  const { id } = useParams();
  const [location] = useLocation();
  const [horses, setHorses] = useAtom(horsesAtom);
  const [analysisResult, setAnalysisResult] = useAtom<GeminiAnalysisResult | null>(analysisResultAtom);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [canProceed, setCanProceed] = useState(false);
  const [, setBettingOptions] = useAtom(bettingOptionsAtom);
  const [isCalculated, setIsCalculated] = useState(false);

  const budget = Number(new URLSearchParams(window.location.search).get("budget")) || 10000;
  const riskRatio = Number(new URLSearchParams(window.location.search).get("risk")) || 1.0;

  const winProbsStr = new URLSearchParams(window.location.search).get("winProbs") || "{}";
  const placeProbsStr = new URLSearchParams(window.location.search).get("placeProbs") || "{}";
  
  const winProbs = JSON.parse(winProbsStr);
  const placeProbs = JSON.parse(placeProbsStr);

  const { data: horsesData, isError: isHorsesError } = useQuery<Horse[]>({
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

  const { data: wakurenOdds } = useQuery<WakurenOdds[]>({
    queryKey: [`/api/wakuren-odds/latest/${id}`],
    enabled: !!id,
  });

  const { data: umarenOdds } = useQuery<UmarenOdds[]>({
    queryKey: [`/api/umaren-odds/latest/${id}`],
    enabled: !!id,
  });

  const { data: wideOdds } = useQuery<WideOdds[]>({
    queryKey: [`/api/wide-odds/latest/${id}`],
    enabled: !!id,
  });

  const { data: umatanOdds } = useQuery<UmatanOdds[]>({
    queryKey: [`/api/umatan-odds/latest/${id}`],
    enabled: !!id,
  });

  const { data: sanrenpukuOdds } = useQuery<Fuku3Odds[]>({
    queryKey: [`/api/sanrenpuku-odds/latest/${id}`],
    enabled: !!id,
  });

  const { data: sanrentanOdds } = useQuery<Tan3Odds[]>({
    queryKey: [`/api/sanrentan-odds/latest/${id}`],
    enabled: !!id,
  });

  useEffect(() => {
    if (horsesData) {
      setHorses(horsesData);
    }
  }, [horsesData, setHorses]);

  // bettingOptionsの計算
  const bettingOptions = useMemo(() => {
    if (!horses || !latestOdds || !latestFukuOdds || !wakurenOdds || !umarenOdds || !wideOdds || !umatanOdds || !sanrenpukuOdds || !sanrentanOdds) return [];
    
    const options = evaluateBettingOptions(
      horses.map(horse => ({
        name: horse.name,
        odds: Number(latestOdds?.find(odd => Number(odd.horseId) === horse.number)?.odds || 0),
        winProb: winProbs[horse.id] / 100,
        placeProb: placeProbs[horse.id] / 100,
        frame: horse.frame,
        number: horse.number
      })),
      budget,
      riskRatio,
      latestFukuOdds.map(odd => ({
        horse1: Number(odd.horseId),
        oddsMin: Number(odd.oddsMin),
        oddsMax: Number(odd.oddsMax)
      })),
      wakurenOdds.map(odd => ({
        frame1: odd.frame1,
        frame2: odd.frame2,
        odds: Number(odd.odds)
      })),
      umarenOdds.map(odd => ({
        horse1: Number(odd.horse1),
        horse2: Number(odd.horse2),
        odds: Number(odd.odds)
      })),
      wideOdds.map(odd => ({
        horse1: Number(odd.horse1),
        horse2: Number(odd.horse2),
        oddsMin: Number(odd.oddsMin),
        oddsMax: Number(odd.oddsMax)
      })),
      umatanOdds.map(odd => ({
        horse1: Number(odd.horse1),
        horse2: Number(odd.horse2),
        odds: Number(odd.odds)
      })),
      sanrenpukuOdds.map(odd => ({
        horse1: Number(odd.horse1),
        horse2: Number(odd.horse2),
        horse3: Number(odd.horse3),
        odds: Number(odd.odds)
      })),
      sanrentanOdds.map(odd => ({
        horse1: Number(odd.horse1),
        horse2: Number(odd.horse2),
        horse3: Number(odd.horse3),
        odds: Number(odd.odds)
      }))
    );

    if (!isCalculated && options.length > 0) {
      setBettingOptions(options);
      setIsCalculated(true);
    }

    return options;
  }, [horses, latestOdds, latestFukuOdds, wakurenOdds, umarenOdds, wideOdds, umatanOdds, sanrenpukuOdds, sanrentanOdds, winProbs, placeProbs, isCalculated]);

  // 計算結果に基づいて次へボタンの状態を更新
  useEffect(() => {
    setCanProceed(bettingOptions.length > 0);
  }, [bettingOptions]);

  const conditionalProbabilities = useMemo(() => {
    if (!horses || !bettingOptions) return [];
    
    return calculateConditionalProbability(
      bettingOptions,
      horses.map(horse => ({
        name: horse.name,
        odds: Number(latestOdds?.find(odd => Number(odd.horseId) === horse.number)?.odds || 0),
        winProb: winProbs[horse.id] / 100,
        placeProb: placeProbs[horse.id] / 100,
        frame: horse.frame,
        number: horse.number
      }))
    ).map(corr => ({
      condition: {
        type: corr.condition.type,
        horses: corr.condition.horses
      },
      target: {
        type: corr.target.type,
        horses: corr.target.horses
      },
      probability: corr.probability
    }));
  }, [horses, bettingOptions, latestOdds, winProbs, placeProbs]);

  // Step 2: Geminiによる分析
  const geminiAnalysis = useQuery({
    queryKey: ['gemini-analysis', bettingOptions, budget, riskRatio],
    queryFn: () => analyzeWithGemini({
      horses: horses?.map(horse => ({
        name: horse.name,
        odds: Number(latestOdds?.find(odd => Number(odd.horseId) === horse.number)?.odds || 0),
        winProb: winProbs[horse.id] / 100,
        placeProb: placeProbs[horse.id] / 100,
        frame: horse.frame,
        number: horse.number
      })) || [],
      bettingOptions: bettingOptions.map(bet => ({
        type: bet.type,
        horses: bet.horses,
        horseName: bet.horses.join(bet.type.includes('単') ? '→' : '-'),
        odds: bet.expectedReturn / bet.stake,
        probability: bet.probability,
        expectedReturn: bet.expectedReturn,
        stake: bet.stake
      })),
      budget,
      riskRatio,
      correlations: conditionalProbabilities
    }),
    enabled: !!horses && !!bettingOptions.length
  });

  // 分析結果が得られたら次へ進めるようにする
  useEffect(() => {
    if (geminiAnalysis.data) {
      setAnalysisResult(geminiAnalysis.data);
    }
  }, [geminiAnalysis.data, setAnalysisResult]);

  if (isHorsesError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          データの取得に失敗しました。
        </AlertDescription>
      </Alert>
    );
  }

  const renderAnalysis = () => (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="overview">概要</TabsTrigger>
        <TabsTrigger value="risk">リスク分析</TabsTrigger>
        <TabsTrigger value="correlation">相関分析</TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <Card>
          <CardHeader>
            <CardTitle>分析概要</CardTitle>
          </CardHeader>
          <CardContent>
            {geminiAnalysis.isLoading ? (
              <div className="flex justify-center items-center p-4">
                <Spinner />
                <span className="ml-2">分析中...</span>
              </div>
            ) : geminiAnalysis.data ? (
              <div className="grid grid-cols-1 gap-6">
                {/* 馬券候補の考察 */}
                <Card className="bg-secondary/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">馬券候補の考察</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {geminiAnalysis.data.analysis.betTypeAnalysis
                        .sort((a, b) => b.suitability - a.suitability)
                        .slice(0, 3)
                        .map((analysis, i) => (
                          <div key={i} className="bg-primary/10 p-3 rounded-lg">
                            <div className="flex justify-between items-center mb-2">
                              <p className="text-sm font-medium">{analysis.type}</p>
                              <div className="flex items-center gap-1">
                                <span className="text-xs">適合度</span>
                                <div className="w-20 h-2 bg-gray-200 rounded-full">
                                  <div 
                                    className="h-full bg-green-500 rounded-full" 
                                    style={{ width: `${analysis.suitability}%` }}
                                  ></div>
                                </div>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground">{analysis.characteristics}</p>
                            <p className="text-xs text-muted-foreground mt-1">{analysis.riskProfile}</p>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>

                {/* 推奨アプローチ */}
                <Card className="bg-secondary/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">推奨アプローチ</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* 推奨される馬券組み合わせ */}
                      <div className="bg-primary/10 p-3 rounded-lg">
                        <h4 className="text-sm font-medium mb-2">推奨される馬券組み合わせ</h4>
                        {geminiAnalysis.data.analysis.betTypeAnalysis
                          .filter(analysis => analysis.suitability > 70)
                          .map((analysis, i) => (
                            <div key={i} className="mb-3">
                              <p className="text-xs font-medium mb-1">{analysis.type}</p>
                              <div className="grid grid-cols-2 gap-2">
                                {analysis.recommendedCombinations.map((combo, j) => (
                                  <div key={j} className="text-xs bg-secondary/30 p-2 rounded">
                                    {combo}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                      </div>

                      {/* 重要な洞察 */}
                      <div className="bg-primary/10 p-3 rounded-lg">
                        <h4 className="text-sm font-medium mb-2">重要な洞察</h4>
                        <ul className="list-disc pl-4 space-y-1">
                          {geminiAnalysis.data.summary.keyInsights.map((insight, i) => (
                            <li key={i} className="text-xs">{insight}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="risk">
        <Card>
          <CardHeader>
            <CardTitle>リスク分析</CardTitle>
            <CardDescription>券種ごとのリスク特性と組み合わせ効果</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="scatter" className="w-full">
              <TabsList>
                <TabsTrigger value="scatter">散布図</TabsTrigger>
                <TabsTrigger value="betType">券種分析</TabsTrigger>
                <TabsTrigger value="combination">組み合わせ効果</TabsTrigger>
              </TabsList>

              <TabsContent value="scatter" className="h-[500px]">
                {/* 既存の散布図 */}
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      type="number" 
                      dataKey="risk" 
                      name="リスク" 
                      label={{ value: 'リスク', position: 'bottom' }}
                    />
                    <YAxis 
                      type="number" 
                      dataKey="return" 
                      name="期待リターン" 
                      label={{ value: '期待リターン (%)', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip 
                      cursor={{ strokeDasharray: '3 3' }}
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        padding: '8px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}
                      content={({ payload }) => {
                        if (payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white p-2 border rounded shadow-lg">
                              <p className="text-black font-medium">{data.name}</p>
                              <p className="text-black">リスク: {data.risk.toFixed(2)}</p>
                              <p className="text-black">期待リターン: {data.return.toFixed(2)}%</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Scatter
                      data={bettingOptions.map(bet => ({
                        name: `${bet.type} ${bet.horseName}`,
                        type: bet.type,
                        risk: calculateRisk([bet]),
                        return: (bet.expectedReturn / bet.stake - 1) * 100
                      }))}
                      fill="#8884d8"
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </TabsContent>

              <TabsContent value="betType">
                <BetTypeAnalysis bettingOptions={bettingOptions} />
              </TabsContent>

              <TabsContent value="combination">
                <BetCombinationAnalysis bettingOptions={bettingOptions} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="correlation">
        <Card>
          <CardHeader>
            <CardTitle>相関分析</CardTitle>
          </CardHeader>
          <CardContent>
            {geminiAnalysis.data?.analysis.correlationPatterns.map((pattern, i) => (
              <div key={i} className="mb-4">
                <h4 className="font-medium mb-2">{pattern.strength}</h4>
                {pattern.patterns.map((p, j) => (
                  <div key={j} className="bg-secondary/50 p-3 rounded-lg mb-2">
                    <p className="text-sm mb-2">{p.description}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {p.examples.map((example, k) => (
                        <div key={k} className="text-xs">
                          <p>{example.bet1} ↔ {example.bet2}</p>
                          <p className="text-muted-foreground">確率: {example.probability}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );

  const getFrameColor = (frame: number) => {
    const colors = {
      1: 'bg-white text-black border border-gray-200',
      2: 'bg-black text-white',
      3: 'bg-red-600 text-white',
      4: 'bg-blue-600 text-white',
      5: 'bg-yellow-400 text-black',
      6: 'bg-green-600 text-white',
      7: 'bg-orange-500 text-white',
      8: 'bg-pink-400 text-white'
    };
    return colors[frame as keyof typeof colors] || 'bg-gray-200';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-4 lg:self-start">
        {/* 馬券候補を先に表示 */}
        <Card>
          <CardHeader>
            <CardTitle>馬券候補</CardTitle>
          </CardHeader>
          <CardContent>
            <Card className="p-4">
              <CardTitle className="text-base mb-4">馬券候補</CardTitle>
              <BettingOptionsTable
                bettingOptions={bettingOptions}
                selectedBets={[]}
                correlations={conditionalProbabilities}
                geminiRecommendations={geminiAnalysis.data?.recommendations}
              />
            </Card>
          </CardContent>
        </Card>

        {/* 予想設定を後に表示 */}
        <Card>
          <CardHeader>
            <CardTitle>予想設定</CardTitle>
          </CardHeader>
          <CardContent>
            {/* 投資条件 */}
            <div className="mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-secondary/50 p-4 rounded-lg">
                  <p className="text-2xl font-bold">{budget.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">予算</p>
                </div>
                <div className="bg-secondary/50 p-4 rounded-lg">
                  <p className="text-2xl font-bold">×{riskRatio.toFixed(1)}</p>
                  <p className="text-xs text-muted-foreground">リスク</p>
                </div>
              </div>
            </div>

            {/* 予想確率 */}
            {horses && horses.length > 0 ? (
              <div className="space-y-2">
                {horses
                  .map(horse => ({
                    ...horse,
                    winProb: Number(winProbs[horse.id]) / 100 || 0,
                    placeProb: Number(placeProbs[horse.id]) / 100 || 0
                  }))
                  .sort((a, b) => {
                    if (b.winProb !== a.winProb) {
                      return b.winProb - a.winProb;
                    }
                    return b.placeProb - a.placeProb;
                  })
                  .slice(0, 5)
                  .map(horse => (
                    <div key={horse.id} 
                         className="flex items-center p-2 rounded-lg hover:bg-secondary/50 transition-colors">
                      <div className="flex items-center gap-2 flex-1">
                        <div className="flex items-center">
                          <span className={`px-2 py-1 rounded text-sm ${getFrameColor(horse.frame)}`}>
                            {horse.number}
                          </span>
                        </div>
                        <span className="text-sm truncate">{horse.name}</span>
                      </div>
                      <div className="flex gap-3 text-right">
                        <div className="w-14">
                          <p className="text-sm font-bold">{(horse.winProb * 100).toFixed(0)}%</p>
                          <p className="text-[10px] text-muted-foreground">単勝</p>
                        </div>
                        <div className="w-14">
                          <p className="text-sm font-bold">{(horse.placeProb * 100).toFixed(0)}%</p>
                          <p className="text-[10px] text-muted-foreground">複勝</p>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="flex justify-center items-center h-32">
                <Spinner className="w-4 h-4 mr-2" />
                <span className="text-sm text-muted-foreground">読込中...</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AIによる分析 */}
      <div className="lg:col-span-8 lg:sticky lg:top-4 lg:self-start">
        {renderAnalysis()}
      </div>
    </div>
  );
}

function calculateRisk(bets: BetProposal[]): number {
  // 単純な実装例：的中確率が低いほどリスクが高いと仮定
  return bets.reduce((acc, bet) => acc + (1 - bet.probability), 0) / bets.length;
}

// 新しいユーティリティ関数
function groupBetsByType(bets: BetProposal[]) {
  return bets.reduce((acc, bet) => {
    if (!acc[bet.type]) acc[bet.type] = [];
    acc[bet.type].push(bet);
    return acc;
  }, {} as Record<string, BetProposal[]>);
}

function calculateCorrelation(bets1: BetProposal[], bets2: BetProposal[]) {
  // 簡易的な相関係数の計算
  const returns1 = bets1.map(bet => bet.expectedReturn / bet.stake);
  const returns2 = bets2.map(bet => bet.expectedReturn / bet.stake);
  
  const mean1 = returns1.reduce((sum, val) => sum + val, 0) / returns1.length;
  const mean2 = returns2.reduce((sum, val) => sum + val, 0) / returns2.length;
  
  const covariance = returns1.reduce((sum, val, i) => 
    sum + (val - mean1) * (returns2[i % returns2.length] - mean2), 0
  ) / returns1.length;
  
  const std1 = Math.sqrt(returns1.reduce((sum, val) => sum + Math.pow(val - mean1, 2), 0) / returns1.length);
  const std2 = Math.sqrt(returns2.reduce((sum, val) => sum + Math.pow(val - mean2, 2), 0) / returns2.length);
  
  return covariance / (std1 * std2);
}