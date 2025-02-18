import { useEffect, useState } from "react";
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
  const [winProbs] = useAtom(winProbsAtom);
  const [placeProbs] = useAtom(placeProbsAtom);
  const [analysisResult, setAnalysisResult] = useAtom<GeminiResponse | null>(analysisResultAtom);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const urlParams = new URLSearchParams(location.split('?')[1]);
  const budget = Number(urlParams.get('budget')) || 10000;
  const riskRatio = Number(urlParams.get('riskRatio')) || 1.0;

  const winProbsParam = urlParams.get('winProbs') || '{}';
  const placeProbsParam = urlParams.get('placeProbs') || '{}';
  const winProbsData = JSON.parse(winProbsParam);
  const placeProbsData = JSON.parse(placeProbsParam);

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

  useEffect(() => {
    const analyze = async () => {
      if (!horses || !latestOdds || !latestFukuOdds || 
          !wakurenOdds || !umarenOdds || !wideOdds || !umatanOdds || 
          !sanrenpukuOdds || !sanrentanOdds) return;
      
      setIsAnalyzing(true);
      try {
        const horsesWithProbs = horses.map(horse => ({
          ...horse,
          odds: Number(latestOdds.find(o => o.horseId === horse.id)?.odds || 0),
          winProb: Number(winProbsData[horse.id]) / 100 || 0,
          placeProb: Number(placeProbsData[horse.id]) / 100 || 0
        }));

        const betProposals = calculateBetProposals(
          horsesWithProbs,
          budget,
          riskRatio,
          latestFukuOdds.map(o => ({
            horse1: horses.find(h => h.id === o.horseId)?.number || 0,
            oddsMin: Number(o.oddsMin),
            oddsMax: Number(o.oddsMax)
          })),
          wakurenOdds.map(o => ({
            frame1: o.frame1,
            frame2: o.frame2,
            odds: Number(o.odds)
          })),
          umarenOdds.map(o => ({
            horse1: horses.find(h => h.id === o.horse1)?.number || 0,
            horse2: horses.find(h => h.id === o.horse2)?.number || 0,
            odds: Number(o.odds)
          })),
          wideOdds.map(o => ({
            horse1: horses.find(h => h.id === o.horse1)?.number || 0,
            horse2: horses.find(h => h.id === o.horse2)?.number || 0,
            oddsMin: Number(o.oddsMin),
            oddsMax: Number(o.oddsMax)
          })),
          umatanOdds.map(o => ({
            horse1: horses.find(h => h.id === o.horse1)?.number || 0,
            horse2: horses.find(h => h.id === o.horse2)?.number || 0,
            odds: Number(o.odds)
          })),
          sanrenpukuOdds.map(o => ({
            horse1: horses.find(h => h.id === o.horse1)?.number || 0,
            horse2: horses.find(h => h.id === o.horse2)?.number || 0,
            horse3: horses.find(h => h.id === o.horse3)?.number || 0,
            odds: Number(o.odds)
          })),
          sanrentanOdds.map(o => ({
            horse1: horses.find(h => h.id === o.horse1)?.number || 0,
            horse2: horses.find(h => h.id === o.horse2)?.number || 0,
            horse3: horses.find(h => h.id === o.horse3)?.number || 0,
            odds: Number(o.odds)
          }))
        ) as ExtendedBetProposal[];

        const bettingCandidates: BettingCandidate[] = betProposals.map(bet => ({
          type: bet.type,
          horseName: bet.horseName,
          odds: Number(latestOdds.find(o => o.horseId === bet.horse1)?.odds || 0),
          probability: `${(bet.probability * 100).toFixed(1)}%`,
          expectedValue: (bet.expectedReturn / bet.stake - 1).toFixed(2)
        }));

        const geminiOptions: GeminiOptions = {
          horses: horsesWithProbs,
          bettingOptions: betProposals.map(bet => ({
            type: bet.type,
            horseName: bet.horseName,
            odds: Number(latestOdds.find(o => o.horseId === bet.horse1)?.odds || 0),
            prob: bet.probability,
            ev: bet.expectedReturn / bet.stake - 1,
            frame1: bet.frame1 || 0,
            frame2: bet.frame2 || 0,
            frame3: bet.frame3 || 0,
            horse1: bet.horse1 || 0,
            horse2: bet.horse2 || 0,
            horse3: bet.horse3 || 0
          })),
          conditionalProbabilities: []
        };

        const result = await getGeminiStrategy(
          bettingCandidates,
          budget,
          geminiOptions,
          riskRatio
        );

        setAnalysisResult(result);
      } catch (error) {
        console.error('分析エラー:', error);
      } finally {
        setIsAnalyzing(false);
      }
    };

    analyze();
  }, [horses, latestOdds, latestFukuOdds, wakurenOdds, umarenOdds, wideOdds, umatanOdds, sanrenpukuOdds, sanrentanOdds, budget, riskRatio]);

  useEffect(() => {
    console.log('horses:', horses);
    console.log('winProbs:', winProbs);
    console.log('placeProbs:', placeProbs);
  }, [horses, winProbs, placeProbs]);

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
              bettingOptions={analysisResult?.strategy.recommendations.map(rec => ({
                type: rec.type,
                horseName: rec.horses.join('-'),
                horses: rec.horses,
                stake: 0,
                expectedReturn: 0,
                probability: Number(rec.probability)
              })) || []}
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
                      winProb: Number(winProbsData[horse.id.toString()]) / 100 || 0,
                      placeProb: Number(placeProbsData[horse.id.toString()]) / 100 || 0
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