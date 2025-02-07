import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";

interface RaceAnalyticsProps {
  winProbs: Record<string, number>;
  placeProbs: Record<string, number>;
  horses: Array<{ id: number; name: string; number: number }>;
  budget: number;
  riskRatio: number;
}

export function RaceAnalytics({ winProbs, placeProbs, horses, budget, riskRatio }: RaceAnalyticsProps) {
  // データ作成を改善
  const createProbData = (probs: Record<string, number>, count: number = 5) => {
    const data = horses
      .map(horse => ({
        name: `${horse.number}. ${horse.name}`,
        probability: probs[horse.id] || 0,
        horseNumber: horse.number
      }))
      .sort((a, b) => b.probability - a.probability)
      .filter(horse => horse.probability > 0); // 確率が0の馬を除外

    // 5頭に満たない場合、空のデータで埋める
    while (data.length < count) {
      data.push({
        name: "",
        probability: 0,
        horseNumber: -1
      });
    }

    return data.slice(0, count);
  };

  const winProbData = createProbData(winProbs);
  const placeProbData = createProbData(placeProbs);

  // グラデーションカラーを生成する関数
  const getGradientColor = (probability: number) => {
    // 確率に応じて色の濃さを変える（0%: 薄い、100%: 濃い）
    return `rgba(14, 232, 159, ${0.3 + (probability / 100) * 0.7})`;
  };

  // 共通のチャートコンポーネント
  const ProbabilityChart = ({ data, title }: { 
    data: Array<{ name: string; probability: number }>;
    title: string;
  }) => (
    <Card className="flex-1 bg-zinc-900/50 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-zinc-100">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ right: 20 }}>
              <XAxis 
                type="number" 
                domain={[0, 100]} 
                stroke="rgba(161, 161, 170, 1.0)"
                fontSize={12}
                tickFormatter={(value) => `${value}`} // %を一つだけ表示
                unit="%" // 単位として%を追加
              />
              <YAxis 
                dataKey="name" 
                type="category" 
                width={130}
                stroke="rgba(161, 161, 170, 1.0)"
                fontSize={12}
                interval={0}
                tickFormatter={(value) => {
                  if (!value) return "　";
                  // 馬番と馬名の間のスペースを調整
                  const [number, name] = value.split('. ');
                  return `${number}.${name}`; // スペースを削除
                }}
              />
              <Tooltip 
                formatter={(value) => [`${(value as number).toFixed(1)}%`, '確率']}
                labelFormatter={(label) => label || ""}
                contentStyle={{
                  backgroundColor: 'rgba(24, 24, 27, 0.9)',
                  border: '1px solid rgba(63, 63, 70, 0.5)',
                  borderRadius: '6px',
                  color: '#ffffff'
                }}
                labelStyle={{ color: '#ffffff' }}
                itemStyle={{ color: '#ffffff' }}
              />
              <Bar 
                dataKey="probability" 
                radius={[0, 4, 4, 0]}
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`}
                    fill={entry.name ? getGradientColor(entry.probability) : "transparent"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      {/* リスク/リワード設定 */}
      <Card className="w-full bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-zinc-100">投資設定</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-around">
            <div className="flex items-center gap-2">
              <span className="text-zinc-400">予算:</span>
              <span className="text-xl font-bold text-zinc-100">{budget.toLocaleString()}円</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-zinc-400">リスクリワード:</span>
              <span className="text-xl font-bold text-zinc-100">{riskRatio}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* チャート部分 */}
      <div className="grid md:grid-cols-2 lg:grid-cols-1 gap-4">
        <ProbabilityChart 
          data={winProbData} 
          title="単勝予想確率 上位5頭" 
        />
        <ProbabilityChart 
          data={placeProbData} 
          title="複勝予想確率 上位5頭" 
        />
      </div>
    </div>
  );
} 