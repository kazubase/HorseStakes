import { useEffect } from "react";
import { useParams } from "wouter";
import { useAtom } from 'jotai';
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export function BettingAnalysis() {
  const { id } = useParams();
  const [horses, setHorses] = useAtom(horsesAtom);
  const [winProbs] = useAtom(winProbsAtom);
  const [placeProbs] = useAtom(placeProbsAtom);
  const [, setAnalysisResult] = useAtom(analysisResultAtom);

  // データ取得
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

  // ... 他のオッズデータの取得 ...

  // 分析実行
  useEffect(() => {
    if (!horsesData || !latestOdds || !winProbs || !placeProbs) return;

    // 馬データの更新
    setHorses(horsesData);

    // 分析用データの準備
    const horseData = horsesData.map(horse => ({
      name: horse.name,
      odds: Number(latestOdds.find(o => o.horseId === horse.id)?.odds) || 0,
      winProb: winProbs[horse.id] || 0,
      placeProb: placeProbs[horse.id] || 0,
      frame: horse.frame,
      number: horse.number
    }));

    try {
      // 馬券候補の計算
      const bettingOptions = calculateBetProposals(
        horseData,
        10000, // 仮の予算（実際には設定値を使用）
        1.0,   // 仮のリスク比率
        latestFukuOdds?.map(odds => ({
          horse1: odds.horseId,
          oddsMin: Number(odds.oddsMin),
          oddsMax: Number(odds.oddsMax)
        })) || [],
        [], // wakurenData
        [], // umarenData
        [], // wideData
        [], // umatanData
        [], // sanrenpukuData
        []  // sanrentanData
      );

      // リスク指標の計算
      const riskMetrics = {
        expectedReturn: bettingOptions.reduce((sum, bet) => sum + bet.expectedReturn, 0),
        risk: calculateRisk(bettingOptions), // リスク計算関数は別途実装
        sharpeRatio: 0 // 後で計算
      };

      // 分析結果を保存
      setAnalysisResult({
        bettingOptions,
        riskMetrics
      });

    } catch (error) {
      console.error('Analysis error:', error);
      // エラー処理
    }
  }, [horsesData, latestOdds, winProbs, placeProbs, setHorses, setAnalysisResult]);

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

  return (
    <div className="space-y-6">
      {/* 分析概要 */}
      <Card>
        <CardHeader>
          <CardTitle>期待値分析</CardTitle>
        </CardHeader>
        <CardContent>
          {horses && (
            <RaceAnalytics
              winProbs={winProbs}
              placeProbs={placeProbs}
              horses={horses}
              budget={10000} // 仮の予算
              riskRatio={1.0} // 仮のリスク比率
            />
          )}
        </CardContent>
      </Card>

      {/* 馬券候補一覧 */}
      <Card>
        <CardHeader>
          <CardTitle>馬券候補</CardTitle>
        </CardHeader>
        <CardContent>
          {horses && (
            <BettingOptionsTable
              bettingOptions={[]} // analysisResult から取得
              selectedBets={[]}   // 選択状態は次のステップで実装
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// リスク計算関数（簡易版）
function calculateRisk(bets: any[]) {
  // 標準偏差などを使用したリスク計算を実装
  return 0;
} 