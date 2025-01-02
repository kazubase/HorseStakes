import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, TrendingUp, TrendingDown, Percent, Target, Brain } from "lucide-react";
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
  const { data: riskMetrics, isLoading } = useQuery<RiskMetrics>({
    queryKey: ["/api/risk-assessment"],
    refetchInterval: 5000, // Refresh every 5 seconds
    placeholderData: {
      overallRisk: 65,
      volatilityScore: 72,
      expectedReturn: 2.5,
      winProbability: 45,
      marketSentiment: "やや強気",
      riskFactors: [
        { description: "市場の変動性が高い", impact: 75 },
        { description: "競合が激しい", impact: 65 },
        { description: "天候の影響", impact: 45 }
      ],
      marketTrend: 'up',
      recommendations: [
        "投資の分散化を検討",
        "高リスクの投資を制限",
        "市場の変動に注意"
      ]
    }
  });

  if (!riskMetrics) return null;

  return (
    <div className="space-y-4">
      <CardHeader className="px-0">
        <CardTitle className="text-xl font-semibold flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          リスク分析ダッシュボード
        </CardTitle>
      </CardHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 総合リスクスコア */}
        <Card className="bg-secondary/10">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">総合リスクスコア</h3>
                <span className="text-sm text-muted-foreground">
                  {riskMetrics.marketSentiment}
                </span>
              </div>
              <Progress 
                value={riskMetrics.overallRisk} 
                className="h-4"
                style={{
                  background: `hsl(${100 - riskMetrics.overallRisk}, 100%, 30%)`,
                }} 
              />
              <p className="text-xs text-muted-foreground">
                {riskMetrics.overallRisk}% リスクスコア
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 勝率予測 */}
        <Card className="bg-secondary/10">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">勝率予測</h3>
                <Percent className="h-4 w-4 text-muted-foreground" />
              </div>
              <Progress value={riskMetrics.winProbability} className="h-4" />
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {riskMetrics.winProbability}% 的中率
                </p>
                {riskMetrics.marketTrend === 'up' ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : riskMetrics.marketTrend === 'down' ? (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* リスク要因分析 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Target className="h-5 w-5" />
            リスク要因分析
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {riskMetrics.riskFactors.map((factor, index) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between items-center">
                  <p className="text-sm font-medium">{factor.description}</p>
                  <span className="text-sm text-muted-foreground">
                    影響度: {factor.impact}%
                  </span>
                </div>
                <Progress 
                  value={factor.impact} 
                  className="h-2"
                  style={{
                    background: `hsl(${100 - factor.impact}, 100%, 30%)`,
                  }}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AIによる分析と推奨事項 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI分析レポート
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {riskMetrics.recommendations.map((rec, index) => (
              <Alert key={index} className="bg-secondary/10">
                <AlertTitle className="text-sm font-medium">
                  推奨事項 {index + 1}
                </AlertTitle>
                <AlertDescription className="text-sm">
                  {rec}
                </AlertDescription>
              </Alert>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 期待リターン */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium">期待リターン</h3>
              <p className="text-2xl font-bold text-green-500">
                {riskMetrics.expectedReturn.toFixed(1)}倍
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-500" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}