import { useParams, useLocation } from "wouter";
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
import { format } from "date-fns";

export function BettingStrategy() {
  const { id } = useParams();
  const [currentStep] = useAtom(currentStepAtom);
  const [, setLocation] = useLocation();

  // レース情報を取得
  const { data: race } = useQuery<Race>({
    queryKey: [`/api/races/${id}`],
    enabled: !!id,
  });
  
  // 予想設定画面に戻る処理
  const handleBackToPredictionSettings = () => {
    // 現在のURLパラメータを取得
    const searchParams = new URLSearchParams(window.location.search);
    const budget = searchParams.get('budget');
    const risk = searchParams.get('risk');
    const winProbs = searchParams.get('winProbs');
    const placeProbs = searchParams.get('placeProbs');
    
    // 予想設定画面のURLを構築（パラメータを明示的にエンコード）
    const encodedWinProbs = winProbs ? encodeURIComponent(winProbs) : '';
    const encodedPlaceProbs = placeProbs ? encodeURIComponent(placeProbs) : '';
    
    setLocation(`/predict/${id}?budget=${budget || ''}&risk=${risk || ''}&winProbs=${encodedWinProbs}&placeProbs=${encodedPlaceProbs}`);
  };
  
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
      <div className="relative overflow-hidden rounded-xl border border-border/50 bg-gradient-to-br from-card/50 via-card/30 to-card/20 backdrop-blur-sm shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-transparent" />
        <div className="relative p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
                {race?.name || 'レース名を読み込み中...'}
              </h2>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-primary/80 animate-pulse" />
                {race?.startTime ? (
                  format(new Date(race.startTime), 'yyyy年M月d日 HH:mm')
                ) : (
                  '読み込み中...'
                )} 発走
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto py-6 space-y-6">
        {/* ステップ進行状況 */}
        <BettingStepProgress onBackToPrediction={handleBackToPredictionSettings} />
        
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
    </div>
  </MainLayout>
  );
} 