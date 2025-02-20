import { useAtom } from 'jotai';
import { selectionStateAtom, bettingOptionsAtom } from '@/stores/bettingStrategy';
import { BettingOptionsTable } from '@/components/BettingOptionsTable';
import type { BetProposal } from '@/lib/betEvaluation';

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