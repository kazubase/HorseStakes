import { useEffect } from "react";
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

export function BettingAnalysis() {
  const { id } = useParams();
  const location = useLocation();
  const [horses, setHorses] = useAtom(horsesAtom);
  const [winProbs] = useAtom(winProbsAtom);
  const [placeProbs] = useAtom(placeProbsAtom);
  const [analysisResult, setAnalysisResult] = useAtom(analysisResultAtom);

  // URLパラメータから設定値を取得
  const searchParams = new URLSearchParams(window.location.search);
  const budget = Number(searchParams.get('budget')) || 10000;
  const riskRatio = Number(searchParams.get('risk')) || 1.0;

  // URLパラメータから確率データを取得
  const winProbsParam = searchParams.get('winProbs') || '{}';
  const placeProbsParam = searchParams.get('placeProbs') || '{}';
  const winProbsData = JSON.parse(winProbsParam);
  const placeProbsData = JSON.parse(placeProbsParam);

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

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
      {/* AIによる分析（スマホでは最上部） */}
      <div className="md:col-start-4 md:col-span-6 order-1">
        <Card className="h-full">
          <CardHeader>
            <CardTitle>AIによる分析</CardTitle>
            <CardDescription>
              予想確率の評価とリスク分析
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* 予想確率の評価 */}
              <div>
                <h4 className="font-medium mb-2">予想確率の評価</h4>
                <p className="text-sm text-muted-foreground">
                  {/* ここにGeminiの確率評価を表示 */}
                </p>
              </div>

              {/* リスク分析 */}
              <div>
                <h4 className="font-medium mb-2">リスク特性</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">期待収益率</p>
                    <p className="text-lg font-bold text-green-500">
                      +{((analysisResult?.riskMetrics?.expectedReturn ?? 0) * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">リスク値</p>
                    <p className="text-lg font-bold">
                      {analysisResult?.riskMetrics?.risk.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">シャープレシオ</p>
                    <p className="text-lg font-bold">
                      {analysisResult?.riskMetrics?.sharpeRatio.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 馬券候補（スマホでは2番目） */}
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
              bettingOptions={analysisResult?.bettingOptions || []}
            />
          </CardContent>
        </Card>
      </div>

      {/* 予想設定（スマホでは最下部） */}
      <div className="md:col-span-3 order-3 md:order-first">
        <Card>
          <CardHeader>
            <CardTitle>予想設定</CardTitle>
            <CardDescription>
              投資条件と予想確率の設定
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* 投資設定 */}
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

            {/* 予想確率 */}
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

// リスク計算関数（簡易版）
function calculateRisk(bets: any[]) {
  // 標準偏差などを使用したリスク計算を実装
  return 0;
} 