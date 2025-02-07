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
  const simpleTypes = ['単勝', '複勝', '枠連', 'ワイド', '馬連', '馬単'];
  const complexTypes = ['３連複', '３連単'];

  // 各グループ内で期待値順にソート
  Object.values(groupedOptions).forEach(group => {
    group.sort((a, b) => b.ev - a.ev);
  });

  // 馬番の表示方法を決定する関数
  const formatHorses = (horses: string[], betType: string) => {
    // 単勝と複勝は馬番のみ表示
    if (betType === '単勝' || betType === '複勝') {
      return horses[0].split(' ')[0]; 
    }
    // それ以外は従来通り
    return horses.join(betType.includes('単') ? '→' : '-');
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-2 gap-3">
        {[...simpleTypes, ...complexTypes].map(betType => {
          const options = groupedOptions[betType];
          if (!options?.length) return null;

          return (
            <Card key={betType}>
              <CardHeader className="py-2 px-3">
                <CardTitle className="text-base">{betType}候補</CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                {/* ヘッダー行 */}
                <div className="grid grid-cols-2 px-2 mb-2 text-xs text-muted-foreground">
                  <div>買い目</div>
                  <div className="text-right">オッズ</div>
                </div>
                <div className="grid grid-cols-2 gap-2 px-2 pb-1 border-b text-xs text-muted-foreground">
                  <div>的中率</div>
                  <div className="text-right">期待値</div>
                </div>

                {/* 馬券リスト */}
                <div className="space-y-1.5 mt-2">
                  {options.map((option, index) => (
                    <div key={index} className="p-2">
                      <div className="grid grid-cols-2 gap-2">
                        <span className="font-medium">
                          {formatHorses(option.horses, betType)}
                        </span>
                        <span className="text-right font-bold">
                          ×{option.odds.toFixed(1)}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mt-1">
                        <span>{(option.probability * 100).toFixed(1)}%</span>
                        <span className="text-right font-medium">
                          {(option.ev).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
} 