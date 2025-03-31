import { memo, useMemo, useRef, useEffect, useCallback, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { GeminiStrategy } from "@/lib/geminiApi";
import { optimizeBetAllocation } from "@/lib/betOptimizer";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import html2canvas from 'html2canvas';
import { Camera, Sparkles, LineChart, MousePointer } from 'lucide-react';
import type { BetProposal } from "@/lib/betEvaluation";
import { InfoIcon } from "lucide-react";
import { useAtom } from 'jotai';
import { bettingOptionsStatsAtom, horsesAtom } from '@/stores/bettingStrategy';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import Masonry from 'react-masonry-css';
import { useThemeStore } from "@/stores/themeStore";
import { cn } from "@/lib/utils";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { InfoTooltip } from "@/components/ui/InfoTooltip";

interface BettingStrategyTableProps {
  strategy: GeminiStrategy;
  totalBudget: number;
}

// 分布データの型を定義
interface DistributionDataPoint {
  value: number;
  count: number;
  percentage: number;
}

export const BettingStrategyTable = memo(function BettingStrategyTable({ 
  strategy, 
  totalBudget 
}: BettingStrategyTableProps): JSX.Element {
  // レンダリング回数の追跡
  const renderCount = useRef(0);
  // テーマの取得
  const { theme } = useThemeStore();
  
  // 最適化計算の結果をメモ化
  const optimizationResult = useMemo(() => {
    // 既に最適化された推奨を使用（stakeとexpectedReturnを保持）
    return strategy.recommendations.map(rec => ({
      type: rec.type,
      horses: rec.horses,
      stake: rec.stake || Math.floor(totalBudget / strategy.recommendations.length), // 既存のstakeを使用
      odds: rec.odds,
      probability: typeof rec.probability === 'number' ? rec.probability : parseFloat(rec.probability),
      expectedReturn: rec.expectedReturn || (rec.odds * (rec.stake || Math.floor(totalBudget / strategy.recommendations.length))),
      reason: rec.reason // reasonプロパティを確実に保持
    }));
  }, [strategy.recommendations, totalBudget]);

  // 馬券種別の表記を統一する関数
  const normalizeTicketType = (type: string): string => {
    const typeMap: Record<string, string> = {
      "３連複": "3連複",
      "３連単": "3連単"
    };
    return typeMap[type] || type;
  };

  // ソート済みの馬券リストをメモ化
  const sortedBets = useMemo(() => {
    const typeOrder: Record<string, number> = {
      "単勝": 1,
      "複勝": 2,
      "枠連": 3,
      "ワイド": 4,
      "馬連": 5,
      "馬単": 6,
      "3連複": 7,
      "3連単": 8
    };
    
    // optimizationResult は既に useMemo で算出済みなので、ここでは単にソートするだけにする
    // reasonプロパティを確実に引き継ぐ
    return [...optimizationResult].sort((a, b) => {
      const typeA = normalizeTicketType(a.type);
      const typeB = normalizeTicketType(b.type);
      return (typeOrder[typeA] || 0) - (typeOrder[typeB] || 0);
    });
  }, [optimizationResult]);

  // 馬券間の排反関係を計算する関数
  const calculateMutualExclusivity = (bet1: BetProposal, bet2: BetProposal): number => {
    // 同じ馬券種別の場合
    if (bet1.type === bet2.type) {
      // 複勝・ワイド以外の同じ券種は完全排反
      if (bet1.type !== "複勝" && bet1.type !== "ワイド") {
        return 1.0;
      }
      
      // 複勝の場合
      if (bet1.type === "複勝") {
        // 同じ馬を含む場合
        if (bet1.horses.some(h => bet2.horses.includes(h))) {
          return 1.0;  // 同じ馬の複勝を重複購入することはないため
        }
        return 0.4;  // 異なる馬の場合は部分的に排反
      }
      
      // ワイドの場合
      if (bet1.type === "ワイド") {
        const commonHorses = bet1.horses.filter(h => bet2.horses.includes(h));
        if (commonHorses.length === 2) return 1.0;  // 完全に同じ組み合わせ
        if (commonHorses.length === 1) return 0.5;  // 1頭共通
        return 0.2;  // 共通馬なし
      }
    }
    
    // 異なる馬券種別の場合
    const commonHorses = bet1.horses.filter(h => bet2.horses.includes(h));
    if (commonHorses.length === 0) return 0;
    
    // 共通する馬がいる場合、券種の組み合わせに応じて排反度を設定
    if (bet1.type === "単勝" || bet2.type === "単勝") {
      return 0.8;  // 単勝が絡む場合は強い排反関係
    }
    if (bet1.type === "複勝" || bet2.type === "複勝") {
      return 0.4;  // 複勝が絡む場合は弱い排反関係
    }
    return 0.6;  // その他の組み合わせは中程度の排反関係
  };

  // 集計値の計算をメモ化（排反事象を考慮）
  const totals = useMemo(() => {
    const totalInvestment = sortedBets.reduce((sum, bet) => sum + bet.stake, 0);

    // 排反事象を考慮した期待収益の計算
    const adjustedExpectedReturn = sortedBets.map(bet => {
      let adjustedProb = bet.probability;
      
      // 他の馬券との排反関係を考慮して確率を調整
      sortedBets.forEach(otherBet => {
        if (bet !== otherBet) {
          const exclusivity = calculateMutualExclusivity(bet, otherBet);
          const otherStakeRatio = otherBet.stake / totalInvestment;
          adjustedProb *= (1 - exclusivity * otherBet.probability * otherStakeRatio);
        }
      });
      
      return bet.expectedReturn * adjustedProb;
    }).reduce((sum, return_) => sum + return_, 0);
    
    return {
      totalInvestment,
      totalExpectedReturn: adjustedExpectedReturn,
      expectedReturnRate: ((adjustedExpectedReturn / totalInvestment - 1) * 100).toFixed(1)
    };
  }, [sortedBets]);

  // 馬券の買い目表記を統一する関数を修正
  const formatHorseNumbers = (type: string, horses: string[]): string => {
    const normalizedType = normalizeTicketType(type);
    
    // 単勝・複勝の場合は馬番のみ表示（スペース以降を削除）
    if (normalizedType === '単勝' || normalizedType === '複勝') {
      return horses[0].split(' ')[0];
    }
    
    // スマホサイズ（sm未満）の場合は短縮表示
    if (typeof window !== 'undefined' && window.innerWidth < 640) {
      // 3連複と3連単
      if (normalizedType === '3連複' || normalizedType === '3連単') {
        // 区切り文字を調整（スマホ表示時は少し短く）
        const separator = normalizedType.includes('単') ? '→' : '-';
        // 馬番だけを取り出して結合
        const formattedHorses = horses.map(h => h.split(' ')[0]).join(separator);
        return formattedHorses;
      }
      // その他の馬券種別も馬番のみの表記に
      return horses.map(h => h.split(' ')[0]).join(normalizedType.includes('単') ? '→' : '-');
    }
    
    // 通常サイズは従来通りの表示
    return ["馬単", "3連単"].includes(normalizedType)
      ? horses.join('→')
      : horses.length === 1
      ? horses[0]
      : horses.join('-');
  };

  // 馬券候補の統計情報を取得
  const [optionsStats] = useAtom(bettingOptionsStatsAtom);

  // オッズの色分けロジック - 統計情報があれば使用
  const getOddsColorClass = (odds: number) => {
    if (odds < 10) {
      return theme === 'light' ? 'text-red-500 font-medium' : 'text-red-400 font-medium';
    } else if (odds >= 1000) {
      return theme === 'light' ? 'text-gray-800 text-[0.9em]' : 'text-foreground text-[0.9em]';
    } else {
      return theme === 'light' ? 'text-gray-800' : 'text-foreground';
    }
  };

  // 確率の色分けロジック - 統計情報があれば使用
  const getProbabilityColorClass = (probability: number) => {
    if (theme === 'light') {
      // ライトモード用の色分け
      if (probability > 0.4) return 'text-green-700 font-semibold';
      if (probability > 0.2) return 'text-green-600';
      if (probability > 0.1) return 'text-green-500';
      if (probability > 0.05) return 'text-amber-600';
      if (probability > 0.01) return 'text-amber-500';
      return 'text-gray-600';
    } else if (optionsStats) {
      // 確率に対するパーセンタイルを計算
      const percentile = optionsStats.options
        .map(o => o.probability)
        .filter(v => v <= probability)
        .length / optionsStats.options.length;
      
      if (percentile > 0.9) return 'text-green-400';
      if (percentile > 0.7) return 'text-green-500';
      if (percentile > 0.4) return 'text-lime-500';
      if (percentile > 0.1) return 'text-amber-500';
      return 'text-muted-foreground';
    } else {
      // 統計情報がない場合は固定値で判断
      if (probability > 0.4) return 'text-green-400';
      if (probability > 0.2) return 'text-green-500';
      if (probability > 0.1) return 'text-green-600';
      if (probability > 0.05) return 'text-yellow-500';
      if (probability > 0.01) return 'text-yellow-600';
      return 'text-muted-foreground';
    }
  };

  // EVに基づく背景色を決定する関数 - 統計情報があれば使用
  const getEvBackgroundClass = (odds: number, probability: number) => {
    const ev = odds * probability;
    
    if (optionsStats) {
      // EVに対するパーセンタイルを計算
      const percentile = optionsStats.options
        .map(o => o.ev)
        .filter(v => v <= ev)
        .length / optionsStats.options.length;
      
      // BettingOptionsTableと完全に同じ背景色を使用
      if (percentile > 0.75) return 'bg-green-500/15 hover:bg-green-500/25';
      if (percentile > 0.5) return 'bg-lime-600/15 hover:bg-lime-600/25';
      if (percentile > 0.25) return 'bg-yellow-500/10 hover:bg-yellow-500/20';
      return 'bg-yellow-500/5 hover:bg-yellow-500/15';
    } else {
      // 統計情報がない場合も同様の色を使用
      if (ev > 1.5) return 'bg-green-500/15 hover:bg-green-500/25';
      if (ev > 1.2) return 'bg-lime-600/15 hover:bg-lime-600/25';
      if (ev > 1.0) return 'bg-yellow-500/10 hover:bg-yellow-500/20';
      if (ev > 0.8) return 'bg-yellow-500/5 hover:bg-yellow-500/15';
      return 'bg-yellow-500/5 hover:bg-yellow-500/15';
    }
  };

  // テーブルデータの生成をメモ化
  const tableData = useMemo(() => ({
    headers: ['券種', '買い目', 'オッズ', '的中率', '最適投資額', '想定払戻金', '選定理由'],
    rows: sortedBets.map(bet => [
      <div key={bet.type} className="md:writing-horizontal writing-vertical text-xs leading-tight min-h-[3rem] flex items-center justify-center">
        {normalizeTicketType(bet.type)}
      </div>,
      <div className="text-center">
        {formatHorseNumbers(bet.type, bet.horses)}
      </div>,
      <div className="text-center">{bet.odds ? bet.odds.toFixed(1) : Number(bet.expectedReturn / bet.stake).toFixed(1)}</div>,
      <div className="text-center">{(bet.probability * 100).toFixed(1)}%</div>,
      <div className="text-center">{bet.stake.toLocaleString()}円</div>,
      <div className="text-center">{bet.expectedReturn.toLocaleString()}円</div>,
      <div className="relative group">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <InfoIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent 
            className={cn(
              "w-[280px] sm:w-80 rounded-lg shadow-lg p-4",
              theme === 'light'
                ? "bg-white/95 backdrop-blur-sm border border-gray-200"
                : "border border-primary/20 bg-black/70 backdrop-blur-sm"
            )} 
            sideOffset={5}
          >
            <div className="space-y-2">
              <h4 className={cn(
                "text-sm font-medium",
                theme === 'light'
                  ? "text-indigo-700"
                  : "text-primary/90"
              )}>選択理由</h4>
              <div className="relative overflow-hidden">
                <div className={cn(
                  "absolute inset-0 pointer-events-none",
                  theme === 'light'
                    ? "bg-gradient-to-r from-indigo-50/50 to-transparent opacity-30"
                    : "bg-gradient-to-r from-primary/5 to-transparent opacity-30"
                )} />
                <p className={cn(
                  "text-sm leading-relaxed relative",
                  theme === 'light'
                    ? "text-gray-700"
                    : "text-white/90"
                )}>
                  {bet.reason || '理由なし'}
                </p>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    ])
  }), [sortedBets]);

  // テーブルのref追加
  const tableRef = useRef<HTMLDivElement>(null);

  // スクリーンショット機能
  const captureTable = async () => {
    const cardElement = tableRef.current?.closest('[data-card-container]');
    if (!cardElement) return;
    
    try {
      const originalPadding = (cardElement as HTMLElement).style.padding;
      (cardElement as HTMLElement).style.padding = '16px';

      const canvas = await html2canvas(cardElement as HTMLElement, {
        backgroundColor: '#000000',
        scale: 1,
        useCORS: true,
        logging: false,
        width: cardElement.scrollWidth + 32,
        height: cardElement.scrollHeight + 32,
      });
      
      (cardElement as HTMLElement).style.padding = originalPadding;
      
      const link = document.createElement('a');
      link.download = `betting-strategy-${new Date().toISOString()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('スクリーンショットの作成に失敗:', error);
      }
    }
  };

  // 券種に基づいて必要なシミュレーション回数を決定する関数
  const determineOptimalIterations = (bets: BetProposal[]): number => {
    // 選択された馬券の中で、最も的中確率の低い券種を特定
    let lowestPriorityType = "";

    // 優先度の高い券種を探す（複数種類ある場合は最も回数が多いものを採用）
    bets.forEach(bet => {
      const normalizedType = normalizeTicketType(bet.type);
      
      // 3連単がある場合は最優先
      if (normalizedType === "3連単") {
        lowestPriorityType = "3連単";
      } 
      // 3連単がなく、かつまだ馬連/馬単/3連複が見つかっておらず、現在のベットが馬連/馬単/3連複の場合
      else if (lowestPriorityType !== "3連単" && 
          lowestPriorityType !== "馬連" && lowestPriorityType !== "馬単" && lowestPriorityType !== "3連複" &&
          (normalizedType === "馬連" || normalizedType === "馬単" || normalizedType === "3連複")) {
        lowestPriorityType = normalizedType;
      }
      // ここまで優先度の高い券種がなく、現在のベットが枠連/ワイドの場合
      else if (lowestPriorityType !== "3連単" && 
          lowestPriorityType !== "馬連" && lowestPriorityType !== "馬単" && lowestPriorityType !== "3連複" &&
          lowestPriorityType !== "枠連" && lowestPriorityType !== "ワイド" &&
          (normalizedType === "枠連" || normalizedType === "ワイド")) {
        lowestPriorityType = normalizedType;
      }
      // 他に何も見つかっておらず、現在のベットが単勝/複勝の場合
      else if (lowestPriorityType === "" && (normalizedType === "単勝" || normalizedType === "複勝")) {
        lowestPriorityType = normalizedType;
      }
    });

    // 券種に基づいて固定のシミュレーション回数を返す
    if (lowestPriorityType === "3連単") {
      return 100000;
    } else if (lowestPriorityType === "馬連" || lowestPriorityType === "馬単" || lowestPriorityType === "3連複") {
      return 50000;
    } else {
      // 単勝、複勝、またはその他の券種
      return 30000;
    }
  };

  // モンテカルロシミュレーション関数を修正
  const runMonteCarloSimulation = (bets: BetProposal[], iterations?: number) => {
    // 最適なシミュレーション回数を決定（引数で指定された場合はそれを優先）
    const optimalIterations = iterations || determineOptimalIterations(bets);
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`モンテカルロシミュレーション - 最適化されたシミュレーション回数: ${optimalIterations}回`);
    }
    
    // 最初の1回だけログを出力するフラグ
    let loggedFirstSimulation = false;
    const results: number[] = [];
    
    // 的中時の収益率を記録する配列を追加
    const winningRates: number[] = [];
    
    // 的中したシミュレーション回数を追跡
    let winCount = 0;
    
    // 投資額を先に計算しておく（ループ外で一度だけ計算）
    const totalInvestment = bets.reduce((sum, bet) => sum + bet.stake, 0);
    
    for (let i = 0; i < optimalIterations; i++) {
      // 最初の1回目だけログを出力（開発環境でのみ）
      const shouldLog = process.env.NODE_ENV === 'development' && i === 0 && !loggedFirstSimulation;
      
      let totalReturn = 0;
      let anyBetWon = false; // 的中したかどうかのフラグ
      
      // レース結果をシミュレート
      const raceResult = simulateRaceResult(shouldLog && !loggedFirstSimulation);
      
      if (shouldLog && process.env.NODE_ENV === 'development') {
        console.group('モンテカルロシミュレーション - 1回目の実行');
        console.log('レース結果:', raceResult);
      }
      
      // 各馬券について当たりハズレを判定
      bets.forEach(bet => {
        // レース結果に基づいて馬券の的中を判定
        const isWin = isBetWinning(bet, raceResult, shouldLog);
        
        // オッズを小数点1桁に丸める
        const roundedOdds = Math.round((bet.odds || 0) * 10) / 10;
        
        if (shouldLog && process.env.NODE_ENV === 'development') {
          console.log(`馬券: ${bet.type} ${formatHorseNumbers(bet.type, bet.horses)}, オッズ: ${roundedOdds.toFixed(1)}, 的中: ${isWin ? '○' : '×'}`);
        }
        
        if (isWin) {
          // 当たりの場合は払戻金を加算（小数点1桁に丸めたオッズで計算）
          const returnAmount = roundedOdds * bet.stake;
          totalReturn += returnAmount;
          
          if (shouldLog && process.env.NODE_ENV === 'development') {
            console.log(`  払戻金: ${returnAmount.toLocaleString()}円 (${roundedOdds.toFixed(1)} × ${bet.stake.toLocaleString()}円)`);
          }
          anyBetWon = true; // 的中したことを記録
          // 個別の馬券ごとの収益率は記録しない（後で全体の収益率を記録する）
        }
      });
      
      // 投資額を引いて純利益を計算
      const netProfit = totalReturn - totalInvestment;
      
      // 的中があった場合は、総払戻金÷総投資額を収益率として記録
      if (anyBetWon) {
        winCount++; // 的中カウントを増やす
        winningRates.push(totalReturn / totalInvestment);
        
        if (shouldLog && process.env.NODE_ENV === 'development') {
          console.log(`的中時の収益率: ${(totalReturn / totalInvestment).toFixed(2)} (${totalReturn.toLocaleString()}円 ÷ ${totalInvestment.toLocaleString()}円)`);
        }
      }
      
      if (shouldLog && process.env.NODE_ENV === 'development') {
        console.log(`総投資額: ${totalInvestment.toLocaleString()}円`);
        console.log(`総払戻金: ${totalReturn.toLocaleString()}円`);
        console.log(`純利益: ${netProfit >= 0 ? '+' : ''}${netProfit.toLocaleString()}円`);
        console.groupEnd(); // モンテカルロシミュレーションのグループを閉じる
        loggedFirstSimulation = true;
      }
      
      results.push(netProfit);
    }
    
    // 結果を昇順にソート
    results.sort((a, b) => a - b);
    
    // 統計情報を計算
    const mean = results.reduce((sum, val) => sum + val, 0) / results.length;
    const median = results[Math.floor(results.length / 2)];
    const min = results[0];
    const max = results[results.length - 1];
    
    // 勝率を正確に計算（的中があったシミュレーション回数 ÷ 総シミュレーション回数）
    const winRate = winCount / optimalIterations;
    
    // 不的中率を計算（投資額のマイナス値の結果の数 ÷ 総結果数）
    const nonWinCount = results.filter(r => r === -totalInvestment).length;
    const nonWinRate = (nonWinCount / results.length) * 100; // パーセンテージ形式に変更
    
    // 不的中率と的中率（1 - 不的中率）が勝率と一致するかチェック
    const calculatedWinRate = 1 - (nonWinRate / 100); // パーセンテージから割合に戻す
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`的中回数: ${winCount}/${optimalIterations} (${(winRate * 100).toFixed(2)}%)`);
      console.log(`不的中率から計算した的中率: ${(calculatedWinRate * 100).toFixed(2)}%`);
      
      // 差異があれば警告を表示
      if (Math.abs(winRate - calculatedWinRate) > 0.01) {
        console.warn(`警告: 勝率と不的中率からの計算に差異があります: ${(Math.abs(winRate - calculatedWinRate) * 100).toFixed(2)}%`);
      }
    }
    
    // 95%信頼区間
    const lowerBound = results[Math.floor(results.length * 0.025)];
    const upperBound = results[Math.floor(results.length * 0.975)];
    
    const stats = {
      mean,
      median,
      min,
      max,
      winRate,
      confidenceInterval: [lowerBound, upperBound]
    };

    // 分布データの生成を改善
    const distributionData: DistributionDataPoint[] = [];
    
    // 最小値と最大値から適切なバケット幅を計算
    // 横軸の最小値を0円に設定
    const minDisplayValue = 0; // 表示上の最小値を0円に設定
    // 最大表示値は常に最大値を使用（95%信頼区間に依存しない）
    const maxDisplayValue = stats.max > 0 ? stats.max : 100000;
    
    // バケット幅を調整（プラス領域の分布をより詳細に）
    const bucketCount = 40; // より細かく表示するためバケット数を増やす
    // バケット幅を計算する際、最大値が必ず含まれるようにする
    const bucketWidth = Math.max(1000, Math.ceil(maxDisplayValue / bucketCount / 1000) * 1000);
    const displayRange = maxDisplayValue - minDisplayValue;
    
    // 余白として最大値の後に追加するバケットの数
    const paddingBuckets = 3; // 追加する余白バケット数
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`分布データ生成: 表示範囲=${displayRange.toLocaleString()}円, バケット数=${bucketCount}, バケット幅=${bucketWidth.toLocaleString()}円, 余白バケット数=${paddingBuckets}`);
    }
    
    // バケットの範囲を設定（0円から始める）
    const bucketRanges: number[] = [];
    let currentValue = minDisplayValue; // 0円から開始
    
    // 十分な数のバケットを生成（最大値を必ず含むように）
    while (currentValue <= maxDisplayValue && bucketRanges.length < 100) {
      bucketRanges.push(currentValue);
      currentValue += bucketWidth;
    }
    
    // 最後のバケットが最大値を含むことを確認
    if (bucketRanges[bucketRanges.length - 1] < maxDisplayValue) {
      bucketRanges.push(maxDisplayValue);
    }
    
    // 余白バケットを追加
    currentValue = bucketRanges[bucketRanges.length - 1];
    for (let i = 0; i < paddingBuckets; i++) {
      currentValue += bucketWidth;
      bucketRanges.push(currentValue);
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('投資額:', totalInvestment.toLocaleString());
      console.log('理論上の最小値:', (-totalInvestment).toLocaleString());
      console.log('表示用バケット範囲:', bucketRanges.map(v => v.toLocaleString()).join(', '));
      console.log('最大値:', maxDisplayValue.toLocaleString(), '最終バケット:', bucketRanges[bucketRanges.length - 1].toLocaleString());
      console.log('余白バケット数:', paddingBuckets, '余白バケット最終値:', bucketRanges[bucketRanges.length - 1].toLocaleString());
    }
    
    // プラス領域（0円以上）のみの結果データを用意
    const positiveResults = results.filter(r => r >= 0);
    
    // 実際のデータがない場合の警告を追加
    if (positiveResults.length === 0 && process.env.NODE_ENV === 'development') {
      console.warn('プラス領域のデータが見つかりません。全て負の値の可能性があります。');
    }
    
    // 最大値が含まれるデータが存在するか確認
    const maxValueCount = positiveResults.filter(r => r === maxDisplayValue).length;
    if (process.env.NODE_ENV === 'development') {
      console.log(`最大値(${maxDisplayValue.toLocaleString()}円)のデータ数: ${maxValueCount}件`);
    }
    
    // 各バケットのカウントを計算 - 実際のデータのみを使用
    bucketRanges.forEach((bucketStart, i) => {
      if (i === bucketRanges.length - 1) return; // 最後の要素はスキップ（終点としてのみ使用）
      
      const bucketEnd = bucketRanges[i + 1];
      let count;
      
      // 最後のバケットは最大値を含める（<=を使用）
      if (i === bucketRanges.length - 2) {
        count = positiveResults.filter(r => r >= bucketStart && r <= bucketEnd).length;
      } else {
        count = positiveResults.filter(r => r >= bucketStart && r < bucketEnd).length;
      }
      
      // 実際のカウントデータからパーセンテージを計算（全シミュレーション結果に対する割合）
      const percentage = (count / results.length) * 100;
      
      // すべてのバケットを含める（0%のバケットも含めて正確なグラフを描画）
      const displayValue = Math.round((bucketStart + bucketEnd) / 2);
      
      distributionData.push({
        value: displayValue,
        count,
        percentage
      });
      
      if (process.env.NODE_ENV === 'development' && count > 0) {
        const rangeText = i === bucketRanges.length - 2 
          ? `${bucketStart.toLocaleString()}円～${bucketEnd.toLocaleString()}円（最大値含む）` 
          : `${bucketStart.toLocaleString()}円～${bucketEnd.toLocaleString()}円`;
        console.log(`バケット[${rangeText}]: ${count}件 (${percentage.toFixed(2)}%), 表示値: ${displayValue.toLocaleString()}円`);
      }
    });
    
    // 実際のバケットと95%信頼区間の比較をログに出力
    if (process.env.NODE_ENV === 'development') {
      console.log(`最大データ値: ${stats.max.toLocaleString()}円, 95%信頼区間上限: ${upperBound.toLocaleString()}円`);
      console.log(`データポイント数: ${positiveResults.length}件 (${(positiveResults.length / results.length * 100).toFixed(2)}%)`);
    }
    
    // 不的中率（-20,000円）は別途計算して表示しない（0円以上だけ表示）
    if (process.env.NODE_ENV === 'development') {
      // 既に計算済みの変数を使用
      console.log(`不的中: ${nonWinCount}件 (${nonWinRate.toFixed(2)}%), 表示しない`);
      console.log(`的中率: ${(100 - nonWinRate).toFixed(2)}%`);
      console.log(`実際の勝率: ${(winRate * 100).toFixed(2)}%`);
      
      // 実際のバケットと95%信頼区間の比較をログに出力
      console.log(`最大データ値: ${stats.max.toLocaleString()}円, 95%信頼区間上限: ${upperBound.toLocaleString()}円`);
      console.log(`データポイント数: ${positiveResults.length}件 (${(positiveResults.length / results.length * 100).toFixed(2)}%)`);
    }
    
    // バケット処理のみ行い、嘘データや補間は一切行わない
    if (process.env.NODE_ENV === 'development') {
      console.log('実際のデータに基づくバケット処理を適用:', distributionData.length === 0 ? '有効なプラスデータなし' : distributionData);
    }

    // 開発環境でのみ統計情報をログ出力
    if (process.env.NODE_ENV === 'development') {
      console.group('モンテカルロシミュレーション - 統計情報');
      console.log(`シミュレーション回数: ${optimalIterations}回`);
      console.log(`平均収益: ${mean.toLocaleString()}円`);
      console.log(`中央値: ${median.toLocaleString()}円`);
      console.log(`最小値: ${min.toLocaleString()}円`);
      console.log(`最大値: ${max.toLocaleString()}円`);
      console.log(`勝率: ${(winRate * 100).toFixed(2)}%`);
      console.log(`95%信頼区間: [${lowerBound.toLocaleString()}円, ${upperBound.toLocaleString()}円]`);
      console.groupEnd();
    }

    return {
      distributionData,
      stats,
      winningRates
    };
  };

  // レース結果をシミュレートする関数
  const simulateRaceResult = (shouldLog = false) => {
    // 開発環境チェックを追加
    const devShouldLog = process.env.NODE_ENV === 'development' && shouldLog;
    
    const urlParams = new URLSearchParams(window.location.search);
    const winProbsParam = urlParams.get('winProbs');
    const placeProbsParam = urlParams.get('placeProbs');
    
    try {
      const winProbs = JSON.parse(decodeURIComponent(winProbsParam || '{}'));
      const placeProbs = JSON.parse(decodeURIComponent(placeProbsParam || '{}'));
      const horseNumbers = Object.keys(winProbs).map(Number);
      
      if (devShouldLog) {
        console.group('レース結果シミュレーション');
        console.log('勝率データ:', winProbs);
        console.log('複勝率データ:', placeProbs);
        console.log('出走馬番号:', horseNumbers);
      }
      
      // 勝率に基づいて1着をシミュレート
      const firstPlaceRand = Math.random() * 100;
      let accumWinProb = 0;
      let first = horseNumbers[0];
      
      if (devShouldLog) {
        console.log('1着決定の乱数値:', firstPlaceRand);
      }
      
      for (const horseNumber of horseNumbers) {
        const horseWinProb = winProbs[horseNumber] || 0;
        accumWinProb += horseWinProb;
        
        if (devShouldLog) {
          console.log(`馬番${horseNumber}: 勝率=${horseWinProb.toFixed(2)}%, 累積=${accumWinProb.toFixed(2)}%`);
        }
        
        if (firstPlaceRand <= accumWinProb) {
          first = horseNumber;
          if (devShouldLog) {
            console.log(`→ 1着決定: 馬番${horseNumber}`);
          }
          break;
        }
      }
      
      // 1着を除外して、2着確率（=複勝確率-単勝確率)/2）に基づいて2着をシミュレート
      const remainingHorses = horseNumbers.filter(h => h !== first);
      const secondProbs: Record<number, number> = {};
      
      // 各馬の2着確率を計算
      remainingHorses.forEach(horse => {
        // 2着確率 = (複勝確率 - 単勝確率) / 2
        secondProbs[horse] = (placeProbs[horse] - winProbs[horse]) / 2;
      });
      
      // 1着馬の2着確率を計算（確率から除外するため）
      const firstHorseSecondProb = (placeProbs[first] - winProbs[first]) / 2;
      
      // 全体の2着確率の合計（100%から1着馬の2着確率を引く）
      const totalSecondProb = Math.max(0.1, 100 - firstHorseSecondProb);
      
      // 2着の乱数値を生成（0～totalSecondProb）
      const secondPlaceRand = Math.random() * totalSecondProb;
      
      if (devShouldLog) {
        console.log('2着確率データ:');
        console.log(`  1着馬(${first})の2着確率: ${firstHorseSecondProb.toFixed(2)}%`);
        console.log(`  残りの確率パイ: ${totalSecondProb.toFixed(2)}%`);
        console.log('各馬の2着確率:', secondProbs);
        console.log(`2着決定の乱数値: ${secondPlaceRand.toFixed(2)} / ${totalSecondProb.toFixed(2)}`);
      }
      
      // 2着を決定
      let accumSecondProb = 0;
      let second = remainingHorses[0];
      
      for (const horseNumber of remainingHorses) {
        accumSecondProb += secondProbs[horseNumber];
        if (devShouldLog) {
          console.log(`馬番${horseNumber}: 2着率=${secondProbs[horseNumber].toFixed(2)}%, 累積=${accumSecondProb.toFixed(2)}%`);
        }
        
        if (secondPlaceRand <= accumSecondProb) {
          second = horseNumber;
          if (devShouldLog) {
            console.log(`→ 2着決定: 馬番${horseNumber}`);
          }
          break;
        }
      }
      
      // 1着、2着を除外して3着をシミュレート
      const finalHorses = remainingHorses.filter(h => h !== second);
      const thirdProbs: Record<number, number> = {};
      
      // 各馬の3着確率を計算（=複勝確率-単勝確率)/2）
      finalHorses.forEach(horse => {
        thirdProbs[horse] = (placeProbs[horse] - winProbs[horse]) / 2;
      });
      
      // 1着馬と2着馬の3着確率（確率から除外するため）
      const firstHorseThirdProb = (placeProbs[first] - winProbs[first]) / 2;
      const secondHorseThirdProb = (placeProbs[second] - winProbs[second]) / 2;
      
      // 全体の3着確率の合計（100%から1着馬と2着馬の3着確率を引く）
      const totalThirdProb = Math.max(0.1, 100 - firstHorseThirdProb - secondHorseThirdProb);
      
      // 3着の乱数値を生成（0～totalThirdProb）
      const thirdPlaceRand = Math.random() * totalThirdProb;
      
      if (devShouldLog) {
        console.log('3着確率データ:');
        console.log(`  1着馬(${first})の3着確率: ${firstHorseThirdProb.toFixed(2)}%`);
        console.log(`  2着馬(${second})の3着確率: ${secondHorseThirdProb.toFixed(2)}%`);
        console.log(`  残りの確率パイ: ${totalThirdProb.toFixed(2)}%`);
        console.log('各馬の3着確率:', thirdProbs);
        console.log(`3着決定の乱数値: ${thirdPlaceRand.toFixed(2)} / ${totalThirdProb.toFixed(2)}`);
      }
      
      // 3着を決定
      let accumThirdProb = 0;
      let third = finalHorses.length > 0 ? finalHorses[0] : 0;
      
      for (const horseNumber of finalHorses) {
        accumThirdProb += thirdProbs[horseNumber];
        if (devShouldLog) {
          console.log(`馬番${horseNumber}: 3着率=${thirdProbs[horseNumber].toFixed(2)}%, 累積=${accumThirdProb.toFixed(2)}%`);
        }
        
        if (thirdPlaceRand <= accumThirdProb) {
          third = horseNumber;
          if (devShouldLog) {
            console.log(`→ 3着決定: 馬番${horseNumber}`);
          }
          break;
        }
      }
      
      const result = {
        first,
        second,
        third,
        fullResult: [first, second, third, ...finalHorses.filter(h => h !== third)]
      };
      
      if (devShouldLog) {
        console.log('最終レース結果:', result);
        console.groupEnd(); // レース結果シミュレーションのグループを閉じる
      }
      
      return result;
      
    } catch (e) {
      if (process.env.NODE_ENV === 'development') {
        console.error('確率パラメータの解析に失敗:', e);
      }
      if (devShouldLog) {
        console.groupEnd(); // エラー時にもグループを閉じる
      }
      return null;
    }
  };

  // horsesAtomから馬データを取得
  const [horses] = useAtom(horsesAtom);
  
  // 馬番から枠番へのマッピングを作成
  const horseToFrameMap = useMemo(() => {
    if (!horses || horses.length === 0) return {};
    
    const mapping: Record<number, number> = {};
    horses.forEach(horse => {
      if (horse.number && horse.frame) {
        mapping[horse.number] = horse.frame;
      }
    });
    
    return mapping;
  }, [horses]);

  // 馬番から枠番への変換関数を追加
  const getFrameNumber = (horseNumber: number): number => {
    // horseToFrameMapから枠番を取得
    if (horseToFrameMap[horseNumber]) {
      return horseToFrameMap[horseNumber];
    }
    
    // マッピングがない場合は一般的なルールを適用
    if (horseNumber <= 2) return 1;
    if (horseNumber <= 4) return 2;
    if (horseNumber <= 6) return 3;
    if (horseNumber <= 8) return 4;
    if (horseNumber <= 10) return 5;
    if (horseNumber <= 12) return 6;
    if (horseNumber <= 14) return 7;
    if (horseNumber <= 16) return 8;
    return Math.ceil(horseNumber / 2); // 一般的なルール
  };

  // 馬券が的中するかを判定する関数
  const isBetWinning = (bet: BetProposal, raceResult: any, shouldLog = false) => {
    if (!raceResult) return false;
    
    // 開発環境チェックを追加
    const devShouldLog = process.env.NODE_ENV === 'development' && shouldLog;
    
    // 券種を正規化
    const normalizedType = normalizeTicketType(bet.type);
    
    // BetProposalオブジェクトから直接必要なデータを取得
    // これは確実に設定されているはずのプロパティを優先的に使用する
    const horse1 = bet.horse1 || 0;
    const horse2 = bet.horse2 || 0;
    const horse3 = bet.horse3 || 0;
    const frame1 = bet.frame1 || 0;
    const frame2 = bet.frame2 || 0;
    const frame3 = bet.frame3 || 0;
    
    // 後方互換性のために horses 配列からも情報を抽出
    const { horses } = bet;
    
    if (devShouldLog) {
      console.group(`馬券判定: ${bet.type} (正規化: ${normalizedType})`);
      console.log('買い目:', horses);
      console.log('馬番データ:', { horse1, horse2, horse3 });
      console.log('枠番データ:', { frame1, frame2, frame3 });
    }
    
    // 馬番文字列から実際の馬番を抽出 (horseX プロパティがない古い形式の場合のフォールバック)
    const actualHorseNumbers = horses.map(h => {
      // 馬番の抽出方法を改善
      // 例: "1 ディープインパクト" → 1, "1-2" → [1, 2], "1→2→3" → [1, 2, 3]
      let result;
      if (h.includes('-')) {
        // 馬連・ワイド・3連複などのケース
        result = h.split('-').map(num => parseInt(num.trim(), 10));
      } else if (h.includes('→')) {
        // 馬単・3連単などのケース
        result = h.split('→').map(num => parseInt(num.trim(), 10));
      } else {
        // 単勝・複勝などのケース
        const match = h.match(/^(\d+)/);
        result = match ? parseInt(match[1], 10) : 0;
      }
      
      if (devShouldLog) {
        console.log(`馬番抽出: "${h}" → ${Array.isArray(result) ? JSON.stringify(result) : result}`);
      }
      
      return result;
    });
    
    // 馬番を平坦化して配列にする
    const flattenedHorseNumbers = actualHorseNumbers.flat();
    
    if (devShouldLog) {
      console.log('抽出された馬番:', flattenedHorseNumbers);
    }
    
    // URLのデータの順番で馬番を割り当てる
    const urlParams = new URLSearchParams(window.location.search);
    const winProbsParam = urlParams.get('winProbs');
    let dbIdToActualNumber: Record<number, number> = {};
    
    if (winProbsParam) {
      try {
        const winProbs = JSON.parse(decodeURIComponent(winProbsParam));
        const dbIds = Object.keys(winProbs).map(Number);
        
        // URLのデータの順番で馬番を割り当て（1から始まる）
        dbIds.forEach((dbId, index) => {
          // 例: 349→1, 350→2, ...
          dbIdToActualNumber[dbId] = index + 1;
        });
        
        if (devShouldLog) {
          console.log('データベースID→馬番変換マップ:', dbIdToActualNumber);
        }
        
      } catch (e) {
        if (process.env.NODE_ENV === 'development') {
          console.error('winProbsパラメータの解析に失敗:', e);
        }
      }
    }
    
    // レース結果のデータベースIDを実際の馬番に変換
    const actualFirst = dbIdToActualNumber[raceResult.first] || 0;
    const actualSecond = dbIdToActualNumber[raceResult.second] || 0;
    const actualThird = dbIdToActualNumber[raceResult.third] || 0;
    
    if (devShouldLog) {
      console.log(`レース結果の馬番変換: 1着=${raceResult.first}→${actualFirst}, 2着=${raceResult.second}→${actualSecond}, 3着=${raceResult.third}→${actualThird}`);
    }
    
    let result = false;
    
    // 直接格納された馬番を優先的に使用
    // 未設定の場合のみ抽出した馬番を使用
    const betHorse1 = horse1 || flattenedHorseNumbers[0] || 0;
    const betHorse2 = horse2 || flattenedHorseNumbers[1] || 0;
    const betHorse3 = horse3 || flattenedHorseNumbers[2] || 0;
    
    if (devShouldLog) {
      console.log('最終的な判定用馬番:', { betHorse1, betHorse2, betHorse3 });
    }
    
    switch (normalizedType) {
      case '単勝':
        // 選択した馬が1着になれば的中
        result = betHorse1 === actualFirst;
        if (devShouldLog) {
          console.log(`単勝判定: ${betHorse1} === ${actualFirst} → ${result}`);
        }
        break;
      
      case '複勝':
        // 選択した馬が3着以内に入れば的中
        result = [actualFirst, actualSecond, actualThird].includes(betHorse1);
        if (devShouldLog) {
          console.log(`複勝判定: ${betHorse1} が [${actualFirst}, ${actualSecond}, ${actualThird}] に含まれる → ${result}`);
        }
        break;
      
      case '馬連':
        // 選択した2頭が順不同で1着と2着になれば的中
        // betEvaluation.tsの計算と一致させる
        const umarenPositions = [actualFirst, actualSecond];
        const umarenBetHorses = [betHorse1, betHorse2].filter(h => h > 0);
        
        // 両方の馬が1着と2着になっていることを確認
        result = 
          umarenBetHorses.length === 2 && 
          umarenPositions.includes(umarenBetHorses[0]) && 
          umarenPositions.includes(umarenBetHorses[1]) &&
          umarenBetHorses[0] !== umarenBetHorses[1]; // 同じ馬を選んでいないことを確認
        
        if (devShouldLog) {
          console.log(`馬連判定: 買い目[${umarenBetHorses.join(',')}] / 結果[${umarenPositions.join(',')}] → ${result}`);
        }
        break;
      
      case '馬単':
        // 選択した2頭が指定した順番通りに1着と2着になれば的中
        // betEvaluation.tsの計算と一致させる
        result = 
          betHorse1 > 0 && 
          betHorse2 > 0 && 
          betHorse1 === actualFirst && 
          betHorse2 === actualSecond;
        
        if (devShouldLog) {
          console.log(`馬単判定: ${betHorse1}→${betHorse2} === ${actualFirst}→${actualSecond} → ${result}`);
        }
        break;
      
      case 'ワイド':
        // ワイドの的中判定を改善
        // betEvaluation.tsの計算と一致させる - 選択した2頭が順不同で3着以内に入れば的中
        const widePositions = [actualFirst, actualSecond, actualThird].filter(p => p > 0);
        const wideBetHorses = [betHorse1, betHorse2].filter(h => h > 0);
        
        // ワイドの本来の的中条件：買った2頭が共に３着以内（順不同）
        // betEvaluation.tsでは以下のシナリオを考慮：
        // 1. 1着-2着
        // 2. 1着-3着
        // 3. 2着-1着
        // 4. 2着-3着
        // 5. 3着-1着
        // 6. 3着-2着
        result = 
          wideBetHorses.length === 2 && 
          widePositions.includes(wideBetHorses[0]) && 
          widePositions.includes(wideBetHorses[1]) && 
          wideBetHorses[0] !== wideBetHorses[1]; // 同じ馬を選んでいないことを確認
        
        if (devShouldLog) {
          console.log(`ワイド判定: 買い目[${wideBetHorses.join(',')}] / 結果[${widePositions.join(',')}] → ${result}`);
        }
        break;
      
      case '3連複':
        // 3連複の的中判定を改善
        // betEvaluation.tsの計算と一致させる - 選択した3頭が順不同で3着以内に入れば的中
        const sanrenpukuPositions = [actualFirst, actualSecond, actualThird].filter(p => p > 0);
        const sanrenpukuBetHorses = [betHorse1, betHorse2, betHorse3].filter(h => h > 0);
        
        // 厳密な判定：買い目が正確に3頭であり、全ての馬が上位3着に入っていること
        // betEvaluation.tsでは全ての順列パターンを考慮：
        // 1-2-3, 1-3-2, 2-1-3, 2-3-1, 3-1-2, 3-2-1
        result = 
          sanrenpukuBetHorses.length === 3 && 
          sanrenpukuPositions.length === 3 &&
          sanrenpukuBetHorses.every(horse => sanrenpukuPositions.includes(horse)) &&
          new Set(sanrenpukuBetHorses).size === 3; // 全て異なる馬であることを確認
        
        if (devShouldLog) {
          console.log(`3連複判定: 買い目[${sanrenpukuBetHorses.join(',')}] / 結果[${sanrenpukuPositions.join(',')}] → ${result}`);
        }
        break;
      
      case '3連単':
        // 3連単の的中判定を改善
        // betEvaluation.tsの計算と一致させる - 選択した3頭が指定した順番通りに1着、2着、3着になれば的中
        result = 
          betHorse1 > 0 && 
          betHorse2 > 0 && 
          betHorse3 > 0 && 
          betHorse1 === actualFirst && 
          betHorse2 === actualSecond && 
          betHorse3 === actualThird;
        
        if (devShouldLog) {
          console.log(`3連単判定: ${betHorse1}→${betHorse2}→${betHorse3} === ${actualFirst}→${actualSecond}→${actualThird} → ${result}`);
        }
        break;
      
      case '枠連':
        if (devShouldLog) {
          console.group(`枠連判定: ${bet.type}`);
          console.log('買い目:', bet.horses);
        }
        
        // 枠番を直接取得（BetProposalのframe1, frame2プロパティから）
        let frameNumbers: number[];
        
        if (frame1 > 0 && frame2 > 0) {
          // BetProposalオブジェクトからの直接の枠番情報を使用
          frameNumbers = [frame1, frame2];
        } else {
          // 古い形式からの変換（"1-7" → [1,7] のような変換）
          frameNumbers = bet.horses.flatMap(h => {
            const match = h.match(/(\d+)-(\d+)/);
            if (match) {
              return [parseInt(match[1]), parseInt(match[2])];
            }
            return h.split('-').map(num => parseInt(num.trim()));
          });
        }
        
        if (devShouldLog) {
          console.log('使用する枠番:', frameNumbers);
          console.log('馬番→枠番マッピング:', horseToFrameMap);
        }
        
        // レース結果から1着と2着の馬番を取得（変換済みの馬番を使用）
        const firstHorse = actualFirst;
        const secondHorse = actualSecond;
        
        // 馬番から枠番への変換
        const firstFrame = getFrameNumber(firstHorse);
        const secondFrame = getFrameNumber(secondHorse);
        
        if (devShouldLog) {
          console.log('レース結果:');
          console.log(`  1着: 馬番${firstHorse} → 枠番${firstFrame}`);
          console.log(`  2着: 馬番${secondHorse} → 枠番${secondFrame}`);
          console.log('買い目枠番:', frameNumbers);
        }
        
        // 枠連の的中判定（順序は関係ない）
        // betEvaluation.tsの計算方法と一致させる
        const resultFrames = [firstFrame, secondFrame].sort((a, b) => a - b);
        const betFrames = [...frameNumbers].sort((a, b) => a - b).filter(f => f > 0);
        
        // 厳密に一致するかどうかをチェック
        result = betFrames.length === 2 && 
                resultFrames.length === 2 &&
                betFrames[0] === resultFrames[0] && 
                betFrames[1] === resultFrames[1] &&
                betFrames[0] !== betFrames[1]; // 同じ枠を選んでいない場合（例：1-1は無効）
                
        // 同枠連（1-1、2-2など）の場合の特別処理
        if (!result && betFrames[0] === betFrames[1]) {
          // 同じ枠内の馬が1着と2着を独占した場合に的中
          result = firstFrame === secondFrame && firstFrame === betFrames[0];
        }
        
        if (devShouldLog) {
          console.log('的中判定:');
          console.log(`  レース結果枠番: ${resultFrames.join('-')} (ソート済)`);
          console.log(`  買い目枠番: ${betFrames.join('-')} (ソート済)`);
          console.log(`  最終結果: ${result ? '的中' : '不的中'}`);
          console.groupEnd();
        }
        break;
      
      default:
        // 未対応の馬券種は確率に基づいて判定
        const random = Math.random();
        result = random < bet.probability;
        if (devShouldLog) {
          console.log(`未対応券種判定: 乱数=${random.toFixed(4)} < 確率=${bet.probability.toFixed(4)} → ${result}`);
        }
        break;
    }
    
    if (devShouldLog) {
      console.log(`最終判定結果: ${result ? '的中' : '不的中'}`);
      console.groupEnd();
    }
    
    return result;
  };

  // コンポーネント内に追加
  const MonteCarloResults = ({ bets }: { bets: BetProposal[] }) => {
    const { theme } = useThemeStore();
    // テーマが変わっても再計算されないようにする
    const simulationResults = useMemo(() => {
      return runMonteCarloSimulation(bets);
    }, [bets]);
    
    const { distributionData, stats, winningRates } = simulationResults;
    
    // 総投資額を計算
    const totalInvestment = bets.reduce((sum: number, bet: BetProposal) => sum + bet.stake, 0);
    
    // 収益率を計算（平均収益÷総投資額×100）
    const returnRate = (stats.mean / totalInvestment) * 100;
    
    // 的中時の平均収益率を計算
    const avgWinningRate = winningRates.length > 0
      ? winningRates.reduce((sum: number, rate: number) => sum + rate, 0) / winningRates.length
      : 0;
    
    // テーマに依存しない色の設定をメモ化
    const chartColors = useMemo(() => {
      const isPositive = stats.mean >= 0;
      return {
        strokeColor: isPositive 
          ? (theme === 'light' ? "#4f46e5" : "#10b981") 
          : (theme === 'light' ? "#e11d48" : "#ef4444"),
        fillColor: isPositive
          ? (theme === 'light' ? "#4f46e5" : "#10b981")
          : (theme === 'light' ? "#e11d48" : "#ef4444"),
        tickColor: theme === 'light' ? "#6b7280" : undefined,
        axisColor: theme === 'light' ? "#e5e7eb" : undefined,
        backgroundColor: theme === 'light' ? 'rgba(255, 255, 255, 0.95)' : 'rgba(0, 0, 0, 0.7)',
        borderColor: theme === 'light' ? '1px solid rgba(0, 0, 0, 0.1)' : '1px solid rgba(255, 255, 255, 0.2)',
        textColor: theme === 'light' ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.9)',
        labelColor: theme === 'light' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.7)',
        // 統計情報表示用の色を追加
        statsBgColor: theme === 'light' ? "bg-gray-50 border border-gray-100" : "bg-background/50",
        statsMutedText: theme === 'light' ? "text-gray-500" : "text-muted-foreground",
        statsConfidenceBackground: theme === 'light' 
          ? 'linear-gradient(to right, #f0f9ff, #e0f2fe, #d8f3dc, #c6f6d5)' 
          : 'linear-gradient(to right, rgba(0,0,0,0.2), rgba(16, 185, 129, 0.2))',
        winRateTextColor: theme === 'light' ? "text-indigo-600" : "",
        profitTextColor: isPositive 
          ? (theme === 'light' ? "text-green-600" : "") 
          : (theme === 'light' ? "text-red-600" : ""),
        returnRateTextColor: returnRate >= 0 
          ? (theme === 'light' ? "text-green-600" : "")
          : (theme === 'light' ? "text-red-600" : ""),
        confidenceTextColorMin: theme === 'light'
          ? stats.confidenceInterval[0] < 0 ? "text-red-600 font-medium" : "text-green-600 font-medium"
          : "",
        confidenceTextColorMax: theme === 'light' ? "text-green-600 font-medium" : "",
        chartContainerStyle: theme === 'light'
          ? "bg-white/90 border border-gray-200 shadow-sm"
          : ""
      };
    }, [stats.mean, stats.confidenceInterval, returnRate, theme]);
    
    // 値ごとの色をテーマに合わせて設定する関数
    const getValueColor = useCallback((value: number) => {
      if (theme === 'light') {
        return value >= 0 
          ? value > 10000 ? '#4f46e5' : value > 5000 ? '#6366f1' : '#818cf8' 
          : value < -10000 ? '#e11d48' : value < -5000 ? '#f43f5e' : '#fb7185';
      } else {
        return value >= 0 
          ? value > 10000 ? '#10b981' : value > 5000 ? '#34d399' : '#6ee7b7'
          : value < -10000 ? '#ef4444' : value < -5000 ? '#f87171' : '#fca5a5';
      }
    }, [theme]);
    
    return (
      <div className="space-y-4">
        <div className={cn(
          "h-48 w-full rounded-lg overflow-hidden max-sm:h-36",
          chartColors.chartContainerStyle
        )}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={distributionData}
              margin={{ 
                top: 10, 
                right: 10, 
                left: window.innerWidth < 640 ? 0 : 10, 
                bottom: 0 
              }}
            >
              <defs>
                <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColors.fillColor} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={chartColors.fillColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="value" 
                tickFormatter={(value) => `+${value.toLocaleString()}円`}
                tick={{ fontSize: 10, fill: chartColors.tickColor }}
                axisLine={{ stroke: chartColors.axisColor }}
                tickLine={{ stroke: chartColors.axisColor }}
                interval="preserveStartEnd" // 最初と最後のティックを必ず表示
                domain={[0, 'auto']} // 0円から始まるように固定
              />
              <YAxis
                tickFormatter={(value) => `${value.toFixed(1)}%`}
                tick={{ fontSize: 10, fill: chartColors.tickColor }}
                axisLine={{ stroke: chartColors.axisColor }}
                tickLine={{ stroke: chartColors.axisColor }}
                domain={[0, 'auto']} 
                allowDataOverflow={false}
              />
              <Tooltip 
                formatter={(value: any, name: string) => {
                  if (name === 'percentage') {
                    return [`${Number(value).toFixed(1)}%`, '確率'];
                  } else {
                    // 収益値に基づいて色を設定（数字部分のみ）
                    const color = getValueColor(value);
                    return [
                      <span style={{ color }}>
                        {`+${value.toLocaleString()}円`}
                      </span>, 
                      '収益'
                    ];
                  }
                }}
                labelFormatter={(value) => {
                  // 収益値に基づいて色を設定（数字部分のみ）
                  const color = getValueColor(value);
                  return <span>
                    収益: <span style={{ color }}>{`+${value.toLocaleString()}円`}</span>
                  </span>;
                }}
                contentStyle={{
                  backgroundColor: chartColors.backgroundColor,
                  backdropFilter: 'blur(8px)',
                  border: chartColors.borderColor,
                  borderRadius: '0.5rem',
                  padding: '1rem',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                }}
                itemStyle={{
                  fontSize: '0.875rem',
                  padding: '0.25rem 0',
                  color: chartColors.textColor
                }}
                labelStyle={{
                  fontSize: '0.75rem',
                  marginBottom: '0.5rem',
                  color: chartColors.labelColor
                }}
              />
              <Area 
                type="monotone" 
                dataKey="percentage"
                stroke={chartColors.strokeColor}
                fillOpacity={1} 
                fill={`url(#colorProfit)`} 
                isAnimationActive={true}
                animationDuration={600}
                animationEasing="ease-out"
                connectNulls={false} // 0%の点はつながないように
                baseValue={0} // ベース値を0に設定
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className={cn(
            "p-2 rounded-lg max-sm:p-1.5",
            chartColors.statsBgColor
          )}>
            <div className={cn(
              "text-xs max-sm:text-[11px]",
              chartColors.statsMutedText
            )}>勝率</div>
            <div className={cn(
              "text-lg font-bold max-sm:text-base",
              chartColors.winRateTextColor
            )}>{(stats.winRate * 100).toFixed(1)}%</div>
          </div>
          <div className={cn(
            "p-2 rounded-lg max-sm:p-1.5",
            chartColors.statsBgColor
          )}>
            <div className={cn(
              "text-xs max-sm:text-[11px] flex items-center justify-center gap-1",
              chartColors.statsMutedText
            )}>
              平準オッズ
              <InfoTooltip 
                content="買い目が的中したときの平均配当倍率です。的中時払戻金を投資額で割った値の平均です。"
                iconSize="sm"
              />
            </div>
            <div className={cn(
              "text-lg font-bold max-sm:text-base",
              chartColors.returnRateTextColor
            )}>
              ×{avgWinningRate.toFixed(1)}
            </div>
          </div>
          <div className={cn(
            "p-2 rounded-lg max-sm:p-1.5",
            chartColors.statsBgColor
          )}>
            <div className={cn(
              "text-xs max-sm:text-[11px] flex items-center justify-center gap-1",
              chartColors.statsMutedText
            )}>
              平準期待値
              <InfoTooltip 
                content="勝率と平準オッズを掛け合わせた値です。1.0以上であれば長期的に利益が期待できます。"
                iconSize="sm"
              />
            </div>
            <div className={cn(
              "text-lg font-bold max-sm:text-base",
              chartColors.profitTextColor
            )}>
              {(stats.winRate * avgWinningRate).toFixed(2)}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className={cn(
      "overflow-hidden",
      theme === 'light'
        ? "bg-gradient-to-b from-white to-gray-50 border border-gray-200 shadow-sm"
        : "bg-gradient-to-br from-background to-primary/5"
    )} data-card-container>
      <CardHeader className={cn(
        "relative pb-2 border-b",
        theme === 'light'
          ? "border-gray-200 bg-white"
          : "border-border/50"
      )}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CardTitle className={cn(
              "text-base",
              theme === 'light'
                ? "font-semibold text-gray-800"
                : "font-medium"
            )}>{strategy.description}</CardTitle>
            {strategy.summary.riskLevel === 'AI_OPTIMIZED' && (
              <span className={cn(
                "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                theme === 'light'
                  ? "bg-indigo-50 text-indigo-700"
                  : "bg-purple-900/50 text-purple-200"
              )}>
                <Sparkles className="h-3 w-3 mr-1" />
                AI最適化
              </span>
            )}
            {strategy.summary.riskLevel === 'USER_SELECTED' && (
              <span className={cn(
                "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                theme === 'light'
                  ? "bg-blue-50 text-blue-700"
                  : "bg-blue-900/50 text-blue-200"
              )}>
                <MousePointer className="h-3 w-3 mr-1" />
                手動選択
              </span>
            )}
          </div>
        </div>
      </CardHeader>

      <TooltipProvider>
        <CardContent className="p-2">
          <div className="space-y-2" ref={tableRef}>
            {/* Masonryレイアウトを適用 - 券種数に応じて列数を調整 */}
            <Masonry
              breakpointCols={{
                default: Math.min(
                  Object.keys(sortedBets.reduce((acc, bet) => {
                    const type = normalizeTicketType(bet.type);
                    if (!acc[type]) acc[type] = [];
                    acc[type].push(bet);
                    return acc;
                  }, {} as Record<string, typeof sortedBets>)).length, 
                  4
                ),    // 券種数と4の小さい方（最大4列）
                1100: Math.min(
                  Object.keys(sortedBets.reduce((acc, bet) => {
                    const type = normalizeTicketType(bet.type);
                    if (!acc[type]) acc[type] = [];
                    acc[type].push(bet);
                    return acc;
                  }, {} as Record<string, typeof sortedBets>)).length, 
                  3
                ),    // 1100px以下でも同様
                768: Math.min(
                  Object.keys(sortedBets.reduce((acc, bet) => {
                    const type = normalizeTicketType(bet.type);
                    if (!acc[type]) acc[type] = [];
                    acc[type].push(bet);
                    return acc;
                  }, {} as Record<string, typeof sortedBets>)).length, 
                  2
                ),    // タブレット以下では最大2列
                400: Math.min(
                  Object.keys(sortedBets.reduce((acc, bet) => {
                    const type = normalizeTicketType(bet.type);
                    if (!acc[type]) acc[type] = [];
                    acc[type].push(bet);
                    return acc;
                  }, {} as Record<string, typeof sortedBets>)).length, 
                  2
                )     // モバイルでも最低2列
              }}
              className="flex -ml-3 w-auto"
              columnClassName="pl-3 bg-clip-padding"
            >
              {Object.entries(sortedBets.reduce((acc, bet) => {
                const type = normalizeTicketType(bet.type);
                if (!acc[type]) acc[type] = [];
                acc[type].push(bet);
                return acc;
              }, {} as Record<string, typeof sortedBets>)).map(([betType, bets]) => (
                <Card key={betType} className={cn(
                  "mb-3",
                  theme === 'light'
                    ? "bg-white border border-gray-200 shadow-sm"
                    : "bg-background/50 backdrop-blur-sm"
                )}>
                  <CardHeader className={cn(
                    "py-2 px-3 border-b max-sm:py-1.5 max-sm:px-2",
                    theme === 'light'
                      ? "border-gray-100 bg-gradient-to-r from-gray-50 to-white"
                      : ""
                  )}>
                    <div className="flex justify-between items-center">
                      <CardTitle className={cn(
                        "text-base min-w-[4rem] max-sm:text-sm",
                        theme === 'light'
                          ? "font-bold text-gray-800"
                          : "font-medium"
                      )}>
                        {betType}
                      </CardTitle>
                      
                      <div className="flex items-center gap-2 flex-shrink">
                        <div className="flex items-center flex-wrap justify-end gap-1.5 text-xs max-sm:text-[11px]">
                          <span className={cn(
                            "font-medium whitespace-nowrap",
                            theme === 'light'
                              ? "text-gray-600"
                              : ""
                          )}>
                            {bets.length}点
                          </span>
                          <span className={cn(
                            "font-medium whitespace-nowrap",
                            theme === 'light'
                              ? "text-indigo-600"
                              : ""
                          )}>
                            {bets.reduce((sum, bet) => sum + bet.stake, 0).toLocaleString()}円
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className={cn(
                    "p-2 max-sm:p-1.5",
                    theme === 'light'
                      ? "bg-white"
                      : ""
                  )}>
                    <div className={cn(
                      "space-y-1.5 max-sm:space-y-1",
                      theme === 'light'
                        ? "divide-y divide-gray-50"
                        : ""
                    )}>
                      {bets.map((bet, index) => (
                        <div key={index} className={
                          theme === 'light'
                            ? "pt-1 first:pt-0"
                            : ""
                        }>
                          <Popover>
                            <PopoverTrigger asChild>
                              <div className={cn(
                                "relative overflow-hidden p-2 max-sm:p-1.5 rounded-md transition-all duration-300 ease-out cursor-pointer",
                                theme === 'light'
                                  ? "border border-gray-100 hover:border-indigo-200 hover:shadow-sm hover:bg-indigo-50/30"
                                  : "border border-transparent hover:border-primary/20 hover:shadow-sm"
                              )}>
                                {/* EVに基づく背景色 */}
                                <div className={`
                                  absolute inset-0 
                                  ${theme === 'light'
                                    ? (() => {
                                      const ev = (bet.odds || Number(bet.expectedReturn / bet.stake)) * bet.probability;
                                      if (ev > 1.5) return 'bg-emerald-50 hover:bg-emerald-100';
                                      if (ev > 1.2) return 'bg-lime-50 hover:bg-lime-100';
                                      if (ev > 1.0) return 'bg-amber-50 hover:bg-amber-100';
                                      return 'bg-gray-50 hover:bg-gray-100';
                                    })()
                                    : getEvBackgroundClass(bet.odds || Number(bet.expectedReturn / bet.stake), bet.probability)
                                  }
                                `} />

                                {/* グラデーション背景レイヤー - ライトモードではより控えめに */}
                                <div className={cn(
                                  "absolute inset-0 transition-opacity duration-300",
                                  theme === 'light'
                                    ? "bg-gradient-to-r from-gray-50/50 via-white/80 to-transparent"
                                    : "bg-gradient-to-r from-primary/10 via-background/5 to-transparent"
                                )} />
                                
                                {/* コンテンツレイヤー */}
                                <div className="relative">
                                  <div className="grid grid-cols-5 gap-2 max-sm:gap-1">
                                    <span className={cn(
                                      "font-medium max-sm:text-[14px] max-sm:whitespace-nowrap max-sm:overflow-x-auto max-sm:scrollbar-hide col-span-3",
                                      theme === 'light'
                                        ? "text-gray-800"
                                        : ""
                                    )}>
                                      {formatHorseNumbers(bet.type, bet.horses)}
                                    </span>
                                    <div className="col-span-2 flex items-center justify-end gap-1">
                                      <span className={`max-sm:text-[14px] ${getOddsColorClass(bet.odds || Number(bet.expectedReturn / bet.stake))}`}>
                                        ×{bet.odds ? bet.odds.toFixed(1) : Number(bet.expectedReturn / bet.stake).toFixed(1)}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-5 gap-2 max-sm:gap-1 text-xs max-sm:text-[11px] mt-1">
                                    <span className={`${getProbabilityColorClass(bet.probability)} col-span-3`}>
                                      {(bet.probability * 100).toFixed(1)}%
                                    </span>
                                    <div className="col-span-2 text-right space-y-0.5">
                                      <span className={cn(
                                        "font-medium",
                                        theme === 'light'
                                          ? "text-indigo-600"
                                          : ""
                                      )}>
                                        {bet.stake.toLocaleString()}円
                                      </span>
                                      <span className={cn(
                                        "block text-[10px] max-sm:text-[9px]",
                                        theme === 'light'
                                          ? "text-gray-500"
                                          : "text-muted-foreground"
                                      )}>
                                        {(Math.round(bet.expectedReturn / 10) * 10).toLocaleString()}円
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </PopoverTrigger>
                            <PopoverContent 
                              className={cn(
                                "w-[280px] sm:w-80 rounded-lg shadow-lg p-4",
                                theme === 'light'
                                  ? "bg-white/95 backdrop-blur-sm border border-gray-200"
                                  : "border border-primary/20 bg-black/70 backdrop-blur-sm"
                              )} 
                              sideOffset={5}
                            >
                              <div className="space-y-2">
                                <h4 className={cn(
                                  "text-sm font-medium",
                                  theme === 'light'
                                    ? "text-indigo-700"
                                    : "text-primary/90"
                                )}>選択理由</h4>
                                <div className="relative overflow-hidden">
                                  <div className={cn(
                                    "absolute inset-0 pointer-events-none",
                                    theme === 'light'
                                      ? "bg-gradient-to-r from-indigo-50/50 to-transparent opacity-30"
                                      : "bg-gradient-to-r from-primary/5 to-transparent opacity-30"
                                  )} />
                                  <p className={cn(
                                    "text-sm leading-relaxed relative",
                                    theme === 'light'
                                      ? "text-gray-700"
                                      : "text-white/90"
                                  )}>
                                    {bet.reason || '理由なし'}
                                  </p>
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </Masonry>

            {/* モンテカルロシミュレーション結果を表示 */}
            <div className={cn(
              "mt-6 pt-4 border-t max-sm:mt-4 max-sm:pt-3",
              theme === 'light'
                ? "border-gray-200"
                : "border-border/30"
            )}>
              <h3 className={cn(
                "text-sm font-medium mb-3 flex items-center gap-2 max-sm:text-[11px] max-sm:mb-2",
                theme === 'light'
                  ? "text-gray-800"
                  : ""
              )}>
                <LineChart className={
                  theme === 'light'
                    ? "h-4 w-4 text-indigo-600 max-sm:h-3 max-sm:w-3"
                    : "h-4 w-4 text-primary max-sm:h-3 max-sm:w-3"
                } />
                収益分布シミュレーション
              </h3>
              <MonteCarloResults bets={sortedBets} />
            </div>
          </div>
        </CardContent>
      </TooltipProvider>
    </Card>
  );
}); 