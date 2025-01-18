interface BettingOption {
  type: "単勝" | "複勝" | "枠連" | "馬連" | "ワイド" | "馬単" | "３連複" | "３連単";
  horseName: string;
  odds: number;
  prob: number;
  ev: number;
  frame1: number;
  frame2: number;
  frame3: number;
  horse1: number;
  horse2: number;
  horse3: number;
}

export interface BetProposal {
  type: "単勝" | "複勝" | "枠連" | "馬連" | "ワイド" | "馬単" | "３連複" | "３連単";
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
  umaTanData: { horse1: number; horse2: number; odds: number; }[],
  sanrenpukuData: { horse1: number; horse2: number; horse3: number; odds: number; }[],
  sanrentanData: { horse1: number; horse2: number; horse3: number; odds: number; }[]
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
          frame3: 0,
          horse1: 0,
          horse2: 0,
          horse3: 0
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
            frame3: 0,
            horse1: 0,
            horse2: 0,
            horse3: 0
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
        frame3: 0,
        odds: wakuren.odds,
        prob: wakurenProb,
        ev: wakurenEV,
        horse1: 0,
        horse2: 0,
        horse3: 0
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
        frame3: 0,
        horse1: horse1.number,
        horse2: horse2.number,
        horse3: 0,
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
        frame3: 0,
        horse1: horse1.number,
        horse2: horse2.number,
        horse3: 0,
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
        frame3: 0,
        horse1: horse1.number,
        horse2: horse2.number,
        horse3: 0,
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

  // 3連複オプションの追加
  sanrenpukuData.forEach(sanren => {
    const horse1 = horses.find(h => h.number === sanren.horse1);
    const horse2 = horses.find(h => h.number === sanren.horse2);
    const horse3 = horses.find(h => h.number === sanren.horse3);
    
    if (!horse1 || !horse2 || !horse3) return;

    // 3連複的中確率の計算（順不同で3頭が上位3着以内に入る確率）
    let sanrenProb = 0;

    // 全ての順列パターンを考慮
    // 1-2-3のパターン
    sanrenProb += horse1.winProb * 
                  ((horse2.placeProb - horse2.winProb) / 2) * 
                  ((horse3.placeProb - horse3.winProb) / 2);

    // 1-3-2のパターン
    sanrenProb += horse1.winProb * 
                  ((horse3.placeProb - horse3.winProb) / 2) * 
                  ((horse2.placeProb - horse2.winProb) / 2);

    // 2-1-3のパターン
    sanrenProb += horse2.winProb * 
                  ((horse1.placeProb - horse1.winProb) / 2) * 
                  ((horse3.placeProb - horse3.winProb) / 2);

    // 2-3-1のパターン
    sanrenProb += horse2.winProb * 
                  ((horse3.placeProb - horse3.winProb) / 2) * 
                  ((horse1.placeProb - horse1.winProb) / 2);

    // 3-1-2のパターン
    sanrenProb += horse3.winProb * 
                  ((horse1.placeProb - horse1.winProb) / 2) * 
                  ((horse2.placeProb - horse2.winProb) / 2);

    // 3-2-1のパターン
    sanrenProb += horse3.winProb * 
                  ((horse2.placeProb - horse2.winProb) / 2) * 
                  ((horse1.placeProb - horse1.winProb) / 2);

    const sanrenEV = sanren.odds * sanrenProb - 1;
    if (sanrenProb > 0 && sanrenEV > 0) {
      bettingOptions.push({
        type: "３連複",
        horseName: `${horse1.number}-${horse2.number}-${horse3.number}`,
        frame1: horse1.frame,
        frame2: horse2.frame,
        frame3: horse3.frame,
        horse1: horse1.number,
        horse2: horse2.number,
        horse3: horse3.number,
        odds: sanren.odds,
        prob: sanrenProb,
        ev: sanrenEV
      });
      console.log(`3連複候補: ${horse1.number}-${horse2.number}-${horse3.number}`, {
        オッズ: sanren.odds.toFixed(1),
        的中確率: (sanrenProb * 100).toFixed(2) + '%',
        期待値: sanrenEV.toFixed(2)
      });
    }
  });

  // 3連単オプションの追加
  sanrentanData.forEach(sanren => {
    const horse1 = horses.find(h => h.number === sanren.horse1);
    const horse2 = horses.find(h => h.number === sanren.horse2);
    const horse3 = horses.find(h => h.number === sanren.horse3);
    
    if (!horse1 || !horse2 || !horse3) return;

    // 3連単的中確率の計算（1着2着3着の順番が重要）
    const sanrentanProb = horse1.winProb * 
                         ((horse2.placeProb - horse2.winProb) / 2) * 
                         ((horse3.placeProb - horse3.winProb) / 2);

    const sanrentanEV = sanren.odds * sanrentanProb - 1;
    if (sanrentanProb > 0 && sanrentanEV > 0) {
      bettingOptions.push({
        type: "３連単",
        horseName: `${horse1.number}→${horse2.number}→${horse3.number}`,
        frame1: horse1.frame,
        frame2: horse2.frame,
        frame3: horse3.frame,
        horse1: horse1.number,
        horse2: horse2.number,
        horse3: horse3.number,
        odds: sanren.odds,
        prob: sanrentanProb,
        ev: sanrentanEV
      });
      console.log(`3連単候補: ${horse1.number}→${horse2.number}→${horse3.number}`, {
        オッズ: sanren.odds.toFixed(1),
        的中確率: (sanrentanProb * 100).toFixed(2) + '%',
        期待値: sanrentanEV.toFixed(2)
      });
    }
  });

  // デバッグ用：最適化対象の馬券一覧
  console.log('最適化対象馬券数:', bettingOptions.length);

  // リスクリワード比率に応じた馬券候補の選択と最大選択数の調整
  const preFilteredOptions = bettingOptions
    .filter(opt => {
      const minOdds = Math.max(1.0, riskRatio * 0.5);
      const maxOdds = Math.min(999.9, riskRatio * 15);
      
      // リスクリワード比率に応じて最小確率を調整
      // 高リスク時は低確率も許容
      const minProbability = Math.max(0.005, 0.2 - (riskRatio * 0.015));
      
      // リスクリワード比率に応じて要求期待値を調整
      // 高リスク時はより高い期待値を要求
      const requiredEV = 0.1 + (riskRatio * 0.1);

      return opt.odds >= minOdds && 
             opt.odds <= maxOdds && 
             opt.prob >= minProbability && 
             opt.ev > requiredEV;
    })
    .sort((a, b) => b.ev - a.ev)
    // リスクリワード比率に応じて選択数を制限
    .slice(0, Math.max(2, Math.min(6, Math.ceil(12 / riskRatio))));

  // 最適な組み合わせを見つける
  const findOptimalWeights = (options: typeof preFilteredOptions) => {
    // 最適化の評価関数を定義
    const calculateSharpeRatio = (weights: number[]) => {
      const returns = options.map((opt, i) => weights[i] * opt.odds * opt.prob);
      const expectedReturn = returns.reduce((a, b) => a + b, 0) - weights.reduce((a, b) => a + b, 0);
      
      const variance = options.map((opt, i) => {
        const r = opt.odds * weights[i];
        return opt.prob * (1 - opt.prob) * r * r;
      }).reduce((a, b) => a + b, 0);
      
      const risk = Math.sqrt(variance);

      // リスクリワード比率に応じてリターンの重要度を調整
      const returnWeight = Math.min(2.0, riskRatio / 5);
      
      // 高リスク時はリターンを重視、低リスク時はリスク調整後リターンを重視
      return risk > 0 
        ? (expectedReturn * returnWeight) / (risk * (2 - returnWeight))
        : 0;
    };

    let bestWeights = options.map(() => 1 / options.length);
    let bestSharpe = -Infinity;

    // モンテカルロ法による最適化
    for (let iter = 0; iter < 1000; iter++) {
      // ランダムな重みを生成
      const weights = options.map(() => Math.random());
      const sum = weights.reduce((a, b) => a + b, 0);
      const normalizedWeights = weights.map(w => w / sum);

      // リターンとリスクの計算
      const returns = options.map((opt, i) => normalizedWeights[i] * opt.odds * opt.prob);
      const expectedReturn = returns.reduce((a, b) => a + b, 0) - normalizedWeights.reduce((a, b) => a + b, 0);
      
      const variance = options.map((opt, i) => {
        const r = opt.odds * normalizedWeights[i];
        return opt.prob * (1 - opt.prob) * r * r;
      }).reduce((a, b) => a + b, 0);
      
      const risk = Math.sqrt(variance);

      // Sharpe比の計算
      const sharpe = risk > 0 ? expectedReturn / risk : 0;

      if (sharpe > bestSharpe) {
        bestSharpe = sharpe;
        bestWeights = normalizedWeights;
        
        console.log('改善発見:', {
          iteration: iter,
          sharpeRatio: sharpe.toFixed(3),
          expectedReturn: (expectedReturn * 100).toFixed(1) + '%',
          risk: (risk * 100).toFixed(1) + '%',
          weights: options.map((opt, i) => ({
            type: opt.type,
            horse: opt.horseName,
            weight: (normalizedWeights[i] * 100).toFixed(1) + '%'
          }))
        });
      }
    }

    return { weights: bestWeights, sharpeRatio: bestSharpe };
  };

  // 最適化の実行
  const { weights: optimalWeights, sharpeRatio } = findOptimalWeights(preFilteredOptions);

  // 最小投資額でフィルタリング
  const MIN_WEIGHT = MIN_STAKE / totalBudget;
  const finalBets = preFilteredOptions.filter((_, i) => optimalWeights[i] >= MIN_WEIGHT);
  const finalWeights = optimalWeights.filter(w => w >= MIN_WEIGHT);

  // 重みの再正規化
  const weightSum = finalWeights.reduce((a, b) => a + b, 0);
  const normalizedFinalWeights = finalWeights.map(w => w / weightSum);

  // 結果を投資額に変換
  const proposals: BetProposal[] = finalBets.map((opt, i) => {
    const stake = Math.floor(totalBudget * normalizedFinalWeights[i] / 100) * 100;
    return {
      type: opt.type as BetProposal['type'],
      horses: [opt.horseName],
      stake,
      expectedReturn: Math.floor(stake * opt.odds),
      probability: opt.prob
    };
  });

  console.log('最終結果:', {
    sharpeRatio: sharpeRatio.toFixed(3),
    totalBets: proposals.length,
    bets: proposals.map(p => ({
      type: p.type,
      horses: p.horses,
      stake: p.stake,
      expectedReturn: p.expectedReturn,
      probability: (p.probability * 100).toFixed(1) + '%'
    }))
  });

  return proposals;
};