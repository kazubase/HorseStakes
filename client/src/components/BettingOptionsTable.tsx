import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BetProposal, HorseData } from "@/lib/betEvaluation";
import { useMemo, useEffect, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BetCorrelation } from "@/lib/betConditionalProbability";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle } from "lucide-react";
import { calculateTotalProbability } from "@/lib/betInclusionExclusion";
import { useAtom } from 'jotai';
import { selectionStateAtom, horsesAtom, winProbsAtom, placeProbsAtom, bettingOptionsStatsAtom } from '@/stores/bettingStrategy';
import { Spinner } from "@/components/ui/spinner";
import { useThemeStore } from "@/stores/themeStore";

interface BettingOptionsTableProps {
  bettingOptions: BetProposal[];
  selectedBets?: BetProposal[];
  onBetSelect?: (bet: BetProposal) => void;
  onSelectAllByType?: (betType: string, select: boolean) => void;
  correlations?: BetCorrelation[];
  geminiRecommendations?: Array<{
    type: string;
    horses: string[];
    reason: string;
  }>;
  className?: string;
  showAnalysis?: boolean;
  horses?: HorseData[];
  columnsCount?: number;
}

export function BettingOptionsTable({ 
  bettingOptions,
  selectedBets = [],
  onBetSelect,
  onSelectAllByType,
  correlations = [],
  geminiRecommendations = [],
  className,
  showAnalysis = false,
  horses = [],
  columnsCount = 4
}: BettingOptionsTableProps) {
  // selectionStateAtomから利用可能な馬データを取得
  const [selectionState] = useAtom(selectionStateAtom);
  const [allHorses, setAllHorses] = useAtom(horsesAtom);
  const [winProbs] = useAtom(winProbsAtom);
  const [placeProbs] = useAtom(placeProbsAtom);
  const [isCalculating, setIsCalculating] = useState(true);
  const { theme } = useThemeStore();
  
  // 馬データを構築
  const horseData = useMemo(() => {
    let baseHorseData: HorseData[] = [];
    
    // 基本データの取得
    if (horses.length > 0) {
      baseHorseData = horses;
    } else if (selectionState.availableHorses.length > 0) {
      baseHorseData = selectionState.availableHorses;
    } else if (allHorses && allHorses.length > 0) {
      baseHorseData = allHorses.map(horse => ({
        number: horse.number,
        name: horse.name,
        winProb: winProbs[horse.number.toString()] || 0,
        placeProb: placeProbs[horse.number.toString()] || 0,
        odds: 1 / (winProbs[horse.number.toString()] || 0.01),
        frame: horse.frame || 0
      }));
    } else {
      // 馬データがない場合は空配列
      return [];
    }
    
    // 選択された馬券から確率情報を更新
    if (selectedBets.length > 0) {
      // 馬番から馬データへのマッピングを作成
      const horseMap = new Map<number, HorseData>();
      baseHorseData.forEach(horse => {
        horseMap.set(horse.number, { ...horse });
      });
      
      // 選択された馬券から確率情報を抽出
      selectedBets.forEach(bet => {
        // 単勝の場合
        if (bet.type === '単勝' && bet.horse1) {
          const horse = horseMap.get(bet.horse1);
          if (horse) {
            horse.winProb = bet.probability;
            // 複勝確率が設定されていなければ、単勝の3倍程度と仮定
            if (!horse.placeProb) {
              horse.placeProb = Math.min(0.95, bet.probability * 3);
            }
          }
        }
        
        // 複勝の場合
        if (bet.type === '複勝' && bet.horse1) {
          const horse = horseMap.get(bet.horse1);
          if (horse) {
            horse.placeProb = bet.probability;
            // 単勝確率が設定されていなければ、複勝の1/3程度と仮定
            if (!horse.winProb) {
              horse.winProb = bet.probability / 3;
            }
          }
        }
      });
      
      // 更新された馬データを返す
      return Array.from(horseMap.values());
    }
    
    return baseHorseData;
  }, [horses, selectionState.availableHorses, allHorses, winProbs, placeProbs, selectedBets]);

  // 構築した馬データをhorsesAtomに保存
  useEffect(() => {
    if (horseData.length > 0 && allHorses) {
      // 既存の馬データがある場合は、frameプロパティを保持しつつ更新
      let hasChanges = false;
      const updatedHorses = [...allHorses];
      
      // 馬データの更新（既存のHorse型を維持しながら必要な情報だけ更新）
      horseData.forEach(horse => {
        const existingHorseIndex = updatedHorses.findIndex(h => h.number === horse.number);
        if (existingHorseIndex >= 0) {
          // 枠番が変更された場合のみ更新
          if (horse.frame && horse.frame !== updatedHorses[existingHorseIndex].frame) {
            updatedHorses[existingHorseIndex] = {
              ...updatedHorses[existingHorseIndex],
              frame: horse.frame
            };
            hasChanges = true;
          }
        }
      });
      
      // 変更があった場合のみsetAllHorsesを呼び出す
      if (hasChanges) {
        setAllHorses(updatedHorses);
      }
    }
  }, [horseData, setAllHorses]);

  // 期待値を計算して統計情報を取得
  const optionsWithStats = useMemo(() => {
    // 計算開始時にローディング状態にする
    setIsCalculating(true);
    
    // bettingOptionsが空の場合は計算しない
    if (!bettingOptions || bettingOptions.length === 0) {
      return {
        options: [],
        stats: {
          ev: { mean: 0, std: 0 },
          odds: { mean: 0, std: 0 },
          probability: { mean: 0, std: 0 }
        }
      };
    }
    
    const options = bettingOptions.map(option => {
      const odds = option.expectedReturn / option.stake;
      const ev = odds * option.probability;
      return {
        ...option,
        odds,
        ev,
        id: `${option.type}-${option.horses.join('-')}`
      };
    });

    // 各指標の統計情報を計算
    const stats = {
      ev: calculateStats(options.map(o => o.ev)),
      odds: calculateStats(options.map(o => o.odds)),
      probability: calculateStats(options.map(o => o.probability))
    };
    
    // 計算完了時にローディング状態を解除
    setIsCalculating(false);

    return {
      options,
      stats
    };
  }, [bettingOptions]);

  // 統計情報をatomに保存
  const [, setBettingOptionsStats] = useAtom(bettingOptionsStatsAtom);
  
  useEffect(() => {
    setBettingOptionsStats({
      evStats: optionsWithStats.stats.ev,
      oddsStats: optionsWithStats.stats.odds,
      probabilityStats: optionsWithStats.stats.probability,
      options: optionsWithStats.options.map(o => ({
        id: o.id || `${o.type}-${o.horses.join('-')}`,
        ev: o.ev,
        odds: o.odds,
        probability: o.probability
      }))
    });
  }, [optionsWithStats, setBettingOptionsStats]);

  // 統計情報に基づいて色を決定する関数
  const getColorClass = (value: number, stats: { mean: number; std: number }) => {
    // 値の相対的な位置を計算（パーセンタイルのような考え方）
    const percentile = optionsWithStats.options
      .map(o => o.probability)
      .filter(v => v <= value)
      .length / optionsWithStats.options.length;
    
    if (theme === 'light') {
      if (percentile > 0.8) return 'text-green-600';
      if (percentile > 0.6) return 'text-green-700';
      if (percentile > 0.4) return 'text-amber-600';
      if (percentile > 0.2) return 'text-amber-700';
      return 'text-gray-500';
    } else {
      if (percentile > 0.8) return 'text-green-500';
      if (percentile > 0.6) return 'text-green-600';
      if (percentile > 0.4) return 'text-yellow-500';
      if (percentile > 0.2) return 'text-yellow-600';
      return 'text-muted-foreground';
    }
  };

  // オッズの色分けロジック
  const getOddsColorClass = (odds: number) => {
    // オッズ値に対するパーセンタイルを計算
    const percentile = optionsWithStats.options
      .map(o => o.odds)
      .filter(v => v <= odds)
      .length / optionsWithStats.options.length;
    
    if (theme === 'light') {
      if (percentile > 0.8) return 'text-orange-600';
      if (percentile > 0.6) return 'text-orange-700';
      if (percentile > 0.4) return 'text-amber-600';
      if (percentile > 0.2) return 'text-amber-700';
      return 'text-amber-700';
    } else {
      if (percentile > 0.8) return 'text-green-500';
      if (percentile > 0.6) return 'text-green-600';
      if (percentile > 0.4) return 'text-yellow-500';
      if (percentile > 0.2) return 'text-yellow-600';
      return 'text-yellow-600';
    }
  };

  // 期待値の色分けロジック
  const getEvColorClass = (ev: number) => {
    // 期待値に対するパーセンタイルを計算
    const percentile = optionsWithStats.options
      .map(o => o.ev)
      .filter(v => v <= ev)
      .length / optionsWithStats.options.length;
    
    if (theme === 'light') {
      if (percentile > 0.8) return 'text-indigo-600';
      if (percentile > 0.6) return 'text-indigo-700';
      if (percentile > 0.4) return 'text-blue-600';
      if (percentile > 0.2) return 'text-blue-700';
      return 'text-gray-500';
    } else {
      if (percentile > 0.8) return 'text-green-500';
      if (percentile > 0.6) return 'text-green-600';
      if (percentile > 0.4) return 'text-yellow-500';
      if (percentile > 0.2) return 'text-yellow-600';
      return 'text-muted-foreground';
    }
  };

  // EVに基づく背景色を決定する関数
  const getEvBackgroundClass = (ev: number, stats: { mean: number; std: number }) => {
    // 値の相対的な位置を計算（パーセンタイルのような考え方）
    const percentile = optionsWithStats.options
      .map(o => o.ev)
      .filter(v => v <= ev)
      .length / optionsWithStats.options.length;
    
    if (theme === 'light') {
      if (percentile > 0.75) return 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200';
      if (percentile > 0.5) return 'bg-lime-50 hover:bg-lime-100 border-lime-200';
      if (percentile > 0.25) return 'bg-amber-50 hover:bg-amber-100 border-amber-200';
      return 'bg-gray-50 hover:bg-gray-100 border-gray-200';
    } else {
      if (percentile > 0.75) return 'bg-green-500/15 hover:bg-green-500/25';
      if (percentile > 0.5) return 'bg-lime-600/15 hover:bg-lime-600/25';
      if (percentile > 0.25) return 'bg-yellow-500/10 hover:bg-yellow-500/20';
      return 'bg-yellow-500/5 hover:bg-yellow-500/15';
    }
  };

  // 券種でグループ化
  const groupedOptions = optionsWithStats.options.reduce((acc, option) => {
    if (!acc[option.type]) {
      acc[option.type] = [];
    }
    acc[option.type].push(option);
    return acc;
  }, {} as Record<string, typeof optionsWithStats.options>);

  // 券種の表示順序を定義
  const simpleTypes = ['単勝', '複勝', '枠連', 'ワイド', '馬連', '馬単'];
  const complexTypes = ['３連複', '３連単'];

  // 各グループ内で期待値順にソート
  Object.values(groupedOptions).forEach(group => {
    group.sort((a, b) => b.ev - a.ev);
  });

  // 馬番の表示方法を決定する関数
  const formatHorses = (horses: string[], betType: string) => {
    // 単勝と複勝は馬番のみ表示
    if (betType === '単勝' || betType === '複勝') {
      return horses[0].split(' ')[0]; 
    }
    // それ以外は従来通り
    return horses.join(betType.includes('単') ? '→' : '-');
  };

  // 選択された馬券かどうかを判定する関数を修正
  const isSelected = (option: BetProposal) => {
    const result = selectedBets.some(selected => {
      // 券種が一致すること（３連複/3連複のような表記揺れに対応）
      const normalizedType = (type: string) => type.replace('３', '3');
      const isSameType = normalizedType(selected.type) === normalizedType(option.type);
      
      // 馬番を正しく比較するための処理
      const isSameHorses = () => {
        // 馬番の文字列表現を比較（horseName があれば使用）
        if (selected.horseName && option.horseName) {
          return selected.horseName === option.horseName;
        }
        
        // 馬番の配列を比較
        if (selected.horses.length !== option.horses.length) {
          return false;
        }
        
        // 単勝・複勝の場合は単純比較
        if (option.type === '単勝' || option.type === '複勝') {
          const selectedHorse = selected.horses[0].split(' ')[0];
          const optionHorse = option.horses[0].split(' ')[0];
          return selectedHorse === optionHorse;
        }
        
        // 馬単と3連単は順序を考慮
        if (option.type.includes('単')) {
          return selected.horses.join(',') === option.horses.join(',');
        }
        
        // その他の馬券は順序を考慮しない（ソートして比較）
        const selectedHorsesSorted = [...selected.horses].sort();
        const optionHorsesSorted = [...option.horses].sort();
        return selectedHorsesSorted.join(',') === optionHorsesSorted.join(',');
      };
      
      return isSameType && isSameHorses();
    });

    return result;
  };

  // 特定の馬券に関連する条件付き確率を取得
  const getRelatedCorrelations = (bet: BetProposal) => {
    return correlations.filter(corr => 
      (corr.condition.type === bet.type && 
       corr.condition.horses === bet.horseName) ||
      (corr.target.type === bet.type && 
       corr.target.horses === bet.horseName)
    );
  };

  // 特定の馬券に関連する推奨組み合わせを取得
  const getRelatedRecommendations = (bet: BetProposal) => {
    return geminiRecommendations.filter(rec => 
      rec.type === bet.type && 
      rec.horses.includes(bet.horseName || '')
    );
  };

  // 条件付き確率の表示をより見やすく整理する関数
  const formatCorrelations = (bet: BetProposal, correlations: BetCorrelation[]) => {
    // 自身の馬券を除外し、重複を除去
    const uniqueCorrs = correlations
      .filter(corr => !(
        // 同じ券種かつ同じ馬番の組み合わせを除外
        corr.target.type === bet.type && 
        corr.target.horses === bet.horseName
      ))
      .reduce((acc, curr) => {
        const key = `${curr.target.type}-${curr.target.horses}`;
        if (!acc[key] || acc[key].probability < curr.probability) {
          acc[key] = curr;
        }
        return acc;
      }, {} as Record<string, BetCorrelation>);

    return Object.values(uniqueCorrs)
      .sort((a, b) => b.probability - a.probability);
  };

  // 馬券種別に応じたタイトル表示を生成する関数
  const getCorrelationTitle = (bet: BetProposal) => {
    switch (bet.type) {
      case '単勝':
      case '複勝':
        // 馬番のみを表示（全角スペースの前の部分を抽出）
        const horseNumber = bet.horses[0].split(' ')[0];
        return `${bet.type}${horseNumber}が的中した場合`;
      case '枠連':
      case 'ワイド':
      case '馬連':
        const horseDisplay = bet.horses.join('-');
        return `${bet.type}${horseDisplay}が的中した場合`;
      case '馬単':
        return `${bet.type}${bet.horses.join('→')}が的中した場合`;
      case '３連複':
        return `${bet.type}${bet.horses.join('-')}が的中した場合`;
      case '３連単':
        return `${bet.type}${bet.horses.join('→')}が的中した場合`;
      default:
        return `${bet.type}が的中した場合`;
    }
  };

  // 券種ごとの統計を計算する関数を修正
  const calculateTypeStats = (
    options: typeof optionsWithStats.options,
    selectedBets: BetProposal[],
    type: string
  ) => {
    const selectedOfType = selectedBets.filter(bet => bet.type === type);
    if (!selectedOfType.length) return null;

    // 包除原理を考慮する券種
    const useInclusionExclusion = ['複勝', 'ワイド'].includes(type);
    
    // 包除原理を考慮した合計確率を計算
    let totalProbability;
    
    if (useInclusionExclusion) {
      
      // 包除原理を使用して計算
      try {
        // 馬データが必要な形式になっているか確認
        const validHorseData = horseData && horseData.length > 0 && 
          horseData.every(h => 
            typeof h.number === 'number' && 
            typeof h.winProb === 'number' && 
            typeof h.placeProb === 'number'
          );
        
        if (!validHorseData) {
          console.error('馬データの形式が不正:', horseData);
          throw new Error('馬データの形式が不正です');
        }
        
        totalProbability = calculateTotalProbability(selectedOfType, horseData);
      } catch (error) {
        // エラー時は単純合計を使用
        totalProbability = selectedOfType.reduce((sum, bet) => sum + bet.probability, 0);
      }
    } else {
      // 単純な合計
      totalProbability = selectedOfType.reduce((sum, bet) => sum + bet.probability, 0);
    }
    
    // 的中確率で加重平均した期待値を計算
    const weightedAverageEv = selectedOfType.reduce(
      (sum, bet) => {
        const odds = bet.expectedReturn / bet.stake;
        const ev = odds * bet.probability;
        // 包除原理を考慮する場合は、各馬券の確率の比率で重み付け
        const weight = useInclusionExclusion 
          ? bet.probability / selectedOfType.reduce((s, b) => s + b.probability, 0)
          : bet.probability / totalProbability;
        return sum + (ev * weight);
      }, 
      0
    );

    return {
      totalProbability,
      averageEv: weightedAverageEv
    };
  };

  // columnsCountに基づいてグリッドクラスを決定
  const gridColumnsClass = useMemo(() => {
    switch (columnsCount) {
      case 2:
        return 'grid-cols-2 sm:grid-cols-2';
      case 3:
        return 'grid-cols-2 sm:grid-cols-2 md:grid-cols-4';
      case 4:
      default:
        return 'grid-cols-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4';
    }
  }, [columnsCount]);

  // ローディング表示
  if (isCalculating || !bettingOptions || bettingOptions.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center p-8 ${className || ''}`}>
        <Spinner className="w-6 h-6 mb-4" />
        <p className="text-sm text-muted-foreground">馬券候補を計算中...</p>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className || ''}`}>
      {/* 凡例を追加 */}
      <div className={
        theme === 'light'
          ? "bg-gray-100 p-2 rounded-lg text-xs text-gray-600"
          : "bg-secondary/30 p-2 rounded-lg text-xs text-muted-foreground"
      }>
        <div className="grid grid-cols-2 gap-2 mb-1">
          <div>買い目</div>
          <div className="text-right">オッズ</div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>的中率</div>
          <div className="text-right">期待値</div>
        </div>
      </div>

      <div className={`grid gap-2 ${gridColumnsClass}`}>
        {[...simpleTypes, ...complexTypes].map(betType => {
          const options = groupedOptions[betType];
          if (!options?.length) return null;

          // 券種ごとの選択状態を計算
          const typeStats = calculateTypeStats(optionsWithStats.options, selectedBets, betType);
          const selectedCount = selectedBets.filter(bet => bet.type === betType).length;
          const totalCount = options.length;
          const isAllSelected = selectedCount === totalCount && totalCount > 0;
          const isPartiallySelected = selectedCount > 0 && selectedCount < totalCount;

          return (
            <Card key={betType} className={
              theme === 'light'
                ? "bg-white border border-gray-200 shadow-sm"
                : "bg-background/50 backdrop-blur-sm"
            }>
              <CardHeader className={
                theme === 'light'
                  ? "py-2 px-3 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white"
                  : "py-2 px-3 border-b"
              }>
                <div className="flex justify-between items-center">
                  <CardTitle className={
                    theme === 'light'
                      ? "text-base font-medium min-w-[4rem] text-gray-800"
                      : "text-base font-medium min-w-[4rem]"
                  }>
                    {betType}
                  </CardTitle>
                  
                  <div className="flex items-center gap-2 flex-shrink">
                    {/* 分析画面の時のみ馬券候補の点数を表示 */}
                    {showAnalysis && (
                      <div className="flex items-center flex-wrap justify-end gap-1.5 text-xs">
                        <span className={
                          theme === 'light'
                            ? "font-medium whitespace-nowrap text-gray-600"
                            : "font-medium whitespace-nowrap"
                        }>
                          {options.length}点
                        </span>
                      </div>
                    )}
                    
                    {/* 券種ごとの統計情報を表示 */}
                    {typeStats && (
                      <div className="flex items-center flex-wrap justify-end gap-1.5 text-xs">
                        <span className={`
                          font-medium whitespace-nowrap
                          ${getColorClass(
                            typeStats.totalProbability,
                            optionsWithStats.stats.probability
                          )}
                        `}>
                          {(typeStats.totalProbability * 100).toFixed(1)}%
                        </span>
                        <span className={`
                          font-medium whitespace-nowrap
                          ${getEvColorClass(typeStats.averageEv)}
                        `}>
                          {typeStats.averageEv.toFixed(2)}
                        </span>
                      </div>
                    )}
                    
                    {/* 全選択・全解除を切り替えるボタン */}
                    {onSelectAllByType && (
                      <button
                        onClick={() => onSelectAllByType(betType, !isAllSelected)}
                        className={`
                          p-1 rounded-full text-xs
                          ${isAllSelected 
                            ? 'text-primary hover:text-destructive' 
                            : 'text-muted-foreground hover:text-primary'}
                          transition-colors duration-200
                        `}
                        title={isAllSelected ? "全解除" : "全選択"}
                      >
                        {isAllSelected ? (
                          <XCircle className="h-3.5 w-3.5" />
                        ) : (
                          <CheckCircle className="h-3.5 w-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-2">
                <div className="space-y-1.5">
                  {options.map((option, index) => {
                    const evClass = getEvBackgroundClass(option.ev, optionsWithStats.stats.ev);
                    const relatedCorrelations = showAnalysis ? getRelatedCorrelations(option) : [];
                    const relatedRecommendations = showAnalysis ? getRelatedRecommendations(option) : [];
                    
                    const BetContent = (
                      <div 
                        onClick={() => onBetSelect?.(option)}
                        className={`
                          relative overflow-hidden
                          p-2 rounded-md 
                          transition-all duration-300 ease-out
                          cursor-pointer
                          ${evClass}
                          ${isSelected(option)
                            ? theme === 'light' 
                              ? 'bg-indigo-100 border border-indigo-300 shadow-md scale-[1.02] -translate-y-0.5'
                              : 'bg-primary/15 border border-primary/30 shadow-md scale-[1.02] -translate-y-0.5' 
                            : 'border border-transparent hover:scale-[1.01] hover:-translate-y-0.5 hover:shadow-sm'
                          }
                        `}
                      >
                        {/* 選択時のリップルエフェクト */}
                        {isSelected(option) && (
                          <div className="absolute inset-0 animate-ripple">
                            <div className={
                              theme === 'light'
                                ? "absolute inset-0 bg-indigo-200/30 animate-pulse"
                                : "absolute inset-0 bg-primary/20 animate-pulse"
                            } />
                          </div>
                        )}

                        {/* グラデーション背景レイヤー */}
                        <div className={`
                          absolute inset-0 
                          ${
                            theme === 'light'
                              ? 'bg-gradient-to-r from-gray-50/80 via-white/30 to-transparent'
                              : 'bg-gradient-to-r from-primary/10 via-background/5 to-transparent'
                          }
                          transition-opacity duration-300
                          ${isSelected(option) ? 'opacity-0' : 'opacity-100'}
                        `} />

                        {/* コンテンツレイヤー */}
                        <div className="relative">
                          <div className="grid grid-cols-2 gap-2">
                            <span className={`
                              font-medium
                              transition-colors duration-300
                              ${
                                theme === 'light'
                                  ? isSelected(option) ? 'text-indigo-700' : 'text-gray-700'
                                  : isSelected(option) ? 'text-primary' : ''
                              }
                            `}>
                              {formatHorses(option.horses, option.type)}
                            </span>
                            <span className={`
                              text-right font-bold
                              transition-all duration-300
                              ${getOddsColorClass(option.odds)}
                              ${isSelected(option) ? 'scale-105' : ''}
                            `}>
                              ×{option.odds.toFixed(1)}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs mt-1">
                            <span className={`
                              transition-colors duration-300
                              ${getColorClass(option.probability, optionsWithStats.stats.probability)}
                            `}>
                              {(option.probability * 100).toFixed(1)}%
                            </span>
                            <span className={`
                              text-right font-medium
                              transition-all duration-300
                              ${getEvColorClass(option.ev)}
                              ${isSelected(option) ? 'scale-105' : ''}
                            `}>
                              {(option.ev).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );

                    // 分析画面の場合のみPopoverでラップ
                    return showAnalysis ? (
                      <Popover key={index}>
                        <PopoverTrigger asChild>
                          {BetContent}
                        </PopoverTrigger>
                        <PopoverContent className={
                          theme === 'light'
                            ? "w-96 bg-background border border-secondary/40 shadow-sm"
                            : "w-96 bg-slate-900/95 backdrop-blur-sm border border-slate-800"
                        }>
                          <div className="space-y-4">
                            <div>
                              <h4 className={
                                theme === 'light'
                                  ? "font-medium text-foreground mb-2 px-1"
                                  : "font-medium text-slate-300 mb-2 px-1"
                              }>
                                {getCorrelationTitle(option)}
                              </h4>
                              <div className={
                                theme === 'light'
                                  ? "grid grid-cols-2 gap-1.5 rounded-lg bg-secondary/10 p-1.5"
                                  : "grid grid-cols-2 gap-1.5 rounded-lg bg-slate-950/50 p-1.5"
                              }>
                                {formatCorrelations(option, relatedCorrelations).map((corr, i) => (
                                  <div key={i} 
                                    className={`
                                      flex justify-between items-center px-2.5 py-1.5 rounded-md
                                      ${
                                        theme === 'light'
                                          ? corr.probability >= 0.75 
                                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                                            : corr.probability >= 0.5 
                                              ? 'bg-emerald-50/80 text-emerald-700' 
                                              : corr.probability >= 0.25 
                                                ? 'bg-amber-50/80 text-amber-700' 
                                                : 'bg-slate-100 text-slate-600'
                                          : corr.probability >= 0.75 
                                            ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/20' 
                                            : corr.probability >= 0.5 
                                              ? 'bg-emerald-950/30 text-emerald-400' 
                                              : corr.probability >= 0.25 
                                                ? 'bg-amber-950/30 text-amber-400' 
                                                : 'bg-slate-800/30 text-slate-400'
                                      }
                                      backdrop-blur-sm hover:bg-opacity-60 transition-all duration-200
                                    `}
                                  >
                                    <span className="text-xs font-medium tracking-tight">
                                      {corr.target.type === '単勝' || corr.target.type === '複勝' 
                                        ? `${corr.target.type} ${corr.target.horses.split(' ')[0]}` 
                                        : `${corr.target.type} ${corr.target.horses}`}
                                    </span>
                                    <span className={`
                                      text-xs tabular-nums font-semibold
                                      ${
                                        theme === 'light'
                                          ? corr.probability >= 0.75 
                                            ? 'text-emerald-600' 
                                            : corr.probability >= 0.5 
                                              ? 'text-emerald-600' 
                                              : corr.probability >= 0.25 
                                                ? 'text-amber-600' 
                                                : 'text-slate-500'
                                          : corr.probability >= 0.75 
                                            ? 'text-emerald-200' 
                                            : corr.probability >= 0.5 
                                              ? 'text-emerald-400' 
                                              : corr.probability >= 0.25 
                                                ? 'text-amber-400' 
                                                : 'text-slate-400'
                                      }
                                    `}>
                                      {(corr.probability * 100).toFixed(1)}%
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    ) : (
                      <div key={index}>
                        {BetContent}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// 統計情報を計算するユーティリティ関数
function calculateStats(values: number[]) {
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const std = Math.sqrt(variance);
  return { mean, std };
} 