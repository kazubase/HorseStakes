import { useParams } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { AlertCircle, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function Budget() {
  const { id } = useParams();
  const [budget, setBudget] = useState<number>(1000);
  const [inputValue, setInputValue] = useState<string>("1000");
  const [riskRatio, setRiskRatio] = useState<number>(2);
  const [error, setError] = useState<string>("");

  const handleBudgetBlur = (value: string) => {
    const numValue = Number(value);
    if (isNaN(numValue)) {
      setError("有効な数値を入力してください");
      return;
    }
    if (numValue <= 0) {
      setError("予算は0より大きい値を入力してください");
      return;
    }
    setError("");
    setBudget(numValue);
    setInputValue(String(numValue));
  };

  const handleRiskRatioChange = (value: number[]) => {
    setRiskRatio(value[0]);
    setError("");
  };

  const handleSubmit = () => {
    if (budget <= 0) {
      setError("予算は0より大きい値を入力してください");
      return;
    }
    if (riskRatio < 2.0) {
      setError("リスクリワードは2.0以上に設定してください");
      return;
    }

    const currentParams = new URLSearchParams(window.location.search);
    const winProbs = currentParams.get('winProbs') || '{}';
    const placeProbs = currentParams.get('placeProbs') || '{}';

    window.location.href = `/races/${id}/betting-strategy?budget=${budget}&risk=${riskRatio}&winProbs=${winProbs}&placeProbs=${placeProbs}`;
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
          投資設定
        </h1>

        {error && (
          <Alert variant="destructive" className="bg-destructive/10 border-destructive/20">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card className="overflow-hidden bg-gradient-to-br from-background to-primary/5">
          <CardContent className="p-6 space-y-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">購入予算 (円)</label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      予算に応じて最適な馬券購入プランを提案します
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="relative">
                <Input
                  type="number"
                  value={inputValue}
                  onChange={(e) => {
                    setInputValue(e.target.value);
                    if (e.target.value === "") {
                      setBudget(0);
                    } else {
                      setBudget(Number(e.target.value));
                    }
                  }}
                  onBlur={(e) => handleBudgetBlur(e.target.value)}
                  min={0}
                  step={100}
                  className="text-lg bg-background/80 backdrop-blur-sm border-primary/10 focus:border-primary/30 transition-all"
                />
                <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-primary/10 via-background/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>

            <div className="pt-6 border-t border-primary/10">
              <div className="flex items-center gap-2 mb-4">
                <label className="text-sm font-medium">リスクリワード</label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="bg-slate-900/95 backdrop-blur-sm border border-slate-800">
                      <p>リスクに対してどの程度のリターンを求めるかを設定します。</p>
                      <p>例：5.0は「リスクの5倍のリターン」を意味します。</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div 
                className="touch-none relative bg-background/80 backdrop-blur-sm rounded-lg p-4 border border-primary/10" 
                onTouchMove={(e) => e.preventDefault()}
                onPointerMove={(e) => {
                  if (e.pointerType === 'mouse' && e.buttons === 0) {
                    e.preventDefault();
                  }
                }}
              >
                <Slider
                  value={[riskRatio]}
                  onValueChange={handleRiskRatioChange}
                  min={2.0}
                  max={20.0}
                  step={1.0}
                  className="my-4 
                    [&_[role=slider]]:h-5 
                    [&_[role=slider]]:w-5 
                    [&_[role=slider]]:hover:h-6 
                    [&_[role=slider]]:hover:w-6 
                    [&_[role=slider]]:transition-all 
                    [&_[role=slider]]:bg-primary
                    [&_[role=slider]]:border-2
                    [&_[role=slider]]:border-background
                    [&_[role=slider]]:shadow-lg
                    [&_.range]:bg-primary/50
                    [&_.track]:h-2 
                    [&_.track]:bg-primary/20
                    [&_.track]:pointer-events-none"
                />
                <p className="text-sm font-medium text-right text-primary">
                  ×{riskRatio.toFixed(1)}
                </p>

                <div className="space-y-2 text-sm text-muted-foreground mt-6">
                  <p className="font-medium">※ 高いリスクリワードを設定すると</p>
                  <ul className="list-disc list-inside space-y-1.5 ml-2">
                    <li className="text-emerald-500">より大きな利益を狙えます</li>
                    <li className="text-amber-500">しかし的中率は低くなる傾向があります</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button
            size="lg"
            onClick={handleSubmit}
            disabled={budget <= 0 || riskRatio < 1.0 || !!error}
            className="bg-primary hover:bg-primary/90 transition-colors shadow-lg hover:shadow-primary/20"
          >
            馬券購入戦略へ進む
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}
