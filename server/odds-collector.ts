import 'dotenv/config';
import { Browser, Page, chromium } from 'playwright';
import { db } from '../db';
import { horses, races, tanOddsHistory, fukuOdds, wakurenOdds } from '../db/schema';
import { eq, sql, and } from 'drizzle-orm';
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

// 枠連オッズのインターフェースを追加
interface WakurenOddsData {
  frame1: number;
  frame2: number;
  odds: number;
  timestamp: Date;
  raceId: number;
}

interface BetTypeConfig {
  tabName: string;          // タブの名前（'枠連'、'馬連'など）
  tableSelector: string;    // テーブルのセレクタ
  parser: (html: string, raceId: number) => Promise<any[]>; // パーサー関数
}

export class OddsCollector {
  private browser: Browser | null = null;
  
  private betTypes: { [key: string]: BetTypeConfig } = {
    tanpuku: {
      tabName: '単勝・複勝',
      tableSelector: 'table.basic.narrow-xy.tanpuku',
      parser: this.parseTanpukuOdds.bind(this)
    },
    wakuren: {
      tabName: '枠連',
      tableSelector: 'table.basic.narrow-xy.waku',
      parser: this.parseWakurenOdds.bind(this)
    },
    // 他の馬券種別も同様に定義
  };

  async initialize() {
    this.browser = await chromium.launch({
      headless: false  // デバッグ用にheadlessをfalseに設定
    });
  }

  async collectOddsForBetType(raceId: number, betType: string): Promise<any[]> {
    if (!this.browser || !this.betTypes[betType]) {
      throw new Error('Invalid configuration');
    }

    const context = await this.browser.newContext();
    const page = await context.newPage();

    try {
      // 共通のページ遷移ロジック
      await this.navigateToRacePage(page, raceId);
      
      // 馬券種別タブへの遷移
      const config = this.betTypes[betType];
      if (betType !== 'tanpuku') { // 単複は最初のタブなのでスキップ
        await page.getByRole('link', { name: config.tabName }).click();
        await page.waitForLoadState('networkidle');
      }

      // テーブルの待機
      await page.waitForSelector(config.tableSelector, { timeout: 30000 });
      await page.waitForTimeout(2000); // 追加：データ読み込み待機

      const html = await page.content();
      console.log('Current URL:', page.url()); // デバッグ情報
      console.log('Page content length:', html.length);

      // 馬券種別固有のパース処理
      return await config.parser(html, raceId);

    } finally {
      await context.close();
    }
  }

  private async navigateToRacePage(page: Page, raceId: number): Promise<void> {
    await page.goto('https://www.jra.go.jp/keiba/');
    await page.waitForLoadState('networkidle');
    
    await page.getByRole('link', { name: 'オッズ', exact: true }).click();
    await page.waitForLoadState('networkidle');

    const raceIdStr = raceId.toString();
    const kaisaiKai = parseInt(raceIdStr.slice(6,8)).toString();
    const kaisaiNichi = parseInt(raceIdStr.slice(8,10)).toString();
    const kaisaiName = `${kaisaiKai}回${placeMapping[raceIdStr.slice(4,6)]}${kaisaiNichi}日`;
    
    await page.getByRole('link', { name: kaisaiName }).click();
    await page.waitForLoadState('networkidle');
    
    const raceNumber = parseInt(raceIdStr.slice(10,12));
    await page.locator(`img[alt="${raceNumber}レース"]`).click();
    await page.waitForLoadState('networkidle');
  }

  // 各馬券種別のパーサー関数
  private async parseTanpukuOdds(html: string, raceId: number): Promise<OddsData[]> {
    const $ = cheerio.load(html);
    const oddsData: OddsData[] = [];
    const processedHorseIds = new Set<number>();

    // デバッグ情報
    console.log('Table exists:', $('table.basic.narrow-xy.tanpuku').length > 0);
    console.log('Table rows:', $('table.basic.narrow-xy.tanpuku tr').length);

    $('table.basic.narrow-xy.tanpuku tr').each((_, element) => {
      const row = $(element);
      
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
  }

  private async parseWakurenOdds(html: string, raceId: number): Promise<WakurenOddsData[]> {
    const $ = cheerio.load(html);
    const wakurenOddsData: WakurenOddsData[] = [];

    // 全ての枠連テーブルを処理
    $('table.basic.narrow-xy.waku').each((_, table) => {
      const $table = $(table);
      
      // テーブルのcaptionから軸となる枠番を取得
      const captionClass = $table.find('caption').attr('class') || '';
      const frame1 = parseInt(captionClass.replace('waku', ''));
      
      console.log(`Processing wakuren odds for frame1: ${frame1}`);

      // 各行を処理
      $table.find('tr').each((_, row) => {
        const $row = $(row);
        const frame2Text = $row.find('th').first().text().trim();
        const frame2 = parseInt(frame2Text);

        if (!isNaN(frame2)) {
          const oddsText = $row.find('td').first().text().trim();
          if (oddsText && oddsText !== '-') {
            const odds = parseFloat(oddsText.replace(/,/g, ''));
            
            if (!isNaN(odds)) {
              wakurenOddsData.push({
                frame1,
                frame2,
                odds,
                timestamp: new Date(),
                raceId
              });
            }
          }
        }
      });
    });

    console.log(`Collected total ${wakurenOddsData.length} wakuren odds combinations`);
    return wakurenOddsData;
  }

  async saveTanOddsHistory(odds: OddsData) {
    // 単勝オッズは履歴として保存
    await db.insert(tanOddsHistory).values({
      horseId: odds.horseId,
      odds: odds.tanOdds.toString(),
      timestamp: odds.timestamp,
      raceId: odds.raceId
    });
  }

  async updateFukuOdds(odds: OddsData) {
    // 複勝オッズは更新（なければ挿入）
    const existing = await db.query.fukuOdds.findFirst({
      where: eq(fukuOdds.horseId, odds.horseId)
    });

    if (existing) {
      await db
        .update(fukuOdds)
        .set({
          oddsMin: odds.fukuOddsMin.toString(),
          oddsMax: odds.fukuOddsMax.toString(),
          timestamp: odds.timestamp
        })
        .where(eq(fukuOdds.id, existing.id));
    } else {
      await db.insert(fukuOdds).values({
        horseId: odds.horseId,
        oddsMin: odds.fukuOddsMin.toString(),
        oddsMax: odds.fukuOddsMax.toString(),
        timestamp: odds.timestamp,
        raceId: odds.raceId
      });
    }
  }

  async updateWakurenOdds(oddsDataArray: WakurenOddsData[]) {
    for (const odds of oddsDataArray) {
      const existing = await db.query.wakurenOdds.findFirst({
        where: and(
          eq(wakurenOdds.frame1, odds.frame1),
          eq(wakurenOdds.frame2, odds.frame2),
          eq(wakurenOdds.raceId, odds.raceId)
        )
      });

      if (existing) {
        await db.update(wakurenOdds)
          .set({
            odds: odds.odds.toString(),
            timestamp: odds.timestamp
          })
          .where(eq(wakurenOdds.id, existing.id));
      } else {
        await db.insert(wakurenOdds).values({
          frame1: odds.frame1,
          frame2: odds.frame2,
          odds: odds.odds.toString(),
          timestamp: odds.timestamp,
          raceId: odds.raceId
        });
      }
    }
  }

  async saveOddsHistory(oddsData: OddsData[]) {
    try {
      for (const odds of oddsData) {
        // 単勝オッズを履歴として保存
        await this.saveTanOddsHistory(odds);
        
        // 複勝オッズを更新
        await this.updateFukuOdds(odds);
      }
      console.log(`Saved odds for ${oddsData.length} horses`);
    } catch (error) {
      console.error('Error saving odds:', error);
      throw error;
    }
  }

  async startPeriodicCollection(intervalMinutes: number = 5) {
    setInterval(async () => {
      const activeRaces = await db.select()
        .from(races)
        .where(eq(races.status, 'upcoming'));

      for (const race of activeRaces) {
        for (const betType of Object.keys(this.betTypes)) {
          try {
            const oddsData = await this.collectOddsForBetType(race.id, betType);
            if (oddsData.length > 0) {
              if (betType === 'wakuren') {
                await this.updateWakurenOdds(oddsData);
              } else {
                await this.saveOddsHistory(oddsData);
              }
            }
          } catch (error) {
            console.error(`Error collecting ${betType} odds for race ${race.id}:`, error);
          }
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