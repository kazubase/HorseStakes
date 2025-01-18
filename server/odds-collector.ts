import 'dotenv/config';
import { Browser, Page, chromium } from 'playwright';
import { db } from '../db';
import { horses, races, tanOddsHistory, fukuOdds, wakurenOdds, umarenOdds, wideOdds, umatanOdds, fuku3Odds, tan3Odds } from '../db/schema';
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
  frame: number;
  number: number;
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

interface UmarenOddsData {
  horse1: number;
  horse2: number;
  odds: number;
  timestamp: Date;
  raceId: number;
}

interface BetTypeConfig {
  tabName: string;          // タブの名前（'枠連'、'馬連'など）
  tableSelector: string;    // テーブルのセレクタ
  parser: (html: string, raceId: number) => Promise<any[]>; // パーサー関数
}

// インターフェースの追加
interface WideOddsData {
  horse1: number;
  horse2: number;
  oddsMin: number;
  oddsMax: number;
  timestamp: Date;
  raceId: number;
}

// インターフェースの追加
interface UmatanOddsData {
  horse1: number;  // 1着となる馬
  horse2: number;  // 2着となる馬
  odds: number;
  timestamp: Date;
  raceId: number;
}

// インターフェースの追加
interface Fuku3OddsData {
  horse1: number;
  horse2: number;
  horse3: number;
  odds: number;
  timestamp: Date;
  raceId: number;
}

// インターフェースの追加
interface Tan3OddsData {
  horse1: number;  // 1着となる馬
  horse2: number;  // 2着となる馬
  horse3: number;  // 3着となる馬
  odds: number;
  timestamp: Date;
  raceId: number;
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
    umaren: {
      tabName: '馬連',
      tableSelector: 'table.basic.narrow-xy.umaren',
      parser: this.parseUmarenOdds.bind(this)
    },
    wide: {
      tabName: 'ワイド',
      tableSelector: 'table.basic.narrow-xy.wide',
      parser: this.parseWideOdds.bind(this)
    },
    umatan: {
      tabName: '馬単',
      tableSelector: 'table.basic.narrow-xy.umatan',
      parser: this.parseUmatanOdds.bind(this)
    },
    fuku3: {
      tabName: '3連複',
      tableSelector: 'table.basic.narrow-xy.fuku3',
      parser: this.parseFuku3Odds.bind(this)
    },
    tan3: {
      tabName: '3連単',
      tableSelector: 'table.basic.narrow-xy.tan3',
      parser: this.parseTan3Odds.bind(this)
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

    let currentFrame = 0;
    let remainingRowspan = 0;

    $('table.basic.narrow-xy.tanpuku tr').each((_, element) => {
      const row = $(element);
      
      // 馬番を取得
      const horseNumberCell = row.find('td.num');
      if (!horseNumberCell.length) return;
      
      const horseNumber = horseNumberCell.text().trim();
      if (!horseNumber || isNaN(parseInt(horseNumber))) return;

      const horseId = parseInt(horseNumber);
      if (processedHorseIds.has(horseId)) return;

      // 枠番を取得
      const wakuCell = row.find('td.waku');
      if (wakuCell.length) {
        // 新しい枠が始まる場合
        const rowspanAttr = wakuCell.attr('rowspan');
        remainingRowspan = rowspanAttr ? parseInt(rowspanAttr) : 1;
        
        // imgのsrcから枠番を取得
        const wakuImg = wakuCell.find('img');
        const wakuSrc = wakuImg.attr('src') || '';
        const frameMatch = wakuSrc.match(/waku\/(\d+)\.png/);
        currentFrame = frameMatch ? parseInt(frameMatch[1]) : 0;
      } else {
        // 同じ枠の2頭目以降の場合
        remainingRowspan--;
      }

      if (currentFrame === 0) {
        console.log('Warning: Failed to get frame number for horse:', horseId);
        return;
      }

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
          frame: currentFrame,
          number: horseId,
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

  private async parseUmarenOdds(html: string, raceId: number): Promise<UmarenOddsData[]> {
    const $ = cheerio.load(html);
    const umarenOddsData: UmarenOddsData[] = [];

    // 全ての馬連テーブルを処理
    $('table.basic.narrow-xy.umaren').each((_, table) => {
      const $table = $(table);
      
      // テーブルのcaptionから軸となる馬番を取得
      const captionText = $table.find('caption').text().trim();
      const horse1 = parseInt(captionText); // 数値のみを取得
      
      if (isNaN(horse1)) {
        console.warn('Failed to parse horse1 number from caption:', captionText);
        return;
      }

      // 各行を処理
      $table.find('tbody tr').each((_, row) => {
        const $row = $(row);
        const horse2Text = $row.find('th').first().text().trim();
        const horse2 = parseInt(horse2Text);

        if (!isNaN(horse2)) {
          const oddsText = $row.find('td').first().text().trim();
          if (oddsText && oddsText !== '-') {
            const odds = parseFloat(oddsText.replace(/,/g, ''));
            
            if (!isNaN(odds)) {
              umarenOddsData.push({
                horse1,
                horse2,
                odds,
                timestamp: new Date(),
                raceId
              });
            }
          }
        }
      });
    });

    console.log(`Collected total ${umarenOddsData.length} umaren odds combinations`);
    return umarenOddsData;
  }

  // パーサー関数の実装
  private async parseWideOdds(html: string, raceId: number): Promise<WideOddsData[]> {
    const $ = cheerio.load(html);
    const wideOddsData: WideOddsData[] = [];

    // 全てのワイドテーブルを処理
    $('table.basic.narrow-xy.wide').each((_, table) => {
      const $table = $(table);
      
      // テーブルのcaptionから軸となる馬番を取得
      const captionText = $table.find('caption').text().trim();
      const horse1 = parseInt(captionText);
      
      if (isNaN(horse1)) {
        console.warn('Failed to parse horse1 number from caption:', captionText);
        return;
      }

      // 各行を処理
      $table.find('tbody tr').each((_, row) => {
        const $row = $(row);
        const horse2Text = $row.find('th').first().text().trim();
        const horse2 = parseInt(horse2Text);

        if (!isNaN(horse2)) {
          // span.minとspan.maxから値を取得
          const $odds = $row.find('td.odds');
          const oddsMinText = $odds.find('span.min').text().trim();
          const oddsMaxText = $odds.find('span.max').text().trim();
          
          if (oddsMinText && oddsMaxText) {
            const oddsMin = parseFloat(oddsMinText.replace(/,/g, ''));
            const oddsMax = parseFloat(oddsMaxText.replace(/,/g, ''));
            
            if (!isNaN(oddsMin) && !isNaN(oddsMax)) {
              wideOddsData.push({
                horse1,
                horse2,
                oddsMin,
                oddsMax,
                timestamp: new Date(),
                raceId
              });
            }
          }
        }
      });
    });

    console.log(`Collected total ${wideOddsData.length} wide odds combinations`);
    return wideOddsData;
  }

  // パーサー関数の実装
  private async parseUmatanOdds(html: string, raceId: number): Promise<UmatanOddsData[]> {
    const $ = cheerio.load(html);
    const umatanOddsData: UmatanOddsData[] = [];

    // 全ての馬単テーブルを処理
    $('table.basic.narrow-xy.umatan').each((_, table) => {
      const $table = $(table);
      
      // テーブルのcaptionから1着となる馬番を取得
      const captionText = $table.find('caption').text().trim();
      const horse1 = parseInt(captionText);
      
      if (isNaN(horse1)) {
        console.warn('Failed to parse horse1 number from caption:', captionText);
        return;
      }

      // 各行を処理
      $table.find('tbody tr').each((_, row) => {
        const $row = $(row);
        const horse2Text = $row.find('th').first().text().trim();
        const horse2 = parseInt(horse2Text);

        if (!isNaN(horse2)) {
          const oddsText = $row.find('td').first().text().trim();
          if (oddsText && oddsText !== '-') {
            const odds = parseFloat(oddsText.replace(/,/g, ''));
            
            if (!isNaN(odds)) {
              umatanOddsData.push({
                horse1,  // 1着となる馬
                horse2,  // 2着となる馬
                odds,
                timestamp: new Date(),
                raceId
              });
            }
          }
        }
      });
    });

    console.log(`Collected total ${umatanOddsData.length} umatan odds combinations`);
    return umatanOddsData;
  }

  // パーサー関数の実装
  private async parseFuku3Odds(html: string, raceId: number): Promise<Fuku3OddsData[]> {
    const $ = cheerio.load(html);
    const fuku3OddsData: Fuku3OddsData[] = [];

    // 全ての3連複テーブルを処理
    $('table.basic.narrow-xy.fuku3').each((_, table) => {
      const $table = $(table);
      
      // テーブルのcaptionから最初の2頭の馬番を取得 (例: "1-2")
      const captionText = $table.find('caption').text().trim();
      const [horse1, horse2] = captionText.split('-').map(num => parseInt(num));
      
      if (isNaN(horse1) || isNaN(horse2)) {
        console.warn('Failed to parse horses from caption:', captionText);
        return;
      }

      // 各行を処理
      $table.find('tbody tr').each((_, row) => {
        const $row = $(row);
        const horse3Text = $row.find('th').first().text().trim();
        const horse3 = parseInt(horse3Text);

        if (!isNaN(horse3)) {
          const oddsText = $row.find('td').first().text().trim();
          if (oddsText && oddsText !== '-') {
            const odds = parseFloat(oddsText.replace(/,/g, ''));
            
            if (!isNaN(odds)) {
              fuku3OddsData.push({
                horse1,
                horse2,
                horse3,
                odds,
                timestamp: new Date(),
                raceId
              });
            }
          }
        }
      });
    });

    console.log(`Collected total ${fuku3OddsData.length} fuku3 odds combinations`);
    return fuku3OddsData;
  }

  // パーサー関数の実装
  private async parseTan3Odds(html: string, raceId: number): Promise<Tan3OddsData[]> {
    const $ = cheerio.load(html);
    const tan3OddsData: Tan3OddsData[] = [];

    // 各馬の3連単テーブルを処理
    $('table.basic.narrow-xy.tan3').each((_, table) => {
      const $table = $(table);
      
      // テーブルの親要素から1着と2着の馬番を取得
      const $container = $table.closest('li');
      const $pLines = $container.find('div.p_line');
      
      // 1着となる馬番を取得
      const horse1Text = $pLines.eq(0).find('div.num').text().trim();
      const horse1 = parseInt(horse1Text);
      
      // 2着となる馬番を取得
      const horse2Text = $pLines.eq(1).find('div.num').text().trim();
      const horse2 = parseInt(horse2Text);
      
      if (isNaN(horse1) || isNaN(horse2)) {
        console.warn('Failed to parse horse numbers:', { horse1Text, horse2Text });
        return;
      }

      // 各行を処理（3着となる馬）
      $table.find('tbody tr').each((_, row) => {
        const $row = $(row);
        const horse3Text = $row.find('th[scope="row"]').text().trim();
        const horse3 = parseInt(horse3Text);

        if (!isNaN(horse3)) {
          const oddsText = $row.find('td').first().text().trim();
          if (oddsText && oddsText !== '-') {
            const odds = parseFloat(oddsText.replace(/,/g, ''));
            
            if (!isNaN(odds)) {
              tan3OddsData.push({
                horse1,  // 1着となる馬
                horse2,  // 2着となる馬
                horse3,  // 3着となる馬
                odds,
                timestamp: new Date(),
                raceId
              });
            }
          }
        }
      });
    });

    console.log(`Collected total ${tan3OddsData.length} tan3 odds combinations`);
    return tan3OddsData;
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

  async updateUmarenOdds(oddsDataArray: UmarenOddsData[]) {
    for (const odds of oddsDataArray) {
      const existing = await db.query.umarenOdds.findFirst({
        where: and(
          eq(umarenOdds.horse1, odds.horse1),
          eq(umarenOdds.horse2, odds.horse2),
          eq(umarenOdds.raceId, odds.raceId)
        )
      });

      if (existing) {
        await db.update(umarenOdds)
          .set({
            odds: odds.odds.toString(),
            timestamp: odds.timestamp
          })
          .where(eq(umarenOdds.id, existing.id));
      } else {
        await db.insert(umarenOdds).values({
          horse1: odds.horse1,
          horse2: odds.horse2,
          odds: odds.odds.toString(),
          timestamp: odds.timestamp,
          raceId: odds.raceId
        });
      }
    }
  }

  async updateWideOdds(oddsDataArray: WideOddsData[]) {
    for (const odds of oddsDataArray) {
      const existing = await db.query.wideOdds.findFirst({
        where: and(
          eq(wideOdds.horse1, odds.horse1),
          eq(wideOdds.horse2, odds.horse2),
          eq(wideOdds.raceId, odds.raceId)
        )
      });

      if (existing) {
        await db.update(wideOdds)
          .set({
            oddsMin: odds.oddsMin.toString(),
            oddsMax: odds.oddsMax.toString(),
            timestamp: odds.timestamp
          })
          .where(eq(wideOdds.id, existing.id));
      } else {
        await db.insert(wideOdds).values({
          horse1: odds.horse1,
          horse2: odds.horse2,
          oddsMin: odds.oddsMin.toString(),
          oddsMax: odds.oddsMax.toString(),
          timestamp: odds.timestamp,
          raceId: odds.raceId
        });
      }
    }
  }

  async updateUmatanOdds(oddsDataArray: UmatanOddsData[]) {
    for (const odds of oddsDataArray) {
      const existing = await db.query.umatanOdds.findFirst({
        where: and(
          eq(umatanOdds.horse1, odds.horse1),
          eq(umatanOdds.horse2, odds.horse2),
          eq(umatanOdds.raceId, odds.raceId)
        )
      });

      if (existing) {
        await db.update(umatanOdds)
          .set({
            odds: odds.odds.toString(),
            timestamp: odds.timestamp
          })
          .where(eq(umatanOdds.id, existing.id));
      } else {
        await db.insert(umatanOdds).values({
          horse1: odds.horse1,
          horse2: odds.horse2,
          odds: odds.odds.toString(),
          timestamp: odds.timestamp,
          raceId: odds.raceId
        });
      }
    }
  }

  async updateFuku3Odds(oddsDataArray: Fuku3OddsData[]) {
    for (const odds of oddsDataArray) {
      // 3頭の馬番を昇順にソートして保存（順不同のため）
      const horses = [odds.horse1, odds.horse2, odds.horse3].sort((a, b) => a - b);
      
      const existing = await db.query.fuku3Odds.findFirst({
        where: and(
          eq(fuku3Odds.horse1, horses[0]),
          eq(fuku3Odds.horse2, horses[1]),
          eq(fuku3Odds.horse3, horses[2]),
          eq(fuku3Odds.raceId, odds.raceId)
        )
      });

      if (existing) {
        await db.update(fuku3Odds)
          .set({
            odds: odds.odds.toString(),
            timestamp: odds.timestamp
          })
          .where(eq(fuku3Odds.id, existing.id));
      } else {
        await db.insert(fuku3Odds).values({
          horse1: horses[0],
          horse2: horses[1],
          horse3: horses[2],
          odds: odds.odds.toString(),
          timestamp: odds.timestamp,
          raceId: odds.raceId
        });
      }
    }
  }

  async updateTan3Odds(oddsDataArray: Tan3OddsData[]) {
    for (const odds of oddsDataArray) {
      const existing = await db.query.tan3Odds.findFirst({
        where: and(
          eq(tan3Odds.horse1, odds.horse1),
          eq(tan3Odds.horse2, odds.horse2),
          eq(tan3Odds.horse3, odds.horse3),
          eq(tan3Odds.raceId, odds.raceId)
        )
      });

      if (existing) {
        await db.update(tan3Odds)
          .set({
            odds: odds.odds.toString(),
            timestamp: odds.timestamp
          })
          .where(eq(tan3Odds.id, existing.id));
      } else {
        await db.insert(tan3Odds).values({
          horse1: odds.horse1,
          horse2: odds.horse2,
          horse3: odds.horse3,
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
              } else if (betType === 'umaren') {
                await this.updateUmarenOdds(oddsData);
              } else if (betType === 'wide') {
                await this.updateWideOdds(oddsData);
              } else if (betType === 'umatan') {
                await this.updateUmatanOdds(oddsData);
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