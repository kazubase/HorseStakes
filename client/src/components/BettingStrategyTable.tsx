import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { GeminiStrategy } from "@/lib/geminiApi";

interface BettingStrategyTableProps {
  strategy: GeminiStrategy;
}

export function BettingStrategyTable({ strategy }: BettingStrategyTableProps) {
  if (!strategy?.bettingTable?.headers || !strategy?.bettingTable?.rows) {
    console.error('Invalid betting table data:', strategy);
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI戦略分析</CardTitle>
        <CardDescription>{strategy.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                {strategy.bettingTable.headers.map((header, i) => (
                  <TableHead key={i} className="whitespace-nowrap">
                    {header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {strategy.bettingTable.rows.map((row, i) => (
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

          {strategy.summary && (
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="font-medium">総投資額:</span>
                <span>{strategy.summary.totalInvestment}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">期待収益:</span>
                <span>{strategy.summary.expectedReturn}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">リスクレベル:</span>
                <span>{strategy.summary.riskLevel}</span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 