import { useAtom, useAtomValue } from 'jotai';
import { selectionStateAtom, bettingOptionsAtom, horsesAtom, latestOddsAtom, winProbsAtom, placeProbsAtom, raceNotesAtom, currentStepAtom, conditionalProbabilitiesAtom, geminiProgressAtom } from '@/stores/bettingStrategy';
import { BettingOptionsTable } from '@/components/BettingOptionsTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { BetProposal } from '@/lib/betEvaluation';
import { Button } from "@/components/ui/button";
import { calculateBetProposalsWithGemini, optimizeBetAllocation } from "@/lib/betOptimizer";
import { useLocation } from "wouter";
import { Sparkles } from 'lucide-react';
import { useState, useEffect } from 'react';
import { ChevronUp } from 'lucide-react';
import { getDefaultStore } from 'jotai';

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
  const conditionalProbabilities = useAtomValue(conditionalProbabilitiesAtom);
  const budget = Number(new URLSearchParams(window.location.search).get("budget")) || 10000;
  const riskRatio = Number(new URLSearchParams(window.location.search).get("risk")) || 1;
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentStep, setCurrentStep] = useAtom(currentStepAtom);
  
  useEffect(() => {
    document.documentElement.style.setProperty('--footer-height', isExpanded ? '12rem' : '3rem');
  }, [isExpanded]);

  // 次へボタンが押されたときに呼び出される関数を追加
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('ステップ変更検知:', {
        currentStep,
        selectedBetsCount: selectionState.selectedBets.length,
        isAiOptimized: selectionState.isAiOptimized
      });
    }
    
    if (currentStep === "PORTFOLIO" && selectionState.selectedBets.length > 0 && !selectionState.isAiOptimized) {
      // 選択された馬券の資金配分を最適化
      const optimizeBets = async () => {
        try {
          if (process.env.NODE_ENV === 'development') {
            console.log('資金配分最適化開始:', {
              selectedBets: selectionState.selectedBets,
              budget
            });
          }
          
          // 選択された馬券を最適化用の形式に変換
          const recommendations = selectionState.selectedBets.map(bet => ({
            type: bet.type,
            horses: bet.horses,
            odds: bet.odds || bet.expectedReturn / bet.stake,
            probability: bet.probability,
            reason: bet.reason || '手動選択された馬券',
            frame1: bet.frame1,
            frame2: bet.frame2,
            frame3: bet.frame3,
            horse1: bet.horse1,
            horse2: bet.horse2,
            horse3: bet.horse3
          }));

          // 資金配分を最適化
          const optimizedBets = optimizeBetAllocation(recommendations, budget);
          
          if (process.env.NODE_ENV === 'development') {
            console.log('最適化結果:', optimizedBets);
          }

          // 最適化された馬券を選択状態に設定
          setSelectionState(prev => ({
            ...prev,
            selectedBets: optimizedBets
          }));
        } catch (error: any) {
          console.error('資金配分最適化エラー:', error);
          
          // エラー状態を更新
          const store = getDefaultStore();
          store.set(geminiProgressAtom, {
            step: -1,
            message: 'エラーが発生しました',
            error: error.message
          });
        }
      };

      optimizeBets();
    }
  }, [currentStep, selectionState.selectedBets.length, selectionState.isAiOptimized, budget, setSelectionState]);

  // AI最適化フラグをリセットする処理を追加
  useEffect(() => {
    if (currentStep === 'SELECTION' && selectionState.isAiOptimized) {
      // AI最適化フラグをリセット
      setSelectionState(prev => ({
        ...prev,
        isAiOptimized: false
      }));
      
      if (process.env.NODE_ENV === 'development') {
        console.log('AI最適化フラグをリセットしました');
      }
    }
  }, [currentStep, selectionState.isAiOptimized, setSelectionState]);

  const handleBetSelection = (bet: BetProposal) => {
    // デバッグ情報を追加
    if (process.env.NODE_ENV === 'development') {
      console.log('馬券選択処理開始:', {
        type: bet.type,
        horses: bet.horses,
        horseName: bet.horseName
      });
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('現在の選択状態:', selectionState.selectedBets.map(b => ({
        type: b.type,
        horses: b.horses,
        horseName: b.horseName
      })));
    }
    
    // 馬券の比較方法を修正
    // horseName を正規化して比較する
    const normalizeHorseName = (name: string) => {
      // 単勝・複勝の場合は馬番だけを取り出す
      if (name.includes(' ')) {
        return name.split(' ')[0];
      }
      return name;
    };
    
    const exists = selectionState.selectedBets.some(b => 
      b.type === bet.type && 
      normalizeHorseName(b.horseName || '') === normalizeHorseName(bet.horseName || '')
    );
    
    if (process.env.NODE_ENV === 'development') {
      console.log('比較結果:', {
        clickedBet: `${bet.type}:${bet.horseName}`,
        normalizedClickedBet: `${bet.type}:${normalizeHorseName(bet.horseName || '')}`,
        exists
      });
    }
    
    setSelectionState(prev => {
      if (exists) {
        const newSelectedBets = prev.selectedBets.filter(b => 
          !(b.type === bet.type && 
            normalizeHorseName(b.horseName || '') === normalizeHorseName(bet.horseName || ''))
        );
        if (process.env.NODE_ENV === 'development') {
          console.log('馬券を解除:', newSelectedBets.length);
        }
        return {
          ...prev,
          selectedBets: newSelectedBets
        };
      }
      if (process.env.NODE_ENV === 'development') {
        console.log('馬券を追加');
      }
      return {
        ...prev,
        selectedBets: [...prev.selectedBets, bet]
      };
    });
  };

  const handleAiOptimization = async () => {
    try {
      // まずポートフォリオ画面に遷移
      setCurrentStep('PORTFOLIO');
      
      if (!horses || !bettingOptions) {
        throw new Error('データが読み込まれていません');
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
        { 
          bettingOptions: bettingOptions.map(bet => ({
            type: bet.type as "単勝" | "複勝" | "枠連" | "ワイド" | "馬連" | "馬単" | "３連複" | "３連単",
            horseName: bet.horseName,
            odds: bet.expectedReturn / bet.stake,
            prob: bet.probability,
            ev: (bet.probability * bet.expectedReturn) / bet.stake,
            frame1: bet.frame1 || 0,
            frame2: bet.frame2 || 0,
            frame3: bet.frame3 || 0,
            horse1: bet.horse1 || 0,
            horse2: bet.horse2 || 0,
            horse3: bet.horse3 || 0,
          })),
          conditionalProbabilities
        },
        riskRatio
      );

      // デバッグ用：最適化された馬券提案のreasonプロパティを確認
      if (process.env.NODE_ENV === 'development') {
        console.log('最適化された馬券提案:', optimizedProposals.map(proposal => ({
          type: proposal.type,
          horses: proposal.horses.join('-'),
          reason: proposal.reason
        })));
      }

      // 各馬券に投資額を追加
      const proposalsWithStakes = optimizedProposals.map((proposal, index) => ({
        ...proposal,
      }));

      // 最適化された馬券を選択状態に設定
      setSelectionState(prev => ({
        ...prev,
        selectedBets: proposalsWithStakes,
        isAiOptimized: true  // AIによる最適化フラグを追加
      }));

    } catch (error: any) {
      console.error('AI最適化エラー:', error);
    }
  };

  // 馬券選択後に手動で最適化を行うボタンを追加
  const handleOptimizeBets = () => {
    if (selectionState.selectedBets.length > 0 && !selectionState.isAiOptimized) {
      try {
        // 進捗状態を更新
        const store = getDefaultStore();
        store.set(geminiProgressAtom, {
          step: 4, // 手動最適化は即時完了とする
          message: '最適化が完了しました',
          error: null
        });
        
        if (process.env.NODE_ENV === 'development') {
          console.log('資金配分最適化開始:', {
            selectedBets: selectionState.selectedBets,
            budget
          });
        }
        
        // 選択された馬券を最適化用の形式に変換
        const recommendations = selectionState.selectedBets.map(bet => ({
          type: bet.type,
          horses: bet.horses,
          odds: bet.odds || bet.expectedReturn / bet.stake,
          probability: bet.probability,
          reason: bet.reason || '手動選択された馬券',
          frame1: bet.frame1,
          frame2: bet.frame2,
          frame3: bet.frame3,
          horse1: bet.horse1,
          horse2: bet.horse2,
          horse3: bet.horse3
        }));

        // 資金配分を最適化
        const optimizedBets = optimizeBetAllocation(recommendations, budget);
        
        if (process.env.NODE_ENV === 'development') {
          console.log('最適化結果:', optimizedBets);
        }

        // 最適化された馬券を選択状態に設定
        setSelectionState(prev => ({
          ...prev,
          selectedBets: optimizedBets
        }));
        
        // ポートフォリオステップに遷移
        setCurrentStep('PORTFOLIO');
      } catch (error: any) {
        console.error('資金配分最適化エラー:', error);
        
        // エラー状態を更新
        const store = getDefaultStore();
        store.set(geminiProgressAtom, {
          step: -1,
          message: 'エラーが発生しました',
          error: error.message
        });
      }
    }
  };

  // 券種ごとの全選択・全解除機能を追加
  const handleSelectAllByType = (betType: string, select: boolean) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`${betType}の馬券を${select ? '全選択' : '全解除'}します`);
    }
    
    setSelectionState(prev => {
      // 現在の選択状態をコピー
      const currentSelected = [...prev.selectedBets];
      
      if (select) {
        // 選択する場合：まだ選択されていない同じ券種の馬券を追加
        const betsToAdd = bettingOptions
          .filter(bet => bet.type === betType)
          .filter(bet => !currentSelected.some(selected => 
            selected.type === bet.type && 
            selected.horseName === bet.horseName
          ));
        
        return {
          ...prev,
          selectedBets: [...currentSelected, ...betsToAdd]
        };
      } else {
        // 解除する場合：同じ券種の馬券をすべて削除
        return {
          ...prev,
          selectedBets: currentSelected.filter(bet => bet.type !== betType)
        };
      }
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
    <div className="relative min-h-screen pb-[calc(3rem+var(--footer-height))]">
      {/* ボタンを2列で表示 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* AI最適化ボタン */}
        <Button
          onClick={handleAiOptimization}
          className="w-full gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
        >
          <Sparkles className="h-4 w-4" />
          AI自動最適化
        </Button>

        {/* 手動最適化ボタン */}
        <Button
          onClick={handleOptimizeBets}
          disabled={selectionState.selectedBets.length === 0}
          className={`
            w-full gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 
            hover:from-blue-700 hover:to-cyan-700
            transition-opacity duration-300
            ${selectionState.selectedBets.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          選択した馬券で最適化
        </Button>
      </div>

      {/* 馬券候補 */}
      <div>
        <BettingOptionsTable 
          bettingOptions={bettingOptions}
          selectedBets={selectionState.selectedBets}
          onBetSelect={handleBetSelection}
          onSelectAllByType={handleSelectAllByType}
        />
      </div>

      <RaceNotesFooter />
    </div>
  );
}