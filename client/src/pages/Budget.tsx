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
        <h1 className="text-2xl font-bold">投資設定</h1>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardContent className="p-6">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  購入予算 (円)
                </label>
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
                  className="text-lg"
                />
                <p className="text-sm text-muted-foreground mt-2">
                  ※ 予算に応じて最適な馬券購入プランを提案します
                </p>
              </div>

              <div className="pt-4 border-t">
                <div className="flex items-center gap-2 mb-2">
                  <label className="text-sm font-medium">
                    リスクリワード
                  </label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>リスクに対してどの程度のリターンを求めるかを設定します。</p>
                        <p>例：5.0は「リスクの5倍のリターン」を意味します。</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div 
                  className="touch-none" 
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
                      [&_[role=slider]]:relative 
                      [&_[role=slider]]:after:absolute 
                      [&_[role=slider]]:after:content-[''] 
                      [&_[role=slider]]:after:w-10 
                      [&_[role=slider]]:after:h-full 
                      [&_[role=slider]]:after:-left-3
                      [&_.track]:h-2 
                      [&_.track]:pointer-events-none"
                  />
                </div>
                <p className="text-sm text-muted-foreground text-right">
                  {riskRatio.toFixed(1)}
                </p>

                <div className="space-y-2 text-sm text-muted-foreground mt-4">
                  <p>※ 高いリスクリワードを設定すると</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>より大きな利益を狙えます</li>
                    <li>しかし的中率は低くなる傾向があります</li>
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
          >
            馬券購入戦略へ進む
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}
