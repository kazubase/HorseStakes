import { BetProposal, HorseData } from './betEvaluation';
import { calculateJointProbability } from './betJointProbability';

/**
 * 包除原理を使用して複数の馬券の的中確率の合計を計算する
 * 
 * @param proposals 馬券提案の配列
 * @param horses 出走馬データの配列
 * @returns 少なくとも1つの馬券が的中する確率
 */
export const calculateTotalProbability = (
  proposals: BetProposal[],
  horses: HorseData[]
): number => {
  // デバッグ用のログ
  console.log('calculateTotalProbability 入力:', { proposals, horses });
  
  if (proposals.length === 0) return 0;
  if (proposals.length === 1) return proposals[0].probability;

  // 包除原理の計算
  let totalProb = 0;

  // 1. 各馬券の確率を加算
  for (const proposal of proposals) {
    totalProb += proposal.probability;
    console.log(`加算: ${proposal.type} ${proposal.horses.join('-')} = ${proposal.probability}`);
  }
  console.log(`ステップ1後の合計: ${totalProb}`);

  // 2. 2つの馬券の同時的中確率を減算
  for (let i = 0; i < proposals.length - 1; i++) {
    for (let j = i + 1; j < proposals.length; j++) {
      try {
        const jointProb = calculateJointProbability(proposals[i], proposals[j], horses);
        totalProb -= jointProb;
        console.log(`減算: ${proposals[i].type} ${proposals[i].horses.join('-')} と ${proposals[j].type} ${proposals[j].horses.join('-')} の同時確率 = ${jointProb}`);
      } catch (error) {
        console.error('同時確率計算エラー:', error);
        // エラーが発生した場合は、同時確率を0とみなす
        console.log('同時確率を0として処理を続行');
      }
    }
  }
  console.log(`ステップ2後の合計: ${totalProb}`);

  // 3. 3つの馬券の同時的中確率を加算（3つ以上の馬券がある場合）
  if (proposals.length >= 3) {
    for (let i = 0; i < proposals.length - 2; i++) {
      for (let j = i + 1; j < proposals.length - 1; j++) {
        for (let k = j + 1; k < proposals.length; k++) {
          const jointProb12 = calculateJointProbability(proposals[i], proposals[j], horses);
          const jointProb13 = calculateJointProbability(proposals[i], proposals[k], horses);
          const jointProb23 = calculateJointProbability(proposals[j], proposals[k], horses);
          
          // 3つの馬券が同時に的中する確率を近似計算
          // 正確な計算には3つの馬券の同時確率計算関数が必要だが、
          // ここでは簡易的に2つずつの同時確率から推定
          const tripleJointProb = Math.min(
            jointProb12 * jointProb13 / proposals[i].probability,
            jointProb12 * jointProb23 / proposals[j].probability,
            jointProb13 * jointProb23 / proposals[k].probability
          );
          
          totalProb += tripleJointProb;
        }
      }
    }
    console.log(`ステップ3後の合計: ${totalProb}`);
  }

  // 4. 4つ以上の馬券の同時的中確率については省略（必要に応じて拡張可能）
  
  // 確率は0〜1の範囲に収める
  const result = Math.max(0, Math.min(1, totalProb));
  console.log(`最終結果: ${result}`);
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
  const expectedReturns = proposals.map(bet => bet.probability * bet.expectedReturn);
  
  // 同時的中による重複計算を調整
  for (let i = 0; i < proposals.length - 1; i++) {
    for (let j = i + 1; j < proposals.length; j++) {
      const jointProb = calculateJointProbability(proposals[i], proposals[j], horses);
      // 同時的中の場合の期待払戻金を減算（重複計算分）
      const duplicateReturn = jointProb * (proposals[i].expectedReturn + proposals[j].expectedReturn);
      expectedReturns.push(-duplicateReturn);
    }
  }
  
  // 総期待払戻金
  const totalExpectedReturn = expectedReturns.reduce((sum, value) => sum + value, 0);
  
  // 期待値（収益率）を計算
  return totalInvestment > 0 ? (totalExpectedReturn / totalInvestment) - 1 : 0;
};