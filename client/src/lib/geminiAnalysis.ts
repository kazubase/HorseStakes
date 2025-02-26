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
    keyInsights: string[];
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

  // 条件付き確率データの整形
  const formattedCorrelations = input.correlations?.map(c => {
    return `条件「${c.condition.type}[${c.condition.horses}]」が的中した場合、
「${c.target.type}[${c.target.horses}]」の的中確率は${(c.probability * 100).toFixed(1)}%`;
  }).join('\n') || '条件付き確率データなし';

  const prompt = `
【レース分析依頼】

以下のデータから、人間が見落としがちな重要な洞察を2つ程度抽出してください。
特に、データ間の関連性や隠れたパターンに注目し、実践的で価値のある分析をお願いします。

1. 分析対象データ
出馬表：
${raceCardInfo}

期待値データ：
${bettingCandidatesList}

条件付き確率：
${formattedCorrelations}

2. 分析の観点
- オッズと予想確率の不整合から見える投資機会
- 馬の特徴や過去実績からの示唆
- 条件付き確率から見える隠れた相関関係
- 通常見落とされがちな統計的パターン
- 市場の過小評価・過大評価の可能性
- データ間の矛盾や特異な点

3. 返却フォーマット
以下の構造に厳密に従ったJSONを返してください：

{
  "summary": {
    "keyInsights": [
      "具体的な数値や根拠を含む重要な発見",
      "見落としがちなパターンや機会",
      "統計的に有意な相関や傾向",
      "市場の誤評価の可能性",
      "実践的な示唆"
    ]
  }
}

4. 分析の注意点：
- 表面的な分析は避け、深い洞察を提供してください
- 具体的な数値や根拠を含めてください
- 実践的で活用可能な示唆を心がけてください
- 人間が見落としがちな観点を重視してください
- 各洞察は明確で具体的な内容にしてください
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
  
  // JSONレスポンスのパース処理を改善
  try {
    // JSONコードブロックを探す
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

    // 必要な構造の検証
    if (!parsedData.summary?.keyInsights?.length) {
      console.error('Invalid data structure:', parsedData);
      throw new Error('レスポンスの構造が不正です');
    }

    return {
      summary: {
        keyInsights: parsedData.summary.keyInsights
      }
    };

  } catch (error: any) {
    console.error('Gemini response parsing error:', error);
    // フォールバック: エラーメッセージを洞察として返す
    return {
      summary: {
        keyInsights: ['分析結果の処理中にエラーが発生しました。']
      }
    };
  }
} 