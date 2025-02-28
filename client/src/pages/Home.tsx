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
import { useMemo, useEffect, useState, useCallback } from 'react';
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
  const { 
    data: latestOdds = [], 
    isLoading: latestOddsLoading 
  } = useQuery<TanOddsHistory[]>({
    queryKey: [`/api/tan-odds-history/latest/${id}`],
    enabled: !!id,
    staleTime: 30000,
    retry: 1,
  });

  // オッズでソートされた上位5頭を計算するメモ化関数
  const topFiveHorses = useMemo(() => {
    if (!latestOdds || latestOdds.length === 0) return [];
    
    return [...latestOdds]
      .sort((a, b) => parseFloat(a.odds) - parseFloat(b.odds))
      .slice(0, 5)
      .map(odd => Number(odd.horseId));
  }, [latestOdds]);

  // オッズ履歴データを取得
  const { data: oddsHistory = [], isLoading: oddsLoading, error: oddsError } = useQuery<TanOddsHistory[]>({
    queryKey: [`/api/tan-odds-history/${id}`],
    queryFn: async () => {
      try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
        const url = `${baseUrl}/api/tan-odds-history/${id}`;
        
        if (import.meta.env.DEV) {
          console.log('Fetching odds history from:', url);
        }
        
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Error fetching odds history:', error);
        }
        throw error;
      }
    },
    enabled: !!id,
    retry: 1,
  });

  // エラー状態のログ
  useEffect(() => {
    if (import.meta.env.DEV && oddsError) {
      console.error('Query error:', oddsError);
    }
  }, [oddsError]);

  useEffect(() => {
    if (import.meta.env.DEV && oddsHistory.length > 0) {
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

  // selectedHorsesの状態管理
  const [selectedHorses, setSelectedHorses] = useState<number[]>([]);

  // 初期選択を設定するuseEffect
  useEffect(() => {
    if (!latestOddsLoading && topFiveHorses.length > 0) {
      setSelectedHorses(topFiveHorses);
    }
  }, [latestOddsLoading, topFiveHorses]);

  // デバッグ用のuseEffect
  if (import.meta.env.DEV) {
    useEffect(() => {
      console.log('=== Debug Info ===');
      console.log('Environment:', import.meta.env.MODE);
      console.log('API Base URL:', import.meta.env.VITE_API_BASE_URL);
      console.log('Latest odds length:', latestOdds?.length);
      console.log('Top five horses:', topFiveHorses);
      console.log('Selected horses:', selectedHorses);
      console.log('================');
    }, [latestOdds, topFiveHorses, selectedHorses]);
  }

  // 馬の選択/解除を処理する関数を修正
  const toggleHorseSelection = useCallback((horseNumber: number, event: React.MouseEvent | React.TouchEvent) => {
    // イベントの伝播を停止
    event.preventDefault();
    event.stopPropagation();
    
    setSelectedHorses(current => {
      if (current.includes(horseNumber)) {
        return current.filter(num => num !== horseNumber);
      } else {
        return [...current, horseNumber];
      }
    });
  }, []);

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

  // グラフに表示する馬をフィルタリング
  const visibleHorses = selectedHorses.length > 0 
    ? sortedHorses.filter(h => selectedHorses.includes(h.number))
    : sortedHorses;

  // オッズ推移グラフコンポーネントを更新
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
          <defs>
            {/* グラデーションの定義 */}
            <linearGradient id="chartBackground" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary)/0.1)" stopOpacity={0.4}/>
              <stop offset="100%" stopColor="hsl(var(--primary)/0.1)" stopOpacity={0}/>
            </linearGradient>
          </defs>
          
          {/* グリッド */}
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="hsl(var(--muted-foreground)/0.2)"
            vertical={false}
          />
          
          {/* X軸 */}
          <XAxis 
            dataKey="timestamp"
            interval="preserveStartEnd"
            minTickGap={50}
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
            axisLine={{ stroke: 'hsl(var(--border))' }}
            tickLine={{ stroke: 'hsl(var(--border))' }}
          />
          
          {/* Y軸 */}
          <YAxis 
            domain={['dataMin', 'dataMax']}
            tickFormatter={(value) => value.toFixed(1)}
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
            axisLine={{ stroke: 'hsl(var(--border))' }}
            tickLine={{ stroke: 'hsl(var(--border))' }}
          />
          
          {/* ツールチップ */}
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
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              padding: '8px 12px'
            }}
            itemStyle={{
              padding: '4px 0'
            }}
            labelStyle={{
              color: 'hsl(var(--muted-foreground))',
              marginBottom: '4px'
            }}
          />

          {/* 背景エリア */}
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="url(#chartBackground)"
          />

          {/* データライン */}
          {visibleHorses.map((horse) => {
            const isSelected = selectedHorses.includes(horse.number);
            return (
              <Line
                key={horse.id}
                type="monotone"
                dataKey={`horse${horse.number}`}
                name={`${horse.number}番: ${horse.name}`}
                stroke={getLineColor(horse.frame)}
                strokeWidth={isSelected ? 3 : 1.5}
                dot={false}
                connectNulls={true}
                opacity={isSelected ? 1 : 0.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                activeDot={{
                  r: 4,
                  strokeWidth: 2,
                  stroke: 'hsl(var(--background))',
                  fill: getLineColor(horse.frame)
                }}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    );
  };

  if (!race && !raceLoading) return null;

  return (
    <MainLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* レース情報カード */}
        <Card className="overflow-hidden bg-gradient-to-br from-black/40 to-primary/5">
          <CardContent className="p-4 sm:p-6">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-background/5 to-transparent opacity-30" />
            <div className="flex justify-between items-start relative">
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* 左カラム: 出馬表 */}
          <Card className="bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/50">
            <CardContent className="p-0 sm:p-6 relative">
              {/* グラデーションオーバーレイ */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
              
              <div className="relative">
                <div className="flex justify-between items-center p-4 sm:p-0 sm:mb-4">
                  <h2 className="text-lg sm:text-xl font-semibold">出馬表</h2>
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableBody>
                      {sortedHorses.map((horse) => {
                        const latestOdd = latestOdds?.find(odd => 
                          Number(odd.horseId) === horse.number
                        );
                        const isSelected = selectedHorses.includes(horse.number);
                        
                        return (
                          <TableRow 
                            key={horse.id}
                            onClick={(e) => toggleHorseSelection(horse.number, e)}
                            onTouchEnd={(e) => toggleHorseSelection(horse.number, e)}
                            className={`
                              relative
                              cursor-pointer 
                              transition-all duration-300
                              group
                              bg-background/80 dark:bg-background/40
                              backdrop-blur-[2px]
                              ${isSelected ? 
                                'bg-primary/10 shadow-[inset_2px_0_0_var(--primary)]' : 
                                'hover:bg-muted/30 hover:shadow-[inset_2px_0_0_var(--primary-foreground)]'
                              }
                            `}
                          >
                            <TableCell className="relative border-0 w-16 px-3 py-2.5">
                              <span className={`
                                relative z-10
                                inline-flex items-center justify-center
                                w-8 h-8
                                rounded-lg text-sm font-bold
                                ${getFrameColor(horse.frame)}
                                transition-transform duration-300
                                group-hover:scale-105
                              `}>
                                {horse.number}
                              </span>
                            </TableCell>
                            
                            <TableCell className="relative border-0 py-2.5">
                              <span className="relative z-10 font-medium text-sm sm:text-base">
                                {horse.name}
                              </span>
                            </TableCell>
                            
                            <TableCell className="relative border-0 text-right w-24 px-4 py-2.5">
                              <div className="relative z-10 flex items-center justify-end gap-2">
                                <span className={`
                                  transition-all duration-300
                                  text-sm sm:text-base tabular-nums
                                  ${isSelected ? 'text-primary font-semibold' : 'text-foreground'}
                                `}>
                                  {latestOdd ? Number(latestOdd.odds).toFixed(1) : '-'}
                                </span>
                                <ChevronRight className={`
                                  w-4 h-4 transition-all duration-300
                                  ${isSelected ? 'opacity-100 text-primary' : 'opacity-0 group-hover:opacity-100'}
                                `} />
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 右カラム: オッズ推移グラフ */}
          <Card className="bg-background/50 backdrop-blur-sm overflow-hidden">
            <CardContent className="p-2 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg sm:text-xl font-semibold">オッズ推移</h2>
                <div className="text-xs text-muted-foreground">
                  {formattedOddsData.length > 0 && 
                    `${formattedOddsData[0].timestamp} - ${formattedOddsData[formattedOddsData.length - 1].timestamp}`
                  }
                </div>
              </div>
              <div className="h-[300px] sm:h-[400px] relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-30" />
                <div className="relative h-full">
                  <OddsChart />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 予想確率入力ボタン */}
        <div className="flex justify-center">
          <Button 
            size="lg" 
            className="w-full max-w-md h-16 relative overflow-hidden group"
            onClick={() => window.location.href = `/predict/win/${id}`}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative flex items-center justify-center">
              <Trophy className="mr-2 h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
              <span className="relative">単勝予想</span>
            </div>
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}