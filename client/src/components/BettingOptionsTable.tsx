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
  const simpleTypes = ['単勝', '複勝', '枠連', '馬連', 'ワイド', '馬単'];
  const complexTypes = ['３連複', '３連単'];

  // 各グループ内で期待値順にソート
  Object.values(groupedOptions).forEach(group => {
    group.sort((a, b) => b.ev - a.ev);
  });

  // 馬番の表示方法を決定する関数
  const formatHorses = (horses: string[], betType: string) => {
    // 単勝と複勝は馬番のみ表示
    if (betType === '単勝' || betType === '複勝') {
      return horses[0].split(' ')[0]; // 馬番のみを取得（"14.スターズオンアース" → "14"）
    }
    // それ以外は従来通り
    return horses.join(betType.includes('単') ? '→' : '-');
  };

  // モバイル用のコンパクトカードコンポーネント
  const BetCard = ({ option, betType }: { option: typeof optionsWithEV[0], betType: string }) => (
    <div className="flex flex-col space-y-2 p-3 rounded-lg bg-muted/5">
      <div className="flex justify-between items-center">
        <span className="font-medium">
          {formatHorses(option.horses, betType)}
        </span>
        <span className="text-right font-bold">
          ×{option.odds.toFixed(1)}
        </span>
      </div>
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>的中率 {(option.probability * 100).toFixed(1)}%</span>
        <span className="font-medium text-muted-foreground">
          期待値 {(option.ev).toFixed(2)}
        </span>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* 単勝、複勝、枠連、馬連、ワイド、馬単（2列グリッド） */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {simpleTypes.map(betType => {
          const options = groupedOptions[betType];
          if (!options?.length) return null;

          return (
            <Card key={betType}>
              <CardHeader>
                <CardTitle className="text-lg">{betType}候補</CardTitle>
              </CardHeader>
              <CardContent>
                {/* モバイル表示 */}
                <div className="space-y-2 md:hidden">
                  {options.map((option, index) => (
                    <BetCard key={index} option={option} betType={betType} />
                  ))}
                </div>

                {/* デスクトップ表示 */}
                <div className="hidden md:block overflow-x-auto">
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
                          <TableCell className="whitespace-nowrap">
                            {formatHorses(option.horses, betType)}
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            {option.odds.toFixed(1)}
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            {(option.probability * 100).toFixed(1)}%
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap font-medium">
                            {(option.ev).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ３連複、３連単（1列） */}
      <div className="space-y-4">
        {complexTypes.map(betType => {
          const options = groupedOptions[betType];
          if (!options?.length) return null;

          return (
            <Card key={betType}>
              <CardHeader>
                <CardTitle className="text-lg">{betType}候補</CardTitle>
              </CardHeader>
              <CardContent>
                {/* モバイル表示 */}
                <div className="space-y-2 md:hidden">
                  {options.map((option, index) => (
                    <BetCard key={index} option={option} betType={betType} />
                  ))}
                </div>

                {/* デスクトップ表示 */}
                <div className="hidden md:block overflow-x-auto">
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
                          <TableCell className="whitespace-nowrap">
                            {formatHorses(option.horses, option.type)}
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            {option.odds.toFixed(1)}
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            {(option.probability * 100).toFixed(1)}%
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap font-medium">
                            {(option.ev).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
} 