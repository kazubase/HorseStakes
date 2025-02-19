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
  analysisResultAtom 
} from '@/stores/bettingStrategy';
import type { Horse, TanOddsHistory, FukuOdds, WakurenOdds, UmarenOdds, WideOdds, UmatanOdds, Fuku3Odds, Tan3Odds } from "@db/schema";
import { BettingOptionsTable } from "@/components/BettingOptionsTable";
import { GeminiResponse } from '@/lib/geminiAnalysis';
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

export function BettingAnalysis() {
  const { id } = useParams();
  const [location] = useLocation();
  const [horses, setHorses] = useAtom(horsesAtom);
  const [analysisResult, setAnalysisResult] = useAtom<GeminiResponse | null>(analysisResultAtom);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

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

  // Step 1: 馬券の期待値計算
  const bettingOptions = useMemo(() => {
    if (!horses || !latestOdds || !latestFukuOdds || !wakurenOdds || !umarenOdds || !wideOdds || !umatanOdds || !sanrenpukuOdds || !sanrentanOdds) return [];
    return evaluateBettingOptions(
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
  }, [horses, latestOdds, latestFukuOdds, wakurenOdds, umarenOdds, wideOdds, umatanOdds, sanrenpukuOdds, sanrentanOdds, winProbs, placeProbs]);

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

  /*
  // Step 3: ポートフォリオ最適化
  const optimizedPortfolio = useMemo(() => {
    if (!geminiAnalysis.data) return null;
    return optimizePortfolio(
      geminiAnalysis.data.strategy.recommendations,
      budget,
      riskRatio
    );
  }, [geminiAnalysis.data, budget, riskRatio]);
  */

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
            <CardTitle>リスク/リターン分析</CardTitle>
          </CardHeader>
          <CardContent className="h-[500px]">
            {geminiAnalysis.data && (
              <div className="h-full w-full">
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
                        risk: calculateRisk([bet]),
                        return: (bet.expectedReturn / bet.stake - 1) * 100
                      }))}
                      fill="#8884d8"
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            )}
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
      <div className="lg:col-span-4 space-y-6">
        {/* 予想設定 */}
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

        {/* 馬券候補 */}
        <Card>
          <CardHeader>
            <CardTitle>馬券候補</CardTitle>
          </CardHeader>
          <CardContent>
            <BettingOptionsTable
              bettingOptions={bettingOptions.map(bet => ({
                type: bet.type,
                horses: [bet.horseName],
                horseName: bet.horseName,
                stake: bet.stake,
                expectedReturn: bet.expectedReturn,
                probability: bet.probability
              }))}
              selectedBets={[]}
            />
          </CardContent>
        </Card>
      </div>

      {/* AIによる分析 */}
      <div className="lg:col-span-8">
        {renderAnalysis()}
      </div>
    </div>
  );
}

function calculateRisk(bets: BetProposal[]): number {
  // 単純な実装例：的中確率が低いほどリスクが高いと仮定
  return bets.reduce((acc, bet) => acc + (1 - bet.probability), 0) / bets.length;
} 