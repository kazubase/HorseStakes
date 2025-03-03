import type { GeminiRecommendation } from './geminiApi';
import { type BetProposal, type HorseData, type BettingOption, evaluateBettingOptions } from './betEvaluation';
import { getGeminiStrategy } from './geminiApi';
import { normalizeStringProbability } from './utils/probability';
import { BetCorrelation } from './betConditionalProbability';

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
  
    let proposals = processedRecs.map((rec, i) => {
      const odds = rec.odds;
      return {
        type: rec.type,
        horses: rec.horses,
        horseName: ["馬単", "３連単"].includes(rec.type) 
          ? rec.horses.join('→')
          : rec.horses.join('-'),
        stake: Math.floor(totalBudget * bestWeights[i] / 100) * 100,
        odds: odds,
        expectedReturn: odds * Math.floor(totalBudget * bestWeights[i] / 100) * 100,
        probability: rec.probability,
        reason: rec.reason,
        frame1: rec.frame1,
        frame2: rec.frame2,
        frame3: rec.frame3,
        horse1: rec.horse1,
        horse2: rec.horse2,
        horse3: rec.horse3
      };
    })
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
          expectedValue: bet.probability * bet.odds
        }))
        .sort((a, b) => a.expectedValue - b.expectedValue);
  
      // 100円ずつ配分
      for (let i = 0; i < numIncrements; i++) {
        const targetIndex = distributionOrder[i % proposals.length].index;
        proposals[targetIndex].stake += 100;
        // オッズを使って期待収益を正確に再計算
        proposals[targetIndex].expectedReturn = proposals[targetIndex].odds * proposals[targetIndex].stake;
      }
  
      // 最終的なオッズを再計算
      proposals.forEach(bet => {
        bet.odds = bet.expectedReturn / bet.stake;
      });
  
      if (process.env.NODE_ENV === 'development') {
        console.log('予算調整完了:', {
          総予算: totalBudget,
          調整後総投資額: proposals.reduce((sum, bet) => sum + bet.stake, 0)
        });
      }
    }
  
    // デバッグ出力にもオッズを含める
    if (process.env.NODE_ENV === 'development') {
      console.log('最適化結果:', {
        totalBets: proposals.length,
        totalInvestment: proposals.reduce((sum, bet) => sum + bet.stake, 0),
        bets: proposals.map(bet => ({
          type: bet.type,
          horses: bet.horses,
          stake: bet.stake,
          odds: bet.odds.toFixed(1),
          expectedReturn: bet.expectedReturn,
          probability: (bet.probability * 100).toFixed(1) + '%'
        }))
      });
    }
  
    return proposals;
  };
  
interface OptimizationInput {
  bettingOptions: BettingOption[];
  conditionalProbabilities?: BetCorrelation[];
}

export const calculateBetProposalsWithGemini = async (
  horses: HorseData[],
  totalBudget: number,
  input: OptimizationInput,
  riskRatio: number
): Promise<BetProposal[]> => {
  if (process.env.NODE_ENV === 'development') {
    console.group('Geminiによる馬券最適化');
    console.log('入力パラメータ:', {
      horses: horses.map(h => ({
        name: h.name,
        odds: h.odds,
        winProb: (h.winProb * 100).toFixed(1) + '%',
        placeProb: (h.placeProb * 100).toFixed(1) + '%'
      })),
      totalBudget,
      riskRatio
    });
  }

  try {
    // 馬券候補を生成
    const bettingCandidates = input.bettingOptions.map(opt => ({
      type: opt.type,
      horseName: `${opt.horse1}${opt.horse2 ? `-${opt.horse2}` : ''}${opt.horse3 ? `-${opt.horse3}` : ''}`,
      odds: opt.odds,
      probability: String(opt.prob),
      expectedValue: String(opt.ev)
    }));

    // Gemini APIから戦略を取得
    const geminiResponse = await getGeminiStrategy(
      bettingCandidates,
      totalBudget,
      {
        horses,
        bettingOptions: input.bettingOptions,
        conditionalProbabilities: input.conditionalProbabilities || [] // 条件付き確率を渡す
      },
      riskRatio
    );

    if (!geminiResponse?.strategy?.recommendations) {
      throw new Error('Gemini APIからの応答が不正です');
    }

    // 推奨馬券を最適化
    const recommendations = geminiResponse.strategy.recommendations.map(rec => ({
      ...rec,
      probability: normalizeStringProbability(rec.probability)
    }));

    // Sharpe比による資金配分の最適化
    const optimizedBets = optimizeBetAllocation(recommendations, totalBudget);

    if (process.env.NODE_ENV === 'development') {
      console.log('最適化結果:', {
        totalBets: optimizedBets.length,
        totalInvestment: optimizedBets.reduce((sum, bet) => sum + bet.stake, 0),
        bets: optimizedBets.map(bet => ({
          type: bet.type,
          horses: bet.horses,
          stake: bet.stake,
          odds: bet.odds ? bet.odds.toFixed(1) : undefined,
          expectedReturn: bet.expectedReturn,
          probability: (bet.probability * 100).toFixed(1) + '%'
        }))
      });
      console.groupEnd();
    }

    return optimizedBets;

  } catch (error: any) {
    console.error('Gemini最適化エラー:', error);
    throw new Error(`馬券最適化に失敗しました: ${error.message}`);
  }
};
  