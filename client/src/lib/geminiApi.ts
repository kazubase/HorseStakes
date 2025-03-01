export interface BettingCandidate {
  type: string;
  horseName: string;
  odds: number;
  probability: string;
  expectedValue: string;
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

export interface GeminiRecommendation {
  type: string;
  horses: string[];
  odds: number;
  probability: number | string;
  reason?: string;
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
  summary: {
    riskLevel: 'AI_OPTIMIZED' | 'USER_SELECTED';
    description?: string;
  };
  bettingTable: {
    headers: string[];
    rows: any[][];
  };
}

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
            const expectedValue = opt.odds * opt.prob;
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
      ? `条件付き確率データ:
${JSON.stringify(
  correlations.reduce((acc, c) => {
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

    /*
     * -------------------------
     * Step 1: 馬券間の相関関係とリスク評価
     * -------------------------
     */
    const step1Prompt = `【ステップ1：馬券間の相関関係とリスク評価】

以下の出馬表、馬券候補一覧、および条件付き確率一覧に基づき、包括的な分析を行います。
リスク選好度（riskRatio）は${riskRatio}です。（2-20の範囲で、20が最もリスク許容度が高い）

【評価項目】
1. 各馬券の基本評価（期待値、リスク）
2. 馬券間の相関関係
3. リスク分散効果
4. リスク選好度に応じた推奨組み合わせ

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
    "riskProfile": {
      "riskRatio": ${riskRatio},
      "interpretation": "リスク選好度の解釈",
      "recommendedRiskDistribution": {
        "lowRisk": "配分割合（%）",
        "mediumRisk": "配分割合（%）",
        "highRisk": "配分割合（%）"
      }
    },
    "correlationPatterns": [
      {
        "strength": "強い相関（0.8以上）" | "中程度の相関（0.5-0.8）" | "弱い相関（0.5未満）",
        "riskLevel": "低/中/高",
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
        "type": "券種（例：単勝）",
        "characteristics": "特徴の説明",
        "correlations": "他券種との相関性",
        "riskProfile": "リスク特性",
        "suitability": "現在のリスク選好度との適合性（0-100%）"
      }
    ],
    "riskDiversification": {
      "recommendations": [
        {
          "combination": ["馬券1", "馬券2"],
          "reasoning": "推奨理由",
          "expectedEffect": "期待される効果",
          "riskAlignment": "リスク選好度との整合性の説明"
        }
      ]
    }
  },
  "summary": {
    "keyInsights": [
      "重要な洞察1",
      "重要な洞察2"
    ],
    "riskBasedStrategy": "リスク選好度を考慮した戦略の説明",
    "recommendedApproach": {
      "conservative": "ローリスクアプローチの説明（リスク回避的な場合）",
      "balanced": "バランス型アプローチの説明（中程度のリスク選好の場合）",
      "aggressive": "ハイリスクアプローチの説明（リスク選好的な場合）",
      "recommended": "現在のリスク選好度に最適なアプローチ"
    }
  }
}
\`\`\`

【指示】
1. リスク選好度（${riskRatio}）を考慮した相関関係の分析を行ってください
2. 相関パターンをリスクレベルで分類し、現在のリスク選好度との適合性を評価してください
3. リスク分散とリターンのバランスを考慮した馬券の組み合わせを提案してください
4. リスク選好度に応じた具体的な投資戦略を提示してください
5. 各券種について、現在のリスク選好度との適合性を評価してください`;

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

■ ステップ1の分析結果
${typeof step1Data === 'object' ? JSON.stringify(step1Data, null, 2) : step1Data}

上記の分析結果を踏まえ、予算${totalBudget.toLocaleString()}円の制約下で、最適な馬券購入戦略を策定します。
リスク選好度（riskRatio）は${riskRatio}です。（2-20の範囲で、20が最もリスク許容度が高い）

【戦略策定の基準】
1. 期待値の高い馬券を重視
2. ステップ1で分析した相関関係に基づくリスク分散
3. リスク選好度に応じた予算配分の最適化
4. 的中確率とリターンのバランス

【出馬表】
${raceCardInfo}

【馬券候補一覧】
${bettingCandidatesList}

【指示】
1. リスク選好度（${riskRatio}）に基づいた投資戦略を立案
2. ステップ1で特定された相関パターンを考慮した馬券選択
3. 予算${totalBudget.toLocaleString()}円をリスク選好度に応じて効果的に配分
4. リスク分散とリターンのバランスを考慮した投資配分を提示
5. リスク選好度に適した相関関係の活用方法を説明

【出力形式】
\`\`\`json
{
  "purchaseStrategy": {
    "budget": ${totalBudget},
    "riskProfile": {
      "riskRatio": ${riskRatio},
      "interpretation": "現在のリスク選好度の解釈",
      "strategyAlignment": "リスク選好度に基づく戦略の方向性"
    },
    "overview": {
      "mainStrategy": "全体的な戦略の要約（1-2文）",
      "keyPoints": [
        "重要なポイント1",
        "重要なポイント2"
      ]
    },
    "correlationStrategy": {
      "highCorrelation": [
        {
          "pattern": "単勝[1]→複勝[1]のような高相関パターン",
          "application": "この相関をどう活用/回避するか",
          "riskConsideration": "リスク選好度との整合性"
        }
      ],
      "synergies": [
        {
          "combination": ["券種1", "券種2"],
          "merit": "組み合わせの利点",
          "riskAlignment": "リスク選好度との適合性"
        }
      ]
    },
    "recommendations": [
      {
        "type": "券種",
        "horses": ["馬番"],
        "stake": 1000,
        "odds": 10.0,
        "probability": 0.15,
        "expectedValue": 0.50,
        "riskLevel": "低/中/高",
        "reasoning": {
          "selection": "選択理由",
          "stakeSize": "投資額の根拠",
          "correlationContext": "他の馬券との関連性",
          "riskJustification": "リスク選好度との整合性の説明"
        }
      }
    ],
    "riskManagement": {
      "distribution": [
        {
          "riskLevel": "低/中/高",
          "percentage": 30,
          "betTypes": ["券種1", "券種2"],
          "rationale": "リスク選好度を考慮した配分理由"
        }
      ],
      "hedgingStrategy": "リスク選好度に応じたヘッジ方針"
    },
    "expectedOutcomes": {
      "bestCase": "最良のシナリオ",
      "worstCase": "最悪のシナリオ",
      "mostLikely": "最も可能性の高いシナリオ",
      "riskReturnProfile": "リスクリターン特性の説明"
    }
  }
}
\`\`\``;

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

予算は${totalBudget.toLocaleString()}円、リスク選好度（riskRatio）は${riskRatio}です。
（2-20の範囲で、20が最もリスク許容度が高い）

【出馬表】
${raceCardInfo}

【馬券候補一覧】
${bettingCandidatesList}

【指示】
上記情報を統合し、予算とリスク選好度を考慮した最終的な競馬投資戦略を以下のJSON形式で回答してください。

json
{
  "strategy": {
    "budget": ${totalBudget},
    "riskProfile": {
      "riskRatio": ${riskRatio},
      "interpretation": "現在のリスク選好度の解釈"
    },
    "description": "戦略の優位性を3文以内で",
    "recommendations": [
      {
        "type": "馬券種類",
        "horses": ["馬番"],
        "stake": 投資額,
        "odds": オッズ,
        "probability": 的中確率(例: 0.5),
        "expectedValue": 期待値,
        "riskLevel": "リスクレベル（低/中/高）",
        "reason": "選択理由と予算配分の根拠を簡潔に説明"
      }
    ],
    "summary": {
      "riskLevel": "全体的なリスクレベル（低/中/高）",
      "riskDistribution": {
        "lowRisk": "低リスク馬券への配分割合（%）",
        "mediumRisk": "中リスク馬券への配分割合（%）",
        "highRisk": "高リスク馬券への配分割合（%）"
      },
      "expectedReturn": "期待される総合的なリターン"
    }
  }
}`;
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