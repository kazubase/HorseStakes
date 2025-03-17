import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Horse } from "@db/schema";
import { useState, useEffect } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { AlertCircle, ArrowRight, Award, Grid3X3, List, Wallet, BarChart4, Plus, Minus } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { AnimatePresence, motion } from "framer-motion";

export default function PlaceProbability() {
  const { id } = useParams();
  const [probabilities, setProbabilities] = useState<{ [key: number]: number }>({});
  const [totalProbability, setTotalProbability] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "grid">(() => {
    // URLから表示モードを取得（単勝確率画面の表示モードを引き継ぐ）
    const viewModeParam = new URLSearchParams(window.location.search).get('viewMode');
    return viewModeParam === "grid" ? "grid" : "list";
  });
  const [inputValues, setInputValues] = useState<{ [key: number]: string }>({});

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

  // 馬番でソートした馬リストを作成
  const sortedHorses = [...(horses || [])].sort((a, b) => a.number - b.number);

  useEffect(() => {
    if (horses && !isInitialized) {
      // 初期値を単勝確率に設定
      const initial = horses.reduce((acc, horse) => {
        acc[horse.id] = winProbabilities[horse.id] || 0;
        return acc;
      }, {} as { [key: number]: number });
      setProbabilities(initial);
      setTotalProbability(Object.values(initial).reduce((sum, value) => sum + value, 0));
      
      // 入力値の初期化
      const initialInputs = horses.reduce((acc, horse) => {
        acc[horse.id] = (winProbabilities[horse.id] || 0).toString();
        return acc;
      }, {} as { [key: number]: string });
      setInputValues(initialInputs);
      
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

    // 空の場合は確率を単勝確率に設定するが、入力フィールドは空のままにする
    if (value === "") {
      const winProb = winProbabilities[horseId] || 0;
      const newProbabilities = { ...probabilities };
      newProbabilities[horseId] = winProb;
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
      // 単勝確率より小さい値は設定できないようにする
      if (numValue < (winProbabilities[horseId] || 0)) {
        return;
      }
      handleProbabilityChange(horseId, numValue);
    }
  };

  const handleInputBlur = (horseId: number, value: string) => {
    const winProb = winProbabilities[horseId] || 0;
    
    // 空の場合は単勝確率として扱う
    if (value === "") {
      handleProbabilityChange(horseId, winProb);
      setInputValues(prev => ({
        ...prev,
        [horseId]: winProb.toString()
      }));
      return;
    }

    // 全角数字を半角に変換
    const normalizedValue = value.replace(/[０-９．]/g, (s) => {
      return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
    });

    const numValue = parseFloat(normalizedValue);
    if (isNaN(numValue)) {
      handleProbabilityChange(horseId, winProb);
      setInputValues(prev => ({
        ...prev,
        [horseId]: winProb.toString()
      }));
      return;
    }
    if (numValue < winProb) {
      handleProbabilityChange(horseId, winProb);
      setInputValues(prev => ({
        ...prev,
        [horseId]: winProb.toString()
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
    const winProb = winProbabilities[horseId] || 0;
    // 単勝確率より小さくならないように制限
    const newValue = Math.min(Math.max(currentValue + increment, winProb), 100);
    handleProbabilityChange(horseId, newValue);
  };

  const normalizeAllProbabilities = () => {
    const requiredTotal = getRequiredTotalProbability(horses?.length || 0);
    const factor = requiredTotal / totalProbability;
    const normalizedProbabilities = Object.fromEntries(
      Object.entries(probabilities).map(([id, prob]) => {
        // 100%を超えないように制限
        const normalizedValue = Math.min(Number((prob * factor).toFixed(1)), 100);
        return [id, normalizedValue];
      })
    );
    
    // 合計が必要な確率に達していない場合は再調整
    const newTotal = Object.values(normalizedProbabilities).reduce((sum, value) => sum + value, 0);
    if (Math.abs(newTotal - requiredTotal) > 0.1) {
      // 100%未満の馬の確率を調整
      const adjustableHorses = Object.entries(normalizedProbabilities)
        .filter(([_, prob]) => prob < 100)
        .map(([id]) => id);
      
      if (adjustableHorses.length > 0) {
        const deficit = requiredTotal - newTotal;
        const adjustmentPerHorse = deficit / adjustableHorses.length;
        
        adjustableHorses.forEach(id => {
          normalizedProbabilities[id] = Math.min(
            normalizedProbabilities[id] + adjustmentPerHorse,
            100
          );
        });
      }
    }
    
    setProbabilities(normalizedProbabilities);
    setTotalProbability(
      Object.values(normalizedProbabilities).reduce((sum, value) => sum + value, 0)
    );
    
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
    
    window.location.href = `/predict/budget/${id}?winProbs=${winProbs}&placeProbs=${encodedPlaceProbs}&viewMode=${viewMode}`;
  };

  const handleViewModeChange = (newMode: "list" | "grid") => {
    setViewMode(newMode);
  };

  if (!horses) return null;

  return (
    <MainLayout>
      <div className="space-y-6 pb-20">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
            複勝予想確率入力
          </h1>
          <Button
            size="lg"
            disabled={Math.abs(totalProbability - getRequiredTotalProbability(horses?.length || 0)) > 0.1}
            onClick={handleNext}
            className="relative overflow-hidden group sm:size-lg size-xs sm:px-4 px-2"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="relative flex items-center gap-1">
              <Wallet className="sm:h-5 sm:w-5 h-3.5 w-3.5" />
              <span className="hidden sm:inline">予算・リスク設定</span>
              <span className="sm:hidden text-sm">予算設定</span>
              <ArrowRight className="sm:h-4 sm:w-4 h-3 w-3 sm:ml-1" />
            </span>
          </Button>
        </div>

        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleViewModeChange(viewMode === "list" ? "grid" : "list")}
            className="flex items-center gap-1"
          >
            {viewMode === "list" ? (
              <>
                <Grid3X3 className="h-4 w-4" />
                <span>グリッド表示</span>
              </>
            ) : (
              <>
                <List className="h-4 w-4" />
                <span>リスト表示</span>
              </>
            )}
          </Button>
        </div>

        <div className="sticky top-4 z-50 h-[72px]">
          <AnimatePresence>
            {horses && Math.abs(totalProbability - getRequiredTotalProbability(horses.length)) > 0.1 && (
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
                      全ての確率の合計が{getRequiredTotalProbability(horses.length)}%になるように調整してください
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
          <CardContent className="p-6">
            {viewMode === "list" ? (
              <div className="space-y-6">
                {sortedHorses.map((horse) => (
                  <div key={horse.id} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className={`
                          w-8 h-8 flex items-center justify-center rounded-lg font-bold shadow-sm
                          ${getFrameColor(horse.frame)}
                        `}>
                          {horse.number}
                        </div>
                        <label id={`horse-place-name-${horse.id}`} htmlFor={`horse-place-prob-${horse.id}`} className="text-sm font-medium">
                          {horse.name}
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 rounded-full"
                          onClick={() => handleProbabilityIncrement(horse.id, -5)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <div className="relative">
                          <Input
                            type="number"
                            min={winProbabilities[horse.id] || 0}
                            max="100"
                            step="1"
                            id={`horse-place-prob-${horse.id}`}
                            name={`horse-place-prob-${horse.id}`}
                            value={inputValues[horse.id] || ""}
                            onChange={(e) => handleDirectInput(horse.id, e.target.value)}
                            onBlur={(e) => handleInputBlur(horse.id, e.target.value)}
                            className="w-20 text-right text-base font-bold px-2 [&::-webkit-inner-spin-button]:ml-2"
                            aria-labelledby={`horse-place-name-${horse.id}`}
                          />
                          <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-primary/10 via-background/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 rounded-full"
                          onClick={() => handleProbabilityIncrement(horse.id, 5)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <span className="text-sm font-medium">%</span>
                      </div>
                    </div>
                    <div 
                      className="touch-none relative group" 
                      onTouchMove={(e) => {
                        // スライダー操作中のみイベントを防止
                        if (e.target && (e.target as HTMLElement).getAttribute('role') === 'slider') {
                          e.preventDefault();
                        }
                      }}
                      onPointerMove={(e) => {
                        if (e.pointerType === 'mouse' && e.buttons === 0) {
                          e.preventDefault();
                        }
                      }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-background/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <Slider
                        value={[probabilities[horse.id] || 0]}
                        onValueChange={([value]) => handleProbabilityChange(horse.id, value)}
                        max={100}
                        min={0}
                        step={1}
                        className="my-2 relative
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
                          [&_.track]:pointer-events-none
                          [&_.track]:bg-primary/20
                          [&_.range]:bg-primary/40"
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {sortedHorses.map((horse) => (
                  <div key={horse.id} className="p-3 border rounded-lg bg-background/50 hover:bg-background/80 transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`
                        w-7 h-7 flex items-center justify-center rounded-lg font-bold shadow-sm text-xs
                        ${getFrameColor(horse.frame)}
                      `}>
                        {horse.number}
                      </div>
                      <div id={`horse-place-name-grid-${horse.id}`} className="text-sm font-medium break-words flex-1">
                        {horse.name}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 mb-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-6 w-6 rounded-full flex-shrink-0"
                        onClick={() => handleProbabilityIncrement(horse.id, -5)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <div className="relative flex-1 min-w-0">
                        <Input
                          type="number"
                          min={winProbabilities[horse.id] || 0}
                          max="100"
                          step="1"
                          id={`horse-place-prob-grid-${horse.id}`}
                          name={`horse-place-prob-grid-${horse.id}`}
                          value={inputValues[horse.id] || ""}
                          onChange={(e) => handleDirectInput(horse.id, e.target.value)}
                          onBlur={(e) => handleInputBlur(horse.id, e.target.value)}
                          className="w-full text-right text-sm font-bold px-1 [&::-webkit-inner-spin-button]:ml-1"
                          aria-labelledby={`horse-place-name-grid-${horse.id}`}
                        />
                        <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-primary/10 via-background/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-6 w-6 rounded-full flex-shrink-0"
                        onClick={() => handleProbabilityIncrement(horse.id, 5)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <span className="text-xs font-medium flex-shrink-0">%</span>
                    </div>
                    <Slider
                      value={[probabilities[horse.id] || 0]}
                      onValueChange={([value]) => handleProbabilityChange(horse.id, value)}
                      max={100}
                      min={0}
                      step={1}
                      className="relative
                        [&_[role=slider]]:h-4 
                        [&_[role=slider]]:w-4 
                        [&_[role=slider]]:hover:h-5 
                        [&_[role=slider]]:hover:w-5 
                        [&_.track]:h-1.5
                        [&_.track]:bg-primary/20
                        [&_.range]:bg-primary/40"
                    />
                  </div>
                ))}
              </div>
            )}
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