import { type BetProposal, type HorseData, type BettingOption } from './betEvaluation';
import { calculateConditionalProbability } from './betConditionalProbability';

interface OptimizationInput {
  horses: HorseData[];
  bettingOptions: BettingOption[];
  budget: number;
  riskRatio: number;
  raceId: string;
}

interface CondProbInput {
  type: "単勝" | "複勝" | "枠連" | "ワイド" | "馬連" | "馬単" | "３連複" | "３連単";
  horses: string[];
  probability: number;
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

export const getAiOptimizedStrategy = async ({
  horses,
  bettingOptions,
  budget,
  riskRatio,
  raceId
}: OptimizationInput): Promise<BetProposal[]> => {
  try {
    // 条件付き確率の計算
    const conditionalProbabilities = calculateConditionalProbability(
      bettingOptions.map(opt => ({
        type: opt.type as "単勝" | "複勝" | "枠連" | "ワイド" | "馬連" | "馬単" | "３連複" | "３連単",
        horseName: opt.horseName,
        horses: [opt.horse1, opt.horse2, opt.horse3].filter(h => h > 0).map(String),
        stake: 0,
        expectedReturn: opt.odds * opt.prob,
        probability: opt.prob
      })),
      horses
    );

    const prompt = `
【ステップ1：馬券分析と最適化】

予算: ${budget}円
リスク選好度: ${riskRatio}（2-20の範囲、20が最もリスク許容度が高い）

【出馬表】
${horses.map(h => 
  `${h.number}番: ${h.name} (単勝率:${(h.winProb * 100).toFixed(1)}%, 複勝率:${(h.placeProb * 100).toFixed(1)}%)`
).join('\n')}

【馬券候補一覧】
${bettingOptions.map(opt => 
  `${opt.type}: ${opt.horseName} (オッズ:${opt.odds}, 期待値:${opt.ev})`
).join('\n')}

【条件付き確率分析】
${conditionalProbabilities.map(corr => 
  `${corr.condition.type}(${corr.condition.horses})が的中する場合の${corr.target.type}(${corr.target.horses})の確率: ${(corr.probability * 100).toFixed(1)}%`
).join('\n')}

以上のデータに基づき、最適な馬券ポートフォリオを提案してください。
レスポンスは以下のJSON形式で返してください：

{
  "recommendations": [
    {
      "type": "馬券種別",
      "horses": ["馬番"],
      "odds": オッズ,
      "probability": 的中確率,
      "stake": 投資額,
      "reason": "選択理由"
    }
  ]
}`;

    const response = await fetchWithRetry('/api/gemini', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': getCsrfToken(),
      },
      body: JSON.stringify({
        prompt,
        model: 'gemini-2.0-flash-001',
        temperature: 0.7,
        raceId: raceId,
        settings: {
          horses: horses.map(h => h.number),
          budget: budget,
          riskRatio: riskRatio
        }
      })
    });

    const data = await response.json();
    const recommendations = JSON.parse(data.text).recommendations;

    return recommendations.map((rec: any) => ({
      type: rec.type,
      horses: rec.horses,
      stake: rec.stake,
      expectedReturn: rec.odds * rec.stake,
      probability: rec.probability,
      reason: rec.reason,
      horse1: Number(rec.horses[0]) || 0,
      horse2: Number(rec.horses[1]) || 0,
      horse3: Number(rec.horses[2]) || 0
    }));

  } catch (error) {
    console.error('AI最適化エラー:', error);
    throw error;
  }
}; 