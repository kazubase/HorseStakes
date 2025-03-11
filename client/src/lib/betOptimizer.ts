import type { GeminiRecommendation } from './geminiApi';
import { type BetProposal, type HorseData, type BettingOption, evaluateBettingOptions } from './betEvaluation';
import { getGeminiStrategy } from './geminiApi';
import { normalizeStringProbability } from './utils/probability';
import { BetCorrelation } from './betConditionalProbability';

export const optimizeBetAllocation = (
  recommendations: GeminiRecommendation[],
  totalBudget: number,
  conditionalProbabilities: BetCorrelation[] = []
  ): BetProposal[] => {
    const processedRecs = recommendations.map(rec => ({
      ...rec,
      probability: normalizeStringProbability(rec.probability)
    }));
  
    // 条件付き確率をマップに変換して検索を効率化
    const condProbMap = new Map<string, number>();
    conditionalProbabilities.forEach(corr => {
      const key = `${corr.condition.type}:${corr.condition.horses}|${corr.target.type}:${corr.target.horses}`;
      condProbMap.set(key, corr.probability);
    });

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
          if (commonHorses.length === 2 || commonHorses.length === 0) {
            return 1.0;  // 完全に同じ組み合わせ、または、共通馬がない場合
          }
          if (commonHorses.length === 1) {
            return 0.4;  // 1頭共通
          }
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
      // 期待リターンの計算（条件付き確率を考慮）
      const returns = weights.map((w, i) => {
        const bet = processedRecs[i];
        // 基本の期待値（オッズ×確率）
        const baseEV = bet.odds * bet.probability;
        
        // 他の馬券との条件付き確率を考慮した調整
        let adjustmentFactor = 1.0;
        let condProbUsed = false;
        
        weights.forEach((otherW, j) => {
          if (i !== j && otherW > 0) {
            const otherBet = processedRecs[j];
            
            // 条件付き確率を検索（両方向で試す）
            const key1 = `${otherBet.type}:${otherBet.horses.join('-')}|${bet.type}:${bet.horses.join('-')}`;
            const key2 = `${bet.type}:${bet.horses.join('-')}|${otherBet.type}:${otherBet.horses.join('-')}`;
            
            // 条件付き確率が存在する場合はそれを使用、なければ排反度から近似
            let condProb = condProbMap.get(key1);
            if (condProb === undefined) {
              condProb = condProbMap.get(key2);
            }
            
            if (condProb !== undefined) {
              condProbUsed = true;
              // 条件付き確率に基づいて調整（他の馬券が的中した場合の影響）
              adjustmentFactor *= (1 - otherBet.probability * (1 - condProb));
            } else {
              const exclusivity = calculateMutualExclusivity(bet, otherBet);
              const approxCondProb = 1 - exclusivity;
              adjustmentFactor *= (1 - otherBet.probability * exclusivity);
            }
          }
        });
        
        // 期待値を重視した計算（期待値の影響を強める）
        return {
          return: w * baseEV * adjustmentFactor * 3.0,
          condProbUsed
        };
      });
      
      const expectedReturn = returns.reduce((a, b) => a + b.return, 0);
      const condProbUsedCount = returns.filter(r => r.condProbUsed).length;
      
      // 分散の計算（条件付き確率を考慮）
      const variance = weights.map((w, i) => {
        const bet = processedRecs[i];
        const r = (bet.odds - 1) * w;
        
        // 条件付き確率を考慮した調整確率
        let adjustedProb = bet.probability;
        weights.forEach((otherW, j) => {
          if (i !== j && otherW > 0) {
            const otherBet = processedRecs[j];
            
            // 条件付き確率を検索
            const key = `${otherBet.type}:${otherBet.horses.join('-')}|${bet.type}:${bet.horses.join('-')}`;
            
            // 条件付き確率が存在する場合はそれを使用、なければ排反度から近似
            let condProb = condProbMap.get(key);
            if (condProb === undefined) {
              const exclusivity = calculateMutualExclusivity(bet, otherBet);
              condProb = 1 - exclusivity;
            }
            
            // 条件付き確率に基づいて調整
            adjustedProb *= (1 - otherBet.probability * (1 - condProb));
          }
        });
        
        // リスク計算（分散を小さく見積もって期待値重視に）
        return adjustedProb * (1 - adjustedProb) * r * r * 0.5;
      }).reduce((a, b) => a + b, 0);
      
      const risk = Math.sqrt(variance);
      return { 
        sharpeRatio: risk > 0 ? expectedReturn / risk : 0, 
        expectedReturn, 
        risk,
        condProbUsedCount 
      };
    };
  
    let bestWeights: number[] = [];
    let bestMetrics = { sharpeRatio: -Infinity, expectedReturn: 0, risk: 0, condProbUsedCount: 0 };
  
    for (let iter = 0; iter < 2000; iter++) {
      // 多様な初期値を試す（完全ランダムと、確率×オッズに比例した初期値の両方）
      const weights = iter % 3 === 0
        ? processedRecs.map(rec => rec.probability * rec.odds) // 期待値に比例
        : iter % 3 === 1
          ? processedRecs.map(rec => rec.probability) // 確率に比例
          : Array(processedRecs.length).fill(0).map(() => Math.random()); // 完全ランダム
      
      // 正規化（合計が1になるように）
      const normalizedWeights = weights.map((w, _, arr) => 
        w / arr.reduce((a, b) => a + b, 0)
      );
      
      const metrics = calculateSharpeRatio(normalizedWeights);
      if (metrics.sharpeRatio > bestMetrics.sharpeRatio) {
        bestMetrics = metrics;
        bestWeights = normalizedWeights;
        if (process.env.NODE_ENV === 'development') {
          console.log('改善:', {
            iteration: iter,
            sharpeRatio: metrics.sharpeRatio.toFixed(3),
            expectedReturn: metrics.expectedReturn.toFixed(3),
            risk: metrics.risk.toFixed(3),
            condProbUsed: metrics.condProbUsedCount > 0 ? '使用中' : '未使用',
            initMethod: iter % 3 === 0 ? '期待値比例' : iter % 3 === 1 ? '確率比例' : 'ランダム'
          });
        }
      }
    }
  
    if (process.env.NODE_ENV === 'development') {
      console.log('最適化完了:', {
        sharpeRatio: bestMetrics.sharpeRatio.toFixed(3),
        expectedReturn: bestMetrics.expectedReturn.toFixed(3),
        risk: bestMetrics.risk.toFixed(3),
        condProbUsed: bestMetrics.condProbUsedCount > 0 ? `使用 (${bestMetrics.condProbUsedCount}件)` : '未使用'
      });
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
      
      // 期待値（オッズ×確率）でソートした配分順序を作成
      const distributionOrder = [...proposals]
        .map((bet, index) => ({
          index,
          expectedValue: bet.probability * bet.odds
        }))
        .sort((a, b) => b.expectedValue - a.expectedValue); // 期待値の高い順
  
      // 100円ずつ配分
      for (let i = 0; i < numIncrements; i++) {
        const targetIndex = distributionOrder[i % distributionOrder.length].index;
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
          probability: (bet.probability * 100).toFixed(1) + '%',
          ev: (bet.probability * bet.odds).toFixed(2)
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
      riskRatio,
      conditionalProbabilitiesCount: input.conditionalProbabilities?.length || 0
    });
    
    if (input.conditionalProbabilities && input.conditionalProbabilities.length > 0) {
      console.log('条件付き確率サンプル:', input.conditionalProbabilities.slice(0, 3).map(cp => ({
        condition: `${cp.condition.type}:${cp.condition.horses}`,
        target: `${cp.target.type}:${cp.target.horses}`,
        probability: cp.probability
      })));
    }
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

    // Sharpe比による資金配分の最適化（条件付き確率を渡す）
    const optimizedBets = optimizeBetAllocation(
      recommendations, 
      totalBudget,
      input.conditionalProbabilities || []
    );

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
          probability: (bet.probability * 100).toFixed(1) + '%',
          ev: bet.odds ? (bet.probability * bet.odds).toFixed(2) : 'N/A'
        }))
      });
      console.groupEnd();
    }

    // 最適化結果を返す
    return optimizedBets;

  } catch (error: any) {
    console.error('Gemini最適化エラー:', error);
    throw new Error(`馬券最適化に失敗しました: ${error.message}`);
  }
};
  