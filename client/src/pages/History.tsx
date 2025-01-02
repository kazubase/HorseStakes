
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import MainLayout from "@/components/layout/MainLayout";
import { useQuery } from "@tanstack/react-query";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, ArrowUpDown, Target } from "lucide-react";

interface InvestmentSummary {
  totalInvestment: number;
  totalReturn: number;
  winRate: number;
  roi: number;
  recentResults: {
    date: string;
    raceName: string;
    invested: number;
    return: number;
  }[];
}

export default function History() {
  const { data: summary = {
    totalInvestment: 0,
    totalReturn: 0,
    winRate: 0,
    roi: 0,
    recentResults: []
  } } = useQuery<InvestmentSummary>({
    queryKey: ["/api/investment-summary"]
  });

  return (
    <MainLayout>
      <h1 className="text-2xl font-bold mb-6">投資結果サマリー</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              収支概要
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">総投資額</p>
                <p className="text-2xl font-bold">¥{summary.totalInvestment.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">総回収額</p>
                <p className="text-2xl font-bold">¥{summary.totalReturn.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">収支</p>
                <p className={`text-2xl font-bold ${summary.roi >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {summary.roi >= 0 ? '+' : ''}{summary.roi}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              的中率
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>的中率</span>
                  <span>{summary.winRate}%</span>
                </div>
                <Progress value={summary.winRate} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowUpDown className="h-5 w-5" />
              最近の結果
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {summary.recentResults.map((result, index) => (
                <div key={index} className="flex justify-between items-center">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{result.date} {result.raceName}</p>
                    <p className="text-sm text-muted-foreground">投資: ¥{result.invested.toLocaleString()}</p>
                  </div>
                  <p className={`text-sm font-bold ${result.return > result.invested ? 'text-green-500' : 'text-red-500'}`}>
                    ¥{result.return.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
