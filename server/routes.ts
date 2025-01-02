import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { races, horses, tickets, bettingStrategies } from "@db/schema";
import { eq } from "drizzle-orm";
import OpenAI from "openai";

const openai = new OpenAI();

export function registerRoutes(app: Express): Server {
  // デモ用の出馬表データを挿入
  app.post("/api/demo-data", async (_req, res) => {
    try {
      await db.delete(horses);
      await db.delete(races);

      const demoRaces = await db.insert(races).values([
        { name: "1R", venue: "tokyo", startTime: new Date("2024-02-04T09:00:00"), status: "upcoming" },
        { name: "2R", venue: "tokyo", startTime: new Date("2024-02-04T09:30:00"), status: "upcoming" },
        { name: "3R", venue: "nakayama", startTime: new Date("2024-02-04T10:00:00"), status: "upcoming" }
      ]).returning();

      await db.insert(horses).values([
        { name: "ディープインパクト", odds: 2.4, raceId: demoRaces[0].id },
        { name: "キタサンブラック", odds: 3.1, raceId: demoRaces[0].id },
        { name: "オルフェーヴル", odds: 4.2, raceId: demoRaces[0].id },
        { name: "テイエムオペラオー", odds: 2.8, raceId: demoRaces[1].id },
        { name: "スペシャルウィーク", odds: 3.5, raceId: demoRaces[1].id },
        { name: "トウカイテイオー", odds: 2.9, raceId: demoRaces[2].id },
        { name: "ウオッカ", odds: 3.7, raceId: demoRaces[2].id }
      ]);

      res.json({ message: "Demo data inserted successfully" });
    } catch (error) {
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

  // New endpoint for risk assessment
  app.get("/api/risk-assessment", async (req, res) => {
    try {
      // TODO: Implement actual risk calculation algorithm
      // For now, return mock data that changes slightly each time
      const baseRisk = 65 + Math.random() * 10 - 5;
      const baseVolatility = 72 + Math.random() * 10 - 5;

      res.json({
        overallRisk: Math.min(100, Math.max(0, baseRisk)),
        volatilityScore: Math.min(100, Math.max(0, baseVolatility)),
        potentialReturn: 2.5 + Math.random(),
        marketTrend: Math.random() > 0.5 ? 'up' : 'down',
        recommendations: [
          "Consider diversifying your selections",
          "High-risk bets detected in current strategy",
          "Potential for significant returns but with elevated risk"
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

      // TODO: 実際の戦略計算アルゴリズムを実装
      // 現在はデモデータを返す
      const demoStrategy = [
        {
          type: "単勝",
          horses: ["ディープインパクト"],
          stake: Math.floor(budget * 0.4),
          expectedReturn: Math.floor(budget * 0.4 * 2.4),
          probability: 0.42
        },
        {
          type: "複勝",
          horses: ["キタサンブラック"],
          stake: Math.floor(budget * 0.3),
          expectedReturn: Math.floor(budget * 0.3 * 1.8),
          probability: 0.55
        },
        {
          type: "馬連",
          horses: ["ディープインパクト", "オルフェーヴル"],
          stake: Math.floor(budget * 0.3),
          expectedReturn: Math.floor(budget * 0.3 * 3.2),
          probability: 0.31
        }
      ];

      res.json(demoStrategy);
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

      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "あなたは競馬予想のエキスパートです。統計データとオッズを分析し、最適な馬券戦略を提案してください。"
          },
          {
            role: "user",
            content: prompt
          }
        ]
      });

      const explanation = {
        mainExplanation: completion.choices[0].message.content,
        confidence: 85 + Math.random() * 10, // デモ用の確信度
        timestamp: new Date().toISOString()
      };

      res.json(explanation);
    } catch (error) {
      console.error('Error generating explanation:', error);
      res.status(500).json({ error: "Failed to generate betting explanation" });
    }
  });

  // Add this endpoint after the existing /api/betting-explanation/:raceId endpoint
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

      const completion = await openai.chat.completions.create({
        model: "gpt-4",
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

  const httpServer = createServer(app);
  return httpServer;
}