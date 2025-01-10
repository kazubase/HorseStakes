import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { races, horses, tickets, bettingStrategies, oddsHistory } from "../db/schema";
import { eq } from "drizzle-orm";
import { inArray } from "drizzle-orm/expressions";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export function registerRoutes(app: Express): Server {
  // デモ用の出馬表データを挿入
  app.post("/api/demo-data", async (_req, res) => {
    try {
      // 既存のデータを削除
      await db.delete(horses);
      await db.delete(races);

      // レースを作成
      const demoRaces = await db.insert(races).values([
        { name: "1R", venue: "tokyo", startTime: new Date("2024-02-04T09:00:00"), status: "upcoming" },
        { name: "2R", venue: "tokyo", startTime: new Date("2024-02-04T09:30:00"), status: "upcoming" },
        { name: "3R", venue: "nakayama", startTime: new Date("2024-02-04T10:00:00"), status: "upcoming" }
      ]).returning();

      // 出走馬データを準備
      const demoHorses = [
        { name: "ディープインパクト", odds: "2.4", raceId: demoRaces[0].id },
        { name: "キタサンブラック", odds: "3.1", raceId: demoRaces[0].id },
        { name: "オルフェーヴル", odds: "4.2", raceId: demoRaces[0].id },
        { name: "シンボリルドルフ", odds: "5.6", raceId: demoRaces[0].id },
        { name: "アグネスタキオン", odds: "6.8", raceId: demoRaces[0].id },
        { name: "メジロマックイーン", odds: "8.2", raceId: demoRaces[0].id },
        { name: "ナリタブライアン", odds: "12.4", raceId: demoRaces[0].id },
        { name: "トウカイテイオー", odds: "15.0", raceId: demoRaces[0].id },
        // 2Rの出走馬
        { name: "テイエムオペラオー", odds: "2.8", raceId: demoRaces[1].id },
        { name: "スペシャルウィーク", odds: "3.5", raceId: demoRaces[1].id },
        { name: "マルゼンスキー", odds: "4.8", raceId: demoRaces[1].id },
        { name: "アドマイヤベガ", odds: "6.2", raceId: demoRaces[1].id },
        { name: "グラスワンダー", odds: "7.5", raceId: demoRaces[1].id },
        { name: "エアグルーヴ", odds: "9.3", raceId: demoRaces[1].id },
        // 3Rの出走馬
        { name: "トウカイテイオー", odds: "2.9", raceId: demoRaces[2].id },
        { name: "ウオッカ", odds: "3.7", raceId: demoRaces[2].id },
        { name: "タイキシャトル", odds: "5.1", raceId: demoRaces[2].id },
        { name: "サイレンススズカ", odds: "6.4", raceId: demoRaces[2].id },
        { name: "ハルウララ", odds: "15.0", raceId: demoRaces[2].id },
        { name: "メイショウドトウ", odds: "8.8", raceId: demoRaces[2].id }
      ];

      // 出走馬を挿入
      await db.insert(horses).values(demoHorses);

      res.json({ message: "Demo data inserted successfully" });
    } catch (error) {
      console.error('Error inserting demo data:', error);
      res.status(500).json({ error: "Failed to insert demo data" });
    }
  });

  // 全レース一覧を取得
  app.get("/api/races", async (_req, res) => {
    const allRaces = await db.select().from(races);
    res.json(allRaces);
  });

  // 特定のレースを取得
  app.get("/api/races/:id", async (req, res) => {
    const raceId = parseInt(req.params.id);
    const race = await db.query.races.findFirst({
      where: eq(races.id, raceId),
    });

    if (!race) {
      return res.status(404).json({ message: "Race not found" });
    }

    res.json(race);
  });

  // レースの出馬表を取得
  app.get("/api/horses/:raceId", async (req, res) => {
    const raceId = parseInt(req.params.raceId);
    const raceHorses = await db
      .select()
      .from(horses)
      .where(eq(horses.raceId, raceId));

    res.json(raceHorses);
  });

  // オッズ履歴を取得
  app.get("/api/odds-history/:raceId/:horseName", async (req, res) => {
    try {
      // TODO: 実際のデータベースからオッズ履歴を取得する実装
      // 現在はデモデータを返す
      const currentTime = new Date();
      const demoData = Array.from({ length: 12 }, (_, i) => {
        const timestamp = new Date(currentTime.getTime() - (11 - i) * 5 * 60000);
        return {
          timestamp: timestamp.toISOString(),
          odds: 3 + Math.random() * 2
        };
      });

      res.json(demoData);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch odds history" });
    }
  });

  // 既存のエンドポイント
  app.post("/api/tickets", async (req, res) => {
    const ticket = await db.insert(tickets).values(req.body).returning();
    res.json(ticket[0]);
  });

  app.get("/api/betting-strategies", async (_req, res) => {
    const strategies = await db.select().from(bettingStrategies);
    res.json(strategies);
  });

  // リスク評価エンドポイント
  app.get("/api/risk-assessment", async (req, res) => {
    try {
      // TODO: 実際のリスク計算アルゴリズムを実装する
      // 現在は、毎回少しずつ変わる強化されたモックデータを返す
      const baseRisk = 65 + Math.random() * 10 - 5;
      const baseVolatility = 72 + Math.random() * 10 - 5;
      const baseWinProb = 45 + Math.random() * 10 - 5;

      const marketSentiment = baseRisk < 50 ? "強気" :
                            baseRisk < 70 ? "やや強気" :
                            baseRisk < 85 ? "やや弱気" : "弱気";

      res.json({
        overallRisk: Math.min(100, Math.max(0, baseRisk)),
        volatilityScore: Math.min(100, Math.max(0, baseVolatility)),
        expectedReturn: 2.5 + Math.random(),
        winProbability: Math.min(100, Math.max(0, baseWinProb)),
        marketSentiment,
        riskFactors: [
          {
            description: "市場の変動性が高い",
            impact: Math.min(100, Math.max(0, 75 + Math.random() * 10 - 5))
          },
          {
            description: "競合が激しい",
            impact: Math.min(100, Math.max(0, 65 + Math.random() * 10 - 5))
          },
          {
            description: "天候の影響",
            impact: Math.min(100, Math.max(0, 45 + Math.random() * 10 - 5))
          }
        ],
        marketTrend: Math.random() > 0.5 ? 'up' : 'down',
        recommendations: [
          "投資の分散化を検討してください",
          "高リスクの投資を制限することをお勧めします",
          "市場の変動に注意を払ってください"
        ]
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to calculate risk assessment" });
    }
  });

  // 馬券購入戦略を取得するエンドポイント
  app.get("/api/betting-strategy/:raceId", async (req, res) => {
    try {
      const raceId = parseInt(req.params.raceId);
      const budget = Number(req.query.budget) || 0;
      const riskRatio = Number(req.query.riskRatio) || 1;
      const winProbs = JSON.parse(req.query.winProbs as string || "{}");
      const placeProbs = JSON.parse(req.query.placeProbs as string || "{}");

      // レース情報と出走馬を取得
      const raceHorses = await db
        .select()
        .from(horses)
        .where(eq(horses.raceId, raceId));

      // 期待値計算
      const strategies = [];
      
      // 単勝の期待値計算
      for (const horse of raceHorses) {
        const winProb = winProbs[horse.id] / 100;
        if (winProb > 0) {
          const ev = winProb * Number(horse.odds);
          if (ev > 1) {
            strategies.push({
              type: "単勝",
              horses: [horse.name],
              stake: Math.floor(budget * (ev - 1) / riskRatio),
              expectedReturn: Math.floor(budget * (ev - 1) / riskRatio * Number(horse.odds)),
              probability: winProb
            });
          }
        }
      }

      // 複勝の期待値計算
      for (const horse of raceHorses) {
        const placeProb = placeProbs[horse.id] / 100;
        if (placeProb > 0) {
          // 複勝オッズは単勝の1/2程度と仮定
          const placeOdds = Number(horse.odds) * 0.5;
          const ev = placeProb * placeOdds;
          if (ev > 1) {
            strategies.push({
              type: "複勝",
              horses: [horse.name],
              stake: Math.floor(budget * (ev - 1) / riskRatio),
              expectedReturn: Math.floor(budget * (ev - 1) / riskRatio * placeOdds),
              probability: placeProb
            });
          }
        }
      }

      // 期待値が高い順にソート
      strategies.sort((a, b) => 
        (b.expectedReturn * b.probability) - (a.expectedReturn * a.probability)
      );

      res.json(strategies);
    } catch (error) {
      res.status(500).json({ error: "Failed to calculate betting strategy" });
    }
  });

  // AIによる馬券戦略説明を生成するエンドポイント
  app.get("/api/betting-explanation/:raceId", async (req, res) => {
    try {
      const raceId = parseInt(req.params.raceId);

      // レース情報と出走馬を取得
      const race = await db.query.races.findFirst({
        where: eq(races.id, raceId),
      });

      const raceHorses = await db
        .select()
        .from(horses)
        .where(eq(horses.raceId, raceId));

      if (!race || !raceHorses.length) {
        return res.status(404).json({ message: "Race not found" });
      }

      // AIによる説明生成
      const prompt = `
以下のレース情報を基に、推奨される馬券戦略について説明してください：

レース: ${race.name} (${race.venue})
出走馬:
${raceHorses.map(horse => `- ${horse.name} (オッズ: ${horse.odds})`).join('\n')}

回答は以下の観点を含めてください：
1. 期待値の高い馬券種の選択理由
2. 投資配分の根拠
3. リスク要因の分析
`;
      const result = await model.generateContent([
        "あなたは競馬予想のエキスパートです。統計データとオッズを分析し、最適な馬券戦略を提案してください。\n\n" + prompt
      ]);
      const response = result.response;

      const explanation = {
        mainExplanation: response.text(),
        confidence: 85 + Math.random() * 10, // デモ用の確信度
        timestamp: new Date().toISOString()
      };

      res.json(explanation);
    } catch (error) {
      console.error('Error generating explanation:', error);
      res.status(500).json({ error: "Failed to generate betting explanation" });
    }
  });

  // 既存の /api/betting-explanation/:raceId エンドポイントの後にこのエンドポイントを追加してください
  app.get("/api/betting-explanation/:raceId/detail", async (req, res) => {
    try {
      const raceId = parseInt(req.params.raceId);

      // レース情報と出走馬を取得
      const race = await db.query.races.findFirst({
        where: eq(races.id, raceId),
      });

      const raceHorses = await db
        .select()
        .from(horses)
        .where(eq(horses.raceId, raceId));

      if (!race || !raceHorses.length) {
        return res.status(404).json({ message: "Race not found" });
      }

      // AIによる詳細説明生成
      const prompt = `
以下のレース情報を基に、推奨される馬券戦略について詳細な分析を行ってください。
各セクションごとに明確に分けて回答してください：

レース: ${race.name} (${race.venue})
出走馬:
${raceHorses.map(horse => `- ${horse.name} (オッズ: ${horse.odds})`).join('\n')}

分析項目：

1. 概要
全体的な戦略の要約と推奨される投資アプローチについて説明してください。

2. 出走馬の実力分析
各馬の特徴、適性、コンディション、期待される走りを分析してください。

3. オッズ分析
現在のオッズが適正か、割高か割安か、期待値の観点から分析してください。

4. 投資判断の根拠
なぜこの投資戦略が最適なのか、具体的な根拠を示してください。

5. 想定されるリスク
考えられるリスクシナリオと、それに対する対策を説明してください。

6. 代替アプローチ
他に考えられる投資戦略とその特徴について説明してください。

各セクションは明確に分かれるように記述し、具体的な数値や根拠を含めてください。
`;

      const completion = await GoogleGenerativeAI.chat.completions.create({

        model: "gemini-1.5-flash",
        messages: [
          {
            role: "system",
            content: "あなたは競馬予想の専門家です。統計データとオッズを分析し、詳細な戦略分析を提供してください。各セクションを明確に分けて説明し、具体的な数値や根拠を示してください。"
          },
          {
            role: "user",
            content: prompt
          }
        ]
      });

      // AIの回答を各セクションに分割
      const response = completion.choices[0].message.content;
      const sections = response.split(/\d+\.\s+/);

      const explanation = {
        detailedExplanation: sections[1]?.trim() || "分析を生成できませんでした。",
        analysisPoints: {
          horsePotential: sections[2]?.trim() || "データなし",
          oddsAnalysis: sections[3]?.trim() || "データなし",
          investmentLogic: sections[4]?.trim() || "データなし",
          riskScenarios: sections[5]?.trim() || "データなし",
          alternativeApproaches: sections[6]?.trim() || "データなし",
        },
        confidence: 85 + Math.random() * 10,
        timestamp: new Date().toISOString()
      };

      res.json(explanation);
    } catch (error) {
      console.error('Error generating detailed explanation:', error);
      res.status(500).json({ error: "Failed to generate detailed betting explanation" });
    }
  });

  // 既存の馬券戦略説明エンドポイントの後にこのエンドポイントを追加
  app.get("/api/betting-explanation/:raceId/history", async (req, res) => {
    try {
      const raceId = parseInt(req.params.raceId);

      // TODO: 実際のバックテストロジックを実装
      // 現在はデモデータを返す
      const backtestResult = {
        summary: "過去6ヶ月間の類似レースにおける戦略のバックテスト結果です。全体として良好なパフォーマンスを示しており、特に安定した的中率が特徴です。ただし、直近の市場環境の変化による影響には注意が必要です。",
        performanceMetrics: {
          totalRaces: 248,
          winRate: 42.3,
          roiPercent: 15.8,
          avgReturnMultiple: 1.158,
          maxDrawdown: 12.4
        },
        monthlyPerformance: [
          { month: "2023年12月", races: 42, winRate: 45.2, roi: 18.5 },
          { month: "2023年11月", races: 38, winRate: 42.1, roi: 15.2 },
          { month: "2023年10月", races: 44, winRate: 40.9, roi: 14.8 },
          { month: "2023年9月", races: 40, winRate: 43.5, roi: 16.9 },
          { month: "2023年8月", races: 41, winRate: 41.4, roi: 13.7 },
          { month: "2023年7月", races: 43, winRate: 40.8, roi: 15.6 }
        ],
        strategyAnalysis: [
          {
            description: "オッズ分析に基づく投資判断",
            effectiveness: 85
          },
          {
            description: "リスク分散戦略",
            effectiveness: 78
          },
          {
            description: "市場変動への対応",
            effectiveness: 72
          },
          {
            description: "複数の馬券種の組み合わせ",
            effectiveness: 68
          }
        ],
        timestamp: new Date().toISOString()
      };

      res.json(backtestResult);
    } catch (error) {
      console.error('Error generating backtest analysis:', error);
      res.status(500).json({ error: "Failed to generate backtest analysis" });
    }
  });

  // 既存の馬券戦略説明エンドポイントの後にこのエンドポイントを追加
  app.get("/api/betting-explanation/:raceId/alternatives", async (req, res) => {
    try {
      const raceId = parseInt(req.params.raceId);

      // TODO: 実際の代替戦略生成ロジックを実装
      // 現在はデモデータを返す
      const alternativesResult = {
        summary: "現行の戦略に対する3つの代替アプローチを提案します。各戦略は異なるリスク・リターンプロファイルを持ち、投資スタイルや予算に応じて選択できます。以下の提案は、現在のマーケット状況と過去のパフォーマンスデータに基づいています。",
        strategies: [
          {
            name: "保守的分散投資戦略",
            description: "リスクを最小限に抑えながら、安定した収益を目指す戦略です。複数の馬券種を組み合わせることで、リスクを分散します。",
            expectedReturn: 1.8,
            winProbability: 65.5,
            riskLevel: 35,
            advantages: [
              "安定した的中率",
              "損失リスクが低い",
              "長期的な資金管理が容易"
            ],
            disadvantages: [
              "期待リターンが比較的低い",
              "大きな利益を得にくい",
              "市場の好機を活かしきれない可能性"
            ],
            requiredBudget: 5000
          },
          {
            name: "高リターン重視戦略",
            description: "より大きな利益を目指し、やや高めのリスクを取る戦略です。オッズの割安な馬券を中心に投資します。",
            expectedReturn: 3.2,
            winProbability: 35.5,
            riskLevel: 75,
            advantages: [
              "高い期待リターン",
              "市場の非効率性を活用",
              "大きな利益の可能性"
            ],
            disadvantages: [
              "的中率が比較的低い",
              "損失リスクが高い",
              "資金管理が重要"
            ],
            requiredBudget: 10000
          },
          {
            name: "バランス型戦略",
            description: "リスクとリターンのバランスを取りながら、中長期的な収益を目指す戦略です。",
            expectedReturn: 2.4,
            winProbability: 48.5,
            riskLevel: 55,
            advantages: [
              "リスクとリターンのバランスが良い",
              "柔軟な投資が可能",
              "市場変動への適応力が高い"
            ],
            disadvantages: [
              "特定の状況で機会損失の可能性",
              "運用の複雑さ",
              "中程度の資金が必要"
            ],
            requiredBudget: 7000
          }
        ],
        comparisonMetrics: [
          {
            description: "期待的中率",
            currentStrategy: 45.5,
            alternativeStrategy: 48.5
          },
          {
            description: "リスク指標",
            currentStrategy: 65.0,
            alternativeStrategy: 55.0
          },
          {
            description: "期待ROI",
            currentStrategy: 15.5,
            alternativeStrategy: 18.5
          }
        ],
        recommendations: [
          "現在の市場環境ではバランス型戦略が最適と考えられます",
          "保守的な投資から開始し、徐々にリスクを調整することを推奨します",
          "定期的な戦略の見直しと調整を行うことで、より良い結果が期待できます"
        ],
        timestamp: new Date().toISOString()
      };

      res.json(alternativesResult);
    } catch (error) {
      console.error('Error generating alternative strategies:', error);
      res.status(500).json({ error: "Failed to generate alternative strategies" });
    }
  });

  app.get("/api/odds-history/:raceId", async (req, res) => {
    try {
      const raceId = parseInt(req.params.raceId);
      const raceHorses = await db.select()
        .from(horses)
        .where(eq(horses.raceId, raceId));

      const oddsHistoryData = await db.select()
        .from(oddsHistory)
        .where(inArray(oddsHistory.horseId, raceHorses.map(h => h.id)))
        .orderBy(oddsHistory.timestamp);

      res.json(oddsHistoryData);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch odds history" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}