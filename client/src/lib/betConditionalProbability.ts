import { BetProposal, HorseData } from './betCalculator';
import { calculateJointProbability } from './betJointProbability';

// 条件付き確率の結果を表すインターフェース
export interface BetCorrelation {
  condition: {
    type: string;
    horses: string;
  };
  target: {
    type: string;
    horses: string;
  };
  probability: number;
}

// 券種の順序を定義
const betTypeOrder = [
  '単勝',
  '複勝',
  '枠連',
  'ワイド',
  '馬連',
  '馬単',
  '３連複',
  '３連単'
];

// 券種の優先順位を取得する関数
const getBetTypeOrder = (type: string): number => {
  const index = betTypeOrder.indexOf(type);
  return index === -1 ? betTypeOrder.length : index;
};

// 馬券間の条件付き確率を計算する関数
export const calculateConditionalProbability = (
  proposals: BetProposal[], 
  horses: HorseData[]
): BetCorrelation[] => {
  const correlations: BetCorrelation[] = [];
  
  for (let i = 0; i < proposals.length - 1; i++) {
    for (let j = i + 1; j < proposals.length; j++) {
      const bet1 = proposals[i];
      const bet2 = proposals[j];
      
      const jointProb = calculateJointProbability(bet1, bet2, horses);
      
      // bet1が的中した条件でbet2が的中する確率
      const conditionalProb1Given2 = bet1.probability > 0 ? jointProb / bet1.probability : 0;
      
      // bet2が的中した条件でbet1が的中する確率
      const conditionalProb2Given1 = bet2.probability > 0 ? jointProb / bet2.probability : 0;
      
      // ゼロでない条件付き確率のみを記録
      if (conditionalProb1Given2 > 0) {
        correlations.push({
          condition: {
            type: bet1.type,
            horses: bet1.horseName
          },
          target: {
            type: bet2.type,
            horses: bet2.horseName
          },
          probability: Number(conditionalProb1Given2.toFixed(3))
        });
      }
      
      if (conditionalProb2Given1 > 0) {
        correlations.push({
          condition: {
            type: bet2.type,
            horses: bet2.horseName
          },
          target: {
            type: bet1.type,
            horses: bet1.horseName
          },
          probability: Number(conditionalProb2Given1.toFixed(3))
        });
      }
    }
  }
  
  // 券種でグループ化してからソート
  return correlations.sort((a, b) => {
    // まず条件となる券種でソート
    const typeOrderDiff = getBetTypeOrder(a.condition.type) - getBetTypeOrder(b.condition.type);
    if (typeOrderDiff !== 0) return typeOrderDiff;
    
    // 同じ券種の場合は確率の高い順
    return b.probability - a.probability;
  });
}; 