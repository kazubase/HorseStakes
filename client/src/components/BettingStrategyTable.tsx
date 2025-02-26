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

interface BettingStrategyTableProps {
  strategy: GeminiStrategy;
  totalBudget: number;
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
      console.log('Optimizing bet allocation...', {
        recommendationsCount: strategy.recommendations.length,
        budget: totalBudget,
        renderCount: renderCount.current
      });
    }
    
    return optimizeBetAllocation(strategy.recommendations, totalBudget);
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

  // デバッグ用のレンダリングカウント
  useEffect(() => {
    renderCount.current += 1;
    if (process.env.NODE_ENV === 'development') {
      console.log('BettingStrategyTable render:', {
        count: renderCount.current,
        recommendationsCount: strategy.recommendations.length,
        totalBudget,
        timestamp: new Date().toISOString()
      });
    }
  }, [strategy.recommendations.length, totalBudget]);

  // 馬券の買い目表記を統一する関数を追加
  const formatHorseNumbers = (type: string, horses: string[]): string => {
    const normalizedType = normalizeTicketType(type);
    return ["馬単", "3連単"].includes(normalizedType)
      ? horses.join('→')
      : horses.length === 1
      ? horses[0]
      : horses.join('-');
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
      <div className="text-center">{Number(bet.expectedReturn / bet.stake).toFixed(1)}</div>,
      <div className="text-center">{(bet.probability * 100).toFixed(1)}%</div>,
      <div className="text-center">{bet.stake.toLocaleString()}円</div>,
      <div className="text-center">{bet.expectedReturn.toLocaleString()}円</div>,
      <div key={bet.horses.join('-')} className="flex justify-center items-center">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <InfoCircledIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent 
            className="w-80 rounded-lg border border-border/30 bg-black/70 p-4 shadow-lg z-[9999] backdrop-blur-sm" 
            sideOffset={5}
          >
            <p className="text-sm text-white/90 leading-relaxed whitespace-normal break-words">
              {bet.reason || '理由なし'}
            </p>
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

  return (
    <Card className="overflow-hidden bg-gradient-to-br from-background to-primary/5">
      <CardHeader className="relative pb-4 border-b border-border/50">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-background/5 to-transparent opacity-50" />
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg sm:text-xl">{strategy.description}</CardTitle>
            {strategy.summary.riskLevel === 'AI_OPTIMIZED' && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200">
                <Sparkles className="h-3 w-3 mr-1" />
                AI最適化
              </span>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={captureTable}
            className="gap-2 w-full sm:w-auto"
          >
            <Camera className="h-4 w-4" />
            保存
          </Button>
        </div>
        {strategy.summary.description && (
          <CardDescription className="relative mt-2">
            {strategy.summary.description}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="p-0">
        <div className="divide-y divide-border/30">
          {sortedBets.map((bet, index) => (
            <div key={index} className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4">
                {/* 券種と買い目 */}
                <div className="flex items-center gap-3 w-full sm:w-auto sm:flex-1">
                  <div className="w-16 text-xs font-medium text-muted-foreground">
                    {normalizeTicketType(bet.type)}
                  </div>
                  <span className="text-sm font-medium">
                    {formatHorseNumbers(bet.type, bet.horses)}
                  </span>
                </div>

                {/* オッズ、的中率、投資額のグループ */}
                <div className="flex justify-between sm:justify-end items-center w-full sm:w-auto gap-4 sm:gap-6">
                  <div className="text-right min-w-[80px]">
                    <p className="text-sm font-bold">×{Number(bet.expectedReturn / bet.stake).toFixed(1)}</p>
                    <p className="text-xs text-muted-foreground">{(bet.probability * 100).toFixed(1)}%</p>
                  </div>

                  <div className="text-right min-w-[100px]">
                    <p className="text-sm font-bold">{bet.stake.toLocaleString()}円</p>
                    <p className="text-xs text-muted-foreground">
                      {(Math.round(bet.stake * (bet.expectedReturn / bet.stake) / 10) * 10 ).toLocaleString()}円
                    </p>
                  </div>

                  <div className="flex items-center justify-center w-8">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <InfoCircledIcon className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent 
                        className="w-[280px] sm:w-80 rounded-lg border border-border/30 bg-black/70 p-4 shadow-lg backdrop-blur-sm" 
                        sideOffset={5}
                      >
                        <p className="text-sm text-foreground/90 leading-relaxed">
                          {bet.reason || '理由なし'}
                        </p>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* 集計情報 */}
          <div className="p-4 bg-gradient-to-b from-primary/5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-background/80 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-primary/10">
                <p className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
                  {totals.totalInvestment.toLocaleString()}円
                </p>
                <p className="text-xs text-muted-foreground mt-1 font-medium">総投資額</p>
              </div>
              <div className="bg-background/80 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-primary/10">
                <p className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
                  {Math.round(totals.totalExpectedReturn).toLocaleString()}円
                </p>
                <p className="text-xs text-muted-foreground mt-1 font-medium">推定期待収益</p>
              </div>
              <div className="bg-background/80 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-primary/10">
                <p className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
                  +{totals.expectedReturnRate}%
                </p>
                <p className="text-xs text-muted-foreground mt-1 font-medium">期待収益率</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}); 