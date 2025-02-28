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
    .map(horse => `${horse.frame}枠${horse.number}番 ${horse.name.padEnd(20)} 単勝予想${(horse.winProb * 100).toFixed(1).padStart(4)}%, 複勝予想${(horse.placeProb * 100).toFixed(1).padStart(4)}%`)
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
あなたは馬券専門のアナリストです。以下の分析の観点に従って、分析を行ってください。


1. 分析の観点
- 出馬表に記載されている、各馬に対するユーザーの予想確率から、ユーザーがどの馬に期待しているのかを理解する
- 馬券候補から期待値の高い馬券をいくつか探し出す。ここで、的中確率も考慮する
- 馬券候補から見つけ出した有望な馬券候補の条件付き確率から、適度に相関がある馬券候補を見つけ出す
- 上記の分析フローを3回繰り返し、ユーザーにとって最も価値のある馬券候補に対して興味深い考察を行う

2. 出力フォーマット
以下の構造に厳密に従ったJSONを返してください：

{
  "summary": {
    "keyInsights": [
      "馬券１に対する考察",
      "馬券２に対する考察",
      "馬券３に対する考察"
    ]
  }
}

3. 分析対象データ
【出馬表】
${raceCardInfo}

【馬券候補】
${bettingCandidatesList}

【条件付き確率】
${formattedCorrelations}

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