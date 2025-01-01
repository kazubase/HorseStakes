import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, TrendingUp, TrendingDown } from "lucide-react";
import { useState, useEffect } from "react";

interface RiskMetrics {
  overallRisk: number;
  volatilityScore: number;
  potentialReturn: number;
  recommendations: string[];
}

export default function RiskAssessment() {
  const [riskMetrics, setRiskMetrics] = useState<RiskMetrics>({
    overallRisk: 65,
    volatilityScore: 72,
    potentialReturn: 2.5,
    recommendations: [
      "Consider diversifying your selections",
      "High-risk bets detected in current strategy",
      "Potential for significant returns but with elevated risk"
    ]
  });

  return (
    <div className="space-y-4">
      <CardHeader className="px-0">
        <CardTitle className="text-xl font-semibold flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          Risk Assessment Dashboard
        </CardTitle>
      </CardHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-secondary/10">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Overall Risk Level</h3>
              <Progress value={riskMetrics.overallRisk} className="h-4" />
              <p className="text-xs text-muted-foreground">
                {riskMetrics.overallRisk}% Risk Score
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-secondary/10">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Market Volatility</h3>
              <Progress value={riskMetrics.volatilityScore} className="h-4" />
              <p className="text-xs text-muted-foreground">
                {riskMetrics.volatilityScore}% Volatility
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium">AI Insights</h3>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-sm">
                {riskMetrics.potentialReturn}x Potential Return
              </span>
            </div>
          </div>
          
          <div className="space-y-2">
            {riskMetrics.recommendations.map((rec, index) => (
              <Alert key={index} className="bg-secondary/10">
                <AlertTitle className="text-sm font-medium">
                  Recommendation {index + 1}
                </AlertTitle>
                <AlertDescription className="text-sm">
                  {rec}
                </AlertDescription>
              </Alert>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
