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
        // 単勝馬がワイドの組み合わせに含まれる場合のみ的中
        if (!other.horse1 || !other.horse2) return 0;
        if (other.horse1 !== winNumber && other.horse2 !== winNumber) return 0;

        // もう一方の馬を特定
        const otherHorseNumber = other.horse1 === winNumber ? other.horse2 : other.horse1;
        const otherHorse = horses.find(h => h.number === otherHorseNumber);
        if (!otherHorse) return 0;

        // 単勝馬が1着、もう一方の馬が2-3着になる確率
        // 単勝馬が1着の場合、もう一方の馬は2着か3着になれば良い
        const placeProb = otherHorse.placeProb - otherHorse.winProb;
        return win.probability * placeProb;
        
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
        
        // 複勝馬の枠が枠連の組み合わせに含まれていない場合は0
        if (other.frame1 !== place.frame1 && other.frame2 !== place.frame1) return 0;
        
        // もう一方の枠を特定
        const otherFrame = other.frame1 === place.frame1 ? other.frame2 : other.frame1;
        
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
            
            // ケース1と2: 複勝馬が1-2着
            if (horse1.number === placeNumber || horse2.number === placeNumber) {
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
            }
            
            // ケース3: 複勝馬が3着
            if (horse1.number === placeNumber || horse2.number === placeNumber) {
              const thirdPlaceProb = (placeHorse.placeProb - placeHorse.winProb) / 2;
              const otherHorse = horse1.number === placeNumber ? horse2 : horse1;
              
              // 残りの馬を取得する際に、枠連の的中条件を考慮
              const remainingHorses = horses.filter(h => {
                // 枠連が同じ枠の組み合わせの場合（例：5-5, 6-6など）
                if (other.frame1 === other.frame2) {
                  return h.frame === other.frame1 && 
                         h.number !== placeNumber && 
                         h.number !== otherHorse.number;
                }
                // 枠連が異なる枠の組み合わせの場合（例：5-6, 1-2など）
                else {
                  const targetFrame = otherHorse.frame === other.frame1 ? other.frame2 : other.frame1;
                  return h.frame === targetFrame && h.number !== placeNumber;
                }
              }).sort((a, b) => a.number - b.number);
              
              remainingHorses.forEach(remainingHorse => {
                // otherHorseが1着、remainingHorseが2着のケース
                const prob1 = otherHorse.winProb * ((remainingHorse.placeProb - remainingHorse.winProb) / 2) * thirdPlaceProb;
                combinationProb += prob1;

                // remainingHorseが1着、otherHorseが2着のケース
                const prob2 = remainingHorse.winProb * ((otherHorse.placeProb - otherHorse.winProb) / 2) * thirdPlaceProb;
                combinationProb += prob2;
              });
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
        if (other.horse1 !== placeNumber && other.horse2 !== placeNumber && other.horse3 !== placeNumber) return 0;

        // 他の2頭を特定
        const otherHorses = [other.horse1, other.horse2, other.horse3]
            .filter(num => num !== placeNumber)
            .map(num => horses.find(h => h.number === num))
            .filter((h): h is HorseData => h !== undefined);

        if (otherHorses.length !== 2) return 0;

        // 3頭が3着以内に入る確率
        return placeHorse.placeProb * otherHorses[0].placeProb * otherHorses[1].placeProb;
        
      case "３連単":
        if (!other.horse1 || !other.horse2 || !other.horse3) return 0;
        
        if (other.horse1 === placeNumber) {
            // 複勝対象馬が1着指定の場合
            const secondHorse = horses.find(h => h.number === other.horse2);
            const thirdHorse = horses.find(h => h.number === other.horse3);
            if (!secondHorse || !thirdHorse) return 0;
            return placeHorse.winProb * secondHorse.placeProb / 2 * thirdHorse.placeProb / 2;
        } else if (other.horse2 === placeNumber || other.horse3 === placeNumber) {
            // 複勝対象馬が2着か3着指定の場合
            const firstHorse = horses.find(h => h.number === other.horse1);
            if (!firstHorse) return 0;
            return firstHorse.winProb * placeHorse.placeProb / 2;
        }
        return 0;
        
      default:
        return 0;
    }
  };
  
  // 枠連との組み合わせの同時的中確率
  const calculateBracketQuinellaJointProb = (wakuren: BetProposal, other: BetProposal, horses: HorseData[]): number => {
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
  const calculateWideJointProb = (wide: BetProposal, other: BetProposal, horses: HorseData[]): number => {
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
  const calculateQuinellaJointProb = (umaren: BetProposal, other: BetProposal, horses: HorseData[]): number => {
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
  const calculateExactaJointProb = (umatan: BetProposal, other: BetProposal, horses: HorseData[]): number => {
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
  const calculateTrio3JointProb = (sanrenpuku: BetProposal, other: BetProposal, horses: HorseData[]): number => {
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
  const calculateTrifecta3JointProb = (sanrentan: BetProposal, other: BetProposal, horses: HorseData[]): number => {
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