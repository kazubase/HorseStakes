import { Browser, chromium } from 'playwright';
import { db } from '../db';
import { horses, races, oddsHistory } from '../db/schema';
import { eq } from 'drizzle-orm';

interface OddsData {
  horseId: number;
  odds: string;
  timestamp: Date;
}

export class OddsCollector {
  private browser: Browser | null = null;

  async initialize() {
    this.browser = await chromium.launch({
      headless: false  // デバッグ用にheadlessをfalseに設定
    });
  }

  async collectOdds(raceId: number): Promise<OddsData[]> {
    if (!this.browser) {
      throw new Error('Browser not initialized');
    }

    const context = await this.browser.newContext();
    const page = await context.newPage();
    const oddsData: OddsData[] = [];

    try {
      // JRAのトップページにアク�ス
      console.log('Accessing JRA top page...');
      await page.goto('https://www.jra.go.jp/', { 
        waitUntil: 'networkidle',
        timeout: 60000 
      });
      
      // デバッグ用のスクリーンショット
      console.log('Taking screenshot of top page...');
      await page.screenshot({ path: 'debug-top-page.png' });

      // 競馬メニューをクリック - より具体的なセレクタを使用
      console.log('Clicking race menu...');
      await page.waitForSelector('.nav-link, a:has-text("競馬メニュー")', { timeout: 30000 });
      await page.click('.nav-link, a:has-text("競馬メニュー")');
      await page.waitForLoadState('networkidle');

      // オッズページへの遷移 - より具体的なセレクタを使用
      console.log('Clicking odds link...');
      await page.waitForSelector('a:has-text("オッズ"), .odds-link', { timeout: 30000 });
      await Promise.all([
        page.waitForURL('**/keiba/odds/**'),
        page.click('a:has-text("オッズ"), .odds-link')
      ]);

      // デバッグ用のスクリーンショット
      console.log('Taking screenshot after odds navigation...');
      await page.screenshot({ path: 'debug-odds-page.png' });

      console.log('Getting race information...');
      const race = await db.query.races.findFirst({
        where: eq(races.id, raceId),
      });
      
      console.log('Race data:', race);
      
      if (!race) {
        throw new Error('Race not found');
      }

      console.log('Checking page content...');
      const pageTitle = await page.title();
      console.log('Page title:', pageTitle);

      // 会場選択のセレクトボックスの確認
      console.log('Checking venue selector...');
      const venueSelector = await page.locator('select[name="jyo"]');
      const venueSelectorExists = await venueSelector.count() > 0;
      console.log('Venue selector exists:', venueSelectorExists);

      if (venueSelectorExists) {
        // 利用可能な会場オプションを確認
        const venueOptions = await page.$$eval('select[name="jyo"] option', 
          (options) => options.map((opt) => ({
            value: (opt as HTMLOptionElement).value,
            text: opt.textContent
          }))
        );
        console.log('Available venues:', venueOptions);

        // 開催場所の選択
        console.log(`Selecting venue: ${race.venue}`);
        await page.selectOption('select[name="jyo"]', race.venue);
        
        // レース番号の選択
        const raceNumber = race.name.replace('R', '');
        console.log(`Selecting race number: ${raceNumber}`);
        await page.selectOption('select[name="race"]', raceNumber);

        // 選択後のスクリーンショット
        await page.screenshot({ path: 'debug-after-selection.png' });

        console.log('Clicking submit button...');
        await page.click('input[type="submit"]');
        await page.waitForLoadState('networkidle');
        
        // オッズテーブルの取得を試みる
        console.log('Looking for odds table...');
        const table = await page.locator('table.odds_table_data');
        const tableExists = await table.count() > 0;
        console.log('Odds table exists:', tableExists);

        if (tableExists) {
          const rows = await table.locator('tr').all();
          console.log(`Found ${rows.length} rows in odds table`);
          
          for (const row of rows) {
            const horseNumber = await row.locator('td:first-child').innerText();
            const currentOdds = await row.locator('td:nth-child(2)').innerText();
            console.log(`Horse ${horseNumber}: Odds ${currentOdds}`);
            
            const horse = await db.query.horses.findFirst({
              where: (horses, { and, eq }) => and(
                eq(horses.raceId, raceId)
              )
            });

            if (horse) {
              oddsData.push({
                horseId: horse.id,
                odds: currentOdds,
                timestamp: new Date()
              });
            }
          }
        } else {
          console.log('Could not find odds table');
          await page.screenshot({ path: 'debug-no-table.png' });
        }
      } else {
        console.log('Could not find venue selection element');
        await page.screenshot({ path: 'debug-no-selector.png' });
      }

    } catch (error) {
      console.error('Error collecting odds:', error);
      // エラー時のスクリーンショット
      await page.screenshot({ path: 'debug-error.png' });
    } finally {
      await context.close();
    }

    console.log(`Collected ${oddsData.length} odds entries`);
    return oddsData;
  }

  async saveOddsHistory(oddsData: OddsData[]) {
    try {
      await db.insert(oddsHistory).values(oddsData);
      console.log(`Saved ${oddsData.length} odds records`);
    } catch (error) {
      console.error('Error saving odds history:', error);
    }
  }

  async startPeriodicCollection(intervalMinutes: number = 5) {
    setInterval(async () => {
      const activeRaces = await db.select()
        .from(races)
        .where(eq(races.status, 'upcoming'));

      console.log(`Found ${activeRaces.length} active races`);
      for (const race of activeRaces) {
        console.log(`Collecting odds for race ${race.id}`);
        const oddsData = await this.collectOdds(race.id);
        if (oddsData.length > 0) {
          await this.saveOddsHistory(oddsData);
        }
      }
    }, intervalMinutes * 60 * 1000);
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}