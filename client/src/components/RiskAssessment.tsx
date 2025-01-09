import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, TrendingUp, TrendingDown, Percent, Target, Brain, Calculator } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface RiskMetrics {
  overallRisk: number;
  volatilityScore: number;
  expectedReturn: number;
  winProbability: number;
  marketSentiment: string;
  riskFactors: {
    description: string;
    impact: number;
  }[];
  recommendations: string[];
  marketTrend: 'up' | 'down' | 'stable';
}

export default function RiskAssessment() {
  // デモデータを固定値に変更
  const riskScore = 65;
  const volatility = 45;
  const correlation = 70;
  const marketCondition = 80;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          リスク分析ダッシュボード
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium">総合リスクスコア</span>
              <span className="text-sm text-muted-foreground">{riskScore}%</span>
            </div>
            <Progress value={riskScore} className="h-2" />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium">ボラティリティ</span>
              <span className="text-sm text-muted-foreground">{volatility}%</span>
            </div>
            <Progress value={volatility} className="h-2" />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium">相関係数</span>
              <span className="text-sm text-muted-foreground">{correlation}%</span>
            </div>
            <Progress value={correlation} className="h-2" />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium">市場環境</span>
              <span className="text-sm text-muted-foreground">{marketCondition}%</span>
            </div>
            <Progress value={marketCondition} className="h-2" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}