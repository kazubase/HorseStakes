import { memo, useMemo, useRef, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GeminiStrategy } from "@/lib/geminiApi";
import { optimizeBetAllocation } from "@/lib/betCalculator";
import * as Popover from '@radix-ui/react-popover';
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import html2canvas from 'html2canvas';
import { Camera } from 'lucide-react';
import type { BetProposal } from "@/lib/betCalculator";

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
      "馬連": 4,
      "ワイド": 5,
      "馬単": 6,
      "3連複": 7,
      "3連単": 8
    };
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
        <Popover.Root>
          <Popover.Trigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <InfoCircledIcon className="h-4 w-4" />
            </Button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content 
              className="w-80 rounded-lg border border-border/30 bg-black/70 p-4 shadow-lg z-[9999] backdrop-blur-sm" 
              sideOffset={5}
            >
              <p className="text-sm text-white/90 leading-relaxed whitespace-normal break-words">
                {bet.reason || '理由なし'}
              </p>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
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
    <Card data-card-container>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>AI最適化戦略</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={captureTable}
            className="gap-2"
          >
            <Camera className="h-4 w-4" />
            保存
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* ヘッダー行 */}
          <div className="grid grid-cols-4 gap-1 px-2 pb-2 border-b text-xs text-muted-foreground">
            <div>券種</div>
            <div>オッズ</div>
            <div>投資額</div>
            <div>選定理由</div>
            <div>買い目</div>
            <div>的中率</div>
            <div>払戻金</div>
          </div>

          {/* 馬券リスト */}
          <div className="space-y-2">
            {sortedBets.map((bet, index) => (
              <div key={index} className="grid grid-cols-4 gap-4 p-2 tems-center">
                {/* 1列目: 券種と買い目 */}
                <div className="flex flex-col">
                  <span className="text-xs">
                    {normalizeTicketType(bet.type)}
                  </span>
                  <span className="text-sm font-bold">
                    {formatHorseNumbers(bet.type, bet.horses)}
                  </span>
                </div>

                {/* 2列目: オッズと的中率 */}
                <div className="flex flex-col">
                  <span className="text-sm font-bold">
                    ×{Number(bet.expectedReturn / bet.stake).toFixed(1)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {(bet.probability * 100).toFixed(1)}%
                  </span>
                </div>

                {/* 3列目: 投資額と払戻金 */}
                <div className="flex flex-col">
                  <span className="text-sm font-bold">
                    {bet.stake.toLocaleString()}円
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {bet.expectedReturn.toLocaleString()}円
                  </span>
                </div>

                {/* 4列目: 選定理由 */}
                <div className="flex items-center">
                  <Popover.Root>
                    <Popover.Trigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 px-2 gap-1">
                        <InfoCircledIcon className="h-4 w-4" />
                        <span className="text-xs"></span>
                      </Button>
                    </Popover.Trigger>
                    <Popover.Portal>
                      <Popover.Content 
                        className="w-80 rounded-lg border border-border/30 bg-black/70 p-4 shadow-lg z-[9999] backdrop-blur-sm" 
                        sideOffset={5}
                      >
                        <p className="text-sm text-white/90 leading-relaxed whitespace-normal break-words">
                          {bet.reason || '理由なし'}
                        </p>
                      </Popover.Content>
                    </Popover.Portal>
                  </Popover.Root>
                </div>
              </div>
            ))}
          </div>

          {/* 集計情報 */}
          <div className="rounded-lg border border-border/50 bg-card/30 backdrop-blur-sm p-3">
            <div className="grid grid-cols-3 gap-4 text-xs">
              <div className="flex flex-col">
                <span className="text-muted-foreground">総投資額</span>
                <span className="text-sm font-bold">{totals.totalInvestment.toLocaleString()}円</span>
              </div>
              <div className="flex flex-col">
                <span className="text-muted-foreground">推定期待収益</span>
                <span className="text-sm font-bold">{Math.round(totals.totalExpectedReturn).toLocaleString()}円</span>
              </div>
              <div className="flex flex-col">
                <span className="text-muted-foreground">期待収益率</span>
                <span className="text-sm font-bold">+{totals.expectedReturnRate}%</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}); 