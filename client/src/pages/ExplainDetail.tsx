import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import MainLayout from "@/components/layout/MainLayout";
import { ArrowLeft, Brain, ChartPie, Target, LoaderIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

interface DetailExplanationResponse {
  detailedExplanation: string;
  analysisPoints: {
    horsePotential: string;
    oddsAnalysis: string;
    investmentLogic: string;
    riskScenarios: string;
    alternativeApproaches: string;
  };
  confidence: number;
  timestamp: string;
}

export default function ExplainDetail() {
  const { id } = useParams();

  const { data: explanation, isLoading } = useQuery<DetailExplanationResponse>({
    queryKey: [`/api/betting-explanation/${id}/detail`],
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <LoaderIcon className="h-8 w-8 animate-spin" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">戦略詳細分析</h1>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.href = `/explain/${id}`}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            戻る
          </Button>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                概要
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <p className="whitespace-pre-wrap">{explanation?.detailedExplanation}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ChartPie className="h-5 w-5" />
                詳細分析項目
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-sm font-medium mb-2">出走馬の実力分析</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {explanation?.analysisPoints.horsePotential}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium mb-2">オッズ分析</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {explanation?.analysisPoints.oddsAnalysis}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium mb-2">投資判断の根拠</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {explanation?.analysisPoints.investmentLogic}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium mb-2">想定されるリスク</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {explanation?.analysisPoints.riskScenarios}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium mb-2">代替アプローチ</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {explanation?.analysisPoints.alternativeApproaches}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                分析の確信度
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Progress 
                  value={explanation?.confidence} 
                  className="h-2"
                  style={{
                    background: `hsl(${explanation?.confidence || 0}, 100%, 30%)`,
                  }}
                />
                <p className="text-sm text-muted-foreground">
                  確信度: {explanation?.confidence.toFixed(1)}%
                </p>
                <p className="text-sm text-muted-foreground">
                  分析時刻: {new Date(explanation?.timestamp || '').toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Alert>
          <AlertDescription>
            本分析はAIによる参考情報です。実際の投資判断は、各自の責任において行ってください。
          </AlertDescription>
        </Alert>
      </div>
    </MainLayout>
  );
}