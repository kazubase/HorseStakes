import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, TrendingUp, TrendingDown } from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

interface RiskMetrics {
  overallRisk: number;
  volatilityScore: number;
  potentialReturn: number;
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
      potentialReturn: 2.5,
      marketTrend: 'up',
      recommendations: [
        "Consider diversifying your selections",
        "High-risk bets detected in current strategy",
        "Potential for significant returns but with elevated risk"
      ]
    }
  });

  if (!riskMetrics) return null;

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
              <Progress 
                value={riskMetrics.overallRisk} 
                className="h-4"
                // Add color indication based on risk level
                style={{
                  background: `hsl(${100 - riskMetrics.overallRisk}, 100%, 30%)`,
                }} 
              />
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
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {riskMetrics.volatilityScore}% Volatility
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