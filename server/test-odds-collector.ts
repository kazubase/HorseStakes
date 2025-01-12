import { OddsCollector } from './odds-collector';
import { db } from '../db';
import { races, horses } from '../db/schema';
import { eq } from 'drizzle-orm';

async function testOddsCollection() {
  const collector = new OddsCollector();
  
  try {
    console.log('Initializing browser...');
    await collector.initialize();

    // 中山競馬場の実際のレースID
    const raceId = 202506010301;
    
    // まず、レースが存在するか確認
    const existingRace = await db.query.races.findFirst({
      where: eq(races.id, raceId)
    });

    if (!existingRace) {
      console.log('Registering new race...');
      await db.insert(races).values({
        id: raceId,
        name: `中山競馬場 第1回 第3日 1R`, // レース名を適切に設定
        venue: "中山",
        startTime: new Date('2025-01-12T02:00:00'), // レースの開始時間を適切に設定
        status: "upcoming"
      });
      console.log('Race registered successfully');
    }
    
    console.log(`Collecting odds for race ID: ${raceId}`);
    const oddsData = await collector.collectOdds(raceId);
    
    console.log('Collected odds data:', oddsData);
    
    if (oddsData.length > 0) {
      // 馬のデータを先に登録
      for (const odds of oddsData) {
        const existingHorse = await db.query.horses.findFirst({
          where: eq(horses.name, odds.horseName)
        });

        if (!existingHorse) {
          console.log(`Registering horse: ${odds.horseName}`);
          await db.insert(horses).values({
            name: odds.horseName,
            odds: odds.tanOdds.toString(),
            raceId: raceId
          });
        }
      }

      console.log('Saving odds data to database...');
      await collector.saveOddsHistory(oddsData);
      console.log('Odds data saved successfully');
    } else {
      console.log('No odds data collected');
    }

  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    await collector.cleanup();
    console.log('Test completed');
  }
}

testOddsCollection(); 