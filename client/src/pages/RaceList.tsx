import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Race } from "@db/schema";
import { useLocation } from "wouter";
import { format } from "date-fns";
import MainLayout from "@/components/layout/MainLayout";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { addDays, subDays, startOfWeek, isSameDay } from "date-fns";
import { ja } from "date-fns/locale";
import { Helmet } from "react-helmet-async";

interface RaceVenue {
  id: string;
  name: string;
}

// 全会場のリスト
const allVenues: RaceVenue[] = [
  { id: "札幌", name: "札幌" },
  { id: "函館", name: "函館" },
  { id: "福島", name: "福島" },
  { id: "新潟", name: "新潟" },
  { id: "東京", name: "東京" },
  { id: "中山", name: "中山" },
  { id: "中京", name: "中京" },
  { id: "京都", name: "京都" },
  { id: "阪神", name: "阪神" },
  { id: "小倉", name: "小倉" },
];

export default function RaceList() {
  // 最新のレース日を取得する関数
  const getLatestRaceDate = (races: Race[]) => {
    if (races.length === 0) return new Date();
    return new Date(Math.max(...races.map(race => new Date(race.startTime).getTime())));
  };

  const [_, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [showAllVenues, setShowAllVenues] = useState(false);
  // 選択された会場を追跡するための状態を追加
  const [selectedVenue, setSelectedVenue] = useState<string | null>(null);
  // 初期値を最新のレース日に設定
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());

  const { data: races = [], isLoading, error } = useQuery<Race[]>({
    queryKey: ["/api/races"],
    queryFn: async () => {
      const response = await fetch("/api/races");
      if (!response.ok) {
        throw new Error("APIからデータを取得できませんでした");
      }
      return response.json();
    },
    gcTime: 0,
    staleTime: 0,
    retry: 3,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (races.length > 0) {
      setSelectedDate(getLatestRaceDate(races));
    }
  }, [races]);

  // 選択された日付が週末でない場合、直前の週末を取得
  const getTargetDate = (date: Date) => {
    const dayOfWeek = date.getDay();
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      // 月～金の場合、直前の日曜日を取得
      const prevSunday = subDays(date, dayOfWeek);
      return prevSunday;
    }
    return date;
  };

  // 表示対象の日付のレースを取得
  const todayVenues = races
    .filter(race => {
      const raceDate = new Date(race.startTime);
      const targetDate = getTargetDate(selectedDate);
      
      // 土日の場合は選択された日付のレースのみ
      // 平日の場合は直前の週末（土日）のレースを表示
      return (
        isSameDay(raceDate, targetDate) ||
        isSameDay(raceDate, subDays(targetDate, 1))
      );
    })
    .map(race => race.venue)
    .filter((venue, index, self) => self.indexOf(venue) === index)
    .map(venue => ({ id: venue, name: venue }));

  // 会場をソートする関数
  const sortVenuesByOrder = (venues: RaceVenue[]) => {
    // allVenuesの順番に基づいてソート
    return [...venues].sort((a, b) => {
      const indexA = allVenues.findIndex(v => v.id === a.id);
      const indexB = allVenues.findIndex(v => v.id === b.id);
      return indexA - indexB;
    });
  };

  // 表示する会場のリスト（ソート済み）
  const venues = showAllVenues 
    ? allVenues 
    : (todayVenues.length > 0 ? sortVenuesByOrder(todayVenues) : allVenues);

  // 検索とフィルタリングのロジック
  const filterRaces = (races: Race[], venueId: string) => {
    return races
      .filter(race => {
        const matchesVenue = race.venue === venueId;
        const matchesSearch = searchQuery === "" || 
          race.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          race.id.toString().includes(searchQuery);

        // 検索時は日付フィルターを無視
        if (searchQuery !== "") {
          return matchesVenue && matchesSearch;
        }

        // 検索していない場合は選択された日付のレースを表示
        const matchesDate = () => {
          const raceDate = new Date(race.startTime);
          const targetDate = getTargetDate(selectedDate);
          return (
            isSameDay(raceDate, targetDate) ||
            isSameDay(raceDate, subDays(targetDate, 1))
          );
        };

        return matchesVenue && matchesSearch && matchesDate();
      })
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  };

  // 検索クエリに一致するレースがある最初の会場を見つける
  const findFirstMatchingVenue = () => {
    for (const venue of venues) {
      if (filterRaces(races, venue.id).length > 0) {
        return venue.id;
      }
    }
    return venues[0]?.id;
  };

  // 検索クエリが変更されたときに会場を更新
  useEffect(() => {
    if (searchQuery) {
      setSelectedVenue(findFirstMatchingVenue());
    } else if (venues.length > 0 && !selectedVenue) {
      setSelectedVenue(venues[0]?.id);
    }
  }, [searchQuery, venues]);

  // 会場リストが変更されたときに選択会場を更新
  useEffect(() => {
    if (venues.length > 0 && (!selectedVenue || !venues.some(v => v.id === selectedVenue))) {
      setSelectedVenue(venues[0]?.id);
    }
  }, [venues]);

  // 検索クエリに基づいてデフォルトの会場を設定
  const defaultVenue = searchQuery ? findFirstMatchingVenue() : venues[0]?.id;

  // ローディング中の表示
  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center h-[50vh]">
          <div>データを読み込み中...</div>
        </div>
      </MainLayout>
    );
  }

  // エラー時の表示
  if (error) {
    return (
      <MainLayout>
        <div className="flex flex-col justify-center items-center h-[50vh] gap-4">
          <div className="text-xl font-bold text-red-500">データの読み込みに失敗しました</div>
          <div className="text-muted-foreground text-sm max-w-md text-center">
            {error instanceof Error ? error.message : "サーバーとの通信中にエラーが発生しました。しばらく経ってから再度お試しください。"}
          </div>
          <Button 
            onClick={() => window.location.reload()} 
            className="mt-4"
          >
            再読み込み
          </Button>
        </div>
      </MainLayout>
    );
  }

  // データが空の場合の表示
  if (races.length === 0) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center h-[50vh]">
          <div>レースデータがありません</div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Helmet>
        <title>競馬予想・馬券作成アシスタント | 最新レース一覧と回収率アップの馬券戦略</title>
        <meta name="description" content="競馬予想と馬券作成をサポートするAIアシスタント。最新レース情報から的中率と期待値を計算し、回収率アップのための最適な馬券戦略を提案します。初心者から上級者まで簡単に利用できる競馬予想ツール。" />
        <link rel="canonical" href="https://horse-stakes.com" />
        <meta name="keywords" content="競馬予想,馬券作成,回収率アップ,期待値,競馬AI,馬券予想,競馬攻略,馬券戦略,競馬必勝法,馬券購入,競馬初心者,競馬予想サイト" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            "name": "競馬予想・馬券作成アシスタント",
            "description": "競馬予想と馬券作成をサポートするAIアシスタント。的中率と期待値を計算し、回収率アップのための最適な馬券戦略を提案します。",
            "applicationCategory": "SportsApplication",
            "operatingSystem": "Web",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "JPY"
            },
            "url": "https://horse-stakes.com"
          })}
        </script>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            "itemListElement": races.slice(0, 10).map((race, index) => ({
              "@type": "ListItem",
              "position": index + 1,
              "item": {
                "@type": "SportsEvent",
                "name": race.name,
                "startDate": new Date(race.startTime).toISOString(),
                "location": {
                  "@type": "Place",
                  "name": race.venue
                },
                "sport": "競馬",
                "url": `https://horse-stakes.com/race/${race.id}`
              }
            }))
          })}
        </script>
      </Helmet>

      {/* ヘッダーセクション */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-background to-primary/10 p-3 sm:p-5 md:p-6 mb-3 sm:mb-6 md:mb-8 shadow-sm">
        <div className="absolute inset-0 bg-grid-primary/5 [mask-image:linear-gradient(to_bottom,transparent_20%,black_70%)]" />
        <div className="relative flex justify-between items-start gap-2 sm:gap-4 md:gap-5">
          {/* タイトルセクション - モバイルでは非表示 */}
          <div className="hidden sm:flex flex-col gap-1 md:gap-2">
            <div className="flex items-center gap-2 md:gap-3">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent whitespace-nowrap">
                レース一覧
              </h1>
              <span className="text-xs sm:text-sm text-muted-foreground bg-primary/5 px-2 md:px-3 py-0.5 md:py-1 rounded-full whitespace-nowrap">
                競馬予想・回収率アップ
              </span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-md">
              AIで的中率と期待値を最適化
            </p>
          </div>
          
          {/* カレンダーと検索フィールド - フレキシブルレイアウト */}
          <div className="flex w-full sm:w-auto justify-between sm:justify-end items-center gap-2 sm:gap-3">
            {/* カレンダー - モバイルでは左側 */}
            <div className="order-1">
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="flex items-center gap-1 sm:gap-1.5 md:gap-2 bg-background/80 backdrop-blur-sm border-primary/20 hover:bg-primary/10 transition-all duration-300 text-[10px] sm:text-xs md:text-sm h-7 sm:h-8 md:h-9 px-2 sm:px-3"
                  >
                    <CalendarIcon className="h-3 w-3 sm:h-3.5 md:h-4 sm:w-3.5 md:w-4 text-primary" />
                    {format(selectedDate, 'yyyy/MM/dd')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 border-primary/20 shadow-lg">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    locale={ja}
                    disabled={(date) => date > new Date()}
                    className="rounded-lg border border-primary/10"
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            {/* 検索フィールド - モバイルでは右側 */}
            <div className="relative w-2/5 sm:w-48 md:w-54 order-2">
              <Search className="absolute left-2 sm:left-2.5 md:left-3 top-1/2 -translate-y-1/2 text-primary h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 z-10" />
              <Input
                type="text"
                placeholder="レース名で検索..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowAllVenues(e.target.value !== "");
                }}
                className="pl-7 sm:pl-9 md:pl-10 py-1 h-7 sm:h-9 md:h-10 bg-background/80 backdrop-blur-sm border-primary/20 focus:border-primary/50 w-full rounded-lg transition-all duration-300 focus:ring-1 sm:focus:ring-1 md:focus:ring-2 focus:ring-primary/20 text-[10px] sm:text-xs md:text-base"
              />
            </div>
          </div>
        </div>
        
        {/* 平日表示の注釈 - モバイルでは非表示 */}
        {selectedDate.getDay() >= 1 && selectedDate.getDay() <= 5 && (
          <div className="hidden sm:block mt-2 sm:mt-3">
            <span className="text-xs text-muted-foreground bg-primary/10 px-2 py-0.5 rounded-full whitespace-nowrap">
              ※平日は直前の週末のレースを表示
            </span>
          </div>
        )}
      </div>

      {venues.length > 0 ? (
        <Tabs 
          value={selectedVenue || venues[0]?.id} 
          onValueChange={setSelectedVenue}
          className="w-full"
        >
          <div className="relative mb-3 sm:mb-5 md:mb-6 -mx-4 sm:mx-0">
            <div className="overflow-x-auto scrollbar-hide">
              <div className="px-4 sm:px-0">
                <TabsList 
                  className="bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/70 rounded-lg sm:rounded-lg md:rounded-xl p-1 sm:p-1.5 md:p-1.5 flex mx-auto border border-primary/20 shadow-sm"
                  style={{ minWidth: 'min-content' }}
                >
                  {venues.map(venue => (
                    <TabsTrigger 
                      key={venue.id} 
                      value={venue.id}
                      className="flex-shrink-0 px-3 sm:px-4 md:px-5 py-1.5 sm:py-2 md:py-2.5 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md sm:rounded-md md:rounded-lg transition-all duration-300 hover:bg-primary/10"
                    >
                      {venue.name}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
            </div>
            <div className="absolute left-0 top-0 bottom-0 w-8 sm:w-10 md:w-12 bg-gradient-to-r from-background via-background/100 to-transparent pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-8 sm:w-10 md:w-12 bg-gradient-to-l from-background via-background/100 to-transparent pointer-events-none" />
          </div>

          {venues.map(venue => (
            <TabsContent key={venue.id} value={venue.id}>
              <div className="grid gap-3 sm:gap-3 md:gap-4 pb-16 md:pb-0">
                {filterRaces(races, venue.id).length === 0 ? (
                  <div className="text-center text-muted-foreground py-8 sm:py-10 md:py-12 bg-background/70 backdrop-blur-sm rounded-xl border border-primary/20 shadow-sm">
                    <div className="flex flex-col items-center gap-2 sm:gap-2.5 md:gap-3">
                      <Search className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 text-primary/30" />
                      <p className="text-base sm:text-base md:text-lg font-medium">
                        {searchQuery ? "検索結果が見つかりません" : "レースがありません"}
                      </p>
                    </div>
                  </div>
                ) : (
                  filterRaces(races, venue.id).map(race => (
                    <Card 
                      key={race.id}
                      className="cursor-pointer group relative overflow-hidden bg-background/70 backdrop-blur-sm border-primary/20 hover:bg-primary/5 transition-all duration-300 hover:scale-[1.01] hover:-translate-y-0.5 hover:shadow-md rounded-lg sm:rounded-lg md:rounded-xl"
                      onClick={() => setLocation(`/race/${race.id}`)}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-background/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <CardContent className="relative p-3 sm:p-4 md:p-5">
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="font-bold text-base sm:text-lg md:text-lg text-foreground/90 group-hover:text-primary transition-colors duration-300">
                              {race.name}
                            </h3>
                            <p className="text-xs sm:text-sm md:text-sm text-muted-foreground flex items-center gap-2 mt-1">
                              <span className="text-muted-foreground">
                                {format(new Date(race.startTime), 'MM/dd(E)', { locale: ja })}
                              </span>
                              <span className="bg-primary/15 px-2 sm:px-2.5 md:px-2.5 py-0.5 rounded-full text-primary font-medium">
                                {format(new Date(race.startTime), 'HH:mm')}
                              </span>
                            </p>
                          </div>
                          <div className="text-right">
                            {race.status === 'done' && (
                              <p className="text-xs sm:text-sm md:text-sm font-medium text-foreground/80 bg-primary/10 px-2 sm:px-2.5 md:px-3 py-0.5 sm:py-0.5 md:py-1 rounded-full">
                                発走済
                              </p>
                            )}
                            <p className="text-[10px] sm:text-xs md:text-xs text-muted-foreground mt-1 sm:mt-1.5 md:mt-2">
                              ID: {race.id}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <div className="text-center text-muted-foreground py-12 sm:py-14 md:py-16 bg-background/70 backdrop-blur-sm rounded-xl border border-primary/20 shadow-sm">
          <div className="flex flex-col items-center gap-3 sm:gap-3.5 md:gap-4">
            <CalendarIcon className="h-10 w-10 sm:h-11 sm:w-11 md:h-12 md:w-12 text-primary/30" />
            <p className="text-lg sm:text-lg md:text-xl font-medium">開催中のレースはありません</p>
          </div>
        </div>
      )}
    </MainLayout>
  );
}