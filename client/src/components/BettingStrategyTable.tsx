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

  // デバッグ用：sortedBetsのreasonプロパティを確認
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('sortedBets reasons:', sortedBets.map(bet => bet.reason));
    }
  }, [sortedBets]);

  // デバッグ用：各馬券のreasonプロパティを確認
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      sortedBets.forEach((bet, index) => {
        console.log(`馬券 ${index + 1} (${bet.type} ${bet.horses.join('-')}) の理由:`, bet.reason);
      });
    }
  }, [sortedBets]);

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

  return (
    <Card className="overflow-hidden bg-gradient-to-br from-background to-primary/5">
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
        <div className="space-y-3">
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

          {/* 馬券種別ごとにグループ化 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.entries(sortedBets.reduce((acc, bet) => {
              const type = normalizeTicketType(bet.type);
              if (!acc[type]) acc[type] = [];
              acc[type].push(bet);
              return acc;
            }, {} as Record<string, typeof sortedBets>)).map(([betType, bets]) => (
              <Card key={betType} className="bg-background/50 backdrop-blur-sm">
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
                        <span className="font-medium whitespace-nowrap text-primary">
                          {bets.reduce((sum, bet) => sum + bet.stake, 0).toLocaleString()}円
                        </span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-2">
                  <div className="space-y-1.5">
                    {bets.map((bet, index) => (
                      <div key={index} className="relative overflow-hidden">
                        {bet.reason && bet.reason !== '手動選択された馬券' && bet.reason !== '理由なし' ? (
                          <Popover>
                            <PopoverTrigger asChild>
                              <div className={`
                                relative overflow-hidden
                                p-2 rounded-md border
                                ${index % 2 === 0 ? 'bg-background/50' : 'bg-background/30'}
                                hover:bg-primary/5 transition-colors duration-200
                                cursor-pointer
                              `}>
                                {/* グラデーション背景レイヤー */}
                                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-background/5 to-transparent opacity-50" />
                                
                                {/* コンテンツレイヤー */}
                                <div className="relative">
                                  <div className="grid grid-cols-2 gap-2">
                                    <span className="font-medium">
                                      {formatHorseNumbers(bet.type, bet.horses)}
                                    </span>
                                    <div className="flex items-center justify-end gap-1">
                                      <span className="font-bold text-primary">
                                        ×{bet.odds ? bet.odds.toFixed(1) : Number(bet.expectedReturn / bet.stake).toFixed(1)}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2 text-xs mt-1">
                                    <span className="text-muted-foreground">
                                      {(bet.probability * 100).toFixed(1)}%
                                    </span>
                                    <div className="text-right space-y-0.5">
                                      <span className="font-medium">
                                        {bet.stake.toLocaleString()}円
                                      </span>
                                      <span className="block text-primary text-[10px]">
                                        {Math.round(bet.stake * (bet.odds || Number(bet.expectedReturn / bet.stake))).toLocaleString()}円
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
                                    {bet.reason}
                                  </p>
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                        ) : (
                          <div className={`
                            relative overflow-hidden
                            p-2 rounded-md border
                            ${index % 2 === 0 ? 'bg-background/50' : 'bg-background/30'}
                          `}>
                            {/* グラデーション背景レイヤー */}
                            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-background/5 to-transparent opacity-50" />
                            
                            {/* コンテンツレイヤー */}
                            <div className="relative">
                              <div className="grid grid-cols-2 gap-2">
                                <span className="font-medium">
                                  {formatHorseNumbers(bet.type, bet.horses)}
                                </span>
                                <div className="flex items-center justify-end gap-1">
                                  <span className="font-bold text-primary">
                                    ×{bet.odds ? bet.odds.toFixed(1) : Number(bet.expectedReturn / bet.stake).toFixed(1)}
                                  </span>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-xs mt-1">
                                <span className="text-muted-foreground">
                                  {(bet.probability * 100).toFixed(1)}%
                                </span>
                                <div className="text-right space-y-0.5">
                                  <span className="font-medium">
                                    {bet.stake.toLocaleString()}円
                                  </span>
                                  <span className="block text-primary text-[10px]">
                                    {Math.round(bet.stake * (bet.odds || Number(bet.expectedReturn / bet.stake))).toLocaleString()}円
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* 集計情報 */}
          <div className="grid grid-cols-3 gap-2 mt-3 bg-background/50 rounded-lg p-2">
            <div className="text-center">
              <div className="text-lg font-bold">
                {totals.totalInvestment.toLocaleString()}円
              </div>
              <div className="text-xs text-muted-foreground">総投資額</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-primary">
                {Math.round(totals.totalExpectedReturn).toLocaleString()}円
              </div>
              <div className="text-xs text-muted-foreground">推定期待収益</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-primary">
                +{totals.expectedReturnRate}%
              </div>
              <div className="text-xs text-muted-foreground">期待収益率</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}); 