import type { GeminiRecommendation } from './geminiApi';
import { type BetProposal, type HorseData, type BettingOption, evaluateBettingOptions } from './betEvaluation';
import { calculateConditionalProbability } from './betConditionalProbability';
import { getGeminiStrategy } from './geminiApi';
import { normalizeStringProbability } from './utils/probability';

export const optimizeBetAllocation = (
    recommendations: GeminiRecommendation[],
    totalBudget: number
  ): BetProposal[] => {
    if (process.env.NODE_ENV === 'development') {
      console.group('Sharpe比最大化による資金配分の最適化');
    }
    
    const processedRecs = recommendations.map(rec => ({
      ...rec,
      probability: normalizeStringProbability(rec.probability)
    }));
  
    // 馬券間の排反関係を計算する関数
    const calculateMutualExclusivity = (bet1: GeminiRecommendation, bet2: GeminiRecommendation): number => {
      // 同じ馬券種別の場合
      if (bet1.type === bet2.type) {
        // 単勝・枠連・馬連・馬単・3連複・3連単は完全に排反
        if (["単勝","枠連","馬連","馬単","３連複","３連単"].includes(bet1.type)) {
          return 1.0;
        }
        
        // 複勝の場合
        if (bet1.type === "複勝") {
          // 同じ馬を含む場合
          if (bet1.horses.some(h => bet2.horses.includes(h))) {
            return 1.0;  // 同じ馬の複勝を重複購入することはないため
          }
          // 異なる馬の場合は、3着以内に入る確率の関係で部分的に排反
          return 0.4;  // 簡略化した近似値
        }
        
        // ワイドの場合
        if (bet1.type === "ワイド") {
          const commonHorses = bet1.horses.filter(h => bet2.horses.includes(h));
          if (commonHorses.length === 2) {
            return 1.0;  // 完全に同じ組み合わせ
          }
          if (commonHorses.length === 1) {
            return 0.5;  // 1頭共通
          }
          return 0.2;  // 共通馬なし
        }
      }
      
      // 異なる馬券種別の場合
      const commonHorses = bet1.horses.filter(h => bet2.horses.includes(h));
      if (commonHorses.length === 0) return 0;
      
      // 共通する馬がいる場合、券種の組み合わせに応じて排反度を設定
      if (bet1.type === "単勝" || bet2.type === "単勝") {
        return 0.8;  // 単勝が絡む場合は強い排反関係
      }
      if (bet1.type === "複勝" || bet2.type === "複勝") {
        return 0.4;  // 複勝が絡む場合は弱い排反関係
      }
      return 0.6;  // その他の組み合わせは中程度の排反関係
    };
  
    const calculateSharpeRatio = (weights: number[]) => {
      // 期待リターンの計算（排反事象を考慮）
      const returns = weights.map((w, i) => {
        let adjustedProb = processedRecs[i].probability;
        
        // 他の馬券との排反関係を考慮して確率を調整
        weights.forEach((otherW, j) => {
          if (i !== j && otherW > 0) {
            const exclusivity = calculateMutualExclusivity(processedRecs[i], processedRecs[j]);
            adjustedProb *= (1 - exclusivity * processedRecs[j].probability);
          }
        });
        
        return w * (processedRecs[i].odds - 1) * adjustedProb;
      });
      
      const expectedReturn = returns.reduce((a, b) => a + b, 0);
      
      // 分散の計算（排反事象を考慮）
      const variance = weights.map((w, i) => {
        const r = (processedRecs[i].odds - 1) * w;
        let adjustedProb = processedRecs[i].probability;
        
        // 他の馬券との排反関係を考慮
        weights.forEach((otherW, j) => {
          if (i !== j && otherW > 0) {
            const exclusivity = calculateMutualExclusivity(processedRecs[i], processedRecs[j]);
            adjustedProb *= (1 - exclusivity * processedRecs[j].probability);
          }
        });
        
        return adjustedProb * (1 - adjustedProb) * r * r;
      }).reduce((a, b) => a + b, 0);
      
      const risk = Math.sqrt(variance);
      return { sharpeRatio: risk > 0 ? expectedReturn / risk : 0, expectedReturn, risk };
    };
  
    let bestWeights: number[] = [];
    let bestMetrics = { sharpeRatio: -Infinity, expectedReturn: 0, risk: 0 };
  
    for (let iter = 0; iter < 2000; iter++) {
      const weights = Array(processedRecs.length).fill(0)
        .map(() => Math.random())
        .map((w, _, arr) => w / arr.reduce((a, b) => a + b, 0));
      
      const metrics = calculateSharpeRatio(weights);
      if (metrics.sharpeRatio > bestMetrics.sharpeRatio) {
        bestMetrics = metrics;
        bestWeights = weights;
        if (process.env.NODE_ENV === 'development') {
          console.log('改善:', {
            iteration: iter,
            sharpeRatio: metrics.sharpeRatio.toFixed(3),
            expectedReturn: metrics.expectedReturn.toFixed(3),
            risk: metrics.risk.toFixed(3)
          });
        }
      }
    }
  
    if (process.env.NODE_ENV === 'development') {
      console.groupEnd();
    }
  
    let proposals = processedRecs.map((rec, i) => ({
      type: rec.type,
      horses: rec.horses,
      horseName: ["馬単", "３連単"].includes(rec.type) 
        ? rec.horses.join('→')
        : rec.horses.join('-'),
      stake: Math.floor(totalBudget * bestWeights[i] / 100) * 100,
      expectedReturn: rec.odds * Math.floor(totalBudget * bestWeights[i] / 100) * 100,
      probability: rec.probability,
      reason: rec.reason,
      frame1: rec.frame1,
      frame2: rec.frame2,
      frame3: rec.frame3,
      horse1: rec.horse1,
      horse2: rec.horse2,
      horse3: rec.horse3
    }))
    .filter(bet => bet.stake >= 100)
    .sort((a, b) => {
      const typeOrder: Record<string, number> = {
        "単勝": 1,
        "複勝": 2,
        "枠連": 3,
        "ワイド": 4,
        "馬連": 5,
        "馬単": 6,
        "３連複": 7,
        "３連単": 8
      };
      
      // 馬券種別でソート
      const typeCompare = typeOrder[a.type] - typeOrder[b.type];
      if (typeCompare !== 0) return typeCompare;
      
      // 同じ馬券種別なら投資額の大きい順
      return b.stake - a.stake;
    });
  
    // 総投資額を計算
    const totalInvestment = proposals.reduce((sum, bet) => sum + bet.stake, 0);
  
    // 予算に満たない場合、余った予算を100円単位で配分
    if (totalInvestment < totalBudget) {
      const remainingBudget = totalBudget - totalInvestment;
      const numIncrements = Math.floor(remainingBudget / 100);
      
      // 期待値でソートした配分順序を作成
      const distributionOrder = [...proposals]
        .map((bet, index) => ({
          index,
          expectedValue: bet.probability * bet.expectedReturn / bet.stake
        }))
        .sort((a, b) => a.expectedValue - b.expectedValue);
  
      // 100円ずつ配分
      for (let i = 0; i < numIncrements; i++) {
        const targetIndex = distributionOrder[i % proposals.length].index;
        proposals[targetIndex].stake += 100;
        proposals[targetIndex].expectedReturn = 
          proposals[targetIndex].expectedReturn / (proposals[targetIndex].stake - 100) * proposals[targetIndex].stake;
      }
  
      if (process.env.NODE_ENV === 'development') {
        console.log('予算調整完了:', {
          総予算: totalBudget,
          調整後総投資額: proposals.reduce((sum, bet) => sum + bet.stake, 0)
        });
      }
    }
    return proposals;
  };
  
  export const calculateBetProposalsWithGemini = async (
    horses: HorseData[], 
    totalBudget: number, 
    allBettingOptions: { bettingOptions: BettingOption[] },
    riskRatio: number
  ): Promise<BetProposal[]> => {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.group('calculateBetProposalsWithGemini');
        console.log('Input parameters:', {
          horses: horses.length,
          totalBudget,
          bettingOptions: allBettingOptions.bettingOptions.length,
          riskRatio
        });
      }
  
      const proposals = evaluateBettingOptions(
        horses, 
        totalBudget, 
        riskRatio,
        allBettingOptions.bettingOptions.filter(b => b.type === "複勝")
          .map(b => ({ horse1: b.horse1, oddsMin: b.odds, oddsMax: b.odds })),
        allBettingOptions.bettingOptions.filter(b => b.type === "枠連")
          .map(b => ({ frame1: b.frame1, frame2: b.frame2, odds: b.odds })),
        allBettingOptions.bettingOptions.filter(b => b.type === "馬連")
          .map(b => ({ horse1: b.horse1, horse2: b.horse2, odds: b.odds })),
        allBettingOptions.bettingOptions.filter(b => b.type === "ワイド")
          .map(b => ({ horse1: b.horse1, horse2: b.horse2, oddsMin: b.odds, oddsMax: b.odds })),
        allBettingOptions.bettingOptions.filter(b => b.type === "馬単")
          .map(b => ({ horse1: b.horse1, horse2: b.horse2, odds: b.odds })),
        allBettingOptions.bettingOptions.filter(b => b.type === "３連複")
          .map(b => ({ horse1: b.horse1, horse2: b.horse2, horse3: b.horse3, odds: b.odds })),
        allBettingOptions.bettingOptions.filter(b => b.type === "３連単")
          .map(b => ({ horse1: b.horse1, horse2: b.horse2, horse3: b.horse3, odds: b.odds }))
      );
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Generated proposals:', {
          count: proposals.length,
          proposals: proposals.map(p => ({
            type: p.type,
            horses: p.horses,
            stake: p.stake
          }))
        });
      }
  
      const conditionalProbabilities = proposals.length > 0 ? calculateConditionalProbability(proposals, horses) : [];
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Conditional probabilities:', {
          count: conditionalProbabilities.length,
          probabilities: conditionalProbabilities
        });
      }
      
      const geminiOptions = {
        horses: horses.map(h => ({
          name: h.name,
          odds: h.odds,
          winProb: h.winProb,
          placeProb: h.placeProb,
          frame: h.frame,
          number: h.number
        })),
        bettingOptions: allBettingOptions.bettingOptions,
        conditionalProbabilities
      };
  
      if (process.env.NODE_ENV === 'development') {
        console.log('Gemini options prepared:', {
          horsesCount: geminiOptions.horses.length,
          bettingOptionsCount: geminiOptions.bettingOptions.length,
          conditionalProbabilitiesCount: geminiOptions.conditionalProbabilities.length
        });
        console.groupEnd();
      }
      
      const geminiResponse = await getGeminiStrategy([], totalBudget, geminiOptions, riskRatio);
      return optimizeBetAllocation(geminiResponse.strategy.recommendations, totalBudget);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Bet calculation error:', error);
        console.groupEnd();
      }
      return [];
    }
  };
  