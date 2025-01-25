import { OddsCollector } from './odds-collector';
import { db } from '../db';
import { races, horses } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { Browser, Page, chromium } from 'playwright';
import * as cheerio from 'cheerio';
import schedule from 'node-schedule';

interface RaceInfo {
  id: number;
  name: string;
  venue: string;
  startTime: Date;
  isGrade: boolean;
}

class DailyOddsCollector {
  private browser: Browser | null = null;
  private collector: OddsCollector;

  constructor() {
    this.collector = new OddsCollector();
  }

  async initialize() {
    this.browser = await chromium.launch({ 
      headless: true,
      args: ['--no-sandbox']
    });
    await this.collector.initialize();
  }

  // JRAページから当日の重賞レース情報を取得
  async getTodayGradeRaces(): Promise<RaceInfo[]> {
    if (!this.browser) throw new Error('Browser not initialized');
    
    const context = await this.browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();
    const races: RaceInfo[] = [];

    try {
      // JRAトップページからオッズページへ遷移
      await page.goto('https://www.jra.go.jp/');
      await page.waitForLoadState('networkidle');
      
      await page.getByRole('link', { name: 'オッズ', exact: true }).click();
      await page.waitForLoadState('networkidle');

      const html = await page.content();
      const $ = cheerio.load(html);

      // 当日の開催情報を取得
      const today = new Date();
      const todayStr = `${today.getMonth() + 1}月${today.getDate()}日`;
      console.log('Looking for races on:', todayStr);

      // 各開催の情報を取得
      const kaisaiElements = $('.thisweek .panel.no-padding.no-border[class*="mt"]');
      console.log('Found kaisai elements:', kaisaiElements.length);

      const promises: Promise<void>[] = [];
      for (const element of kaisaiElements.toArray()) {
        const $kaisai = $(element);
        const dateHeader = $kaisai.find('.sub_header').text().trim();
        console.log('Date header:', dateHeader);

        if (dateHeader.includes(todayStr)) {
          console.log('Processing kaisai for today');
          const kaisaiLinks = $kaisai.find('.link_list a');
          console.log('Found kaisai links:', kaisaiLinks.length);

          for (const link of kaisaiLinks.toArray()) {
            const kaisaiText = $(link).text().trim();
            console.log('Kaisai text:', kaisaiText);
            const [kai, venue, nichi] = kaisaiText.match(/(\d+)回(.+?)(\d+)日/)?.slice(1) || [];
            console.log('Parsed values:', { kai, venue, nichi });
            
            // 順次処理
            try {
              // 開催ボタンをクリック
              const kaisaiName = `${kai}回${venue}${nichi}日`;
              await page.getByRole('link', { name: kaisaiName }).click();
              await page.waitForLoadState('networkidle');

              // レース一覧から重賞レースを探す
              const raceListHtml = await page.content();
              const $races = cheerio.load(raceListHtml);

              console.log('Checking races for:', kaisaiName);
              $races('tr').each((_, row) => {
                const $row = $races(row);
                const $raceName = $row.find('.race_name');
                const $raceNum = $row.find('.race_num');
                const $raceTime = $row.find('.time');
                
                // レース名とグレード情報を取得
                const raceName = $raceName.find('.stakes').text().trim();
                const gradeIcon = $raceName.find('.grade_icon img').attr('src');
                
                // グレード判定を修正（G1, G2, G3すべてに対応）
                const isGrade = gradeIcon?.includes('icon_grade_s_g');
                
                if (isGrade) {
                  // レース番号を画像のalt属性から取得（"11レース" → 11）
                  const raceNumber = parseInt($raceNum.find('img').attr('alt')?.replace('レース', '') || '0');
                  
                  // 時刻を日本語形式から変換（15時25分 → 15:25）
                  const timeText = $raceTime.text().trim();
                  const [hours, minutes] = timeText.replace(/[時分]/g, ':').split(':').map(Number);

                  // レース時刻を設定
                  const raceTime = new Date(today);
                  raceTime.setHours(hours, minutes, 0, 0);

                  const year = today.getFullYear();  // 年を100で割らない
                  const venueCode = this.getVenueCode(venue);
                  const raceId = parseInt(
                    `${year}${venueCode}${kai.padStart(2, '0')}${nichi.padStart(2, '0')}${raceNumber.toString().padStart(2, '0')}`
                  );

                  races.push({
                    id: raceId,
                    name: raceName,
                    venue,
                    startTime: raceTime,
                    isGrade: true
                  });
                  
                  console.log('Found grade race:', { raceName, raceId, timeText, raceNumber });
                }
              });

              console.log('Found races for venue:', venue, races);

              // 開催選択ページに戻る
              await page.goto('https://www.jra.go.jp/keiba/');
              await page.waitForLoadState('networkidle');
              await page.getByRole('link', { name: 'オッズ', exact: true }).click();
              await page.waitForLoadState('networkidle');
            } catch (error) {
              console.error(`Error processing ${kaisaiText}:`, error);
            }
          }
        }
      }

    } finally {
      await context.close();
    }

    console.log('Found grade races:', races);
    return races;
  }

  // レース情報をDBに登録
  async registerRace(race: RaceInfo) {
    const existingRace = await db.query.races.findFirst({
      where: eq(races.id, race.id)
    });

    if (!existingRace) {
      await db.insert(races).values({
        id: race.id,
        name: race.name,
        venue: race.venue,
        startTime: race.startTime,
        status: "upcoming"
      });
    }
  }

  // オッズ収集のスケジュール設定
  async scheduleOddsCollection(race: RaceInfo) {
    console.log('Setting up schedule for race:', race);
    const raceTime = race.startTime;
    const morningCollection = new Date(raceTime);
    morningCollection.setHours(9, 0, 0, 0);

    // 朝9時の初回収集
    if (morningCollection > new Date()) {
      schedule.scheduleJob(morningCollection, () => this.collectOdds(race.id));
    }

    // 30分毎の更新スケジュール
    const thirtyMinRule = new schedule.RecurrenceRule();
    thirtyMinRule.minute = [0, 30];
    console.log('Setting up 30-min schedule:', thirtyMinRule);

    schedule.scheduleJob(thirtyMinRule, () => {
      const now = new Date();
      const timeToRace = raceTime.getTime() - now.getTime();
      
      // レース30分前からは10分毎に更新
      if (timeToRace > 0) {
        if (timeToRace <= 30 * 60 * 1000) {
          this.collectOdds(race.id);
        } else {
          // 通常の30分毎更新
          console.log('30-min schedule triggered for race:', race.id);
          this.collectOdds(race.id);
        }
      }
    });

    // レース30分前からの10分毎更新用
    const tenMinRule = new schedule.RecurrenceRule();
    tenMinRule.minute = new Array(6).fill(0).map((_, i) => i * 10);
    console.log('Setting up 10-min schedule:', tenMinRule);

    schedule.scheduleJob(tenMinRule, () => {
      const now = new Date();
      const timeToRace = raceTime.getTime() - now.getTime();
      console.log('10-min schedule check:', { timeToRace, raceId: race.id });
      
      if (timeToRace > 0 && timeToRace <= 30 * 60 * 1000) {
        this.collectOdds(race.id);
      }
    });
  }

  // オッズ収集実行
  public async collectOdds(raceId: number) {
    // レースのステータスをチェック
    const race = await db.query.races.findFirst({
      where: eq(races.id, raceId)
    });

    if (!race) return;

    // レース発走時刻を過ぎていたらステータスを更新
    if (race.startTime < new Date() && race.status === 'upcoming') {
      await db.update(races)
        .set({ status: 'done' })
        .where(eq(races.id, raceId));
      return;
    }

    // レースが終了していたらオッズ収集をスキップ
    if (race.status === 'done') return;

    const betTypes = ['tanpuku', 'wakuren', 'umaren', 'wide', 'umatan', 'fuku3', 'tan3'] as const;
    
    for (const betType of betTypes) {
      try {
        const odds = await this.collector.collectOddsForBetType(raceId, betType);
        if (odds.length > 0) {
          if (betType === 'tanpuku') {
            await this.collector.saveOddsHistory(odds);
          } else {
            const updateMethod = {
              wakuren: this.collector.updateWakurenOdds.bind(this.collector),
              umaren: this.collector.updateUmarenOdds.bind(this.collector),
              wide: this.collector.updateWideOdds.bind(this.collector),
              umatan: this.collector.updateUmatanOdds.bind(this.collector),
              fuku3: this.collector.updateFuku3Odds.bind(this.collector),
              tan3: this.collector.updateTan3Odds.bind(this.collector)
            }[betType];

            await updateMethod(odds);
          }
        }
      } catch (error) {
        console.error(`Error collecting ${betType} odds for race ${raceId}:`, error);
      }
    }
  }

  private getVenueCode(venue: string): string {
    const venueMap: { [key: string]: string } = {
      "札幌": "01", "函館": "02", "福島": "03", "新潟": "04",
      "東京": "05", "中山": "06", "中京": "07", "京都": "08",
      "阪神": "09", "小倉": "10"
    };
    return venueMap[venue] || "00";
  }

  async cleanup() {
    if (this.browser) await this.browser.close();
    await this.collector.cleanup();
  }

  async checkUpcomingRaces() {
    // DBからupcomingステータスのレースを取得
    const upcomingRaces = await db.query.races.findMany({
      where: eq(races.status, 'upcoming')
    });

    console.log('Found upcoming races:', upcomingRaces);

    // 各レースのオッズ収集をスケジュール
    for (const race of upcomingRaces) {
      await this.scheduleOddsCollection({
        id: race.id,
        name: race.name,
        venue: race.venue,
        startTime: race.startTime,
        isGrade: true
      });
    }
  }
}

// メイン実行関数
async function main() {
  const dailyCollector = new DailyOddsCollector();
  
  try {
    await dailyCollector.initialize();
    
    // 定期的にupcomingレースをチェック（5分ごと）
    schedule.scheduleJob('*/5 * * * *', async () => {
      await dailyCollector.checkUpcomingRaces();
    });

    if (process.env.NODE_ENV === 'development') {
      // 開発環境：即時実行
      console.log('Starting immediate collection...');
      const races = await dailyCollector.getTodayGradeRaces();
      console.log('Found races:', races);
      
      for (const race of races) {
        await dailyCollector.registerRace(race);
        await dailyCollector.scheduleOddsCollection(race);
        await dailyCollector.collectOdds(race.id);
      }
    } else {
      // 本番環境：スケジュール実行
      schedule.scheduleJob('55 8 * * *', async () => {
        const races = await dailyCollector.getTodayGradeRaces();
        for (const race of races) {
          await dailyCollector.registerRace(race);
          await dailyCollector.scheduleOddsCollection(race);
        }
      });
    }

  } catch (error) {
    console.error('Error in main process:', error);
  } finally {
    if (process.env.NODE_ENV === 'development') {
      await dailyCollector.cleanup();
      process.exit(0);
    }
  }
}

// スクリプト実行
main().catch(console.error); 