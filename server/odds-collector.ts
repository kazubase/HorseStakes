import 'dotenv/config';
import { Browser, chromium } from 'playwright';
import { db } from '../db';
import { horses, races, oddsHistory } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import * as cheerio from 'cheerio';

declare global {
  interface Window {
    doAction: (url: string, param: string) => void;
  }
}


interface OddsData {
  horseId: number;
  horseName: string;
  tanOdds: number;
  fukuOddsMin: number;
  fukuOddsMax: number;
  timestamp: Date;
  raceId: number;
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

    try {
      // JRAのページにアクセス
      await page.goto('https://www.jra.go.jp/keiba/');
      await page.waitForLoadState('networkidle');
      
      // オッズリンクをクリックして待機
      await page.getByRole('link', { name: 'オッズ', exact: true }).click();
      await page.waitForLoadState('networkidle');

      // レースIDから開催場所とレース番号を抽出
      const raceIdStr = raceId.toString();
      const kaisaiKai = parseInt(raceIdStr.slice(6,8)).toString();
      const kaisaiNichi = parseInt(raceIdStr.slice(8,10)).toString();
      const kaisaiName = `${kaisaiKai}回${placeMapping[raceIdStr.slice(4,6)]}${kaisaiNichi}日`;
      
      // 開催選択して待機
      await page.getByRole('link', { name: kaisaiName }).click();
      await page.waitForLoadState('networkidle');
      
      // レース選択（画像を含むリンクを選択）して待機
      const raceNumber = parseInt(raceIdStr.slice(10,12));
      await page.locator(`img[alt="${raceNumber}レース"]`).click();
      await page.waitForLoadState('networkidle');

      // セレクタを修正
      await page.waitForSelector('table.basic.narrow-xy.tanpuku', { timeout: 30000 });
      await page.waitForTimeout(2000);

      const html = await page.content();
      const $ = cheerio.load(html);
      
      // デバッグ情報
      console.log('Current URL:', page.url());
      console.log('Page content length:', html.length);
      console.log('Table exists:', $('table.basic.narrow-xy.tanpuku').length > 0);
      console.log('Table rows:', $('table.basic.narrow-xy.tanpuku tr').length);

      const oddsData: OddsData[] = [];
      const processedHorseIds = new Set<number>();

      // セレクタを修正してテーブルの各行を処理
      $('table.basic.narrow-xy.tanpuku tr').each((_, element) => {
        const row = $(element);
        const cells = row.find('td');
        
        // 馬番を取得（num クラスを使用）
        const horseNumberCell = row.find('td.num');
        if (!horseNumberCell.length) return;
        
        const horseNumber = horseNumberCell.text().trim();
        if (!horseNumber || isNaN(parseInt(horseNumber))) return;

        const horseId = parseInt(horseNumber);
        if (processedHorseIds.has(horseId)) return;

        // 各セルのクラスを使用してデータを取得
        const horseName = row.find('td.horse a').text().trim();
        const tanOddsText = row.find('td.odds_tan').text().trim().replace(/,/g, '');
        const fukuCell = row.find('td.odds_fuku');
        const fukuText = fukuCell.text().trim().split('-');
        const fukuMinText = fukuText[0].trim();
        const fukuMaxText = fukuText[1]?.trim() || fukuMinText;

        // 数値に変換
        const tanOdds = parseFloat(tanOddsText);
        const fukuOddsMin = parseFloat(fukuMinText);
        const fukuOddsMax = parseFloat(fukuMaxText);

        if (!isNaN(tanOdds) && !isNaN(fukuOddsMin) && !isNaN(fukuOddsMax)) {
          oddsData.push({
            horseId,
            horseName,
            tanOdds,
            fukuOddsMin,
            fukuOddsMax,
            timestamp: new Date(),
            raceId
          });
          processedHorseIds.add(horseId);
        }
      });

      console.log(`Collected odds data for ${oddsData.length} horses`);
      return oddsData;

    } catch (error) {
      console.error('Error during odds collection:', error);
      console.error('Error details:', error instanceof Error ? error.message : String(error));
      throw error;
    } finally {
      await context.close();
    }
  }

  async saveOddsHistory(oddsData: OddsData[]) {
    try {
      // まず、該当するレースの情報を取得
      const race = await db.query.races.findFirst({
        where: eq(races.id, oddsData[0]?.raceId)
      });

      if (!race) {
        // レースが存在しない場合は、先にレースを登録
        await db.insert(races).values({
          id: oddsData[0].raceId,
          name: `Race ${oddsData[0].raceId}`, // 仮の名前
          venue: "Unknown", // 仮の会場名
          startTime: new Date(), // 仮の開始時間
          status: "upcoming"
        });
      }

      // レースに紐づく馬の情報を取得または登録
      for (const odds of oddsData) {
        const existingHorse = await db.query.horses.findFirst({
          where: and(
            eq(horses.name, odds.horseName),
            eq(horses.raceId, odds.raceId)
          )
        });

        if (!existingHorse) {
          // 馬が存在しない場合は登録
          await db.insert(horses).values({
            name: odds.horseName,
            odds: odds.tanOdds.toString(),
            raceId: odds.raceId
          });
        }

        // 最新の馬情報を再取得
        const horse = await db.query.horses.findFirst({
          where: and(
            eq(horses.name, odds.horseName),
            eq(horses.raceId, odds.raceId)
          )
        });

        if (horse) {
          // オッズ履歴を保存（horse.idを使用）
          await db.insert(oddsHistory).values({
            horseId: horse.id,
            tanOdds: odds.tanOdds.toString(),
            fukuOddsMin: odds.fukuOddsMin.toString(),
            fukuOddsMax: odds.fukuOddsMax.toString(),
            timestamp: odds.timestamp
          });
        }
      }

      console.log(`Saved ${oddsData.length} odds records`);
    } catch (error) {
      console.error('Error saving odds history:', error);
      throw error;
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

// place_mappingの定義を追加
const placeMapping: { [key: string]: string } = {
  "01": "札幌",
  "02": "函館",
  "03": "福島",
  "04": "新潟",
  "05": "東京",
  "06": "中山",
  "07": "中京",
  "08": "京都",
  "09": "阪神",
  "10": "小倉"
};