import { useAtom } from 'jotai';
import { selectionStateAtom, bettingOptionsAtom, horsesAtom } from '@/stores/bettingStrategy';
import { BettingOptionsTable } from '@/components/BettingOptionsTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { BetProposal } from '@/lib/betEvaluation';
import { useMemo } from 'react';
import { calculateConditionalProbability } from '@/lib/betConditionalProbability';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function BettingSelection() {
  const [selectionState, setSelectionState] = useAtom(selectionStateAtom);
  const [bettingOptions] = useAtom(bettingOptionsAtom);
  const [horses] = useAtom(horsesAtom);

  // 選択された馬券の統計を計算
  const statistics = useMemo(() => {
    const selectedBets = selectionState.selectedBets;
    if (!selectedBets.length) return null;

    const totalInvestment = selectedBets.reduce((sum, bet) => sum + bet.stake, 0);
    const totalExpectedReturn = selectedBets.reduce((sum, bet) => sum + bet.expectedReturn, 0);
    
    // リスク計算（単純な標準偏差を使用）
    const returns = selectedBets.map(bet => bet.expectedReturn);
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    const risk = Math.sqrt(variance);

    // シャープレシオ（リスク調整後リターン）
    const sharpeRatio = (totalExpectedReturn - totalInvestment) / risk;

    return {
      totalInvestment,
      totalExpectedReturn,
      expectedProfit: totalExpectedReturn - totalInvestment,
      risk,
      sharpeRatio
    };
  }, [selectionState.selectedBets]);

  // 選択された馬券の条件付き確率を計算
  const correlationAnalysis = useMemo(() => {
    if (!horses || !selectionState.selectedBets.length) return null;

    const horsesWithProbs = horses.map(horse => ({
      ...horse,
      odds: 0, // TODO: 実際のオッズを設定
      winProb: 0, // TODO: 実際の確率を設定
      placeProb: 0 // TODO: 実際の確率を設定
    }));

    const correlations = calculateConditionalProbability(
      selectionState.selectedBets,
      horsesWithProbs
    );

    // 相関の強さに基づいてグループ化
    const strongCorrelations = correlations.filter(c => c.probability > 0.7);
    const moderateCorrelations = correlations.filter(c => c.probability > 0.3 && c.probability <= 0.7);
    const weakCorrelations = correlations.filter(c => c.probability > 0 && c.probability <= 0.3);

    return {
      correlations,
      strongCorrelations,
      moderateCorrelations,
      weakCorrelations,
      averageCorrelation: correlations.reduce((sum, c) => sum + c.probability, 0) / correlations.length
    };
  }, [horses, selectionState.selectedBets]);

  // リスク・リターンデータの計算
  const riskReturnData = useMemo(() => {
    if (!correlationAnalysis || !statistics) return null;

    return selectionState.selectedBets.map(bet => {
      // 他の馬券との条件付き確率の平均を計算
      const relatedCorrelations = correlationAnalysis.correlations.filter(
        corr => corr.condition.type === bet.type && 
               corr.condition.horses === bet.horseName
      );
      
      const avgCorrelation = relatedCorrelations.length > 0
        ? relatedCorrelations.reduce((sum, c) => sum + c.probability, 0) / relatedCorrelations.length
        : 0;

      // リスク計算（条件付き確率で調整）
      const adjustedRisk = Math.sqrt(
        bet.probability * Math.pow(bet.expectedReturn - bet.stake, 2) +
        (1 - bet.probability) * Math.pow(-bet.stake, 2)
      ) * (1 - avgCorrelation); // 相関が高いほどリスクを低減

      return {
        name: `${bet.type} ${bet.horses.join('-')}`,
        risk: Number(adjustedRisk.toFixed(2)),
        return: Number((bet.expectedReturn / bet.stake - 1).toFixed(2)),
        correlation: Number((avgCorrelation * 100).toFixed(1))
      };
    });
  }, [correlationAnalysis, statistics, selectionState.selectedBets]);

  const handleBetSelection = (bet: BetProposal) => {
    setSelectionState(prev => {
      const exists = prev.selectedBets.some(b => 
        b.type === bet.type && 
        b.horses.join(',') === bet.horses.join(',')
      );
      
      if (exists) {
        return {
          ...prev,
          selectedBets: prev.selectedBets.filter(b => 
            b.type !== bet.type || 
            b.horses.join(',') !== bet.horses.join(',')
          )
        };
      }
      return {
        ...prev,
        selectedBets: [...prev.selectedBets, bet]
      };
    });
  };

  if (!bettingOptions.length) {
    return (
      <div className="text-center text-muted-foreground p-4">
        馬券候補を計算できませんでした
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 左側: 馬券候補 */}
      <div>
        <BettingOptionsTable 
          bettingOptions={bettingOptions}
          selectedBets={selectionState.selectedBets}
          onBetSelect={handleBetSelection}
        />
      </div>

      {/* 右側: 分析ダッシュボード */}
      <div className="space-y-6">
        {/* 統計サマリー */}
        {statistics && (
          <Card>
            <CardHeader className="py-2 px-3">
              <CardTitle className="text-base">選択された馬券の分析</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">投資額</div>
                  <div className="text-lg font-bold">
                    {statistics.totalInvestment.toLocaleString()}円
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">期待収益</div>
                  <div className="text-lg font-bold">
                    {statistics.expectedProfit.toLocaleString()}円
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">リスク</div>
                  <div className="text-lg font-bold">
                    {statistics.risk.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">シャープレシオ</div>
                  <div className="text-lg font-bold">
                    {statistics.sharpeRatio.toFixed(2)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 相関分析の表示 */}
        {correlationAnalysis && (
          <Card>
            <CardHeader className="py-2 px-3">
              <CardTitle className="text-base">馬券間の相関分析</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-muted-foreground">平均相関</div>
                  <div className="text-lg font-bold">
                    {(correlationAnalysis.averageCorrelation * 100).toFixed(1)}%
                  </div>
                </div>

                {correlationAnalysis.strongCorrelations.length > 0 && (
                  <div>
                    <div className="text-sm font-medium mb-2">強い相関関係</div>
                    {correlationAnalysis.strongCorrelations.map((corr, i) => (
                      <div key={i} className="text-sm text-muted-foreground">
                        {corr.condition.type} {corr.condition.horses} →{' '}
                        {corr.target.type} {corr.target.horses}:{' '}
                        {(corr.probability * 100).toFixed(1)}%
                      </div>
                    ))}
                  </div>
                )}

                {correlationAnalysis.moderateCorrelations.length > 0 && (
                  <div>
                    <div className="text-sm font-medium mb-2">中程度の相関関係</div>
                    {correlationAnalysis.moderateCorrelations.map((corr, i) => (
                      <div key={i} className="text-sm text-muted-foreground">
                        {corr.condition.type} {corr.condition.horses} →{' '}
                        {corr.target.type} {corr.target.horses}:{' '}
                        {(corr.probability * 100).toFixed(1)}%
                      </div>
                    ))}
                  </div>
                )}

                {correlationAnalysis.weakCorrelations.length > 0 && (
                  <div>
                    <div className="text-sm font-medium mb-2">弱い相関関係</div>
                    {correlationAnalysis.weakCorrelations.map((corr, i) => (
                      <div key={i} className="text-sm text-muted-foreground">
                        {corr.condition.type} {corr.condition.horses} →{' '}
                        {corr.target.type} {corr.target.horses}:{' '}
                        {(corr.probability * 100).toFixed(1)}%
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 選択された馬券の内訳 */}
        {statistics && (
          <Card>
            <CardHeader className="py-2 px-3">
              <CardTitle className="text-base">選択された馬券</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-3">
                {selectionState.selectedBets.map((bet, index) => (
                  <div key={index} className="flex justify-between items-center p-2 rounded-md bg-muted/30">
                    <div>
                      <div className="font-medium">{bet.type}</div>
                      <div className="text-sm text-muted-foreground">
                        {bet.horses.join('-')}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        {bet.expectedReturn.toLocaleString()}円
                      </div>
                      <div className="text-sm text-muted-foreground">
                        期待値: {(bet.expectedReturn/bet.stake * bet.probability).toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* リスク・リターン分析グラフ */}
        {riskReturnData && (
          <Card>
            <CardHeader className="py-2 px-3">
              <CardTitle className="text-base">リスク・リターン分析</CardTitle>
            </CardHeader>
            <CardContent className="p-4 h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    type="number" 
                    dataKey="risk" 
                    name="リスク" 
                    label={{ value: 'リスク', position: 'bottom' }} 
                  />
                  <YAxis 
                    type="number" 
                    dataKey="return" 
                    name="期待リターン" 
                    label={{ value: '期待リターン', angle: -90, position: 'insideLeft' }} 
                  />
                  <Tooltip 
                    content={({ payload }) => {
                      if (!payload?.[0]) return null;
                      const data = payload[0].payload;
                      return (
                        <div className="bg-background/95 p-2 rounded-lg border shadow-sm">
                          <div className="font-medium">{data.name}</div>
                          <div className="text-sm text-muted-foreground">
                            リスク: {data.risk}<br />
                            リターン: {data.return}<br />
                            相関: {data.correlation}%
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Scatter 
                    data={riskReturnData} 
                    fill="#22c55e"
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

interface BetCardProps {
  bet: BetProposal;
  isSelected: boolean;
  onSelect: () => void;
}

function BetCard({ bet, isSelected, onSelect }: BetCardProps) {
  return (
    <button
      onClick={onSelect}
      className={`w-full p-4 rounded-lg border transition-colors ${
        isSelected 
          ? 'border-primary bg-primary/10' 
          : 'border-border hover:border-primary/50'
      }`}
    >
      <div className="flex justify-between items-center">
        <div>
          <div className="font-medium">{bet.type}</div>
          <div className="text-sm text-muted-foreground">
            {bet.horses.join('-')}
          </div>
        </div>
        <div className="text-right">
          <div className="font-medium">
            ×{(bet.expectedReturn/bet.stake).toFixed(1)}
          </div>
          <div className="text-sm text-muted-foreground">
            期待値: {(bet.expectedReturn/bet.stake * bet.probability).toFixed(2)}
          </div>
        </div>
      </div>
    </button>
  );
} 