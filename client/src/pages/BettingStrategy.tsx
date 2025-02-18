import { useParams } from "wouter";
import MainLayout from "@/components/layout/MainLayout";
import { useAtom } from 'jotai';
import { useQuery } from "@tanstack/react-query";
import { Race } from "@db/schema";
import { currentStepAtom } from '@/stores/bettingStrategy';
import { BettingAnalysis } from "@/components/betting/BettingAnalysis";
import { BettingSelection } from "@/components/betting/BettingSelection";
import { BettingPortfolio } from "@/components/betting/BettingPortfolio";
import { BettingStepProgress } from "@/components/betting/BettingStepProgress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export function BettingStrategy() {
  const { id } = useParams();
  const [currentStep] = useAtom(currentStepAtom);

    // レース情報を取得
  const { data: race } = useQuery<Race>({
    queryKey: [`/api/races/${id}`],
    enabled: !!id,
  });
  
  if (!id) {
    return (
      <MainLayout>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            レースIDが指定されていません。
          </AlertDescription>
        </Alert>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
    <div className="space-y-6">
      {/* レース情報ヘッダー */}
      <div className="rounded-lg border border-border/50 bg-card/30 backdrop-blur-sm p-4">
        <h2 className="text-xl font-bold">
          {race?.name || 'レース名を読み込み中...'}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {race?.venue} - {race?.startTime ? new Date(race.startTime).toLocaleString('ja-JP') : ''}
          </p>
        </div>
      </div>

      <div className="container mx-auto py-6 space-y-6">
        {/* ステップ進行状況 */}
        <BettingStepProgress />
        
        {/* 現在のステップに応じたコンポーネントを表示 */}
        <div className="mt-6">
          {currentStep === 'ANALYSIS' && (
            <BettingAnalysis />
          )}
          
          {currentStep === 'SELECTION' && (
            <BettingSelection />
          )}
          
          {currentStep === 'PORTFOLIO' && (
            <BettingPortfolio />
          )}
        </div>
      </div>
    </MainLayout>
  );
} 