import { BetProposal, HorseData } from './betEvaluation';
import { BetCorrelation } from './betConditionalProbability';

export interface GeminiResponse {
    strategy: GeminiStrategy;
}

export interface GeminiRecommendation {
    type: string;
    horses: string[];
    odds: number;
    probability: number | string;
    reason: string;
    // 追加するプロパティ
    frame1?: number;
    frame2?: number;
    frame3?: number;
    horse1?: number;
    horse2?: number;
    horse3?: number;
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
      recommendedCombinations: string[];
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
    expectedResults: {
      minimumReturn: number;
      averageReturn: number;
      maximumReturn: number;
      riskLevel: number;
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
          const expectedValue = bet.probability * bet.expectedReturn / bet.stake;
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

以下のデータに基づき、具体的な投資戦略を立案してください：

1. 予想設定の詳細分析
予算: ${input.budget}円
リスク選好度: ${input.riskRatio}（1-20の範囲）

2. 馬券分析の観点
- 単勝・複勝の的中率と回収率の関係
- 馬連・ワイドの組み合わせ効果
- 3連系の期待値とリスクの定量評価
- 各馬券種別の特徴と相関関係

3. 具体的な投資戦略の提案
- 軸となる馬券と組み合わせるべき馬券
- 予算配分の具体的な数値（例：複勝40%、馬連30%など）
- リスクヘッジの具体的な方法
- 期待できる回収率の試算

【データ】
出馬表：
${raceCardInfo}

馬券候補（期待値順）：
${bettingCandidatesList}

条件付き確率データ：
${correlationsText}

以下の形式でJSON形式の分析結果を返してください：

{
  "analysis": {
    "riskProfile": {
      "riskRatio": ${input.riskRatio},
      "interpretation": "具体的なリスク選好度の解釈と、それに基づく投資方針",
      "recommendedRiskDistribution": {
        "lowRisk": "具体的な配分割合（%）",
        "mediumRisk": "具体的な配分割合（%）",
        "highRisk": "具体的な配分割合（%）"
      }
    },
    "betTypeAnalysis": [
      {
        "type": "券種",
        "characteristics": "具体的な特徴（期待値、リスク、的中率など）",
        "correlations": "他券種との具体的な相関性と組み合わせ効果",
        "riskProfile": "具体的なリスク特性と対策",
        "suitability": "リスク選好度との適合性（0-100）",
        "recommendedCombinations": ["具体的な組み合わせ例"],
        "expectedReturnRate": "期待回収率（%）"
      }
    ],
    "correlationPatterns": [
      {
        "strength": "相関の強さ（数値で）",
        "riskLevel": "リスクレベル",
        "patterns": [
          {
            "description": "具体的な相関パターンの説明",
            "examples": [
              {
                "bet1": "具体的な馬券1",
                "bet2": "具体的な馬券2",
                "probability": "具体的な条件付き確率",
                "interpretation": "この相関から導かれる具体的な投資戦略",
                "riskConsideration": "具体的なリスク対策"
              }
            ]
          }
        ]
      }
    ]
  },
  "summary": {
    "keyInsights": [
      "具体的な分析結果に基づく重要な洞察"
    ],
    "recommendedApproach": {
      "conservative": "具体的な保守的アプローチ（馬券の組み合わせと配分）",
      "balanced": "具体的なバランス型アプローチ（馬券の組み合わせと配分）",
      "aggressive": "具体的な積極的アプローチ（馬券の組み合わせと配分）",
      "recommended": "設定に最適な具体的なアプローチ（馬券の組み合わせと配分）"
    },
    "expectedResults": {
      "minimumReturn": "最低期待回収率（%）",
      "averageReturn": "平均期待回収率（%）",
      "maximumReturn": "最大期待回収率（%）",
      "riskLevel": "総合リスクレベル（1-10）"
    }
  }
}

注意点：
1. 一般的な助言は避け、データに基づく具体的な分析を行うこと
2. 各馬券の期待値とリスクを定量的に評価すること
3. 投資戦略は実行可能な具体的な内容とすること
4. 相関分析は実際のデータに基づいて行うこと
`;

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