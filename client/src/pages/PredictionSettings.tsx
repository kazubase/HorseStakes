import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Horse, Race, TanOddsHistory } from "@db/schema";
import { useState, useEffect, useCallback, useMemo } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { AlertCircle, ArrowRight, Award, Wallet, Plus, Minus, Activity, Info, BarChart4, Trophy, ChevronUp, ChevronDown, ChevronRight } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { AnimatePresence, motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useThemeStore } from "@/stores/themeStore";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

export default function PredictionSettings() {
  const { id } = useParams();
  const [_, setLocation] = useLocation();
  const { theme } = useThemeStore();
  const [activeTab, setActiveTab] = useState("win");
  
  // 単勝確率の状態
  const [winProbabilities, setWinProbabilities] = useState<{ [key: number]: number }>({});
  const [winTotalProbability, setWinTotalProbability] = useState(0);
  const [winInputValues, setWinInputValues] = useState<{ [key: number]: string }>({});
  
  // 複勝確率の状態
  const [placeProbabilities, setPlaceProbabilities] = useState<{ [key: number]: number }>({});
  const [placeTotalProbability, setPlaceTotalProbability] = useState(0);
  const [placeInputValues, setPlaceInputValues] = useState<{ [key: number]: string }>({});
  
  // 予算設定の状態
  const [budget, setBudget] = useState<number>(1000);
  const [budgetInputValue, setBudgetInputValue] = useState<string>("1000");
  const [riskRatio, setRiskRatio] = useState<number>(2);
  const [riskRatioInputValue, setRiskRatioInputValue] = useState<string>("2");
  const [error, setError] = useState<string>("");
  
  const [isInitialized, setIsInitialized] = useState(false);

  const { data: race, isLoading: raceLoading } = useQuery<Race>({
    queryKey: [`/api/races/${id}`],
    enabled: !!id,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const { data: horses = [], isLoading: horsesLoading } = useQuery<Horse[]>({
    queryKey: [`/api/horses/${id}`],
    enabled: !!id,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const { data: latestOdds = [], isLoading: oddsLoading } = useQuery<TanOddsHistory[]>({
    queryKey: [`/api/tan-odds-history/latest/${id}`],
    enabled: !!id,
    staleTime: 60 * 1000,
  });

  const { data: fukuOdds = [], isLoading: fukuOddsLoading } = useQuery<any[]>({
    queryKey: [`/api/fuku-odds/latest/${id}`],
    enabled: !!id,
    staleTime: 60 * 1000,
  });

  // 馬番でソートした馬リストを作成
  const sortedHorses = [...(horses || [])].sort((a, b) => a.number - b.number);

  const getRequiredTotalProbability = (horseCount: number) => {
    return horseCount >= 8 ? 300 : 200;
  };

  // URLパラメータから予想設定を読み込む
  useEffect(() => {
    if (horses && !isInitialized) {
      // URLパラメータを取得
      const searchParams = new URLSearchParams(window.location.search);
      const budgetParam = searchParams.get('budget');
      const riskParam = searchParams.get('risk');
      const winProbsParam = searchParams.get('winProbs');
      const placeProbsParam = searchParams.get('placeProbs');
      
      let hasRestoredData = false;
      
      // 予算設定の復元
      if (budgetParam) {
        const budgetValue = Number(budgetParam);
        if (!isNaN(budgetValue) && budgetValue > 0) {
          setBudget(budgetValue);
          setBudgetInputValue(budgetValue.toString());
          hasRestoredData = true;
        }
      }
      
      // リスク比率の復元
      if (riskParam) {
        const riskValue = Number(riskParam);
        if (!isNaN(riskValue) && riskValue >= 2.0) {
          setRiskRatio(riskValue);
          setRiskRatioInputValue(riskValue.toString());
          hasRestoredData = true;
        }
      }
      
      // 単勝確率の復元
      if (winProbsParam) {
        try {
          const parsedWinProbs = JSON.parse(decodeURIComponent(winProbsParam)) as Record<string, number>;
          
          if (Object.keys(parsedWinProbs).length > 0) {
            // 全ての馬に対して確率を設定（存在しない場合は0を設定）
            const updatedWinProbs = horses.reduce((acc, horse) => {
              acc[horse.id] = parsedWinProbs[horse.id] || 0;
              return acc;
            }, {} as { [key: number]: number });
            
            setWinProbabilities(updatedWinProbs);
            
            // 入力値も更新
            const updatedInputValues = horses.reduce((acc, horse) => {
              acc[horse.id] = String(updatedWinProbs[horse.id] || 0);
              return acc;
            }, {} as { [key: number]: string });
            setWinInputValues(updatedInputValues);
            
            // 合計確率を計算
            const totalWinProb = Object.values(updatedWinProbs).reduce((sum, value) => sum + value, 0);
            setWinTotalProbability(totalWinProb);
            
            hasRestoredData = true;
          }
        } catch (e) {
          // エラー処理（サイレント）
        }
      }
      
      // 複勝確率の復元
      if (placeProbsParam) {
        try {
          const parsedPlaceProbs = JSON.parse(decodeURIComponent(placeProbsParam)) as Record<string, number>;
          
          if (Object.keys(parsedPlaceProbs).length > 0) {
            // 全ての馬に対して確率を設定（存在しない場合は0を設定）
            const updatedPlaceProbs = horses.reduce((acc, horse) => {
              acc[horse.id] = parsedPlaceProbs[horse.id] || 0;
              return acc;
            }, {} as { [key: number]: number });
            
            setPlaceProbabilities(updatedPlaceProbs);
            
            // 入力値も更新
            const updatedInputValues = horses.reduce((acc, horse) => {
              acc[horse.id] = String(updatedPlaceProbs[horse.id] || 0);
              return acc;
            }, {} as { [key: number]: string });
            setPlaceInputValues(updatedInputValues);
            
            // 合計確率を計算
            const totalPlaceProb = Object.values(updatedPlaceProbs).reduce((sum, value) => sum + value, 0);
            setPlaceTotalProbability(totalPlaceProb);
            
            hasRestoredData = true;
          }
        } catch (e) {
          // エラー処理（サイレント）
        }
      }
      
      // URLパラメータから復元できなかった場合は通常の初期化を行う
      if (!hasRestoredData) {
        // 単勝確率の初期化
        const initialWin = horses.reduce((acc, horse) => {
          acc[horse.id] = 0;
          return acc;
        }, {} as { [key: number]: number });
        setWinProbabilities(initialWin);
        
        const initialWinInputs = horses.reduce((acc, horse) => {
          acc[horse.id] = "0";
          return acc;
        }, {} as { [key: number]: string });
        setWinInputValues(initialWinInputs);
        
        // 複勝確率の初期化
        const initialPlace = horses.reduce((acc, horse) => {
          acc[horse.id] = 0;
          return acc;
        }, {} as { [key: number]: number });
        setPlaceProbabilities(initialPlace);
        
        const initialPlaceInputs = horses.reduce((acc, horse) => {
          acc[horse.id] = "0";
          return acc;
        }, {} as { [key: number]: string });
        setPlaceInputValues(initialPlaceInputs);
      }
      
      // 初期化完了フラグを設定
      setIsInitialized(true);
    }
  }, [horses, isInitialized]);

  // 単勝確率の処理関数
  const handleWinProbabilityChange = (horseId: number, newValue: number) => {
    const newProbabilities = { ...winProbabilities };
    newProbabilities[horseId] = newValue;
    setWinProbabilities(newProbabilities);
    setWinTotalProbability(
      Object.values(newProbabilities).reduce((sum, value) => sum + value, 0)
    );
    
    setWinInputValues(prev => ({
      ...prev,
      [horseId]: newValue.toString()
    }));
  };

  const handleWinDirectInput = (horseId: number, value: string) => {
    setWinInputValues(prev => ({
      ...prev,
      [horseId]: value
    }));

    if (value === "") {
      return;
    }

    const normalizedValue = value.replace(/[０-９．]/g, (s) => {
      return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
    });

    const numValue = parseFloat(normalizedValue);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
      handleWinProbabilityChange(horseId, numValue);
    }
  };

  const handleWinInputBlur = (horseId: number, value: string) => {
    if (value === "") {
      handleWinProbabilityChange(horseId, 0);
      setWinInputValues(prev => ({
        ...prev,
        [horseId]: "0"
      }));
      return;
    }

    const normalizedValue = value.replace(/[０-９．]/g, (s) => {
      return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
    });

    const numValue = parseFloat(normalizedValue);
    if (isNaN(numValue)) {
      handleWinProbabilityChange(horseId, 0);
      setWinInputValues(prev => ({
        ...prev,
        [horseId]: "0"
      }));
      return;
    }
    if (numValue < 0) {
      handleWinProbabilityChange(horseId, 0);
      setWinInputValues(prev => ({
        ...prev,
        [horseId]: "0"
      }));
      return;
    }
    if (numValue > 100) {
      handleWinProbabilityChange(horseId, 100);
      setWinInputValues(prev => ({
        ...prev,
        [horseId]: "100"
      }));
      return;
    }
    handleWinProbabilityChange(horseId, numValue);
  };

  const handleWinProbabilityIncrement = (horseId: number, increment: number) => {
    const currentValue = winProbabilities[horseId] || 0;
    const newValue = Math.min(Math.max(currentValue + increment, 0), 100);
    handleWinProbabilityChange(horseId, newValue);
  };

  const normalizeWinProbabilities = () => {
    // 全ての確率が0の場合は均等に配分
    if (winTotalProbability === 0 && horses) {
      const equalProbability = 100 / horses.length;
      const equalDistribution = horses.reduce((acc, horse) => {
        acc[horse.id] = Number(equalProbability.toFixed(1));
        return acc;
      }, {} as { [key: number]: number });
      setWinProbabilities(equalDistribution);
      setWinTotalProbability(100);
      
      const updatedInputValues = horses.reduce((acc, horse) => {
        acc[horse.id] = equalProbability.toFixed(1);
        return acc;
      }, {} as { [key: number]: string });
      setWinInputValues(updatedInputValues);
      
      return;
    }

    // 既存の確率比率を維持して合計を100%に調整
    const factor = 100 / winTotalProbability;
    const normalizedProbabilities = Object.fromEntries(
      Object.entries(winProbabilities).map(([id, prob]) => [
        id,
        Number((prob * factor).toFixed(1))
      ])
    );
    setWinProbabilities(normalizedProbabilities);
    setWinTotalProbability(100);
    
    const updatedInputValues = Object.fromEntries(
      Object.entries(normalizedProbabilities).map(([id, prob]) => [
        id,
        prob.toString()
      ])
    );
    setWinInputValues(updatedInputValues);
  };

  // 複勝確率の処理関数
  const handlePlaceProbabilityChange = (horseId: number, newValue: number) => {
    // 単勝確率より小さい値は設定できないようにする
    if (newValue < (winProbabilities[horseId] || 0)) {
      return;
    }

    const newProbabilities = { ...placeProbabilities };
    newProbabilities[horseId] = newValue;
    setPlaceProbabilities(newProbabilities);
    setPlaceTotalProbability(
      Object.values(newProbabilities).reduce((sum, value) => sum + value, 0)
    );
    
    setPlaceInputValues(prev => ({
      ...prev,
      [horseId]: newValue.toString()
    }));
  };

  const handlePlaceDirectInput = (horseId: number, value: string) => {
    setPlaceInputValues(prev => ({
      ...prev,
      [horseId]: value
    }));

    if (value === "") {
      return;
    }

    const normalizedValue = value.replace(/[０-９．]/g, (s) => {
      return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
    });

    const numValue = parseFloat(normalizedValue);
    const winProb = winProbabilities[horseId] || 0;
    if (!isNaN(numValue) && numValue >= winProb && numValue <= 100) {
      handlePlaceProbabilityChange(horseId, numValue);
    }
  };

  const handlePlaceInputBlur = (horseId: number, value: string) => {
    const winProb = winProbabilities[horseId] || 0;
    
    if (value === "") {
      handlePlaceProbabilityChange(horseId, winProb);
      setPlaceInputValues(prev => ({
        ...prev,
        [horseId]: winProb.toString()
      }));
      return;
    }

    const normalizedValue = value.replace(/[０-９．]/g, (s) => {
      return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
    });

    const numValue = parseFloat(normalizedValue);
    if (isNaN(numValue)) {
      handlePlaceProbabilityChange(horseId, winProb);
      setPlaceInputValues(prev => ({
        ...prev,
        [horseId]: winProb.toString()
      }));
      return;
    }
    if (numValue < winProb) {
      handlePlaceProbabilityChange(horseId, winProb);
      setPlaceInputValues(prev => ({
        ...prev,
        [horseId]: winProb.toString()
      }));
      return;
    }
    if (numValue > 100) {
      handlePlaceProbabilityChange(horseId, 100);
      setPlaceInputValues(prev => ({
        ...prev,
        [horseId]: "100"
      }));
      return;
    }
    handlePlaceProbabilityChange(horseId, numValue);
  };

  const handlePlaceProbabilityIncrement = (horseId: number, increment: number) => {
    const currentValue = placeProbabilities[horseId] || 0;
    const winProb = winProbabilities[horseId] || 0;
    const newValue = Math.min(Math.max(currentValue + increment, winProb), 100);
    handlePlaceProbabilityChange(horseId, newValue);
  };

  const normalizePlaceProbabilities = () => {
    const requiredTotal = getRequiredTotalProbability(horses?.length || 0);
    const factor = requiredTotal / placeTotalProbability;
    const normalizedProbabilities = Object.fromEntries(
      Object.entries(placeProbabilities).map(([id, prob]) => {
        const normalizedValue = Math.min(Number((prob * factor).toFixed(1)), 100);
        return [id, normalizedValue];
      })
    );
    
    const newTotal = Object.values(normalizedProbabilities).reduce((sum, value) => sum + value, 0);
    if (Math.abs(newTotal - requiredTotal) > 0.1) {
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
    
    setPlaceProbabilities(normalizedProbabilities);
    setPlaceTotalProbability(
      Object.values(normalizedProbabilities).reduce((sum, value) => sum + value, 0)
    );
    
    const updatedInputValues = Object.fromEntries(
      Object.entries(normalizedProbabilities).map(([id, prob]) => [
        id,
        prob.toString()
      ])
    );
    setPlaceInputValues(updatedInputValues);
  };

  // 予算設定の処理関数
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
    setBudgetInputValue(String(numValue));
  };

  const handleRiskRatioChange = (value: number) => {
    setRiskRatio(value);
    setRiskRatioInputValue(value.toString());
    setError("");
  };

  const handleRiskRatioSliderChange = (value: number[]) => {
    handleRiskRatioChange(value[0]);
  };

  const handleBudgetChange = (newValue: number) => {
    setBudget(newValue);
    setBudgetInputValue(newValue.toString());
    setError("");
  };

  const handleBudgetIncrement = (increment: number) => {
    const currentValue = budget || 0;
    const newValue = Math.max(currentValue + increment, 100);
    handleBudgetChange(newValue);
  };

  const handleBudgetDirectInput = (value: string) => {
    setBudgetInputValue(value);

    if (value === "") {
      setBudget(0);
      return;
    }

    const normalizedValue = value.replace(/[０-９，]/g, (s) => {
      return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
    }).replace(/,/g, '');

    const numValue = parseInt(normalizedValue, 10);
    if (!isNaN(numValue) && numValue >= 0) {
      setBudget(numValue);
      setError("");
    }
  };

  const handleRiskRatioIncrement = (increment: number) => {
    const currentValue = riskRatio || 2;
    const newValue = Math.min(Math.max(currentValue + increment, 1), 20);
    handleRiskRatioChange(newValue);
  };

  const handleRiskRatioDirectInput = (value: string) => {
    setRiskRatioInputValue(value);

    if (value === "") {
      return;
    }

    const normalizedValue = value.replace(/[０-９．]/g, (s) => {
      return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
    });

    const numValue = parseFloat(normalizedValue);
    if (!isNaN(numValue) && numValue >= 1 && numValue <= 20) {
      handleRiskRatioChange(numValue);
    }
  };

  const handleRiskRatioBlur = (value: string) => {
    if (value === "") {
      handleRiskRatioChange(2);
      setRiskRatioInputValue("2");
      return;
    }

    const normalizedValue = value.replace(/[０-９．]/g, (s) => {
      return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
    });

    const numValue = parseFloat(normalizedValue);
    if (isNaN(numValue)) {
      handleRiskRatioChange(2);
      setRiskRatioInputValue("2");
      return;
    }
    if (numValue < 1) {
      handleRiskRatioChange(1);
      setRiskRatioInputValue("1");
      return;
    }
    if (numValue > 20) {
      handleRiskRatioChange(20);
      setRiskRatioInputValue("20");
      return;
    }
    handleRiskRatioChange(numValue);
  };

  // タブ切り替え時の処理
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    
    // 単勝から複勝に切り替える場合、複勝確率の最小値を単勝確率に設定
    if (value === "place" && winTotalProbability > 0) {
      const updatedPlaceProbabilities = { ...placeProbabilities };
      let updated = false;
      
      Object.keys(winProbabilities).forEach(id => {
        const horseId = Number(id);
        const winProb = winProbabilities[horseId] || 0;
        const placeProb = placeProbabilities[horseId] || 0;
        
        if (placeProb < winProb) {
          updatedPlaceProbabilities[horseId] = winProb;
          updated = true;
        }
      });
      
      if (updated) {
        setPlaceProbabilities(updatedPlaceProbabilities);
        setPlaceTotalProbability(
          Object.values(updatedPlaceProbabilities).reduce((sum, value) => sum + value, 0)
        );
        
        const updatedInputValues = Object.fromEntries(
          Object.entries(updatedPlaceProbabilities).map(([id, prob]) => [
            id,
            prob.toString()
          ])
        );
        setPlaceInputValues(updatedInputValues);
      }
    }
  };

  const handleSubmit = () => {
    if (Math.abs(winTotalProbability - 100) > 0.1) {
      setActiveTab("win");
      return;
    }
    
    const requiredPlaceTotal = getRequiredTotalProbability(horses?.length || 0);
    if (Math.abs(placeTotalProbability - requiredPlaceTotal) > 0.1) {
      setActiveTab("place");
      return;
    }
    
    if (budget <= 0) {
      setActiveTab("budget");
      setError("予算は0より大きい値を入力してください");
      return;
    }
    
    if (riskRatio < 2.0) {
      setActiveTab("budget");
      setError("リスクリワードは2.0以上に設定してください");
      return;
    }

    const encodedWinProbs = encodeURIComponent(JSON.stringify(winProbabilities));
    const encodedPlaceProbs = encodeURIComponent(JSON.stringify(placeProbabilities));
    
    window.location.href = `/races/${id}/betting-strategy?budget=${budget}&risk=${riskRatio}&winProbs=${encodedWinProbs}&placeProbs=${encodedPlaceProbs}`;
  };

  // 初期化後にUIを更新するためのeffect
  useEffect(() => {
    if (isInitialized && horses) {
      // 単勝確率の合計を再計算
      const totalWin = Object.values(winProbabilities).reduce((sum, value) => sum + value, 0);
      setWinTotalProbability(totalWin);
      
      // 複勝確率の合計を再計算
      const totalPlace = Object.values(placeProbabilities).reduce((sum, value) => sum + value, 0);
      setPlaceTotalProbability(totalPlace);
      
      // 単勝確率の入力値を更新
      const updatedWinInputs = {} as { [key: number]: string };
      horses.forEach(horse => {
        updatedWinInputs[horse.id] = (winProbabilities[horse.id] || 0).toString();
      });
      setWinInputValues(updatedWinInputs);
      
      // 複勝確率の入力値を更新
      const updatedPlaceInputs = {} as { [key: number]: string };
      horses.forEach(horse => {
        updatedPlaceInputs[horse.id] = (placeProbabilities[horse.id] || 0).toString();
      });
      setPlaceInputValues(updatedPlaceInputs);
    }
  }, [isInitialized, horses]);

  if (!horses) return null;

  return (
    <MainLayout>
      <div className="space-y-4 pb-16 md:pb-0">
        <Card className={
          theme === 'light'
            ? "overflow-hidden bg-gradient-to-br from-secondary/50 to-background relative z-10 border border-secondary/30 shadow-sm"
            : "overflow-hidden bg-gradient-to-br from-black/40 to-primary/5 relative z-10"
        }>
          <CardContent className="p-3 sm:p-5">
            <div className={
              theme === 'light'
                ? "absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-transparent opacity-50"
                : "absolute inset-0 bg-gradient-to-r from-primary/10 via-background/5 to-transparent opacity-30"
            } />
            <div className="flex justify-between items-start relative">
              <div>
                {raceLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ) : (
                  <>
                    <h1 className={
                      theme === 'light'
                        ? "text-base sm:text-2xl font-bold mb-2 tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent"
                        : "text-base sm:text-2xl font-bold mb-2 bg-gradient-to-br from-foreground to-foreground/80 bg-clip-text text-transparent"
                    }>
                      {race?.name}
                    </h1>
                    <p className="text-sm sm:text-base text-muted-foreground">
                      {format(new Date(race?.startTime!), 'yyyy年M月d日')} {race?.venue} {format(new Date(race?.startTime!), 'HH:mm')}発走
                    </p>
                  </>
                )}
              </div>
              {!raceLoading && (
                <div className="text-right flex flex-col items-end gap-2">
                  <Button 
                    onClick={handleSubmit}
                    size="sm"
                    className={`
                      relative overflow-hidden group text-xs sm:text-sm 
                      ${theme === 'light' 
                        ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
                        : 'bg-primary hover:bg-primary/90 text-black'
                      }
                      px-2 py-1 h-auto sm:h-9 sm:px-3 sm:py-2
                    `}
                    disabled={
                      Math.abs(winTotalProbability - 100) > 0.1 || 
                      Math.abs(placeTotalProbability - getRequiredTotalProbability(horses.length)) > 0.1 ||
                      budget <= 0 ||
                      riskRatio < 2.0
                    }
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span className="relative flex items-center gap-1">
                      <Activity className="sm:h-5 sm:w-5 h-3.5 w-3.5" />
                      <span className="hidden sm:inline">馬券分析画面へ</span>
                      <span className="sm:hidden text-sm">分析へ</span>
                      <ArrowRight className="sm:h-4 sm:w-4 h-3 w-3 sm:ml-1" />
                    </span>
                  </Button>
                  <p className="text-sm sm:text-base font-semibold">
                    {race?.status === 'done' ? '発走済' : null}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full" aria-label="予想設定タブ">
          <TabsList className={
            theme === 'light'
              ? "grid grid-cols-3 w-full bg-background backdrop-blur-sm border border-secondary/30 p-0 rounded-xl shadow-sm overflow-hidden"
              : "grid grid-cols-3 w-full bg-background/50 backdrop-blur-sm border border-primary/10 p-0 rounded-xl shadow-sm overflow-hidden"
          } aria-label="予想設定タブリスト">
            <TabsTrigger 
              value="win" 
              className={
                theme === 'light'
                  ? "flex items-center justify-center gap-2 py-2.5 h-10 rounded-none data-[state=active]:bg-secondary/30 data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:backdrop-blur-sm data-[state=active]:border-b-2 data-[state=active]:border-primary/70 data-[state=active]:border-t-0 data-[state=active]:border-x-0 transition-all duration-200"
                  : "flex items-center justify-center gap-2 py-2.5 h-10 rounded-none data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm data-[state=active]:backdrop-blur-sm data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:border-t-0 data-[state=active]:border-x-0 transition-all duration-200"
              }
              aria-controls="win-tab"
              aria-selected={activeTab === "win"}
            >
              <Trophy className="h-4 w-4 transition-transform data-[state=active]:scale-110" aria-hidden="true" />
              <span className="font-medium">単勝確率</span>
            </TabsTrigger>
            <TabsTrigger 
              value="place" 
              className={
                theme === 'light'
                  ? "flex items-center justify-center gap-2 py-2.5 h-10 rounded-none data-[state=active]:bg-secondary/30 data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:backdrop-blur-sm data-[state=active]:border-b-2 data-[state=active]:border-primary/70 data-[state=active]:border-t-0 data-[state=active]:border-x-0 transition-all duration-200"
                  : "flex items-center justify-center gap-2 py-2.5 h-10 rounded-none data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm data-[state=active]:backdrop-blur-sm data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:border-t-0 data-[state=active]:border-x-0 transition-all duration-200"
              }
              aria-controls="place-tab"
              aria-selected={activeTab === "place"}
            >
              <Award className="h-4 w-4 transition-transform data-[state=active]:scale-110" aria-hidden="true" />
              <span className="font-medium">複勝確率</span>
            </TabsTrigger>
            <TabsTrigger 
              value="budget" 
              className={
                theme === 'light'
                  ? "flex items-center justify-center gap-2 py-2.5 h-10 rounded-none data-[state=active]:bg-secondary/30 data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:backdrop-blur-sm data-[state=active]:border-b-2 data-[state=active]:border-primary/70 data-[state=active]:border-t-0 data-[state=active]:border-x-0 transition-all duration-200"
                  : "flex items-center justify-center gap-2 py-2.5 h-10 rounded-none data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm data-[state=active]:backdrop-blur-sm data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:border-t-0 data-[state=active]:border-x-0 transition-all duration-200"
              }
              aria-controls="budget-tab"
              aria-selected={activeTab === "budget"}
            >
              <Wallet className="h-4 w-4 transition-transform data-[state=active]:scale-110" aria-hidden="true" />
              <span className="font-medium">予算設定</span>
            </TabsTrigger>
          </TabsList>
          
          {/* 単勝確率タブ */}
          <TabsContent id="win-tab" value="win" className="space-y-4 mt-4" role="tabpanel" aria-labelledby="win-tab">
            <div className="sticky top-4 z-50 h-[72px]">
              <AnimatePresence>
                {horses && Math.abs(winTotalProbability - 100) > 0.1 && (
                  <motion.div 
                    className="w-full"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Alert variant="default" className={
                      theme === 'light'
                        ? "border border-emerald-500/40 bg-emerald-50 shadow-sm"
                        : "border border-emerald-500/30 bg-emerald-500/10 shadow-lg backdrop-blur-sm"
                    }>
                      <AlertCircle className={
                        theme === 'light' 
                          ? "h-4 w-4 text-emerald-600" 
                          : "h-4 w-4 text-emerald-500"
                      } />
                      <AlertDescription className={
                        theme === 'light'
                          ? "flex items-center justify-between text-emerald-800"
                          : "flex items-center justify-between text-emerald-50"
                      }>
                        <span>
                          全ての確率の合計が100%になるように調整してください
                          <br />
                          <span className={
                            theme === 'light'
                              ? "text-sm text-emerald-600"
                              : "text-sm text-emerald-400"
                          }>
                            現在の合計: {winTotalProbability.toFixed(1)}%
                          </span>
                        </span>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={normalizeWinProbabilities}
                          className={
                            theme === 'light'
                              ? "border-emerald-300 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 whitespace-nowrap"
                              : "border-emerald-500/30 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-50 whitespace-nowrap"
                          }
                          aria-label="確率を一括調整する"
                        >
                          一括調整
                        </Button>
                      </AlertDescription>
                    </Alert>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Card className={
              theme === 'light'
                ? "overflow-hidden bg-gradient-to-br from-background to-secondary/20 border border-secondary/30 shadow-sm"
                : "overflow-hidden bg-gradient-to-br from-background to-primary/5"
            }>
              <CardContent className="p-2 sm:p-4">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1 sm:gap-3">
                  {sortedHorses.map((horse) => (
                    <div key={horse.id} className={
                      theme === 'light'
                        ? "p-1.5 sm:p-2 border border-secondary/40 rounded-lg bg-background/90 hover:bg-background transition-colors shadow-sm"
                        : "p-1.5 sm:p-2 border rounded-lg bg-background/50 hover:bg-background/80 transition-colors"
                    }>
                      <div className="flex items-center gap-1 sm:gap-1.5 mb-1 sm:mb-1.5">
                        <div className={`
                          w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-lg font-bold shadow-sm text-xs
                          ${getFrameColor(horse.frame)}
                        `}
                         role="img"
                         aria-label={`馬番${horse.number}、枠番${horse.frame}`}
                        >
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
                            className={
                              theme === 'light'
                                ? "h-5 w-9 sm:h-6 sm:w-12 rounded-md flex-shrink-0 p-0 border-secondary/60"
                                : "h-5 w-9 sm:h-6 sm:w-12 rounded-md flex-shrink-0 p-0 border-primary/40"
                            }
                            onClick={() => handleWinProbabilityIncrement(horse.id, -5)}
                            aria-label={`${horse.name}の確率を5%減らす`}
                          >
                            <Minus className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-primary" />
                          </Button>
                          
                          <div className="flex items-center justify-center flex-1 mx-0.5">
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="1"
                              id={`horse-win-prob-${horse.id}`}
                              name={`horse-win-prob-${horse.id}`}
                              value={winInputValues[horse.id] || ""}
                              onChange={(e) => handleWinDirectInput(horse.id, e.target.value)}
                              onBlur={(e) => handleWinInputBlur(horse.id, e.target.value)}
                              className={`w-12 sm:w-20 text-right text-base sm:text-lg font-bold px-1 [&::-webkit-inner-spin-button]:ml-0.5 h-8 ${
                                (winProbabilities[horse.id] || 0) >= 30 ? 'text-primary font-extrabold' : 
                                (winProbabilities[horse.id] || 0) >= 20 ? 'text-primary/80 font-bold' : 'text-foreground'
                              }`}
                              aria-labelledby={`horse-win-name-${horse.id}`}
                              aria-label={`${horse.name}の単勝確率`}
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-valuenow={winProbabilities[horse.id] || 0}
                            />
                            <span className="text-sm sm:text-base font-medium ml-0.5">%</span>
                          </div>
                          
                          <Button
                            variant="outline"
                            className={
                              theme === 'light'
                                ? "h-5 w-9 sm:h-6 sm:w-12 rounded-md flex-shrink-0 p-0 border-secondary/60"
                                : "h-5 w-9 sm:h-6 sm:w-12 rounded-md flex-shrink-0 p-0 border-primary/40"
                            }
                            onClick={() => handleWinProbabilityIncrement(horse.id, 5)}
                            aria-label={`${horse.name}の確率を5%増やす`}
                          >
                            <Plus className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-primary" />
                          </Button>
                        </div>
                      </div>
                      
                      <Slider
                        value={[winProbabilities[horse.id] || 0]}
                        onValueChange={([value]) => handleWinProbabilityChange(horse.id, value)}
                        max={100}
                        min={0}
                        step={1}
                        aria-label={`${horse.name}の単勝確率: ${(winProbabilities[horse.id] || 0).toFixed(1)}%`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={winProbabilities[horse.id] || 0}
                        className="relative mt-1 mb-2"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* 複勝確率タブ */}
          <TabsContent id="place-tab" value="place" className="space-y-4 mt-4" role="tabpanel" aria-labelledby="place-tab">
            <div className="sticky top-4 z-50 h-[72px]">
              <AnimatePresence>
                {horses && Math.abs(placeTotalProbability - getRequiredTotalProbability(horses.length)) > 0.1 && (
                  <motion.div 
                    className="w-full"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Alert variant="default" className={
                      theme === 'light'
                        ? "border border-emerald-500/40 bg-emerald-50 shadow-sm"
                        : "border border-emerald-500/30 bg-emerald-500/10 shadow-lg backdrop-blur-sm"
                    }>
                      <AlertCircle className={
                        theme === 'light' 
                          ? "h-4 w-4 text-emerald-600" 
                          : "h-4 w-4 text-emerald-500"
                      } />
                      <AlertDescription className={
                        theme === 'light'
                          ? "flex items-center justify-between text-emerald-800"
                          : "flex items-center justify-between text-emerald-50"
                      }>
                        <span>
                          全ての確率の合計が{getRequiredTotalProbability(horses.length)}%になるように調整してください
                          <br />
                          <span className={
                            theme === 'light'
                              ? "text-sm text-emerald-600"
                              : "text-sm text-emerald-400"
                          }>
                            現在の合計: {placeTotalProbability.toFixed(1)}%
                          </span>
                        </span>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={normalizePlaceProbabilities}
                          className={
                            theme === 'light'
                              ? "border-emerald-300 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 whitespace-nowrap"
                              : "border-emerald-500/30 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-50 whitespace-nowrap"
                          }
                          aria-label="複勝確率を一括調整する"
                        >
                          一括調整
                        </Button>
                      </AlertDescription>
                    </Alert>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Card className={
              theme === 'light'
                ? "overflow-hidden bg-gradient-to-br from-background to-secondary/20 border border-secondary/30 shadow-sm"
                : "overflow-hidden bg-gradient-to-br from-background to-primary/5"
            }>
              <CardContent className="p-2 sm:p-4">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1 sm:gap-3">
                  {sortedHorses.map((horse) => (
                    <div key={horse.id} className={
                      theme === 'light'
                        ? "p-1.5 sm:p-2 border border-secondary/40 rounded-lg bg-background/90 hover:bg-background transition-colors shadow-sm"
                        : "p-1.5 sm:p-2 border rounded-lg bg-background/50 hover:bg-background/80 transition-colors"
                    }>
                      <div className="flex items-center gap-1 sm:gap-1.5 mb-1 sm:mb-1.5">
                        <div className={`
                          w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-lg font-bold shadow-sm text-xs
                          ${getFrameColor(horse.frame)}
                        `}
                         role="img"
                         aria-label={`馬番${horse.number}、枠番${horse.frame}`}
                        >
                          {horse.number}
                        </div>
                        <div id={`horse-place-name-${horse.id}`} className="text-xs sm:text-sm font-medium break-words flex-1">
                          {horse.name}
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-1 mb-1">
                        <div className="flex items-center justify-between gap-0.5">
                          <Button
                            variant="outline"
                            className={
                              theme === 'light'
                                ? "h-5 w-9 sm:h-6 sm:w-12 rounded-md flex-shrink-0 p-0 border-secondary/60"
                                : "h-5 w-9 sm:h-6 sm:w-12 rounded-md flex-shrink-0 p-0 border-primary/40"
                            }
                            onClick={() => handlePlaceProbabilityIncrement(horse.id, -5)}
                            aria-label={`${horse.name}の複勝確率を5%減らす`}
                          >
                            <Minus className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-primary" />
                          </Button>
                          
                          <div className="flex items-center justify-center flex-1 mx-0.5">
                            <Input
                              type="number"
                              min={winProbabilities[horse.id] || 0}
                              max="100"
                              step="1"
                              id={`horse-place-prob-${horse.id}`}
                              name={`horse-place-prob-${horse.id}`}
                              value={placeInputValues[horse.id] || "0"}
                              onChange={(e) => handlePlaceDirectInput(horse.id, e.target.value)}
                              onBlur={(e) => handlePlaceInputBlur(horse.id, e.target.value)}
                              className={`w-12 sm:w-20 text-right text-base sm:text-lg font-bold px-1 [&::-webkit-inner-spin-button]:ml-0.5 h-8 ${
                                (placeProbabilities[horse.id] || 0) >= 75 ? 'text-primary font-extrabold' : 
                                (placeProbabilities[horse.id] || 0) >= 50 ? 'text-primary/80 font-bold' : 'text-foreground'
                              }`}
                              aria-labelledby={`horse-place-name-${horse.id}`}
                              aria-label={`${horse.name}の複勝確率`}
                              aria-valuemin={winProbabilities[horse.id] || 0}
                              aria-valuemax={100}
                              aria-valuenow={placeProbabilities[horse.id] || 0}
                            />
                            <span className="text-sm sm:text-base font-medium ml-0.5">%</span>
                          </div>
                          
                          <Button
                            variant="outline"
                            className={
                              theme === 'light'
                                ? "h-5 w-9 sm:h-6 sm:w-12 rounded-md flex-shrink-0 p-0 border-secondary/60"
                                : "h-5 w-9 sm:h-6 sm:w-12 rounded-md flex-shrink-0 p-0 border-primary/40"
                            }
                            onClick={() => handlePlaceProbabilityIncrement(horse.id, 5)}
                            aria-label={`${horse.name}の複勝確率を5%増やす`}
                          >
                            <Plus className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-primary" />
                          </Button>
                        </div>
                      </div>
                      
                      <Slider
                        value={[placeProbabilities[horse.id] || 0]}
                        onValueChange={([value]) => handlePlaceProbabilityChange(horse.id, value)}
                        max={100}
                        min={0}
                        step={1}
                        aria-label={`${horse.name}の複勝確率: ${(placeProbabilities[horse.id] || 0).toFixed(1)}%`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={placeProbabilities[horse.id] || 0}
                        className="relative mt-1 mb-2"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* 予算設定タブ */}
          <TabsContent id="budget-tab" value="budget" className="space-y-4 mt-4" role="tabpanel" aria-labelledby="budget-tab">
            {error && (
              <Alert variant="destructive" className="bg-destructive/10 border-destructive/20">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Card className={
              theme === 'light'
                ? "overflow-hidden bg-gradient-to-br from-background to-secondary/20 border border-secondary/30 shadow-sm"
                : "overflow-hidden bg-gradient-to-br from-background to-primary/5"
            }>
              <CardContent className="p-6 space-y-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">購入予算 (円)</label>
                    <TooltipProvider delayDuration={0}>
                      <Tooltip>
                        <TooltipTrigger 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }} 
                          onPointerDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          className="cursor-pointer touch-none"
                          asChild
                        >
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-4 w-4 p-0 hover:bg-transparent"
                            style={{ touchAction: 'none' }}
                            aria-label="購入予算についての情報"
                          >
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent 
                          side="right" 
                          sideOffset={5}
                          className="max-w-[calc(100vw-12rem)] sm:max-w-sm break-words touch-none"
                        >
                          予算に応じて最適な馬券購入プランを提案します
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  
                  <div className="flex flex-col gap-1 mb-1">
                    <div className="flex items-center justify-between gap-0.5">
                      <Button
                        variant="outline"
                        className={
                          theme === 'light'
                            ? "h-6 w-12 rounded-md flex-shrink-0 p-0 border-secondary/60"
                            : "h-6 w-12 rounded-md flex-shrink-0 p-0 border-primary/40"
                        }
                        onClick={() => handleBudgetIncrement(-1000)}
                        aria-label="予算を1000円減らす"
                      >
                        <Minus className="h-3 w-3 text-primary" />
                      </Button>
                      
                      <div className="flex items-center justify-center flex-1 mx-0.5 relative">
                        <Input
                          type="number"
                          min="100"
                          step="100"
                          id="budget-input"
                          name="budget-input"
                          value={budgetInputValue}
                          onChange={(e) => handleBudgetDirectInput(e.target.value)}
                          onBlur={(e) => handleBudgetBlur(e.target.value)}
                          className={`w-32 text-right text-lg font-bold px-1 [&::-webkit-inner-spin-button]:ml-0.5 h-10 ${
                            budget >= 10000 ? 'text-primary font-extrabold' : 
                            budget >= 5000 ? 'text-primary/80 font-bold' : 'text-foreground'
                          }`}
                          aria-label="購入予算（円）"
                        />
                        <span className="text-base font-medium ml-0.5">円</span>
                      </div>
                      
                      <Button
                        variant="outline"
                        className={
                          theme === 'light'
                            ? "h-6 w-12 rounded-md flex-shrink-0 p-0 border-secondary/60"
                            : "h-6 w-12 rounded-md flex-shrink-0 p-0 border-primary/40"
                        }
                        onClick={() => handleBudgetIncrement(1000)}
                        aria-label="予算を1000円増やす"
                      >
                        <Plus className="h-3 w-3 text-primary" />
                      </Button>
                    </div>
                  </div>
                  
                  <Slider
                    value={[budget]}
                    onValueChange={([value]) => handleBudgetChange(value)}
                    max={50000}
                    min={100}
                    step={100}
                    aria-label={`購入予算: 現在${budget.toLocaleString()}円`}
                    aria-valuemin={100}
                    aria-valuemax={50000}
                    aria-valuenow={budget}
                    className="relative mt-3 mb-2"
                  />
                </div>

                <div className={
                  theme === 'light'
                    ? "pt-6 border-t border-secondary/30"
                    : "pt-6 border-t border-primary/10"
                }>
                  <div className="flex items-center gap-2 mb-4">
                    <label className="text-sm font-medium">リスクリワード</label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }} 
                          onPointerDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          className="cursor-pointer touch-none"
                          asChild
                        >
                          <Button variant="ghost" size="icon" className="h-4 w-4 p-0 hover:bg-transparent" aria-label="リスクリワードについての情報">
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent 
                          side="right" 
                          sideOffset={5}
                          className="max-w-[calc(100vw-12rem)] sm:max-w-sm break-words touch-none"
                        >
                          <p>購入予算に対する希望払戻金の倍率</p>
                          <p className="text-emerald-600 mt-1">高い値：より大きな利益を狙える</p>
                          <p className="text-amber-600 mt-1">低い値：的中率が高くなる傾向</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  
                  <div className="flex flex-col gap-1 mb-1">
                    <div className="flex items-center justify-between gap-0.5">
                      <Button
                        variant="outline"
                        className={
                          theme === 'light'
                            ? "h-6 w-12 rounded-md flex-shrink-0 p-0 border-secondary/60"
                            : "h-6 w-12 rounded-md flex-shrink-0 p-0 border-primary/40"
                        }
                        onClick={() => handleRiskRatioIncrement(-5)}
                        aria-label="リスクリワードを5減らす"
                      >
                        <Minus className="h-3 w-3 text-primary" />
                      </Button>
                      
                      <div className="flex items-center justify-center flex-1 mx-0.5 relative">
                        <Input
                          type="number"
                          min="1"
                          max="20"
                          step="1"
                          id="risk-ratio-input"
                          name="risk-ratio-input"
                          value={riskRatioInputValue}
                          onChange={(e) => handleRiskRatioDirectInput(e.target.value)}
                          onBlur={(e) => handleRiskRatioBlur(e.target.value)}
                          className={`w-24 text-right text-lg font-bold px-1 [&::-webkit-inner-spin-button]:ml-0.5 h-10 ${
                            riskRatio >= 10 ? 'text-primary font-extrabold' : 
                            riskRatio >= 5 ? 'text-primary/80 font-bold' : 'text-foreground'
                          }`}
                          aria-label="リスクリワード"
                        />
                        <span className="text-base font-medium ml-0.5">倍</span>
                      </div>
                      
                      <Button
                        variant="outline"
                        className={
                          theme === 'light'
                            ? "h-6 w-12 rounded-md flex-shrink-0 p-0 border-secondary/60"
                            : "h-6 w-12 rounded-md flex-shrink-0 p-0 border-primary/40"
                        }
                        onClick={() => handleRiskRatioIncrement(5)}
                        aria-label="リスクリワードを5増やす"
                      >
                        <Plus className="h-3 w-3 text-primary" />
                      </Button>
                    </div>
                  </div>
                  
                  <Slider
                    value={[riskRatio]}
                    onValueChange={handleRiskRatioSliderChange}
                    min={1.0}
                    max={20.0}
                    step={1.0}
                    aria-label={`リスクリワード設定: 現在${riskRatio}倍`}
                    aria-valuemin={1.0}
                    aria-valuemax={20.0}
                    aria-valuenow={riskRatio}
                    className="my-4"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}

// 枠番の色を決定する関数
function getFrameColor(frame: number) {
  const colors = {
    1: 'bg-white text-black border-2 border-gray-400',
    2: 'bg-black text-white border border-gray-400',
    3: 'bg-red-700 text-white',
    4: 'bg-blue-700 text-white',
    5: 'bg-yellow-500 text-black border border-black',
    6: 'bg-green-700 text-white',
    7: 'bg-orange-600 text-white',
    8: 'bg-pink-500 text-white'
  };
  return colors[frame as keyof typeof colors] || 'bg-gray-300 text-black';
} 