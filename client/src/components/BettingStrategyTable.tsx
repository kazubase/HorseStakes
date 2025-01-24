import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { GeminiStrategy } from "@/lib/geminiApi";
import { optimizeBetAllocation } from "@/lib/betCalculator";

interface BettingStrategyTableProps {
  strategy: GeminiStrategy;
  totalBudget: number;
}

export function BettingStrategyTable({ strategy, totalBudget }: BettingStrategyTableProps) {
  // Sharpe比最大化による最適化
  const optimizedBets = optimizeBetAllocation(strategy.recommendations, totalBudget);
  
  // 最適化された結果からテーブルデータを生成
  const tableData = {
    headers: ['券種', '買い目', 'オッズ', '的中率', '最適投資額', '期待収益'],
    rows: optimizedBets.map(bet => [
      bet.type,
      bet.horses.join('-'),
      Number(bet.expectedReturn / bet.stake).toFixed(1),
      (Number(bet.probability) * 100).toFixed(1) + '%',
      bet.stake.toLocaleString() + '円',
      (Number(bet.expectedReturn)).toLocaleString() + '円'
    ])
  };

  // 合計値の計算
  const totalInvestment = optimizedBets.reduce((sum, bet) => sum + bet.stake, 0);
  const totalExpectedReturn = optimizedBets.reduce((sum, bet) => sum + bet.expectedReturn, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI最適化戦略</CardTitle>
        <CardDescription>Sharpe比を最大化する最適な資金配分</CardDescription>
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