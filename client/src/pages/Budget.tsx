import { useParams } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Budget() {
  const { id } = useParams();
  const [budget, setBudget] = useState<number>(1000);
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

  const handleSubmit = () => {
    if (budget <= 0) {
      setError("予算は0より大きい値を入力してください");
      return;
    }

    // 現在のURLパラメータを保持
    const currentParams = new URLSearchParams(window.location.search);
    const winProbs = currentParams.get('winProbs') || '{}';
    const placeProbs = currentParams.get('placeProbs') || '{}';

    // 全てのパラメータを含めて次のページに遷移
    window.location.href = `/predict/risk-reward/${id}?budget=${budget}&winProbs=${winProbs}&placeProbs=${placeProbs}`;
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">予算設定</h1>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
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
              </div>

              <div className="text-sm text-muted-foreground">
                <p>※ 予算に応じて最適な馬券購入プランを提案します</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button
            size="lg"
            onClick={handleSubmit}
            disabled={budget <= 0 || !!error}
          >
            リスク設定へ進む
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}
