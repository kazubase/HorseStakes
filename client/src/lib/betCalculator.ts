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
  horseName: string;
  tanOdds: number;
  fukuOdds: number;
  winProbs: { [key: number]: number };  // 馬IDをキーとした単勝確率
  placeProbs: { [key: number]: number }; // 馬IDをキーとした複勝確率
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
  
  console.group('馬券購入戦略の計算過程');
  
  const allOptions: BettingOption[] = [];
  
  horses.forEach(horse => {
    // 単勝の期待値を計算
    const winEV = horse.winProb * horse.odds;
    if (winEV > 1.0) {  // 期待値が1.0を超える場合のみ選択
      allOptions.push({
        type: "単勝",
        horseName: horse.name,
        odds: horse.odds,
        prob: horse.winProb,
        ev: winEV
      });
    }

    // 複勝の期待値を計算
    const placeOdds = horse.odds * 0.4;
    const placeEV = horse.placeProb * placeOdds;
    if (placeEV > 1.0) {  // 期待値が1.0を超える場合のみ選択
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

  // 予算配分（期待値の高い馬券により多く配分）
  const totalEV = allOptions.reduce((sum, opt) => sum + opt.ev, 0);
  
  const proposals: BetProposal[] = [];
  let remainingBudget = totalBudget;

  allOptions.forEach(option => {
    if (remainingBudget < MIN_STAKE) return;

    // 期待値の比率で予算を配分
    const ratio = option.ev / totalEV;
    let stake = Math.floor((totalBudget * ratio) / 100) * 100;
    stake = Math.max(MIN_STAKE, Math.min(stake, remainingBudget));

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

  console.groupEnd();
  return proposals;
};