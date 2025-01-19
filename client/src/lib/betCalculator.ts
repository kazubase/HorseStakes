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
    const winEV = horse.odds * horse.winProb - 1;
    if (horse.winProb > 0 && winEV > 0) {
      options.push({
        type: "単勝",
        horseName: `${horse.number} ${horse.name}`,
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
      console.log(`単勝候補: ${horse.number} ${horse.name}`, {
        オッズ: horse.odds.toFixed(1),
        的中確率: (horse.winProb * 100).toFixed(2) + '%',
        期待値: winEV.toFixed(2)
      });
    }
    
    if (horse.fukuOdds > 0) {
      const placeEV = horse.fukuOdds * horse.placeProb - 1;
      if (horse.placeProb > 0 && placeEV > 0) {
        options.push({
          type: "複勝",
          horseName: `${horse.number} ${horse.name}`,
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
        console.log(`複勝候補: ${horse.number} ${horse.name}`, {
          オッズ: horse.fukuOdds.toFixed(1),
          的中確率: (horse.placeProb * 100).toFixed(2) + '%',
          期待値: placeEV.toFixed(2)
        });
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

  // 最適化の評価関数を修正
  const findOptimalWeights = (options: typeof bettingOptions) => {
    // 馬券種別ごとのリスク特性を定義
    const getBetTypeRiskFactor = (type: string) => {
      switch (type) {
        case "単勝":
          return 1.5;  // 単勝のリスク
        case "複勝":
          return 1.0;  // 基準
        case "馬連":
          return 3.2;  // 馬連のリスク
        case "馬単":
          return 3.9;  // 馬単のリスク
        case "ワイド":
          return 2.2;  // ワイドのリスク
        case "３連複":
          return 6.0;  // 3連複のリスク
        case "３連単":
          return 7.5;  // 3連単のリスク
        default:
          return 1.0;
      }
    };

    // ポートフォリオの評価関数
    const calculatePortfolioMetrics = (bets: typeof options, weights: number[]) => {
      if (bets.length === 0 || weights.length === 0) return null;
      
      const totalInvestment = weights.reduce((a, b) => a + b, 0);
      
      // 期待値の評価（馬券種別のリスク特性を考慮）
      const totalEV = bets.reduce((sum, bet, i) => 
        sum + weights[i] * bet.ev / getBetTypeRiskFactor(bet.type), 0);
      
      // 的中確率の評価
      const hitProbability = 1 - bets.reduce((missProb, bet, i) => 
        missProb * (1 - (bet.prob * weights[i])), 1);

      // 平均オッズ（馬券種別のリスク特性を考慮）
      const adjustedOdds = bets.reduce((sum, bet, i) => 
        sum + (bet.odds * weights[i] / getBetTypeRiskFactor(bet.type)), 0) / totalInvestment;

      // リスクリワードとの整合性（許容範囲を拡大）
      const oddsGap = Math.abs(adjustedOdds - riskRatio) / riskRatio;
      const isWithinRiskRange = adjustedOdds <= riskRatio * 1.5; // 許容範囲を拡大

      // 分散投資効果（馬券種別の多様性も評価）
      const betTypes = new Set(bets.map(b => b.type));
      const typeBonus = betTypes.size > 1 ? Math.log(betTypes.size) * 0.1 : 0;
      const portfolioEffect = Math.log(bets.length) * 0.2 + typeBonus;

      // 総合評価スコア
      const score = isWithinRiskRange ? (
        totalEV * 1.5 +           // 期待値（最重要）
        hitProbability * 1.0 +    // 的中確率
        portfolioEffect -         // 分散効果
        oddsGap * 0.3            // リスクリワード整合性
      ) : -Infinity;

      return { 
        totalEV,
        hitProbability,
        adjustedOdds,
        portfolioEffect,
        score,
        isWithinRiskRange,
        betTypes: Array.from(betTypes)
      };
    };

    // 事前フィルタリング（統合版）
    const preFilteredOptions = options
      .filter(opt => {
        const riskFactor = getBetTypeRiskFactor(opt.type);
        
        // オッズの制限
        const minOdds = Math.max(1.0, riskRatio * 0.5);
        const maxOdds = Math.min(99999.9, riskRatio * riskRatio * riskFactor * riskFactor); // 馬券種別に応じて上限を調整
        
        // リスクリワード比率に応じて最小確率を調整
        const minProbability = Math.max(0.005, 0.2 - (riskRatio * 0.015));
        
        // 最低期待値
        const minEV = 0.05;

        return opt.odds >= minOdds && 
               opt.odds <= maxOdds && 
               opt.prob >= minProbability && 
               opt.ev >= minEV;
      })
      .sort((a, b) => b.ev - a.ev);

    // 馬券数の範囲設定を馬券種別のリスク特性に応じて調整
    const getOptimalBetRange = (selectedBets: typeof options) => {
      // 選択された馬券の平均リスクファクターを計算
      const avgRiskFactor = selectedBets.reduce((sum, bet) => 
        sum + getBetTypeRiskFactor(bet.type), 0) / selectedBets.length;
      
      // リスクファクターに応じて基準値を調整
      const baseMinBets = Math.max(2, Math.floor(3 / Math.sqrt(riskRatio)));
      const baseMaxBets = Math.max(baseMinBets + 1, Math.min(8, Math.ceil(12 / riskRatio)));
      
      // リスクファクターに応じて購入点数を増加
      const riskAdjustment = Math.sqrt(avgRiskFactor);
      const minBets = Math.max(baseMinBets, Math.floor(baseMinBets * riskAdjustment));
      const maxBets = Math.max(minBets + 1, Math.floor(baseMaxBets * riskAdjustment));

      return { minBets, maxBets };
    };

    let bestBets: typeof options = [];
    let bestWeights: number[] = [];
    let bestMetrics = null;

    // 選択された馬券に応じて購入点数の範囲を動的に決定
    const { minBets, maxBets } = getOptimalBetRange(preFilteredOptions);
    
    console.log('購入点数範囲:', {
      最小点数: minBets,
      最大点数: maxBets,
      対象馬券数: preFilteredOptions.length,
      平均リスク: preFilteredOptions.reduce((sum, bet) => 
        sum + getBetTypeRiskFactor(bet.type), 0) / preFilteredOptions.length
    });

    for (let size = minBets; size <= maxBets; size++) {
      for (let startIdx = 0; startIdx <= preFilteredOptions.length - size; startIdx++) {
        const selectedBets = preFilteredOptions.slice(startIdx, startIdx + size);
        
        // 重みの最適化
        for (let iter = 0; iter < 100; iter++) {
          // より均一な重みの生成
          const weights = selectedBets.map(() => 
            0.6 + (Math.random() * 0.4)
          );
          const sum = weights.reduce((a, b) => a + b, 0);
          const normalizedWeights = weights.map(w => w / sum);
          
          const metrics = calculatePortfolioMetrics(selectedBets, normalizedWeights);
          if (!metrics || !metrics.isWithinRiskRange) continue;

          const isBetter = !bestMetrics || metrics.score > bestMetrics.score;

          if (isBetter) {
            bestMetrics = metrics;
            bestBets = selectedBets;
            bestWeights = normalizedWeights;
            
            console.log('改善発見:', {
              betsCount: size,
              betTypes: metrics.betTypes,
              adjustedOdds: metrics.adjustedOdds.toFixed(1) + '倍',
              expectedValue: metrics.totalEV.toFixed(3),
              hitProbability: (metrics.hitProbability * 100).toFixed(1) + '%',
              portfolioEffect: metrics.portfolioEffect.toFixed(3),
              score: metrics.score.toFixed(3),
              bets: selectedBets.map((opt, i) => ({
                type: opt.type,
                horse: opt.horseName,
                odds: opt.odds.toFixed(1),
                prob: (opt.prob * 100).toFixed(1) + '%',
                weight: (normalizedWeights[i] * 100).toFixed(1) + '%'
              }))
            });
          }
        }
      }
    }

    return {
      selectedBets: bestBets,
      weights: bestWeights,
      sharpeRatio: bestMetrics?.score ?? -Infinity
    };
  };

  // メイン処理
  const { selectedBets, weights, sharpeRatio } = findOptimalWeights(bettingOptions);

  // 最小投資額でフィルタリング
  const MIN_WEIGHT = MIN_STAKE / totalBudget;
  const finalBets = selectedBets.filter((_, i) => weights[i] >= MIN_WEIGHT);
  const finalWeights = weights.filter(w => w >= MIN_WEIGHT);

  // 結果を投資額に変換し、ソート
  const proposals: BetProposal[] = finalBets.map((opt, i) => {
    const stake = Math.floor(totalBudget * finalWeights[i] / 100) * 100;
    return {
      type: opt.type as BetProposal['type'],
      horses: [opt.horseName],
      stake,
      expectedReturn: Math.floor(stake * opt.odds),
      probability: opt.prob
    };
  }).sort((a, b) => {
    // 馬券種別の優先順位を定義
    const typeOrder: Record<BetProposal['type'], number> = {
      "単勝": 1,
      "複勝": 2,
      "枠連": 3,
      "馬連": 4,
      "ワイド": 5,
      "馬単": 6,
      "３連複": 7,
      "３連単": 8
    };
    
    // まず馬券種別でソート
    const typeCompare = typeOrder[a.type] - typeOrder[b.type];
    if (typeCompare !== 0) return typeCompare;
    
    // 同じ馬券種別の場合は馬番で昇順ソート
    const aNumber = parseInt(a.horses[0].split(/[ →-]/)[0]);
    const bNumber = parseInt(b.horses[0].split(/[ →-]/)[0]);
    return aNumber - bNumber;
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