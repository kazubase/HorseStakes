import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Horse, Race, TanOddsHistory } from "@db/schema";
import { format } from "date-fns";
import MainLayout from "@/components/layout/MainLayout";
import { RefreshCw, Trophy, Target, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import RaceList from "@/pages/RaceList";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useMemo, useEffect, useState } from 'react';
import { groupBy } from 'lodash';

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
  });

  // 馬番でソートした馬リストを作成
  const sortedHorses = [...horses].sort((a, b) => a.number - b.number);

  // オッズデータを取得する新しいクエリを追加
  const { data: latestOdds = [] } = useQuery<TanOddsHistory[]>({
    queryKey: [`/api/tan-odds-history/latest/${id}`],
    enabled: !!id,
  });

  // オッズ履歴データを取得
  const { data: oddsHistory = [], isLoading: oddsLoading, error: oddsError } = useQuery<TanOddsHistory[]>({
    queryKey: [`/api/tan-odds-history/${id}`],
    queryFn: async () => {
      try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || '';  // 環境変数からベースURLを取得
        const url = `${baseUrl}/api/tan-odds-history/${id}`;
        console.log('Fetching from URL:', url);
        
        const response = await fetch(url);
        console.log('Response status:', response.status);
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('Error in queryFn:', error);
        throw error;
      }
    },
    enabled: !!id,
    retry: 1,
  });

  // エラー状態のログ
  useEffect(() => {
    if (oddsError) {
      console.error('Query error:', oddsError);
    }
  }, [oddsError]);

  useEffect(() => {
    if (oddsHistory.length > 0) {
      console.log('=== Odds History Data ===');
      console.log('Data received:', oddsHistory.length, 'records');
      console.log('Sample:', oddsHistory.slice(0, 2));
      console.log('======================');
    }
  }, [oddsHistory]);

  // 時刻フォーマットを9時間遅らせる
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    date.setHours(date.getHours() + 9);
    return format(date, 'HH:mm');
  };

  // オッズデータを整形
  const formattedOddsData = useMemo(() => {
    console.log('Formatting odds data from:', oddsHistory.length, 'records');
    const groupedByTimestamp = groupBy(oddsHistory, 'timestamp');
    
    return Object.entries(groupedByTimestamp)
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
      .map(([timestamp, odds]) => ({
        timestamp: formatTime(timestamp),
        ...odds.reduce((acc, odd) => ({
          ...acc,
          [`horse${odd.horseId}`]: parseFloat(odd.odds)
        }), {})
      }));
  }, [oddsHistory]);

  // 選択された馬を配列で管理するように変更
  const [selectedHorses, setSelectedHorses] = useState<number[]>([]);

  // 馬の選択/解除を処理する関数
  const toggleHorseSelection = (horseNumber: number) => {
    setSelectedHorses(current => {
      if (current.includes(horseNumber)) {
        return current.filter(num => num !== horseNumber);
      } else {
        return [...current, horseNumber];
      }
    });
  };

  const getFrameColor = (frame: number) => {
    const colors = {
      1: 'bg-white text-black border border-gray-200',
      2: 'bg-black text-white',
      3: 'bg-red-600 text-white',
      4: 'bg-blue-600 text-white',
      5: 'bg-yellow-400 text-black',
      6: 'bg-green-600 text-white',
      7: 'bg-orange-500 text-white',
      8: 'bg-pink-400 text-white'
    };
    return colors[frame as keyof typeof colors] || 'bg-gray-200';
  };

  // 枠番の色に基づくグラフの線の色を定義
  const getLineColor = (frame: number) => {
    const colors = {
      1: '#CCCCCC', // 白→グレーに変更
      2: '#999999', // 黒→明るめのグレーに変更
      3: '#EF4444', // 赤
      4: '#2563EB', // 青
      5: '#EAB308', // 黄
      6: '#22C55E', // 緑
      7: '#F97316', // オレンジ
      8: '#EC4899'  // ピンク
    };
    return colors[frame as keyof typeof colors] || '#9CA3AF';
  };

  // TableRowコンポーネントを更新
  const TableRowComponent = ({ horse, latestOdd }: { horse: Horse, latestOdd?: TanOddsHistory }) => {
    const isSelected = selectedHorses.includes(horse.number);
    
    return (
      <TableRow 
        key={horse.id}
        className={`
          cursor-pointer 
          transition-all 
          group
          relative
          ${isSelected ? 'bg-muted/50 after:absolute after:left-0 after:top-0 after:h-full after:w-1 after:bg-primary' : 'hover:bg-muted/30'}
        `}
        onClick={() => toggleHorseSelection(horse.number)}
      >
        <TableCell>
          <span className={`px-2 py-1 rounded text-sm ${getFrameColor(horse.frame)}`}>
            {horse.number}
          </span>
        </TableCell>
        <TableCell>{horse.name}</TableCell>
        <TableCell className="text-right flex items-center justify-end gap-2">
          <span>{latestOdd ? Number(latestOdd.odds).toFixed(1) : '-'}</span>
          <ChevronRight className={`w-4 h-4 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
        </TableCell>
      </TableRow>
    );
  };

  // グラフに表示する馬をフィルタリング
  const visibleHorses = selectedHorses.length > 0 
    ? sortedHorses.filter(h => selectedHorses.includes(h.number))
    : sortedHorses;

  // オッズ推移グラフコンポーネント
  const OddsChart = () => {
    if (formattedOddsData.length === 0) {
      return (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          オッズデータがありません
        </div>
      );
    }

    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart 
          data={formattedOddsData}
          margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="timestamp"
            interval="preserveStartEnd"
            minTickGap={50}
          />
          <YAxis 
            domain={['dataMin', 'dataMax']}
            tickFormatter={(value) => value.toFixed(1)}
          />
          <Tooltip 
            formatter={(value: number, name: string) => {
              const horse = sortedHorses.find(h => `horse${h.number}` === name);
              return [
                value.toFixed(1),
                horse ? `${horse.number}番: ${horse.name}` : name
              ];
            }}
            contentStyle={{
              backgroundColor: 'hsl(var(--background))',
              borderColor: 'hsl(var(--border))',
              color: 'hsl(var(--foreground))',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}
          />
          {visibleHorses.map((horse) => (
            <Line
              key={horse.id}
              type="monotone"
              dataKey={`horse${horse.number}`}
              name={`${horse.number}番: ${horse.name}`}
              stroke={getLineColor(horse.frame)}
              strokeWidth={selectedHorses.includes(horse.number) ? 3 : 2}
              dot={false}
              connectNulls={true}
              opacity={selectedHorses.includes(horse.number) ? 1 : 0.7}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  };

  if (!race && !raceLoading) return null;

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* レース情報カード */}
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
                  <p className="text-lg font-semibold">
                    {race?.status === 'done' ? '発走済' : null}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 2カラムレイアウト */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 左カラム: 出馬表 */}
          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">出馬表</h2>
              </div>

              {horsesLoading ? (
                <div className="space-y-2">
                  {[...Array(8)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableBody>
                    {sortedHorses.map((horse) => {
                      const latestOdd = latestOdds?.find(odd => 
                        Number(odd.horseId) === horse.number
                      );
                      return (
                        <TableRowComponent 
                          key={horse.id} 
                          horse={horse} 
                          latestOdd={latestOdd}
                        />
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* 右カラム: オッズ推移グラフ */}
          <Card>
            <CardContent className="p-2 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-4">オッズ推移</h2>
              <div className="h-[300px] sm:h-[400px]">
                <OddsChart />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 予想確率入力ボタン */}
        <div className="flex justify-center">
          <Button 
            size="lg" 
            className="w-full max-w-md h-16"
            onClick={() => window.location.href = `/predict/win/${id}`}
          >
            <Trophy className="mr-2 h-5 w-5" />
            単勝予想
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}