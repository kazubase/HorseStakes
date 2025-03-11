import { memo, useMemo, useRef, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { GeminiStrategy } from "@/lib/geminiApi";
import { optimizeBetAllocation } from "@/lib/betOptimizer";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import html2canvas from 'html2canvas';
import { Camera, Sparkles } from 'lucide-react';
import type { BetProposal } from "@/lib/betEvaluation";
import { InfoIcon } from "lucide-react";
import { useAtom } from 'jotai';
import { bettingOptionsStatsAtom } from '@/stores/bettingStrategy';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import Masonry from 'react-masonry-css';

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
}: BettingStrategyTableProps) {
  // レンダリング回数の追跡
  const renderCount = useRef(0);
  
  // 最適化計算の結果をメモ化
  const optimizationResult = useMemo(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Using provided strategy recommendations...', {
        recommendationsCount: strategy.recommendations.length,
        budget: totalBudget,
        renderCount: renderCount.current,
        // デバッグ用：reasonプロパティを確認
        reasons: strategy.recommendations.map(rec => rec.reason)
      });
    }
    
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
    
    // その他の馬券種別は従来通りの表示
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
    if (optionsStats) {
      // オッズ値に対するパーセンタイルを計算
      const percentile = optionsStats.options
        .map(o => o.odds)
        .filter(v => v <= odds)
        .length / optionsStats.options.length;
      
      if (percentile > 0.8) return 'text-green-500';
      if (percentile > 0.6) return 'text-green-600';
      if (percentile > 0.4) return 'text-yellow-500';
      if (percentile > 0.2) return 'text-yellow-600';
      return 'text-yellow-600';
    } else {
      // 統計情報がない場合は固定値で判断
      if (odds > 100) return 'text-green-400';
      if (odds > 50) return 'text-green-500';
      if (odds > 20) return 'text-green-600';
      if (odds > 10) return 'text-yellow-500';
      if (odds > 5) return 'text-yellow-600';
      return 'text-muted-foreground';
    }
  };

  // 確率の色分けロジック - 統計情報があれば使用
  const getProbabilityColorClass = (probability: number) => {
    if (optionsStats) {
      // 確率に対するパーセンタイルを計算
      const percentile = optionsStats.options
        .map(o => o.probability)
        .filter(v => v <= probability)
        .length / optionsStats.options.length;
      
      if (percentile > 0.8) return 'text-green-500';
      if (percentile > 0.6) return 'text-green-600';
      if (percentile > 0.4) return 'text-yellow-500';
      if (percentile > 0.2) return 'text-yellow-600';
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
            className="w-[280px] sm:w-80 rounded-lg border border-primary/20 bg-black/70 backdrop-blur-sm p-4 shadow-lg" 
            sideOffset={5}
          >
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-primary/90">選択理由</h4>
              <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-30 pointer-events-none" />
                <p className="text-sm text-white/90 leading-relaxed relative">
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
      console.error('スクリーンショットの作成に失敗:', error);
    }
  };

  // モンテカルロシミュレーション関数を修正
  const runMonteCarloSimulation = (bets: BetProposal[], iterations: number = 10000) => {
    // 最初の1回だけログを出力するフラグ
    let loggedFirstSimulation = false;
    const results: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      // 最初の1回目だけログを出力
      const shouldLog = process.env.NODE_ENV === 'development' && i === 0 && !loggedFirstSimulation;
      
      let totalReturn = 0;
      
      // 各シミュレーションでレース結果を生成
      const raceResult = simulateRaceResult(shouldLog);
      
      // 各馬券について当たりハズレを判定
      bets.forEach(bet => {
        // レース結果に基づいて馬券の的中を判定
        if (isBetWinning(bet, raceResult, shouldLog)) {
          // 当たりの場合は払戻金を加算
          totalReturn += (bet.odds || 0) * bet.stake;
        }
      });
      
      // 投資額を引いて純利益を計算
      const totalInvestment = bets.reduce((sum, bet) => sum + bet.stake, 0);
      const netProfit = totalReturn - totalInvestment;
      
      results.push(netProfit);
      
      // 最初の1回をログ出力したらフラグを立てる
      if (shouldLog) {
        loggedFirstSimulation = true;
      }
    }
    
    // 結果を昇順にソート
    results.sort((a, b) => a - b);
    
    // 分布データの生成を改善
    const distributionData: DistributionDataPoint[] = [];
    
    // 最小値と最大値から適切なバケット幅を計算
    const range = results[results.length - 1] - results[0];
    const bucketCount = 20; // バケット数を固定
    const bucketWidth = Math.ceil(range / bucketCount / 1000) * 1000; // 1000円単位に丸める
    
    // バケットの範囲を設定
    const bucketRanges: number[] = [];
    let currentValue = Math.floor(results[0] / 1000) * 1000; // 1000円単位で切り捨て
    
    while (currentValue <= results[results.length - 1]) {
      bucketRanges.push(currentValue);
      currentValue += bucketWidth;
    }
    
    // 各バケットのカウントを計算
    bucketRanges.forEach((bucketStart, i) => {
      const bucketEnd = bucketRanges[i + 1] || results[results.length - 1];
      const count = results.filter(r => r >= bucketStart && r < bucketEnd).length;
      
      if (count > 0) { // カウントが0のバケットは除外
        distributionData.push({
          value: bucketStart,
          count,
          percentage: (count / iterations) * 100
        });
      }
    });

    // 統計情報を計算
    const mean = results.reduce((sum, val) => sum + val, 0) / results.length;
    const median = results[Math.floor(results.length / 2)];
    const min = results[0];
    const max = results[results.length - 1];
    
    // 勝率を計算（利益が0以上の割合）
    const winRate = results.filter(r => r >= 0).length / results.length;
    
    // 95%信頼区間
    const lowerBound = results[Math.floor(results.length * 0.025)];
    const upperBound = results[Math.floor(results.length * 0.975)];
    
    return {
      distributionData,
      stats: {
        mean,
        median,
        min,
        max,
        winRate,
        confidenceInterval: [lowerBound, upperBound]
      }
    };
  };

  // レース結果をシミュレートする関数
  const simulateRaceResult = (shouldLog = false) => {
    const urlParams = new URLSearchParams(window.location.search);
    const winProbsParam = urlParams.get('winProbs');
    const placeProbsParam = urlParams.get('placeProbs');
    
    try {
      const winProbs = JSON.parse(decodeURIComponent(winProbsParam || '{}'));
      const placeProbs = JSON.parse(decodeURIComponent(placeProbsParam || '{}'));
      const horseNumbers = Object.keys(winProbs).map(Number);
      
      // 勝率に基づいて1着をシミュレート
      const firstPlaceRand = Math.random() * 100;
      let accumWinProb = 0;
      let first = horseNumbers[0];
      
      for (const horseNumber of horseNumbers) {
        accumWinProb += winProbs[horseNumber] || 0;
        if (firstPlaceRand <= accumWinProb) {
          first = horseNumber;
          break;
        }
      }
      
      // 1着を除外して、複勝率に基づいて2,3着をシミュレート
      const remainingHorses = horseNumbers.filter(h => h !== first);
      const adjustedPlaceProbs: Record<number, number> = {};
      
      // 複勝率を正規化（1着を除いた馬で100%になるように）
      let totalPlaceProb = 0;
      remainingHorses.forEach(horse => {
        totalPlaceProb += placeProbs[horse] || 0;
      });
      
      remainingHorses.forEach(horse => {
        adjustedPlaceProbs[horse] = ((placeProbs[horse] || 0) / totalPlaceProb) * 100;
      });
      
      // 2着のシミュレート
      const secondPlaceRand = Math.random() * 100;
      let accumPlaceProb = 0;
      let second = remainingHorses[0];
      
      for (const horseNumber of remainingHorses) {
        accumPlaceProb += adjustedPlaceProbs[horseNumber];
        if (secondPlaceRand <= accumPlaceProb) {
          second = horseNumber;
          break;
        }
      }
      
      // 3着のシミュレート（1,2着を除外して同様の処理）
      const finalHorses = remainingHorses.filter(h => h !== second);
      const finalPlaceProbs: Record<number, number> = {};
      
      let finalTotalProb = 0;
      finalHorses.forEach(horse => {
        finalTotalProb += placeProbs[horse] || 0;
      });
      
      finalHorses.forEach(horse => {
        finalPlaceProbs[horse] = ((placeProbs[horse] || 0) / finalTotalProb) * 100;
      });
      
      const thirdPlaceRand = Math.random() * 100;
      let accumFinalProb = 0;
      let third = finalHorses[0];
      
      for (const horseNumber of finalHorses) {
        accumFinalProb += finalPlaceProbs[horseNumber];
        if (thirdPlaceRand <= accumFinalProb) {
          third = horseNumber;
          break;
        }
      }
      
      const result = {
        first,
        second,
        third,
        fullResult: [first, second, third, ...finalHorses.filter(h => h !== third)]
      };
      
      return result;
      
    } catch (e) {
      console.error('確率パラメータの解析に失敗:', e);
      return null;
    }
  };

  // 馬券が的中するかを判定する関数
  const isBetWinning = (bet: BetProposal, raceResult: any, shouldLog = false) => {
    if (!raceResult) return false;
    
    const { type, horses } = bet;
    
    // 馬番文字列から実際の馬番を抽出
    const actualHorseNumbers = horses.map(h => {
      // 馬番の抽出方法を改善
      // 例: "1 ディープインパクト" → 1, "1-2" → [1, 2], "1→2→3" → [1, 2, 3]
      if (h.includes('-')) {
        // 馬連・ワイド・3連複などのケース
        return h.split('-').map(num => parseInt(num.trim(), 10));
      } else if (h.includes('→')) {
        // 馬単・3連単などのケース
        return h.split('→').map(num => parseInt(num.trim(), 10));
      } else {
        // 単勝・複勝などのケース
        const match = h.match(/^(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      }
    });
    
    // 馬番を平坦化して配列にする
    const flattenedHorseNumbers = actualHorseNumbers.flat();
    
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
        
      } catch (e) {
        console.error('winProbsパラメータの解析に失敗:', e);
      }
    }
    
    // レース結果のデータベースIDを実際の馬番に変換
    const actualFirst = dbIdToActualNumber[raceResult.first] || 0;
    const actualSecond = dbIdToActualNumber[raceResult.second] || 0;
    const actualThird = dbIdToActualNumber[raceResult.third] || 0;
    
    switch (type) {
      case '単勝':
        return flattenedHorseNumbers[0] === actualFirst;
      
      case '複勝':
        return [actualFirst, actualSecond, actualThird].includes(flattenedHorseNumbers[0]);
      
      case '馬連':
        return (
          (flattenedHorseNumbers[0] === actualFirst && flattenedHorseNumbers[1] === actualSecond) ||
          (flattenedHorseNumbers[0] === actualSecond && flattenedHorseNumbers[1] === actualFirst)
        );
      
      case '馬単':
        return flattenedHorseNumbers[0] === actualFirst && flattenedHorseNumbers[1] === actualSecond;
      
      case 'ワイド':
        const positions = [actualFirst, actualSecond, actualThird];
        // ワイドは2頭選んで、その2頭が3着以内に入れば的中
        return (
          positions.includes(flattenedHorseNumbers[0]) && 
          positions.includes(flattenedHorseNumbers[1])
        );
      
      case '3連複':
        return (
          [actualFirst, actualSecond, actualThird].every(pos => 
            flattenedHorseNumbers.includes(pos)
          ) && 
          flattenedHorseNumbers.length === 3
        );
      
      case '3連単':
        return (
          flattenedHorseNumbers[0] === actualFirst &&
          flattenedHorseNumbers[1] === actualSecond &&
          flattenedHorseNumbers[2] === actualThird
        );
      
      default:
        // 未対応の馬券種は確率に基づいて判定
        return Math.random() < bet.probability;
    }
  };

  // コンポーネント内に追加
  const MonteCarloResults = ({ bets }: { bets: BetProposal[] }) => {
    const { distributionData, stats } = useMemo(() => {
      return runMonteCarloSimulation(bets);
    }, [bets]);
    
    return (
      <div className="space-y-4">
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={distributionData}
              margin={{ top: 10, right: 10, left: 30, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorLoss" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="value" 
                tickFormatter={(value) => `${value >= 0 ? '+' : ''}${value.toLocaleString()}円`}
                tick={{ fontSize: 10 }}
                interval="preserveStartEnd" // 最初と最後のティックを必ず表示
              />
              <YAxis
                tickFormatter={(value) => `${value.toFixed(1)}%`}
                tick={{ fontSize: 10 }}
                domain={[0, 'auto']}
              />
              <Tooltip 
                formatter={(value: any, name: string) => [
                  name === 'percentage' 
                    ? `${Number(value).toFixed(1)}%` 
                    : `${value >= 0 ? '+' : ''}${value.toLocaleString()}円`,
                  name === 'percentage' ? '確率' : '収益'
                ]}
                labelFormatter={(value) => `収益: ${value >= 0 ? '+' : ''}${value.toLocaleString()}円`}
                contentStyle={{
                  backgroundColor: 'rgba(0, 0, 0, 0.3)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '0.5rem',
                  padding: '1rem',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                }}
                itemStyle={{
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: '0.875rem',
                  padding: '0.25rem 0'
                }}
                labelStyle={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontSize: '0.75rem',
                  marginBottom: '0.5rem'
                }}
              />
              <Area 
                type="monotone" 
                dataKey="percentage"
                stroke={stats.mean >= 0 ? "#10b981" : "#ef4444"}
                fillOpacity={1} 
                fill={`url(#${stats.mean >= 0 ? 'colorProfit' : 'colorLoss'})`} 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-background/50 p-2 rounded-lg">
            <div className="text-xs text-muted-foreground">勝率</div>
            <div className="text-lg font-bold">{(stats.winRate * 100).toFixed(1)}%</div>
          </div>
          <div className="bg-background/50 p-2 rounded-lg">
            <div className="text-xs text-muted-foreground">平均収益</div>
            <div className="text-lg font-bold">
              {stats.mean >= 0 ? '+' : ''}{Math.round(stats.mean).toLocaleString()}円
            </div>
          </div>
          <div className="bg-background/50 p-2 rounded-lg">
            <div className="text-xs text-muted-foreground">最大収益</div>
            <div className="text-lg font-bold">
              {stats.max >= 0 ? '+' : ''}{Math.round(stats.max).toLocaleString()}円
            </div>
          </div>
        </div>
        
        <div className="bg-background/50 p-3 rounded-lg">
          <div className="text-xs text-muted-foreground mb-2">95%信頼区間</div>
          <div className="relative h-6 bg-background rounded-full overflow-hidden">
            <div 
              className="absolute h-full bg-gradient-to-r from-yellow-500/50 to-green-500/50"
              style={{ 
                left: '0%', 
                width: '100%' 
              }}
            />
            <div className="absolute inset-0 flex items-center justify-between px-2 text-xs">
              <span>{Math.round(stats.confidenceInterval[0]).toLocaleString()}円</span>
              <span>{Math.round(stats.confidenceInterval[1]).toLocaleString()}円</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="overflow-hidden bg-gradient-to-br from-background to-primary/5" data-card-container>
      <CardHeader className="relative pb-2 border-b border-border/50">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-medium">{strategy.description}</CardTitle>
            {strategy.summary.riskLevel === 'AI_OPTIMIZED' && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200">
                <Sparkles className="h-3 w-3 mr-1" />
                AI最適化
              </span>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={captureTable}
            className="h-8 w-8 p-0"
          >
            <Camera className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-2">
        <div className="space-y-3" ref={tableRef}>
          {/* 凡例を追加 */}
          <div className="bg-secondary/30 p-2 rounded-lg text-xs text-muted-foreground">
            <div className="grid grid-cols-2 gap-2 mb-1">
              <div>買い目</div>
              <div className="text-right">オッズ</div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>的中率</div>
              <div className="text-right">投資額</div>
            </div>
          </div>

          {/* Masonryレイアウトを適用 */}
          <Masonry
            breakpointCols={{
              default: 3,    // デフォルト3列
              1100: 3,       // 1100px以下でも3列
              768: 2,        // タブレット以下で2列
              400: 2         // モバイルでも2列を維持
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
              <Card key={betType} className="bg-background/50 backdrop-blur-sm mb-3">
                <CardHeader className="py-2 px-3 border-b">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-base font-medium min-w-[4rem]">
                      {betType}
                    </CardTitle>
                    
                    <div className="flex items-center gap-2 flex-shrink">
                      <div className="flex items-center flex-wrap justify-end gap-1.5 text-xs">
                        <span className="font-medium whitespace-nowrap">
                          {bets.length}点
                        </span>
                        <span className="font-medium whitespace-nowrap">
                          {bets.reduce((sum, bet) => sum + bet.stake, 0).toLocaleString()}円
                        </span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-2">
                  <div className="space-y-1.5">
                    {bets.map((bet, index) => (
                      <div key={index}>
                        <Popover>
                          <PopoverTrigger asChild>
                            <div className={`
                              relative overflow-hidden
                              p-2 rounded-md 
                              transition-all duration-300 ease-out
                              cursor-pointer
                              border border-transparent
                              hover:border-primary/20 hover:shadow-sm
                              hover:scale-[1.01] hover:-translate-y-0.5
                            `}>
                              {/* EVに基づく背景色 */}
                              <div className={`
                                absolute inset-0 
                                ${getEvBackgroundClass(bet.odds || Number(bet.expectedReturn / bet.stake), bet.probability)}
                              `} />

                              {/* グラデーション背景レイヤー */}
                              <div className="
                                absolute inset-0 
                                bg-gradient-to-r from-primary/10 via-background/5 to-transparent 
                                transition-opacity duration-300
                                ${isSelected(option) ? 'opacity-0' : 'opacity-100'}
                              " />
                              
                              {/* コンテンツレイヤー */}
                              <div className="relative">
                                <div className="grid grid-cols-2 gap-2">
                                  <span className="font-medium">
                                    {formatHorseNumbers(bet.type, bet.horses)}
                                  </span>
                                  <div className="flex items-center justify-end gap-1">
                                    <span className={`font-bold ${getOddsColorClass(bet.odds || Number(bet.expectedReturn / bet.stake))}`}>
                                      ×{bet.odds ? bet.odds.toFixed(1) : Number(bet.expectedReturn / bet.stake).toFixed(1)}
                                    </span>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs mt-1">
                                  <span className={getProbabilityColorClass(bet.probability)}>
                                    {(bet.probability * 100).toFixed(1)}%
                                  </span>
                                  <div className="text-right space-y-0.5">
                                    <span className="font-medium">
                                      {bet.stake.toLocaleString()}円
                                    </span>
                                    <span className="block text-muted-foreground text-[10px]">
                                      {(Math.round(bet.expectedReturn / 10) * 10).toLocaleString()}円
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </PopoverTrigger>
                          <PopoverContent 
                            className="w-[280px] sm:w-80 rounded-lg border border-primary/20 bg-black/70 backdrop-blur-sm p-4 shadow-lg" 
                            sideOffset={5}
                          >
                            <div className="space-y-2">
                              <h4 className="text-sm font-medium text-primary/90">選択理由</h4>
                              <div className="relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-30 pointer-events-none" />
                                <p className="text-sm text-white/90 leading-relaxed relative">
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

          {/* 集計情報 */}
          <div className="grid grid-cols-3 gap-2 mt-3">
            <div className="bg-background/50 p-2 rounded-lg text-center">
              <div className="text-xs text-muted-foreground">総投資額</div>
              <div className="text-lg font-bold">
                {totals.totalInvestment.toLocaleString()}円
              </div>
            </div>
            <div className="bg-background/50 p-2 rounded-lg text-center">
              <div className="text-xs text-muted-foreground">推定期待収益</div>
              <div className="text-lg font-bold">
                {Math.round(totals.totalExpectedReturn).toLocaleString()}円
              </div>
            </div>
            <div className="bg-background/50 p-2 rounded-lg text-center">
              <div className="text-xs text-muted-foreground">期待収益率</div>
              <div className="text-lg font-bold">
                +{totals.expectedReturnRate}%
              </div>
            </div>
          </div>

          {/* モンテカルロシミュレーション結果を表示 */}
          <div className="mt-6 pt-4 border-t border-border/30">
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              収益分布シミュレーション
            </h3>
            <MonteCarloResults bets={sortedBets} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}); 