import { useAtom } from 'jotai';
import { selectionStateAtom } from '@/stores/bettingStrategy';
import { BettingStrategyTable } from "@/components/BettingStrategyTable";
import { optimizeBetAllocation } from "@/lib/betCalculator";
import { useMemo } from 'react';
import { useLocation } from "wouter";

export function BettingPortfolio() {
  const [selectionState] = useAtom(selectionStateAtom);
  const [location] = useLocation();
  const urlParams = new URLSearchParams(location.split('?')[1]);
  const budget = Number(urlParams.get('budget')) || 10000;

  const optimizedPortfolio = useMemo(() => {
    if (!selectionState.selectedBets.length) return null;
    return optimizeBetAllocation(selectionState.selectedBets.map(bet => ({
      ...bet,
      odds: bet.expectedReturn / bet.stake,
      probability: bet.probability,
      reason: ''
    })), budget);
  }, [selectionState.selectedBets, budget]);

  if (!optimizedPortfolio) {
    return (
      <div className="text-center py-8">
        <p>馬券が選択されていません</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BettingStrategyTable
        strategy={{
          description: '最適化されたポートフォリオ',
          bettingTable: {
            headers: ['券種', '買い目', 'オッズ', '的中率', '投資額', '理由'],
            rows: []
          },
          recommendations: optimizedPortfolio.map(bet => ({
            ...bet,
            odds: bet.expectedReturn / bet.stake,
            probability: bet.probability,
            reason: ''
          })),
          summary: { riskLevel: 'MEDIUM' }
        }}
        totalBudget={budget}
      />
    </div>
  );
} 