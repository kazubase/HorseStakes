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

以下の形式で簡潔にJSON応答してください：
{
  "strategy": {
    "description": "戦略の要点を1文で",
    "bettingTable": {
      "headers": ["馬券種別", "買い目", "オッズ", "的中率", "投資額", "理由"],
      "rows": [
        ["馬連", "1-2", "10.5", "15%", "1000", "期待値が高い"]
      ]
    },
    "summary": {
      "totalInvestment": "合計投資額",
      "expectedReturn": "期待収益",
      "riskLevel": "中"
    }
  }
}`,
        model: 'gemini-2.0-flash-thinking-exp'
      })
    });

    const detailedData = await detailedResponse.json();
    console.log('Detailed Response:', detailedData);

    // レスポンス形式チェックを修正
    if (!detailedData || (!detailedData.analysis && !detailedData.strategy)) {
      console.error('Invalid detailed response format:', detailedData);
      throw new Error('詳細分析のレスポンス形式が不正です');
    }

    // 既にstrategy形式で返ってきた場合は要約をスキップ
    if (detailedData.strategy) {
      return {
        detailed: {
          analysis: {
            thoughtProcess: '',
            riskAnalysis: '',
            recommendations: detailedData.strategy.recommendations.map((rec: SummarizedGeminiResponse['strategy']['recommendations'][0]) => ({
              ...rec,
              expectedReturn: 0,
              probability: 0,
              reasoning: rec.reason
            }))
          }
        },
        summarized: detailedData
      };
    }

    // 2. 要約を取得（必要な場合のみ）
    const summaryResponse = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        prompt: `以下の競馬投資分析を、表形式で簡潔に要約してください：

${JSON.stringify(detailedData, null, 2)}

以下の形式でJSON応答してください：
{
  "strategy": {
    "description": "戦略の要点を1-2文で",
    "recommendations": [
      {
        "type": "馬券種類",
        "horses": ["馬名"],
        "stake": 投資額,
        "reason": "期待値・確率・リスクの観点から30字以内で",
        "expectedReturn": 期待収益,
        "probability": 的中確率
      }
    ],
    "summary": {
      "totalStake": 合計投資額,
      "expectedProfit": 期待収益,
      "riskLevel": "リスクレベル（低/中/高）"
    }
  }
}`,
        model: 'gemini-2.0-flash-exp'
      })
    });

    const summarizedData = await summaryResponse.json();
    console.log('Summary Response:', summarizedData);

    if (!summarizedData || !summarizedData.strategy) {
      console.error('Invalid summary response format:', summarizedData);
      throw new Error('要約のレスポンス形式が不正です');
    }

    return {
      detailed: detailedData,
      summarized: summarizedData
    };
  } catch (error) {
    console.error('💥 Gemini Strategy Error:', error);
    throw new Error(`Gemini APIエラー: ${(error as Error).message}`);
  }
}; 