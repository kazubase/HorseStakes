import { useParams } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { AlertCircle, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function RiskReward() {
  const { id } = useParams();
  const params = new URLSearchParams(window.location.search);
  const budget = params.get("budget") || "0";
  const winProbs = params.get("winProbs") || "{}";
  const placeProbs = params.get("placeProbs") || "{}";
  const [riskRatio, setRiskRatio] = useState<number>(1);
  const [error, setError] = useState<string>("");

  const handleRiskRatioChange = (value: number[]) => {
    setRiskRatio(value[0]);
    setError("");
  };

  const handleSubmit = () => {
    if (riskRatio < 1.0) {
      setError("リスクリワードは1.0以上に設定してください");
      return;
    }
    // 全てのパラメータを含めて馬券購入戦略画面へ遷移
    window.location.href = `/strategy/${id}?budget=${budget}&risk=${riskRatio}&winProbs=${winProbs}&placeProbs=${placeProbs}`;
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">リスクリワード設定</h1>

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
              </div>

              <div className="space-y-2 text-sm text-muted-foreground">
                <p>※ 高いリスクリワードを設定すると</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>より大きな利益を狙えます</li>
                  <li>しかし的中率は低くなる傾向があります</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button
            size="lg"
            onClick={handleSubmit}
            disabled={riskRatio < 1.0 || !!error}
          >
            馬券購入戦略へ進む
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}
