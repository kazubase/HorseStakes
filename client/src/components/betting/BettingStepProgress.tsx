import { useAtom } from 'jotai';
import { currentStepAtom, canProceedAtom } from '@/stores/bettingStrategy';
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft } from "lucide-react";

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
    <div className="w-full">
      {/* ステップインジケーター */}
      <div className="relative">
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-border -translate-y-1/2" />
        <div className="relative flex justify-between">
          {steps.map((step, index) => {
            const isActive = index === currentIndex;
            const isCompleted = index < currentIndex;
            
            return (
              <div key={step.id} className="flex flex-col items-center">
                {/* ステップの丸印 */}
                <div
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center relative z-10
                    ${isActive ? 'bg-primary text-primary-foreground' : 
                      isCompleted ? 'bg-primary/80 text-primary-foreground' : 
                      'bg-muted text-muted-foreground'}
                  `}
                >
                  {index + 1}
                </div>
                
                {/* ステップラベル */}
                <div className="mt-2 text-center">
                  <div className={`font-medium ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                    {step.label}
                  </div>
                  <div className="text-xs text-muted-foreground max-w-[120px] text-center">
                    {step.description}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ナビゲーションボタン */}
      <div className="flex justify-between mt-6">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentIndex === 0}
          className="gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          戻る
        </Button>

        <Button
          onClick={handleNext}
          disabled={!canProceed || currentIndex === steps.length - 1}
          className="gap-2"
        >
          次へ
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
} 