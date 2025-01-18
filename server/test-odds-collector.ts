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
    const raceId = 202506010711;
    
    // まず、レースが存在するか確認
    const existingRace = await db.query.races.findFirst({
      where: eq(races.id, raceId)
    });

    if (!existingRace) {
      console.log('Registering new race...');
      await db.insert(races).values({
        id: raceId,
        name: `京成杯`,
        venue: "中山",
        startTime: new Date('2025-01-19T15:45:00'),
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
        try {
          const existingHorse = await db.query.horses.findFirst({
            where: eq(horses.name, odds.horseName)
          });

          if (!existingHorse && odds.frame > 0) {
            console.log(`Registering horse: ${odds.horseName} (Frame: ${odds.frame}, Number: ${odds.number})`);
            await db.insert(horses).values({
              name: odds.horseName,
              raceId: raceId,
              frame: odds.frame,
              number: odds.number
            });
          }
        } catch (error) {
          console.error(`Error registering horse ${odds.horseName}:`, error);
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

    // 馬連オッズの取得と保存
    console.log(`Collecting Umaren odds for race ID: ${raceId}`);
    const umarenOdds = await collector.collectOddsForBetType(raceId, 'umaren');
    console.log('Collected Umaren odds data:', umarenOdds);
    
    if (umarenOdds.length > 0) {
      console.log('Saving Umaren odds data...');
      await collector.updateUmarenOdds(umarenOdds);
      console.log('Umaren odds data saved successfully');
    }

    // ワイドオッズの取得と保存
    console.log(`Collecting Wide odds for race ID: ${raceId}`);
    const wideOdds = await collector.collectOddsForBetType(raceId, 'wide');
    console.log('Collected Wide odds data:', wideOdds);
    
    if (wideOdds.length > 0) {
      console.log('Saving Wide odds data...');
      await collector.updateWideOdds(wideOdds);
      console.log('Wide odds data saved successfully');
    }

    // 馬単オッズの取得と保存を追加
    console.log(`Collecting Umatan odds for race ID: ${raceId}`);
    const umatanOdds = await collector.collectOddsForBetType(raceId, 'umatan');
    console.log('Collected Umatan odds data:', umatanOdds);
    
    if (umatanOdds.length > 0) {
      console.log('Saving Umatan odds data...');
      await collector.updateUmatanOdds(umatanOdds);
      console.log('Umatan odds data saved successfully');
    }

    // 収集結果のサマリーを表示
    console.log('\nCollection Summary:');
    console.log(`- Tanpuku odds collected: ${tanpukuOdds.length}`);
    console.log(`- Wakuren odds collected: ${wakurenOdds.length}`);
    console.log(`- Umaren odds collected: ${umarenOdds.length}`);
    console.log(`- Wide odds collected: ${wideOdds.length}`);
    console.log(`- Umatan odds collected: ${umatanOdds.length}`);

  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    await collector.cleanup();
    console.log('Test completed');
  }
}

testOddsCollection();