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
  const [riskRatio, setRiskRatio] = useState<number>(1);
  const [error, setError] = useState<string>("");

  const handleBudgetChange = (value: string) => {
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
    if (riskRatio < 1.0) {
      setError("リスクリワードは1.0以上に設定してください");
      return;
    }

    const currentParams = new URLSearchParams(window.location.search);
    const winProbs = currentParams.get('winProbs') || '{}';
    const placeProbs = currentParams.get('placeProbs') || '{}';

    window.location.href = `/strategy/${id}?budget=${budget}&risk=${riskRatio}&winProbs=${winProbs}&placeProbs=${placeProbs}`;
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
                  value={budget}
                  onChange={(e) => handleBudgetChange(e.target.value)}
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
                <Slider
                  value={[riskRatio]}
                  onValueChange={handleRiskRatioChange}
                  min={1.0}
                  max={50}
                  step={0.5}
                  className="my-4"
                />
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
