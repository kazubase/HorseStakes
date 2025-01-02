import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import MainLayout from "@/components/layout/MainLayout";
import { ArrowLeft, Brain, LoaderIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface DetailExplanationResponse {
  detailedExplanation: string;
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
          <h1 className="text-2xl font-bold">詳細説明</h1>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.href = `/explain/${id}`}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            戻る
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              詳細分析
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none">
            <div className="space-y-4">
              <p className="whitespace-pre-wrap">{explanation?.detailedExplanation}</p>
              <div className="mt-6 text-sm text-muted-foreground">
                <p>確信度: {explanation?.confidence.toFixed(1)}%</p>
                <p>生成時刻: {new Date(explanation?.timestamp || '').toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Alert>
          <AlertDescription>
            AIによる分析は参考情報です。実際の投資判断は、各自の責任において行ってください。
          </AlertDescription>
        </Alert>
      </div>
    </MainLayout>
  );
}
