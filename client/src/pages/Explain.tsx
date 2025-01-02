import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import MainLayout from "@/components/layout/MainLayout";
import { Brain, Archive, GitFork, LoaderIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ExplanationResponse {
  mainExplanation: string;
  confidence: number;
  timestamp: string;
}

export default function Explain() {
  const { id } = useParams();
  const [_, setLocation] = useLocation();

  const { data: explanation, isLoading } = useQuery<ExplanationResponse>({
    queryKey: [`/api/betting-explanation/${id}`],
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
          <h1 className="text-2xl font-bold">AIによる戦略説明</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.href = `/strategy/${id}`}
            >
              戦略画面に戻る
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              メイン説明
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none">
            <div className="space-y-4">
              <p className="whitespace-pre-wrap">{explanation?.mainExplanation}</p>
              <p className="text-sm text-muted-foreground">
                確信度: {explanation?.confidence.toFixed(1)}%
              </p>
              <p className="text-sm text-muted-foreground">
                生成時刻: {new Date(explanation?.timestamp || '').toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button
            size="lg"
            className="h-24"
            variant="outline"
            onClick={() => setLocation(`/explain/detail/${id}`)}
          >
            <div className="flex flex-col items-center gap-2">
              <Brain className="h-6 w-6" />
              <span>詳細説明を見る</span>
            </div>
          </Button>

          <Button
            size="lg"
            className="h-24"
            variant="outline"
            onClick={() => setLocation(`/explain/history/${id}`)}
          >
            <div className="flex flex-col items-center gap-2">
              <Archive className="h-6 w-6" />
              <span>過去実績を分析</span>
            </div>
          </Button>

          <Button
            size="lg"
            className="h-24"
            variant="outline"
            onClick={() => setLocation(`/explain/alternatives/${id}`)}
          >
            <div className="flex flex-col items-center gap-2">
              <GitFork className="h-6 w-6" />
              <span>代替戦略を提案</span>
            </div>
          </Button>
        </div>

        <Alert>
          <AlertDescription>
            AIによる説明は参考情報です。実際の投資判断は、各自の責任において行ってください。
          </AlertDescription>
        </Alert>
      </div>
    </MainLayout>
  );
}
