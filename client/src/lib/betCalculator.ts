interface BettingOption {
  type: "単勝" | "複勝" | "枠連" | "馬連" | "ワイド" | "馬単";
  horseName: string;
  odds: number;
  prob: number;
  ev: number;
  frame1: number;
  frame2: number;
  horse1: number;
  horse2: number;
}

export interface BetProposal {
  type: "単勝" | "複勝" | "枠連" | "馬連" | "ワイド" | "馬単";
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
  wakurenData: { frame1: number; frame2: number; odds: number; }[],
  umarenData: { horse1: number; horse2: number; odds: number; }[],
  wideData: { horse1: number; horse2: number; oddsMin: number; oddsMax: number; }[],
  umaTanData: { horse1: number; horse2: number; odds: number; }[]
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
          frame2: 0,
          horse1: 0,
          horse2: 0
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
            frame2: 0,
            horse1: 0,
            horse2: 0
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
        ev: wakurenEV,
        horse1: 0,
        horse2: 0
      });
      console.log(`枠連候補: ${wakuren.frame1}-${wakuren.frame2}`, {
        オッズ: wakuren.odds.toFixed(1),
        的中確率: (wakurenProb * 100).toFixed(2) + '%',
        期待値: wakurenEV.toFixed(2)
      });
    }
  });

  // 馬連オプションの追加
  umarenData.forEach(umaren => {
    const horse1 = horses.find(h => h.number === umaren.horse1);
    const horse2 = horses.find(h => h.number === umaren.horse2);
    
    if (!horse1 || !horse2) return;

    // 馬連的中確率の計算
    let umarenProb = 0;

    // horse1が1着、horse2が2着のケース
    const h2SecondProb = (horse2.placeProb - horse2.winProb) / 2;
    umarenProb += horse1.winProb * h2SecondProb;

    // horse2が1着、horse1が2着のケース
    const h1SecondProb = (horse1.placeProb - horse1.winProb) / 2;
    umarenProb += horse2.winProb * h1SecondProb;

    const umarenEV = umaren.odds * umarenProb - 1;
    if (umarenProb > 0 && umarenEV > 0) {
      bettingOptions.push({
        type: "馬連",
        horseName: `${horse1.number}-${horse2.number}`,
        frame1: horse1.frame,
        frame2: horse2.frame,
        horse1: horse1.number,
        horse2: horse2.number,
        odds: umaren.odds,
        prob: umarenProb,
        ev: umarenEV
      });
      console.log(`馬連候補: ${horse1.number}-${horse2.number}`, {
        オッズ: umaren.odds.toFixed(1),
        的中確率: (umarenProb * 100).toFixed(2) + '%',
        期待値: umarenEV.toFixed(2)
      });
    }
  });

  // ワイドオプションの追加
  wideData.forEach(wide => {
    const horse1 = horses.find(h => h.number === wide.horse1);
    const horse2 = horses.find(h => h.number === wide.horse2);
    
    if (!horse1 || !horse2) return;

    // ワイド的中確率の計算（両方が複勝圏内に入る確率）
    const wideProb = horse1.placeProb * horse2.placeProb;

    // オッズは最小値と最大値の平均を使用
    const avgOdds = (wide.oddsMin + wide.oddsMax) / 2;
    const wideEV = avgOdds * wideProb - 1;

    if (wideProb > 0 && wideEV > 0) {
      bettingOptions.push({
        type: "ワイド",
        horseName: `${horse1.number}-${horse2.number}`,
        frame1: horse1.frame,
        frame2: horse2.frame,
        horse1: horse1.number,
        horse2: horse2.number,
        odds: avgOdds,
        prob: wideProb,
        ev: wideEV
      });
      console.log(`ワイド候補: ${horse1.number}-${horse2.number}`, {
        オッズ: avgOdds.toFixed(1),
        的中確率: (wideProb * 100).toFixed(2) + '%',
        期待値: wideEV.toFixed(2)
      });
    }
  });

  // 馬単オプションの追加
  umaTanData.forEach(umatan => {
    const horse1 = horses.find(h => h.number === umatan.horse1);
    const horse2 = horses.find(h => h.number === umatan.horse2);
    
    if (!horse1 || !horse2) return;

    // 馬単的中確率の計算（1着と2着の順番が重要）
    const umatanProb = horse1.winProb * ((horse2.placeProb - horse2.winProb) / 2);

    const umatanEV = umatan.odds * umatanProb - 1;
    if (umatanProb > 0 && umatanEV > 0) {
      bettingOptions.push({
        type: "馬単",
        horseName: `${horse1.number}→${horse2.number}`,
        frame1: horse1.frame,
        frame2: horse2.frame,
        horse1: horse1.number,
        horse2: horse2.number,
        odds: umatan.odds,
        prob: umatanProb,
        ev: umatanEV
      });
      console.log(`馬単候補: ${horse1.number}→${horse2.number}`, {
        オッズ: umatan.odds.toFixed(1),
        的中確率: (umatanProb * 100).toFixed(2) + '%',
        期待値: umatanEV.toFixed(2)
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
      
      // 馬連、枠連、ワイド、馬単の場合は馬番または枠番のペアを表示
      const horses = option.type === "枠連" 
        ? [`${option.frame1}枠-${option.frame2}枠`]
        : (option.type === "馬連" || option.type === "ワイド")
        ? [`${option.horse1}番-${option.horse2}番`]
        : option.type === "馬単"
        ? [`${option.horse1}番→${option.horse2}番`]
        : [option.horseName];

      proposals.push({
        type: option.type as "単勝" | "複勝" | "枠連" | "馬連" | "ワイド" | "馬単",
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