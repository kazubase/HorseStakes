import { useAtom } from 'jotai';
import { selectionStateAtom, bettingOptionsAtom, horsesAtom, latestOddsAtom, winProbsAtom, placeProbsAtom, raceNotesAtom, currentStepAtom } from '@/stores/bettingStrategy';
import { BettingOptionsTable } from '@/components/BettingOptionsTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { BetProposal } from '@/lib/betEvaluation';
import { Button } from "@/components/ui/button";
import { calculateBetProposalsWithGemini } from "@/lib/betOptimizer";
import { useLocation } from "wouter";
import { Sparkles } from 'lucide-react';
import { useState, useEffect } from 'react';
import { ChevronUp } from 'lucide-react';

// メモ入力用のスティッキーフッターコンポーネント
const RaceNotesFooter = () => {
  const [raceNotes, setRaceNotes] = useAtom(raceNotesAtom);
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <div className={`
      fixed bottom-12 left-0 right-0 
      bg-background/80 backdrop-blur-sm
      border-t border-primary/10
      transition-all duration-200
      ${isExpanded ? 'h-48' : 'h-12'}
      z-40
    `}>
      <div 
        className="flex items-center justify-between px-4 h-12 cursor-pointer hover:bg-primary/5"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="text-sm font-medium">メモ</span>
        <ChevronUp className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
      </div>
      {isExpanded && (
        <div className="p-4 pt-0">
          <textarea
            value={raceNotes}
            onChange={(e) => setRaceNotes(e.target.value)}
            className="w-full h-32 bg-transparent border-0 resize-none focus:outline-none
              placeholder:text-muted-foreground text-foreground"
            placeholder="レース分析のメモを入力してください..."
          />
        </div>
      )}
    </div>
  );
};

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
  const riskRatio = Number(new URLSearchParams(window.location.search).get("risk")) || 1;
  const [isExpanded, setIsExpanded] = useState(false);
  const [, setCurrentStep] = useAtom(currentStepAtom);
  
  useEffect(() => {
    document.documentElement.style.setProperty('--footer-height', isExpanded ? '12rem' : '3rem');
  }, [isExpanded]);

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

      // 各馬券に投資額を追加
      const proposalsWithStakes = optimizedProposals.map((proposal, index) => ({
        ...proposal,
        stake: Math.round(budget * (1 / optimizedProposals.length)) // 均等配分
      }));

      // 最適化された馬券を選択状態に設定
      setSelectionState(prev => ({
        ...prev,
        selectedBets: proposalsWithStakes,
        isAiOptimized: true  // AIによる最適化フラグを追加
      }));

      // ポートフォリオステップに遷移
      setCurrentStep('PORTFOLIO');

    } catch (error) {
      console.error('AI最適化エラー:', error);
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
    <div className="relative min-h-screen pb-[calc(3rem+var(--footer-height))]">
      {/* AI最適化ボタン */}
      <div className="mb-6">
        <Button
          onClick={handleAiOptimization}
          className="w-full gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
        >
          <Sparkles className="h-4 w-4" />
          AI自動最適化
        </Button>
      </div>

      {/* 馬券候補 */}
      <div>
        <BettingOptionsTable 
          bettingOptions={bettingOptions}
          selectedBets={selectionState.selectedBets}
          onBetSelect={handleBetSelection}
        />
      </div>

      <RaceNotesFooter />
    </div>
  );
}