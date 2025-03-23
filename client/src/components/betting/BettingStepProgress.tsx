import { useAtom } from 'jotai';
import { currentStepAtom, canProceedAtom } from '@/stores/bettingStrategy';
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft, ArrowLeft, Settings } from "lucide-react";
import { format } from 'date-fns';
import { useMediaQuery } from '../../hooks/useMediaQuery';

interface BettingStepProgressProps {
  onBackToPrediction?: () => void;
}

export function BettingStepProgress({ onBackToPrediction }: BettingStepProgressProps) {
  const [currentStep, setCurrentStep] = useAtom(currentStepAtom);
  const [canProceed] = useAtom(canProceedAtom);
  const isMobile = useMediaQuery('(max-width: 640px)');

  const steps = [
    { id: 'ANALYSIS', label: '分析', description: '期待値・リスク分析' },
    { id: 'SELECTION', label: '選択', description: '購入馬券の選択' },
    { id: 'PORTFOLIO', label: '買い目', description: '資金配分最適化' }
  ] as const;

  const currentIndex = steps.findIndex(step => step.id === currentStep);

  const handleNext = () => {
    if (currentIndex < steps.length - 1 && canProceed) {
      setCurrentStep(steps[currentIndex + 1].id);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1].id);
    }
  };

  return (
    <div className="w-full space-y-4 sm:space-y-6 px-2 sm:px-4 py-3 sm:py-5">
      {/* ステップインジケーター */}
      <div className="relative">
        <div className="absolute top-1/2 left-2 right-2 sm:left-4 sm:right-4 h-0.5 bg-gradient-to-r from-border/50 via-border to-border/50 -translate-y-1/2" />
        <div className="relative flex justify-between px-1 sm:px-2">
          {steps.map((step, index) => {
            const isActive = index === currentIndex;
            const isCompleted = index < currentIndex;
            
            return (
              <div key={step.id} className="flex flex-col items-center px-1 sm:px-2">
                {/* ステップの丸印 */}
                <div
                  className={`
                    w-7 h-7 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center relative z-10
                    transition-all duration-300 ease-out
                    ${isActive ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground scale-110 shadow-lg shadow-primary/20' : 
                      isCompleted ? 'bg-gradient-to-br from-primary/80 to-primary/60 text-primary-foreground' : 
                      'bg-gradient-to-br from-muted/80 to-muted text-muted-foreground'}
                  `}
                >
                  <span className="font-medium text-xs sm:text-sm md:text-base">{index + 1}</span>
                  {isActive && (
                    <div className="absolute inset-0 rounded-full animate-ping bg-primary/20" 
                      style={{ animationDuration: '2s' }} />
                  )}
                </div>
                
                {/* ステップラベル */}
                <div className="mt-1.5 sm:mt-2 text-center">
                  <div className={`
                    font-medium text-xs sm:text-sm md:text-base transition-colors duration-300
                    ${isActive ? 'text-primary' : isCompleted ? 'text-foreground/80' : 'text-muted-foreground'}
                  `}>
                    {step.label}
                  </div>
                  {!isMobile && (
                    <div className={`
                      text-xs transition-colors duration-300 max-w-[100px] sm:max-w-[120px] text-center
                      ${isActive ? 'text-foreground/70' : 'text-muted-foreground'}
                    `}>
                      {step.description}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ナビゲーションボタン */}
      <div className="flex justify-between mt-3 sm:mt-5 px-1 sm:px-3">
        {/* 予想設定に戻るボタン - 分析画面でのみ表示 */}
        {currentStep === 'ANALYSIS' && onBackToPrediction && (
          <Button
            variant="outline"
            size={isMobile ? "sm" : "default"}
            onClick={onBackToPrediction}
            className="flex items-center gap-0.5 sm:gap-1 text-primary hover:text-primary-foreground hover:bg-primary transition-colors border-primary/30 hover:border-primary py-1 sm:py-2 px-2 sm:px-3"
          >
            <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
            <Settings className="h-3 w-3 sm:h-4 sm:w-4 mr-0.5" />
            <span className="font-medium text-xs sm:text-sm">{isMobile ? '予想設定' : '予想設定に戻る'}</span>
          </Button>
        )}
        
        {/* 分析画面に戻るボタン - 選択画面と買い目画面で表示 */}
        {currentStep !== 'ANALYSIS' && (
          <Button
            variant="outline"
            size={isMobile ? "sm" : "default"}
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className={`
              gap-0.5 sm:gap-1 transition-all duration-300 text-xs sm:text-sm py-1 sm:py-2 px-2 sm:px-3
              ${currentIndex === 0 ? 'opacity-50' : 'hover:bg-primary/5'}
            `}
          >
            <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
            戻る
          </Button>
        )}
        
        {/* 戻るボタンがない場合のスペーサー */}
        {currentStep === 'ANALYSIS' && !onBackToPrediction && <div></div>}

        {/* 選択画面とポートフォリオ画面では次へボタンを非表示にする */}
        {currentStep !== 'SELECTION' && currentStep !== 'PORTFOLIO' && (
          <Button
            size={isMobile ? "sm" : "default"}
            onClick={handleNext}
            disabled={!canProceed || currentIndex === steps.length - 1}
            className={`
              gap-0.5 sm:gap-1 transition-all duration-300 text-xs sm:text-sm py-1 sm:py-2 px-2 sm:px-3
              ${!canProceed || currentIndex === steps.length - 1 ? 'opacity-50' : 
              'bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary'}
            `}
          >
            次へ
            <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
        )}
      </div>
    </div>
  );
} 