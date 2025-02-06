import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BetProposal } from "@/lib/betCalculator";

interface BettingOptionsTableProps {
  bettingOptions: BetProposal[];
}

export function BettingOptionsTable({ bettingOptions }: BettingOptionsTableProps) {
  // 期待値を計算
  const optionsWithEV = bettingOptions.map(option => {
    const odds = option.expectedReturn / option.stake;
    const ev = (odds * option.probability) - 1;
    return {
      ...option,
      odds,
      ev
    };
  });

  // 券種でグループ化
  const groupedOptions = optionsWithEV.reduce((acc, option) => {
    if (!acc[option.type]) {
      acc[option.type] = [];
    }
    acc[option.type].push(option);
    return acc;
  }, {} as Record<string, typeof optionsWithEV>);

  // 券種の表示順序を定義
  const betTypeOrder = [
    '単勝', '複勝', '枠連', '馬連', 'ワイド', '馬単', '３連複', '３連単'
  ];

  // 各グループ内で期待値順にソート
  Object.values(groupedOptions).forEach(group => {
    group.sort((a, b) => b.ev - a.ev);
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {betTypeOrder.map(betType => {
        const options = groupedOptions[betType];
        if (!options?.length) return null;

        return (
          <Card key={betType}>
            <CardHeader>
              <CardTitle className="text-lg">{betType}候補</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>買い目</TableHead>
                    <TableHead className="text-right">オッズ</TableHead>
                    <TableHead className="text-right">的中率</TableHead>
                    <TableHead className="text-right">期待値</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {options.map((option, index) => (
                    <TableRow key={index}>
                      <TableCell>{option.horses.join(option.type.includes('単') ? '→' : '-')}</TableCell>
                      <TableCell className="text-right">{option.odds.toFixed(1)}</TableCell>
                      <TableCell className="text-right">
                        {(option.probability * 100).toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {(option.ev).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
} 