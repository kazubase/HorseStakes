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
  },
  riskRatio: number,
  feedback?: StrategyFeedback[]
): Promise<GeminiResponse> => {
  try {
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

    // 改善したステップ1プロンプト（更新版）
    const step1Prompt = `【ステップ1：馬券候補の期待値とリスク評価】

以下の出馬表と馬券候補一覧の情報に基づき、各馬券候補ごとに以下の項目を評価してください：
1. 券種（例："ワイド", "３連単", など）
2. オッズ（数値）
3. 的中確率（小数または％、例: 0.15 または 15%）
4. 期待値（計算式：オッズ × 的中確率 - 1）
5. リスク分類（「低」「中」「高」のいずれか）
6. 推奨インジケータ（該当する場合は「推奨候補」、該当しない場合は空文字）

また、全体としての戦略の要点を簡潔にまとめたサマリーも最後に出力してください。

【出馬表】
${raceCardInfo}

【馬券候補一覧】
${bettingCandidatesList}

【出力形式】
必ず以下の形式のJSONコードブロック（\`\`\`json ... \`\`\`）のみを出力してください。このコードブロック以外の余計なテキストは一切含めないこと。

\`\`\`json
{
  "candidates": [
    {
      "type": "ワイド",
      "odds": 30.9,
      "probability": 0.15,
      "expectedValue": 3.63,
      "risk": "中",
      "recommendation": "推奨候補"
    },
    ... 他の候補 ...
  ],
  "summary": "全体として、◯◯の理由から特にワイドが推奨される。"
}
\`\`\`

【指示】
上記情報を詳細に解析し、各候補ごとの評価結果と、全体戦略の要点をまとめたJSON形式のアウトプットを出力してください。`;

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
     * Step 2: 馬券間の相関関係とリスク分散効果の分析
     * -------------------------
     */
    const step2Prompt = `【ステップ2：馬券間の相関関係とリスク分散効果の分析】

以下の出馬表と馬券候補一覧の情報をもとに、馬券間の相関関係とリスク分散効果を詳細に解析してください。解析では、以下の点に着目してください：
1. 各馬券候補間の相関関係（正の相関・負の相関）の評価
2. 異なる券種の組み合わせによるリスク分散効果の評価
3. 具体的な注目点と戦略上の推奨事項の提示（例：ドゥレッツァ(10)、シンエンペラー(7)、スターズオンアース(14) など）

【出馬表】
${raceCardInfo}

【馬券候補一覧】
${bettingCandidatesList}

【出力形式】
必ず以下の形式のJSONコードブロック（\`\`\`json ... \`\`\`）のみを出力してください。このコードブロック以外の余計なテキストは一切含めないこと。

\`\`\`json
{
  "analysis": {
    "sections": [
      {
        "theme": "ドゥレッツァ(10) を軸とした馬券",
        "positiveCorrelation": "例：ドゥレッツァが絡む馬券は高いリターンが期待できるが、リスクも増大する。",
        "riskDiversificationEffect": "例：複勝など安定性のある馬券を併用することでリスク低減が期待できる。",
        "recommendation": "例：高配当時に限定して購入を検討。"
      },
      {
        "theme": "シンエンペラー(7) を軸とした馬券",
        "positiveCorrelation": "例：シンエンペラーが絡むと他の馬券と連動しやすい。",
        "riskDiversificationEffect": "例：ワイドとの組み合わせで安定性を確保可能。",
        "recommendation": ""
      },
      {
        "theme": "ドゥレッツァ(10) とシンエンペラー(7) の組み合わせ",
        "positiveCorrelation": "例：両馬の組み合わせは大きなリターンが期待できる。",
        "riskDiversificationEffect": "例：ワイドで補完するとリスク分散効果が向上する。",
        "recommendation": ""
      },
      {
        "theme": "スターズオンアース(14) を絡めた馬券",
        "positiveCorrelation": "例：14が絡むことで、連動効果によるリターンが期待できる。",
        "riskDiversificationEffect": "例：ワイドなどでリスクを軽減可能。",
        "recommendation": ""
      },
      {
        "theme": "枠連馬券の分析",
        "positiveCorrelation": "例：枠連は個々の馬の実績に依存しにくい。",
        "riskDiversificationEffect": "例：他の馬券と組み合わせることで全体のリスクが低減される。",
        "recommendation": ""
      }
    ],
    "overallSummary": "例：特定の馬に偏らず、異なる券種をバランスよく組み合わせることでリスク分散効果を最大化できる。"
  }
}
\`\`\`

【指示】
上記出馬表と馬券候補一覧の情報を詳細に解析し、各セクションごとの具体的な相関関係とリスク分散効果の評価、および全体に関する戦略的な結論（全体サマリー）を、上記のJSON形式に従って出力してください。`;

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
     * Step 3: 予算制約下での馬券選択と購入戦略の策定
     * -------------------------
     */
    const step3Prompt = `【ステップ3：予算制約下での購入戦略策定】

以下の出馬表、馬券候補一覧、及びこれまでの分析結果（ステップ1、ステップ2）を踏まえ、予算制約の下で、以下の条件に沿った馬券購入戦略を策定してください：
1. 期待値が高い馬券を中心に組み立てること。
2. 本命として、ドゥレッツァとシンエンペラーを軸に、補完的にスターズオンアースを絡めること。
3. 異なる券種（ワイド、３連複、３連単、馬単、複勝など）を組み合わせ、リスク分散を図ること。
4. 各馬券種ごとに、買い目、購入金額、オッズ、的中確率、期待値、期待される払い戻し、理由を明示すること。
5. 最終的な購入総額が必ず${totalBudget.toLocaleString()}円となるようにすること。

【出馬表】
${raceCardInfo}

【馬券候補一覧】
${bettingCandidatesList}

【出力形式】
必ず以下の形式のJSONコードブロック（\`\`\`json ... \`\`\`）のみを出力してください。このコードブロック以外の余計なテキストは一切含めないこと。

\`\`\`json
{
  "purchaseStrategy": {
    "budget": ${totalBudget},
    "strategyPillars": [
      "期待値重視",
      "本命：ドゥレッツァとシンエンペラー",
      "穴狙い：スターズオンアース",
      "リスク分散：複数の券種を組み合わせる"
    ],
    "bets": [
      {
        "type": "ワイド",
        "selection": "7-10",
        "amount": 1000,
        "odds": 30.9,
        "hitProbability": 15.00,
        "expectedValue": 3.63,
        "expectedPayout": 30900,
        "reason": "期待値が非常に高く、シンエンペラーとドゥレッツァの組み合わせで的中率も比較的高い。"
      },
      {
        "type": "ワイド",
        "selection": "10-14",
        "amount": 500,
        "odds": 13.9,
        "hitProbability": 30.00,
        "expectedValue": 3.17,
        "expectedPayout": 6950,
        "reason": "ドゥレッツァとスターズオンアースの組み合わせで、高期待値と堅実な的中率を狙う。"
      },
      {
        "type": "ワイド",
        "selection": "7-14",
        "amount": 300,
        "odds": 21.8,
        "hitProbability": 18.00,
        "expectedValue": 2.92,
        "expectedPayout": 6540,
        "reason": "シンエンペラーとスターズオンアースの組み合わせで、リスク分散に寄与。"
      },
      {
        "type": "３連複",
        "selection": "3-7-10",
        "amount": 500,
        "odds": 122.3,
        "hitProbability": 4.05,
        "expectedValue": 3.95,
        "expectedPayout": 61150,
        "reason": "本命の組み合わせで期待値が非常に高い。"
      },
      {
        "type": "３連複",
        "selection": "3-10-14",
        "amount": 300,
        "odds": 62.6,
        "hitProbability": 7.35,
        "expectedValue": 3.60,
        "expectedPayout": 18780,
        "reason": "高期待値の組み合わせ。ドゥレッツァ、スターズオンアースの組み合わせ。"
      },
      {
        "type": "３連単",
        "selection": "3→7→10",
        "amount": 200,
        "odds": 447.9,
        "hitProbability": 1.80,
        "expectedValue": 7.06,
        "expectedPayout": 89580,
        "reason": "非常に高い期待値による高配当狙い。"
      },
      {
        "type": "３連単",
        "selection": "3→10→7",
        "amount": 200,
        "odds": 378.6,
        "hitProbability": 1.80,
        "expectedValue": 5.81,
        "expectedPayout": 75720,
        "reason": "高配当狙いの組み合わせ。"
      },
      {
        "type": "３連単",
        "selection": "3→7→14",
        "amount": 200,
        "odds": 277.6,
        "hitProbability": 2.25,
        "expectedValue": 5.25,
        "expectedPayout": 55520,
        "reason": "期待値が高く、スターズオンアースを組み合わせた高配当狙い。"
      },
      {
        "type": "３連単",
        "selection": "3→10→14",
        "amount": 200,
        "odds": 207.2,
        "hitProbability": 3.00,
        "expectedValue": 5.22,
        "expectedPayout": 41440,
        "reason": "高期待値で高配当を狙う。"
      },
      {
        "type": "馬単",
        "selection": "3→10",
        "amount": 200,
        "odds": 30.7,
        "hitProbability": 12.00,
        "expectedValue": 2.68,
        "expectedPayout": 6140,
        "reason": "本命同士の組み合わせで安定感を狙う。"
      },
      {
        "type": "馬単",
        "selection": "10→14",
        "amount": 100,
        "odds": 147.0,
        "hitProbability": 2.50,
        "expectedValue": 2.67,
        "expectedPayout": 14700,
        "reason": "ドゥレッツァとスターズオンアースの組み合わせで高配当狙い。"
      },
      {
        "type": "複勝",
        "selection": "10",
        "amount": 500,
        "odds": 3.7,
        "hitProbability": 50.00,
        "expectedValue": 0.85,
        "expectedPayout": 1850,
        "reason": "手堅く的中率を上げるための購入。"
      },
      {
        "type": "複勝",
        "selection": "7",
        "amount": 500,
        "odds": 5.2,
        "hitProbability": 30.00,
        "expectedValue": 0.56,
        "expectedPayout": 2600,
        "reason": "手堅く的中率を上げるための購入。"
      }
    ],
    "totalSpent": ${totalBudget},
    "expectedOutcome": {
      "hitRate": "ワイド、複勝中心で安定した的中率が期待される",
      "highPayout": "３連複、３連単、馬単で高配当を狙う",
      "riskManagement": "異なる券種への分散購入でリスクを低減"
    }
  }
}
\`\`\`

【指示】
上記出馬表、馬券候補一覧、及びこれまでの分析結果を基に、予算${totalBudget.toLocaleString()}円の枠内での馬券購入戦略を詳細に策定してください。必ず各項目を明示し、最終的な総購入金額が${totalBudget.toLocaleString()}円になるようにしてください。`;

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
    }) ?? throwError('ステップ3の解析結果の取得に失敗しました');
    const step3Data = await step3Response.json();

    /*
     * -------------------------
     * Step 4: 最終的な戦略の出力（JSON形式）
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

    const step4Prompt = `【ステップ4：最終戦略のJSON形式出力】
以下はこれまでの分析結果です。

■ ステップ1：期待値とリスク評価
${typeof step1Data === 'object' ? JSON.stringify(step1Data, null, 2) : step1Data}

■ ステップ2：相関関係とリスク分散効果の分析
${typeof step2Data === 'object' ? JSON.stringify(step2Data, null, 2) : step2Data}

■ ステップ3：予算制約下での購入戦略策定
${typeof step3Data === 'object' ? JSON.stringify(step3Data, null, 2) : step3Data}

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
      console.log('ステップ4プロンプト:\n', step4Prompt);
    }

    const step4Response = await fetchWithRetry('/api/gemini', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': getCsrfToken(),
      },
      credentials: 'same-origin',
      body: JSON.stringify({
        prompt: step4Prompt,
        model: 'gemini-2.0-flash-001',
        thought: false,
        apiVersion: 'v1alpha'
      })
    }) ?? throwError('ステップ4の最終出力の取得に失敗しました');
    const step4Data = await step4Response.json();

    // JSONコードブロック内のJSON部分を抽出してパースする
    if (!step4Data || !step4Data.strategy || !step4Data.strategy.description) {
      throw new Error('最終戦略のレスポンス形式が不正です');
    }
    let parsedStrategy: any;
    try {
      const jsonRegex = /```json\s*\n([\s\S]*?)\n```/;
      const match = jsonRegex.exec(step4Data.strategy.description);
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