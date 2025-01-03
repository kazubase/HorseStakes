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

  const { data: horses } = useQuery<Horse[]>({
    queryKey: [`/api/horses/${id}`],
    enabled: !!id,
  });

  useEffect(() => {
    // 初期確率を均等に設定（複勝なので合計300%）
    if (horses) {
      const initialProb = 300 / horses.length;
      const initial = horses.reduce((acc, horse) => {
        acc[horse.id] = initialProb;
        return acc;
      }, {} as { [key: number]: number });
      setProbabilities(initial);
      setTotalProbability(300);
    }
  }, [horses]);

  const handleProbabilityChange = (horseId: number, newValue: number) => {
    const oldValue = probabilities[horseId] || 0;
    const difference = newValue - oldValue;
    
    // 他の馬の確率を調整
    const otherHorses = Object.keys(probabilities)
      .map(Number)
      .filter(id => id !== horseId);
    
    const adjustmentPerHorse = -difference / otherHorses.length;
    
    const newProbabilities = { ...probabilities };
    newProbabilities[horseId] = newValue;
    
    otherHorses.forEach(id => {
      newProbabilities[id] = Math.max(0, (probabilities[id] || 0) + adjustmentPerHorse);
    });
    
    setProbabilities(newProbabilities);
    setTotalProbability(
      Object.values(newProbabilities).reduce((sum, value) => sum + value, 0)
    );
  };

  if (!horses) return null;

  return (
    <MainLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">複勝予想確率入力</h1>

        {Math.abs(totalProbability - 300) > 0.1 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              全ての確率の合計が300%になるように調整してください（現在: {totalProbability.toFixed(1)}%）
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
                    max={300}
                    step={0.1}
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
            disabled={Math.abs(totalProbability - 300) > 0.1}
            onClick={() => {
            const params = new URLSearchParams(window.location.search);
            const winProbs = params.get('winProbs') || '{}';
            window.location.href = `/predict/budget/${id}?winProbs=${winProbs}&placeProbs=${encodeURIComponent(JSON.stringify(probabilities))}`;
          }}
          >
            予算・リスク設定へ進む
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}
