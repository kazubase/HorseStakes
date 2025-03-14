import { memo, useMemo, useRef, useEffect } from "react";
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
      
      if (shouldLog) {
        console.group('モンテカルロシミュレーション - 1回目の実行');
        console.log('レース結果:', raceResult);
      }
      
      // 各馬券について当たりハズレを判定
      bets.forEach(bet => {
        // レース結果に基づいて馬券の的中を判定
        const isWin = isBetWinning(bet, raceResult, shouldLog);
        
        // オッズを小数点1桁に丸める
        const roundedOdds = Math.round((bet.odds || 0) * 10) / 10;
        
        if (shouldLog) {
          console.log(`馬券: ${bet.type} ${formatHorseNumbers(bet.type, bet.horses)}, オッズ: ${roundedOdds.toFixed(1)}, 的中: ${isWin ? '○' : '×'}`);
        }
        
        if (isWin) {
          // 当たりの場合は払戻金を加算（小数点1桁に丸めたオッズで計算）
          const returnAmount = roundedOdds * bet.stake;
          totalReturn += returnAmount;
          
          if (shouldLog) {
            console.log(`  払戻金: ${returnAmount.toLocaleString()}円 (${roundedOdds.toFixed(1)} × ${bet.stake.toLocaleString()}円)`);
          }
        }
      });
      
      // 投資額を引いて純利益を計算
      const totalInvestment = bets.reduce((sum, bet) => sum + bet.stake, 0);
      const netProfit = totalReturn - totalInvestment;
      
      if (shouldLog) {
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
    
    // 勝率を計算（利益が0より大きい割合に修正）
    const winRate = results.filter(r => r > 0).length / results.length;
    
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

    // 95%信頼区間内のデータのみをフィルタリング
    const filteredResults = results.filter(
      r => r >= stats.confidenceInterval[0] && r <= stats.confidenceInterval[1]
    );

    // 分布データの生成を改善
    const distributionData: DistributionDataPoint[] = [];
    
    // 最小値と最大値から適切なバケット幅を計算
    const range = stats.confidenceInterval[1] - stats.confidenceInterval[0];
    const bucketCount = 20; // バケット数を固定
    const bucketWidth = Math.ceil(range / bucketCount / 1000) * 1000; // 1000円単位に丸める
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`分布データ生成: 範囲=${range.toLocaleString()}円, バケット数=${bucketCount}, バケット幅=${bucketWidth.toLocaleString()}円`);
    }
    
    // バケットの範囲を設定（より自然な区切りに修正）
    const bucketRanges: number[] = [];
    
    // 投資額を考慮して下限を設定（最小値は投資額のマイナス値を下回らないようにする）
    const totalInvestment = bets.reduce((sum, bet) => sum + bet.stake, 0);
    let minBucketValue = Math.max(stats.confidenceInterval[0], -totalInvestment);
    // 1000円単位に切り捨て
    minBucketValue = Math.floor(minBucketValue / 1000) * 1000;
    
    let currentValue = minBucketValue; // 投資額を考慮した下限から開始
    
    while (currentValue <= stats.confidenceInterval[1]) {
      bucketRanges.push(currentValue);
      currentValue += bucketWidth;
    }
    
    // 最後のバケットが信頼区間の上限を超えていない場合は追加
    if (bucketRanges[bucketRanges.length - 1] < stats.confidenceInterval[1]) {
      bucketRanges.push(stats.confidenceInterval[1]);
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('投資額:', totalInvestment.toLocaleString());
      console.log('理論上の最小値:', (-totalInvestment).toLocaleString());
      console.log('バケット範囲:', bucketRanges.map(v => v.toLocaleString()).join(', '));
    }
    
    // 各バケットのカウントを計算
    bucketRanges.forEach((bucketStart, i) => {
      if (i === bucketRanges.length - 1) return; // 最後の要素はスキップ（終点としてのみ使用）
      
      const bucketEnd = bucketRanges[i + 1];
      const count = filteredResults.filter(r => r >= bucketStart && r < bucketEnd).length;
      
      if (count > 0) { // カウントが0のバケットは除外
        distributionData.push({
          value: bucketStart,
          count,
          percentage: (count / filteredResults.length) * 100
        });
        
        console.log(`バケット[${bucketStart.toLocaleString()}円～${bucketEnd.toLocaleString()}円]: ${count}件 (${((count / filteredResults.length) * 100).toFixed(2)}%)`);
      }
    });

    // 開発環境でのみ統計情報をログ出力
    if (process.env.NODE_ENV === 'development') {
      console.group('モンテカルロシミュレーション - 統計情報');
      console.log(`シミュレーション回数: ${iterations}回`);
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
      stats
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
      
      if (shouldLog) {
        console.group('レース結果シミュレーション');
        console.log('勝率データ:', winProbs);
        console.log('複勝率データ:', placeProbs);
        console.log('出走馬番号:', horseNumbers);
      }
      
      // 勝率に基づいて1着をシミュレート
      const firstPlaceRand = Math.random() * 100;
      let accumWinProb = 0;
      let first = horseNumbers[0];
      
      if (shouldLog) {
        console.log('1着決定の乱数値:', firstPlaceRand);
      }
      
      for (const horseNumber of horseNumbers) {
        const horseWinProb = winProbs[horseNumber] || 0;
        accumWinProb += horseWinProb;
        
        if (shouldLog) {
          console.log(`馬番${horseNumber}: 勝率=${horseWinProb.toFixed(2)}%, 累積=${accumWinProb.toFixed(2)}%`);
        }
        
        if (firstPlaceRand <= accumWinProb) {
          first = horseNumber;
          if (shouldLog) {
            console.log(`→ 1着決定: 馬番${horseNumber}`);
          }
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
      
      if (shouldLog) {
        console.log('最終レース結果:', result);
        console.groupEnd(); // レース結果シミュレーションのグループを閉じる
      }
      
      return result;
      
    } catch (e) {
      console.error('確率パラメータの解析に失敗:', e);
      if (shouldLog) {
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
    
    // 券種を正規化
    const normalizedType = normalizeTicketType(bet.type);
    const { horses } = bet;
    
    if (shouldLog) {
      console.group(`馬券判定: ${bet.type} (正規化: ${normalizedType})`);
      console.log('買い目:', horses);
    }
    
    // 馬番文字列から実際の馬番を抽出
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
      
      if (shouldLog) {
        console.log(`馬番抽出: "${h}" → ${Array.isArray(result) ? JSON.stringify(result) : result}`);
      }
      
      return result;
    });
    
    // 馬番を平坦化して配列にする
    const flattenedHorseNumbers = actualHorseNumbers.flat();
    
    if (shouldLog) {
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
        
        if (shouldLog) {
          console.log('データベースID→馬番変換マップ:', dbIdToActualNumber);
        }
        
      } catch (e) {
        console.error('winProbsパラメータの解析に失敗:', e);
      }
    }
    
    // レース結果のデータベースIDを実際の馬番に変換
    const actualFirst = dbIdToActualNumber[raceResult.first] || 0;
    const actualSecond = dbIdToActualNumber[raceResult.second] || 0;
    const actualThird = dbIdToActualNumber[raceResult.third] || 0;
    
    if (shouldLog) {
      console.log(`レース結果の馬番変換: 1着=${raceResult.first}→${actualFirst}, 2着=${raceResult.second}→${actualSecond}, 3着=${raceResult.third}→${actualThird}`);
    }
    
    let result = false;
    
    switch (normalizedType) {
      case '単勝':
        result = flattenedHorseNumbers[0] === actualFirst;
        if (shouldLog) {
          console.log(`単勝判定: ${flattenedHorseNumbers[0]} === ${actualFirst} → ${result}`);
        }
        break;
      
      case '複勝':
        result = [actualFirst, actualSecond, actualThird].includes(flattenedHorseNumbers[0]);
        if (shouldLog) {
          console.log(`複勝判定: ${flattenedHorseNumbers[0]} が [${actualFirst}, ${actualSecond}, ${actualThird}] に含まれる → ${result}`);
        }
        break;
      
      case '馬連':
        result = (
          (flattenedHorseNumbers[0] === actualFirst && flattenedHorseNumbers[1] === actualSecond) ||
          (flattenedHorseNumbers[0] === actualSecond && flattenedHorseNumbers[1] === actualFirst)
        );
        if (shouldLog) {
          console.log(`馬連判定: (${flattenedHorseNumbers[0]}, ${flattenedHorseNumbers[1]}) と (${actualFirst}, ${actualSecond}) の組み合わせ → ${result}`);
        }
        break;
      
      case '馬単':
        result = flattenedHorseNumbers[0] === actualFirst && flattenedHorseNumbers[1] === actualSecond;
        if (shouldLog) {
          console.log(`馬単判定: ${flattenedHorseNumbers[0]}→${flattenedHorseNumbers[1]} === ${actualFirst}→${actualSecond} → ${result}`);
        }
        break;
      
      case 'ワイド':
        const positions = [actualFirst, actualSecond, actualThird];
        // ワイドは2頭選んで、その2頭が3着以内に入れば的中
        result = (
          positions.includes(flattenedHorseNumbers[0]) && 
          positions.includes(flattenedHorseNumbers[1])
        );
        if (shouldLog) {
          console.log(`ワイド判定: ${flattenedHorseNumbers[0]}, ${flattenedHorseNumbers[1]} が [${positions.join(', ')}] に含まれる → ${result}`);
        }
        break;
      
      case '3連複':
        result = (
          [actualFirst, actualSecond, actualThird].every(pos => 
            flattenedHorseNumbers.includes(pos)
          ) && 
          flattenedHorseNumbers.length === 3
        );
        if (shouldLog) {
          console.log(`3連複判定: [${flattenedHorseNumbers.join(', ')}] と [${actualFirst}, ${actualSecond}, ${actualThird}] の一致 → ${result}`);
        }
        break;
      
      case '3連単':
        result = (
          flattenedHorseNumbers[0] === actualFirst &&
          flattenedHorseNumbers[1] === actualSecond &&
          flattenedHorseNumbers[2] === actualThird
        );
        if (shouldLog) {
          console.log(`3連単判定: ${flattenedHorseNumbers[0]}→${flattenedHorseNumbers[1]}→${flattenedHorseNumbers[2]} === ${actualFirst}→${actualSecond}→${actualThird} → ${result}`);
        }
        break;
      
      case '枠連':
        if (shouldLog) console.log(`馬券判定: ${bet.type} (正規化: ${normalizedType})`);
        if (shouldLog) console.log(`買い目: ${JSON.stringify(bet.horses)}`);
        
        // 枠番を直接抽出（"1-7" → [1,7] のような変換）
        const frameNumbers = bet.horses.flatMap(h => {
          const match = h.match(/(\d+)-(\d+)/);
          if (match) {
            return [parseInt(match[1]), parseInt(match[2])];
          }
          return h.split('-').map(num => parseInt(num.trim()));
        });
        
        if (shouldLog) console.log(`枠番抽出: "${bet.horses.join('-')}" → ${JSON.stringify(frameNumbers)}`);
        if (shouldLog) console.log(`抽出された枠番: ${frameNumbers}`);
        
        // レース結果から1着と2着の馬番を取得（変換済みの馬番を使用）
        const firstHorse = actualFirst;
        const secondHorse = actualSecond;
        
        // 馬番から枠番への変換
        const firstFrame = getFrameNumber(firstHorse);
        const secondFrame = getFrameNumber(secondHorse);
        
        if (shouldLog) console.log(`レース結果の枠番: 1着=${firstHorse}→${firstFrame}, 2着=${secondHorse}→${secondFrame}`);
        
        // 枠連の的中判定（順序は関係ない）
        const isWinning = (
          // 同枠の場合
          (frameNumbers[0] === frameNumbers[1] && firstFrame === secondFrame && firstFrame === frameNumbers[0]) ||
          // 異なる枠の場合（順序不問）
          (frameNumbers.includes(firstFrame) && frameNumbers.includes(secondFrame))
        );
        
        if (shouldLog) console.log(`枠連判定: 買い目枠番=(${frameNumbers.join(', ')}), 結果枠番=(${firstFrame}, ${secondFrame}) → ${isWinning}`);
        
        if (shouldLog) console.groupEnd(); // 枠連判定のグループを閉じる
        
        return isWinning;
      
      default:
        // 未対応の馬券種は確率に基づいて判定
        const randomValue = Math.random();
        result = randomValue < bet.probability;
        if (shouldLog) {
          console.log(`未対応券種判定: 乱数=${randomValue.toFixed(4)} < 確率=${bet.probability.toFixed(4)} → ${result}`);
        }
        break;
    }
    
    if (shouldLog) {
      console.log(`最終判定結果: ${result ? '的中' : '不的中'}`);
      console.groupEnd();
    }
    
    return result;
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
              margin={{ 
                top: 10, 
                right: 10, 
                left: window.innerWidth < 640 ? 0 : 10, 
                bottom: 0 
              }}
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
                formatter={(value: any, name: string) => {
                  if (name === 'percentage') {
                    return [`${Number(value).toFixed(1)}%`, '確率'];
                  } else {
                    // 収益値に基づいて色を設定（数字部分のみ）
                    const color = value >= 0 
                      ? value > 10000 ? '#10b981' : value > 5000 ? '#34d399' : '#6ee7b7' // 緑のグラデーション
                      : value < -10000 ? '#ef4444' : value < -5000 ? '#f87171' : '#fca5a5'; // 赤のグラデーション
                    return [
                      <span style={{ color }}>
                        {`${value >= 0 ? '+' : ''}${value.toLocaleString()}円`}
                      </span>, 
                      '収益'
                    ];
                  }
                }}
                labelFormatter={(value) => {
                  // 収益値に基づいて色を設定（数字部分のみ）
                  const color = value >= 0 
                    ? value > 10000 ? '#10b981' : value > 5000 ? '#34d399' : '#6ee7b7' // 緑のグラデーション
                    : value < -10000 ? '#ef4444' : value < -5000 ? '#f87171' : '#fca5a5'; // 赤のグラデーション
                  return <span>
                    収益: <span style={{ color }}>{`${value >= 0 ? '+' : ''}${value.toLocaleString()}円`}</span>
                  </span>;
                }}
                contentStyle={{
                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '0.5rem',
                  padding: '1rem',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                }}
                itemStyle={{
                  fontSize: '0.875rem',
                  padding: '0.25rem 0',
                  color: 'rgba(255, 255, 255, 0.9)' // 基本テキスト色を追加
                }}
                labelStyle={{
                  fontSize: '0.75rem',
                  marginBottom: '0.5rem',
                  color: 'rgba(255, 255, 255, 0.7)' // 基本テキスト色を追加
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
              {stats.mean >= 0 ? '+' : ''}{(Math.round(stats.mean / 10) * 10).toLocaleString()}円
            </div>
          </div>
          <div className="bg-background/50 p-2 rounded-lg">
            <div className="text-xs text-muted-foreground">中央値</div>
            <div className="text-lg font-bold">
              {stats.median >= 0 ? '+' : ''}{(Math.round(stats.median / 10) * 10).toLocaleString()}円
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
            {strategy.summary.riskLevel === 'USER_SELECTED' && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200">
                <MousePointer className="h-3 w-3 mr-1" />
                手動選択
              </span>
            )}
          </div>
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
              ),    // 券種数と3の小さい方（最大3列）
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
              )     // モバイルでも最大2列
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
              <div className="text-xs text-muted-foreground">期待収益</div>
              <div className="text-lg font-bold">
                +{(Math.round(totals.totalExpectedReturn / 10) * 10 - totals.totalInvestment).toLocaleString()}円
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
              <LineChart className="h-4 w-4 text-primary" />
              収益分布シミュレーション
            </h3>
            <MonteCarloResults bets={sortedBets} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}); 