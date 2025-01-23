import { OddsCollector } from './odds-collector';
import { db } from '../db';
import { races, horses } from '../db/schema';
import { eq } from 'drizzle-orm';

async function testCurrentRaceOddsCollection() {
  const collector = new OddsCollector();
  
  try {
    console.log('Initializing browser...');
    await collector.initialize();

    // 今週のレースID（例：中山競馬場のレース）
    const raceId = 202506010711;
    
    await collectOddsForRace(collector, raceId);

  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    await collector.cleanup();
    console.log('Test completed');
  }
}

async function testPastRaceOddsCollection() {
  const collector = new OddsCollector();
  
  try {
    console.log('Initializing browser...');
    await collector.initialize();

    // 過去のレースID（例：2024年ジャパンカップ）
    const raceId = 202405050812;
    const pastRaceUrl = 'https://www.jra.go.jp/JRADB/accessS.html?CNAME=pw01sde1005202405081220241124/19';
    
    await collectOddsForRace(collector, raceId, pastRaceUrl);

  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    await collector.cleanup();
    console.log('Test completed');
  }
}

async function collectOddsForRace(collector: OddsCollector, raceId: number, pastRaceUrl?: string) {
  // まず、レースが存在するか確認
  const existingRace = await db.query.races.findFirst({
    where: eq(races.id, raceId)
  });

  if (!existingRace) {
    console.log('Registering new race...');
    await db.insert(races).values({
      id: raceId,
      name: `ジャパンカップ`,
      venue: "東京",
      startTime: new Date('2024-11-24T15:40:00'),
      status: "upcoming"
    });
    console.log('Race registered successfully');
  }

  // 各種オッズの取得と保存
  const betTypes = ['tanpuku', 'wakuren', 'umaren', 'wide', 'umatan', 'fuku3', 'tan3'] as const;
  
  for (const betType of betTypes) {
    console.log(`Collecting ${betType} odds for race ID: ${raceId}`);
    const odds = await collector.collectOddsForBetType(raceId, betType, pastRaceUrl);
    console.log(`Collected ${betType} odds data:`, odds);
    
    if (odds.length > 0) {
      if (betType === 'tanpuku') {
        // 馬のデータを先に登録（単複オッズの場合のみ）
        for (const odd of odds) {
          try {
            const existingHorse = await db.query.horses.findFirst({
              where: eq(horses.name, odd.horseName)
            });

            if (!existingHorse && odd.frame > 0) {
              console.log(`Registering horse: ${odd.horseName} (Frame: ${odd.frame}, Number: ${odd.number})`);
              await db.insert(horses).values({
                name: odd.horseName,
                raceId: raceId,
                frame: odd.frame,
                number: odd.number
              });
            }
          } catch (error) {
            console.error(`Error registering horse ${odd.horseName}:`, error);
          }
        }
        await collector.saveOddsHistory(odds);
      } else {
        // 他の馬券種別の保存
        const updateMethod = {
          wakuren: collector.updateWakurenOdds.bind(collector),
          umaren: collector.updateUmarenOdds.bind(collector),
          wide: collector.updateWideOdds.bind(collector),
          umatan: collector.updateUmatanOdds.bind(collector),
          fuku3: collector.updateFuku3Odds.bind(collector),
          tan3: collector.updateTan3Odds.bind(collector)
        }[betType];

        await updateMethod(odds);
      }
      console.log(`${betType} odds data saved successfully`);
    }
  }

  // 収集結果のサマリーを表示
  console.log('\nCollection Summary:');
  for (const betType of betTypes) {
    const odds = await collector.collectOddsForBetType(raceId, betType, pastRaceUrl);
    console.log(`- ${betType} odds collected: ${odds.length}`);
  }
}

// 実行したい方のコメントアウトを外して使用
// testCurrentRaceOddsCollection();
// testPastRaceOddsCollection();