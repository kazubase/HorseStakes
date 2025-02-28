import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BetProposal } from "@/lib/betEvaluation";
import { useMemo } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BetCorrelation } from "@/lib/betConditionalProbability";

interface BettingOptionsTableProps {
  bettingOptions: BetProposal[];
  selectedBets?: BetProposal[];
  onBetSelect?: (bet: BetProposal) => void;
  correlations?: BetCorrelation[];
  geminiRecommendations?: Array<{
    type: string;
    horses: string[];
    reason: string;
  }>;
  className?: string;
  showAnalysis?: boolean;
}

export function BettingOptionsTable({ 
  bettingOptions,
  selectedBets = [],
  onBetSelect,
  correlations = [],
  geminiRecommendations = [],
  className,
  showAnalysis = false
}: BettingOptionsTableProps) {
  // 期待値を計算して統計情報を取得
  const optionsWithStats = useMemo(() => {
    const options = bettingOptions.map(option => {
      const odds = option.expectedReturn / option.stake;
      const ev = odds * option.probability;
      return {
        ...option,
        odds,
        ev
      };
    });

    // 各指標の統計情報を計算
    const stats = {
      ev: calculateStats(options.map(o => o.ev)),
      odds: calculateStats(options.map(o => o.odds)),
      probability: calculateStats(options.map(o => o.probability))
    };

    return {
      options,
      stats
    };
  }, [bettingOptions]);

  // 統計情報に基づいて色を決定する関数
  const getColorClass = (value: number, stats: { mean: number; std: number }) => {
    const zScore = (value - stats.mean) / stats.std;
    if (zScore > 1) return 'text-green-600';
    if (zScore > 0) return 'text-green-500';
    if (zScore > -1) return 'text-yellow-600';
    return 'text-muted-foreground';
  };

  // EVに基づく背景色を決定する関数
  const getEvBackgroundClass = (ev: number, stats: { mean: number; std: number }) => {
    const zScore = (ev - stats.mean) / stats.std;
    if (zScore > 1) return 'bg-green-500/15 hover:bg-green-500/25';
    if (zScore > 0) return 'bg-green-500/10 hover:bg-green-500/20';
    if (zScore > -1) return 'bg-yellow-500/10 hover:bg-yellow-500/20';
    return 'bg-yellow-500/5 hover:bg-yellow-500/15';
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
      
      // 馬番を数値配列に変換して比較
      const normalizeHorses = (horses: string[]) => {
        // 各馬番を文字列として扱い、分割処理を行う
        const allNumbers = horses.flatMap(h => {
          const horseStr = String(h); // 数値を確実に文字列に変換
          if (horseStr.includes('-')) {
            return horseStr.split('-').map(num => parseInt(num.trim()));
          }
          if (horseStr.includes('→')) {
            return horseStr.split('→').map(num => parseInt(num.trim()));
          }
          // 空白で分割して最初の数値を取得
          return parseInt(horseStr.split(' ')[0]);
        });
        
        // 馬単系は順序を維持、それ以外はソート
        return option.type.includes('単') ? allNumbers : allNumbers.sort((a, b) => a - b);
      };
      
      const selectedHorses = normalizeHorses(selected.horses);
      const optionHorses = normalizeHorses(option.horses);
      
      // 馬単と3連単は順序を考慮
      const isSameHorses = option.type.includes('単')
        ? selectedHorses.join(',') === optionHorses.join(',')
        // その他の馬券は順序を考慮しない
        : selectedHorses.length === optionHorses.length &&
          selectedHorses.every(h => optionHorses.includes(h));
      
      return isSameType && isSameHorses;
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
      rec.horses.includes(bet.horseName)
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
    const horseDisplay = bet.horses.join('-');
    switch (bet.type) {
      case '単勝':
      case '複勝':
        return `${bet.type}${horseDisplay}が的中した場合`;
      case '枠連':
      case 'ワイド':
      case '馬連':
        return `${bet.type}${horseDisplay}が的中した場合`;
      case '馬単':
        return `${bet.type}${bet.horses.join('→')}が的中した場合`;
      case '３連複':
        return `${bet.type}${horseDisplay}が的中した場合`;
      case '３連単':
        return `${bet.type}${bet.horses.join('→')}が的中した場合`;
      default:
        return `${bet.type}が的中した場合`;
    }
  };

  // 券種ごとの統計を計算する関数を追加
  const calculateTypeStats = (
    options: typeof optionsWithStats.options,
    selectedBets: BetProposal[],
    type: string
  ) => {
    const selectedOfType = selectedBets.filter(bet => bet.type === type);
    if (!selectedOfType.length) return null;

    const totalProbability = selectedOfType.reduce((sum, bet) => sum + bet.probability, 0);
    const averageEv = selectedOfType.reduce((sum, bet) => sum + (bet.expectedReturn / bet.stake) * bet.probability, 0) / selectedOfType.length;

    return {
      totalProbability,
      averageEv
    };
  };

  return (
    <div className={`space-y-3 ${className || ''}`}>
      {/* 凡例を追加 */}
      <div className="bg-secondary/30 p-2 rounded-lg text-xs text-muted-foreground">
        <div className="grid grid-cols-2 gap-2 mb-1">
          <div>買い目</div>
          <div className="text-right">オッズ</div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>的中率</div>
          <div className="text-right">期待値</div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-2 gap-3">
        {[...simpleTypes, ...complexTypes].map(betType => {
          const options = groupedOptions[betType];
          if (!options?.length) return null;

          return (
            <Card key={betType} className="bg-background/50 backdrop-blur-sm">
              <CardHeader className="py-2 px-3 border-b">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-base font-medium">{betType}</CardTitle>
                  {/* 券種ごとの統計情報を表示 */}
                  {calculateTypeStats(optionsWithStats.options, selectedBets, betType) && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className={`
                        font-medium
                        ${getColorClass(
                          calculateTypeStats(optionsWithStats.options, selectedBets, betType)!.totalProbability,
                          optionsWithStats.stats.probability
                        )}
                      `}>
                        {(calculateTypeStats(optionsWithStats.options, selectedBets, betType)!.totalProbability * 100).toFixed(1)}%
                      </span>
                      <span className={`
                        font-medium
                        ${getColorClass(
                          calculateTypeStats(optionsWithStats.options, selectedBets, betType)!.averageEv,
                          optionsWithStats.stats.ev
                        )}
                      `}>
                        {calculateTypeStats(optionsWithStats.options, selectedBets, betType)!.averageEv.toFixed(2)}
                      </span>
                    </div>
                  )}
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
                            ? 'bg-primary/15 border border-primary/30 shadow-md scale-[1.02] -translate-y-0.5' 
                            : 'border border-transparent hover:scale-[1.01] hover:-translate-y-0.5 hover:shadow-sm'
                          }
                        `}
                      >
                        {/* 選択時のリップルエフェクト */}
                        {isSelected(option) && (
                          <div className="absolute inset-0 animate-ripple">
                            <div className="absolute inset-0 bg-primary/20 animate-pulse" />
                          </div>
                        )}

                        {/* グラデーション背景レイヤー */}
                        <div className={`
                          absolute inset-0 
                          bg-gradient-to-r from-primary/10 via-background/5 to-transparent
                          transition-opacity duration-300
                          ${isSelected(option) ? 'opacity-0' : 'opacity-100'}
                        `} />

                        {/* コンテンツレイヤー */}
                        <div className="relative">
                          <div className="grid grid-cols-2 gap-2">
                            <span className={`
                              font-medium
                              transition-colors duration-300
                              ${isSelected(option) ? 'text-primary' : ''}
                            `}>
                              {formatHorses(option.horses, option.type)}
                            </span>
                            <span className={`
                              text-right font-bold
                              transition-all duration-300
                              ${getColorClass(option.odds, optionsWithStats.stats.odds)}
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
                              ${getColorClass(option.ev, optionsWithStats.stats.ev)}
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
                        <PopoverContent className="w-80 bg-slate-900/95 backdrop-blur-sm border border-slate-800">
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-medium text-slate-300 mb-2 px-1">
                                {getCorrelationTitle(option)}
                              </h4>
                              <div className="space-y-0.5 rounded-lg bg-slate-950/50 p-1.5">
                                {formatCorrelations(option, relatedCorrelations).map((corr, i) => (
                                  <div key={i} 
                                    className={`
                                      flex justify-between items-center px-2.5 py-1.5 rounded-md
                                      ${corr.probability > 0.8 ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/20' : 
                                        corr.probability > 0.5 ? 'bg-emerald-950/30 text-emerald-400' : 
                                        corr.probability > 0.3 ? 'bg-amber-950/30 text-amber-400' : 
                                        'bg-slate-800/30 text-slate-400'
                                      }
                                      backdrop-blur-sm hover:bg-opacity-60 transition-all duration-200
                                    `}
                                  >
                                    <span className="text-sm font-medium tracking-tight">
                                      {corr.target.type} {corr.target.horses}
                                    </span>
                                    <span className={`
                                      text-sm tabular-nums font-semibold
                                      ${corr.probability > 0.8 ? 'text-emerald-200' : 
                                        corr.probability > 0.5 ? 'text-emerald-400' : 
                                        corr.probability > 0.3 ? 'text-amber-400' : 
                                        'text-slate-400'
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