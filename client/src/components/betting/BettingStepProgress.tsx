import { useAtom } from 'jotai';
import { currentStepAtom, canProceedAtom } from '@/stores/bettingStrategy';
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { format } from 'date-fns';

export function BettingStepProgress() {
  const [currentStep, setCurrentStep] = useAtom(currentStepAtom);
  const [canProceed] = useAtom(canProceedAtom);

  const steps = [
    { id: 'ANALYSIS', label: '分析', description: '候補馬券と期待値分析' },
    { id: 'SELECTION', label: '選択', description: '馬券の選択' },
    { id: 'PORTFOLIO', label: 'ポートフォリオ', description: '資金配分最適化' }
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
    <div className="w-full space-y-8">
      {/* ステップインジケーター */}
      <div className="relative">
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-border/50 via-border to-border/50 -translate-y-1/2" />
        <div className="relative flex justify-between">
          {steps.map((step, index) => {
            const isActive = index === currentIndex;
            const isCompleted = index < currentIndex;
            
            return (
              <div key={step.id} className="flex flex-col items-center">
                {/* ステップの丸印 */}
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center relative z-10
                    transition-all duration-300 ease-out
                    ${isActive ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground scale-110 shadow-lg shadow-primary/20' : 
                      isCompleted ? 'bg-gradient-to-br from-primary/80 to-primary/60 text-primary-foreground' : 
                      'bg-gradient-to-br from-muted/80 to-muted text-muted-foreground'}
                  `}
                >
                  <span className="font-medium">{index + 1}</span>
                  {isActive && (
                    <div className="absolute inset-0 rounded-full animate-ping bg-primary/20" />
                  )}
                </div>
                
                {/* ステップラベル */}
                <div className="mt-3 text-center">
                  <div className={`
                    font-medium transition-colors duration-300
                    ${isActive ? 'text-primary' : isCompleted ? 'text-foreground/80' : 'text-muted-foreground'}
                  `}>
                    {step.label}
                  </div>
                  <div className={`
                    text-xs transition-colors duration-300 max-w-[120px] text-center
                    ${isActive ? 'text-foreground/70' : 'text-muted-foreground'}
                  `}>
                    {step.description}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ナビゲーションボタン */}
      <div className="flex justify-between mt-8">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentIndex === 0}
          className={`
            gap-2 transition-all duration-300
            ${currentIndex === 0 ? 'opacity-50' : 'hover:bg-primary/5'}
          `}
        >
          <ChevronLeft className="h-4 w-4" />
          戻る
        </Button>

        {/* 選択画面では次へボタンを非表示にする */}
        {currentStep !== 'SELECTION' && (
          <Button
            onClick={handleNext}
            disabled={!canProceed || currentIndex === steps.length - 1}
            className={`
              gap-2 transition-all duration-300
              ${!canProceed || currentIndex === steps.length - 1 ? 'opacity-50' : 
              'bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary'}
            `}
          >
            次へ
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
} 