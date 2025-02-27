import { useAtom } from 'jotai';
import { selectionStateAtom, bettingOptionsAtom, horsesAtom, latestOddsAtom, winProbsAtom, placeProbsAtom, raceNotesAtom } from '@/stores/bettingStrategy';
import { BettingOptionsTable } from '@/components/BettingOptionsTable';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { BetProposal, BettingOption } from '@/lib/betEvaluation';
import { useMemo, useCallback } from 'react';
import { calculateConditionalProbability } from '@/lib/betConditionalProbability';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Button } from "@/components/ui/button";
import { calculateBetProposalsWithGemini } from "@/lib/betOptimizer";
import { useLocation } from "wouter";
import { Sparkles } from 'lucide-react';
import { getAiOptimizedStrategy } from '@/lib/geminiOptimizer';

export function BettingSelection() {
  const [, setLocation] = useLocation();
  const [selectionState, setSelectionState] = useAtom(selectionStateAtom);
  const [bettingOptions] = useAtom(bettingOptionsAtom);
  const [horses] = useAtom(horsesAtom);
  const [latestOdds] = useAtom(latestOddsAtom);
  const [winProbs] = useAtom(winProbsAtom);
  const [placeProbs] = useAtom(placeProbsAtom);
  const [raceNotes, setRaceNotes] = useAtom(raceNotesAtom);
  const budget = Number(new URLSearchParams(window.location.search).get("budget")) || 10000;

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
      odds: latestOdds?.find(odd => Number(odd.horseId) === horse.number)?.odds || 0,
      winProb: winProbs[horse.id] / 100 || 0,
      placeProb: placeProbs[horse.id] / 100 || 0
    }));

    // 選択された全ての馬券を一意のキーでソート
    const sortedBets = [...selectionState.selectedBets].sort((a, b) => {
      const keyA = `${a.type}-${a.horseName}`;
      const keyB = `${b.type}-${b.horseName}`;
      return keyA.localeCompare(keyB);
    });

    // 全ての馬券の組み合わせの条件付き確率を計算
    const correlations = calculateConditionalProbability(
      sortedBets,
      horsesWithProbs
    );

    return {
      correlations,
      averageCorrelation: correlations.reduce((sum, c) => sum + c.probability, 0) / correlations.length
    };
  }, [horses, selectionState.selectedBets, latestOdds, winProbs, placeProbs]);

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

  const handleAiOptimization = useCallback(async () => {
    try {
      if (!horses || !latestOdds || !winProbs || !placeProbs) {
        console.error('必要なデータが不足しています');
        return;
      }

      const horsesWithProbs = horses.map(horse => ({
        name: horse.name,
        number: horse.number,
        odds: Number(latestOdds.find(odd => Number(odd.horseId) === horse.number)?.odds || 0),
        winProb: winProbs[horse.id] / 100,
        placeProb: placeProbs[horse.id] / 100,
        frame: horse.frame
      }));

      const aiProposals = await getAiOptimizedStrategy({
        horses: horsesWithProbs,
        bettingOptions: bettingOptions.map(opt => ({
          ...opt,
          type: opt.type as "単勝" | "複勝" | "枠連" | "ワイド" | "馬連" | "馬単" | "３連複" | "３連単",
          odds: opt.expectedReturn / opt.stake,
          prob: opt.probability,
          ev: opt.expectedReturn/opt.stake*opt.probability,
          frame1: opt.frame1 || 0,
          frame2: opt.frame2 || 0,
          frame3: opt.frame3 || 0,
          horse1: opt.horse1 || 0,
          horse2: opt.horse2 || 0,
          horse3: opt.horse3 || 0
        })),
        budget,
        riskRatio: 10
      });

      setSelectionState(prev => ({
        ...prev,
        selectedBets: aiProposals
      }));

      setLocation(`/portfolio?budget=${budget}&aiOptimized=true`);
    } catch (error) {
      console.error('AI最適化エラー:', error);
    }
  }, [horses, latestOdds, winProbs, placeProbs, bettingOptions, budget, setSelectionState, setLocation]);

  if (!bettingOptions.length) {
    return (
      <div className="text-center text-muted-foreground p-4">
        馬券候補を計算できませんでした
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* モバイルでのAI最適化ボタン */}
      <div className="lg:hidden">
        <Button
          onClick={handleAiOptimization}
          className="w-full gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
        >
          <Sparkles className="h-4 w-4" />
          AI自動最適化
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左側: 馬券候補 - stickyスクロール適用 */}
        <div className="lg:h-fit lg:sticky lg:top-4">
          <BettingOptionsTable 
            bettingOptions={bettingOptions}
            selectedBets={selectionState.selectedBets}
            onBetSelect={handleBetSelection}
          />
        </div>

        {/* 右側: AI最適化ボタンとメモ欄 - stickyスクロール適用 */}
        <div className="space-y-4 lg:h-fit lg:sticky lg:top-4">
          {/* デスクトップでのAI最適化ボタン */}
          <div className="hidden lg:block">
            <Button
              onClick={handleAiOptimization}
              className="w-full gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
            >
              <Sparkles className="h-4 w-4" />
              AI自動最適化
            </Button>
          </div>

          <Card className="overflow-hidden bg-gradient-to-br from-black/40 to-primary/5">
            <CardHeader className="relative pb-4">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-background/5 to-transparent opacity-30" />
              <CardTitle className="relative">メモ</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative overflow-hidden rounded-lg bg-black/40 backdrop-blur-sm border border-primary/10 focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary/50 transition-all duration-200">
                <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
                <textarea
                  value={raceNotes}
                  onChange={(e) => setRaceNotes(e.target.value)}
                  className="w-full h-32 p-3 bg-transparent border-0 resize-none 
                    focus:outline-none
                    placeholder:text-muted-foreground text-foreground relative"
                  placeholder="レース分析のメモを入力してください..."
                />
              </div>
            </CardContent>
          </Card>
        </div>
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