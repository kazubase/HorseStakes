export interface BettingCandidate {
  type: string;
  horseName?: string;
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
  horseName?: string;
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
  stake?: number;
  expectedReturn?: number;
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

import { getDefaultStore } from 'jotai';
import { geminiProgressAtom } from '@/stores/bettingStrategy';

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
    // 入力値のバリデーション
    if (!Array.isArray(bettingCandidates) || !bettingCandidates.length) {
      throw new Error('馬券候補が無効です');
    }
    
    if (totalBudget < 100 || totalBudget > 1000000) {
      throw new Error('予算が範囲外です');
    }
    
    if (riskRatio < 2 || riskRatio > 20) {
      throw new Error('リスクリワード比が範囲外です');
    }

    // プロンプトのサニタイズ
    const sanitizeText = (text: string): string => {
      return text
        .replace(/[<>]/g, '') // HTMLタグの除去
        .replace(/[`'"]/g, '') // クォートの除去
        .trim();
    };

    // 馬データのサニタイズ
    const sanitizedHorses = allBettingOptions.horses.map(horse => ({
      ...horse,
      name: sanitizeText(horse.name)
    }));

    // 出馬表情報の作成（サニタイズ済み）
    const raceCardInfo = sanitizedHorses
      .sort((a, b) => a.number - b.number)
      .map(horse => `${horse.frame}枠${horse.number}番 ${horse.name}`)
      .join('\n');

    // Jotaiのストアを取得
    const store = getDefaultStore();
    
    // 進捗状態を初期化
    store.set(geminiProgressAtom, {
      step: 0,
      message: 'AI最適化を開始します...',
      error: null
    });
    
    // correlationsをallBettingOptionsから取得
    const correlations = allBettingOptions.conditionalProbabilities || [];

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
    
    // 簡易的な相関情報を生成（ハイブリッドアプローチ用）
    const generateSimpleCorrelationInfo = (): string => {
      // 相関の強さによるグループ分け
      const strongCorrelations = correlations.filter(c => c.probability >= 0.7);
      const mediumCorrelations = correlations.filter(c => c.probability >= 0.4 && c.probability < 0.7);
      
      // 上位の相関情報のみを提供
      const topStrongCorrelations = strongCorrelations.slice(0, 5);
      const topMediumCorrelations = mediumCorrelations.slice(0, 5);
      
      let result = "【簡易相関情報】\n";
      
      if (topStrongCorrelations.length > 0) {
        result += "■ 強い相関関係（70%以上）:\n";
        topStrongCorrelations.forEach(c => {
          result += `・${c.condition.type}[${c.condition.horses}]が的中すると${c.target.type}[${c.target.horses}]の的中確率は${(c.probability * 100).toFixed(1)}%\n`;
        });
      }
      
      if (topMediumCorrelations.length > 0) {
        result += "\n■ 中程度の相関関係（40-70%）:\n";
        topMediumCorrelations.forEach(c => {
          result += `・${c.condition.type}[${c.condition.horses}]が的中すると${c.target.type}[${c.target.horses}]の的中確率は${(c.probability * 100).toFixed(1)}%\n`;
        });
      }
      
      return result;
    };
    
    const simpleCorrelationInfo = generateSimpleCorrelationInfo();

    /*
     * -------------------------
     * Step 1: 基本分析と有望馬券の選定（ハイブリッドアプローチ）
     * -------------------------
     */
    // ステップ1の進捗状態を更新
    store.set(geminiProgressAtom, {
      step: 1,
      message: '基本分析と有望馬券の選定中...',
      error: null
    });

    const step1Prompt = `【競馬AI分析：ステップ1 - 有望馬券の選定】

あなたは競馬分析の専門家です。以下の出馬表と馬券候補一覧から、最も有望な馬券を選定してください。

【リスクリワード比】
${riskRatio}/20（数値が大きいほど高リターンを求め、リスクを許容する。低いほど安定性重視）

【出馬表】
${raceCardInfo}

【馬券候補一覧】
${bettingCandidatesList}

【簡易相関情報】
${generateSimpleCorrelationInfo()}

【分析のポイント】
1. 期待値（オッズ×的中確率）が高い馬券を重視する
2. リスクリワード比（${riskRatio}/20）に応じた投資戦略を立てる
   - 数値が低い場合：的中率重視の安定志向
   - 数値が高い場合：高配当重視のハイリスク・ハイリターン志向
3. 簡易相関情報を活用して、相互に関連する馬券の評価を行う

【お願い】
1. 期待値、リスクリワード比、相関関係を総合的に分析してください
2. リスクリワード比に応じた馬券選択を行ってください
3. 最も有望な馬券を10点程度選定してください
4. 各馬券の選定理由と期待値を説明してください

【出力形式】
\`\`\`json
{
  "raceAnalysis": {
    "overview": "レース全体の分析（3文程度）",
    "keyFactors": ["重要なポイント1", "重要なポイント2", "..."],
    "betTypeEvaluation": [
      {
        "type": "券種名",
        "suitability": 1-10の数値（適合度）,
        "reason": "この券種が適している/適していない理由"
      }
    ]
  },
  "selectedBets": [
    {
      "type": "券種名",
      "horses": ["馬番"],
      "odds": オッズ,
      "probability": 的中確率（0-1の範囲）,
      "expectedValue": 期待値（オッズ×確率）,
      "riskLevel": "低" | "中" | "高",
      "reasoning": "選択理由"
    }
  ],
  "insights": [
    "分析から得られた洞察1",
    "分析から得られた洞察2",
    "..."
  ]
}
\`\`\`

【重要】
・期待値（オッズ×的中確率）を重視してください
・リスクリワード比（${riskRatio}/20）に応じた馬券選択を行ってください
・相関関係のある馬券の組み合わせを考慮してください`;

    if (process.env.NODE_ENV === 'development') {
      console.log('ステップ1プロンプト:\n', step1Prompt);
    }

    // リクエストのレート制限
    const rateLimitKey = 'gemini_api_last_request';
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
        prompt: step1Prompt,
        model: 'gemini-2.0-flash-001',
        thought: false,
        apiVersion: 'v1alpha',
        maxTokens: 2048 // トークン数の制限
      })
    });

    // レスポンスのバリデーション
    if (!response.ok) {
      throw new Error(`APIリクエストエラー: ${response.status}`);
    }

    const data = await response.json();
    
    // レスポンスデータの構造チェック
    if (!data || typeof data !== 'object') {
      throw new Error('無効なレスポンス形式です');
    }

    // JSONデータの抽出
    let step1Data;
    try {
      if (typeof data === 'string') {
        // JSONコードブロックを抽出
        const jsonMatch = data.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch && jsonMatch[1]) {
          step1Data = JSON.parse(jsonMatch[1]);
        } else {
          throw new Error('JSONデータが見つかりません');
        }
      } else {
        step1Data = data;
      }
      
      // デバッグ用にレスポンスを出力
      if (process.env.NODE_ENV === 'development') {
        console.log('ステップ1のレスポンス:', step1Data);
      }
      
      // step1Dataの構造を検証し、必要に応じて修正
      if (!step1Data || typeof step1Data !== 'object') {
        throw new Error('無効なレスポンス形式です');
      }
      
      // selectedBetsが存在しない場合の対応
      if (!step1Data.selectedBets || !Array.isArray(step1Data.selectedBets)) {
        // 代替方法：raceAnalysisとbetTypeEvaluationから有望な馬券を抽出
        if (step1Data.raceAnalysis && step1Data.raceAnalysis.betTypeEvaluation) {
          console.warn('selectedBetsが見つからないため、代替データを生成します');
          
          // 最も適合性の高い券種を抽出
          const promisingBetTypes = step1Data.raceAnalysis.betTypeEvaluation
            .filter((bet: any) => bet.suitability >= 7) // 適合性7以上を抽出
            .map((bet: any) => bet.type);
          
          // 代替のselectedBets配列を生成
          step1Data.selectedBets = allBettingOptions.bettingOptions
            .filter(opt => promisingBetTypes.includes(opt.type))
            .slice(0, 10) // 上位10件に制限
            .map(opt => ({
              type: opt.type,
              horses: opt.horseName?.split('-') || [],
              odds: opt.odds,
              probability: opt.prob,
              expectedValue: opt.odds * opt.prob,
              riskLevel: opt.odds > 10 ? "高" : (opt.odds > 5 ? "中" : "低"),
              reasoning: `期待値: ${(opt.odds * opt.prob).toFixed(2)}`
            }));
        } else {
          // 最低限のデータがない場合は、期待値の高い馬券を自動選択
          console.warn('分析データが不十分なため、期待値の高い馬券を自動選択します');
          
          step1Data.selectedBets = allBettingOptions.bettingOptions
            .sort((a, b) => (b.odds * b.prob) - (a.odds * a.prob)) // 期待値で降順ソート
            .slice(0, 10) // 上位10件を選択
            .map(opt => ({
              type: opt.type,
              horses: opt.horseName?.split('-') || [],
              odds: opt.odds,
              probability: opt.prob,
              expectedValue: opt.odds * opt.prob,
              riskLevel: opt.odds > 10 ? "高" : (opt.odds > 5 ? "中" : "低"),
              reasoning: `期待値: ${(opt.odds * opt.prob).toFixed(2)}`
            }));
        }
        
        if (!step1Data.selectedBets || step1Data.selectedBets.length === 0) {
          throw new Error('有効な馬券選択を生成できませんでした');
        }
      }
    } catch (error: any) {
      throw new Error(`ステップ1のデータ解析に失敗: ${error.message}`);
    }

    // 条件付き確率一覧を生成（詳細版）
    const generateDetailedCorrelationText = (selectedBets: any[]): string => {
      // selectedBetsが存在しない場合の対応を追加
      if (!selectedBets || !Array.isArray(selectedBets) || selectedBets.length === 0) {
        return '選択された馬券データがありません';
      }
      
      if (!correlations || correlations.length === 0) {
        return '条件付き確率データなし';
      }
      
      // 選択された馬券に関連する条件付き確率のみをフィルタリング
      const relevantCorrelations = correlations.filter(corr => {
        // 条件または対象が選択された馬券に含まれているかチェック
        return selectedBets.some(bet => 
          (bet.type === corr.condition.type && bet.horses.join('-') === corr.condition.horses) ||
          (bet.type === corr.target.type && bet.horses.join('-') === corr.target.horses)
        );
      });
      
      if (relevantCorrelations.length === 0) {
        return '選択された馬券に関連する条件付き確率データはありません';
      }
      
      // 条件付き確率を整形
      return relevantCorrelations.reduce((acc: string[], corr, index, array) => {
        if (index === 0 || 
            array[index - 1].condition.type !== corr.condition.type || 
            array[index - 1].condition.horses !== corr.condition.horses) {
          acc.push(`\n■ ${corr.condition.type}[${corr.condition.horses}]が的中した場合：`);
        }
        
        acc.push(`・${corr.target.type}[${corr.target.horses}]の的中確率は${(corr.probability * 100).toFixed(1)}%`);
        
        return acc;
      }, []).join('\n');
    };

    const detailedCorrelationText = generateDetailedCorrelationText(step1Data.selectedBets);

    /*
     * -------------------------
     * Step 2: 詳細分析と最終戦略策定
     * -------------------------
     */
    // ステップ2の進捗状態を更新
    store.set(geminiProgressAtom, {
      step: 2,
      message: '詳細分析と最終戦略を策定中...',
      error: null
    });

    const step2Prompt = `【競馬AI分析：ステップ2 - 詳細分析と最終戦略策定】

あなたは競馬分析と投資戦略の専門家です。ステップ1で選定した有望馬券と詳細な条件付き確率データを基に、最終的な馬券購入戦略を策定してください。

【予算】
${totalBudget.toLocaleString()}円

【リスクリワード比】
${riskRatio}/20（数値が大きいほど高リターンを求め、リスクを許容する。低いほど安定性重視）

【ステップ1の分析結果】
${JSON.stringify(step1Data, null, 2)}

【詳細な条件付き確率データ】
${detailedCorrelationText}

【戦略策定のポイント】
1. 予算${totalBudget.toLocaleString()}円を最適に配分する
2. リスクリワード比（${riskRatio}/20）に応じた投資戦略を立てる
   - 数値が低い場合：的中率重視の安定志向の投資配分
   - 数値が高い場合：高配当重視のハイリスク・ハイリターン志向の投資配分
3. 条件付き確率データを活用して相関関係を考慮する
4. 期待値とリスクのバランスを最適化する

【お願い】
1. まず、条件付き確率データを踏まえて、ステップ1で選定した馬券の再評価を行ってください
2. 次に、予算配分を含めた具体的な購入戦略を策定してください
3. 戦略の根拠と期待される結果を説明してください
4. 最後に、戦略全体のリスクレベルと期待リターンを評価してください

【出力形式】
\`\`\`json
{
  "strategy": {
    "description": "戦略の概要（3文以内）",
    "recommendations": [
      {
        "type": "券種名",
        "horses": ["馬番"],
        "stake": 投資額（円）,
        "odds": オッズ,
        "probability": 的中確率（0-1の範囲）,
        "expectedReturn": 期待リターン（円）,
        "reason": "選択理由と投資額の根拠"
      }
    ],
    "summary": {
      "riskLevel": "低" | "中" | "高" | "AI_OPTIMIZED",
      "description": "戦略全体の特徴と期待される結果"
    }
  }
}
\`\`\`

【重要】
・条件付き確率データを活用して、馬券間の相関関係を考慮した戦略を立ててください
・リスクリワード比（${riskRatio}/20）に応じた予算配分を行ってください
  - 低い値：少額を多数の馬券に分散投資
  - 高い値：高配当馬券に集中投資
・期待値の高い馬券に重点的に投資しつつも、適切なリスク分散を心がけてください
・投資額の合計が予算（${totalBudget.toLocaleString()}円）を超えないようにしてください
・各馬券の投資額は100円単位としてください`;

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

    // JSONデータの抽出
    let finalStrategy;
    try {
      if (typeof step2Data === 'string') {
        // JSONコードブロックを抽出
        const jsonMatch = step2Data.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch && jsonMatch[1]) {
          finalStrategy = JSON.parse(jsonMatch[1]);
        } else {
          throw new Error('JSONデータが見つかりません');
        }
      } else {
        finalStrategy = step2Data;
      }
      
      // デバッグ用にレスポンスを出力
      if (process.env.NODE_ENV === 'development') {
        console.log('最終戦略（生データ）：', finalStrategy);
      }
      
      // 入れ子になったJSONの処理
      if (finalStrategy.strategy && typeof finalStrategy.strategy.description === 'string') {
        // descriptionがJSON文字列になっている場合の処理
        const nestedJsonMatch = finalStrategy.strategy.description.match(/```json\s*([\s\S]*?)\s*```/);
        if (nestedJsonMatch && nestedJsonMatch[1]) {
          try {
            const nestedData = JSON.parse(nestedJsonMatch[1]);
            if (nestedData.strategy) {
              console.log('入れ子になったJSONを検出しました。展開します。');
              finalStrategy = nestedData;
            }
          } catch (e) {
            console.warn('入れ子JSONのパースに失敗しましたが、処理を続行します:', e);
          }
        }
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log('最終戦略（処理後）：', finalStrategy);
      }
      
      // 必要なプロパティの存在確認と修正
      if (!finalStrategy || !finalStrategy.strategy) {
        throw new Error('最終戦略データが不正です');
      }
      
      // 必要なプロパティが存在しない場合のデフォルト値設定
      if (!finalStrategy.strategy.description) {
        finalStrategy.strategy.description = "AI最適化による馬券戦略";
      }
      
      if (!finalStrategy.strategy.recommendations || !Array.isArray(finalStrategy.strategy.recommendations) || finalStrategy.strategy.recommendations.length === 0) {
        // step1Dataから推奨を生成
        console.warn('最終戦略に推奨馬券がないため、ステップ1のデータから生成します');
        
        // 予算を均等配分（最低100円）
        const totalBets = Math.min(step1Data.selectedBets.length, 10);
        const baseStake = Math.floor(totalBudget / totalBets / 100) * 100;
        
        finalStrategy.strategy.recommendations = step1Data.selectedBets
          .slice(0, 10)
          .map((bet: any, index: number) => ({
            type: bet.type,
            horses: Array.isArray(bet.horses) ? bet.horses : [bet.horses],
            odds: bet.odds,
            probability: bet.probability,
            stake: baseStake,
            expectedReturn: Math.round(baseStake * bet.odds * bet.probability),
            reason: bet.reasoning || `期待値: ${(bet.odds * bet.probability).toFixed(2)}`
          }));
      }
      
      if (!finalStrategy.strategy.summary) {
        finalStrategy.strategy.summary = {
          riskLevel: "AI_OPTIMIZED",
          description: "AIによる最適化戦略。期待値の高い馬券を中心に予算を配分しています。"
        };
      } else if (!finalStrategy.strategy.summary.description) {
        finalStrategy.strategy.summary.description = "AIによる最適化戦略。期待値の高い馬券を中心に予算を配分しています。";
      }
      
    } catch (error: any) {
      throw new Error(`最終戦略のデータ解析に失敗: ${error.message}`);
    }

    // 完了状態に更新
    store.set(geminiProgressAtom, {
      step: 3,
      message: '資金配分最適化中...',
      error: null
    });

    return {
      strategy: {
        description: finalStrategy.strategy.description,
        recommendations: finalStrategy.strategy.recommendations.map((rec: any) => ({
          type: rec.type,
          horses: Array.isArray(rec.horses) ? rec.horses : [rec.horses],
          odds: rec.odds,
          probability: rec.probability,
          reason: rec.reason,
          stake: rec.stake,
          expectedReturn: rec.expectedReturn || Math.round(rec.stake * rec.odds * rec.probability)
        })),
        bettingTable: {
          headers: ['券種', '買い目', 'オッズ', '的中率', '投資額', '期待収益'],
          rows: finalStrategy.strategy.recommendations.map((rec: any) => [
            rec.type,
            Array.isArray(rec.horses) ? rec.horses.join('-') : rec.horses,
            String(rec.odds),
            typeof rec.probability === 'number'
              ? (rec.probability * 100).toFixed(1) + '%'
              : rec.probability,
            `${rec.stake.toLocaleString()}円`,
            `${(rec.expectedReturn || Math.round(rec.stake * rec.odds * rec.probability)).toLocaleString()}円`
          ])
        },
        summary: {
          riskLevel: 'AI_OPTIMIZED',
          description: finalStrategy.strategy.summary.description
        }
      }
    };
  } catch (error: any) {
    // エラーログの記録（機密情報を除去）
    console.error('Gemini APIエラー:', {
      message: error.message,
      timestamp: new Date().toISOString()
    });
    
    throw new Error(`Gemini APIエラー: ${error.message}`);
  }
};

// ヘルパー関数
function throwError(message: string): never {
  throw new Error(message);
} 