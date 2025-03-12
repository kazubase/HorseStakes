import { useAtom } from 'jotai';
import { selectionStateAtom, geminiProgressAtom } from '@/stores/bettingStrategy';
import { BettingStrategyTable } from "@/components/BettingStrategyTable";
import { useMemo, useState, useEffect } from 'react';
import type { GeminiStrategy } from '@/lib/geminiApi';
import { normalizeStringProbability } from '@/lib/utils/probability';
import { Loader2 } from 'lucide-react';
import { Progress } from "@/components/ui/progress";

export function BettingPortfolio() {
  const [selectionState] = useAtom(selectionStateAtom);
  const [geminiProgress] = useAtom(geminiProgressAtom);
  const budget = Number(new URLSearchParams(window.location.search).get("budget")) || 10000;
  const [isLoading, setIsLoading] = useState(true);

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

    return {
      description: selectionState.isAiOptimized ? '購入予定' : '購入予定',
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

  // 馬券データが読み込まれたらローディングを終了
  useEffect(() => {
    if (selectionState.selectedBets.length > 0) {
      // Gemini APIを使用しない場合（手動最適化）は即時表示
      if (!selectionState.isAiOptimized || geminiProgress.step === 3) {
        // 少し遅延を入れてアニメーションを見せる
        const timer = setTimeout(() => {
          setIsLoading(false);
        }, 800);
        
        return () => clearTimeout(timer);
      }
    }
  }, [selectionState.selectedBets, selectionState.isAiOptimized, geminiProgress.step]);

  if (isLoading) {
    const progressValue = geminiProgress.step * 100 / 3; // 0, 25, 50, 75, 100
    
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground mb-4">{geminiProgress.message || 'ポートフォリオを最適化中...'}</p>
        
        {/* 進捗バー */}
        <div className="w-full max-w-md mb-2">
          <Progress value={progressValue} className="h-2" />
        </div>
        <p className="text-xs text-muted-foreground">
          ステップ {geminiProgress.step}/3: {getStepDescription(geminiProgress.step)}
        </p>
        
        {/* エラーメッセージ */}
        {geminiProgress.error && (
          <div className="mt-4 p-3 bg-destructive/10 text-destructive rounded-md">
            {geminiProgress.error}
          </div>
        )}
      </div>
    );
  }

  if (!strategy.recommendations.length) {
    return (
      <div className="text-center text-muted-foreground p-4">
        馬券が選択されていません
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

// ステップの説明を取得する関数
function getStepDescription(step: number): string {
  switch (step) {
    case 0:
      return "準備中";
    case 1:
      return "馬券間の相関関係とリスク分析";
    case 2:
      return "投資設定に基づく購入戦略策定";
    case 3:
      return "最適な資金配分";
    default:
      return "処理中";
  }
} 