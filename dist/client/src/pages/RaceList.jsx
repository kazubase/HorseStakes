import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format } from "date-fns";
import MainLayout from "@/components/layout/MainLayout";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Search } from "lucide-react";
// 全会場のリスト
var allVenues = [
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
    var _a;
    var _b = useLocation(), _ = _b[0], setLocation = _b[1];
    var _c = useState(""), searchQuery = _c[0], setSearchQuery = _c[1];
    var _d = useState(false), showAllVenues = _d[0], setShowAllVenues = _d[1];
    var _e = useQuery({
        queryKey: ["/api/races"],
        gcTime: 0,
        staleTime: 0,
        retry: false,
        refetchOnMount: true,
        refetchOnWindowFocus: true,
    }), _f = _e.data, races = _f === void 0 ? [] : _f, isLoading = _e.isLoading, error = _e.error;
    // 本日開催中の会場を取得
    var todayVenues = races
        .filter(function (race) {
        // 日付文字列をパース
        var raceDate = new Date(race.startTime);
        var today = new Date();
        // 日付を文字列に変換して比較（時間は無視）
        var raceDateStr = raceDate.toISOString().split('T')[0];
        var todayStr = today.toISOString().split('T')[0];
        console.log('Race date:', raceDateStr, 'Today:', todayStr); // デバッグ用
        return raceDateStr === todayStr;
    })
        .map(function (race) { return race.venue; })
        .filter(function (venue, index, self) { return self.indexOf(venue) === index; })
        .map(function (venue) { return ({ id: venue, name: venue }); });
    // デバッグ用のログ出力
    console.log('Races:', races);
    console.log('Today Venues:', todayVenues);
    // 表示する会場のリスト
    var venues = showAllVenues ? allVenues : (todayVenues.length > 0 ? todayVenues : allVenues);
    console.log('Showing Venues:', venues);
    // 検索とフィルタリングのロジック
    var filterRaces = function (races, venueId) {
        return races
            .filter(function (race) {
            var matchesVenue = race.venue === venueId;
            var matchesSearch = searchQuery === "" ||
                race.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                race.id.toString().includes(searchQuery);
            // 検索時以外は本日のレースのみ表示
            var isToday = function () {
                var raceDate = new Date(race.startTime);
                var today = new Date();
                var raceDateStr = raceDate.toISOString().split('T')[0];
                var todayStr = today.toISOString().split('T')[0];
                return raceDateStr === todayStr;
            };
            return matchesVenue && matchesSearch && (searchQuery !== "" || isToday());
        })
            .sort(function (a, b) { return new Date(b.startTime).getTime() - new Date(a.startTime).getTime(); });
    };
    // ローディング中の表示
    if (isLoading) {
        return (<MainLayout>
        <div className="flex justify-center items-center h-[50vh]">
          <div>データを読み込み中...</div>
        </div>
      </MainLayout>);
    }
    // エラー時の表示
    if (error) {
        return (<MainLayout>
        <div className="flex justify-center items-center h-[50vh]">
          <div>データの読み込みに失敗しました</div>
        </div>
      </MainLayout>);
    }
    // データが空の場合の表示
    if (races.length === 0) {
        return (<MainLayout>
        <div className="flex justify-center items-center h-[50vh]">
          <div>レースデータがありません</div>
        </div>
      </MainLayout>);
    }
    return (<MainLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">レース一覧</h1>
        
        {/* 検索バー */}
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4"/>
            <Input type="text" placeholder="レース名またはレースIDで検索..." value={searchQuery} onChange={function (e) {
            setSearchQuery(e.target.value);
            setShowAllVenues(e.target.value !== "");
        }} className="pl-10"/>
          </div>
        </div>
      </div>

      {venues.length > 0 ? (<Tabs defaultValue={(_a = venues[0]) === null || _a === void 0 ? void 0 : _a.id} className="w-full">
          <div className="relative">
            <TabsList className="flex" style={{
                maxWidth: '100%',
                overflowX: 'auto',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                WebkitOverflowScrolling: 'touch'
            }}>
              {venues.map(function (venue) { return (<TabsTrigger key={venue.id} value={venue.id} className="flex-shrink-0">
                  {venue.name}
                </TabsTrigger>); })}
            </TabsList>
          </div>

          {venues.map(function (venue) { return (<TabsContent key={venue.id} value={venue.id}>
              <div className="grid gap-4">
                {filterRaces(races, venue.id).length === 0 ? (<div className="text-center text-muted-foreground py-4">
                    {searchQuery ? "検索結果が見つかりません" : "レースがありません"}
                  </div>) : (filterRaces(races, venue.id).map(function (race) { return (<Card key={race.id} className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={function () {
                        console.log("Navigating to race:", race.id);
                        setLocation("/race/".concat(race.id));
                    }}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="font-semibold">
                              {race.name}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(race.startTime), 'yyyy/MM/dd HH:mm')} 発走
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">
                              {race.status}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              ID: {race.id}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>); }))}
              </div>
            </TabsContent>); })}
        </Tabs>) : (<div className="text-center text-muted-foreground py-4">
          開催中のレースはありません
        </div>)}
    </MainLayout>);
}
