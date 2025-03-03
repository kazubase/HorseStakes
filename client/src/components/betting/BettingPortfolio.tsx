import { useAtom } from 'jotai';
import { selectionStateAtom } from '@/stores/bettingStrategy';
import { BettingStrategyTable } from "@/components/BettingStrategyTable";
import { useMemo } from 'react';
import type { GeminiStrategy } from '@/lib/geminiApi';
import { normalizeStringProbability } from '@/lib/utils/probability';

export function BettingPortfolio() {
  const [selectionState] = useAtom(selectionStateAtom);
  const budget = Number(new URLSearchParams(window.location.search).get("budget")) || 10000;

  const strategy: GeminiStrategy = useMemo(() => {
    if (!selectionState.selectedBets.length) {
      return {
        description: '選択された馬券がありません',
        recommendations: [],
        summary: {
          riskLevel: selectionState.isAiOptimized ? 'AI_OPTIMIZED' : 'USER_SELECTED',
          description: ''
        },
        bettingTable: {
          headers: ['券種', '買い目', 'オッズ', '的中率', '投資額', '理由'],
          rows: []
        }
      };
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('選択された馬券:', selectionState.selectedBets.map(bet => ({
        type: bet.type,
        horses: bet.horses.join('-'),
        reason: bet.reason
      })));
    }

    const recommendations = selectionState.selectedBets.map(bet => ({
      type: bet.type,
      horses: bet.horses,
      odds: bet.odds || bet.expectedReturn / bet.stake,
      probability: normalizeStringProbability(bet.probability),
      reason: bet.reason || '理由なし',
      frame1: bet.frame1,
      frame2: bet.frame2,
      frame3: bet.frame3,
      horse1: bet.horse1,
      horse2: bet.horse2,
      horse3: bet.horse3,
      stake: bet.stake,
      expectedReturn: bet.expectedReturn
    }));

    if (process.env.NODE_ENV === 'development') {
      console.log('変換後のrecommendations:', recommendations.map(rec => ({
        type: rec.type,
        horses: rec.horses.join('-'),
        reason: rec.reason
      })));
    }

    return {
      description: selectionState.isAiOptimized ? 'AI自動最適化ポートフォリオ' : 'ユーザー選択ポートフォリオ',
      recommendations,
      summary: {
        riskLevel: selectionState.isAiOptimized ? 'AI_OPTIMIZED' : 'USER_SELECTED',
        description: selectionState.isAiOptimized
          ? 'AIが選択した馬券の最適な組み合わせです'
          : 'ユーザーが選択した馬券の最適な資金配分です'
      },
      bettingTable: {
        headers: ['券種', '買い目', 'オッズ', '的中率', '投資額', '理由'],
        rows: recommendations.map(rec => [
          rec.type,
          rec.horses.join('-'),
          rec.odds.toFixed(1),
          typeof rec.probability === 'number' 
            ? `${(rec.probability * 100).toFixed(1)}%`
            : rec.probability,
          rec.stake ? rec.stake.toLocaleString() : Math.round(budget * (1 / recommendations.length)).toLocaleString(),
          rec.reason
        ])
      }
    };
  }, [selectionState.selectedBets, selectionState.isAiOptimized, budget]);

  if (!strategy.recommendations.length) {
    return (
      <div className="text-center py-8">
        <p>馬券が選択されていません</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BettingStrategyTable
        strategy={strategy}
        totalBudget={budget}
      />
    </div>
  );
} 