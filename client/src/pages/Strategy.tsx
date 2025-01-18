import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import MainLayout from "@/components/layout/MainLayout";
import { Calculator, Brain, TrendingUp, Wallet, Target, Scale, AlertCircle } from "lucide-react";
import { Horse, TanOddsHistory, FukuOdds, WakurenOdds, UmarenOdds, WideOdds, UmatanOdds } from "@db/schema";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import RiskAssessment from "@/components/RiskAssessment";
import { Progress } from "@/components/ui/progress";
import { useEffect } from "react";
import { calculateBetProposals, type BetProposal } from '@/lib/betCalculator';

interface RecommendedBet {
  type: string;
  horses: string[];
  stake: number;
  expectedReturn: number;
  probability: number;
}

export default function Strategy() {
  const { id } = useParams();
  const params = new URLSearchParams(window.location.search);
  const budget = Number(params.get("budget")) || 0;
  const riskRatio = Number(params.get("risk")) || 1;

  const winProbsStr = params.get("winProbs") || "{}";
  const placeProbsStr = params.get("placeProbs") || "{}";
  const winProbs = (() => {
    try {
      return JSON.parse(winProbsStr);
    } catch (e) {
      console.error('単勝確率のパース失敗:', e);
      return {};
    }
  })();
  const placeProbs = (() => {
    try {
      return JSON.parse(placeProbsStr);
    } catch (e) {
      console.error('複勝確率のパース失敗:', e);
      return {};
    }
  })();

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

  const { data: recommendedBets, isLoading } = useQuery<BetProposal[]>({
    queryKey: [`/api/betting-strategy/${id}`, { budget, riskRatio, winProbs, placeProbs }],
    queryFn: async () => {
      if (!horses || !latestOdds || !latestFukuOdds || !latestWakurenOdds || 
          !latestUmarenOdds || !latestWideOdds || !latestUmatanOdds) return [];

      const horseDataList = horses.map(horse => ({
        name: horse.name,
        odds: Number(latestOdds.find(odd => Number(odd.horseId) === horse.number)?.odds || 0),
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

      return calculateBetProposals(
        horseDataList, 
        budget, 
        riskRatio, 
        wakurenData, 
        umarenData, 
        wideData,
        umatanData
      );
    },
    enabled: !!id && !!horses && !!latestOdds && !!latestFukuOdds && 
             !!latestWakurenOdds && !!latestUmarenOdds && !!latestWideOdds && 
             !!latestUmatanOdds && budget > 0 && Object.keys(winProbs).length > 0
  });

  useEffect(() => {
    console.log('Strategy params:', {
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
    "+0.0%";
  const investmentRatio = (totalInvestment / budget) * 100;

  const averageWinRate = recommendedBets ? 
    `${((recommendedBets.reduce((sum, bet) => sum + bet.probability, 0) / recommendedBets.length) * 100).toFixed(1)}%` : 
    "0.0%";

  return (
    <MainLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">馬券購入戦略</h1>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              推奨される馬券
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>券種</TableHead>
                  <TableHead>対象馬</TableHead>
                  <TableHead className="text-right">投資額</TableHead>
                  <TableHead className="text-right">期待払戻金</TableHead>
                  <TableHead className="text-right">的中確率</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recommendedBets?.map((bet, index) => (
                  <TableRow key={index}>
                    <TableCell>{bet.type}</TableCell>
                    <TableCell>{bet.horses.join(", ")}</TableCell>
                    <TableCell className="text-right">
                      ¥{bet.stake.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      ¥{bet.expectedReturn.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {(bet.probability * 100).toFixed(1)}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                投資概要
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">設定予算</p>
                  <p className="text-2xl font-bold">¥{budget.toLocaleString()}</p>
                  <div className="mt-2">
                    <div className="flex justify-between text-sm mb-1">
                      <span>予算使用率</span>
                      <span>{investmentRatio.toFixed(1)}%</span>
                    </div>
                    <Progress value={investmentRatio} className="h-2" />
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">総投資額</p>
                  <p className="text-2xl font-bold">¥{totalInvestment.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                リターン予測
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">期待リターン（加重平均）</p>
                  <p className="text-2xl font-bold text-green-500">
                    {totalExpectedReturn > 0 ? "+" : ""}
                    {(totalExpectedReturn * 100).toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">期待払戻金</p>
                  <p className="text-2xl font-bold text-green-500">
                    ¥{(expectedTotalPayout).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5" />
                リスク指標
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">リスクリワード</p>
                  <p className="text-2xl font-bold">{riskRatio.toFixed(1)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">平均的中率</p>
                  <p className="text-2xl font-bold">
                    {averageWinRate}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <RiskAssessment />

        <Alert>
          <AlertTitle>投資に関する注意事項</AlertTitle>
          <AlertDescription>
            推奨された馬券構成は、入力された予想確率とリスクリワードに基づいて計算されています。
            実際の投資判断は、各自の責任において行ってください。
          </AlertDescription>
        </Alert>
      </div>
    </MainLayout>
  );
}