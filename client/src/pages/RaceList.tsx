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
  // 初期値を最新のレース日に設定
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());

  const { data: races = [], isLoading, error } = useQuery<Race[]>({
    queryKey: ["/api/races"],
    gcTime: 0,
    staleTime: 0,
    retry: false,
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

  // デバッグ用のログ出力
  console.log('Races:', races);
  console.log('Today Venues:', todayVenues);

  // 表示する会場のリスト
  const venues = showAllVenues ? allVenues : (todayVenues.length > 0 ? todayVenues : allVenues);
  console.log('Showing Venues:', venues);

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
        <div className="flex justify-center items-center h-[50vh]">
          <div>データの読み込みに失敗しました</div>
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
      {/* ヘッダーセクション */}
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-background to-primary/5 p-4 mb-6">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-background/5 to-transparent opacity-30" />
        <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <h1 className="text-2xl font-bold bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
              レース一覧
            </h1>
            <div className="flex items-center gap-2 flex-wrap">
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="flex items-center gap-2 bg-background/80 backdrop-blur-sm border-primary/10 hover:bg-primary/10"
                  >
                    <CalendarIcon className="h-4 w-4 text-primary/70" />
                    {format(selectedDate, 'yyyy/MM/dd')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
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
              {selectedDate.getDay() >= 1 && selectedDate.getDay() <= 5 && (
                <span className="text-sm text-muted-foreground/80 bg-primary/5 px-2 py-1 rounded-md">
                  ※平日は直前の週末のレースを表示
                </span>
              )}
            </div>
          </div>
          
          <div className="w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-primary/50 h-4 w-4" />
              <Input
                type="text"
                placeholder="レース名またはレースIDで検索..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowAllVenues(e.target.value !== "");
                }}
                className="pl-10 bg-background/80 backdrop-blur-sm border-primary/10 focus:border-primary/30 w-full"
              />
            </div>
          </div>
        </div>
      </div>

      {venues.length > 0 ? (
        <Tabs defaultValue={venues[0]?.id} className="w-full">
          <div className="relative mb-4 -mx-4 sm:mx-0">
            <div className="overflow-x-auto scrollbar-hide">
              <div className="px-4 sm:px-0 min-w-full">
                <TabsList 
                  className="bg-background/50 backdrop-blur supports-[backdrop-filter]:bg-background/50 rounded-lg p-1 flex w-[max-content] mx-auto border border-primary/10"
                >
                  {venues.map(venue => (
                    <TabsTrigger 
                      key={venue.id} 
                      value={venue.id}
                      className="flex-shrink-0 px-4 py-2 data-[state=active]:bg-primary/90 data-[state=active]:text-primary-foreground rounded-md transition-all duration-300 hover:bg-primary/10"
                    >
                      {venue.name}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
            </div>
          </div>

          {venues.map(venue => (
            <TabsContent key={venue.id} value={venue.id}>
              <div className="grid gap-3">
                {filterRaces(races, venue.id).length === 0 ? (
                  <div className="text-center text-muted-foreground py-8 bg-background/50 backdrop-blur-sm rounded-lg border border-primary/10">
                    {searchQuery ? "検索結果が見つかりません" : "レースがありません"}
                  </div>
                ) : (
                  filterRaces(races, venue.id).map(race => (
                    <Card 
                      key={race.id}
                      className="cursor-pointer group relative overflow-hidden bg-background/50 backdrop-blur-sm border-primary/10 hover:bg-primary/5 transition-all duration-300 hover:scale-[1.01] hover:-translate-y-0.5 hover:shadow-lg"
                      onClick={() => setLocation(`/race/${race.id}`)}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-background/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <CardContent className="relative p-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="font-bold text-foreground/90 group-hover:text-primary transition-colors duration-300">
                              {race.name}
                            </h3>
                            <p className="text-sm text-muted-foreground/80 flex items-center gap-2">
                              <span className="bg-primary/10 px-2 py-0.5 rounded text-primary/70">
                                {format(new Date(race.startTime), 'HH:mm')}
                              </span>
                              <span>
                                {format(new Date(race.startTime), 'yyyy/MM/dd')} 発走
                              </span>
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-foreground/80 bg-primary/5 px-2 py-0.5 rounded">
                              {race.status === 'done' ? '発走済' : null}
                            </p>
                            <p className="text-xs text-muted-foreground/70 mt-1">
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
        <div className="text-center text-muted-foreground py-8 bg-background/50 backdrop-blur-sm rounded-lg border border-primary/10">
          開催中のレースはありません
        </div>
      )}
    </MainLayout>
  );
}