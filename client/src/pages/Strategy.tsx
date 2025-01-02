import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import MainLayout from "@/components/layout/MainLayout";
import { Calculator, Brain, TrendingUp } from "lucide-react";
import { Horse } from "@db/schema";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import RiskAssessment from "@/components/RiskAssessment";

interface RecommendedBet {
  type: string;
  horses: string[];
  stake: number;
  expectedReturn: number;
  probability: number;
}

export default function Strategy() {
  const { id } = useParams();
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const budget = Number(params.get("budget")) || 0;
  const riskRatio = Number(params.get("risk")) || 1;

  const { data: horses } = useQuery<Horse[]>({
    queryKey: [`/api/horses/${id}`],
    enabled: !!id,
  });

  const { data: recommendedBets } = useQuery<RecommendedBet[]>({
    queryKey: [`/api/betting-strategy/${id}`, { budget, riskRatio }],
    enabled: !!id && budget > 0,
  });

  const totalInvestment = recommendedBets?.reduce((sum, bet) => sum + bet.stake, 0) || 0;
  const expectedValue = recommendedBets?.reduce(
    (sum, bet) => sum + bet.expectedReturn * bet.probability,
    0
  ) || 0;

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">馬券購入戦略</h1>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => window.location.href = `/explain/${id}`}
          >
            <Brain className="h-4 w-4" />
            AIによる説明
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                投資概要
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">予算</p>
                  <p className="text-2xl font-bold">¥{budget.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">総投資額</p>
                  <p className="text-2xl font-bold">¥{totalInvestment.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">期待値</p>
                  <p className="text-2xl font-bold text-green-500">
                    ¥{expectedValue.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">リスクリワードレシオ</p>
                  <p className="text-2xl font-bold">{riskRatio.toFixed(1)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <RiskAssessment />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              推奨される馬券
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>馬券種</TableHead>
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

        <Alert>
          <AlertTitle>投資に関する注意事項</AlertTitle>
          <AlertDescription>
            推奨された馬券構成は、入力された予想確率とリスク許容度に基づいて計算されています。
            実際の投資判断は、各自の責任において行ってください。
          </AlertDescription>
        </Alert>
      </div>
    </MainLayout>
  );
}
