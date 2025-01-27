var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import MainLayout from "@/components/layout/MainLayout";
import { RefreshCw, Trophy } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import RaceList from "@/pages/RaceList";
export default function Home() {
    var id = useParams().id;
    // idがない場合はRaceListを表示
    if (!id) {
        return <RaceList />;
    }
    // 以下、既存のコード（レース詳細の表示）
    var _a = useQuery({
        queryKey: ["/api/races/".concat(id)],
    }), race = _a.data, raceLoading = _a.isLoading;
    var _b = useQuery({
        queryKey: ["/api/horses/".concat(id)],
        enabled: !!id,
    }), _c = _b.data, horses = _c === void 0 ? [] : _c, horsesLoading = _b.isLoading, refetchHorses = _b.refetch;
    // オッズデータを取得する新しいクエリを追加
    var _d = useQuery({
        queryKey: ["/api/tan-odds-history/latest/".concat(id)],
        enabled: !!id,
    }).data, latestOdds = _d === void 0 ? [] : _d;
    if (!race && !raceLoading)
        return null;
    return (<MainLayout>
      <div className="space-y-6">
        {/* レース情報 */}
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                {raceLoading ? (<div className="space-y-2">
                    <Skeleton className="h-8 w-48"/>
                    <Skeleton className="h-4 w-32"/>
                    <Skeleton className="h-4 w-24"/>
                  </div>) : (<>
                    <h1 className="text-2xl font-bold mb-2">{race === null || race === void 0 ? void 0 : race.name}</h1>
                    <p className="text-muted-foreground">
                      {format(new Date(race === null || race === void 0 ? void 0 : race.startTime), 'yyyy年M月d日 HH:mm')} 発走
                    </p>
                    <p className="text-muted-foreground">{race === null || race === void 0 ? void 0 : race.venue}</p>
                  </>)}
              </div>
              {!raceLoading && (<div className="text-right">
                  <p className="text-lg font-semibold">{race === null || race === void 0 ? void 0 : race.status}</p>
                </div>)}
            </div>
          </CardContent>
        </Card>

        {/* 出馬表 */}
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">出馬表</h2>
              <Button variant="outline" size="sm" onClick={function () { return refetchHorses(); }} className="gap-2">
                <RefreshCw className="h-4 w-4"/>
                オッズ更新
              </Button>
            </div>

            {horsesLoading ? (<div className="space-y-2">
                {__spreadArray([], Array(8), true).map(function (_, i) { return (<Skeleton key={i} className="h-12 w-full"/>); })}
              </div>) : (<Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>馬番</TableHead>
                    <TableHead>馬名</TableHead>
                    <TableHead className="text-right">オッズ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {horses.map(function (horse, index) {
                var latestOdd = latestOdds === null || latestOdds === void 0 ? void 0 : latestOdds.find(function (odd) {
                    return Number(odd.horseId) === index + 1;
                });
                return (<TableRow key={horse.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{horse.name}</TableCell>
                        <TableCell className="text-right">
                          {latestOdd ? Number(latestOdd.odds).toFixed(1) : '-'}
                        </TableCell>
                      </TableRow>);
            })}
                </TableBody>
              </Table>)}
          </CardContent>
        </Card>

        {/* 予想確率入力ボタン */}
        <div className="flex justify-center">
          <Button size="lg" className="w-full max-w-md h-16" onClick={function () { return window.location.href = "/predict/win/".concat(id); }}>
            <Trophy className="mr-2 h-5 w-5"/>
            単勝予想
          </Button>
        </div>
      </div>
    </MainLayout>);
}
