import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { races, horses, tickets, bettingStrategies } from "@db/schema";
import { eq } from "drizzle-orm";

export function registerRoutes(app: Express): Server {
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

  const httpServer = createServer(app);
  return httpServer;
}