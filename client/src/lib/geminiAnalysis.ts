import { BetProposal, HorseData } from './betEvaluation';
import { BetCorrelation } from './betConditionalProbability';

interface GeminiAnalysisInput {
  horses: Array<{
    name: string;
    odds: number;
    winProb: number;
    placeProb: number;
    frame: number;
    number: number;
  }>;
  bettingOptions: BetProposal[];
  budget: number;
  riskRatio: number;
  correlations?: BetCorrelation[];
}

export interface GeminiAnalysisResult {
  analysis: {
    riskProfile: {
      riskRatio: number;
      interpretation: string;
      recommendedRiskDistribution: {
        lowRisk: string;
        mediumRisk: string;
        highRisk: string;
      };
    };
    correlationPatterns: Array<{
      strength: "強い相関（0.8以上）" | "中程度の相関（0.5-0.8）" | "弱い相関（0.5未満）";
      riskLevel: "低" | "中" | "高";
      patterns: Array<{
        description: string;
        examples: Array<{
          bet1: string;
          bet2: string;
          probability: string;
          interpretation: string;
          riskConsideration: string;
        }>;
      }>;
    }>;
    betTypeAnalysis: Array<{
      type: string;
      characteristics: string;
      correlations: string;
      riskProfile: string;
      suitability: number;
    }>;
  };
  summary: {
    keyInsights: string[];
    riskBasedStrategy: string;
    recommendedApproach: {
      conservative: string;
      balanced: string;
      aggressive: string;
      recommended: string;
    };
  };
}

const getCsrfToken = (): string => {
    const token = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content;
    if (!token) {
      throw new Error('CSRFトークンが見つかりません');
    }
    return token;
  };
  
  // リクエストにリトライロジックを追加
  const fetchWithRetry = async (
    url: string, 
    options: RequestInit, 
    maxRetries = 5
  ): Promise<Response> => {
    const backoffDelay = (attempt: number) => {
      const baseDelay = Math.min(1000 * Math.pow(2, attempt), 10000);
      return baseDelay + Math.random() * 1000;
    };
  
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            'X-Requested-With': 'XMLHttpRequest',
          },
        });
  
        if (response.status === 503) {
          console.log(`Retry attempt ${i + 1} after ${backoffDelay(i)}ms due to 503 error`);
          await new Promise(resolve => setTimeout(resolve, backoffDelay(i)));
          continue;
        }
  
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
  
        return response;
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        console.log(`Retry attempt ${i + 1} after ${backoffDelay(i)}ms`);
        await new Promise(resolve => setTimeout(resolve, backoffDelay(i)));
      }
    }
    throw new Error('リクエストが失敗しました');
  };

export async function analyzeWithGemini(input: GeminiAnalysisInput): Promise<GeminiAnalysisResult> {
  // 出馬表情報の作成
  const raceCardInfo = input.horses
    .sort((a, b) => a.number - b.number)
    .map(horse => `${horse.frame}枠${horse.number}番 ${horse.name.padEnd(20)} 単勝${(horse.winProb * 100).toFixed(1).padStart(4)}% 複勝${(horse.placeProb * 100).toFixed(1).padStart(4)}%`)
    .join('\n');

  // 馬券候補一覧の作成
  const types: Array<"単勝" | "複勝" | "枠連" | "ワイド" | "馬連" | "馬単" | "３連複" | "３連単"> = [
    "単勝", "複勝", "枠連", "ワイド", "馬連", "馬単", "３連複", "３連単"
  ];
  
  const bettingCandidatesList = types
    .map(type => {
      const candidates = input.bettingOptions
        .filter(bet => bet.type === type)
        .map(bet => {
          const expectedValue = bet.probability * bet.expectedReturn / bet.stake - 1;
          return `${bet.horseName} [オッズ:${(bet.expectedReturn / bet.stake).toFixed(1)}, 的中確率:${(bet.probability * 100).toFixed(1)}%, 期待値:${expectedValue.toFixed(2)}]`;
        })
        .join('\n');
      return candidates ? `\n${type}候補:\n${candidates}` : '';
    })
    .filter(section => section.length > 0)
    .join('\n');

  // 条件付き確率一覧の作成
  const correlationsText = input.correlations && input.correlations.length > 0
    ? `条件付き確率データ:\n${JSON.stringify(
        input.correlations.reduce((acc, c) => {
          // 券種でグループ化
          if (!acc[c.condition.type]) {
            acc[c.condition.type] = {};
          }
          // 馬番組み合わせでグループ化
          if (!acc[c.condition.type][c.condition.horses]) {
            acc[c.condition.type][c.condition.horses] = {};
          }
          // ターゲットの馬券と確率を追加
          acc[c.condition.type][c.condition.horses][`${c.target.type}[${c.target.horses}]`] = c.probability;
          return acc;
        }, {} as Record<string, Record<string, Record<string, number>>>
      ), null, 2)}`
    : '条件付き確率データなし';

  const prompt = `
【投資分析依頼】

以下の出馬表、馬券候補一覧、および条件付き確率一覧に基づき、包括的な分析を行います。
リスク選好度（riskRatio）は${input.riskRatio}です。（1-20の範囲で、20が最もリスク許容度が高い）

【評価項目】
1. 各馬券の基本評価（期待値、リスク）
2. 馬券間の相関関係
3. リスク分散効果
4. リスク選好度に応じた推奨組み合わせ

【投資条件】
- 予算: ${input.budget}円
- リスク許容度: ${input.riskRatio}

【出馬表】
${raceCardInfo}

【馬券候補一覧】
${bettingCandidatesList}

【条件付き確率一覧】
${correlationsText}

以下の形式でJSON形式の分析結果を返してください：

{
  "analysis": {
    "riskProfile": {
      "riskRatio": ${input.riskRatio},
      "interpretation": "リスク選好度の解釈",
      "recommendedRiskDistribution": {
        "lowRisk": "配分割合（%）",
        "mediumRisk": "配分割合（%）",
        "highRisk": "配分割合（%）"
      }
    },
    "correlationPatterns": [
      {
        "strength": "相関の強さ",
        "riskLevel": "リスクレベル",
        "patterns": [
          {
            "description": "相関パターンの説明",
            "examples": [
              {
                "bet1": "馬券1の説明",
                "bet2": "馬券2の説明",
                "probability": "条件付き確率",
                "interpretation": "この相関の意味",
                "riskConsideration": "リスク選好度との適合性"
              }
            ]
          }
        ]
      }
    ],
    "betTypeAnalysis": [
      {
        "type": "券種",
        "characteristics": "特徴",
        "correlations": "他券種との相関性",
        "riskProfile": "リスク特性",
        "suitability": "リスク選好度との適合性（0-100）"
      }
    ]
  },
  "summary": {
    "keyInsights": ["重要な洞察"],
    "riskBasedStrategy": "戦略の説明",
    "recommendedApproach": {
      "conservative": "ローリスクアプローチ",
      "balanced": "バランス型アプローチ",
      "aggressive": "ハイリスクアプローチ",
      "recommended": "推奨アプローチ"
    }
  }
}`;

if (process.env.NODE_ENV === 'development') {
    console.log('プロンプト:\n', prompt);
  }

  const response = await fetchWithRetry('/api/gemini', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': getCsrfToken(),
    },
    credentials: 'same-origin',
    body: JSON.stringify({
      prompt: prompt,
      model: 'gemini-2.0-flash-001',
      thought: false,
      apiVersion: 'v1alpha'
    })
  });

  if (!response) {
    throw new Error('分析結果の取得に失敗しました');
  }

  const data = await response.json();
  
  // JSONレスポンスのパース
  try {
    const jsonRegex = /```json\s*\n([\s\S]*?)\n```/;
    const match = jsonRegex.exec(data.strategy.description);
    if (!match || !match[1]) {
      throw new Error('JSONコードブロックが見つかりません');
    }

    const parsedData = JSON.parse(match[1]);
    if (!parsedData.analysis || !parsedData.summary) {
      throw new Error('パースされたデータの形式が不正です');
    }

    return parsedData as GeminiAnalysisResult;
  } catch (error: any) {
    console.error('Gemini response parsing error:', error);
    throw new Error('分析結果のパースに失敗しました: ' + error.message);
  }
} 