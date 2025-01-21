export interface BettingCandidate {
  type: string;
  horseName: string;
  odds: number;
  probability: string;
  expectedValue: string;
}

// 詳細な分析用のインターフェース
export interface DetailedGeminiResponse {
  analysis: {
    thoughtProcess: string;
    riskAnalysis: string;
    recommendations: Array<{
      type: string;
      horses: string[];
      stake: number;
      expectedReturn: number;
      probability: number;
      reasoning: string;
    }>;
  };
}

// 要約用のインターフェース
export interface SummarizedGeminiResponse {
  strategy: {
    description: string;
    bettingTable: {
      headers: string[];
      rows: (string | number)[][];
    };
    summary: {
      totalInvestment: string;
      expectedReturn: string;
      riskLevel: string;
    };
    recommendations: {
      type: string;
      horses: string[];
      stake: number;
      reason: string;
    }[];
  };
}

// 既存のインターフェースを更新
export interface GeminiResponse {
  detailed: DetailedGeminiResponse;
  summarized: SummarizedGeminiResponse;
}

interface BettingOption {
  type: string;
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

interface Horse {
  name: string;
  odds: number;
  winProb: string;
  placeProb: string;
}

interface CombinationBetOption {
  combination: string;
  odds: number;
  probability: string;
  expectedValue: string;
}

export const getGeminiStrategy = async (
  bettingCandidates: BettingCandidate[],
  totalBudget: number,
  allBettingOptions: { bettingOptions: BettingOption[] }
): Promise<GeminiResponse> => {
  try {
    console.log('🎯 Gemini API Request:', {
      budget: totalBudget,
      optionsCount: allBettingOptions.bettingOptions.length
    });

    // 1. 詳細な分析を取得
    const detailedResponse = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        prompt: `あなたは競馬の投資アドバイザーです。以下の馬券候補から、予算${totalBudget.toLocaleString()}円での最適な購入戦略を提案してください。

【制約条件】
- 合計投資額は予算以内に収めること
- 期待値の高い馬券を優先すること
- リスク分散を考慮すること
- 各馬券の投資額は100円単位とすること

【馬券候補一覧】
単勝候補:
${allBettingOptions.bettingOptions
  .filter(opt => opt.type === "単勝")
  .map(bet => `${bet.horseName} [オッズ:${bet.odds.toFixed(1)}, 的中確率:${(bet.prob * 100).toFixed(2)}%, 期待値:${bet.ev.toFixed(2)}]`)
  .join('\n')}

複勝候補:
${allBettingOptions.bettingOptions
  .filter(opt => opt.type === "複勝")
  .map(bet => `${bet.horseName} [オッズ:${bet.odds.toFixed(1)}, 的中確率:${(bet.prob * 100).toFixed(2)}%, 期待値:${bet.ev.toFixed(2)}]`)
  .join('\n')}

枠連候補:
${allBettingOptions.bettingOptions
  .filter(opt => opt.type === "枠連")
  .map(bet => `${bet.horseName} [オッズ:${bet.odds.toFixed(1)}, 的中確率:${(bet.prob * 100).toFixed(2)}%, 期待値:${bet.ev.toFixed(2)}]`)
  .join('\n')}

馬連候補:
${allBettingOptions.bettingOptions
  .filter(opt => opt.type === "馬連")
  .map(bet => `${bet.horseName} [オッズ:${bet.odds.toFixed(1)}, 的中確率:${(bet.prob * 100).toFixed(2)}%, 期待値:${bet.ev.toFixed(2)}]`)
  .join('\n')}

ワイド候補:
${allBettingOptions.bettingOptions
  .filter(opt => opt.type === "ワイド")
  .map(bet => `${bet.horseName} [オッズ:${bet.odds.toFixed(1)}, 的中確率:${(bet.prob * 100).toFixed(2)}%, 期待値:${bet.ev.toFixed(2)}]`)
  .join('\n')}

馬単候補:
${allBettingOptions.bettingOptions
  .filter(opt => opt.type === "馬単")
  .map(bet => `${bet.horseName} [オッズ:${bet.odds.toFixed(1)}, 的中確率:${(bet.prob * 100).toFixed(2)}%, 期待値:${bet.ev.toFixed(2)}]`)
  .join('\n')}

3連複候補:
${allBettingOptions.bettingOptions
  .filter(opt => opt.type === "３連複")
  .map(bet => `${bet.horseName} [オッズ:${bet.odds.toFixed(1)}, 的中確率:${(bet.prob * 100).toFixed(2)}%, 期待値:${bet.ev.toFixed(2)}]`)
  .join('\n')}

3連単候補:
${allBettingOptions.bettingOptions
  .filter(opt => opt.type === "３連単")
  .map(bet => `${bet.horseName} [オッズ:${bet.odds.toFixed(1)}, 的中確率:${(bet.prob * 100).toFixed(2)}%, 期待値:${bet.ev.toFixed(2)}]`)
  .join('\n')}

以下の形式で必ず応答してください（改行や余分な空白を含まないこと）：
{"strategy":{"recommendations":[{"type":"馬券種別","horses":["馬番号"],"stake":投資額,"reason":"理由"}]}}

注意事項：
- 厳密なJSON形式で出力すること
- 改行文字を含めないこと
- 数値は文字列ではなく数値で出力
- 説明文は出力しない`,
        model: 'gemini-2.0-flash-exp'
      })
    });

    const rawResponse = await detailedResponse.text();
    console.log('Raw Response:', rawResponse);

    let detailedData;
    try {
      // 余分な文字を削除してJSONをパース
      const cleanJson = rawResponse.replace(/[\n\r\t]/g, '').match(/\{.*\}/)?.[0] || '';
      detailedData = JSON.parse(cleanJson);
    } catch (error) {
      console.error('JSON Parse Error:', error);
      throw new Error('AIの応答をJSONとして解析できません');
    }

    if (!detailedData?.strategy?.recommendations) {
      detailedData = {
        strategy: {
          recommendations: []
        }
      };
    }

    return {
      detailed: detailedData,
      summarized: detailedData
    };
  } catch (error) {
    console.error('💥 Gemini Strategy Error:', error);
    throw new Error(`Gemini APIエラー: ${(error as Error).message}`);
  }
}; 