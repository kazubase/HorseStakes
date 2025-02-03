import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Horse } from "@db/schema";
import { useState, useEffect } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function PlaceProbability() {
  const { id } = useParams();
  const [probabilities, setProbabilities] = useState<{ [key: number]: number }>({});
  const [totalProbability, setTotalProbability] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);

  const getRequiredTotalProbability = (horseCount: number) => {
    return horseCount >= 8 ? 300 : 200;
  };

  // URLから単勝確率を取得
  const winProbabilities = JSON.parse(
    decodeURIComponent(new URLSearchParams(window.location.search).get('winProbs') || '{}')
  );

  const { data: horses } = useQuery<Horse[]>({
    queryKey: [`/api/horses/${id}`],
    enabled: !!id,
  });

  useEffect(() => {
    if (horses && !isInitialized) {
      // 初期値を単勝確率に設定
      const initial = horses.reduce((acc, horse) => {
        acc[horse.id] = winProbabilities[horse.id] || 0;
        return acc;
      }, {} as { [key: number]: number });
      setProbabilities(initial);
      setTotalProbability(Object.values(initial).reduce((sum, value) => sum + value, 0));
      setIsInitialized(true);
    }
  }, [horses, isInitialized]);

  const handleProbabilityChange = (horseId: number, newValue: number) => {
    // 単勝確率より小さい値は設定できないようにする
    if (newValue < (winProbabilities[horseId] || 0)) {
      return;
    }

    const newProbabilities = { ...probabilities };
    newProbabilities[horseId] = newValue;
    setProbabilities(newProbabilities);
    setTotalProbability(
      Object.values(newProbabilities).reduce((sum, value) => sum + value, 0)
    );
  };

  const normalizeAllProbabilities = () => {
    const requiredTotal = getRequiredTotalProbability(horses?.length || 0);
    const factor = requiredTotal / totalProbability;
    const normalizedProbabilities = Object.fromEntries(
      Object.entries(probabilities).map(([id, prob]) => [
        id,
        Number((prob * factor).toFixed(1))
      ])
    );
    setProbabilities(normalizedProbabilities);
    setTotalProbability(requiredTotal);
  };

  const handleNext = () => {
    const requiredTotal = getRequiredTotalProbability(horses?.length || 0);
    if (!horses || Math.abs(totalProbability - requiredTotal) > 0.1) {
      return;
    }

    const allProbabilities = horses.reduce((acc, horse) => {
      acc[horse.id] = probabilities[horse.id] || 0;
      return acc;
    }, {} as { [key: number]: number });
    
    const params = new URLSearchParams(window.location.search);
    const winProbs = params.get('winProbs') || '{}';
    const encodedPlaceProbs = encodeURIComponent(JSON.stringify(allProbabilities));
    
    window.location.href = `/predict/budget/${id}?winProbs=${winProbs}&placeProbs=${encodedPlaceProbs}`;
  };

  if (!horses) return null;

  return (
    <MainLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">複勝予想確率入力</h1>

        {horses && Math.abs(totalProbability - getRequiredTotalProbability(horses.length)) > 0.1 && (
          <div className="sticky top-4 z-50">
            <Alert variant="default" className="border border-emerald-500/20 bg-emerald-500/5 shadow-lg">
              <AlertCircle className="h-4 w-4 text-emerald-400" />
              <AlertDescription className="flex items-center justify-between text-emerald-100">
                <span>
                  全ての確率の合計が{getRequiredTotalProbability(horses.length)}%になるように調整してください
                  <br />
                  （現在: {totalProbability.toFixed(1)}%）
                </span>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={normalizeAllProbabilities}
                  className="border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-100"
                >
                  一括調整
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        )}

        <Card>
          <CardContent className="p-6">
            <div className="space-y-6">
              {horses.map((horse, index) => (
                <div key={horse.id} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium">
                      {index + 1}. {horse.name}
                    </label>
                    <span className="text-sm text-muted-foreground">
                      {probabilities[horse.id]?.toFixed(1)}%
                      {probabilities[horse.id] < (winProbabilities[horse.id] || 0) && (
                        <span className="text-red-500 ml-2">
                          （単勝確率以上にしてください）
                        </span>
                      )}
                    </span>
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
                      value={[probabilities[horse.id] || 0]}
                      onValueChange={([value]) => handleProbabilityChange(horse.id, value)}
                      min={0}
                      max={100}
                      step={5}
                      className="my-2 
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
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button
            size="lg"
            disabled={Math.abs(totalProbability - getRequiredTotalProbability(horses?.length || 0)) > 0.1}
            onClick={handleNext}
          >
            予算・リスク設定へ進む
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}
