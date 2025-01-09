export interface BetProposal {
  type: "単勝" | "複勝";
  horses: string[];
  stake: number;
  expectedReturn: number;
  probability: number;
}

export interface HorseData {
  horseName: string;
  tanOdds: number;
  fukuOdds: number;
  winProbs: { [key: number]: number };  // 馬IDをキーとした単勝確率
  placeProbs: { [key: number]: number }; // 馬IDをキーとした複勝確率
}

interface BettingOption {
  type: "単勝" | "複勝";
  horseName: string;
  odds: number;
  prob: number;
  ev: number;
}

export const calculateBetProposals = (
  horses: { 
    name: string;
    odds: number;
    winProb: number;
    placeProb: number;
  }[],
  totalBudget: number,
  riskRatio: number
): BetProposal[] => {
  const MIN_STAKE = 100;
  const MIN_EV = 1;

  console.group('馬券購入戦略の計算過程');
  
  // 全ての馬の期待値を計算
  const allOptions: BettingOption[] = [];
  
  horses.forEach(horse => {
    // 単勝の分析
    const winEV = horse.winProb * horse.odds;
    if (winEV > MIN_EV) {
      allOptions.push({
        type: "単勝",
        horseName: horse.name,
        odds: horse.odds,
        prob: horse.winProb,
        ev: winEV
      });
    }

    // 複勝の分析
    const placeOdds = horse.odds * 0.4; // 複勝オッズの概算
    const placeEV = horse.placeProb * placeOdds;
    if (placeEV > MIN_EV) {
      allOptions.push({
        type: "複勝",
        horseName: horse.name,
        odds: placeOdds,
        prob: horse.placeProb,
        ev: placeEV
      });
    }
  });

  // 期待値の高い順にソート
  allOptions.sort((a, b) => b.ev - a.ev);

  console.log('有効な馬券候補:', allOptions.map(opt => ({
    馬名: opt.horseName,
    種類: opt.type,
    期待値: opt.ev,
    確率: opt.prob,
    オッズ: opt.odds
  })));

  // 期待値超過分の合計を計算
  const totalExcessEV = allOptions.reduce((sum, opt) => sum + (opt.ev - MIN_EV), 0);
  console.log('期待値超過分の合計:', totalExcessEV);

  const proposals: BetProposal[] = [];
  let remainingBudget = totalBudget;

  // 期待値の高い順に予算を配分
  allOptions.forEach(option => {
    if (remainingBudget < MIN_STAKE) return;

    const ratio = (option.ev - MIN_EV) / totalExcessEV;
    let stake = Math.floor((totalBudget * ratio) / 100) * 100;
    stake = Math.max(MIN_STAKE, Math.min(stake, remainingBudget));

    console.log('馬券配分計算:', {
      馬名: option.horseName,
      種類: option.type,
      '期待値': option.ev,
      '配分比率': ratio,
      '計算された投資額': stake,
      '残予算': remainingBudget
    });

    if (stake >= MIN_STAKE) {
      remainingBudget -= stake;
      proposals.push({
        type: option.type,
        horses: [option.horseName],
        stake,
        expectedReturn: Math.floor(stake * option.odds),
        probability: option.prob
      });
    }
  });

  console.log('最終提案:', proposals.map(p => ({
    種類: p.type,
    馬名: p.horses[0],
    投資額: p.stake,
    期待払戻金: p.expectedReturn,
    的中確率: p.probability
  })));

  console.groupEnd();
  return proposals;
}; 