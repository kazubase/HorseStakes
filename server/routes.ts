import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { races, horses, tickets, bettingStrategies } from "@db/schema";
import { eq } from "drizzle-orm";

export function registerRoutes(app: Express): Server {
  app.get("/api/races", async (_req, res) => {
    const allRaces = await db.select().from(races);
    res.json(allRaces);
  });

  app.get("/api/horses/:raceId", async (req, res) => {
    const raceHorses = await db
      .select()
      .from(horses)
      .where(eq(horses.raceId, parseInt(req.params.raceId)));
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

  const httpServer = createServer(app);
  return httpServer;
}
