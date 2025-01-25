import { OddsCollector } from './odds-collector';
import { db } from '../db';
import { races, horses } from '../db/schema';
import { eq, and } from 'drizzle-orm';

async function testCurrentRaceOddsCollection() {
  const collector = new OddsCollector();
  
  try {
    console.log('Initializing browser...');
    await collector.initialize();

    // 今週のレースID入力
    const raceId = 202510010111;
    
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

    // 過去のレースID、URL入力
    const raceId = 202406050811;
    const pastRaceUrl = 'https://www.jra.go.jp/JRADB/accessS.html?CNAME=pw01sde1006202405081120241222/AF';
    
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
  //レース情報入力
  if (!existingRace) {
    console.log('Registering new race...');
    await db.insert(races).values({
      id: raceId,
      name: `小倉牝馬ステークス`,
      venue: "小倉",
      startTime: new Date('2025-01-25T15:25:00'),
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
              where: and(
                eq(horses.name, odd.horseName),
                eq(horses.raceId, raceId)
              )
            });

            // 取消馬の場合もframe > 0の条件を外して登録できるようにする
            if (!existingHorse) {
              console.log(`Registering horse: ${odd.horseName} (Race: ${raceId}, Frame: ${odd.frame}, Number: ${odd.number}, Status: ${odd.odds === '取消' ? '取消' : '出走'})`);
              await db.insert(horses).values({
                name: odd.horseName,
                raceId: raceId,
                frame: odd.frame,
                number: odd.number,
                status: odd.odds === '取消' ? 'scratched' : 'running' // ステータスカラムを追加
              });
            } else {
              // 既存の馬のステータスを更新（取消になった場合など）
              if (odd.odds === '取消' && existingHorse.status !== 'scratched') {
                console.log(`Updating horse status to scratched: ${odd.horseName} (Race: ${raceId})`);
                await db.update(horses)
                  .set({ status: 'scratched' })
                  .where(and(
                    eq(horses.name, odd.horseName),
                    eq(horses.raceId, raceId)
                  ));
              }
              console.log(`Horse ${odd.horseName} already exists for race ${raceId} with status ${existingHorse.status}`);
            }
          } catch (error) {
            console.error(`Error handling horse ${odd.horseName} for race ${raceId}:`, error);
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
  /*
  // 収集結果のサマリーを表示
  console.log('\nCollection Summary:');
  for (const betType of betTypes) {
    const odds = await collector.collectOddsForBetType(raceId, betType, pastRaceUrl);
    console.log(`- ${betType} odds collected: ${odds.length}`);
  }*/
}

// 実行したい方のコメントアウトを外して使用
testCurrentRaceOddsCollection();
// testPastRaceOddsCollection();