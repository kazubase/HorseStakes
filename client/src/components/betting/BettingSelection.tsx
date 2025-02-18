import { useAtom } from 'jotai';
import { BettingOptionsTable } from "@/components/BettingOptionsTable";
import { selectionStateAtom, analysisResultAtom } from '@/stores/bettingStrategy';
import type { BetProposal } from '@/lib/betCalculator';

export function BettingSelection() {
  const [selectionState, setSelectionState] = useAtom(selectionStateAtom);
  const [analysisResult] = useAtom(analysisResultAtom);

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

  return (
    <div className="space-y-6">
      <BettingOptionsTable
        bettingOptions={analysisResult?.strategy.recommendations.map(rec => ({
          type: rec.type,
          horseName: rec.horses.join('-'),
          horses: rec.horses,
          stake: 0,
          expectedReturn: 0,
          probability: Number(rec.probability)
        })) || []}
        selectedBets={selectionState.selectedBets}
        onBetSelect={handleBetSelection}
      />
    </div>
  );
} 