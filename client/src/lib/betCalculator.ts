import { GeminiStrategy, getGeminiStrategy } from './geminiApi';
import type { GeminiRecommendation } from './geminiApi';

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
  type: string;
  horses: string[];
  horseName: string;  // 表示用の馬番組み合わせ
  stake: number;
  expectedReturn: number;
  probability: number;
  reason?: string;  // reasonを追加
}

export interface HorseData {
  name: string;
  odds: number;
  winProb: number;
  placeProb: number;
  frame: number;
  number: number;
}

export const calculateBetProposals = (
  horses: HorseData[], 
  totalBudget: number, 
  riskRatio: number, 
  fukuData: { horse1: number; oddsMin: number; oddsMax: number; }[],
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
      winProb: (h.winProb * 100).toFixed(1) + '%',
      placeProb: (h.placeProb * 100).toFixed(1) + '%'
    })),
    totalBudget,
    riskRatio
  });

  // オッズ行列の作成（期待値がプラスの馬券のみを対象とする）
  const bettingOptions = horses.flatMap(horse => {
    const options = [];
    
    // 単勝オプション
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
    return options;
  });

  // 複勝オプションの追加
  fukuData.forEach(fuku => {
    const horse = horses.find(h => h.number === fuku.horse1);
    if (!horse) return;

    // 複勝の平均オッズ計算
    const avgOdds = Math.round(((fuku.oddsMin + fuku.oddsMax) / 2) * 10) / 10;
    const placeEV = avgOdds * horse.placeProb - 1;

    if (horse.placeProb > 0 && placeEV > 0) {
      bettingOptions.push({
        type: "複勝",
        horseName: `${horse.number} ${horse.name}`,
        odds: avgOdds,
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
        オッズ: avgOdds.toFixed(1),
        的中確率: (horse.placeProb * 100).toFixed(2) + '%',
        期待値: placeEV.toFixed(2)
      });
    }
  });

  // 枠連オプションの追加
  wakurenData.forEach(wakuren => {
    // 対象の枠の馬を取得
    const frame1Horses = horses.filter(h => h.frame === wakuren.frame1);
    const frame2Horses = horses.filter(h => h.frame === wakuren.frame2);
    
    // 枠連的中確率の計算
    let wakurenProb = 0;

    // 同じ枠の場合（例：1-1）
    if (wakuren.frame1 === wakuren.frame2) {
      // 同じ枠内の異なる馬の組み合わせのみを計算
      for (let i = 0; i < frame1Horses.length; i++) {
        for (let j = i + 1; j < frame1Horses.length; j++) {
          const h1 = frame1Horses[i];
          const h2 = frame1Horses[j];

          // h1が1着、h2が2着のケース
          wakurenProb += h1.winProb * ((h2.placeProb - h2.winProb) / 2);

          // h2が1着、h1が2着のケース
          wakurenProb += h2.winProb * ((h1.placeProb - h1.winProb) / 2);
        }
      }
    } else {
      // 異なる枠の場合（例：1-2, 7-8）
      // 全ての組み合わせを計算
      frame1Horses.forEach(h1 => {
        frame2Horses.forEach(h2 => {
          // h1が1着、h2が2着のケース
          wakurenProb += h1.winProb * ((h2.placeProb - h2.winProb) / 2);

          // h2が1着、h1が2着のケース
          wakurenProb += h2.winProb * ((h1.placeProb - h1.winProb) / 2);
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

    // ワイドの平均オッズ計算
    const avgOdds = Math.round(((wide.oddsMin + wide.oddsMax) / 2) * 10) / 10;
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
        case "枠連":
          return 2.0;  // 枠連のリスク
        case "馬連":
          return 3.0;  // 馬連のリスク
        case "ワイド":
          return 2.0;  // ワイドのリスク
        case "馬単":
          return 4.0;  // 馬単のリスク
        case "３連複":
          return 6.0;  // 3連複のリスク
        case "３連単":
          return 8.0;  // 3連単のリスク
        default:
          return 1.0;
      }
    };

    // ポートフォリオの評価関数
    const calculatePortfolioMetrics = (bets: typeof options, weights: number[]) => {
      if (bets.length === 0 || weights.length === 0) return null;
      
      const totalInvestment = weights.reduce((a, b) => a + b, 0);
      
      // 期待リターンの計算（馬券種別のリスク特性を考慮）
      const returns = bets.map((bet, i) => 
        weights[i] * (bet.odds - 1) * bet.prob / getBetTypeRiskFactor(bet.type)
      );
      const expectedReturn = returns.reduce((a, b) => a + b, 0);
      
      // リスク（標準偏差）の計算
      const variance = bets.map((bet, i) => {
        const r = (bet.odds - 1) * weights[i] / getBetTypeRiskFactor(bet.type);
        return bet.prob * (1 - bet.prob) * r * r;
      }).reduce((a, b) => a + b, 0);
      
      const risk = Math.sqrt(variance);
      const sharpeRatio = risk > 0 ? expectedReturn / risk : 0;

      // 目標リターンとの整合性
      const returnDifference = Math.abs(expectedReturn - riskRatio) / riskRatio;
      const isWithinRiskRange = expectedReturn <= riskRatio * 1.5;

      // 分散投資効果（効果を抑制）
      const betTypes = new Set(bets.map(b => b.type));
      const typeBonus = betTypes.size > 1 ? Math.log(betTypes.size) * 0.05 : 0;  // 0.1 → 0.05
      const portfolioEffect = Math.log(bets.length) * 0.1 + typeBonus;  // 0.2 → 0.1

      // 総合評価スコア（Sharpe比の重みを増加）
      const score = isWithinRiskRange ? (
        sharpeRatio * 4.0 +        // 2.0 → 4.0 Sharpe比の重みを倍増
        portfolioEffect -          // 分散効果を半減
        returnDifference * 1.0     // 0.5 → 1.0 リターン整合性の重みを増加
      ) : -Infinity;

      return { 
        sharpeRatio,
        expectedReturn,
        risk,
        portfolioEffect,
        score,
        isWithinRiskRange,
        betTypes: Array.from(betTypes),
        betsCount: bets.length
      };
    };

    // 事前フィルタリング（統合版）
    const preFilteredOptions = options
      .filter(opt => {
        const riskFactor = getBetTypeRiskFactor(opt.type);
        
        // オッズの制限
        const minOdds = Math.max(1.0, riskRatio * 0.5 * riskFactor);
        const maxOdds = Math.min(9999.9, riskRatio * riskFactor * riskFactor); // 馬券種別に応じて上限を調整
        
        // リスクリワード比率に応じて最小確率を調整
        const minProbability = Math.max(0.005, 1 / (riskRatio * riskFactor));
        
        // 最低期待値
        const minEV = 0.5;

        return opt.odds >= minOdds && 
               opt.odds <= maxOdds && 
               opt.prob >= minProbability && 
               opt.ev >= minEV;
      })
      .sort((a, b) => b.ev - a.ev);

    // 馬券種別ごとの選択数を調整
    const adjustBetsByType = (options: typeof preFilteredOptions) => {
      // 馬券種別ごとの最小・最大点数を定義
      const betTypeRanges: Record<BetProposal['type'], { min: number; max: number }> = {
        "複勝": { min: 0, max: 2 },
        "単勝": { min: 0, max: 3 },
        "枠連": { min: 0, max: 4 },
        "馬連": { min: 0, max: 6 },
        "ワイド": { min: 0, max: 4 },
        "馬単": { min: 0, max: 8 },
        "３連複": { min: 0, max: 12 },
        "３連単": { min: 0, max: 16 }
      };
      
      // 馬券種別にグループ化
      const betsByType = options.reduce((acc, bet) => {
        if (!acc[bet.type]) acc[bet.type] = [];
        acc[bet.type].push(bet);
        return acc;
      }, {} as Record<string, typeof options>);

      // 各馬券種の選択数を調整
      let adjustedOptions: typeof options = [];
      Object.entries(betsByType).forEach(([type, bets]) => {
        const range = betTypeRanges[type as BetProposal['type']];
        
        // 利用可能な候補数と設定された範囲から適切な選択数を決定
        const selectionCount = Math.min(
          bets.length,  // 利用可能な候補数を超えない
          Math.max(
            range.min,  // 最小点数は必ず確保
            Math.min(range.max, bets.length)  // 最大点数を超えない
          )
        );

        // 期待値順で上位n件を選択
        adjustedOptions = adjustedOptions.concat(bets.slice(0, selectionCount));
        
        console.log(`馬券種別選択数調整: ${type}`, {
          設定範囲: `${range.min}～${range.max}点`,
          候補数: bets.length,
          選択数: selectionCount,
          選択された馬券: bets.slice(0, selectionCount).map(b => ({
            馬番組合せ: b.horseName,
            期待値: b.ev.toFixed(3)
          }))
        });
      });

      return adjustedOptions.sort((a, b) => b.ev - a.ev);
    };

    // 馬券種別ごとの選択数を調整
    const adjustedOptions = adjustBetsByType(preFilteredOptions);

    console.log('購入点数範囲:', {
      調整後の対象馬券数: adjustedOptions.length,
      馬券種別構成: Object.entries(
        adjustedOptions.reduce((acc, bet) => {
          acc[bet.type] = (acc[bet.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      )
    });

    let bestBets: typeof options = [];
    let bestWeights: number[] = [];
    let bestMetrics = null;

    // 最適な組み合わせを探索（より少ない点数から開始）
    for (let size = Math.min(5, adjustedOptions.length); size <= adjustedOptions.length; size++) {
      for (let iter = 0; iter < 100; iter++) {  // イテレーション回数を増加
        // ランダムに馬券を選択（馬券種別の構成を維持）
        const selectedBets = adjustedOptions
          .sort(() => Math.random() - 0.5)
          .slice(0, size);

        // 重みの最適化
        const weights = selectedBets.map(() => 0.6 + (Math.random() * 0.4));
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
            betsCount: selectedBets.length,
            betTypes: metrics.betTypes,
            adjustedOdds: metrics.expectedReturn.toFixed(3),
            sharpeRatio: metrics.sharpeRatio.toFixed(3),
            risk: metrics.risk.toFixed(3),
            portfolioEffect: metrics.portfolioEffect.toFixed(3),
            score: metrics.score.toFixed(3)
          });
        }
      }
    }

    // 最小投資額でフィルタリング
    const MIN_WEIGHT = MIN_STAKE / totalBudget;
    const finalBets = bestBets.filter((_, i) => bestWeights[i] >= MIN_WEIGHT);
    const finalWeights = bestWeights.filter(w => w >= MIN_WEIGHT);

    // 結果を投資額に変換し、ソート
    const proposals: BetProposal[] = finalBets.map((opt, i) => {
      const stake = Math.floor(totalBudget * finalWeights[i] / 100) * 100;
      return {
        type: opt.type as BetProposal['type'],
        horses: [opt.horseName],
        horseName: opt.horseName,
        stake,
        expectedReturn: Math.floor(stake * opt.odds),
        probability: opt.prob
      };
    }).sort((a, b) => {
      const typeOrder: Record<string, number> = {
        "単勝": 1,
        "複勝": 2,
        "枠連": 3,
        "馬連": 4,
        "ワイド": 5,
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

    console.log('最終結果:', {
      sharpeRatio: bestMetrics?.score ?? -Infinity,
      totalBets: proposals.length,
      bets: proposals.map(p => ({
        type: p.type,
        horses: p.horses,
        horseName: p.horseName,
        stake: p.stake,
        expectedReturn: p.expectedReturn,
        probability: (p.probability * 100).toFixed(1) + '%'
      }))
    });

    return proposals;
  };

  // メイン処理
  const proposals = findOptimalWeights(bettingOptions);

  return proposals;
};

export const optimizeBetAllocation = (
  recommendations: GeminiRecommendation[],
  totalBudget: number
): BetProposal[] => {
  console.group('Sharpe比最大化による資金配分の最適化');
  
  // 確率を文字列から数値に変換
  const processedRecs = recommendations.map(rec => ({
    ...rec,
    probability: typeof rec.probability === 'string' 
      ? parseFloat(rec.probability.replace('%', '')) / 100 
      : rec.probability
  }));

  const calculateSharpeRatio = (weights: number[]) => {
    const returns = weights.map((w, i) => 
      w * (processedRecs[i].odds - 1) * processedRecs[i].probability
    );
    const expectedReturn = returns.reduce((a, b) => a + b, 0);
    
    const variance = weights.map((w, i) => {
      const r = (processedRecs[i].odds - 1) * w;
      return processedRecs[i].probability * 
        (1 - processedRecs[i].probability) * r * r;
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
      console.log('改善:', {
        iteration: iter,
        sharpeRatio: metrics.sharpeRatio.toFixed(3),
        expectedReturn: metrics.expectedReturn.toFixed(3),
        risk: metrics.risk.toFixed(3)
      });
    }
  }

  console.groupEnd();
  return processedRecs.map((rec, i) => ({
    type: rec.type,
    horses: rec.horses,
    horseName: ["馬単", "３連単"].includes(rec.type) 
      ? rec.horses.join('→')
      : rec.horses.join('-'),
    stake: Math.floor(totalBudget * bestWeights[i] / 100) * 100,
    expectedReturn: rec.odds * Math.floor(totalBudget * bestWeights[i] / 100) * 100,
    probability: rec.probability,
    reason: rec.reason
  }))
  .filter(bet => bet.stake >= 100)
  .sort((a, b) => {
    const typeOrder: Record<string, number> = {
      "単勝": 1,
      "複勝": 2,
      "枠連": 3,
      "馬連": 4,
      "ワイド": 5,
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
};

export const calculateBetProposalsWithGemini = async (
  horses: HorseData[], 
  totalBudget: number, 
  allBettingOptions: { bettingOptions: BettingOption[] },
  riskRatio: number
): Promise<BetProposal[]> => {
  try {
    // Geminiから推奨馬券を取得
    const geminiResponse = await getGeminiStrategy([], totalBudget, allBettingOptions, riskRatio);
    
    // 資金配分の最適化
    return optimizeBetAllocation(geminiResponse.strategy.recommendations, totalBudget);
  } catch (error) {
    console.error('Bet calculation error:', error);
    return [];
  }
};
