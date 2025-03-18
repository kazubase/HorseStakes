import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Horse, Race, TanOddsHistory } from "@db/schema";
import { format } from "date-fns";
import MainLayout from "@/components/layout/MainLayout";
import { RefreshCw, Trophy, ArrowRight, ChevronRight, ChevronUp, ChevronDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import RaceList from "@/pages/RaceList";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useMemo, useEffect, useState, useCallback, useRef } from 'react';
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

  // ソート順の状態を追加
  const [sortOrder, setSortOrder] = useState<'number-asc' | 'number-desc' | 'odds-asc' | 'odds-desc'>('odds-asc');

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

  // オッズの値が近い馬をグループ化する関数を追加
  const horseGroups = useMemo(() => {
    if (!latestOdds || latestOdds.length === 0) return [];
    
    // オッズでソートした馬リストを作成（NaNを除外）
    const sortedOdds = [...latestOdds]
      .filter(odd => !isNaN(parseFloat(odd.odds)))
      .sort((a, b) => parseFloat(a.odds) - parseFloat(b.odds));
    
    // NaNのオッズを持つ馬のIDを取得
    const nanHorseIds = latestOdds
      .filter(odd => isNaN(parseFloat(odd.odds)))
      .map(odd => Number(odd.horseId));
    
    const groups: number[][] = [];
    let currentGroup: number[] = [];
    let prevOdds = 0;
    
    // 相対的な差分の閾値を動的に計算
    // レースのオッズ分布に基づいて閾値を調整
    const calculateDynamicThreshold = () => {
      // 最小オッズと最大オッズを取得（NaNを除外）
      const validOdds = sortedOdds.map(odd => parseFloat(odd.odds));
      const minOdds = Math.min(...validOdds);
      const maxOdds = Math.max(...validOdds);
      
      // オッズの範囲が広い場合は閾値を大きく、狭い場合は小さくする
      const oddsRange = maxOdds - minOdds;
      
      // オッズの標準偏差を計算
      const avgOdds = validOdds.reduce((sum, odds) => sum + odds, 0) / validOdds.length;
      const variance = validOdds.reduce((sum, odds) => sum + Math.pow(odds - avgOdds, 2), 0) / validOdds.length;
      const stdDev = Math.sqrt(variance);
      
      // 標準偏差と範囲に基づいて閾値を計算
      // 標準偏差が大きい（オッズのばらつきが大きい）場合は閾値を大きくする
      const baseThreshold = 0.15; // 基本閾値
      
      // 調整係数を調整
      const rangeAdjustment = oddsRange / 400; // 範囲による調整係数をさらに小さくする
      const stdDevAdjustment = stdDev / 40; // 標準偏差による調整係数をさらに小さくする
      
      // 変動係数（標準偏差/平均）を使用して相対的なばらつきを考慮
      const coefficientOfVariation = stdDev / avgOdds;
      const cvAdjustment = coefficientOfVariation * 0.15; // 変動係数による調整を小さくする
      
      // 馬の数に基づく調整（馬が多いレースでは閾値を小さく）
      const horseCountAdjustment = Math.max(0, 0.25 - (sortedOdds.length / 40));
      
      // 最小オッズに基づく調整（最小オッズが小さいほど閾値を小さく）
      const minOddsAdjustment = Math.max(0, (minOdds - 2) / 20);
      
      // 最終的な閾値（最小0.15、最大0.45）- 上限をさらに下げる
      const threshold = baseThreshold + rangeAdjustment + stdDevAdjustment + cvAdjustment + horseCountAdjustment + minOddsAdjustment;
      
      return Math.min(0.45, Math.max(0.15, threshold));
    };
    
    const THRESHOLD = calculateDynamicThreshold();
    
    sortedOdds.forEach((odd, index) => {
      const currentOdds = parseFloat(odd.odds);
      
      // 最初の馬は必ず最初のグループに入れる
      if (index === 0) {
        currentGroup.push(Number(odd.horseId));
        prevOdds = currentOdds;
        return;
      }
      
      // 前の馬とのオッズの相対的な差を計算
      const relativeDiff = (currentOdds - prevOdds) / prevOdds;
      
      // 差が閾値より大きい場合は新しいグループを作成
      if (relativeDiff > THRESHOLD) {
        groups.push([...currentGroup]);
        currentGroup = [Number(odd.horseId)];
      } else {
        // そうでなければ現在のグループに追加
        currentGroup.push(Number(odd.horseId));
      }
      
      prevOdds = currentOdds;
    });
    
    // 最後のグループを追加
    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }
    
    // NaNのオッズを持つ馬を最後のグループとして追加
    if (nanHorseIds.length > 0) {
      groups.push(nanHorseIds);
    }
    
    return groups;
  }, [latestOdds]);

  // 現在表示中のグループインデックス
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);

  // オッズ履歴データを取得
  const { data: oddsHistory = [], isLoading: oddsLoading, error: oddsError } = useQuery<TanOddsHistory[]>({
    queryKey: [`/api/tan-odds-history/${id}`],
    queryFn: async () => {
      try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
        const url = `${baseUrl}/api/tan-odds-history/${id}`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        throw error;
      }
    },
    enabled: !!id,
    retry: 1,
  });

  // 時刻フォーマットを日付も含めるように修正
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    date.setHours(date.getHours() + 9);
    return format(date, 'M/d HH:mm');
  };

  // 日付のみを取得する関数を追加
  const getDateOnly = (timestamp: string) => {
    const date = new Date(timestamp);
    date.setHours(date.getHours() + 9);
    return format(date, 'M/d');
  };

  // 時刻のみを取得する関数を追加
  const getTimeOnly = (timestamp: string) => {
    const date = new Date(timestamp);
    date.setHours(date.getHours() + 9);
    return format(date, 'HH:mm');
  };

  // オッズデータを整形
  const formattedOddsData = useMemo(() => {
    const groupedByTimestamp = groupBy(oddsHistory, 'timestamp');
    
    return Object.entries(groupedByTimestamp)
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
      .map(([timestamp, odds], index, array) => {
        // 現在の日付を取得
        const currentDate = getDateOnly(timestamp);
        // 前のデータの日付を取得（最初のデータの場合は空文字）
        const prevDate = index > 0 ? getDateOnly(array[index - 1][0]) : '';
        // 日付が変わったかどうかのフラグ
        const isDateChanged = currentDate !== prevDate;
        
        return {
          timestamp: formatTime(timestamp),
          dateOnly: getDateOnly(timestamp),
          timeOnly: getTimeOnly(timestamp),
          isDateChanged,
          ...odds.reduce((acc, odd) => ({
            ...acc,
            [`horse${odd.horseId}`]: parseFloat(odd.odds)
          }), {})
        };
      });
  }, [oddsHistory]);

  // selectedHorsesの状態管理
  const [selectedHorses, setSelectedHorses] = useState<number[]>([]);

  // 初期選択を設定するuseEffect
  useEffect(() => {
    if (!latestOddsLoading && horseGroups.length > 0) {
      // 最初のグループ（人気グループ）を選択
      setSelectedHorses(horseGroups[0]);
    }
  }, [latestOddsLoading, horseGroups]);

  // グループを切り替える関数
  const switchGroup = useCallback((index: number) => {
    if (index >= 0 && index < Math.min(3, horseGroups.length)) {
      setCurrentGroupIndex(index);
      setSelectedHorses(horseGroups[index]);
    }
  }, [horseGroups]);

  // タッチ開始位置を保存するための状態を追加
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);

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

  // タッチ開始時のハンドラを追加
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTouchStart({
      x: touch.clientX,
      y: touch.clientY
    });
  }, []);

  // タッチ終了時のハンドラを追加
  const handleTouchEnd = useCallback((e: React.TouchEvent, horseNumber: number) => {
    if (!touchStart) return;

    const touch = e.changedTouches[0];
    const deltaX = Math.abs(touch.clientX - touchStart.x);
    const deltaY = Math.abs(touch.clientY - touchStart.y);

    // 移動距離が10px未満の場合のみ選択処理を実行
    if (deltaX < 10 && deltaY < 10) {
      toggleHorseSelection(horseNumber, e);
    }
    
    setTouchStart(null);
  }, [touchStart, toggleHorseSelection]);

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

  // ソート順に基づいて馬リストをソートする関数
  const getSortedHorseList = useCallback(() => {
    if (sortOrder === 'number-asc') {
      return [...horses].sort((a, b) => a.number - b.number);
    } else if (sortOrder === 'number-desc') {
      return [...horses].sort((a, b) => b.number - a.number);
    }

    // オッズでソートする場合
    return [...horses].sort((a, b) => {
      const aOdds = latestOdds?.find(odd => Number(odd.horseId) === a.number)?.odds;
      const bOdds = latestOdds?.find(odd => Number(odd.horseId) === b.number)?.odds;
      
      // オッズがない場合は最後に表示
      if (!aOdds) return 1;
      if (!bOdds) return -1;
      
      const aValue = parseFloat(aOdds);
      const bValue = parseFloat(bOdds);
      
      return sortOrder === 'odds-asc' 
        ? aValue - bValue 
        : bValue - aValue;
    });
  }, [horses, latestOdds, sortOrder]);

  // ソート済みの馬リストを取得
  const displayHorses = getSortedHorseList();

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
          margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
        >
          <defs>
            {/* グラデーションの定義 */}
            <linearGradient id="chartBackground" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary)/0.15)" stopOpacity={0.5}/>
              <stop offset="100%" stopColor="hsl(var(--primary)/0.05)" stopOpacity={0}/>
            </linearGradient>
            
            {/* 各馬のラインのグラデーション定義 */}
            {visibleHorses.map((horse) => (
              <linearGradient 
                key={`gradient-${horse.number}`} 
                id={`lineGradient-${horse.number}`} 
                x1="0" y1="0" x2="1" y2="0"
              >
                <stop offset="0%" stopColor={getLineColor(horse.frame)} stopOpacity={0.7} />
                <stop offset="100%" stopColor={getLineColor(horse.frame)} stopOpacity={1} />
              </linearGradient>
            ))}
          </defs>
          
          {/* グリッド */}
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="hsl(var(--muted-foreground)/0.15)"
            vertical={false}
          />
          
          {/* X軸 */}
          <XAxis 
            dataKey="timestamp"
            interval="preserveStartEnd"
            minTickGap={50}
            tick={(props) => {
              const { x, y, payload } = props;
              const dataIndex = formattedOddsData.findIndex(item => item.timestamp === payload.value);
              const data = formattedOddsData[dataIndex];
              
              // 日付が変わるポイントか最初と最後のポイントの場合は日付と時刻を表示
              // それ以外は時刻のみ表示
              const displayText = data?.isDateChanged || dataIndex === 0 || dataIndex === formattedOddsData.length - 1
                ? data.dateOnly + ' ' + data.timeOnly
                : data.timeOnly;
              
              return (
                <g transform={`translate(${x},${y})`}>
                  <text 
                    x={0} 
                    y={0} 
                    dy={16} 
                    textAnchor="middle" 
                    fill="hsl(var(--muted-foreground))"
                    fontSize="0.75rem"
                  >
                    {displayText}
                  </text>
                </g>
              );
            }}
            axisLine={{ stroke: 'hsl(var(--border))' }}
            tickLine={{ stroke: 'hsl(var(--border))' }}
            allowDataOverflow={true}
            type="category"
            scale="point"
            padding={{ left: 10, right: 10 }}
            width={2000}
            xAxisId={0}
          />
          
          {/* スクロール用のX軸を追加 */}
          <XAxis 
            dataKey="timestamp"
            hide
            xAxisId="scroll"
          />
          
          {/* Y軸 */}
          <YAxis 
            domain={['dataMin', 'dataMax']}
            tickFormatter={(value) => value.toFixed(1)}
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
            axisLine={{ stroke: 'hsl(var(--border))' }}
            tickLine={{ stroke: 'hsl(var(--border))' }}
            width={45}
            allowDecimals={true}
            tickCount={6}
            padding={{ top: 10, bottom: 10 }}
          />
          
          {/* ツールチップをカスタマイズ - 馬番のみを枠番の色で表示 */}
          <Tooltip 
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                // オッズの降順でソート
                const sortedPayload = [...payload].sort((a, b) => (Number(b.value) - Number(a.value)));
                
                return (
                  <div className="bg-card/95 backdrop-blur-sm border border-border rounded-md shadow-md p-2 text-xs">
                    <p className="text-muted-foreground mb-2">{label}</p>
                    <div className="space-y-2">
                      {sortedPayload.map((entry: any, index: number) => {
                        const horseId = entry.dataKey.replace('horse', '');
                        const horse = sortedHorses.find(h => h.number === Number(horseId));
                        const frameColor = getFrameColor(horse?.frame || 0);
                        
                        return (
                          <div key={`item-${index}`} className="flex justify-between items-center gap-3">
                            <span className={`
                              inline-flex items-center justify-center
                              w-6 h-6
                              rounded-md text-xs font-bold
                              ${frameColor}
                            `}>
                              {horseId}
                            </span>
                            <span className="font-mono font-semibold">{entry.value.toFixed(1)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              }
              return null;
            }}
            cursor={{
              stroke: 'hsl(var(--muted-foreground)/0.5)',
              strokeWidth: 1,
              strokeDasharray: '4 4'
            }}
          />

          {/* 垂直の参照線を追加 */}
          <ReferenceLine
            isFront={true}
            x={formattedOddsData[0]?.timestamp}
            stroke="hsl(var(--muted-foreground)/0.3)"
            strokeDasharray="3 3"
            label={{
              value: "初回",
              position: "insideTopLeft",
              fill: "hsl(var(--muted-foreground))",
              fontSize: 10,
            }}
          />
          
          {/* 最新データの参照線 */}
          <ReferenceLine
            isFront={true}
            x={formattedOddsData[formattedOddsData.length - 1]?.timestamp}
            stroke="hsl(var(--primary)/0.5)"
            strokeDasharray="3 3"
            label={{
              value: "最新",
              position: "insideTopRight",
              fill: "hsl(var(--primary))",
              fontSize: 10,
              fontWeight: "bold"
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
                name={`horse${horse.number}`}
                stroke={`url(#lineGradient-${horse.number})`}
                strokeWidth={isSelected ? 3 : 1.5}
                dot={false}
                connectNulls={true}
                opacity={isSelected ? 1 : 0.6}
                strokeLinecap="round"
                strokeLinejoin="round"
                activeDot={{
                  r: 4,
                  strokeWidth: 1,
                  stroke: 'hsl(var(--background))',
                  fill: getLineColor(horse.frame),
                }}
              />
            );
          })}
          
          {/* 凡例を削除 */}
        </LineChart>
      </ResponsiveContainer>
    );
  };

  // グラフコンテナのref追加
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // 初期表示時に右端にスクロール
  useEffect(() => {
    if (chartContainerRef.current) {
      chartContainerRef.current.scrollLeft = chartContainerRef.current.scrollWidth;
    }
  }, [formattedOddsData]);

  // オッズの変動率を計算する関数を追加
  const calculateOddsChange = useCallback((horseId: number) => {
    if (formattedOddsData.length < 2) return 0;
    
    const firstData = formattedOddsData[0];
    const latestData = formattedOddsData[formattedOddsData.length - 1];
    
    const firstOdds = Number(firstData[`horse${horseId}` as keyof typeof firstData]);
    const latestOdds = Number(latestData[`horse${horseId}` as keyof typeof latestData]);
    
    if (isNaN(firstOdds) || isNaN(latestOdds)) return 0;
    
    // 変動率を計算（マイナスなら下降、プラスなら上昇）
    return ((latestOdds - firstOdds) / firstOdds) * 100;
  }, [formattedOddsData]);
  
  // オッズ変動に基づく色を取得する関数
  const getOddsChangeColor = useCallback((changePercent: number) => {
    if (Math.abs(changePercent) < 2) return 'text-muted-foreground'; // ほぼ変化なし
    if (changePercent <= -5) return 'text-red-500 font-bold'; // 大幅下降（人気上昇）
    if (changePercent < 0) return 'text-red-400'; // 下降（人気上昇）
    if (changePercent >= 5) return 'text-green-500 font-bold'; // 大幅上昇（人気下降）
    return 'text-green-400'; // 上昇（人気下降）
  }, []);

  // オッズ変動の矢印を取得する関数
  const getOddsChangeArrow = useCallback((changePercent: number) => {
    if (Math.abs(changePercent) < 2) return '→';
    if (changePercent < 0) return '↓';
    return '↑';
  }, []);

  // 直近の変動率を計算する関数を追加
  const calculateRecentOddsChange = useCallback((horseId: number) => {
    if (formattedOddsData.length < 3) return 0; // 少なくとも3つのデータポイントが必要
    
    // 最新のデータと、その1つ前のデータを取得
    const latestData = formattedOddsData[formattedOddsData.length - 1];
    const previousData = formattedOddsData[formattedOddsData.length - 2];
    
    const previousOdds = Number(previousData[`horse${horseId}` as keyof typeof previousData]);
    const latestOdds = Number(latestData[`horse${horseId}` as keyof typeof latestData]);
    
    if (isNaN(previousOdds) || isNaN(latestOdds)) return 0;
    
    // 直近の変動率を計算
    return ((latestOdds - previousOdds) / previousOdds) * 100;
  }, [formattedOddsData]);
  
  // ソートボタンのクリックハンドラを追加
  const handleSortClick = useCallback((type: 'number' | 'odds') => {
    setSortOrder(current => {
      if (type === 'number') {
        return current === 'number-asc' ? 'number-desc' : 'number-asc';
      } else {
        return current === 'odds-asc' ? 'odds-desc' : 'odds-asc';
      }
    });
  }, []);

  if (!race && !raceLoading) return null;

  return (
    <MainLayout>
      <div className="space-y-4 sm:space-y-6 relative min-h-screen pb-8">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background/5 to-transparent opacity-30 h-full w-full" />
        
        {/* レース情報カード */}
        <Card className="overflow-hidden bg-gradient-to-br from-black/40 to-primary/5 relative z-10">
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
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-4 sm:gap-6 relative z-10">
          {/* 左カラム: 出馬表 */}
          <Card className="lg:col-span-4 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/50">
            <CardContent className="p-0 sm:p-6 relative">
              {/* グラデーションオーバーレイ */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
              
              <div className="relative">
                <div className="flex justify-between items-center p-4 sm:p-0 sm:mb-4">
                  <h2 className="text-lg sm:text-xl font-semibold">出馬表</h2>
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16 px-3 text-center">
                          <div className="flex items-center justify-end pr-3">
                            <button 
                              onClick={() => handleSortClick('number')}
                              className="flex items-center justify-center p-1 hover:bg-muted/30 rounded transition-colors"
                              aria-label="馬番でソート"
                            >
                              {sortOrder === 'number-asc' ? (
                                <ChevronUp className="h-4 w-4 text-primary" />
                              ) : sortOrder === 'number-desc' ? (
                                <ChevronDown className="h-4 w-4 text-primary" />
                              ) : (
                                <ChevronUp className="h-4 w-4 text-muted-foreground" />
                              )}
                            </button>
                          </div>
                        </TableHead>
                        <TableHead></TableHead>
                        <TableHead className="text-right pr-4">
                          <div className="flex items-center justify-start pl-4">
                            <button 
                              onClick={() => handleSortClick('odds')}
                              className="flex items-center justify-center p-1 hover:bg-muted/30 rounded transition-colors"
                              aria-label="オッズでソート"
                            >
                              {sortOrder === 'odds-asc' ? (
                                <ChevronUp className="h-4 w-4 text-primary" />
                              ) : sortOrder === 'odds-desc' ? (
                                <ChevronDown className="h-4 w-4 text-primary" />
                              ) : (
                                <ChevronUp className="h-4 w-4 text-muted-foreground" />
                              )}
                            </button>
                          </div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayHorses.map((horse) => {
                        const latestOdd = latestOdds?.find(odd => 
                          Number(odd.horseId) === horse.number
                        );
                        const isSelected = selectedHorses.includes(horse.number);
                        const oddsChange = calculateOddsChange(horse.number);
                        const changeColor = getOddsChangeColor(oddsChange);
                        const changeArrow = getOddsChangeArrow(oddsChange);
                        
                        return (
                          <TableRow 
                            key={horse.id}
                            onClick={(e) => toggleHorseSelection(horse.number, e)}
                            onTouchStart={handleTouchStart}
                            onTouchEnd={(e) => handleTouchEnd(e, horse.number)}
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
                                {formattedOddsData.length >= 3 && (
                                  <span className={`text-xs ${getOddsChangeColor(calculateRecentOddsChange(horse.number))}`}>
                                    {getOddsChangeArrow(calculateRecentOddsChange(horse.number))}
                                  </span>
                                )}
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
          <Card className="lg:col-span-6 bg-background/50 backdrop-blur-sm overflow-hidden">
            <CardContent className="p-2 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg sm:text-xl font-semibold">オッズ推移</h2>
                <div className="text-xs text-muted-foreground">
                  {formattedOddsData.length > 0 && 
                    `${formattedOddsData[0].timestamp} - ${formattedOddsData[formattedOddsData.length - 1].timestamp}`
                  }
                </div>
              </div>
              
              {/* グループ切り替えボタン */}
              {horseGroups.length > 1 && (
                <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent justify-center">
                  {horseGroups.slice(0, Math.min(3, horseGroups.length)).map((group, index) => {
                    // グループ内の最小オッズと最大オッズを取得
                    const groupOdds = group.map(horseId => {
                      const odd = latestOdds?.find(o => Number(o.horseId) === horseId);
                      return odd ? parseFloat(odd.odds) : 999;
                    });
                    const minOdds = Math.min(...groupOdds);
                    const maxOdds = Math.max(...groupOdds);
                    
                    return (
                      <Button
                        key={index}
                        size="sm"
                        variant={currentGroupIndex === index ? "default" : "outline"}
                        onClick={() => switchGroup(index)}
                        className="whitespace-nowrap text-xs text-center"
                      >
                        {index === 0 ? "人気" : index === 1 ? "中人気" : "穴人気"}
                        <span className="ml-1 opacity-80">
                          {group.length}頭
                        </span>
                      </Button>
                    );
                  })}
                </div>
              )}
              
              {/* グラフコンテナ - 相対位置指定 */}
              <div className="h-[300px] sm:h-[400px] relative">
                {/* 背景グラデーション */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-30 pointer-events-none" />
                
                {/* スクロール可能なコンテナ */}
                <div 
                  className="absolute inset-0 overflow-x-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent" 
                  ref={chartContainerRef}
                >
                  {/* グラフコンテンツ */}
                  <div className="h-full min-w-[800px]">
                    <OddsChart />
                  </div>
                </div>
                
                {/* 左右のフェードエフェクト - スクロールコンテナの上に固定 */}
                <div className="absolute left-0 top-0 bottom-0 w-8 z-10 pointer-events-none bg-gradient-to-r from-background/80 to-transparent" />
                <div className="absolute right-0 top-0 bottom-0 w-8 z-10 pointer-events-none bg-gradient-to-l from-background/80 to-transparent" />
              </div>
              
              {/* グラフ操作ガイド */}
              <div className="mt-3 text-xs text-muted-foreground text-center">
                <p>左右にスクロールして時間推移を確認できます</p>
                <p className="mt-1">馬名をタップすると表示/非表示を切り替えられます</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 予想確率入力ボタン */}
        <div className="flex justify-center relative z-10">
          <Button 
            size="lg" 
            className="w-full max-w-md h-16 relative overflow-hidden group"
            onClick={() => window.location.href = `/predict/${id}`}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative flex items-center justify-center">
              <Trophy className="mr-2 h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
              <span className="relative">予想設定</span>
              <ArrowRight className="sm:h-4 sm:w-4 h-3 w-3 sm:ml-1" />
            </div>
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}