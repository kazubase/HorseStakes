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
    console.log('Optimizing bet allocation...', {
      recommendationsCount: strategy.recommendations.length,
      budget: totalBudget,
      renderCount: renderCount.current
    });
    
    return optimizeBetAllocation(strategy.recommendations, totalBudget);
  }, [strategy.recommendations, totalBudget]);

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
      return (typeOrder[a.type] || 0) - (typeOrder[b.type] || 0);
    });
  }, [optimizationResult]);

  // 集計値の計算をメモ化
  const totals = useMemo(() => {
    const totalInvestment = sortedBets.reduce((sum, bet) => sum + bet.stake, 0);
    const totalExpectedReturn = sortedBets.reduce((sum, bet) => {
      // E[R] = Σ(Ri * Pi) の計算
      return sum + (bet.expectedReturn * bet.probability);
    }, 0);
    
    return {
      totalInvestment,
      totalExpectedReturn,
      expectedReturnRate: ((totalExpectedReturn / totalInvestment - 1) * 100).toFixed(1)
    };
  }, [sortedBets]);

  // デバッグ用のレンダリングカウント
  useEffect(() => {
    renderCount.current += 1;
    console.log('BettingStrategyTable render:', {
      count: renderCount.current,
      recommendationsCount: strategy.recommendations.length,
      totalBudget,
      timestamp: new Date().toISOString()
    });
  }, [strategy.recommendations.length, totalBudget]);

  // テーブルデータの生成をメモ化
  const tableData = useMemo(() => ({
    headers: ['券種', '買い目', 'オッズ', '的中率', '最適投資額', '想定払戻金', ''],
    rows: sortedBets.map(bet => [
      bet.type,
      (() => {
        if (["馬単", "3連単"].includes(bet.type)) {
          // 馬単と3連単は矢印区切り
          return bet.horses.join('→');
        } else if (bet.horses.length === 1) {
          // 単勝・複勝は馬番のみ
          return bet.horses[0];
        } else {
          // その他は単純なハイフン区切り
          return bet.horses.join('-');
        }
      })(),
      Number(bet.expectedReturn / bet.stake).toFixed(1),
      (bet.probability * 100).toFixed(1) + '%',
      bet.stake.toLocaleString() + '円',
      bet.expectedReturn.toLocaleString() + '円',
      <Popover.Root key={bet.horses.join('-')}>
        <Popover.Trigger asChild>
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <InfoCircledIcon className="h-4 w-4" />
          </Button>
        </Popover.Trigger>
        <Popover.Content className="w-80 rounded-lg border bg-card p-4 shadow-lg" sideOffset={5}>
          <div className="space-y-2">
            <h4 className="font-semibold text-base border-b pb-2 text-white">選択理由</h4>
            <p className="text-sm text-gray-200 leading-relaxed whitespace-normal break-words">
              {bet.reason || '理由なし'}
            </p>
          </div>
        </Popover.Content>
      </Popover.Root>
    ])
  }), [sortedBets]);

  // テーブルのref追加
  const tableRef = useRef<HTMLDivElement>(null);

  // スクリーンショット機能の追加
  const captureTable = async () => {
    if (!tableRef.current) return;
    
    try {
      // キャプチャ前に余白を追加
      const originalPadding = tableRef.current.style.padding;
      tableRef.current.style.padding = '16px'; // 余白を追加

      const canvas = await html2canvas(tableRef.current, {
        backgroundColor: '#000000',
        scale: 1,
        useCORS: true,
        logging: false,
        // キャプチャ範囲を少し広げる
        width: tableRef.current.scrollWidth + 32, // 左右の余白を含む
        height: tableRef.current.scrollHeight + 32, // 上下の余白を含む
      });
      
      // 元の余白に戻す
      tableRef.current.style.padding = originalPadding;
      
      const link = document.createElement('a');
      link.download = `betting-strategy-${new Date().toISOString()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('スクリーンショットの作成に失敗:', error);
    }
  };

  return (
    <Card>
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
            買い目を保存
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4" ref={tableRef}>
          <Table>
            <TableHeader>
              <TableRow>
                {tableData.headers.map((header, i) => (
                  <TableHead key={i} className="whitespace-nowrap">
                    {header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableData.rows.map((row, i) => (
                <TableRow key={i}>
                  {row.map((cell, j) => (
                    <TableCell key={j} className="whitespace-nowrap">
                      {cell}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="font-medium">総投資額:</span>
              <span>{totals.totalInvestment.toLocaleString()}円</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">期待収益:</span>
              <span>{totals.totalExpectedReturn.toLocaleString()}円</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">期待収益率:</span>
              <span>{totals.expectedReturnRate}%</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}); 