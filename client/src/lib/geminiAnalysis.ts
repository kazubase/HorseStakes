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

// 簡素化したレスポンス型
export interface GeminiAnalysisResult {
  summary: {
    marketAnalysis?: string;
    keyInsights: Array<{
      strategy: string;
      details: string;
      expectedValue: string;
      riskLevel: string;
    } | string>;
  }
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
  // 入力値のバリデーション
  if (!input.horses || !Array.isArray(input.horses) || input.horses.length === 0) {
    throw new Error('出走馬データが無効です');
  }

  if (!input.bettingOptions || !Array.isArray(input.bettingOptions) || input.bettingOptions.length === 0) {
    throw new Error('馬券候補データが無効です');
  }

  if (typeof input.budget !== 'number' || input.budget < 100 || input.budget > 1000000) {
    throw new Error('予算が無効です');
  }

  if (typeof input.riskRatio !== 'number' || input.riskRatio < 2 || input.riskRatio > 20) {
    throw new Error('リスク選好度が無効です');
  }

  // データのサニタイズ
  const sanitizeText = (text: string): string => {
    return text
      .replace(/[<>]/g, '') // HTMLタグの除去
      .replace(/[`'"]/g, '') // クォートの除去
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // 制御文字の除去
      .trim();
  };

  // 出馬表情報の作成（サニタイズ済み）
  const raceCardInfo = input.horses
    .sort((a, b) => a.number - b.number)
    .map(horse => {
      const sanitizedName = sanitizeText(horse.name);
      return `${horse.frame}枠${horse.number}番 ${sanitizedName.padEnd(20)} 単勝予想${(horse.winProb * 100).toFixed(1).padStart(4)}%, 複勝予想${(horse.placeProb * 100).toFixed(1).padStart(4)}%`;
    })
    .join('\n');

  // 馬券候補一覧の作成（型安全な券種の定義）
  const types: Array<"単勝" | "複勝" | "枠連" | "ワイド" | "馬連" | "馬単" | "３連複" | "３連単"> = [
    "単勝", "複勝", "枠連", "ワイド", "馬連", "馬単", "３連複", "３連単"
  ];
  
  // 馬券候補のサニタイズと検証
  const bettingCandidatesList = types
    .map(type => {
      const candidates = input.bettingOptions
        .filter(bet => bet.type === type)
        .map(bet => {
          // 数値のバリデーション
          if (typeof bet.expectedReturn !== 'number' || bet.expectedReturn < 0) {
            throw new Error('期待値が無効です');
          }
          if (typeof bet.probability !== 'number' || bet.probability < 0 || bet.probability > 1) {
            throw new Error('確率が無効です');
          }
          if (typeof bet.stake !== 'number' || bet.stake <= 0) {
            throw new Error('投資額が無効です');
          }

          const expectedValue = bet.probability * bet.expectedReturn / bet.stake;
          const sanitizedHorseName = bet.horseName ? sanitizeText(bet.horseName) : '';
          return `${sanitizedHorseName} [オッズ:${(bet.expectedReturn / bet.stake).toFixed(1)}, 的中確率:${(bet.probability * 100).toFixed(1)}%, 期待値:${expectedValue.toFixed(2)}]`;
        })
        .join('\n');
      return candidates ? `\n${type}候補:\n${candidates}` : '';
    })
    .filter(section => section.length > 0)
    .join('\n');

  // 条件付き確率データの検証とサニタイズ
  if (input.correlations) {
    input.correlations.forEach(correlation => {
      if (typeof correlation.probability !== 'number' || 
          correlation.probability < 0 || 
          correlation.probability > 1) {
        throw new Error('条件付き確率が無効です');
      }
      if (!types.includes(correlation.condition.type as any) || 
          !types.includes(correlation.target.type as any)) {
        throw new Error('無効な券種が指定されています');
      }
    });
  }

  // 条件付き確率データの整形
  const typeOrder: Record<string, number> = {
    "単勝": 1,
    "複勝": 2,
    "枠連": 3,
    "ワイド": 4,
    "馬連": 5,
    "馬単": 6,
    "３連複": 7,
    "３連単": 8
  };

  const formattedCorrelations = input.correlations
    ?.sort((a, b) => {
      // まずtypeOrderに従ってtypeを比較
      const typeA = typeOrder[a.condition.type] || 999;
      const typeB = typeOrder[b.condition.type] || 999;
      if (typeA !== typeB) {
        return typeA - typeB;
      }

      // typeが同じ場合、対応する馬券候補から期待値を取得してソート
      const getBetExpectedValue = (condition: { type: string, horses: string }) => {
        const bet = input.bettingOptions.find(b => 
          b.type === condition.type && 
          b.horseName === condition.horses
        );
        if (!bet) return -1;
        return (bet.probability * bet.expectedReturn) / bet.stake;
      };

      const expectedValueA = getBetExpectedValue(a.condition);
      const expectedValueB = getBetExpectedValue(b.condition);

      // 期待値の降順でソート（大きい順）
      if (expectedValueA !== expectedValueB) {
        return expectedValueB - expectedValueA;
      }

      // 期待値が同じ場合はhorsesで比較
      return a.condition.horses.localeCompare(b.condition.horses);
    })
    .reduce((acc: string[], c, index, array) => {
      if (index === 0 || 
          array[index - 1].condition.type !== c.condition.type || 
          array[index - 1].condition.horses !== c.condition.horses) {
        acc.push(`\n■ ${c.condition.type}[${c.condition.horses}]が的中した場合：`);
      }
      
      acc.push(`・${c.target.type}[${c.target.horses}]の的中確率は${(c.probability * 100).toFixed(1)}%`);
      
      return acc;
    }, [])
    .join('\n') || '条件付き確率データなし';

  const prompt = `
# 競馬分析プロンプト

あなたは競馬分析の専門家で、プロの馬券アナリストとして行動してください。あなたの目標は、ユーザーにとって最も価値のある馬券購入戦略を導き出すことです。

## 1. 分析プロセス
- まず出馬表からユーザー予想確率を分析し、市場の認識と比較して割高/割安な馬を特定する
- 次に馬券候補リストから期待値の高い馬券を抽出し、その理由を明確に説明する
- 条件付き確率データを用いて、組み合わせ馬券の相関性を分析し、効率的な馬券組み合わせを発見する
- 最終的に3つの具体的な馬券戦略を提案し、それぞれの論理的根拠を示す

## 2. 出力フォーマット
以下の構造に厳密に従ったJSONを返してください：
{
  "summary": {
    "marketAnalysis": "全体的な市場分析の要約（100字以内）",
    "keyInsights": [
      {
        "strategy": "馬券戦略1の名称",
        "details": "馬券戦略1の詳細説明と根拠",
        "expectedValue": "期待値の数値と簡潔な説明",
        "riskLevel": "低/中/高のリスク評価"
      },
      {
        "strategy": "馬券戦略2の名称",
        "details": "馬券戦略2の詳細説明と根拠",
        "expectedValue": "期待値の数値と簡潔な説明",
        "riskLevel": "低/中/高のリスク評価"
      },
      {
        "strategy": "馬券戦略3の名称",
        "details": "馬券戦略3の詳細説明と根拠",
        "expectedValue": "期待値の数値と簡潔な説明",
        "riskLevel": "低/中/高のリスク評価"
      }
    ]
  }
}

## 3. 分析対象データ
【出馬表】
${raceCardInfo}

【馬券候補】
${bettingCandidatesList}

【条件付き確率】
${formattedCorrelations}

## 4. 分析の制約条件
- リスク分散のため、異なるタイプの馬券（単勝/複勝/馬連など）を含めることが望ましい
- 提案する戦略は具体的な馬番を含むこと
- 分析結果は客観的なデータに基づくものであり、「絶対に当たる」などの断定的表現は避ける

## 5. 思考プロセス
以下のステップで思考を進めてください：
a) 予想確率とオッズの乖離から割安な馬を特定
b) 的中確率と期待値のバランスを考慮した馬券候補のランク付け
c) 条件付き確率から相関性の高い/低い組み合わせを発見
d) 上記分析を総合した最適な馬券戦略の構築

それぞれのステップでの考察を明示した上で最終的な戦略を提案してください。

`;

  if (process.env.NODE_ENV === 'development') {
    // 改行を保持したまま出力する
    console.log('Gemini分析プロンプト:\n', prompt);
    
    // または長すぎる場合は要約情報のみ表示する
    console.log(`プロンプト長: ${prompt.length}文字, 出馬表: ${input.horses.length}頭, 馬券候補: ${input.bettingOptions.length}件`);
  }

  // レート制限の実装
  const rateLimitKey = 'gemini_analysis_last_request';
  const minRequestInterval = 1000; // 1秒
  const lastRequest = Number(localStorage.getItem(rateLimitKey)) || 0;
  const now = Date.now();
  
  if (now - lastRequest < minRequestInterval) {
    throw new Error('リクエストが頻繁すぎます。しばらく待ってから再試行してください。');
  }
  
  localStorage.setItem(rateLimitKey, String(now));

  // APIリクエストの実行
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
      apiVersion: 'v1alpha',
      maxTokens: 2048 // トークン数の制限
    })
  });

  if (!response) {
    throw new Error('分析結果の取得に失敗しました');
  }

  const data = await response.json();
  
  // JSONレスポンスのパース処理を改善
  try {
    // JSONコードブロックを探す（安全なパターンマッチング）
    const jsonRegex = /```(?:json)?\s*\n([\s\S]*?)\n```/;
    const match = jsonRegex.exec(data.strategy.description);
    
    if (!match || !match[1]) {
      console.error('Raw response:', data.strategy.description);
      throw new Error('JSONコードブロックが見つかりません');
    }

    let parsedData: GeminiAnalysisResult;
    
    try {
      parsedData = JSON.parse(match[1]);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Attempted to parse:', match[1]);
      throw new Error('JSONのパースに失敗しました');
    }

    // レスポンスの構造検証
    if (!parsedData.summary?.keyInsights?.length) {
      console.error('Invalid data structure:', parsedData);
      throw new Error('レスポンスの構造が不正です');
    }

    // 機密情報を除去したレスポンスを返す
    return {
      summary: {
        marketAnalysis: parsedData.summary.marketAnalysis,
        keyInsights: Array.isArray(parsedData.summary.keyInsights) 
          ? parsedData.summary.keyInsights.map(insight => {
              // オブジェクトの場合はそのまま返し、文字列の場合はそのまま返す
              return typeof insight === 'string' ? insight : {
                strategy: insight.strategy || '',
                details: insight.details || '',
                expectedValue: insight.expectedValue || '',
                riskLevel: insight.riskLevel || ''
              };
            })
          : ['分析結果の取得に失敗しました。']
      }
    };

  } catch (error: any) {
    // エラーログの記録（機密情報を除去）
    console.error('Gemini response parsing error:', {
      message: error.message,
      timestamp: new Date().toISOString()
    });
    
    return {
      summary: {
        keyInsights: ['分析結果の処理中にエラーが発生しました。']
      }
    };
  }
} 