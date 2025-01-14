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
    const raceId = 202506010411;
    
    // まず、レースが存在するか確認
    const existingRace = await db.query.races.findFirst({
      where: eq(races.id, raceId)
    });

    if (!existingRace) {
      console.log('Registering new race...');
      await db.insert(races).values({
        id: raceId,
        name: `フェアリーS`,
        venue: "中山",
        startTime: new Date('2025-01-12T15:45:00'),
        status: "upcoming"
      });
      console.log('Race registered successfully');
    }
    
    // 単勝・複勝オッズの取得と保存
    console.log(`Collecting Tanpuku odds for race ID: ${raceId}`);
    const tanpukuOdds = await collector.collectOddsForBetType(raceId, 'tanpuku');
    console.log('Collected Tanpuku odds data:', tanpukuOdds);
    
    if (tanpukuOdds.length > 0) {
      // 馬のデータを先に登録
      for (const odds of tanpukuOdds) {
        const existingHorse = await db.query.horses.findFirst({
          where: eq(horses.name, odds.horseName)
        });

        if (!existingHorse) {
          console.log(`Registering horse: ${odds.horseName}`);
          await db.insert(horses).values({
            name: odds.horseName,
            raceId: raceId
          });
        }
      }

      // オッズ履歴を保存
      console.log('Saving Tanpuku odds data...');
      await collector.saveOddsHistory(tanpukuOdds);
      console.log('Tanpuku odds data saved successfully');
    }

    // 枠連オッズの取得と保存
    console.log(`Collecting Wakuren odds for race ID: ${raceId}`);
    const wakurenOdds = await collector.collectOddsForBetType(raceId, 'wakuren');
    console.log('Collected Wakuren odds data:', wakurenOdds);
    
    if (wakurenOdds.length > 0) {
      console.log('Saving Wakuren odds data...');
      await collector.updateWakurenOdds(wakurenOdds);
      console.log('Wakuren odds data saved successfully');
    }

    // 収集結果のサマリーを表示
    console.log('\nCollection Summary:');
    console.log(`- Tanpuku odds collected: ${tanpukuOdds.length}`);
    console.log(`- Wakuren odds collected: ${wakurenOdds.length}`);

  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    await collector.cleanup();
    console.log('Test completed');
  }
}

testOddsCollection();