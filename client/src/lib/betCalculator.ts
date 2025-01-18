interface BettingOption {
  type: "単勝" | "複勝" | "枠連";
  horseName: string;
  odds: number;
  prob: number;
  ev: number;
  frame1: number;
  frame2: number;
}

export interface BetProposal {
  type: "単勝" | "複勝" | "枠連";
  horses: string[];
  stake: number;
  expectedReturn: number;
  probability: number;
}

export interface HorseData {
  name: string;
  odds: number;
  fukuOdds: number;
  winProb: number;
  placeProb: number;
  frame: number;
  number: number;
}

export const calculateBetProposals = (
  horses: HorseData[], 
  totalBudget: number, 
  riskRatio: number, 
  wakurenData: { frame1: number; frame2: number; odds: number; }[]
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
    
    // 単勝・複勝オプション（既存のコード）
    if (horse.odds > 0) {
      const winEV = horse.odds * horse.winProb - 1;
      if (horse.winProb > 0 && winEV > 0) {
        options.push({
          type: "単勝",
          horseName: horse.name,
          odds: horse.odds,
          prob: horse.winProb,
          ev: winEV,
          frame1: 0,
          frame2: 0
        });
      }
      
      if (horse.fukuOdds > 0) {
        const placeEV = horse.fukuOdds * horse.placeProb - 1;
        if (horse.placeProb > 0 && placeEV > 0) {
          options.push({
            type: "複勝",
            horseName: horse.name,
            odds: horse.fukuOdds,
            prob: horse.placeProb,
            ev: placeEV,
            frame1: 0,
            frame2: 0
          });
        }
      }
    }
    return options;
  });

  // 枠連オプションの追加
  wakurenData.forEach(wakuren => {
    // 対象の枠の馬を取得
    const frame1Horses = horses.filter(h => h.frame === wakuren.frame1);
    const frame2Horses = horses.filter(h => h.frame === wakuren.frame2);
    
    // 枠連的中確率の計算
    let wakurenProb = 0;

    // 同じ枠の場合は、片方向の組み合わせのみを計算
    if (wakuren.frame1 === wakuren.frame2) {
      frame1Horses.forEach((h1, i) => {
        frame2Horses.slice(i + 1).forEach(h2 => {
          // h1が1着、h2が2着のケース
          const h2SecondProb = (h2.placeProb - h2.winProb) / 2;
          wakurenProb += h1.winProb * h2SecondProb;

          // h2が1着、h1が2着のケース
          const h1SecondProb = (h1.placeProb - h1.winProb) / 2;
          wakurenProb += h2.winProb * h1SecondProb;
        });
      });
    } else {
      // 異なる枠の場合は、全ての組み合わせを計算
      frame1Horses.forEach(h1 => {
        frame2Horses.forEach(h2 => {
          // h1が1着、h2が2着のケース
          const h2SecondProb = (h2.placeProb - h2.winProb) / 2;
          wakurenProb += h1.winProb * h2SecondProb;

          // h2が1着、h1が2着のケース
          const h1SecondProb = (h1.placeProb - h1.winProb) / 2;
          wakurenProb += h2.winProb * h1SecondProb;
        });
      });
    }

    const wakurenEV = wakuren.odds * wakurenProb - 1;
    if (wakurenProb > 0 && wakurenEV > 0) {
      bettingOptions.push({
        type: "枠連",
        horseName: `${wakuren.frame1}-${wakuren.frame2}`,
        frame1: wakuren.frame1,
        frame2: wakuren.frame2,
        odds: wakuren.odds,
        prob: wakurenProb,
        ev: wakurenEV
      });
      console.log(`枠連候補: ${wakuren.frame1}-${wakuren.frame2}`, {
        オッズ: wakuren.odds.toFixed(1),
        的中確率: (wakurenProb * 100).toFixed(2) + '%',
        期待値: wakurenEV.toFixed(2)
      });
    }
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
    if (weight < 0.01) return;

    const option = bettingOptions[i];
    const stake = Math.floor((totalBudget * weight) / 100) * 100;
    
    if (stake >= MIN_STAKE && stake <= remainingBudget) {
      remainingBudget -= stake;
      
      // 枠連の場合は馬名の代わりに枠番を使用
      const horses = option.type === "枠連" 
        ? [`${option.frame1}枠-${option.frame2}枠`]
        : [option.horseName];

      proposals.push({
        type: option.type as "単勝" | "複勝" | "枠連",
        horses,
        stake,
        expectedReturn: Math.floor(stake * option.odds),
        probability: option.prob
      });
    }
  });

  console.groupEnd();
  return proposals;
};