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

// 券種の順序を定義
const betTypeOrder = [
  '単勝',
  '複勝',
  '枠連',
  'ワイド',
  '馬連',
  '馬単',
  '3連複',
  '3連単'
];

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

// フィードバックの種類を定義
export interface StrategyFeedback {
  type: 'MORE_RISK' | 'LESS_RISK' | 'FOCUS_HORSE' | 'AVOID_HORSE' | 'PREFER_BET_TYPE' | 'AVOID_BET_TYPE';
  details: {
    horseNumbers?: number[];
    betType?: string;
    description?: string;
  };
}

// 馬券間の相関関係分析用のインターフェース
export interface BetCorrelationAnalysis {
  correlationGroups: {
    type: string;  // "強い相関" | "中程度の相関" | "弱い相関"
    threshold: number;  // 条件付き確率の閾値（例：0.8, 0.5, 0.2）
    patterns: {
      description: string;  // 相関パターンの説明
      examples: {
        condition: {
          type: string;
          horses: string;
        };
        target: {
          type: string;
          horses: string;
        };
        probability: number;
      }[];
    }[];
  }[];
  insights: {
    betTypeCorrelations: {
      type1: string;
      type2: string;
      correlationLevel: string;
      explanation: string;
    }[];
    riskDiversification: {
      recommendation: string;
      reasoning: string;
      suggestedCombinations: {
        bet1: string;
        bet2: string;
        reason: string;
      }[];
    };
  };
}

export interface BetCorrelation {
  condition: {
    type: string;
    horses: string;
  };
  target: {
    type: string;
    horses: string;
  };
  probability: number;
}

// getGeminiStrategy関数を更新
export const getGeminiStrategy = async (
  bettingCandidates: BettingCandidate[],
  totalBudget: number,
  allBettingOptions: {
    horses: {
      name: string;
      odds: number;
      winProb: number;
      placeProb: number;
      frame: number;
      number: number;
    }[];
    bettingOptions: BettingOption[];
    conditionalProbabilities: BetCorrelation[];
  },
  riskRatio: number,
  feedback?: StrategyFeedback[]
): Promise<GeminiResponse> => {
  try {
    // correlationsをallBettingOptionsから取得
    const correlations = allBettingOptions.conditionalProbabilities || [];

    // 出馬表情報の作成
    const raceCardInfo = allBettingOptions.horses
      .sort((a, b) => a.number - b.number)
      .map(horse => `${horse.frame}枠${horse.number}番 ${horse.name}`)
      .join('\n');

    // 馬券候補一覧作成（※既存の実装に合わせる）
    const generateBettingCandidatesList = (): string => {
      const types: Array<"単勝" | "複勝" | "枠連" | "ワイド" | "馬連" | "馬単" | "３連複" | "３連単"> = [
        "単勝", "複勝", "枠連", "ワイド", "馬連", "馬単", "３連複", "３連単"
      ];
      let result = "";
      types.forEach(type => {
        const candidates = allBettingOptions.bettingOptions
          .filter(opt => opt.type === type)
          .map(opt => {
            const expectedValue = opt.odds * opt.prob - 1;
            return `${opt.horseName} [オッズ:${opt.odds.toFixed(1)}, 的中確率:${(opt.prob * 100).toFixed(2)}%, 期待値:${expectedValue.toFixed(2)}]`;
          })
          .join('\n');
        result += `\n${type}候補:\n${candidates}\n`;
      });
      return result;
    };

    const bettingCandidatesList = generateBettingCandidatesList();
    
    // 条件付き確率一覧を生成
    const correlationsText = correlations && correlations.length > 0 
    ? `${correlations.map(c => 
        `・${c.condition.type}「${c.condition.horses}」が的中 → ${c.target.type}「${c.target.horses}」が的中する確率: ${(c.probability * 100).toFixed(1)}%`
      ).join('\n')}`
    : '条件付き確率データなし';

    /*
     * -------------------------
     * Step 1: 馬券間の相関関係とリスク評価
     * -------------------------
     */
    const step1Prompt = `【ステップ1：馬券間の相関関係とリスク評価】

以下の出馬表、馬券候補一覧、および条件付き確率データに基づき、包括的な分析を行います。

【評価項目】
1. 各馬券の基本評価（期待値、リスク）
2. 馬券間の相関関係
3. リスク分散効果
4. 推奨される組み合わせ

【出馬表】
${raceCardInfo}

【馬券候補一覧】
${bettingCandidatesList}

【条件付き確率一覧】
${correlationsText}

【出力形式】
\`\`\`json
{
  "analysis": {
    "correlationPatterns": [
      {
        "strength": "強い相関（0.8以上）" | "中程度の相関（0.5-0.8）" | "弱い相関（0.5未満）",
        "patterns": [
          {
            "description": "相関パターンの説明",
            "examples": [
              {
                "bet1": "馬券1の説明",
                "bet2": "馬券2の説明",
                "probability": "条件付き確率",
                "interpretation": "この相関の意味"
              }
            ]
          }
        ]
      }
    ],
    "betTypeAnalysis": [
      {
        "type": "券種（例：単勝）",
        "characteristics": "特徴の説明",
        "correlations": "他券種との相関性",
        "riskProfile": "リスク特性"
      }
    ],
    "riskDiversification": {
      "recommendations": [
        {
          "combination": ["馬券1", "馬券2"],
          "reasoning": "推奨理由",
          "expectedEffect": "期待される効果"
        }
      ]
    }
  },
  "summary": {
    "keyInsights": [
      "重要な洞察1",
      "重要な洞察2"
    ],
    "recommendedStrategy": "総合的な推奨戦略の説明"
  }
}
\`\`\`

【指示】
1. 条件付き確率データを活用して、馬券間の相関関係を詳細に分析してください
2. 相関の強さに基づいてパターンを分類し、それぞれの特徴を説明してください
3. リスク分散の観点から、効果的な馬券の組み合わせを提案してください
4. 分析結果を踏まえた具体的な投資戦略を提示してください`;

    if (process.env.NODE_ENV === 'development') {
      console.log('ステップ1プロンプト:\n', step1Prompt);
    }

    const step1Response = await fetchWithRetry('/api/gemini', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': getCsrfToken(),
      },
      credentials: 'same-origin',
      body: JSON.stringify({
        prompt: step1Prompt,
        model: 'gemini-2.0-flash-001',
        thought: false,
        apiVersion: 'v1alpha'
      })
    }) ?? throwError('ステップ1の解析結果の取得に失敗しました');
    const step1Data = await step1Response.json();


    /*
     * -------------------------
     * Step 2: 予算制約下での馬券選択と購入戦略の策定
     * -------------------------
     */
    const step2Prompt = `【ステップ2：予算制約下での購入戦略策定】

ステップ1の分析結果を踏まえ、予算${totalBudget.toLocaleString()}円の制約下で、最適な馬券購入戦略を策定します。

【戦略策定の基準】
1. 期待値の高い馬券を重視
2. リスク分散を考慮した券種の組み合わせ
3. 予算配分の最適化
4. 的中確率とリターンのバランス

【出馬表】
${raceCardInfo}

【馬券候補一覧】
${bettingCandidatesList}

【出力形式】
\`\`\`json
{
  "purchaseStrategy": {
    "budget": ${totalBudget},
    "strategyPillars": [
      "戦略の柱1",
      "戦略の柱2",
      "戦略の柱3",
      "戦略の柱4"
    ],
    "bets": [
      {
        "type": "券種",
        "horses": ["1", "2"],
        "amount": 1000,
        "odds": 10.0,
        "hitProbability": 15.00,
        "expectedValue": 0.50,
        "expectedPayout": 10000,
        "reason": "選択理由"
      }
    ],
    "totalSpent": ${totalBudget},
    "expectedOutcome": {
      "hitRate": "的中率の予測",
      "highPayout": "高配当期待度",
      "riskManagement": "リスク管理方針"
    },
    "riskAnalysis": {
      "lowRiskBets": {
        "percentage": 30,
        "types": ["複勝", "ワイド"]
      },
      "mediumRiskBets": {
        "percentage": 40,
        "types": ["馬連", "馬単"]
      },
      "highRiskBets": {
        "percentage": 30,
        "types": ["3連複", "3連単"]
      }
    },
    "investmentDistribution": {
      "byBetType": [
        {
          "type": "券種",
          "percentage": 25,
          "amount": 2500
        }
      ],
      "byRiskLevel": [
        {
          "level": "リスクレベル",
          "percentage": 30,
          "amount": 3000
        }
      ]
    }
  }
}
\`\`\`

【指示】
1. 期待値とリスクのバランスを考慮した購入戦略を策定
2. 予算${totalBudget.toLocaleString()}円の範囲内で最適な配分を行う
3. 各馬券の選択理由を具体的に説明
4. リスク分散を考慮した投資配分を提示
5. 的中確率と期待払戻のバランスを考慮`;

    if (process.env.NODE_ENV === 'development') {
      console.log('ステップ2プロンプト:\n', step2Prompt);
    }

    const step2Response = await fetchWithRetry('/api/gemini', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': getCsrfToken(),
      },
      credentials: 'same-origin',
      body: JSON.stringify({
        prompt: step2Prompt,
        model: 'gemini-2.0-flash-001',
        thought: false,
        apiVersion: 'v1alpha'
      })
    }) ?? throwError('ステップ2の解析結果の取得に失敗しました');
      const step2Data = await step2Response.json();

    /*
     * -------------------------
     * Step 3: 最終的な戦略の出力（JSON形式）
     * -------------------------
     */
    let feedbackPrompt = '';
    if (feedback && feedback.length) {
      feedbackPrompt = `
【ユーザーからのフィードバック】
${feedback.map(f => {
        switch (f.type) {
          case 'MORE_RISK':
            return '- より積極的な投資戦略を希望';
          case 'LESS_RISK':
            return '- より保守的な投資戦略を希望';
          case 'FOCUS_HORSE':
            return `- ${f.details.horseNumbers?.map(n => `${n}番`).join(',')}に注目して投資`;
          case 'AVOID_HORSE':
            return `- ${f.details.horseNumbers?.map(n => `${n}番`).join(',')}への投資を避ける`;
          case 'PREFER_BET_TYPE':
            return `- ${f.details.betType}を重視した戦略を希望`;
          case 'AVOID_BET_TYPE':
            return `- ${f.details.betType}への投資を避ける`;
          default:
            return '';
        }
      }).join('\n')}
上記フィードバックを踏まえて、最終的な戦略を調整してください。
`;
    }

    const step3Prompt = `【ステップ3：最終戦略のJSON形式出力】
以下はこれまでの分析結果です。

■ ステップ1：相関関係とリスク分散効果の分析
${typeof step1Data === 'object' ? JSON.stringify(step1Data, null, 2) : step1Data}

■ ステップ2：予算制約下での購入戦略策定
${typeof step2Data === 'object' ? JSON.stringify(step2Data, null, 2) : step2Data}

${feedbackPrompt}

【出馬表】
${raceCardInfo}

【馬券候補一覧】
${bettingCandidatesList}

【指示】
上記情報を統合し、以下のJSON形式に従って最終的な競馬投資戦略を回答してください。

json
{
  "strategy": {
    "description": "戦略の優位性を3文以内で",
    "recommendations": [
      {
        "type": "馬券種類",
        "horses": ["馬番"],
        "odds": オッズ,
        "probability": 的中確率(例: 0.5),
        "reason": "選択理由を簡潔に説明"
      }
    ],
    "summary": {
      "riskLevel": "リスクレベル（低/中/高）"
    }
  }}`;
    if (process.env.NODE_ENV === 'development') {
      console.log('ステップ3プロンプト:\n', step3Prompt);
    }

    const step3Response = await fetchWithRetry('/api/gemini', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': getCsrfToken(),
      },
      credentials: 'same-origin',
      body: JSON.stringify({
        prompt: step3Prompt,
        model: 'gemini-2.0-flash-001',
        thought: false,
        apiVersion: 'v1alpha'
      })
    }) ?? throwError('ステップ3の最終出力の取得に失敗しました');
    const step3Data = await step3Response.json();

    // JSONコードブロック内のJSON部分を抽出してパースする
    if (!step3Data || !step3Data.strategy || !step3Data.strategy.description) {
      throw new Error('最終戦略のレスポンス形式が不正です');
    }
    let parsedStrategy: any;
    try {
      const jsonRegex = /```json\s*\n([\s\S]*?)\n```/;
      const match = jsonRegex.exec(step3Data.strategy.description);
      if (match && match[1]) {
        parsedStrategy = JSON.parse(match[1]);
      } else {
        throw new Error('JSONコードブロックが見つかりません');
      }
    } catch (error: any) {
      throw new Error('最終戦略のJSONパースに失敗しました: ' + error.message);
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('Parsed Gemini戦略：', JSON.stringify(parsedStrategy, null, 2));
    }

    if (!parsedStrategy || !parsedStrategy.strategy) {
      throw new Error('パースされた戦略データが不正です');
    }

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
            '0円', // 後で最適化
            '0円'  // 後で計算
          ])
        },
        summary: {
          riskLevel: parsedStrategy.strategy.summary.riskLevel
        }
      }
    };
  } catch (error: any) {
    throw new Error(`Gemini APIエラー (多段階フロー): ${error.message}`);
  }
};

// ヘルパー関数
function throwError(message: string): never {
  throw new Error(message);
} 