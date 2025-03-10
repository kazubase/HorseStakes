import { BetProposal, HorseData } from './betEvaluation';
import { calculateJointProbability } from './betJointProbability';

/**
 * 包除原理を使用して複数の馬券の的中確率の合計を計算する（一般化版）
 * 
 * @param proposals 馬券提案の配列
 * @param horses 出走馬データの配列
 * @returns 少なくとも1つの馬券が的中する確率
 */
export const calculateTotalProbability = (
  proposals: BetProposal[],
  horses: HorseData[]
): number => {
  if (proposals.length === 0) return 0;
  if (proposals.length === 1) return proposals[0].probability;

  // 包除原理の一般化された計算
  let totalProb = 0;
  const n = proposals.length;

  // すべての部分集合の組み合わせを生成し、包除原理を適用
  for (let k = 1; k <= n; k++) {
    // k個の要素を選ぶすべての組み合わせを生成
    const combinations = generateCombinations(proposals, k);
    
    // 符号を決定（奇数個なら加算、偶数個なら減算）
    const sign = k % 2 === 1 ? 1 : -1;
    
    // 各組み合わせについて同時確率を計算
    for (const combination of combinations) {
      const jointProb = calculateJointProbabilityOfMultiple(combination, horses);
      totalProb += sign * jointProb;
    }
  }
  
  // 確率は0〜1の範囲に収める
  return Math.max(0, Math.min(1, totalProb));
};

/**
 * 複数の馬券の同時的中確率を計算する
 * 
 * @param bets 馬券の配列
 * @param horses 出走馬データの配列
 * @returns 同時的中確率
 */
const calculateJointProbabilityOfMultiple = (
  bets: BetProposal[],
  horses: HorseData[]
): number => {
  if (bets.length === 0) return 0;
  if (bets.length === 1) return bets[0].probability;
  
  // 2つの馬券の同時確率は既存の関数を使用
  if (bets.length === 2) {
    try {
      return calculateJointProbability(bets[0], bets[1], horses);
    } catch (error) {
      return 0;
    }
  }
  
  // 3つ以上の馬券の同時確率は再帰的に計算
  // A∩B∩C∩... = A ∩ (B∩C∩...)
  try {
    // 最初の馬券を取り出す
    const firstBet = bets[0];
    // 残りの馬券の同時確率を再帰的に計算
    const restBets = bets.slice(1);
    const restJointProb = calculateJointProbabilityOfMultiple(restBets, horses);
    
    // 最初の馬券と残りの馬券の同時確率を計算
    // これは近似計算になるが、より一般的な方法
    if (restJointProb === 0) return 0;
    
    // 条件付き確率の積を使って計算
    // P(A∩B∩C∩...) = P(A) * P(B∩C∩...|A)
    
    // 各馬券と最初の馬券の同時確率を計算
    const conditionalProbs = restBets.map(bet => {
      const jointProb = calculateJointProbability(firstBet, bet, horses);
      // P(Bet|A) = P(A∩Bet) / P(A)
      return jointProb / firstBet.probability;
    });
    
    // 条件付き確率の積を計算（独立と仮定）
    // これは近似だが、一般的なケースでは十分な精度
    const conditionalJointProb = conditionalProbs.reduce((prod, p) => prod * p, 1);
    
    // 最終的な同時確率
    // P(A∩B∩C∩...) = P(A) * P(B∩C∩...|A)
    return firstBet.probability * conditionalJointProb;
  } catch (error) {
    return 0;
  }
};

/**
 * 配列からk個の要素を選ぶすべての組み合わせを生成
 */
const generateCombinations = <T>(array: T[], k: number): T[][] => {
  const result: T[][] = [];

  // 再帰的に組み合わせを生成
  const combine = (start: number, current: T[]) => {
    if (current.length === k) {
      result.push([...current]);
      return;
    }

    for (let i = start; i < array.length; i++) {
      current.push(array[i]);
      combine(i + 1, current);
      current.pop();
    }
  };

  combine(0, []);
  return result;
};

/**
 * 複数の馬券から最適な組み合わせを見つける
 * 
 * @param proposals 馬券提案の配列
 * @param horses 出走馬データの配列
 * @param maxSelections 最大選択数（デフォルト: 3）
 * @returns 最適な馬券の組み合わせと、その組み合わせの的中確率
 */
export const findOptimalCombination = (
  proposals: BetProposal[],
  horses: HorseData[],
  maxSelections: number = 3
): { selectedBets: BetProposal[], totalProbability: number } => {
  if (proposals.length <= maxSelections) {
    // 馬券数が最大選択数以下の場合はすべて選択
    return {
      selectedBets: [...proposals],
      totalProbability: calculateTotalProbability(proposals, horses)
    };
  }

  // すべての組み合わせを生成して評価
  const combinations = generateCombinations(proposals, maxSelections);
  let bestCombination: BetProposal[] = [];
  let highestProbability = 0;

  for (const combination of combinations) {
    const probability = calculateTotalProbability(combination, horses);
    if (probability > highestProbability) {
      highestProbability = probability;
      bestCombination = combination;
    }
  }

  return {
    selectedBets: bestCombination,
    totalProbability: highestProbability
  };
};

/**
 * 馬券の組み合わせの期待値を計算
 * 
 * @param proposals 馬券提案の配列
 * @param horses 出走馬データの配列
 * @returns 期待値（投資額に対する期待収益率）
 */
export const calculateExpectedValue = (
  proposals: BetProposal[],
  horses: HorseData[]
): number => {
  if (proposals.length === 0) return 0;

  // 総投資額を計算
  const totalInvestment = proposals.reduce((sum, bet) => sum + bet.stake, 0);
  
  // 各馬券の期待払戻金を計算
  let totalExpectedReturn = 0;
  
  // 包除原理を使用して期待払戻金を計算
  for (let k = 1; k <= proposals.length; k++) {
    // k個の要素を選ぶすべての組み合わせを生成
    const combinations = generateCombinations(proposals, k);
    
    // 符号を決定（奇数個なら加算、偶数個なら減算）
    const sign = k % 2 === 1 ? 1 : -1;
    
    // 各組み合わせについて同時確率と期待払戻金を計算
    for (const combination of combinations) {
      const jointProb = calculateJointProbabilityOfMultiple(combination, horses);
      const combinationReturn = combination.reduce((sum, bet) => sum + bet.expectedReturn, 0);
      totalExpectedReturn += sign * jointProb * combinationReturn;
    }
  }
  
  // 期待値（収益率）を計算
  return totalInvestment > 0 ? (totalExpectedReturn / totalInvestment) - 1 : 0;
};