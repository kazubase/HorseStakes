import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Horse } from "@db/schema";
import { useState, useEffect } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { AlertCircle, ArrowRight, Award, Plus, Minus } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { AnimatePresence, motion } from "framer-motion";

export default function WinProbability() {
  const { id } = useParams();
  const [probabilities, setProbabilities] = useState<{ [key: number]: number }>({});
  const [totalProbability, setTotalProbability] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const [inputValues, setInputValues] = useState<{ [key: number]: string }>({});

  const { data: horses } = useQuery<Horse[]>({
    queryKey: [`/api/horses/${id}`],
    enabled: !!id,
  });

  // 馬番でソートした馬リストを作成
  const sortedHorses = [...(horses || [])].sort((a, b) => a.number - b.number);

  useEffect(() => {
    if (horses) {
      const initial = horses.reduce((acc, horse) => {
        acc[horse.id] = 0;
        return acc;
      }, {} as { [key: number]: number });
      setProbabilities(initial);

      const initialInputs = horses.reduce((acc, horse) => {
        acc[horse.id] = "0";
        return acc;
      }, {} as { [key: number]: string });
      setInputValues(initialInputs);
    }
  }, [horses]);

  const handleProbabilityChange = (horseId: number, newValue: number) => {
    const newProbabilities = { ...probabilities };
    newProbabilities[horseId] = newValue;
    setProbabilities(newProbabilities);
    setTotalProbability(
      Object.values(newProbabilities).reduce((sum, value) => sum + value, 0)
    );
    
    // スライダーで値を変更した場合は入力値も更新
    setInputValues(prev => ({
      ...prev,
      [horseId]: newValue.toString()
    }));
  };

  const handleDirectInput = (horseId: number, value: string) => {
    // 入力値を保存
    setInputValues(prev => ({
      ...prev,
      [horseId]: value
    }));

    // 空の場合は確率を0に設定するが、入力フィールドは空のままにする
    if (value === "") {
      const newProbabilities = { ...probabilities };
      newProbabilities[horseId] = 0;
      setProbabilities(newProbabilities);
      setTotalProbability(
        Object.values(newProbabilities).reduce((sum, value) => sum + value, 0)
      );
      return;
    }

    // 全角数字を半角に変換
    const normalizedValue = value.replace(/[０-９．]/g, (s) => {
      return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
    });

    const numValue = parseFloat(normalizedValue);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
      handleProbabilityChange(horseId, numValue);
    }
  };

  const handleInputBlur = (horseId: number, value: string) => {
    // 空の場合は0として扱う
    if (value === "") {
      handleProbabilityChange(horseId, 0);
      setInputValues(prev => ({
        ...prev,
        [horseId]: "0"
      }));
      return;
    }

    // 全角数字を半角に変換
    const normalizedValue = value.replace(/[０-９．]/g, (s) => {
      return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
    });

    const numValue = parseFloat(normalizedValue);
    if (isNaN(numValue)) {
      handleProbabilityChange(horseId, 0);
      setInputValues(prev => ({
        ...prev,
        [horseId]: "0"
      }));
      return;
    }
    if (numValue < 0) {
      handleProbabilityChange(horseId, 0);
      setInputValues(prev => ({
        ...prev,
        [horseId]: "0"
      }));
      return;
    }
    if (numValue > 100) {
      handleProbabilityChange(horseId, 100);
      setInputValues(prev => ({
        ...prev,
        [horseId]: "100"
      }));
      return;
    }
    handleProbabilityChange(horseId, numValue);
  };

  // タップで確率を増減する関数
  const handleProbabilityIncrement = (horseId: number, increment: number) => {
    const currentValue = probabilities[horseId] || 0;
    const newValue = Math.min(Math.max(currentValue + increment, 0), 100);
    handleProbabilityChange(horseId, newValue);
  };

  const normalizeAllProbabilities = () => {
    // 全ての確率が0の場合は均等に配分
    if (totalProbability === 0 && horses) {
      const equalProbability = 100 / horses.length;
      const equalDistribution = horses.reduce((acc, horse) => {
        acc[horse.id] = Number(equalProbability.toFixed(1));
        return acc;
      }, {} as { [key: number]: number });
      setProbabilities(equalDistribution);
      setTotalProbability(100);
      
      // 入力フィールドの値も更新
      const updatedInputValues = horses.reduce((acc, horse) => {
        acc[horse.id] = equalProbability.toFixed(1);
        return acc;
      }, {} as { [key: number]: string });
      setInputValues(updatedInputValues);
      
      return;
    }

    // 既存の確率比率を維持して合計を100%に調整
    const factor = 100 / totalProbability;
    const normalizedProbabilities = Object.fromEntries(
      Object.entries(probabilities).map(([id, prob]) => [
        id,
        Number((prob * factor).toFixed(1))
      ])
    );
    setProbabilities(normalizedProbabilities);
    setTotalProbability(100);
    
    // 入力フィールドの値も更新
    const updatedInputValues = Object.fromEntries(
      Object.entries(normalizedProbabilities).map(([id, prob]) => [
        id,
        prob.toString()
      ])
    );
    setInputValues(updatedInputValues);
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
      <div className="space-y-6 pb-20">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
            単勝予想確率入力
          </h1>
          <Button
            size="lg"
            disabled={Math.abs(totalProbability - 100) > 0.1}
            onClick={handleNext}
            className="relative overflow-hidden group sm:size-lg size-xs sm:px-4 px-2"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="relative flex items-center gap-1">
              <Award className="sm:h-5 sm:w-5 h-3.5 w-3.5" />
              <span className="hidden sm:inline">複勝予想確率入力</span>
              <span className="sm:hidden text-sm">複勝確率</span>
              <ArrowRight className="sm:h-4 sm:w-4 h-3 w-3 sm:ml-1" />
            </span>
          </Button>
        </div>

        <div className="sticky top-4 z-50 h-[72px]">
          <AnimatePresence>
            {horses && Math.abs(totalProbability - 100) > 0.1 && (
              <motion.div 
                className="w-full"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <Alert variant="default" className="border border-emerald-500/20 bg-emerald-500/5 shadow-lg backdrop-blur-sm">
                  <AlertCircle className="h-4 w-4 text-emerald-400" />
                  <AlertDescription className="flex items-center justify-between text-emerald-100">
                    <span>
                      全ての確率の合計が100%になるように調整してください
                      <br />
                      <span className="text-sm text-emerald-400/80">
                        現在の合計: {totalProbability.toFixed(1)}%
                      </span>
                    </span>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={normalizeAllProbabilities}
                      className="border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-100 whitespace-nowrap"
                    >
                      一括調整
                    </Button>
                  </AlertDescription>
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <Card className="overflow-hidden bg-gradient-to-br from-background to-primary/5">
          <CardContent className="p-2 sm:p-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1 sm:gap-3">
              {sortedHorses.map((horse) => (
                <div key={horse.id} className="p-1.5 sm:p-2 border rounded-lg bg-background/50 hover:bg-background/80 transition-colors">
                  <div className="flex items-center gap-1 sm:gap-1.5 mb-1 sm:mb-1.5">
                    <div className={`
                      w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-lg font-bold shadow-sm text-xs
                      ${getFrameColor(horse.frame)}
                    `}>
                      {horse.number}
                    </div>
                    <div id={`horse-win-name-${horse.id}`} className="text-xs sm:text-sm font-medium break-words flex-1">
                      {horse.name}
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-1 mb-1">
                    <div className="flex items-center justify-between gap-0.5">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-5 w-5 sm:h-6 sm:w-6 rounded-full flex-shrink-0 p-0"
                        onClick={() => handleProbabilityIncrement(horse.id, -5)}
                      >
                        <Minus className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                      </Button>
                      
                      <div className="flex items-center flex-1 mx-0.5">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="1"
                          id={`horse-win-prob-${horse.id}`}
                          name={`horse-win-prob-${horse.id}`}
                          value={inputValues[horse.id] || ""}
                          onChange={(e) => handleDirectInput(horse.id, e.target.value)}
                          onBlur={(e) => handleInputBlur(horse.id, e.target.value)}
                          className={`w-full text-right text-base sm:text-lg font-bold px-1 [&::-webkit-inner-spin-button]:ml-0.5 h-8 ${
                            (probabilities[horse.id] || 0) >= 30 ? 'text-primary' : 
                            (probabilities[horse.id] || 0) >= 20 ? 'text-primary/80' : ''
                          }`}
                          aria-labelledby={`horse-win-name-${horse.id}`}
                        />
                        <span className="text-sm sm:text-base font-medium ml-0.5">%</span>
                      </div>
                      
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-5 w-5 sm:h-6 sm:w-6 rounded-full flex-shrink-0 p-0"
                        onClick={() => handleProbabilityIncrement(horse.id, 5)}
                      >
                        <Plus className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  <Slider
                    value={[probabilities[horse.id] || 0]}
                    onValueChange={([value]) => handleProbabilityChange(horse.id, value)}
                    max={100}
                    min={0}
                    step={1}
                    className="relative
                      [&_[role=slider]]:h-4.5 
                      [&_[role=slider]]:w-4.5 
                      [&_[role=slider]]:hover:h-5 
                      [&_[role=slider]]:hover:w-5 
                      [&_.track]:h-1.5
                      [&_.track]:bg-primary/20
                      [&_.range]:bg-primary/40"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

// 枠番の色を決定する関数を追加
function getFrameColor(frame: number) {
  const colors = {
    1: 'bg-white text-black border border-gray-200',
    2: 'bg-black text-white',
    3: 'bg-red-600 text-white',
    4: 'bg-blue-600 text-white',
    5: 'bg-yellow-400 text-black',
    6: 'bg-green-600 text-white',
    7: 'bg-orange-500 text-white',
    8: 'bg-pink-400 text-white'
  };
  return colors[frame as keyof typeof colors] || 'bg-gray-200';
}
