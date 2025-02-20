import { useAtom } from 'jotai';
import { useQuery } from "@tanstack/react-query";
import { BettingOptionsTable } from "@/components/BettingOptionsTable";
import { selectionStateAtom, analysisResultAtom, horsesAtom, winProbsAtom, placeProbsAtom, bettingOptionsAtom } from '@/stores/bettingStrategy';
import type { BetProposal } from '@/lib/betEvaluation';
import type { GeminiAnalysisResult } from '@/lib/geminiAnalysis';
import type { Horse, TanOddsHistory, FukuOdds, WakurenOdds, UmarenOdds, WideOdds, UmatanOdds, Fuku3Odds, Tan3Odds } from "@db/schema";
import { evaluateBettingOptions } from '@/lib/betEvaluation';
import { useMemo } from 'react';
import { Spinner } from '@/components/ui/spinner';

export function BettingSelection() {
  const [selectionState, setSelectionState] = useAtom(selectionStateAtom);
  const [bettingOptions] = useAtom(bettingOptionsAtom);

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
    <div className="space-y-6">
      <BettingOptionsTable
        bettingOptions={bettingOptions}
        selectedBets={selectionState.selectedBets}
        onBetSelect={handleBetSelection}
      />
    </div>
  );
} 