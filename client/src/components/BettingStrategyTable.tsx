import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { GeminiStrategy } from "@/lib/geminiApi";
import { optimizeBetAllocation } from "@/lib/betCalculator";
import * as Popover from '@radix-ui/react-popover';
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";

interface BettingStrategyTableProps {
  strategy: GeminiStrategy;
  totalBudget: number;
}

export function BettingStrategyTable({ strategy, totalBudget }: BettingStrategyTableProps) {
  // Sharpe比最大化による最適化
  const optimizedBets = optimizeBetAllocation(strategy.recommendations, totalBudget);
  
  // ソート済みの馬券リストを作成
  const sortedBets = [...optimizedBets].sort((a, b) => {
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
    
    // 馬券種別でソート
    const typeCompare = typeOrder[a.type] - typeOrder[b.type];
    if (typeCompare !== 0) return typeCompare;
    
    // 同じ馬券種別なら投資額の大きい順
    return b.stake - a.stake;
  });

  // 最適化された結果からテーブルデータを生成
  const tableData = {
    headers: ['券種', '買い目', 'オッズ', '的中率', '最適投資額', '期待収益', ''],  // 最後の列をアイコン用に追加
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
      // 情報アイコンとポップオーバーを追加
      <Popover.Popover key={bet.horses.join('-')}>
        <Popover.PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <InfoCircledIcon className="h-4 w-4" />
          </Button>
        </Popover.PopoverTrigger>
        <Popover.PopoverContent className="w-80 rounded-lg border bg-card p-4 shadow-lg" sideOffset={5}>
          <div className="space-y-2">
            <h4 className="font-semibold text-base border-b pb-2 text-white">選択理由</h4>
            <p className="text-sm text-gray-200 leading-relaxed whitespace-normal break-words">
              {bet.reason || '理由なし'}
            </p>
          </div>
        </Popover.PopoverContent>
      </Popover.Popover>
    ])
  };

  // 合計値の計算
  const totalInvestment = sortedBets.reduce((sum, bet) => sum + bet.stake, 0);
  const totalExpectedReturn = sortedBets.reduce((sum, bet) => sum + bet.expectedReturn, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI最適化戦略</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
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
              <span>{totalInvestment.toLocaleString()}円</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">期待収益:</span>
              <span>{totalExpectedReturn.toLocaleString()}円</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">期待リターン:</span>
              <span>{((totalExpectedReturn / totalInvestment - 1) * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 