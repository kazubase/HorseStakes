import { useParams, useLocation } from "wouter";
import MainLayout from "@/components/layout/MainLayout";
import { useAtom } from 'jotai';
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Race } from "@db/schema";
import { currentStepAtom, horsesAtom, latestOddsAtom } from '@/stores/bettingStrategy';
import { BettingAnalysis } from "@/components/betting/BettingAnalysis";
import { BettingSelection } from "@/components/betting/BettingSelection";
import { BettingPortfolio } from "@/components/betting/BettingPortfolio";
import { BettingStepProgress } from "@/components/betting/BettingStepProgress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { HorseMarquee } from "@/components/HorseMarquee";
import { useThemeStore } from "@/stores/themeStore";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";

export function BettingStrategy() {
  const { id } = useParams();
  const [currentStep] = useAtom(currentStepAtom);
  const [, setLocation] = useLocation();
  const [horses] = useAtom(horsesAtom);
  const [latestOdds] = useAtom(latestOddsAtom);
  const { theme } = useThemeStore();
  const queryClient = useQueryClient();
  
  // レース情報を取得（無限キャッシュ）
  const { data: race } = useQuery<Race>({
    queryKey: [`/api/races/${id}`],
    enabled: !!id,
    staleTime: Infinity, // レース情報は永続的にキャッシュ
    gcTime: Infinity, // キャッシュを永続的に保持
  });
  
  // 馬データと単勝オッズをマージ
  const horseMarqueeData = useMemo(() => {
    if (!horses || !horses.length || !latestOdds || !latestOdds.length) return [];
    
    const result = horses.map(horse => ({
      number: horse.number,
      name: horse.name,
      frame: horse.frame,
      odds: Number(latestOdds.find(odd => Number(odd.horseId) === horse.number)?.odds || 0)
    }));
    
    return result;
  }, [horses, latestOdds]);

  // HorseMarqueeを表示すべきかどうか
  const shouldShowMarquee = useMemo(() => {
    return horseMarqueeData.length > 0;
  }, [horseMarqueeData]);
  
  // コンポーネントがマウントされたときにサイズ再計算のイベントを発火
  useEffect(() => {
    if (shouldShowMarquee) {
      // 少し遅延を入れてからサイズ計算を確実に行う
      const timer = setTimeout(() => {
        // HorseMarqueeコンポーネントのサイズ計算を強制的に再実行するイベントを発火
        const resizeEvent = new Event('resize');
        window.dispatchEvent(resizeEvent);
        
        // 2回目のリサイズイベントを追加で発火して確実に反映させる
        setTimeout(() => {
          window.dispatchEvent(resizeEvent);
        }, 500);
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [shouldShowMarquee]);
  
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
    <div className="space-y-1 sm:space-y-2">
      {/* レース情報ヘッダー */}
      <div className="relative overflow-hidden rounded-xl border border-border/50 bg-gradient-to-br from-card/50 via-card/30 to-card/20 backdrop-blur-sm shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-transparent" />
        <div className="relative p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-xl sm:text-xl md:text-2xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
                {race?.name || 'レース名を読み込み中...'}
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2">
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

      <div className="container mx-auto py-2 sm:py-3 space-y-3 sm:space-y-4">
        {/* ステップ進行状況 */}
        <BettingStepProgress onBackToPrediction={handleBackToPredictionSettings} />
        
        {/* 現在のステップに応じたコンポーネントを表示 */}
        <div className="mt-2 sm:mt-3">
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
    
    {/* 電光掲示板をフッターに固定表示 */}
    {shouldShowMarquee && (
      <div className="fixed bottom-0 left-0 right-0 z-20 shadow-lg pointer-events-none">
        <div className="container mx-auto px-4">
          <HorseMarquee 
            horses={horseMarqueeData} 
            className={theme === 'light' ? 'shadow-sm mb-0 rounded-t-lg' : 'shadow-lg mb-0 rounded-t-lg'}
            speed={60}
          />
        </div>
      </div>
    )}
  </MainLayout>
  );
} 