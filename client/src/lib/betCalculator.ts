import { GeminiStrategy, getGeminiStrategy } from './geminiApi';
import type { GeminiRecommendation } from './geminiApi';

interface BettingOption {
  type: "単勝" | "複勝" | "枠連" | "ワイド" | "馬連" | "馬単" | "３連複" | "３連単";
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
  // 以下のプロパティを追加
  frame1?: number;
  frame2?: number;
  frame3?: number;
  horse1?: number;
  horse2?: number;
  horse3?: number;
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
  
  if (process.env.NODE_ENV === 'development') {
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
    console.groupEnd();
  }
  
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
      if (process.env.NODE_ENV === 'development') {
        console.log(`単勝候補: ${horse.number} ${horse.name}`, {
          オッズ: horse.odds.toFixed(1),
          的中確率: (horse.winProb * 100).toFixed(2) + '%',
          期待値: winEV.toFixed(2)
        });
      }
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
      if (process.env.NODE_ENV === 'development') {
        console.log(`複勝候補: ${horse.number} ${horse.name}`, {
          オッズ: avgOdds.toFixed(1),
          的中確率: (horse.placeProb * 100).toFixed(2) + '%',
          期待値: placeEV.toFixed(2)
        });
      }
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
      if (process.env.NODE_ENV === 'development') {
        console.log(`枠連候補: ${wakuren.frame1}-${wakuren.frame2}`, {
          オッズ: wakuren.odds.toFixed(1),
          的中確率: (wakurenProb * 100).toFixed(2) + '%',
          期待値: wakurenEV.toFixed(2)
        });
      }
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
      if (process.env.NODE_ENV === 'development') {
        console.log(`馬連候補: ${horse1.number}-${horse2.number}`, {
          オッズ: umaren.odds.toFixed(1),
          的中確率: (umarenProb * 100).toFixed(2) + '%',
          期待値: umarenEV.toFixed(2)
        });
      }
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
      if (process.env.NODE_ENV === 'development') {
        console.log(`ワイド候補: ${horse1.number}-${horse2.number}`, {
          オッズ: avgOdds.toFixed(1),
          的中確率: (wideProb * 100).toFixed(2) + '%',
          期待値: wideEV.toFixed(2)
        });
      }
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
      if (process.env.NODE_ENV === 'development') {
        console.log(`馬単候補: ${horse1.number}→${horse2.number}`, {
          オッズ: umatan.odds.toFixed(1),
          的中確率: (umatanProb * 100).toFixed(2) + '%',
          期待値: umatanEV.toFixed(2)
        });
      }
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
      if (process.env.NODE_ENV === 'development') {
        console.log(`3連複候補: ${horse1.number}-${horse2.number}-${horse3.number}`, {
          オッズ: sanren.odds.toFixed(1),
          的中確率: (sanrenProb * 100).toFixed(2) + '%',
          期待値: sanrenEV.toFixed(2)
        });
      }
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
      if (process.env.NODE_ENV === 'development') {
        console.log(`3連単候補: ${horse1.number}→${horse2.number}→${horse3.number}`, {
          オッズ: sanren.odds.toFixed(1),
          的中確率: (sanrentanProb * 100).toFixed(2) + '%',
          期待値: sanrentanEV.toFixed(2)
        });
      }
    }
  });

  // デバッグ用：最適化対象の馬券一覧
  if (process.env.NODE_ENV === 'development') {
    console.log('最適化対象馬券数:', bettingOptions.length);
  }

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
        case "ワイド":
          return 2.0;  // ワイドのリスク
        case "馬連":
          return 3.0;  // 馬連のリスク
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

    // 事前フィルタリング（統合版）
    const preFilteredOptions = options
      .filter(opt => {
        const riskFactor = getBetTypeRiskFactor(opt.type);
        
        // オッズの下限のみを設定
        const minOdds = Math.max(1.0, Math.pow(riskRatio, 0.5) * Math.pow(riskFactor, 1.5));
        
        // リスクリワード比率に応じて最小確率を調整
        const minProbability = Math.max(0.005, 1 / (riskRatio * riskFactor));
        
        // 最低期待値
        const minEV = Math.max(0.3, Math.pow(riskFactor, 0.5) / Math.pow(riskRatio, 0.5));

        return opt.odds >= minOdds && 
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
        "ワイド": { min: 0, max: 4 },
        "馬連": { min: 0, max: 6 },
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
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`馬券種別選択数調整: ${type}`, {
            設定範囲: `${range.min}～${range.max}点`,
            候補数: bets.length,
          選択数: selectionCount,
          選択された馬券: bets.slice(0, selectionCount).map(b => ({
            馬番組合せ: b.horseName,
            期待値: b.ev.toFixed(3)
          }))
        });
      }
      });

      return adjustedOptions.sort((a, b) => b.ev - a.ev);
    };

    // 馬券種別ごとの選択数を調整
    const adjustedOptions = adjustBetsByType(preFilteredOptions);

    if (process.env.NODE_ENV === 'development') {
      console.log('購入点数範囲:', {
        調整後の対象馬券数: adjustedOptions.length,
        馬券種別構成: Object.entries(
          adjustedOptions.reduce((acc, bet) => {
            acc[bet.type] = (acc[bet.type] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
        )
      });
    }

    // 重みの初期化（均等配分）
    const weights = adjustedOptions.map(() => 1 / adjustedOptions.length);

    // 結果を投資額に変換し、ソート
    const proposals: BetProposal[] = adjustedOptions
      .map((bet, i) => ({
        type: bet.type as BetProposal['type'],
        horses: [bet.horseName],
        horseName: bet.horseName,
        stake: Number((totalBudget * weights[i]).toFixed(1)),
        expectedReturn: Number((totalBudget * weights[i] * bet.odds).toFixed(1)),
        probability: bet.prob
      }))
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

    // 最終結果のログ出力を改善
    if (process.env.NODE_ENV === 'development') {
      console.log('最終結果:', {
        totalBets: proposals.length,
        totalInvestment: proposals.reduce((sum, p) => sum + p.stake, 0),
        bets: proposals.map(p => ({
          type: p.type,
          horses: p.horses,
          horseName: p.horseName,
          stake: p.stake,
          expectedReturn: p.expectedReturn,
          probability: (p.probability * 100).toFixed(1) + '%'
        }))
      });
    }

    return proposals;
  };

  // メイン処理
  const proposals = findOptimalWeights(bettingOptions);
  return proposals;
};

// 馬券間の相関係数を計算する関数を独立させる
export const calculateCorrelation = (proposals: BetProposal[]) => {
  const correlations: { bet1: string; bet2: string; correlation: number }[] = [];
  
  for (let i = 0; i < proposals.length; i++) {
    for (let j = i + 1; j < proposals.length; j++) {
      const bet1 = proposals[i];
      const bet2 = proposals[j];
      
      // 同時的中確率を計算
      const jointProb = calculateJointProbability(bet1, bet2);
      
      // 相関係数の計算
      const correlation = (jointProb - bet1.probability * bet2.probability) / 
                        Math.sqrt(bet1.probability * (1 - bet1.probability) * 
                                bet2.probability * (1 - bet2.probability));
      
      correlations.push({
        bet1: `${bet1.type}(${bet1.horseName})`,
        bet2: `${bet2.type}(${bet2.horseName})`,
        correlation: Number(correlation.toFixed(3))
      });
    }
  }
  
  return correlations.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
};

// 2つの馬券が同時に的中する確率を計算
const calculateJointProbability = (bet1: BetProposal, bet2: BetProposal): number => {
  // 馬券種別の組み合わせに基づいて同時的中確率を計算
  switch(bet1.type) {
    case "単勝":
      return calculateWinJointProb(bet1, bet2);
    case "複勝":
      return calculatePlaceJointProb(bet1, bet2);
    case "枠連":
      return calculateBracketQuinellaJointProb(bet1, bet2);
    case "ワイド":
      return calculateWideJointProb(bet1, bet2);
    case "馬連":
      return calculateQuinellaJointProb(bet1, bet2);
    case "馬単":
      return calculateExactaJointProb(bet1, bet2);
    case "３連複":
      return calculateTrio3JointProb(bet1, bet2);
    case "３連単":
      return calculateTrifecta3JointProb(bet1, bet2);
    default:
      return 0;
  }
};

// 単勝との組み合わせの同時的中確率
const calculateWinJointProb = (win: BetProposal, other: BetProposal): number => {
  const winHorse = win.horses[0];
  
  switch(other.type) {
    case "単勝":
      // 異なる馬の単勝は同時に的中しない
      return other.horses[0] === winHorse ? win.probability : 0;
      
    case "複勝":
      // 同じ馬なら単勝的中は必ず複勝的中する
      return other.horses.includes(winHorse) ? win.probability : 0;
      
    case "枠連":
      // 単勝馬が枠連の組み合わせに含まれる場合のみ的中
      // frame1とframe2の情報を利用
      const winFrame = win.frame1; // 単勝馬の枠番
      return (other.frame1 === winFrame || other.frame2 === winFrame) ? 
        win.probability * ((other.probability * 2) / 3) : 0; // 枠連の条件付き確率を調整
      
    case "ワイド":
      // 単勝馬がワイドの組み合わせに含まれる場合のみ的中
      // 単勝馬が1着なら、もう一頭が2着か3着に入れば良い
      if (!other.horses.includes(winHorse)) return 0;
      const otherHorseProb = other.probability / (other.horses.length - 1);
      return win.probability * otherHorseProb;
      
    case "馬連":
      // 単勝馬が馬連の組み合わせに含まれ、もう一頭が2着の場合に的中
      if (!other.horses.includes(winHorse)) return 0;
      const otherHorsePlace = other.probability / 2; // 馬連のもう一頭が2着に入る確率
      return win.probability * otherHorsePlace;
      
    case "馬単":
      if (other.horse1 === Number(winHorse)) {
        // 単勝馬が馬単の1着指定と同じ場合
        return win.probability * (other.probability / win.probability);
      } else if (other.horse2 === Number(winHorse)) {
        // 単勝馬が馬単の2着指定の場合は的中しない
        return 0;
      }
      return 0;
      
    case "３連複":
      // 単勝馬が3連複の組み合わせに含まれ、他の2頭が2-3着の場合に的中
      if (!other.horses.includes(winHorse)) return 0;
      const otherHorsesPlace = other.probability / 3; // 残り2頭が2-3着に入る確率
      return win.probability * otherHorsesPlace;
      
    case "３連単":
      // 単勝馬が3連単の1着指定と同じ場合のみ的中
      return other.horse1 === Number(winHorse) ? 
        win.probability * (other.probability / win.probability) : 0;
      
    default:
      return 0;
  }
};

// 複勝との組み合わせの同時的中確率
const calculatePlaceJointProb = (place: BetProposal, other: BetProposal): number => {
  const placeHorse = place.horses[0];
  
  switch(other.type) {
    case "単勝":
      // 単勝馬が複勝対象馬と同じ場合、単勝的中は必ず複勝的中
      return other.horses[0] === placeHorse ? other.probability : 0;
      
    case "複勝":
      if (other.horses[0] === placeHorse) {
        // 同じ馬の複勝は完全に相関
        return place.probability;
      } else {
        // 異なる馬の複勝の場合、3着以内の着順の組み合わせを考慮
        // 例: 1-2着、1-3着、2-3着の可能性
        return place.probability * other.probability * 0.9; // 若干の負の相関を考慮
      }
      
    case "枠連":
      // 複勝対象馬の枠が枠連に含まれている場合
      const placeFrame = place.frame1;
      if (other.frame1 === placeFrame || other.frame2 === placeFrame) {
        // 複勝馬が1-2着に入り、もう一方の枠の馬が2-1着に入る確率
        return place.probability * (other.probability / 2);
      }
      return 0;
      
    case "ワイド":
      if (other.horses.includes(placeHorse)) {
        // 複勝対象馬がワイドに含まれている場合
        // ワイドのもう一頭も複勝圏内に入る必要がある
        return place.probability * (other.probability / place.probability);
      }
      return 0;
      
    case "馬連":
      if (other.horses.includes(placeHorse)) {
        // 複勝対象馬が馬連に含まれている場合
        // 複勝馬が1-2着に入り、もう一頭が2-1着に入る確率
        return place.probability * (other.probability / 2);
      }
      return 0;
      
    case "馬単":
      if (other.horse1 === Number(placeHorse)) {
        // 複勝対象馬が馬単の1着指定の場合
        return place.probability * (other.probability / place.probability);
      } else if (other.horse2 === Number(placeHorse)) {
        // 複勝対象馬が馬単の2着指定の場合
        return place.probability * (other.probability / 2);
      }
      return 0;
      
    case "３連複":
      if (other.horses.includes(placeHorse)) {
        // 複勝対象馬が3連複に含まれている場合
        // 複勝馬が1-2-3着のいずれかに入り、他の2頭も3着以内に入る確率
        return place.probability * (other.probability / 3);
      }
      return 0;
      
    case "３連単":
      if (other.horse1 === Number(placeHorse)) {
        // 複勝対象馬が3連単の1着指定の場合
        return place.probability * (other.probability / place.probability);
      } else if (other.horse2 === Number(placeHorse) || other.horse3 === Number(placeHorse)) {
        // 複勝対象馬が3連単の2着か3着指定の場合
        return place.probability * (other.probability / 2);
      }
      return 0;
      
    default:
      return 0;
  }
};

// 枠連との組み合わせの同時的中確率
const calculateBracketQuinellaJointProb = (wakuren: BetProposal, other: BetProposal): number => {
  const frame1 = wakuren.frame1;
  const frame2 = wakuren.frame2;
  
  switch(other.type) {
    case "単勝":
      // 単勝馬の枠が枠連の組み合わせに含まれている場合のみ的中
      const winFrame = other.frame1;
      if (frame1 === winFrame || frame2 === winFrame) {
        // 単勝馬が的中し、もう一方の枠から2着が出る確率
        return other.probability * (wakuren.probability / other.probability);
      }
      return 0;
      
    case "複勝":
      // 複勝馬の枠が枠連の組み合わせに含まれている場合
      const placeFrame = other.frame1;
      if (frame1 === placeFrame || frame2 === placeFrame) {
        // 複勝馬が1-2着に入り、もう一方の枠から相手が出る確率
        return other.probability * (wakuren.probability / other.probability);
      }
      return 0;
      
    case "枠連":
      if (frame1 === other.frame1 && frame2 === other.frame2) {
        // 完全に同じ枠連の場合
        return wakuren.probability;
      } else if ((frame1 === other.frame1 && frame2 === other.frame2) ||
                 (frame1 === other.frame2 && frame2 === other.frame1)) {
        // 枠の順序が逆の場合（同じ組み合わせ）
        return wakuren.probability;
      } else if (frame1 === other.frame1 || frame1 === other.frame2 ||
                 frame2 === other.frame1 || frame2 === other.frame2) {
        // 片方の枠が共通する場合
        return wakuren.probability * other.probability * 0.5;
      }
      // 共通する枠がない場合
      return wakuren.probability * other.probability * 0.3;
      
    case "ワイド":
      // ワイドの両馬の枠を確認
      const wideFrame1 = other.frame1;
      const wideFrame2 = other.frame2;
      if ((frame1 === wideFrame1 && frame2 === wideFrame2) ||
          (frame1 === wideFrame2 && frame2 === wideFrame1)) {
        // 枠が完全に一致する場合
        return Math.min(wakuren.probability, other.probability);
      } else if (frame1 === wideFrame1 || frame1 === wideFrame2 ||
                 frame2 === wideFrame1 || frame2 === wideFrame2) {
        // 片方の枠が共通する場合
        return wakuren.probability * (other.probability / 2);
      }
      return wakuren.probability * other.probability * 0.3;
      
    case "馬連":
      // 馬連の両馬の枠を確認
      const umarenFrame1 = other.frame1;
      const umarenFrame2 = other.frame2;
      if ((frame1 === umarenFrame1 && frame2 === umarenFrame2) ||
          (frame1 === umarenFrame2 && frame2 === umarenFrame1)) {
        // 枠が完全に一致する場合
        return Math.min(wakuren.probability, other.probability);
      } else if (frame1 === umarenFrame1 || frame1 === umarenFrame2 ||
                 frame2 === umarenFrame1 || frame2 === umarenFrame2) {
        // 片方の枠が共通する場合
        return wakuren.probability * (other.probability / 2);
      }
      return wakuren.probability * other.probability * 0.3;
      
    case "馬単":
      // 馬単の1着馬と2着馬の枠を確認
      const umatanFrame1 = other.frame1;
      const umatanFrame2 = other.frame2;
      if ((frame1 === umatanFrame1 && frame2 === umatanFrame2) ||
          (frame1 === umatanFrame2 && frame2 === umatanFrame1)) {
        // 枠が一致する場合（順序は考慮しない）
        return wakuren.probability * (other.probability / wakuren.probability);
      } else if (frame1 === umatanFrame1 || frame1 === umatanFrame2 ||
                 frame2 === umatanFrame1 || frame2 === umatanFrame2) {
        // 片方の枠が共通する場合
        return wakuren.probability * (other.probability / 2);
      }
      return wakuren.probability * other.probability * 0.3;
      
    case "３連複":
      // 3連複の3頭の枠を確認
      const sanrenpukuFrames = [other.frame1, other.frame2, other.frame3];
      const hasCommonFrame = sanrenpukuFrames.some(f => f === frame1 || f === frame2);
      if (hasCommonFrame) {
        // 共通する枠がある場合
        return wakuren.probability * (other.probability / 2);
      }
      return wakuren.probability * other.probability * 0.2;
      
    case "３連単":
      // 3連単の3頭の枠を確認（着順考慮）
      const sanrentanFrames = [other.frame1, other.frame2, other.frame3];
      const hasCommonFrameInOrder = sanrentanFrames.slice(0, 2).some(f => f === frame1 || f === frame2);
      if (hasCommonFrameInOrder) {
        // 1-2着に共通する枠がある場合
        return wakuren.probability * (other.probability / wakuren.probability);
      }
      return wakuren.probability * other.probability * 0.2;
      
    default:
      return 0;
  }
};

// ワイドとの組み合わせの同時的中確率
const calculateWideJointProb = (wide: BetProposal, other: BetProposal): number => {
  const wideHorse1 = wide.horse1;
  const wideHorse2 = wide.horse2;
  
  switch(other.type) {
    case "単勝":
      // 単勝馬がワイドの組み合わせに含まれている場合
      const winHorse = Number(other.horses[0]);
      if (winHorse === wideHorse1 || winHorse === wideHorse2) {
        // 単勝馬が1着、もう一方のワイド指定馬が2-3着に入る確率
        return other.probability * ((wide.probability * 2) / 3);
      }
      return 0;
      
    case "複勝":
      // 複勝馬がワイドの組み合わせに含まれている場合
      const placeHorse = Number(other.horses[0]);
      if (placeHorse === wideHorse1 || placeHorse === wideHorse2) {
        // 複勝馬が1-2-3着のいずれかに入り、もう一方のワイド指定馬も複勝圏内に入る確率
        return other.probability * (wide.probability / other.probability);
      }
      return 0;
      
    case "枠連":
      // ワイドの両馬の枠を確認
      const wideFrame1 = wide.frame1;
      const wideFrame2 = wide.frame2;
      if ((other.frame1 === wideFrame1 && other.frame2 === wideFrame2) ||
          (other.frame1 === wideFrame2 && other.frame2 === wideFrame1)) {
        // 枠が完全に一致する場合
        return Math.min(wide.probability, other.probability);
      } else if (other.frame1 === wideFrame1 || other.frame1 === wideFrame2 ||
                 other.frame2 === wideFrame1 || other.frame2 === wideFrame2) {
        // 片方の枠が共通する場合
        return wide.probability * (other.probability / 2);
      }
      return wide.probability * other.probability * 0.3;
      
    case "ワイド":
      // 同じワイドの場合
      if (wideHorse1 === other.horse1 && wideHorse2 === other.horse2 ||
          wideHorse1 === other.horse2 && wideHorse2 === other.horse1) {
        return wide.probability;
      }
      // 1頭が共通する場合
      if (wideHorse1 === other.horse1 || wideHorse1 === other.horse2 ||
          wideHorse2 === other.horse1 || wideHorse2 === other.horse2) {
        // 共通する馬が複勝圏内に入り、それぞれのもう一頭も複勝圏内に入る確率
        return wide.probability * (other.probability / 2);
      }
      // 共通する馬がない場合
      return wide.probability * other.probability * 0.6; // 複勝圏内が3頭なので、やや高めの相関
      
    case "馬連":
      // ワイドと馬連の馬が完全に一致する場合
      if ((wideHorse1 === other.horse1 && wideHorse2 === other.horse2) ||
          (wideHorse1 === other.horse2 && wideHorse2 === other.horse1)) {
        // 馬連的中は必ずワイド的中
        return other.probability;
      }
      // 1頭が共通する場合
      if (wideHorse1 === other.horse1 || wideHorse1 === other.horse2 ||
          wideHorse2 === other.horse1 || wideHorse2 === other.horse2) {
        // 共通馬が1-2着に入り、もう一方の馬が複勝圏内に入る確率
        return wide.probability * (other.probability / 2);
      }
      return wide.probability * other.probability * 0.3;
      
    case "馬単":
      // ワイドと馬単の馬が一致する場合
      if (wideHorse1 === other.horse1 && wideHorse2 === other.horse2 ||
          wideHorse1 === other.horse2 && wideHorse2 === other.horse1) {
        // 馬単的中は必ずワイド的中
        return other.probability;
      }
      // 1頭が共通する場合
      if (wideHorse1 === other.horse1 || wideHorse1 === other.horse2 ||
          wideHorse2 === other.horse1 || wideHorse2 === other.horse2) {
        // 共通馬が指定着順に入り、もう一方の馬が複勝圏内に入る確率
        return wide.probability * (other.probability / 2);
      }
      return wide.probability * other.probability * 0.3;
      
    case "３連複":
      // ワイドの両馬が3連複に含まれる場合
      if (other.horses.includes(String(wideHorse1)) && other.horses.includes(String(wideHorse2))) {
        // ワイドの両馬が3着以内に入る確率（3連複的中が条件）
        return other.probability;
      }
      // 1頭のみ含まれる場合
      if (other.horses.includes(String(wideHorse1)) || other.horses.includes(String(wideHorse2))) {
        // 共通馬が3着以内に入り、もう一方のワイド指定馬も複勝圏内に入る確率
        return wide.probability * (other.probability / 2);
      }
      return wide.probability * other.probability * 0.2;
      
    case "３連単":
      // ワイドの両馬が3連単に含まれる場合
      if (other.horses.includes(String(wideHorse1)) && other.horses.includes(String(wideHorse2))) {
        // 3連単的中時にワイドも的中する確率
        return other.probability;
      }
      // 1頭のみ含まれる場合
      if (other.horses.includes(String(wideHorse1)) || other.horses.includes(String(wideHorse2))) {
        // 共通馬が指定着順に入り、もう一方のワイド指定馬も複勝圏内に入る確率
        return wide.probability * (other.probability / 2);
      }
      return wide.probability * other.probability * 0.2;
      
    default:
      return 0;
  }
};

// 馬連との組み合わせの同時的中確率
const calculateQuinellaJointProb = (umaren: BetProposal, other: BetProposal): number => {
  const umarenHorse1 = umaren.horse1;
  const umarenHorse2 = umaren.horse2;
  
  switch(other.type) {
    case "単勝":
      // 単勝馬が馬連の組み合わせに含まれている場合
      const winHorse = Number(other.horses[0]);
      if (winHorse === umarenHorse1 || winHorse === umarenHorse2) {
        // 単勝馬が1着、もう一方の馬連指定馬が2着に入る確率
        return other.probability * (umaren.probability / other.probability);
      }
      return 0;
      
    case "複勝":
      // 複勝馬が馬連の組み合わせに含まれている場合
      const placeHorse = Number(other.horses[0]);
      if (placeHorse === umarenHorse1 || placeHorse === umarenHorse2) {
        // 複勝馬が1-2着に入り、もう一方の馬連指定馬も1-2着に入る確率
        return other.probability * (umaren.probability / other.probability) * 0.67; // 3着は除外
      }
      return 0;
      
    case "枠連":
      // 馬連の両馬の枠を確認
      const umarenFrame1 = umaren.frame1;
      const umarenFrame2 = umaren.frame2;
      if ((other.frame1 === umarenFrame1 && other.frame2 === umarenFrame2) ||
          (other.frame1 === umarenFrame2 && other.frame2 === umarenFrame1)) {
        // 枠が完全に一致する場合
        return Math.min(umaren.probability, other.probability);
      } else if (other.frame1 === umarenFrame1 || other.frame1 === umarenFrame2 ||
                 other.frame2 === umarenFrame1 || other.frame2 === umarenFrame2) {
        // 片方の枠が共通する場合
        return umaren.probability * (other.probability / 2);
      }
      return umaren.probability * other.probability * 0.3;
      
    case "ワイド":
      // 馬連とワイドの馬が完全に一致する場合
      if ((umarenHorse1 === other.horse1 && umarenHorse2 === other.horse2) ||
          (umarenHorse1 === other.horse2 && umarenHorse2 === other.horse1)) {
        // 馬連的中はワイドも必ず的中
        return umaren.probability;
      }
      // 1頭が共通する場合
      if (umarenHorse1 === other.horse1 || umarenHorse1 === other.horse2 ||
          umarenHorse2 === other.horse1 || umarenHorse2 === other.horse2) {
        // 共通馬が1-2着に入り、他馬が複勝圏内に入る確率
        return umaren.probability * (other.probability / 2);
      }
      return umaren.probability * other.probability * 0.3;
      
    case "馬連":
      // 同じ馬連の場合
      if ((umarenHorse1 === other.horse1 && umarenHorse2 === other.horse2) ||
          (umarenHorse1 === other.horse2 && umarenHorse2 === other.horse1)) {
        return umaren.probability;
      }
      // 1頭が共通する場合
      if (umarenHorse1 === other.horse1 || umarenHorse1 === other.horse2 ||
          umarenHorse2 === other.horse1 || umarenHorse2 === other.horse2) {
        // 共通馬が1-2着に入る条件での確率
        return umaren.probability * (other.probability / 2);
      }
      // 共通する馬がない場合
      return umaren.probability * other.probability * 0.2; // 1-2着限定なので低い相関
      
    case "馬単":
      // 馬連と馬単の馬が一致する場合
      if ((umarenHorse1 === other.horse1 && umarenHorse2 === other.horse2) ||
          (umarenHorse1 === other.horse2 && umarenHorse2 === other.horse1)) {
        // 馬単的中は必ず馬連的中
        return other.probability;
      }
      // 1頭が共通する場合
      if (umarenHorse1 === other.horse1 || umarenHorse1 === other.horse2 ||
          umarenHorse2 === other.horse1 || umarenHorse2 === other.horse2) {
        // 共通馬が指定着順に入り、もう一方の馬が1-2着に入る確率
        return umaren.probability * (other.probability / 2);
      }
      return umaren.probability * other.probability * 0.2;
      
    case "３連複":
      // 馬連の両馬が3連複に含まれる場合
      if (other.horses.includes(String(umarenHorse1)) && other.horses.includes(String(umarenHorse2))) {
        // 馬連の両馬が1-2着に入る確率（3連複的中が条件）
        return umaren.probability * (other.probability / umaren.probability);
      }
      // 1頭のみ含まれる場合
      if (other.horses.includes(String(umarenHorse1)) || other.horses.includes(String(umarenHorse2))) {
        // 共通馬が1-2着に入り、他馬も3着以内に入る確率
        return umaren.probability * (other.probability / 3);
      }
      return umaren.probability * other.probability * 0.2;
      
    case "３連単":
      // 馬連の両馬が3連単の1-2着に指定されている場合
      if ((other.horse1 === umarenHorse1 && other.horse2 === umarenHorse2) ||
          (other.horse1 === umarenHorse2 && other.horse2 === umarenHorse1)) {
        // 3連単の1-2着が的中すれば馬連も的中
        return other.probability;
      }
      // 1頭が1-2着に指定されている場合
      if (other.horse1 === umarenHorse1 || other.horse1 === umarenHorse2 ||
          other.horse2 === umarenHorse1 || other.horse2 === umarenHorse2) {
        // 共通馬が指定着順に入り、もう一方の馬が1-2着に入る確率
        return umaren.probability * (other.probability / 2);
      }
      return umaren.probability * other.probability * 0.2;
      
    default:
      return 0;
  }
};

// 馬単との組み合わせの同時的中確率
const calculateExactaJointProb = (umatan: BetProposal, other: BetProposal): number => {
  const umatanHorse1 = umatan.horse1; // 1着指定馬
  const umatanHorse2 = umatan.horse2; // 2着指定馬
  
  switch(other.type) {
    case "単勝":
      // 単勝馬が馬単の1着指定馬と同じ場合のみ的中
      const winHorse = Number(other.horses[0]);
      if (winHorse === umatanHorse1) {
        // 単勝馬が1着、馬単2着指定馬が2着に入る確率
        return other.probability * (umatan.probability / other.probability);
      }
      return 0;
      
    case "複勝":
      // 複勝馬が馬単の指定馬に含まれる場合
      const placeHorse = Number(other.horses[0]);
      if (placeHorse === umatanHorse1) {
        // 1着指定馬が1着、2着指定馬が2着に入る確率
        return other.probability * (umatan.probability / other.probability);
      } else if (placeHorse === umatanHorse2) {
        // 1着指定馬が1着、2着指定馬（複勝馬）が2着に入る確率
        return umatan.probability * (other.probability / 2); // 複勝馬が2着に入る確率で調整
      }
      return 0;
      
    case "枠連":
      // 馬単の両馬の枠を確認
      const umatanFrame1 = umatan.frame1;
      const umatanFrame2 = umatan.frame2;
      if ((other.frame1 === umatanFrame1 && other.frame2 === umatanFrame2) ||
          (other.frame1 === umatanFrame2 && other.frame2 === umatanFrame1)) {
        // 枠が一致する場合、着順を考慮した確率
        return umatan.probability * (other.probability / umatan.probability);
      } else if (other.frame1 === umatanFrame1 || other.frame1 === umatanFrame2 ||
                 other.frame2 === umatanFrame1 || other.frame2 === umatanFrame2) {
        // 片方の枠が共通する場合
        return umatan.probability * (other.probability / 2);
      }
      return umatan.probability * other.probability * 0.2;
      
    case "ワイド":
      // 馬単の両馬がワイドに含まれる場合
      if ((umatanHorse1 === other.horse1 && umatanHorse2 === other.horse2) ||
          (umatanHorse1 === other.horse2 && umatanHorse2 === other.horse1)) {
        // 馬単的中はワイドも必ず的中
        return umatan.probability;
      }
      // 1頭が共通する場合
      if (umatanHorse1 === other.horse1 || umatanHorse1 === other.horse2 ||
          umatanHorse2 === other.horse1 || umatanHorse2 === other.horse2) {
        // 共通馬が指定着順に入り、他馬が複勝圏内に入る確率
        return umatan.probability * (other.probability / 2);
      }
      return umatan.probability * other.probability * 0.2;
      
    case "馬連":
      // 馬単の両馬が馬連に含まれる場合
      if ((umatanHorse1 === other.horse1 && umatanHorse2 === other.horse2) ||
          (umatanHorse1 === other.horse2 && umatanHorse2 === other.horse1)) {
        // 馬単的中は必ず馬連的中
        return umatan.probability;
      }
      // 1頭が共通する場合
      if (umatanHorse1 === other.horse1 || umatanHorse1 === other.horse2 ||
          umatanHorse2 === other.horse1 || umatanHorse2 === other.horse2) {
        // 共通馬が指定着順に入り、他馬が1-2着に入る確率
        return umatan.probability * (other.probability / 2);
      }
      return umatan.probability * other.probability * 0.2;
      
    case "馬単":
      // 同じ馬単の場合
      if (umatanHorse1 === other.horse1 && umatanHorse2 === other.horse2) {
        return umatan.probability;
      }
      // 1頭が共通する場合
      if (umatanHorse1 === other.horse1 || umatanHorse2 === other.horse2) {
        // 共通馬が同じ着順で入る確率
        return umatan.probability * (other.probability / 2);
      }
      // 共通する馬がない場合
      return umatan.probability * other.probability * 0.1; // 着順指定があるため、非常に低い相関
      
    case "３連複":
      // 馬単の両馬が3連複に含まれる場合
      if (other.horses.includes(String(umatanHorse1)) && other.horses.includes(String(umatanHorse2))) {
        // 馬単の着順で決着する確率（3連複的中が条件）
        return umatan.probability * (other.probability / umatan.probability);
      }
      // 1頭のみ含まれる場合
      if (other.horses.includes(String(umatanHorse1)) || other.horses.includes(String(umatanHorse2))) {
        // 共通馬が指定着順に入り、他馬も3着以内に入る確率
        return umatan.probability * (other.probability / 3);
      }
      return umatan.probability * other.probability * 0.1;
      
    case "３連単":
      // 馬単の両馬が3連単の1-2着に指定されている場合
      if (umatanHorse1 === other.horse1 && umatanHorse2 === other.horse2) {
        // 3連単の1-2着が的中すれば馬単も的中
        return other.probability;
      }
      // 1頭が1-2着に指定されている場合で、着順が一致
      if ((umatanHorse1 === other.horse1) || (umatanHorse2 === other.horse2)) {
        // 共通馬が指定着順に入る確率
        return umatan.probability * (other.probability / 2);
      }
      return umatan.probability * other.probability * 0.1;
      
    default:
      return 0;
  }
};

// 3連複との組み合わせの同時的中確率
const calculateTrio3JointProb = (sanrenpuku: BetProposal, other: BetProposal): number => {
  // 3連複の指定馬を配列として取得
  const sanrenpukuHorses = [sanrenpuku.horse1, sanrenpuku.horse2, sanrenpuku.horse3];
  
  switch(other.type) {
    case "単勝":
      // 単勝馬が3連複の組み合わせに含まれている場合
      const winHorse = Number(other.horses[0]);
      if (sanrenpukuHorses.includes(winHorse)) {
        // 単勝馬が1着、他の2頭が2-3着に入る確率
        return other.probability * (sanrenpuku.probability / other.probability);
      }
      return 0;
      
    case "複勝":
      // 複勝馬が3連複の組み合わせに含まれている場合
      const placeHorse = Number(other.horses[0]);
      if (sanrenpukuHorses.includes(placeHorse)) {
        // 複勝馬が1-2-3着のいずれかに入り、他の2頭も3着以内に入る確率
        return other.probability * (sanrenpuku.probability / other.probability);
      }
      return 0;
      
    case "枠連":
      // 3連複の馬の枠を確認
      const sanrenpukuFrames = [sanrenpuku.frame1, sanrenpuku.frame2, sanrenpuku.frame3];
      const commonFrames = [other.frame1, other.frame2].filter(f => 
        sanrenpukuFrames.includes(f)
      );
      
      if (commonFrames.length === 2) {
        // 枠連の両方の枠が3連複に含まれる場合
        return other.probability * (sanrenpuku.probability / other.probability);
      } else if (commonFrames.length === 1) {
        // 片方の枠のみ共通する場合
        return sanrenpuku.probability * (other.probability / 2);
      }
      return sanrenpuku.probability * other.probability * 0.2;
      
    case "ワイド":
      // ワイドの両馬が3連複に含まれているか確認
      const wideHorses = [other.horse1, other.horse2];
      const commonWideHorses = wideHorses.filter(h => 
        sanrenpukuHorses.includes(h)
      );
      
      if (commonWideHorses.length === 2) {
        // ワイドの両馬が3連複に含まれる場合
        return other.probability;
      } else if (commonWideHorses.length === 1) {
        // 1頭のみ共通する場合
        return sanrenpuku.probability * (other.probability / 2);
      }
      return sanrenpuku.probability * other.probability * 0.2;
      
    case "馬連":
      // 馬連の両馬が3連複に含まれているか確認
      const umarenHorses = [other.horse1, other.horse2];
      const commonUmarenHorses = umarenHorses.filter(h => 
        sanrenpukuHorses.includes(h)
      );
      
      if (commonUmarenHorses.length === 2) {
        // 馬連の両馬が3連複に含まれる場合
        return other.probability;
      } else if (commonUmarenHorses.length === 1) {
        // 1頭のみ共通する場合
        return sanrenpuku.probability * (other.probability / 2);
      }
      return sanrenpuku.probability * other.probability * 0.2;
      
    case "馬単":
      // 馬単の両馬が3連複に含まれているか確認
      const umatanHorses = [other.horse1, other.horse2];
      const commonUmatanHorses = umatanHorses.filter(h => 
        sanrenpukuHorses.includes(h)
      );
      
      if (commonUmatanHorses.length === 2) {
        // 馬単の両馬が3連複に含まれる場合
        return other.probability;
      } else if (commonUmatanHorses.length === 1) {
        // 1頭のみ共通する場合
        return sanrenpuku.probability * (other.probability / 2);
      }
      return sanrenpuku.probability * other.probability * 0.2;
      
    case "３連複":
      // 同じ3連複の場合
      if (sanrenpukuHorses.every(h => 
        [other.horse1, other.horse2, other.horse3].includes(h))) {
        return sanrenpuku.probability;
      }
      
      // 2頭が共通する場合
      const commonHorses = sanrenpukuHorses.filter(h => 
        [other.horse1, other.horse2, other.horse3].includes(h)
      );
      
      if (commonHorses.length === 2) {
        return sanrenpuku.probability * (other.probability / 2);
      } else if (commonHorses.length === 1) {
        // 1頭のみ共通する場合
        return sanrenpuku.probability * (other.probability / 3);
      }
      return sanrenpuku.probability * other.probability * 0.1;
      
    case "３連単":
      // 3連単の3頭が3連複と同じ馬の場合
      if (sanrenpukuHorses.every(h => 
        [other.horse1, other.horse2, other.horse3].includes(h))) {
        // 3連単的中は必ず3連複的中
        return other.probability;
      }
      
      // 共通する馬の数で確率を調整
      const commonTrifectaHorses = sanrenpukuHorses.filter(h => 
        [other.horse1, other.horse2, other.horse3].includes(h)
      );
      
      if (commonTrifectaHorses.length === 2) {
        return sanrenpuku.probability * (other.probability / 2);
      } else if (commonTrifectaHorses.length === 1) {
        return sanrenpuku.probability * (other.probability / 3);
      }
      return sanrenpuku.probability * other.probability * 0.1;
      
    default:
      return 0;
  }
};

// 3連単との組み合わせの同時的中確率
const calculateTrifecta3JointProb = (sanrentan: BetProposal, other: BetProposal): number => {
  const sanrentanHorse1 = sanrentan.horse1; // 1着指定馬
  const sanrentanHorse2 = sanrentan.horse2; // 2着指定馬
  const sanrentanHorse3 = sanrentan.horse3; // 3着指定馬
  
  switch(other.type) {
    case "単勝":
      // 単勝馬が3連単の1着指定馬と同じ場合のみ的中
      return other.horse1 === sanrentanHorse1 ? 
        other.probability * (sanrentan.probability / other.probability) : 0;
      
    case "複勝":
      // 複勝馬が3連単の指定馬に含まれる場合
      const placeHorse = Number(other.horses[0]);
      if (placeHorse === sanrentanHorse1) {
        // 1着指定馬が1着、他2頭が指定順で入る確率
        return other.probability * (sanrentan.probability / other.probability);
      } else if (placeHorse === sanrentanHorse2 || placeHorse === sanrentanHorse3) {
        // 2,3着指定馬が指定順で入る確率
        return sanrentan.probability;
      }
      return 0;
      
    case "枠連":
      // 3連単の1-2着馬の枠を確認
      const frame1 = sanrentan.frame1;
      const frame2 = sanrentan.frame2;
      if ((other.frame1 === frame1 && other.frame2 === frame2) ||
          (other.frame1 === frame2 && other.frame2 === frame1)) {
        // 1-2着の枠が一致する場合
        return sanrentan.probability;
      }
      return sanrentan.probability * other.probability * 0.2;
      
    case "ワイド":
      // 3連単の馬が2頭ワイドに含まれる場合
      const wideHorses = [other.horse1, other.horse2];
      const isInWide = (horse: number) => wideHorses.includes(horse);
      
      if (sanrentanHorse1 && sanrentanHorse2 && sanrentanHorse3 && 
          ((isInWide(sanrentanHorse1) && isInWide(sanrentanHorse2)) ||
           (isInWide(sanrentanHorse1) && isInWide(sanrentanHorse3)) ||
           (isInWide(sanrentanHorse2) && isInWide(sanrentanHorse3)))) {
        // 3連単的中はワイドも的中
        return sanrentan.probability;
      }
      return sanrentan.probability * other.probability * 0.2;
      
    case "馬連":
      // 3連単の1-2着馬が馬連と一致する場合
      if ((other.horse1 === sanrentanHorse1 && other.horse2 === sanrentanHorse2) ||
          (other.horse1 === sanrentanHorse2 && other.horse2 === sanrentanHorse1)) {
        // 3連単的中は馬連も的中
        return sanrentan.probability;
      }
      return sanrentan.probability * other.probability * 0.2;
      
    case "馬単":
      // 3連単の1-2着が馬単と一致する場合
      if (other.horse1 === sanrentanHorse1 && other.horse2 === sanrentanHorse2) {
        // 3連単的中は馬単も的中
        return sanrentan.probability;
      }
      return sanrentan.probability * other.probability * 0.2;
      
    case "３連複":
      // 3連単の3頭が3連複と同じ場合（順序不問）
      const sanrenpukuHorses = [other.horse1, other.horse2, other.horse3];
      if (sanrenpukuHorses.includes(sanrentanHorse1) &&
          sanrenpukuHorses.includes(sanrentanHorse2) &&
          sanrenpukuHorses.includes(sanrentanHorse3)) {
        // 3連単的中は必ず3連複的中
        return sanrentan.probability;
      }
      return sanrentan.probability * other.probability * 0.1;
      
    case "３連単":
      // 完全に同じ3連単の場合
      if (other.horse1 === sanrentanHorse1 &&
          other.horse2 === sanrentanHorse2 &&
          other.horse3 === sanrentanHorse3) {
        return sanrentan.probability;
      }
      // 2頭が同じ着順の場合
      const sameOrderCount = [
        other.horse1 === sanrentanHorse1,
        other.horse2 === sanrentanHorse2,
        other.horse3 === sanrentanHorse3
      ].filter(Boolean).length;
      
      if (sameOrderCount === 2) {
        return sanrentan.probability * (other.probability / 2);
      }
      return sanrentan.probability * other.probability * 0.1;
      
    default:
      return 0;
  }
};

export const optimizeBetAllocation = (
  recommendations: GeminiRecommendation[],
  totalBudget: number
): BetProposal[] => {
  if (process.env.NODE_ENV === 'development') {
    console.group('Sharpe比最大化による資金配分の最適化');
  }
  
  const processedRecs = recommendations.map(rec => ({
    ...rec,
    probability: typeof rec.probability === 'string' 
      ? parseFloat(rec.probability.replace('%', '')) / 100 
      : rec.probability
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

  // 最終結果のログ出力を関数内に移動
  if (process.env.NODE_ENV === 'development') {
    const correlations = calculateCorrelation(proposals);
    console.log('最終結果:', {
      totalBets: proposals.length,
      totalInvestment: proposals.reduce((sum, p) => sum + p.stake, 0),
      bets: proposals.map(p => ({
        type: p.type,
        horses: p.horses,
        horseName: p.horseName,
        stake: p.stake,
        expectedReturn: p.expectedReturn,
        probability: (p.probability * 100).toFixed(1) + '%'
      })),
      correlations
    });
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
    const geminiOptions = {
      horses: horses.map(h => ({
        name: h.name,
        odds: h.odds,
        winProb: h.winProb,
        placeProb: h.placeProb,
        frame: h.frame,
        number: h.number
      })),
      bettingOptions: allBettingOptions.bettingOptions
    };
    
    const geminiResponse = await getGeminiStrategy([], totalBudget, geminiOptions, riskRatio);
    
    // 資金配分の最適化
    return optimizeBetAllocation(geminiResponse.strategy.recommendations, totalBudget);
  } catch (error) {
    console.error('Bet calculation error:', error);
    return [];
  }
};
