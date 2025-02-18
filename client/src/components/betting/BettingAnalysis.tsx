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
import { calculateBetProposals } from '@/lib/betCalculator';
import type { Horse, TanOddsHistory, FukuOdds, WakurenOdds, UmarenOdds, WideOdds, UmatanOdds, Fuku3Odds, Tan3Odds } from "@db/schema";
import { RaceAnalytics } from "@/components/RaceAnalytics";
import { BettingOptionsTable } from "@/components/BettingOptionsTable";
import { getGeminiStrategy, type BettingCandidate, type GeminiResponse } from '@/lib/geminiApi';
import { Spinner } from "@/components/ui/spinner";
import type { BetProposal, BettingOption } from '@/lib/betCalculator';
import { evaluateBettingOptions } from '@/lib/betEvaluation';

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

  /*
  // Step 2: Geminiによる分析
  const geminiAnalysis = useQuery({
    queryKey: ['gemini-analysis', bettingOptions],
    queryFn: () => getGeminiStrategy(bettingOptions, budget, riskRatio)
  });

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
    <Card>
      <CardHeader>
        <CardTitle>AIによる分析</CardTitle>
        <CardDescription>
          予想確率の評価とリスク分析
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isAnalyzing ? (
          <div className="flex justify-center items-center p-4">
            <Spinner />
            <span className="ml-2">分析中...</span>
          </div>
        ) : analysisResult ? (
          <div className="space-y-6">
            <div>
              <h4 className="font-medium mb-2">戦略概要</h4>
              <p className="text-sm text-muted-foreground">
                {analysisResult.strategy.description}
              </p>
            </div>

            <div>
              <h4 className="font-medium mb-2">リスク特性</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">リスクレベル</p>
                  <p className="text-lg font-bold">
                    {analysisResult.strategy.summary.riskLevel}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">推奨馬券数</p>
                  <p className="text-lg font-bold">
                    {analysisResult.strategy.recommendations.length}点
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            分析結果を取得できませんでした
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
      <div className="md:col-start-4 md:col-span-6 order-1">
        {renderAnalysis()}
      </div>

      <div className="md:col-span-3 order-2">
        <Card>
          <CardHeader>
            <CardTitle>馬券候補</CardTitle>
            <CardDescription>
              期待値とリスクを考慮した推奨馬券一覧
            </CardDescription>
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

      <div className="md:col-span-3 order-3 md:order-first">
        <Card>
          <CardHeader>
            <CardTitle>予想設定</CardTitle>
            <CardDescription>
              投資条件と予想確率の設定
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <h4 className="font-medium mb-4">投資条件</h4>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">予算</p>
                  <p className="text-xl font-bold">{budget.toLocaleString()}円</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">リスク許容度</p>
                  <p className="text-xl font-bold">{riskRatio.toFixed(1)}</p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-4">予想確率</h4>
              {horses && horses.length > 0 ? (
                <div className="space-y-4">
                  {horses
                    .map(horse => ({
                      ...horse,
                      winProb: Number(winProbs[horse.id]) / 100 || 0,
                      placeProb: Number(placeProbs[horse.id]) / 100 || 0
                    }))
                    .sort((a, b) => b.winProb - a.winProb)
                    .slice(0, 5)
                    .map(horse => (
                      <div key={horse.id} className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {horse.frame}-{horse.number}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {horse.name}
                          </span>
                        </div>
                        <div className="flex gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">単勝</p>
                            <p className="text-sm font-medium">
                              {(horse.winProb * 100).toFixed(1)}%
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">複勝</p>
                            <p className="text-sm font-medium">
                              {(horse.placeProb * 100).toFixed(1)}%
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  データを読み込み中...
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function calculateRisk(bets: any[]) {
  // 標準偏差などを使用したリスク計算を実装
  return 0;
} 