import { BetProposal, HorseData } from './betCalculator';

// 2つの馬券が同時に的中する確率を計算
export const calculateJointProbability = (
  bet1: BetProposal, 
  bet2: BetProposal, 
  horses: HorseData[]
): number => {
  if (process.env.NODE_ENV === 'development') {
    console.group('同時確率の計算');
  }
  
  let result = 0;
  
  switch(bet1.type) {
    case "単勝":
      result = calculateWinJointProb(bet1, bet2, horses);
      break;
    case "複勝":
      result = calculatePlaceJointProb(bet1, bet2, horses);
      break;
    case "枠連":
      result = calculateBracketQuinellaJointProb(bet1, bet2, horses);
      break;
    case "ワイド":
      result = calculateWideJointProb(bet1, bet2, horses);
      break;
    case "馬連":
      result = calculateQuinellaJointProb(bet1, bet2, horses);
      break;
    case "馬単":
      result = calculateExactaJointProb(bet1, bet2, horses);
      break;
    case "３連複":
      result = calculateTrio3JointProb(bet1, bet2, horses);
      break;
    case "３連単":
      result = calculateTrifecta3JointProb(bet1, bet2, horses);
      break;
    default:
      return 0;
  }
  
  if (process.env.NODE_ENV === 'development') {
    console.groupEnd();
  }
  
  return result;
};

// 単勝との組み合わせの同時的中確率
const calculateWinJointProb = (win: BetProposal, other: BetProposal, horses: HorseData[]): number => {
    // 単勝馬の情報を取得
    if (!win.horse1) return 0;
    const winNumber = win.horse1;
    
    switch(other.type) {
      case "単勝":
        // 異なる馬の単勝は同時に的中しない
        return other.horse1 === winNumber ? win.probability : 0;
        
      case "複勝":
        if (other.horse1 === winNumber) {
          // 同じ馬の場合：単勝的中は必ず複勝的中
          return win.probability;
        } else {
          // 複勝対象馬の馬番を取得
          const targetHorseNumber = other.horse1;
          if (!targetHorseNumber) return 0;
          
          const placeHorse = horses.find(h => h.number === targetHorseNumber);
          if (!placeHorse) return 0;
          
          // 異なる馬の場合：単勝馬が1着、複勝馬が2-3着の確率
          const secondOrThirdProb = placeHorse.placeProb - placeHorse.winProb;
          return win.probability * secondOrThirdProb;
        }
        
      case "枠連":
        // 必要な情報の確認
        if (!win.frame1 || !other.frame1 || !other.frame2) return 0;
        
        // 単勝馬が枠連の組み合わせに含まれていない場合は0
        if (other.frame1 !== win.frame1 && other.frame2 !== win.frame1) return 0;
        
        // もう一方の枠を特定
        const otherFrame = other.frame1 === win.frame1 ? other.frame2 : other.frame1;
        
        // もう一方の枠の馬たちを取得（単勝馬を除外）
        const otherFrameHorses = horses.filter(h => 
          h.frame === otherFrame && h.number !== winNumber
        );
        
        // もう一方の枠の馬が2着になる確率の合計を計算
        const secondPlaceProb = otherFrameHorses.reduce((sum, horse) => {
          return sum + (horse.placeProb - horse.winProb) / 2;
        }, 0);
        
        return win.probability * secondPlaceProb;
        
      case "ワイド":
        if (!other.horse1 || !other.horse2) return 0;
        
        // 単勝馬がワイドの組み合わせに含まれる場合
        if (other.horse1 === winNumber || other.horse2 === winNumber) {
          // もう一方の馬を特定
          const otherHorseNumber = other.horse1 === winNumber ? other.horse2 : other.horse1;
          const otherHorse = horses.find(h => h.number === otherHorseNumber);
          if (!otherHorse) return 0;

          // 単勝馬が1着、もう一方の馬が2-3着になる確率
          const placeProb = otherHorse.placeProb - otherHorse.winProb;
          return win.probability * placeProb;
        } else {
          // 単勝馬がワイドの組み合わせに含まれない場合
          const horse1 = horses.find(h => h.number === other.horse1);
          const horse2 = horses.find(h => h.number === other.horse2);
          if (!horse1 || !horse2) return 0;
          
          let totalProb = 0;
          
          // W-1-2 のパターン（Wは単勝馬で必ず1着）
          totalProb += win.probability * 
                      ((horse1.placeProb - horse1.winProb) / 2) * 
                      ((horse2.placeProb - horse2.winProb) / 2);
          
          // W-2-1 のパターン
          totalProb += win.probability * 
                      ((horse2.placeProb - horse2.winProb) / 2) * 
                      ((horse1.placeProb - horse1.winProb) / 2);
          
          return totalProb;
        }
        
      case "馬連":
        // 単勝馬が馬連の組み合わせに含まれ、もう一頭が2着の場合に的中
        if (!other.horse1 || !other.horse2) return 0;
        if (other.horse1 !== winNumber && other.horse2 !== winNumber) return 0;

        // もう一方の馬を特定
        const umarenPartnerNumber = other.horse1 === winNumber ? other.horse2 : other.horse1;
        const umarenPartner = horses.find(h => h.number === umarenPartnerNumber);
        if (!umarenPartner) return 0;

        // 単勝馬が1着、もう一方の馬が2着になる確率
        const umarenSecondProb = (umarenPartner.placeProb - umarenPartner.winProb) / 2;  // 2着になる確率
        return win.probability * umarenSecondProb;
        
      case "馬単":
        if (!other.horse1 || !other.horse2) return 0;
        
        if (other.horse1 === winNumber) {
          // 単勝馬が馬単の1着指定と同じ場合
          const secondHorse = horses.find(h => h.number === other.horse2);
          if (!secondHorse) return 0;
          
          // 単勝馬が1着、指定馬が2着になる確率
          const secondPlaceProb = (secondHorse.placeProb - secondHorse.winProb) / 2;
          return win.probability * secondPlaceProb;
        }
        // 単勝馬が馬単の2着指定の場合は的中しない
        return 0;
        
      case "３連複":
        // 単勝馬が3連複の組み合わせに含まれ、他の2頭が2-3着の場合に的中
        if (!other.horse1 || !other.horse2 || !other.horse3) return 0;
        if (other.horse1 !== winNumber && other.horse2 !== winNumber && other.horse3 !== winNumber) return 0;

        // 他の2頭を特定
        const otherHorses = [other.horse1, other.horse2, other.horse3]
          .filter(num => num !== winNumber)
          .map(num => horses.find(h => h.number === num))
          .filter((h): h is HorseData => h !== undefined);

        if (otherHorses.length !== 2) return 0;

        // 他の2頭が2-3着になる確率を計算（2-3着と3-2着の両方を考慮）
        const [horse1, horse2] = otherHorses;
        const secondThirdProb = 
          (horse1.placeProb - horse1.winProb) / 2 * (horse2.placeProb - horse2.winProb) / 2 * 2; // *2で順序を考慮

        return win.probability * secondThirdProb;
        
      case "３連単":
        // 単勝馬が3連単の1着指定と同じ場合のみ的中
        if (!other.horse1 || !other.horse2 || !other.horse3) return 0;
        if (other.horse1 !== winNumber) return 0;

        // 2着馬と3着馬を特定
        const secondHorse = horses.find(h => h.number === other.horse2);
        const thirdHorse = horses.find(h => h.number === other.horse3);
        if (!secondHorse || !thirdHorse) return 0;

        // 2着と3着になる確率を計算
        const secondProb = (secondHorse.placeProb - secondHorse.winProb) / 2;  // 2着確率
        const thirdProb = (thirdHorse.placeProb - thirdHorse.winProb) / 2;    // 3着確率

        return win.probability * secondProb * thirdProb;
        
      default:
        return 0;
    }
  };
  
  // 複勝との組み合わせの同時的中確率
  const calculatePlaceJointProb = (place: BetProposal, other: BetProposal, horses: HorseData[]): number => {
    if (!place.horse1) return 0;
    const placeNumber = place.horse1;
    const placeHorse = horses.find(h => h.number === placeNumber);
    if (!placeHorse) return 0;
    
    switch(other.type) {
      case "単勝":
        return 0; // 単勝との組み合わせはスキップ
        
      case "複勝":
        if (!other.horse1) return 0;
        if (other.horse1 === placeNumber) {
          // 同じ馬の場合は完全に相関
          return place.probability;
        } else {
          const otherHorse = horses.find(h => h.number === other.horse1);
          if (!otherHorse) return 0;
          // 両方の馬が複勝圏内に入る確率
          return placeHorse.placeProb * otherHorse.placeProb;
        }
        
      case "枠連":
        // 必要な情報の確認
        if (!place.frame1 || !other.frame1 || !other.frame2) return 0;
        
        // 各枠の馬を取得し、馬番順にソート
        const frame1Horses = horses.filter(h => h.frame === other.frame1)
          .sort((a, b) => a.number - b.number);
        const frame2Horses = horses.filter(h => h.frame === other.frame2)
          .sort((a, b) => a.number - b.number);
        
        let totalProb = 0;
        
        // 枠連を馬連の組み合わせに分解して計算（重複を避けるため、馬番の小さい方を基準に計算）
        frame1Horses.forEach(horse1 => {
          frame2Horses.forEach(horse2 => {
            // 同じ馬は除外
            if (horse1.number === horse2.number) return;
            // 重複を避けるため、馬番の小さい方が枠1の馬の場合のみ計算
            if (horse1.number > horse2.number) return;
            
            let combinationProb = 0;
            
            if (horse1.number === placeNumber || horse2.number === placeNumber) {
              // ケース1と2: 複勝馬が1-2着
              // 複勝馬が1着のケース
              if (horse1.number === placeNumber) {
                combinationProb += horse1.winProb * ((horse2.placeProb - horse2.winProb) / 2);
              }
              if (horse2.number === placeNumber) {
                combinationProb += horse2.winProb * ((horse1.placeProb - horse1.winProb) / 2);
              }
              
              // 複勝馬が2着のケース
              if (horse1.number === placeNumber) {
                combinationProb += horse2.winProb * ((horse1.placeProb - horse1.winProb) / 2);
              }
              if (horse2.number === placeNumber) {
                combinationProb += horse1.winProb * ((horse2.placeProb - horse2.winProb) / 2);
              }
            } else {
              // ケース3: 複勝馬が3着で、枠連の馬が1-2着
              const thirdPlaceProb = (placeHorse.placeProb - placeHorse.winProb) / 2;
              
              // horse1が1着、horse2が2着のケース
              combinationProb += horse1.winProb * ((horse2.placeProb - horse2.winProb) / 2) * thirdPlaceProb;
              // horse2が1着、horse1が2着のケース
              combinationProb += horse2.winProb * ((horse1.placeProb - horse1.winProb) / 2) * thirdPlaceProb;
            }
            totalProb += combinationProb;
          });
        });
        
        return totalProb;
        
      case "ワイド":
        if (!other.horse1 || !other.horse2) return 0;
        
        if (other.horse1 === placeNumber || other.horse2 === placeNumber) {
          // 複勝馬がワイドの組み合わせに含まれる場合
          const widePartnerNumber = other.horse1 === placeNumber ? other.horse2 : other.horse1;
          const widePartner = horses.find(h => h.number === widePartnerNumber);
          if (!widePartner) return 0;
          
          // 両方の馬が複勝圏内に入る確率
          return placeHorse.placeProb * widePartner.placeProb;
        } else {
          // 複勝馬がワイドの組み合わせに含まれない場合
          const horse1 = horses.find(h => h.number === other.horse1);
          const horse2 = horses.find(h => h.number === other.horse2);
          if (!horse1 || !horse2) return 0;
          
          let totalProb = 0;
          
          // 1-2-P のパターン
          totalProb += horse1.winProb * 
                      ((horse2.placeProb - horse2.winProb) / 2) * 
                      ((placeHorse.placeProb - placeHorse.winProb) / 2);
          
          // 2-1-P のパターン
          totalProb += horse2.winProb * 
                      ((horse1.placeProb - horse1.winProb) / 2) * 
                      ((placeHorse.placeProb - placeHorse.winProb) / 2);
          
          // P-1-2 のパターン
          totalProb += placeHorse.winProb * 
                      ((horse1.placeProb - horse1.winProb) / 2) * 
                      ((horse2.placeProb - horse2.winProb) / 2);
          
          // P-2-1 のパターン
          totalProb += placeHorse.winProb * 
                      ((horse2.placeProb - horse2.winProb) / 2) * 
                      ((horse1.placeProb - horse1.winProb) / 2);
          
          // 1-P-2 のパターン
          totalProb += horse1.winProb * 
                      ((placeHorse.placeProb - placeHorse.winProb) / 2) * 
                      ((horse2.placeProb - horse2.winProb) / 2);
          
          // 2-P-1 のパターン
          totalProb += horse2.winProb * 
                      ((placeHorse.placeProb - placeHorse.winProb) / 2) * 
                      ((horse1.placeProb - horse1.winProb) / 2);
          
          return totalProb;
        }
        
      case "馬連":
        if (!other.horse1 || !other.horse2) return 0;
        
        if (other.horse1 === placeNumber || other.horse2 === placeNumber) {
          // 複勝馬が馬連の組み合わせに含まれる場合
          const umarenPartnerNumber = other.horse1 === placeNumber ? other.horse2 : other.horse1;
          const umarenPartner = horses.find(h => h.number === umarenPartnerNumber);
          if (!umarenPartner) return 0;
          
          // 複勝馬が1着、相手が2着のケース
          const prob1 = placeHorse.winProb * ((umarenPartner.placeProb - umarenPartner.winProb) / 2);
          // 相手が1着、複勝馬が2着のケース
          const prob2 = umarenPartner.winProb * ((placeHorse.placeProb - placeHorse.winProb) / 2);
          
          return prob1 + prob2;
        } else {
          // 複勝馬が馬連の組み合わせに含まれない場合
          const horse1 = horses.find(h => h.number === other.horse1);
          const horse2 = horses.find(h => h.number === other.horse2);
          if (!horse1 || !horse2) return 0;
          
          // 馬連の2頭が1-2着、複勝馬が3着のケース
          const thirdPlaceProb = (placeHorse.placeProb - placeHorse.winProb) / 2;
          
          // horse1が1着、horse2が2着のケース
          const prob1 = horse1.winProb * ((horse2.placeProb - horse2.winProb) / 2) * thirdPlaceProb;
          // horse2が1着、horse1が2着のケース
          const prob2 = horse2.winProb * ((horse1.placeProb - horse1.winProb) / 2) * thirdPlaceProb;
          
          return prob1 + prob2;
        }
        
      case "馬単":
        if (!other.horse1 || !other.horse2) return 0;
        
        if (other.horse1 === placeNumber) {
          // 複勝対象馬が1着指定の場合
          const secondHorse = horses.find(h => h.number === other.horse2);
          if (!secondHorse) return 0;
          
          // 複勝馬が1着、指定馬が2着のケース
          return placeHorse.winProb * ((secondHorse.placeProb - secondHorse.winProb) / 2);
        } else if (other.horse2 === placeNumber) {
          // 複勝対象馬が2着指定の場合
          const firstHorse = horses.find(h => h.number === other.horse1);
          if (!firstHorse) return 0;
          
          // 指定馬が1着、複勝馬が2着のケース
          return firstHorse.winProb * ((placeHorse.placeProb - placeHorse.winProb) / 2);
        } else {
          // 複勝馬が馬単の組み合わせに含まれない場合
          const firstHorse = horses.find(h => h.number === other.horse1);
          const secondHorse = horses.find(h => h.number === other.horse2);
          if (!firstHorse || !secondHorse) return 0;
          
          // 馬単の2頭が1-2着、複勝馬が3着のケース
          const thirdPlaceProb = (placeHorse.placeProb - placeHorse.winProb) / 2;
          return firstHorse.winProb * ((secondHorse.placeProb - secondHorse.winProb) / 2) * thirdPlaceProb;
        }
        
      case "３連複":
        if (!other.horse1 || !other.horse2 || !other.horse3) return 0;
        
        // 複勝馬が3連複の組み合わせに含まれているかチェック
        if (other.horse1 === placeNumber || other.horse2 === placeNumber || other.horse3 === placeNumber) {
          // 複勝馬が含まれている場合は3連複の的中確率をそのまま返す
          return other.probability;
        }
        
        // 複勝馬が3連複の組み合わせに含まれない場合は0
        return 0;
        
      case "３連単":
        if (!other.horse1 || !other.horse2 || !other.horse3) return 0;
        
        // 複勝馬が3連単の組み合わせに含まれているかチェック
        if (other.horse1 === placeNumber || other.horse2 === placeNumber || other.horse3 === placeNumber) {
          // 複勝馬が含まれている場合は3連単の的中確率をそのまま返す
          return other.probability;
        }
        
        // 複勝馬が3連単の組み合わせに含まれない場合は0
        return 0;
        
      default:
        return 0;
    }
  };
  
  // 枠連との組み合わせの同時的中確率
  const calculateBracketQuinellaJointProb = (wakuren: BetProposal, other: BetProposal, horses: HorseData[]): number => {
    const frame1 = wakuren.frame1;
    const frame2 = wakuren.frame2;
    
    if (frame1 === undefined || frame2 === undefined) return 0;
    
    switch(other.type) {
      case "単勝":
        return 0;
        
      case "複勝":
        return 0;
        
      case "枠連":
        // 同じ枠連の場合（順序は関係ない）
        if ((frame1 === other.frame1 && frame2 === other.frame2) ||
            (frame1 === other.frame2 && frame2 === other.frame1)) {
          return wakuren.probability;
        }
        return 0;
        
      case "ワイド":
        if (!other.horse1 || !other.horse2 || !frame1 || !frame2) return 0;
        
        const horse1 = horses.find(h => h.number === other.horse1);
        const horse2 = horses.find(h => h.number === other.horse2);
        if (!horse1 || !horse2) return 0;

        // 各枠の馬を取得し、馬番順にソート
        const frame1Horses = horses.filter(h => h.frame === frame1)
          .sort((a, b) => a.number - b.number);
        const frame2Horses = horses.filter(h => h.frame === frame2)
          .sort((a, b) => a.number - b.number);
        
        let totalProb = 0;
        
        // 枠連を馬連の組み合わせに分解して計算（重複を避けるため、馬番の小さい方を基準に計算）
        frame1Horses.forEach(f1horse => {
          frame2Horses.forEach(f2horse => {
            // 同じ馬は除外
            if (f1horse.number === f2horse.number) return;
            // 重複を避けるため、馬番の小さい方が枠1の馬の場合のみ計算
            if (f1horse.number > f2horse.number) return;
            
            // ワイドの馬との関係を確認
            const isWideHorse1 = f1horse.number === horse1.number || f2horse.number === horse1.number;
            const isWideHorse2 = f1horse.number === horse2.number || f2horse.number === horse2.number;
            
            if (isWideHorse1 || isWideHorse2) {
              let combinationProb = 0;

              if (isWideHorse1 && isWideHorse2) {
                // 両方ワイドの馬の場合
                combinationProb += f1horse.winProb * ((f2horse.placeProb - f2horse.winProb) / 2);
                combinationProb += f2horse.winProb * ((f1horse.placeProb - f1horse.winProb) / 2);
              } else {
                // 片方だけワイドの馬の場合
                const wideHorse = isWideHorse1 ? horse1 : horse2;
                const otherWideHorse = isWideHorse1 ? horse2 : horse1;
                const frameHorse = f1horse.number === wideHorse.number ? f1horse : f2horse;
                const otherFrameHorse = f1horse.number === wideHorse.number ? f2horse : f1horse;

                combinationProb += frameHorse.winProb * ((otherFrameHorse.placeProb - otherFrameHorse.winProb) / 2) * 
                                 ((otherWideHorse.placeProb - otherWideHorse.winProb) / 2);
                combinationProb += otherFrameHorse.winProb * ((frameHorse.placeProb - frameHorse.winProb) / 2) * 
                                 ((otherWideHorse.placeProb - otherWideHorse.winProb) / 2);
              }
              totalProb += combinationProb;
            }
          });
        });
        
        return totalProb;
        
      case "馬連":
        if (!other.horse1 || !other.horse2) return 0;
        
        const umaren1 = horses.find(h => h.number === other.horse1);
        const umaren2 = horses.find(h => h.number === other.horse2);
        if (!umaren1 || !umaren2) return 0;
        
        // 馬連の両馬の枠が枠連の組み合わせと一致する場合のみ的中
        if ((umaren1.frame === frame1 && umaren2.frame === frame2) ||
            (umaren1.frame === frame2 && umaren2.frame === frame1)) {
          return other.probability;
        }
        return 0;
        
      case "馬単":
        if (!other.horse1 || !other.horse2) return 0;
        
        const umatan1 = horses.find(h => h.number === other.horse1);
        const umatan2 = horses.find(h => h.number === other.horse2);
        if (!umatan1 || !umatan2) return 0;
        
        // 馬単の1-2着馬の枠が枠連の組み合わせと一致する場合のみ的中
        if ((umatan1.frame === frame1 && umatan2.frame === frame2) ||
            (umatan1.frame === frame2 && umatan2.frame === frame1)) {
          return other.probability;
        }
        return 0;
        
      case "３連複":
        if (!other.horse1 || !other.horse2 || !other.horse3) return 0;
        
        const sanrenpuku1 = horses.find(h => h.number === other.horse1);
        const sanrenpuku2 = horses.find(h => h.number === other.horse2);
        const sanrenpuku3 = horses.find(h => h.number === other.horse3);
        if (!sanrenpuku1 || !sanrenpuku2 || !sanrenpuku3) return 0;
        
        let sanrenpukuProb = 0;
        
        // 3連複の6通りの着順パターンそれぞれについて計算
        // 1-2-3のパターン
        if ((sanrenpuku1.frame === frame1 && sanrenpuku2.frame === frame2) ||
            (sanrenpuku1.frame === frame2 && sanrenpuku2.frame === frame1)) {
            sanrenpukuProb += sanrenpuku1.winProb * 
                        ((sanrenpuku2.placeProb - sanrenpuku2.winProb) / 2) * 
                        ((sanrenpuku3.placeProb - sanrenpuku3.winProb) / 2);
        }
        
        // 1-3-2のパターン
        if ((sanrenpuku1.frame === frame1 && sanrenpuku3.frame === frame2) ||
            (sanrenpuku1.frame === frame2 && sanrenpuku3.frame === frame1)) {
            sanrenpukuProb += sanrenpuku1.winProb * 
                        ((sanrenpuku3.placeProb - sanrenpuku3.winProb) / 2) * 
                        ((sanrenpuku2.placeProb - sanrenpuku2.winProb) / 2);
        }
        
        // 2-1-3のパターン
        if ((sanrenpuku2.frame === frame1 && sanrenpuku1.frame === frame2) ||
            (sanrenpuku2.frame === frame2 && sanrenpuku1.frame === frame1)) {
            sanrenpukuProb += sanrenpuku2.winProb * 
                        ((sanrenpuku1.placeProb - sanrenpuku1.winProb) / 2) * 
                        ((sanrenpuku3.placeProb - sanrenpuku3.winProb) / 2);
        }
        
        // 2-3-1のパターン
        if ((sanrenpuku2.frame === frame1 && sanrenpuku3.frame === frame2) ||
            (sanrenpuku2.frame === frame2 && sanrenpuku3.frame === frame1)) {
            sanrenpukuProb += sanrenpuku2.winProb * 
                        ((sanrenpuku3.placeProb - sanrenpuku3.winProb) / 2) * 
                        ((sanrenpuku1.placeProb - sanrenpuku1.winProb) / 2);
        }
        
        // 3-1-2のパターン
        if ((sanrenpuku3.frame === frame1 && sanrenpuku1.frame === frame2) ||
            (sanrenpuku3.frame === frame2 && sanrenpuku1.frame === frame1)) {
            sanrenpukuProb += sanrenpuku3.winProb * 
                        ((sanrenpuku1.placeProb - sanrenpuku1.winProb) / 2) * 
                        ((sanrenpuku2.placeProb - sanrenpuku2.winProb) / 2);
        }
        
        // 3-2-1のパターン
        if ((sanrenpuku3.frame === frame1 && sanrenpuku2.frame === frame2) ||
            (sanrenpuku3.frame === frame2 && sanrenpuku2.frame === frame1)) {
            sanrenpukuProb += sanrenpuku3.winProb * 
                        ((sanrenpuku2.placeProb - sanrenpuku2.winProb) / 2) * 
                        ((sanrenpuku1.placeProb - sanrenpuku1.winProb) / 2);
        }
        
        return sanrenpukuProb;
        
      case "３連単":
        if (!other.horse1 || !other.horse2 || !other.horse3) return 0;
        
        const sanrentan1 = horses.find(h => h.number === other.horse1);
        const sanrentan2 = horses.find(h => h.number === other.horse2);
        if (!sanrentan1 || !sanrentan2) return 0;
        
        // 3連単の1-2着馬の枠が枠連の組み合わせと一致する場合のみ的中
        if ((sanrentan1.frame === frame1 && sanrentan2.frame === frame2) ||
            (sanrentan1.frame === frame2 && sanrentan2.frame === frame1)) {
          return other.probability;
        }
        return 0;
        
      default:
        return 0;
    }
  };
  
  // ワイドとの組み合わせの同時的中確率
  const calculateWideJointProb = (wide: BetProposal, other: BetProposal, horses: HorseData[]): number => {
    const wideHorse1 = wide.horse1;
    const wideHorse2 = wide.horse2;
    
    switch(other.type) {
      case "単勝":
        return 0;
        
      case "複勝":
        return 0;
        
      case "枠連":
        return 0;
        
      case "ワイド":
        if (!other.horse1 || !other.horse2) return 0;
        
        const horse1 = horses.find(h => h.number === other.horse1);
        const horse2 = horses.find(h => h.number === other.horse2);
        if (!horse1 || !horse2) return 0;

        // 同じワイドの場合
        if ((wideHorse1 === other.horse1 && wideHorse2 === other.horse2) ||
            (wideHorse1 === other.horse2 && wideHorse2 === other.horse1)) {
          return horse1.winProb * ((horse2.placeProb - horse2.winProb) / 2) +
                 horse2.winProb * ((horse1.placeProb - horse1.winProb) / 2);
        }

        // 1頭が共通する場合
        if (wideHorse1 === other.horse1 || wideHorse1 === other.horse2 ||
            wideHorse2 === other.horse1 || wideHorse2 === other.horse2) {
          const commonHorse = horses.find(h => h.number === 
            (wideHorse1 === other.horse1 || wideHorse1 === other.horse2 ? wideHorse1 : wideHorse2));
          const otherWideHorse = horses.find(h => h.number === 
            (wideHorse1 === other.horse1 || wideHorse1 === other.horse2 ? wideHorse2 : wideHorse1));
          const otherOtherHorse = horses.find(h => h.number === 
            (other.horse1 === commonHorse?.number ? other.horse2 : other.horse1));
          
          if (!commonHorse || !otherWideHorse || !otherOtherHorse) return 0;

          // 計算結果を2倍する
          return 2 * (
            commonHorse.winProb * 
            ((otherWideHorse.placeProb - otherWideHorse.winProb) / 2) * 
            ((otherOtherHorse.placeProb - otherOtherHorse.winProb) / 2) +
            otherWideHorse.winProb * 
            ((commonHorse.placeProb - commonHorse.winProb) / 2) * 
            ((otherOtherHorse.placeProb - otherOtherHorse.winProb) / 2) +
            otherOtherHorse.winProb * 
            ((commonHorse.placeProb - commonHorse.winProb) / 2) * 
            ((otherWideHorse.placeProb - otherWideHorse.winProb) / 2)
          );
        }

        // 共通する馬がない場合
        return 0;

      case "馬連":
        if (!other.horse1 || !other.horse2) return 0;
        
        const umaren1 = horses.find(h => h.number === other.horse1);
        const umaren2 = horses.find(h => h.number === other.horse2);
        if (!umaren1 || !umaren2) return 0;

        // ワイドと馬連の馬が完全に一致する場合
        if ((wideHorse1 === other.horse1 && wideHorse2 === other.horse2) ||
            (wideHorse1 === other.horse2 && wideHorse2 === other.horse1)) {
          // 馬連的中は必ずワイド的中
          return other.probability;
        }

        // 1頭が共通する場合
        if (wideHorse1 === other.horse1 || wideHorse1 === other.horse2 ||
            wideHorse2 === other.horse1 || wideHorse2 === other.horse2) {
          const commonHorse = horses.find(h => h.number === 
            (wideHorse1 === other.horse1 || wideHorse1 === other.horse2 ? wideHorse1 : wideHorse2));
          const otherWideHorse = horses.find(h => h.number === 
            (wideHorse1 === other.horse1 || wideHorse1 === other.horse2 ? wideHorse2 : wideHorse1));
          const otherUmarenHorse = horses.find(h => h.number === 
            (other.horse1 === commonHorse?.number ? other.horse2 : other.horse1));
          
          if (!commonHorse || !otherWideHorse || !otherUmarenHorse) return 0;

          // 共通馬が1着、他馬が2-3着のパターン
          const prob1 = commonHorse.winProb * 
                       ((otherUmarenHorse.placeProb - otherUmarenHorse.winProb) / 2) * 
                       ((otherWideHorse.placeProb - otherWideHorse.winProb) / 2);

          // 共通馬が2着、馬連の相手が1着のパターン
          const prob2 = otherUmarenHorse.winProb * 
                       ((commonHorse.placeProb - commonHorse.winProb) / 2) * 
                       ((otherWideHorse.placeProb - otherWideHorse.winProb) / 2);

          return prob1 + prob2;
        }

        // 共通する馬がない場合
        return 0;
        
      case "馬単":
        if (!other.horse1 || !other.horse2) return 0;
        
        const umatan1 = horses.find(h => h.number === other.horse1);
        const umatan2 = horses.find(h => h.number === other.horse2);
        if (!umatan1 || !umatan2) return 0;

        // ワイドと馬単の馬が一致する場合
        if ((wideHorse1 === other.horse1 && wideHorse2 === other.horse2) ||
            (wideHorse1 === other.horse2 && wideHorse2 === other.horse1)) {
          // 馬単的中は必ずワイド的中
          return other.probability;
        }

        // 1頭が共通する場合
        if (wideHorse1 === other.horse1 || wideHorse1 === other.horse2 ||
            wideHorse2 === other.horse1 || wideHorse2 === other.horse2) {
          const commonHorse = horses.find(h => h.number === 
            (wideHorse1 === other.horse1 || wideHorse1 === other.horse2 ? wideHorse1 : wideHorse2));
          const otherWideHorse = horses.find(h => h.number === 
            (wideHorse1 === other.horse1 || wideHorse1 === other.horse2 ? wideHorse2 : wideHorse1));
          const otherUmatanHorse = horses.find(h => h.number === 
            (other.horse1 === commonHorse?.number ? other.horse2 : other.horse1));
          
          if (!commonHorse || !otherWideHorse || !otherUmatanHorse) return 0;

          if (commonHorse.number === other.horse1) {
            // 共通馬が1着指定の場合
            return commonHorse.winProb * 
                   ((otherUmatanHorse.placeProb - otherUmatanHorse.winProb) / 2) * 
                   ((otherWideHorse.placeProb - otherWideHorse.winProb) / 2);
          } else {
            // 共通馬が2着指定の場合
            return otherUmatanHorse.winProb * 
                   ((commonHorse.placeProb - commonHorse.winProb) / 2) * 
                   ((otherWideHorse.placeProb - otherWideHorse.winProb) / 2);
          }
        }

        // 共通する馬がない場合
        return 0;
        
      case "３連複":
        if (!other.horse1 || !other.horse2 || !other.horse3) return 0;
        
        const sanrenpuku1 = horses.find(h => h.number === other.horse1);
        const sanrenpuku2 = horses.find(h => h.number === other.horse2);
        const sanrenpuku3 = horses.find(h => h.number === other.horse3);
        if (!sanrenpuku1 || !sanrenpuku2 || !sanrenpuku3) return 0;

        // ワイドの両馬が3連複に含まれる場合
        const sanrenpukuHorses = [other.horse1, other.horse2, other.horse3];
        if (wideHorse1 && wideHorse2 && sanrenpukuHorses.includes(wideHorse1) && sanrenpukuHorses.includes(wideHorse2)) {
          // 3連複的中時にワイドも必ず的中
          return other.probability;
        }

        // 共通する馬がない場合、または1頭のみの場合
        return 0;
        
      case "３連単":
        if (!other.horse1 || !other.horse2 || !other.horse3) return 0;
        
        const sanrentan1 = horses.find(h => h.number === other.horse1);
        const sanrentan2 = horses.find(h => h.number === other.horse2);
        const sanrentan3 = horses.find(h => h.number === other.horse3);
        if (!sanrentan1 || !sanrentan2 || !sanrentan3) return 0;

        // ワイドの両馬が3連単に含まれる場合
        const sanrentanHorses = [other.horse1, other.horse2, other.horse3];
        if (wideHorse1 && wideHorse2 && sanrentanHorses.includes(wideHorse1) && sanrentanHorses.includes(wideHorse2)) {
            // 3連単的中時にワイドも必ず的中
            return other.probability;
        }

        // 共通する馬がない場合
        return 0;
        
      default:
        return 0;
    }
  };
  
  // 馬連との組み合わせの同時的中確率
  const calculateQuinellaJointProb = (umaren: BetProposal, other: BetProposal, horses: HorseData[]): number => {
    const umarenHorse1 = umaren.horse1;
    const umarenHorse2 = umaren.horse2;
    
    if (!umarenHorse1 || !umarenHorse2) return 0;
    
    switch(other.type) {
      case "単勝":
        return 0;
        
      case "複勝":
        return 0;
        
      case "枠連":
        return 0;
        
      case "ワイド":
        return 0;
        
      case "馬連":
        return 0;
        
      case "馬単":
        if (!other.horse1 || !other.horse2) return 0;
        
        // 馬連と馬単の馬が一致する場合
        if ((umarenHorse1 === other.horse1 && umarenHorse2 === other.horse2) ||
            (umarenHorse1 === other.horse2 && umarenHorse2 === other.horse1)) {
          // 馬単的中は必ず馬連的中
          return other.probability;
        }

        // それ以外の場合は同時的中なし
        return 0;
        
      case "３連複":
        if (!other.horse1 || !other.horse2 || !other.horse3) return 0;
        
        const sanrenpuku1 = horses.find(h => h.number === other.horse1);
        const sanrenpuku2 = horses.find(h => h.number === other.horse2);
        const sanrenpuku3 = horses.find(h => h.number === other.horse3);
        if (!sanrenpuku1 || !sanrenpuku2 || !sanrenpuku3) return 0;

        // 馬連の両馬が3連複に含まれる場合のみ計算
        if ([sanrenpuku1.number, sanrenpuku2.number, sanrenpuku3.number].includes(umarenHorse1) &&
            [sanrenpuku1.number, sanrenpuku2.number, sanrenpuku3.number].includes(umarenHorse2)) {
            
            let jointProb = 0;
            const horse1 = horses.find(h => h.number === umarenHorse1);
            const horse2 = horses.find(h => h.number === umarenHorse2);
            const horse3 = horses.find(h => h.number === 
                [other.horse1, other.horse2, other.horse3].find(h => h !== umarenHorse1 && h !== umarenHorse2));
            if (!horse1 || !horse2 || !horse3) return 0;

            // 1着-2着-3着のパターン
            jointProb += horse1.winProb * 
                         ((horse2.placeProb - horse2.winProb) / 2) * 
                         ((horse3.placeProb - horse3.winProb) / 2);
            
            // 2着-1着-3着のパターン
            jointProb += horse2.winProb * 
                         ((horse1.placeProb - horse1.winProb) / 2) * 
                         ((horse3.placeProb - horse3.winProb) / 2);

            return jointProb;
        }

        return 0;
        
      case "３連単":
        if (!other.horse1 || !other.horse2 || !other.horse3) return 0;
        if (!umarenHorse1 || !umarenHorse2) return 0;
        
        // 馬連の両馬が3連単の1-2着に指定されている場合
        if ((other.horse1 === umarenHorse1 && other.horse2 === umarenHorse2) ||
            (other.horse1 === umarenHorse2 && other.horse2 === umarenHorse1)) {
            // 3連単の確率をそのまま返す
            return other.probability;
        }
        
        return 0;
        
      default:
        return 0;
    }
  };
  
  // 馬単との組み合わせの同時的中確率
  const calculateExactaJointProb = (umatan: BetProposal, other: BetProposal, horses: HorseData[]): number => {
    const umatanHorse1 = umatan.horse1; // 1着指定馬
    const umatanHorse2 = umatan.horse2; // 2着指定馬
    
    switch(other.type) {
      case "単勝":
        return 0;
      case "複勝":
        return 0;
      case "枠連":
        return 0;
      case "ワイド":
        return 0;
      case "馬連":
        return 0;
      case "馬単":
        return 0;
      
      case "３連複":
        if (!other.horse1 || !other.horse2 || !other.horse3) return 0;
        if (!umatanHorse1 || !umatanHorse2) return 0;
        
        // 馬単の両馬が3連複に含まれる場合のみ計算
        if ([other.horse1, other.horse2, other.horse3].includes(umatanHorse1) &&
            [other.horse1, other.horse2, other.horse3].includes(umatanHorse2)) {
            
            let jointProb = 0;
            const horse1 = horses.find(h => h.number === umatanHorse1);
            const horse2 = horses.find(h => h.number === umatanHorse2);
            const horse3 = horses.find(h => h.number === 
                [other.horse1, other.horse2, other.horse3].find(h => h !== umatanHorse1 && h !== umatanHorse2));
            if (!horse1 || !horse2 || !horse3) return 0;
        
            // 1着-2着-3着のパターン（馬単の順序通り）
            jointProb += horse1.winProb * 
                            ((horse2.placeProb - horse2.winProb) / 2) * 
                            ((horse3.placeProb - horse3.winProb) / 2);
        
            return jointProb;
        }
        
        return 0;
      
      case "３連単":
        if (!other.horse1 || !other.horse2 || !other.horse3) return 0;
        if (!umatanHorse1 || !umatanHorse2) return 0;

        // 馬単の両馬が3連単の1-2着と一致する場合
        if (umatanHorse1 === other.horse1 && umatanHorse2 === other.horse2) {
          // 3連単の確率をそのまま返す
          return other.probability;
        }
        return 0;
      
      default:
        return 0;
    }
  };
  
  // 3連複との組み合わせの同時的中確率
  const calculateTrio3JointProb = (sanrenpuku: BetProposal, other: BetProposal, horses: HorseData[]): number => {
    const sanrenpukuHorses = [sanrenpuku.horse1, sanrenpuku.horse2, sanrenpuku.horse3];
    
    switch(other.type) {
      case "単勝":
        return 0;
      case "複勝":
        return 0;
      case "枠連":
        return 0;
      case "ワイド":
        return 0;
      case "馬連":
        return 0;
      case "馬単":
        return 0;
      case "３連複":
        return 0;
      
      case "３連単":
        if (!other.horse1 || !other.horse2 || !other.horse3) return 0;
        
        // 3連単の3頭が3連複と同じ馬の場合
        if (sanrenpukuHorses.every(h => 
          [other.horse1, other.horse2, other.horse3].includes(h))) {
          // 3連単的中は必ず3連複的中
          return other.probability;
        }
        return 0;
      
      default:
        return 0;
    }
  };
  
  // 3連単との組み合わせの同時的中確率
  const calculateTrifecta3JointProb = (sanrentan: BetProposal, other: BetProposal, horses: HorseData[]): number => {
    
    switch(other.type) {
      case "単勝":
        return 0;
      case "複勝":
        return 0;
      case "枠連":
        return 0;
      case "ワイド":
        return 0;
      case "馬連":
        return 0;
      case "馬単":
        return 0;
      case "３連複":
        return 0;
      case "３連単":
        return 0;
      default:
        return 0;
    }
  };