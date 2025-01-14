import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Horse, Race, TanOddsHistory } from "@db/schema";
import { format } from "date-fns";
import MainLayout from "@/components/layout/MainLayout";
import { RefreshCw, Trophy, Target } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import RaceList from "@/pages/RaceList";

export default function Home() {
  const { id } = useParams();

  // idがない場合はRaceListを表示
  if (!id) {
    return <RaceList />;
  }

  // 以下、既存のコード（レース詳細の表示）
  const { data: race, isLoading: raceLoading } = useQuery<Race>({
    queryKey: [`/api/races/${id}`],
  });

  const { 
    data: horses = [], 
    isLoading: horsesLoading,
    refetch: refetchHorses 
  } = useQuery<Horse[]>({
    queryKey: [`/api/horses/${id}`],
    enabled: !!id,
    refetchInterval: 30000,
  });

  // オッズデータを取得する新しいクエリを追加
  const { data: latestOdds } = useQuery<TanOddsHistory[]>({
    queryKey: [`/api/tan-odds-history/latest/${id}`],
    enabled: !!id,
  });

  if (!race && !raceLoading) return null;

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* レース情報 */}
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                {raceLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ) : (
                  <>
                    <h1 className="text-2xl font-bold mb-2">{race?.name}</h1>
                    <p className="text-muted-foreground">
                      {format(new Date(race?.startTime!), 'yyyy年M月d日 HH:mm')} 発走
                    </p>
                    <p className="text-muted-foreground">{race?.venue}</p>
                  </>
                )}
              </div>
              {!raceLoading && (
                <div className="text-right">
                  <p className="text-lg font-semibold">{race?.status}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 出馬表 */}
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">出馬表</h2>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => refetchHorses()}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                オッズ更新
              </Button>
            </div>

            {horsesLoading ? (
              <div className="space-y-2">
                {[...Array(8)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>馬番</TableHead>
                    <TableHead>馬名</TableHead>
                    <TableHead className="text-right">オッズ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {horses.map((horse, index) => {
                    const latestOdd = latestOdds?.find(odd => odd.horseId === horse.id);
                    return (
                      <TableRow key={horse.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{horse.name}</TableCell>
                        <TableCell className="text-right">
                          {latestOdd ? Number(latestOdd.odds).toFixed(1) : '-'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* 予想確率入力ボタン */}
        <div className="grid grid-cols-2 gap-4">
          <Button 
            size="lg" 
            className="w-full h-16"
            onClick={() => window.location.href = `/predict/win/${id}`}
          >
            <Trophy className="mr-2 h-5 w-5" />
            単勝予想
          </Button>
          <Button 
            size="lg" 
            className="w-full h-16"
            onClick={() => window.location.href = `/predict/place/${id}`}
          >
            <Target className="mr-2 h-5 w-5" />
            複勝予想
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}