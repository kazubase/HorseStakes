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

// 戦略テーブルの行データの型
export interface StrategyTableRow {
  type: string;
  horses: string;
  odds: string;
  probability: string;
  stake: string;
  reason: string;
}

// 要約用のインターフェースを更新
export interface SummarizedGeminiResponse {
  strategy: {
    description: string;
    bettingTable: {
      headers: string[];
      rows: [string, string, string, string, string, string][];
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
  strategy: GeminiStrategy;
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

export interface GeminiRecommendation {
  type: string;
  horses: string[];
  odds: number;
  probability: string | number;
  reason: string;
}

export interface GeminiStrategy {
  description: string;
  recommendations: GeminiRecommendation[];
  bettingTable: {
    headers: string[];
    rows: string[][];
  };
  summary: {
    riskLevel: string;  // リスクレベルのみを保持
  };
}

// 券種の順序を定義
const betTypeOrder = [
  '単勝',
  '複勝',
  '枠連',
  '馬連',
  'ワイド',
  '馬単',
  '3連複',
  '3連単'
];

export const getGeminiStrategy = async (
  bettingCandidates: BettingCandidate[],
  totalBudget: number,
  allBettingOptions: { bettingOptions: BettingOption[] },
  riskRatio: number
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
        prompt: `あなたは競馬の投資アドバイザーです。必ず日本語で推論してください。以下の馬券候補から、予算${totalBudget.toLocaleString()}円での最適な購入戦略を提案してください。

【リスク選好】
- リスク選好度: ${riskRatio}（1～20の範囲で、1が最もローリスク、20が最もハイリスク）


【分析の観点】
1. 各馬券の期待値と的中確率
   - リスク選好度が高いほど期待値を重視
   - リスク選好度が低いほど的中確率を重視
2. 馬券間の相関関係
   - 同じ馬を含む馬券の組み合わせは正の相関
   - 異なる馬の組み合わせは負の相関
   - 単勝と複勝など、関連する馬券種の相関
3. リスク分散効果
   - 負の相関の馬券の組み合わせが多いほどリスク分散効果が高い
   - ３連複、３連単など的中確率の低い馬券種は点数を増やすほどリスク分散効果が高い

【制約条件】
- 必ず日本語で分析と提案を行うこと
- 各馬券について、他の馬券との相関関係を理由に含めること
- 各馬券について、リスク分散効果を理由に含めること

【馬券候補一覧】
単勝候補:
${allBettingOptions.bettingOptions
  .filter(opt => opt.type === "単勝")
  .map(bet => {
    const expectedValue = bet.odds * bet.prob - 1;
    return `${bet.horseName} [オッズ:${bet.odds.toFixed(1)}, 的中確率:${(bet.prob * 100).toFixed(2)}%, 期待値:${expectedValue.toFixed(2)}]`;
  })
  .join('\n')}

複勝候補:
${allBettingOptions.bettingOptions
  .filter(opt => opt.type === "複勝")
  .map(bet => {
    const expectedValue = bet.odds * bet.prob - 1;
    return `${bet.horseName} [オッズ:${bet.odds.toFixed(1)}, 的中確率:${(bet.prob * 100).toFixed(2)}%, 期待値:${expectedValue.toFixed(2)}]`;
  })
  .join('\n')}

枠連候補:
${allBettingOptions.bettingOptions
  .filter(opt => opt.type === "枠連")
  .map(bet => {
    const expectedValue = bet.odds * bet.prob - 1;
    return `${bet.horseName} [オッズ:${bet.odds.toFixed(1)}, 的中確率:${(bet.prob * 100).toFixed(2)}%, 期待値:${expectedValue.toFixed(2)}]`;
  })
  .join('\n')}

馬連候補:
${allBettingOptions.bettingOptions
  .filter(opt => opt.type === "馬連")
  .map(bet => {
    const expectedValue = bet.odds * bet.prob - 1;
    return `${bet.horseName} [オッズ:${bet.odds.toFixed(1)}, 的中確率:${(bet.prob * 100).toFixed(2)}%, 期待値:${expectedValue.toFixed(2)}]`;
  })
  .join('\n')}

ワイド候補:
${allBettingOptions.bettingOptions
  .filter(opt => opt.type === "ワイド")
  .map(bet => {
    const expectedValue = bet.odds * bet.prob - 1;
    return `${bet.horseName} [オッズ:${bet.odds.toFixed(1)}, 的中確率:${(bet.prob * 100).toFixed(2)}%, 期待値:${expectedValue.toFixed(2)}]`;
  })
  .join('\n')}

馬単候補:
${allBettingOptions.bettingOptions
  .filter(opt => opt.type === "馬単")
  .map(bet => {
    const expectedValue = bet.odds * bet.prob - 1;
    return `${bet.horseName} [オッズ:${bet.odds.toFixed(1)}, 的中確率:${(bet.prob * 100).toFixed(2)}%, 期待値:${expectedValue.toFixed(2)}]`;
  })
  .join('\n')}

3連複候補:
${allBettingOptions.bettingOptions
  .filter(opt => opt.type === "３連複")
  .map(bet => {
    const expectedValue = bet.odds * bet.prob - 1;
    return `${bet.horseName} [オッズ:${bet.odds.toFixed(1)}, 的中確率:${(bet.prob * 100).toFixed(2)}%, 期待値:${expectedValue.toFixed(2)}]`;
  })
  .join('\n')}

3連単候補:
${allBettingOptions.bettingOptions
  .filter(opt => opt.type === "３連単")
  .map(bet => {
    const expectedValue = bet.odds * bet.prob - 1;
    return `${bet.horseName} [オッズ:${bet.odds.toFixed(1)}, 的中確率:${(bet.prob * 100).toFixed(2)}%, 期待値:${expectedValue.toFixed(2)}]`;
  })
  .join('\n')}

以下の形式でJSON応答してください：
json
{
  "strategy": {
    "description": "戦略の要点を1文で",
    "recommendations": [
      {
        "type": "馬券種類",
        "horses": ["馬番"],
        "odds": オッズ,
        "probability": 的中確率(少数で表示：50%なら0.5),
        "reason": "選択理由を説明"
      }
    ],
    "summary": {
      "riskLevel": "リスクレベル（低/中/高）"
    }
  }
}`,
        model: 'gemini-2.0-flash-thinking-exp',
        thought: false,
        apiVersion: 'v1alpha'
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
      const jsonMatch = detailedData.strategy.description.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        const parsedStrategy = JSON.parse(jsonMatch[1]);
        return {
          strategy: {
            description: parsedStrategy.strategy.description,
            recommendations: parsedStrategy.strategy.recommendations.map((rec: GeminiRecommendation) => ({
              type: rec.type,
              horses: rec.horses,
              odds: rec.odds,
              probability: rec.probability,
              reason: rec.reason
            })),
            bettingTable: {
              headers: ['券種', '買い目', 'オッズ', '的中率', '投資額', '期待収益'],
              rows: parsedStrategy.strategy.recommendations.map((rec: GeminiRecommendation) => [
                rec.type,
                rec.horses.join('-'),
                String(rec.odds),
                typeof rec.probability === 'number' 
                  ? (rec.probability * 100).toFixed(1) + '%'
                  : rec.probability,
                '0円', // 投資額は後で最適化
                '0円'  // 期待収益は後で計算
              ])
            },
            summary: {
              riskLevel: parsedStrategy.strategy.summary.riskLevel
            }
          }
        };
      }
    }

    // 2. 要約を取得（必要な場合のみ）
    const summaryResponse = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        prompt: `必ず日本語で応答してください。以下の競馬投資分析を、表形式で簡潔に要約してください：

${JSON.stringify(detailedData, null, 2)}

以下の形式でJSON応答してください：
json
{
  "strategy": {
    "description": "戦略の要点を1文で",
    "recommendations": [
      {
        "type": "馬券種類",
        "horses": ["馬番"],
        "odds": オッズ,
        "probability": 的中確率(少数で表示：50%なら0.5),
        "reason": "選択理由を説明"
      }
    ],
    "summary": {
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
      strategy: {
        description: summarizedData.strategy.description,
        bettingTable: {
          headers: summarizedData.strategy.bettingTable.headers,
          rows: summarizedData.strategy.bettingTable.rows.map((row: string[]) => row.slice(0, 6))
        },
        summary: {
          riskLevel: summarizedData.strategy.summary.riskLevel
        },
        recommendations: summarizedData.strategy.recommendations.map((rec: GeminiStrategy['recommendations'][0]) => ({
          ...rec,
          expectedReturn: 0,
          probability: 0,
          reason: rec.reason
        }))
      }
    };
  } catch (error) {
    console.error('💥 Gemini Strategy Error:', error);
    throw new Error(`Gemini APIエラー: ${(error as Error).message}`);
  }
}; 