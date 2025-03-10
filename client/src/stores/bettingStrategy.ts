import { atom } from 'jotai';
import type { BetProposal } from '@/lib/betEvaluation';
import type { Horse } from '@db/schema';
import type { GeminiAnalysisResult } from '@/lib/geminiAnalysis';
import type { HorseData } from '@/lib/betEvaluation';
import type { BettingOption } from '@/lib/betEvaluation';
import type { BetCorrelation } from '@/lib/geminiApi';

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
export const analysisResultAtom = atom<GeminiAnalysisResult | null>(null);

// 選択状態
export interface SelectionState {
  selectedBets: BetProposal[];
  availableHorses: HorseData[];
  availableBets: BettingOption[];
  isAiOptimized: boolean;
  conditionalProbabilities: BetCorrelation[];
}
export const selectionStateAtom = atom<SelectionState>({
  selectedBets: [],
  availableHorses: [],
  availableBets: [],
  isAiOptimized: false,
  conditionalProbabilities: []
});

// 追加: 条件付き確率用の独立したatom
export const conditionalProbabilitiesAtom = atom<BetCorrelation[]>([]);

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

// bettingOptionsAtomを追加
export const bettingOptionsAtom = atom<BetProposal[]>([]);

// オッズデータ
export const latestOddsAtom = atom<{ horseId: string; odds: number }[] | null>(null);

// メモ用のatomを追加
export const raceNotesAtom = atom<string>('');

// 馬券候補の統計情報を保存するatom
export interface BettingOptionsStats {
  evStats: { mean: number; std: number };
  oddsStats: { mean: number; std: number };
  probabilityStats: { mean: number; std: number };
  options: Array<{
    id: string;
    ev: number;
    odds: number;
    probability: number;
  }>;
}

export const bettingOptionsStatsAtom = atom<BettingOptionsStats | null>(null);

// ステップ遷移の制御
export const canProceedAtom = atom((get) => {
  const currentStep = get(currentStepAtom);
  const bettingOptions = get(bettingOptionsAtom);
  const selection = get(selectionStateAtom);
  const portfolio = get(portfolioAtom);

  switch (currentStep) {
    case 'ANALYSIS':
      // 馬券候補が計算されていれば次に進める
      return bettingOptions.length > 0;
    case 'SELECTION':
      return selection.selectedBets.length > 0;
    case 'PORTFOLIO':
      return portfolio !== null;
    default:
      return false;
  }
});

// Gemini API進捗状態を管理するatom
export const geminiProgressAtom = atom({
  step: 0, // 0: 開始前, 1: ステップ1実行中, 2: ステップ2実行中, 3: ステップ3実行中, 4: 完了
  message: '',
  error: null as string | null
}); 