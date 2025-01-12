import { OddsCollector } from './odds-collector';

async function testOddsCollection() {
  const collector = new OddsCollector();
  
  try {
    console.log('Initializing browser...');
    await collector.initialize();

    // 中山競馬場の実際のレースID
    const raceId = 202506010301;
    
    console.log(`Collecting odds for race ID: ${raceId}`);
    const oddsData = await collector.collectOdds(raceId);
    
    console.log('Collected odds data:', oddsData);
    
    if (oddsData.length > 0) {
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