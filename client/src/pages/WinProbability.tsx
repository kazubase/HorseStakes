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

export default function WinProbability() {
  const { id } = useParams();
  const [probabilities, setProbabilities] = useState<{ [key: number]: number }>({});
  const [totalProbability, setTotalProbability] = useState(0);

  const { data: horses } = useQuery<Horse[]>({
    queryKey: [`/api/horses/${id}`],
    enabled: !!id,
  });

  useEffect(() => {
    if (horses) {
      const initial = horses.reduce((acc, horse) => {
        acc[horse.id] = 0;
        return acc;
      }, {} as { [key: number]: number });
      setProbabilities(initial);
    }
  }, [horses]);

  const handleProbabilityChange = (horseId: number, newValue: number) => {
    const newProbabilities = { ...probabilities };
    newProbabilities[horseId] = newValue;
    setProbabilities(newProbabilities);
    setTotalProbability(
      Object.values(newProbabilities).reduce((sum, value) => sum + value, 0)
    );
  };

  const normalizeAllProbabilities = () => {
    const factor = 100 / totalProbability;
    const normalizedProbabilities = Object.fromEntries(
      Object.entries(probabilities).map(([id, prob]) => [
        id,
        Number((prob * factor).toFixed(1))
      ])
    );
    setProbabilities(normalizedProbabilities);
    setTotalProbability(100);
  };

  const handleNext = () => {
    if (!horses || Math.abs(totalProbability - 100) > 0.1) {
      return;
    }

    const allProbabilities = horses.reduce((acc, horse) => {
      acc[horse.id] = probabilities[horse.id] || 0;
      return acc;
    }, {} as { [key: number]: number });

    const encodedWinProbs = encodeURIComponent(JSON.stringify(allProbabilities));
    window.location.href = `/predict/place/${id}?winProbs=${encodedWinProbs}`;
  };

  if (!horses) return null;

  return (
    <MainLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">単勝予想確率入力</h1>

        {Math.abs(totalProbability - 100) > 0.1 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>全ての確率の合計が100%になるように調整してください（現在: {totalProbability.toFixed(1)}%）</span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={normalizeAllProbabilities}
              >
                一括調整
              </Button>
            </AlertDescription>
          </Alert>
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
                    </span>
                  </div>
                  <Slider
                    value={[probabilities[horse.id] || 0]}
                    onValueChange={([value]) => handleProbabilityChange(horse.id, value)}
                    max={100}
                    step={5}
                    className="my-2"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button
            size="lg"
            disabled={Math.abs(totalProbability - 100) > 0.1}
            onClick={handleNext}
          >
            複勝予想へ進む
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}
