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
  private activeJobs: Map<number, schedule.Job> = new Map();

  constructor() {
    this.collector = new OddsCollector();
  }

  async initialize() {
    this.browser = await chromium.launch({ 
      headless: true,
      executablePath: process.env.CHROME_BIN || undefined,  // nullをundefinedに変更
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer'
      ]
    });
    await this.collector.initialize();
  }

  // JRAページから当日のレース情報を取得（重賞とテスト対象レースを含む）
  async getTodayGradeRaces(): Promise<RaceInfo[]> {
    if (!this.browser) throw new Error('Browser not initialized');
    
    const context = await this.browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();
    const raceInfos: RaceInfo[] = [];

    try {
      // JRAトップページからオッズページへ遷移
      await page.goto('https://www.jra.go.jp/');
      await page.waitForLoadState('networkidle');
      
      await page.getByRole('link', { name: 'オッズ', exact: true }).click();
      await page.waitForLoadState('networkidle');

      const html = await page.content();
      const $ = cheerio.load(html);

      // 当日および翌日の開催情報を取得
      const today = new Date();
      const todayStr = `${today.getMonth() + 1}月${today.getDate()}日`;
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const tomorrowStr = `${tomorrow.getMonth() + 1}月${tomorrow.getDate()}日`;
      console.log('Looking for races on:', todayStr, 'or', tomorrowStr);

      // 各開催の情報を取得
      const kaisaiElements = $('.thisweek .panel.no-padding.no-border[class*="mt"]');
      console.log('Found kaisai elements:', kaisaiElements.length);

      for (const element of kaisaiElements.toArray()) {
        const $kaisai = $(element);
        const dateHeader = $kaisai.find('.sub_header').text().trim();
        console.log('Date header:', dateHeader);

        // 当日または翌日の開催情報であれば処理する
        if (dateHeader.includes(todayStr) || dateHeader.includes(tomorrowStr)) {
          console.log('Processing kaisai for date:', dateHeader);
          const kaisaiLinks = $kaisai.find('.link_list a');
          console.log('Found kaisai links:', kaisaiLinks.length);

          // ヘッダーの日付に合わせて基準日（baseDate）を設定
          let baseDate: Date;
          if (dateHeader.includes(tomorrowStr)) {
            baseDate = new Date(tomorrow);
          } else {
            baseDate = new Date(today);
          }
          
          for (const link of kaisaiLinks.toArray()) {
            const kaisaiText = $(link).text().trim();
            console.log('Kaisai text:', kaisaiText);
            const [kai, venue, nichi] = kaisaiText.match(/(\d+)回(.+?)(\d+)日/)?.slice(1) || [];
            console.log('Parsed values:', { kai, venue, nichi });
            
            try {
              // 開催ボタンをクリック
              const kaisaiName = `${kai}回${venue}${nichi}日`;
              await page.getByRole('link', { name: kaisaiName }).click();
              await page.waitForLoadState('networkidle');

              // レース一覧から重賞レースを探す
              const raceListHtml = await page.content();
              const $races = cheerio.load(raceListHtml);

              console.log('Checking races for:', kaisaiName);
              const rows = $races('tr').toArray();
              for (const row of rows) {
                const $row = $races(row);
                const $raceName = $row.find('.race_name');
                const $raceNum = $row.find('.race_num');
                const $raceTime = $row.find('.time');
                
                // レース名とグレード情報を取得
                const raceName = $raceName.find('.stakes').text().trim();
                const gradeIcon = $raceName.find('.grade_icon img').attr('src');
                const isGrade = gradeIcon?.includes('icon_grade_s_g');
                
                // レース番号の画像から取得（"11レース" → 11）
                const raceNumber = parseInt($raceNum.find('img').attr('alt')?.replace('レース', '') || '0');

                // テスト用の条件：東京5Rの場合も含む
                const isTestTarget = venue === '東京' && raceNumber === 9;
                
                if (isGrade || isTestTarget) {
                  // 時刻を日本語形式から変換（例：「15時45分」→ [15, 45]）
                  const timeText = $raceTime.text().trim();
                  console.log('Race time text:', timeText);

                  // 「発走済」の場合はステータス更新
                  if (timeText === '発走済') {
                    const year = baseDate.getFullYear();
                    const venueCode = this.getVenueCode(venue);
                    const raceId = parseInt(
                      `${year}${venueCode}${kai.padStart(2, '0')}${nichi.padStart(2, '0')}${raceNumber.toString().padStart(2, '0')}`
                    );
                    console.log(`Race ${raceName} has already started, updating status to done for ID: ${raceId}`);
                    await db.update(races)
                      .set({ status: 'done' })
                      .where(eq(races.id, raceId));
                    continue;
                  }

                  // baseDate を元にレース開始時刻を設定（ヘッダーの日付が翌日の場合は tomorrow、そうでなければ today）
                  const [hours, minutes] = timeText.replace(/[時分]/g, ':').split(':').map(Number);
                  const raceTime = new Date(baseDate.getTime());
                  raceTime.setHours(hours, minutes, 0, 0);
                  const year = baseDate.getFullYear();
                  const venueCode = this.getVenueCode(venue);
                  const raceId = parseInt(
                    `${year}${venueCode}${kai.padStart(2, '0')}${nichi.padStart(2, '0')}${raceNumber.toString().padStart(2, '0')}`
                  );

                  raceInfos.push({
                    id: raceId,
                    name: raceName || `${venue}${raceNumber}R`,
                    venue,
                    startTime: raceTime,
                    isGrade: !!isGrade  
                  });
                  
                  console.log('Found race:', { raceName, raceId, timeText, raceNumber });
                }
              }

              console.log('Found races for venue:', venue, raceInfos);

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

    console.log('Found grade races:', raceInfos);
    return raceInfos;
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
    // 既存のジョブがあれば削除
    if (this.activeJobs.has(race.id)) {
      const existingJob = this.activeJobs.get(race.id);
      existingJob?.cancel();
      this.activeJobs.delete(race.id);
    }
  
    let collectionStartTimeUTC: Date | null = null;
    if (race.isGrade) {
      // race.startTimeはUTCで保存されているので、toLocaleStringでJSTの日付文字列に変換
      const raceStartTimeInJST = new Date(
        race.startTime.toLocaleString("en-US", { timeZone: "Asia/Tokyo" })
      );
      // raceStartTimeInJSTはJSTのカレンダー日付として解釈できるので、
      // 収集開始は「前日 10:00 JST（UTC 01:00）」とする：
      const collectionYear = raceStartTimeInJST.getFullYear();
      const collectionMonth = raceStartTimeInJST.getMonth();
      const collectionDay = raceStartTimeInJST.getDate() - 1; // 前日
      collectionStartTimeUTC = new Date(Date.UTC(collectionYear, collectionMonth, collectionDay, 1, 0, 0));
  
      console.log(
        `Race ${race.id} is grade. Collection will start at ${collectionStartTimeUTC.toISOString()} (race.startTime remains ${race.startTime.toISOString()})`
      );
    }
  
    console.log(`Setting up schedule for race: ${race.id}`);
    
    // 10分間隔でジョブ実行（毎時 0, 10, 20, 30, 40, 50分）
    const rule = new schedule.RecurrenceRule();
    rule.minute = [0, 10, 20, 30, 40, 50];
  
    const job = schedule.scheduleJob(rule, async () => {
      const now = new Date();
  
      // 重賞の場合、収集開始UTC時刻に達していなければスキップする
      if (race.isGrade && collectionStartTimeUTC && now < collectionStartTimeUTC) {
        console.log(
          `Race ${race.id} is grade. Waiting for collection start time: ${collectionStartTimeUTC.toISOString()}. Current: ${now.toISOString()}`
        );
        return;
      }
  
      const timeToRace = race.startTime.getTime() - now.getTime();
  
      if (timeToRace > 0) {
        if (race.isGrade) {
          // 重賞レースは、収集開始時刻に達している場合、毎回収集を実施
          await this.collectOdds(race.id);
        } else {
          // 通常レースは、レース開始30分前以降は10分間隔で収集
          if (timeToRace <= 30 * 60 * 1000) {
            await this.collectOdds(race.id);
          }
          // それ以外は30分間隔で収集
          else if (now.getMinutes() % 30 === 0) {
            await this.collectOdds(race.id);
          }
        }
      } else {
        // レース開始後はジョブをキャンセル
        console.log(`Race ${race.id} has finished. Cancelling job.`);
        job.cancel();
        this.activeJobs.delete(race.id);
      }
    });
  
    this.activeJobs.set(race.id, job);
  
    // 初回実行: 重賞レースの場合、既に収集開始時刻に到達しているなら即時オッズ収集を実施する
    const now = new Date();
    if (race.isGrade && collectionStartTimeUTC && now >= collectionStartTimeUTC) {
      console.log(`Initial collection for grade race ${race.id}`);
      await this.collectOdds(race.id);
    }
  }

  // オッズ収集実行
  public async collectOdds(raceId: number) {
    try {
      const race = await db.query.races.findFirst({
        where: eq(races.id, raceId)
      });

      if (!race || race.status === 'done') return;

      const now = new Date();
      
      console.log(`Current time: ${now.toISOString()}`);
      console.log(`Race start time: ${race.startTime.toISOString()}`);
      
      if (race.startTime < now && race.status === 'upcoming') {
        console.log(`Race ${raceId} has finished. Updating status to done`);
        await db.update(races)
          .set({ status: 'done' })
          .where(eq(races.id, raceId));
        return;
      }

      console.log(`Collecting odds for race ${raceId}`);
      const betTypes = ['tanpuku', 'wakuren', 'umaren', 'wide', 'umatan', 'fuku3', 'tan3'] as const;
      
      for (const betType of betTypes) {
        try {
          console.log(`Collecting ${betType} odds for race ID: ${raceId}`);
          const odds = await this.collector.collectOddsForBetType(raceId, betType);
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

                  if (!existingHorse) {
                    console.log(`Registering horse: ${odd.horseName} (Race: ${raceId}, Frame: ${odd.frame}, Number: ${odd.number})`);
                    await db.insert(horses).values({
                      name: odd.horseName,
                      raceId: raceId,
                      frame: odd.frame,
                      number: odd.number,
                      status: odd.odds === '取消' ? 'scratched' : 'running'
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
                  }
                } catch (error) {
                  console.error(`Error handling horse ${odd.horseName} for race ${raceId}:`, error);
                }
              }
              await this.collector.saveOddsHistory(odds);
            } else {
              // 他の馬券種別の保存
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
            console.log(`${betType} odds data saved successfully`);
          }
        } catch (error) {
          console.error(`Error collecting ${betType} odds for race ${raceId}:`, error);
        }
      }
    } catch (error) {
      console.error('Error in collectOdds:', error);
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
    await this.collector.cleanup();
    Array.from(this.activeJobs.values()).forEach(job => job.cancel());
    this.activeJobs.clear();
  }

  async checkUpcomingRaces() {
    // DBからupcomingステータスのレースを取得
    const upcomingRaces = await db.query.races.findMany({
      where: eq(races.status, 'upcoming')
    });

    console.log('Found upcoming races:', upcomingRaces);

    // 各レースのステータスをチェック
    for (const race of upcomingRaces) {
      const now = new Date();
      if (race.startTime < now) {
        console.log(`Race ${race.id} has finished. Updating status to done`);
        await db.update(races)
          .set({ status: 'done' })
          .where(eq(races.id, race.id));
        continue;
      }

      // すでにジョブが存在している場合は再登録しない
      if (!this.activeJobs.has(race.id)) {
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
}

// メイン実行関数
async function main() {
  const dailyCollector = new DailyOddsCollector();
  
  try {
    console.log('Starting odds collector with NODE_ENV:', process.env.NODE_ENV);
    await dailyCollector.initialize();
    
    if (process.env.NODE_ENV === 'production') {
      // 本番環境では単発実行のみ
      console.log('Production mode: Running single collection cycle');
      const races = await dailyCollector.getTodayGradeRaces();
      console.log('Found races:', races);
      
      for (const race of races) {
        console.log('Processing race:', race);
        await dailyCollector.registerRace(race);
        await dailyCollector.collectOdds(race.id);
      }
    } else {
      // 開発環境では全ての機能を使用
      // 定期的にupcomingレースをチェック（5分ごと）
      console.log('Setting up 5-min check schedule');
      schedule.scheduleJob('*/5 * * * *', async () => {
        console.log('Running upcoming races check...');
        await dailyCollector.checkUpcomingRaces();
      });

      // 初回実行
      console.log('Running initial race collection...');
      const races = await dailyCollector.getTodayGradeRaces();
      console.log('Found races:', races);
      
      for (const race of races) {
        console.log('Processing race:', race);
        await dailyCollector.registerRace(race);
        await dailyCollector.scheduleOddsCollection(race);
        // テスト用レースの場合は即時収集も実行
        if (race.venue === '東京' && race.name.includes('春菜賞')) {
          await dailyCollector.collectOdds(race.id);
        }
        await new Promise(resolve => setTimeout(resolve, 5000));
      }

      // 毎日8:55に再取得
      console.log('Setting up 8:55 schedule');
      schedule.scheduleJob('55 8 * * *', async () => {
        console.log('Running 8:55 race collection...');
        const races = await dailyCollector.getTodayGradeRaces();
        for (const race of races) {
          await dailyCollector.registerRace(race);
          await dailyCollector.scheduleOddsCollection(race);
        }
      });
    }

  } catch (error) {
    console.error('Error in main process:', error);
  }
}

// スクリプト実行
main().catch(console.error); 