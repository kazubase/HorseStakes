import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { races, horses, tickets, bettingStrategies, tanOddsHistory, fukuOdds, wakurenOdds, umarenOdds, wideOdds, umatanOdds, fuku3Odds, tan3Odds } from "../db/schema";
import { eq, sql } from "drizzle-orm";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { OddsCollector } from "./odds-collector";
import { calculateBetProposals } from "@/lib/betCalculator";

export function registerRoutes(app: Express): Server {
  // 全レース一覧を取得
  app.get("/api/races", async (_req, res) => {
    try {
      const allRaces = await db.select().from(races);
      console.log('Fetched races:', allRaces); // デバッグログ
      
      if (!allRaces || allRaces.length === 0) {
        console.log('No races found in database');
      }
      
      res.json(allRaces);
    } catch (error) {
      console.error('Error fetching races:', error);
      res.status(500).json({ error: 'Failed to fetch races' });
    }
  });

  // 特定のレースを取得
  app.get("/api/races/:id", async (req, res) => {
    try {
      const raceId = parseInt(req.params.id);
      console.log('Fetching race with ID:', raceId); // デバッグログ
      
      const race = await db.query.races.findFirst({
        where: eq(races.id, raceId),
      });

      console.log('Found race:', race); // デバッグログ

      if (!race) {
        console.log('Race not found with ID:', raceId);
        return res.status(404).json({ message: "Race not found" });
      }

      res.json(race);
    } catch (error) {
      console.error('Error fetching race:', error);
      res.status(500).json({ error: 'Failed to fetch race' });
    }
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
  
      // 最新の単勝オッズを取得
      const latestTanOdds = await db.select()
        .from(tanOddsHistory)
        .where(eq(tanOddsHistory.raceId, raceId))
        .orderBy(sql`${tanOddsHistory.timestamp} desc`);
  
      // 最新の複勝オッズを取得
      const latestFukuOdds = await db.select()
        .from(fukuOdds)
        .where(eq(fukuOdds.raceId, raceId))
        .orderBy(sql`${fukuOdds.timestamp} desc`);
  
      // 最新の枠連オッズを取得
      const latestWakurenOdds = await db.select()
        .from(wakurenOdds)
        .where(eq(wakurenOdds.raceId, raceId))
        .orderBy(sql`${wakurenOdds.timestamp} desc`);
  
      // 最新の馬連オッズを取得
      const latestUmarenOdds = await db.select()
        .from(umarenOdds)
        .where(eq(umarenOdds.raceId, raceId))
        .orderBy(sql`${umarenOdds.timestamp} desc`);

      // 最新のワイドオッズを取得
      const latestWideOdds = await db.select()
        .from(wideOdds)
        .where(eq(wideOdds.raceId, raceId))
        .orderBy(sql`${wideOdds.timestamp} desc`);
  
      // 各馬の最新単勝オッズを取得
      const latestTanOddsByHorse = latestTanOdds.reduce((acc, curr) => {
        if (!acc[curr.horseId] || 
            new Date(acc[curr.horseId].timestamp) < new Date(curr.timestamp)) {
          acc[curr.horseId] = curr;
        }
        return acc;
      }, {} as Record<number, typeof latestTanOdds[0]>);
  
      // 各馬の最新複勝オッズを取得
      const latestFukuOddsByHorse = latestFukuOdds.reduce((acc, curr) => {
        if (!acc[curr.horseId] || 
            new Date(acc[curr.horseId].timestamp) < new Date(curr.timestamp)) {
          acc[curr.horseId] = curr;
        }
        return acc;
      }, {} as Record<number, typeof latestFukuOdds[0]>);
  
      // 最新の枠連オッズをフィルタリング
      const latestWakurenOddsByFrames = latestWakurenOdds.reduce((acc, curr) => {
        const key = `${curr.frame1}-${curr.frame2}`;
        if (!acc[key] || 
            new Date(acc[key].timestamp) < new Date(curr.timestamp)) {
          acc[key] = curr;
        }
        return acc;
      }, {} as Record<string, typeof latestWakurenOdds[0]>);
  
      // 最新の馬連オッズをフィルタリング
      const latestUmarenOddsByHorses = latestUmarenOdds.reduce((acc, curr) => {
        const key = `${curr.horse1}-${curr.horse2}`;
        if (!acc[key] || 
            new Date(acc[key].timestamp) < new Date(curr.timestamp)) {
          acc[key] = curr;
        }
        return acc;
      }, {} as Record<string, typeof latestUmarenOdds[0]>);

      // 最新のワイドオッズをフィルタリング
      const latestWideOddsByHorses = latestWideOdds.reduce((acc, curr) => {
        const key = `${curr.horse1}-${curr.horse2}`;
        if (!acc[key] || 
            new Date(acc[key].timestamp) < new Date(curr.timestamp)) {
          acc[key] = curr;
        }
        return acc;
      }, {} as Record<string, typeof latestWideOdds[0]>);
  
      // betCalculator用のデータを準備
      const horseDataList = raceHorses.map(horse => {
        const tanOdd = latestTanOddsByHorse[horse.number];
        
        return {
          name: horse.name,
          odds: tanOdd ? Number(tanOdd.odds) : 0,
          winProb: winProbs[horse.id] / 100,
          placeProb: placeProbs[horse.id] / 100,
          frame: horse.frame,
          number: horse.number
        };
      });

      // 複勝データを追加
      const fukuData = Object.values(latestFukuOddsByHorse).map(odd => {
        const horse = raceHorses.find(h => h.number === odd.horseId);
        if (!horse) return null;
        
        return {
          horse1: odd.horseId,
          oddsMin: Number(odd.oddsMin),
          oddsMax: Number(odd.oddsMax)
        };
      }).filter((odd): odd is NonNullable<typeof odd> => odd !== null);
  
      // 枠連データを追加
      const wakurenData = Object.values(latestWakurenOddsByFrames).map(odd => ({
        frame1: odd.frame1,
        frame2: odd.frame2,
        odds: Number(odd.odds)
      }));
  
      // 馬連データを追加
      const umarenData = Object.values(latestUmarenOddsByHorses).map(odd => ({
        horse1: odd.horse1,
        horse2: odd.horse2,
        odds: Number(odd.odds)
      }));
  
      // ワイドデータを追加
      const wideData = Object.values(latestWideOddsByHorses).map(odd => ({
        horse1: odd.horse1,
        horse2: odd.horse2,
        oddsMin: Number(odd.oddsMin),
        oddsMax: Number(odd.oddsMax)
      }));
  
      // 最新の馬単オッズを取得
      const latestUmatanOdds = await db.select()
        .from(umatanOdds)
        .where(eq(umatanOdds.raceId, raceId))
        .orderBy(sql`${umatanOdds.timestamp} desc`);

      // 最新の馬単オッズをフィルタリング
      const latestUmatanOddsByHorses = latestUmatanOdds.reduce((acc, curr) => {
        const key = `${curr.horse1}-${curr.horse2}`;
        if (!acc[key] || 
            new Date(acc[key].timestamp) < new Date(curr.timestamp)) {
          acc[key] = curr;
        }
        return acc;
      }, {} as Record<string, typeof latestUmatanOdds[0]>);

      // 馬単データを追加
      const umatanData = Object.values(latestUmatanOddsByHorses).map(odd => ({
        horse1: odd.horse1,
        horse2: odd.horse2,
        odds: Number(odd.odds)
      }));

      // 最新の3連複オッズを取得
      const latestSanrenpukuOdds = await db.select()
        .from(fuku3Odds)
        .where(eq(fuku3Odds.raceId, raceId))
        .orderBy(sql`${fuku3Odds.timestamp} desc`);

      // 最新の3連複オッズをフィルタリング
      const latestSanrenpukuOddsByHorses = latestSanrenpukuOdds.reduce((acc, curr) => {
        const key = `${curr.horse1}-${curr.horse2}-${curr.horse3}`;
        if (!acc[key] || 
            new Date(acc[key].timestamp) < new Date(curr.timestamp)) {
          acc[key] = curr;
        }
        return acc;
      }, {} as Record<string, typeof latestSanrenpukuOdds[0]>);

      // 3連複データを追加
      const sanrenpukuData = Object.values(latestSanrenpukuOddsByHorses).map(odd => ({
        horse1: odd.horse1,
        horse2: odd.horse2,
        horse3: odd.horse3,
        odds: Number(odd.odds)
      }));

      // 最新の3連単オッズを取得
      const latestSanrentanOdds = await db.select()
        .from(tan3Odds)
        .where(eq(tan3Odds.raceId, raceId))
        .orderBy(sql`${tan3Odds.timestamp} desc`);

      // 最新の3連単オッズをフィルタリング
      const latestSanrentanOddsByHorses = latestSanrentanOdds.reduce((acc, curr) => {
        const key = `${curr.horse1}-${curr.horse2}-${curr.horse3}`;
        if (!acc[key] || 
            new Date(acc[key].timestamp) < new Date(curr.timestamp)) {
          acc[key] = curr;
        }
        return acc;
      }, {} as Record<string, typeof latestSanrentanOdds[0]>);

      // 3連単データを追加
      const sanrentanData = Object.values(latestSanrentanOddsByHorses).map(odd => ({
        horse1: odd.horse1,
        horse2: odd.horse2,
        horse3: odd.horse3,
        odds: Number(odd.odds)
      }));

      // betCalculatorに計算を委譲
      const strategies = calculateBetProposals(
        horseDataList, 
        budget, 
        riskRatio, 
        fukuData,
        wakurenData, 
        umarenData,
        wideData,
        umatanData,
        sanrenpukuData,
        sanrentanData
      );
  
      res.json(strategies);
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ error: "Failed to calculate betting strategy" });
    }
  });

  // オッズ履歴を取得するエンドポイント
  app.get("/api/tan-odds-history/:raceId", async (req, res) => {
    try {
      const raceId = parseInt(req.params.raceId);
      console.log('=== Odds History Request ===');
      console.log('RaceId:', raceId);
      
      const oddsHistory = await db.select({
        horseId: tanOddsHistory.horseId,
        odds: tanOddsHistory.odds,
        timestamp: sql`date_trunc('minute', ${tanOddsHistory.timestamp})`,
      })
        .from(tanOddsHistory)
        .where(eq(tanOddsHistory.raceId, raceId))
        .orderBy(tanOddsHistory.timestamp);

      // データの詳細をログ
      console.log('Records found:', oddsHistory.length);
      console.log('First record:', oddsHistory[0]);
      console.log('Last record:', oddsHistory[oddsHistory.length - 1]);
      console.log('Unique horses:', new Set(oddsHistory.map(o => o.horseId)).size);
      console.log('Unique timestamps:', new Set(oddsHistory.map(o => o.timestamp)).size);
      console.log('=========================');

      res.json(oddsHistory);
    } catch (error: any) {
      console.error('Error fetching odds history:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      res.status(500).json({ error: "Failed to fetch odds history" });
    }
  });

  // 新しいエンドポイントを追加
  app.get("/api/tan-odds-history/latest/:raceId", async (req, res) => {
    try {
      const raceId = parseInt(req.params.raceId);
      
      // raceIdに基づいて直接オッズを取得
      const latestOdds = await db.select()
        .from(tanOddsHistory)
        .where(eq(tanOddsHistory.raceId, raceId))
        .orderBy(sql`${tanOddsHistory.timestamp} desc`);

      console.log(`Found ${latestOdds.length} odds records for race ${raceId}`);
      
      if (latestOdds.length === 0) {
        return res.json([]);
      }

      // horse_idでグループ化して、各馬の最新のオッズのみを取得
      const latestOddsByHorse = latestOdds.reduce((acc, curr) => {
        if (!acc[curr.horseId] || 
            new Date(acc[curr.horseId].timestamp) < new Date(curr.timestamp)) {
          acc[curr.horseId] = curr;
        }
        return acc;
      }, {} as Record<number, typeof latestOdds[0]>);

      res.json(Object.values(latestOddsByHorse));
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ error: "Failed to fetch latest odds" });
    }
  });

  // 最新の複勝オッズを取得するエンドポイント
app.get("/api/fuku-odds/latest/:raceId", async (req, res) => {
  try {
    const raceId = parseInt(req.params.raceId);
    
    const latestOdds = await db.select()
      .from(fukuOdds)
      .where(eq(fukuOdds.raceId, raceId))
      .orderBy(sql`${fukuOdds.timestamp} desc`);

    console.log(`Found ${latestOdds.length} fuku odds records for race ${raceId}`);
    
    if (latestOdds.length === 0) {
      return res.json([]);
    }

    // horse_idでグループ化して、各馬の最新のオッズのみを取得
    const latestOddsByHorse = latestOdds.reduce((acc, curr) => {
      if (!acc[curr.horseId] || 
          new Date(acc[curr.horseId].timestamp) < new Date(curr.timestamp)) {
        acc[curr.horseId] = curr;
      }
      return acc;
    }, {} as Record<number, typeof latestOdds[0]>);

    res.json(Object.values(latestOddsByHorse));
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: "Failed to fetch latest fuku odds" });
  }
});

  // 最新の枠連オッズを取得するエンドポイント
app.get("/api/wakuren-odds/latest/:raceId", async (req, res) => {
  try {
    const raceId = parseInt(req.params.raceId);
    
    const latestOdds = await db.select()
      .from(wakurenOdds)
      .where(eq(wakurenOdds.raceId, raceId))
      .orderBy(sql`${wakurenOdds.timestamp} desc`);

    console.log(`Found ${latestOdds.length} wakuren odds records for race ${raceId}`);
    
    if (latestOdds.length === 0) {
      return res.json([]);
    }

    // frame1とframe2の組み合わせでグループ化して、各組み合わせの最新のオッズのみを取得
    const latestOddsByFrames = latestOdds.reduce((acc, curr) => {
      const key = `${curr.frame1}-${curr.frame2}`;
      if (!acc[key] || 
          new Date(acc[key].timestamp) < new Date(curr.timestamp)) {
        acc[key] = curr;
      }
      return acc;
    }, {} as Record<string, typeof latestOdds[0]>);

    res.json(Object.values(latestOddsByFrames));
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: "Failed to fetch latest wakuren odds" });
  }
});

  // 最新の馬連オッズを取得するエンドポイント
app.get("/api/umaren-odds/latest/:raceId", async (req, res) => {
  try {
    const raceId = parseInt(req.params.raceId);
    
    const latestOdds = await db.select()
      .from(umarenOdds)
      .where(eq(umarenOdds.raceId, raceId))
      .orderBy(sql`${umarenOdds.timestamp} desc`);

    console.log(`Found ${latestOdds.length} umaren odds records for race ${raceId}`);
    
    if (latestOdds.length === 0) {
      return res.json([]);
    }

    // horse1とhorse2の組み合わせでグループ化して、各組み合わせの最新のオッズのみを取得
    const latestOddsByHorses = latestOdds.reduce((acc, curr) => {
      const key = `${curr.horse1}-${curr.horse2}`;
      if (!acc[key] || 
          new Date(acc[key].timestamp) < new Date(curr.timestamp)) {
        acc[key] = curr;
      }
      return acc;
    }, {} as Record<string, typeof latestOdds[0]>);

    res.json(Object.values(latestOddsByHorses));
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: "Failed to fetch latest umaren odds" });
  }
});

  // 最新のワイドオッズを取得するエンドポイント
app.get("/api/wide-odds/latest/:raceId", async (req, res) => {
  try {
    const raceId = parseInt(req.params.raceId);
    
    const latestOdds = await db.select()
      .from(wideOdds)
      .where(eq(wideOdds.raceId, raceId))
      .orderBy(sql`${wideOdds.timestamp} desc`);

    console.log(`Found ${latestOdds.length} wide odds records for race ${raceId}`);
    
    if (latestOdds.length === 0) {
      return res.json([]);
    }

    // horse1とhorse2の組み合わせでグループ化して、各組み合わせの最新のオッズのみを取得
    const latestOddsByHorses = latestOdds.reduce((acc, curr) => {
      const key = `${curr.horse1}-${curr.horse2}`;
      if (!acc[key] || 
          new Date(acc[key].timestamp) < new Date(curr.timestamp)) {
        acc[key] = curr;
      }
      return acc;
    }, {} as Record<string, typeof latestOdds[0]>);

    res.json(Object.values(latestOddsByHorses));
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: "Failed to fetch latest wide odds" });
  }
});

  // 最新の馬単オッズを取得するエンドポイント
app.get("/api/umatan-odds/latest/:raceId", async (req, res) => {
  try {
    const raceId = parseInt(req.params.raceId);
    
    const latestOdds = await db.select()
      .from(umatanOdds)
      .where(eq(umatanOdds.raceId, raceId))
      .orderBy(sql`${umatanOdds.timestamp} desc`);

    console.log(`Found ${latestOdds.length} umatan odds records for race ${raceId}`);
    
    if (latestOdds.length === 0) {
      return res.json([]);
    }

    // horse1とhorse2の組み合わせでグループ化して、各組み合わせの最新のオッズのみを取得
    const latestOddsByHorses = latestOdds.reduce((acc, curr) => {
      const key = `${curr.horse1}-${curr.horse2}`;
      if (!acc[key] || 
          new Date(acc[key].timestamp) < new Date(curr.timestamp)) {
        acc[key] = curr;
      }
      return acc;
    }, {} as Record<string, typeof latestOdds[0]>);

    res.json(Object.values(latestOddsByHorses));
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: "Failed to fetch latest umatan odds" });
  }
});

  // 最新の3連複オッズを取得するエンドポイント
app.get("/api/sanrenpuku-odds/latest/:raceId", async (req, res) => {
  try {
    const raceId = parseInt(req.params.raceId);
    
    const latestOdds = await db.select()
      .from(fuku3Odds)
      .where(eq(fuku3Odds.raceId, raceId))
      .orderBy(sql`${fuku3Odds.timestamp} desc`);

    console.log(`Found ${latestOdds.length} sanrenpuku odds records for race ${raceId}`);
    
    if (latestOdds.length === 0) {
      return res.json([]);
    }

    // horse1,2,3の組み合わせでグループ化して、各組み合わせの最新のオッズのみを取得
    const latestOddsByHorses = latestOdds.reduce((acc, curr) => {
      const key = `${curr.horse1}-${curr.horse2}-${curr.horse3}`;
      if (!acc[key] || 
          new Date(acc[key].timestamp) < new Date(curr.timestamp)) {
        acc[key] = curr;
      }
      return acc;
    }, {} as Record<string, typeof latestOdds[0]>);

    res.json(Object.values(latestOddsByHorses));
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: "Failed to fetch latest sanrenpuku odds" });
  }
});

  // 最新の3連単オッズを取得するエンドポイント
app.get("/api/sanrentan-odds/latest/:raceId", async (req, res) => {
  try {
    const raceId = parseInt(req.params.raceId);
    
    const latestOdds = await db.select()
      .from(tan3Odds)
      .where(eq(tan3Odds.raceId, raceId))
      .orderBy(sql`${tan3Odds.timestamp} desc`);

    console.log(`Found ${latestOdds.length} sanrentan odds records for race ${raceId}`);
    
    if (latestOdds.length === 0) {
      return res.json([]);
    }

    // horse1,2,3の組み合わせでグループ化して、各組み合わせの最新のオッズのみを取得
    const latestOddsByHorses = latestOdds.reduce((acc, curr) => {
      const key = `${curr.horse1}-${curr.horse2}-${curr.horse3}`;
      if (!acc[key] || 
          new Date(acc[key].timestamp) < new Date(curr.timestamp)) {
        acc[key] = curr;
      }
      return acc;
    }, {} as Record<string, typeof latestOdds[0]>);

    res.json(Object.values(latestOddsByHorses));
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: "Failed to fetch latest sanrentan odds" });
  }
});

  // レース登録部分の更新
  app.post("/api/register-race", async (req, res) => {
    try {
      const { raceId, raceName, venue, startTime } = req.body;

      // レースを登録
      const [race] = await db.insert(races).values({
        id: raceId,
        name: raceName,
        venue: venue,
        startTime: new Date(startTime),
        status: "upcoming"
      }).returning();

      // OddsCollectorを初期化
      const collector = new OddsCollector();
      await collector.initialize();

      try {
        // オッズデータを取得
        const tanpukuOdds = await collector.collectOddsForBetType(raceId, 'tanpuku');
        const wakurenOdds = await collector.collectOddsForBetType(raceId, 'wakuren');
        const umarenOdds = await collector.collectOddsForBetType(raceId, 'umaren');
        
        // 出走馬を登録
        if (tanpukuOdds.length > 0) {
          const horseInserts = tanpukuOdds.map(odds => ({
            name: odds.horseName,
            raceId: raceId
          }));

          // オッズ履歴を保存
          await collector.saveOddsHistory(tanpukuOdds);
          if (wakurenOdds.length > 0) {
            await collector.updateWakurenOdds(wakurenOdds);
          }
          if (umarenOdds.length > 0) {
            await collector.updateUmarenOdds(umarenOdds);
          }
        }

        res.json({
          message: "Race data registered successfully",
          race,
          horsesCount: tanpukuOdds.length,
          wakurenCount: wakurenOdds.length
        });

      } finally {
        await collector.cleanup();
      }

    } catch (error) {
      console.error('Error registering race data:', error);
      res.status(500).json({
        error: "Failed to register race data",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // 定期的なオッズ収集を開始するエンドポイント
  app.post("/api/start-odds-collection", async (_req, res) => {
    try {
      const collector = new OddsCollector();
      await collector.initialize();
      await collector.startPeriodicCollection(5); // 5分間隔で収集

      res.json({ message: "Odds collection started successfully" });
    } catch (error) {
      console.error('Error starting odds collection:', error);
      res.status(500).json({
        error: "Failed to start odds collection",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // レース情報を更新するエンドポイント
  app.put("/api/races/:id/status", async (req, res) => {
    try {
      const raceId = parseInt(req.params.id);
      const { status } = req.body;

      const [updatedRace] = await db.update(races)
        .set({ status })
        .where(eq(races.id, raceId))
        .returning();

      res.json(updatedRace);
    } catch (error) {
      console.error('Error updating race status:', error);
      res.status(500).json({
        error: "Failed to update race status",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Gemini APIエンドポイント
  app.post("/api/gemini", async (req, res) => {
    // リクエストの開始をログ
    console.log('=== Gemini API Request Start ===');
    console.log('API Key Check:', {
      exists: !!process.env.GEMINI_API_KEY,
      length: process.env.GEMINI_API_KEY?.length || 0,
      prefix: process.env.GEMINI_API_KEY?.substring(0, 4) + '...'
    });

    if (!process.env.GEMINI_API_KEY) {
      console.error('❌ API key is missing');
      return res.status(500).json({ error: 'APIキーが設定されていません' });
    }

    try {
      const { prompt, model = 'gemini-2.0-flash-001' } = req.body;
      console.log('📝 Using model:', model);

      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const genModel = genAI.getGenerativeModel({ model });

      try {
        console.log('🚀 Calling Gemini API...');
        const result = await genModel.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        console.log('✅ API Response received:', {
          length: text.length,
          preview: text.substring(0, 100) + '...'
        });

        const strategy = parseGeminiResponse(text);
        console.log('=== Gemini API Request End ===');
        return res.json({ strategy });

      } catch (apiError: any) {
        console.error('❌ API Call Failed:', {
          name: apiError.name,
          message: apiError.message,
          status: apiError.status,
          details: apiError.errorDetails
        });
        throw apiError;
      }
    } catch (error: any) {
      console.error('❌ Request Failed:', {
        type: error.constructor.name,
        message: error.message,
        stack: error.stack
      });

      return res.status(500).json({ 
        error: 'Gemini APIの呼び出しに失敗しました',
        details: error.message,
        type: error.constructor.name
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Geminiの応答をパースする補助関数
function parseGeminiResponse(text: string) {
  try {
    // 戦略の説明部分と推奨馬券部分を分離
    const sections = text.split(/\n(?=推奨馬券:|おすすめの馬券:)/i);
    const description = sections[0].trim();
    const recommendationsText = sections[1] || '';

    // 推奨馬券を解析
    const recommendations = recommendationsText.split('\n')
      .filter(line => line.includes('→') || line.includes('-'))
      .map(line => {
        const match = line.match(/([^:]+):\s*([^\s]+)\s*(\d+)円\s*(.+)/);
        if (!match) return null;
        
        const [_, type, horses, stakeStr, reason] = match;
        return {
          type: type.trim(),
          horses: horses.split(/[→-]/).map(h => h.trim()),
          stake: parseInt(stakeStr, 10),
          reason: reason.trim()
        };
      })
      .filter((rec): rec is NonNullable<typeof rec> => rec !== null);

    return {
      description,
      recommendations
    };
  } catch (error) {
    console.error('Response parsing error:', error);
    throw new Error('Failed to parse Gemini response');
  }
}