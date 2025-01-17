interface BettingOption {
  type: "単勝" | "複勝";
  horseName: string;
  odds: number;
  prob: number;
  ev: number;
}

export interface BetProposal {
  type: "単勝" | "複勝";
  horses: string[];
  stake: number;
  expectedReturn: number;
  probability: number;
}

export interface HorseData {
  name: string;
  odds: number;     // 単勝オッズ
  fukuOdds: number; // 複勝オッズ（最小値と最大値の平均）
  winProb: number;
  placeProb: number;
}

export const calculateBetProposals = (
  horses: HorseData[],
  totalBudget: number,
  riskRatio: number
): BetProposal[] => {
  const MIN_STAKE = 100;
  
  console.group('馬券購入戦略の計算過程');
  
  // デバッグ用：入力値の確認
  console.log('入力パラメータ:', {
    horses: horses.map(h => ({
      name: h.name,
      odds: h.odds,
      fukuOdds: h.fukuOdds,
      winProb: (h.winProb * 100).toFixed(1) + '%',
      placeProb: (h.placeProb * 100).toFixed(1) + '%'
    })),
    totalBudget,
    riskRatio
  });

  // オッズ行列の作成（期待値がプラスの馬券のみを対象とする）
  const bettingOptions = horses.flatMap(horse => {
    const options = [];
    
    // 単勝オプション（オッズが0の場合はスキップ）
    if (horse.odds > 0) {
      const winEV = horse.odds * horse.winProb - 1;
      if (horse.winProb > 0 && winEV > 0) {
        options.push({
          type: "単勝" as const,
          horseName: horse.name,
          odds: horse.odds,
          prob: horse.winProb,
          ev: winEV
        });
        console.log(`単勝候補: ${horse.name}, EV: ${winEV.toFixed(2)}`);
      }
      
      // 複勝オプション
      if (horse.fukuOdds > 0) {  // 実際の複勝オッズを使用
        const placeEV = horse.fukuOdds * horse.placeProb - 1;
        if (horse.placeProb > 0 && placeEV > 0) {
          options.push({
            type: "複勝" as const,
            horseName: horse.name,
            odds: horse.fukuOdds,
            prob: horse.placeProb,
            ev: placeEV
          });
          console.log(`複勝候補: ${horse.name}, EV: ${placeEV.toFixed(2)}`);
        }
      }
    }
    return options;
  });

  // デバッグ用：最適化対象の馬券一覧
  console.log('最適化対象馬券数:', bettingOptions.length);

  // Sharpe比の計算過程を表示する関数
  const calculateSharpeRatio = (weights: number[]) => {
    // 期待リターンの計算
    const returns = bettingOptions.map((opt, i) => 
      weights[i] * (opt.odds - 1) * opt.prob
    );
    const expectedReturn = returns.reduce((a, b) => a + b, 0);
    
    // リスク（標準偏差）の計算
    const variance = bettingOptions.map((opt, i) => {
      const r = (opt.odds - 1) * weights[i];
      return opt.prob * (1 - opt.prob) * r * r;
    }).reduce((a, b) => a + b, 0);
    
    const risk = Math.sqrt(variance);
    const sharpeRatio = risk > 0 ? expectedReturn / risk : 0;

    // 目標リターンとの差異を評価
    const targetReturn = riskRatio; // ユーザーの希望するリターン
    const returnDifference = Math.abs(expectedReturn - targetReturn);
        
    return sharpeRatio;
  };

  // 最適化過程
  let bestWeights = new Array(bettingOptions.length).fill(0);
  let bestSharpe = 0;
  let iterationsSinceLastImprovement = 0;

  console.log('最適化開始...');

  for (let iterations = 0; iterations < 1000; iterations++) {
    const weights = bettingOptions.map(() => Math.random());
    const sum = weights.reduce((a, b) => a + b, 0);
    const normalizedWeights = weights.map(w => w / sum);
    
    const sharpe = calculateSharpeRatio(normalizedWeights);
    
    if (sharpe > bestSharpe) {
      bestSharpe = sharpe;
      bestWeights = normalizedWeights;
      iterationsSinceLastImprovement = 0;
      
      // 改善があった場合の詳細表示
      console.log(`改善発見 (${iterations}回目):`, {
        sharpeRatio: bestSharpe.toFixed(3),
        allocation: bestWeights.map((w, i) => ({
          horse: bettingOptions[i].horseName,
          type: bettingOptions[i].type,
          weight: (w * 100).toFixed(1) + '%'
        }))
      });
    } else {
      iterationsSinceLastImprovement++;
    }
  }

  console.log('最適化完了:', {
    finalSharpeRatio: bestSharpe.toFixed(3),
    finalAllocation: bestWeights.map((w, i) => ({
      horse: bettingOptions[i].horseName,
      type: bettingOptions[i].type,
      weight: (w * 100).toFixed(1) + '%'
    })),
    targetReturnAchieved: (bestWeights.reduce((sum, w, i) => 
      sum + w * (bettingOptions[i].odds - 1) * bettingOptions[i].prob, 0) >= riskRatio)
  });

  // 結果の変換
  const proposals: BetProposal[] = [];
  let remainingBudget = totalBudget;

  bestWeights.forEach((weight, i) => {
    if (weight < 0.01) return; // 小さすぎる配分は無視

    const option = bettingOptions[i];
    const stake = Math.floor((totalBudget * weight) / 100) * 100;
    
    if (stake >= MIN_STAKE && stake <= remainingBudget) {
      remainingBudget -= stake;
      proposals.push({
        type: option.type as "単勝" | "複勝",
        horses: [option.horseName],
        stake,
        expectedReturn: Math.floor(stake * option.odds),
        probability: option.prob
      });
    }
  });

  console.groupEnd();
  return proposals;
};