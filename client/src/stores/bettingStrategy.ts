import { atom } from 'jotai';
import type { BetProposal } from '@/lib/betCalculator';
import type { Horse } from '@db/schema';
import type { GeminiResponse } from '@/lib/geminiApi';

// ステップ管理
export type BettingStep = 'ANALYSIS' | 'SELECTION' | 'PORTFOLIO';
export const currentStepAtom = atom<BettingStep>('ANALYSIS');

// 基本データ
export const horsesAtom = atom<Horse[] | null>(null);
export const winProbsAtom = atom<Record<string, number>>({});
export const placeProbsAtom = atom<Record<string, number>>({});

// 分析結果
export interface AnalysisResult {
  bettingOptions: BetProposal[];
  riskMetrics: {
    expectedReturn: number;
    risk: number;
    sharpeRatio: number;
  };
}
export const analysisResultAtom = atom<GeminiResponse | null>(null);

// 選択状態
export interface SelectionState {
  mode: 'manual' | 'ai';
  selectedBets: BetProposal[];
}
export const selectionStateAtom = atom<SelectionState>({
  mode: 'manual',
  selectedBets: []
});

// ポートフォリオ
export interface Portfolio {
  optimizedBets: BetProposal[];
  metrics: {
    totalInvestment: number;
    expectedReturn: number;
    risk: number;
    sharpeRatio: number;
  };
}
export const portfolioAtom = atom<Portfolio | null>(null);

// ステップ遷移の制御
export const canProceedAtom = atom((get) => {
  const currentStep = get(currentStepAtom);
  const analysis = get(analysisResultAtom);
  const selection = get(selectionStateAtom);
  const portfolio = get(portfolioAtom);

  switch (currentStep) {
    case 'ANALYSIS':
      return analysis !== null;
    case 'SELECTION':
      return selection.selectedBets.length > 0;
    case 'PORTFOLIO':
      return portfolio !== null;
    default:
      return false;
  }
}); 