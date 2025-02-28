import { useAtom } from 'jotai';
import { selectionStateAtom, bettingOptionsAtom, horsesAtom, latestOddsAtom, winProbsAtom, placeProbsAtom, raceNotesAtom } from '@/stores/bettingStrategy';
import { BettingOptionsTable } from '@/components/BettingOptionsTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { BetProposal } from '@/lib/betEvaluation';
import { Button } from "@/components/ui/button";
import { calculateBetProposalsWithGemini } from "@/lib/betOptimizer";
import { useLocation } from "wouter";
import { Sparkles } from 'lucide-react';

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
  const riskRatio = Number(new URLSearchParams(window.location.search).get("riskRatio")) || 1;


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

  const handleAiOptimization = async () => {
    try {
      if (!horses) {
        throw new Error('馬データが読み込まれていません');
      }

      // 馬データを準備
      const horseData = horses.map(horse => ({
        name: horse.name,
        odds: Number(latestOdds?.find(odd => Number(odd.horseId) === horse.number)?.odds || 0),
        winProb: winProbs[horse.id] / 100,
        placeProb: placeProbs[horse.id] / 100,
        frame: horse.frame,
        number: horse.number
      }));

      // Geminiを使用して最適化された馬券提案を取得
      const optimizedProposals = await calculateBetProposalsWithGemini(
        horseData,
        budget,
        { bettingOptions: selectionState.availableBets },
        riskRatio
      );

      // 最適化された馬券を選択状態に設定
      setSelectionState(prev => ({
        ...prev,
        selectedBets: optimizedProposals
      }));

      // ポートフォリオページに遷移
      setLocation(`?step=PORTFOLIO&aiOptimized=true&budget=${budget}&riskRatio=${riskRatio}`);

    } catch (error) {
      console.error('AI最適化エラー:', error);
      // エラー処理（UIでのエラー表示など）
    }
  };

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