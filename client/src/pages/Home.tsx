import { useParams, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Horse, Race, TanOddsHistory } from "@db/schema";
import { format } from "date-fns";
import MainLayout from "@/components/layout/MainLayout";
import { ChartBar, Trophy, ArrowRight, ChevronRight, ChevronUp, ChevronDown, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import RaceList from "@/pages/RaceList";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useMemo, useEffect, useState, useCallback, useRef } from 'react';
import { groupBy } from 'lodash';
import { useThemeStore } from "@/stores/themeStore";
import { useAtom } from 'jotai';
import { horsesAtom, raceAtom } from '@/stores/bettingStrategy';

export default function Home() {
  const { id } = useParams();
  const { theme } = useThemeStore();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [_, navigate] = useLocation();
  
  // Store race and horses in Jotai atoms for sharing with other components
  const [_storedHorses, setStoredHorses] = useAtom(horsesAtom);
  const [_storedRace, setStoredRace] = useAtom(raceAtom);

  // idがない場合はRaceListを表示
  if (!id) {
    return <RaceList />;
  }

  // レースデータの取得を最適化
  const { data: race, isLoading: raceLoading } = useQuery<Race>({
    queryKey: [`/api/races/${id}`],
    staleTime: Infinity, // レースデータは永続的にキャッシュ
    gcTime: Infinity, // キャッシュを永続的に保持
    retry: 1,
  });

  const { 
    data: horses = [], 
    isLoading: horsesLoading,
    refetch: refetchHorses 
  } = useQuery<Horse[]>({
    queryKey: [`/api/horses/${id}`],
    enabled: !!id,
    staleTime: Infinity, // 馬データは永続的にキャッシュ
    gcTime: Infinity, // キャッシュを永続的に保持
    retry: 1,
  });

  // ソート順の状態を追加
  const [sortOrder, setSortOrder] = useState<'number-asc' | 'number-desc' | 'odds-asc' | 'odds-desc'>('odds-asc');

  // オッズデータを取得する新しいクエリを追加（キャッシュタイムを30秒に設定）
  const { 
    data: latestOdds = [], 
    isLoading: latestOddsLoading,
    refetch: refetchOdds
  } = useQuery<TanOddsHistory[]>({
    queryKey: [`/api/tan-odds-history/latest/${id}`],
    enabled: !!id,
    staleTime: 30000, // 30秒間はキャッシュを使用
    retry: 1,
  });

  // オッズデータを手動で更新する関数
  const refreshOddsData = useCallback(async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      await refetchOdds();
      // 関連するオッズデータも更新
      if (id) {
        // 複勝オッズ等の他のオッズデータも無効化して再取得
        queryClient.invalidateQueries({ queryKey: [`/api/fuku-odds/latest/${id}`] });
        queryClient.invalidateQueries({ queryKey: [`/api/wakuren-odds/latest/${id}`] });
        queryClient.invalidateQueries({ queryKey: [`/api/umatan-odds/latest/${id}`] });
        queryClient.invalidateQueries({ queryKey: [`/api/wide-odds/latest/${id}`] });
        queryClient.invalidateQueries({ queryKey: [`/api/sanrenpuku-odds/latest/${id}`] });
        queryClient.invalidateQueries({ queryKey: [`/api/sanrentan-odds/latest/${id}`] });
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [id, refetchOdds, queryClient, isRefreshing]);

  // 馬番でソートした馬リストを作成
  const sortedHorses = [...horses].sort((a, b) => a.number - b.number);

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
      
      // オッズの範囲
      const oddsRange = maxOdds - minOdds;
      
      // オッズの標準偏差を計算
      const avgOdds = validOdds.reduce((sum, odds) => sum + odds, 0) / validOdds.length;
      const variance = validOdds.reduce((sum, odds) => sum + Math.pow(odds - avgOdds, 2), 0) / validOdds.length;
      const stdDev = Math.sqrt(variance);
      
      // 変動係数（標準偏差/平均）を計算
      const cv = stdDev / avgOdds;
      
      // 連続するオッズの相対差分を計算
      const relDiffs: number[] = [];
      for (let i = 1; i < validOdds.length; i++) {
        const diff = (validOdds[i] - validOdds[i-1]) / validOdds[i-1];
        relDiffs.push(diff);
      }
      
      // 相対差分をソートして、自然な分割点を探す
      const sortedDiffs = [...relDiffs].sort((a, b) => a - b);
      
      // 上位25%の差分を取得（これが自然な分割点の候補）
      const significantDiffIndex = Math.floor(sortedDiffs.length * 0.75);
      const significantDiff = sortedDiffs[significantDiffIndex] || 0.15;
      
      // レースの状況に応じた基本閾値を設定
      let baseThreshold: number;
      
      // 馬の数によって基本閾値を調整
      if (validOdds.length <= 8) {
        // 少頭数レースではより大きな閾値を使用
        baseThreshold = 0.2;
      } else if (validOdds.length >= 16) {
        // 多頭数レースではより小さな閾値を使用
        baseThreshold = 0.12;
      } else {
        // 中間のレースでは標準的な閾値を使用
        baseThreshold = 0.15;
      }
      
      // 分散が小さいレース（オッズが均等に分布）では閾値を下げる
      // 分散が大きいレース（オッズにばらつきがある）では閾値を上げる
      const cvAdjustment = cv < 0.3 ? -0.05 : cv > 0.8 ? 0.05 : 0;
      
      // 最終的な閾値を計算（自然な分割点と基本閾値の加重平均）
      const weightedThreshold = (significantDiff * 0.7) + (baseThreshold * 0.3);
      
      // 分散に基づく調整を適用
      const adjustedThreshold = weightedThreshold + cvAdjustment;
      
      // 閾値の下限と上限を設定
      return Math.min(0.45, Math.max(0.1, adjustedThreshold));
    };
    
    const THRESHOLD = calculateDynamicThreshold();
    
    // グループ化する際の最大メンバー数（特に人気グループが大きくなりすぎるのを防ぐ）
    const MAX_GROUP_SIZE = Math.min(6, Math.ceil(sortedOdds.length / 3));
    
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
      
      // 差が閾値より大きい場合、または現在のグループが最大サイズに達した場合は新しいグループを作成
      if (relativeDiff > THRESHOLD || currentGroup.length >= MAX_GROUP_SIZE) {
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

  // オッズ履歴データを取得（遅延読み込み）
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
    staleTime: 300000, // 5分間キャッシュを有効に
    gcTime: 600000, // 10分間キャッシュを保持
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
    if (!oddsHistory || oddsHistory.length === 0) return [];
    
    // 任意のタイムスタンプ型をサポートするため、配列型を維持しながらgroupByを使用
    const groupedByTimestamp = groupBy(oddsHistory as any[], 'timestamp');
    
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
          isFirst: index === 0, // 最初のデータポイントかどうかのフラグを追加
          ...odds.reduce((acc, odd: any) => ({
            ...acc,
            [`horse${odd.horseId}`]: parseFloat(odd.odds)
          }), {})
        };
      });
  }, [oddsHistory]);

  // 表示データのフィルタリングフラグを追加
  const [excludeInitialData, setExcludeInitialData] = useState(false);

  // 時間軸のズームレベルを管理する状態を追加
  const [timeZoom, setTimeZoom] = useState<'all' | 'normal'>('normal');

  // フィルタリングされたオッズデータ
  const filteredOddsData = useMemo(() => {
    if (!formattedOddsData.length) return [];
    
    // まず初期値の除外を適用
    let data = formattedOddsData;
    if (excludeInitialData && formattedOddsData.length > 2) {
      data = formattedOddsData.filter(data => !data.isFirst);
    }
    
    return data;
  }, [formattedOddsData, excludeInitialData]);

  // selectedHorsesの状態管理
  const [selectedHorses, setSelectedHorses] = useState<number[]>([]);

  // 初期選択を設定するuseEffect - データ点が少ない場合は全体表示をデフォルトに
  useEffect(() => {
    if (!latestOddsLoading && horseGroups.length > 0) {
      // 最初のグループ（人気グループ）を選択
      setSelectedHorses(horseGroups[0]);
    }
    
    // データ点が少ない場合は全体表示をデフォルトに
    if (formattedOddsData.length > 0 && formattedOddsData.length <= 10) {
      setTimeZoom('all');
    }
  }, [latestOddsLoading, horseGroups, formattedOddsData.length]);

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
      
      // オッズがない場合やNaNの場合は最後に表示
      const aValue = aOdds ? parseFloat(aOdds) : NaN;
      const bValue = bOdds ? parseFloat(bOdds) : NaN;
      
      // どちらかがNaNの場合の処理
      const aIsNaN = isNaN(aValue);
      const bIsNaN = isNaN(bValue);
      
      // 両方NaNならそのまま（馬番で比較）
      if (aIsNaN && bIsNaN) return a.number - b.number;
      
      // aだけがNaNなら後ろに
      if (aIsNaN) return 1;
      
      // bだけがNaNなら前に
      if (bIsNaN) return -1;
      
      // 両方数値ならオッズで比較
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

  // windowサイズを検出するカスタムフック追加
  const useWindowSize = () => {
    const [windowSize, setWindowSize] = useState({
      width: window.innerWidth,
      height: window.innerHeight,
    });

    useEffect(() => {
      const handleResize = () => {
        setWindowSize({
          width: window.innerWidth,
          height: window.innerHeight,
        });
      };

      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, []);

    return windowSize;
  };

  // windowサイズを取得
  const { width: windowWidth } = useWindowSize();

  // データポイント数に基づくグラフの最小幅を計算 - モバイルでの最小幅を調整
  const calculateChartMinWidth = useMemo(() => {
    const isMobile = windowWidth < 640;
    const dataPointCount = filteredOddsData.length;
    
    if (dataPointCount <= 0) return 0;
    
    // ズームレベルに応じて幅を調整
    if (timeZoom === 'all') {
      // 全体表示の場合はコンテナサイズに合わせる
      return isMobile ? '100%' : '100%';
    }
    
    // normal モード用の設定
    let pointWidth = 20; // 標準表示
    
    // モバイルでは全体的に縮小
    if (isMobile) {
      pointWidth = 10; // モバイル用に適切な値に調整
      
      // モバイルでは少ないデータポイントの場合コンテナ幅に合わせる
      if (dataPointCount <= 10) {
        return '100%';
      }
    }
    
    // 最低幅を計算
    return Math.max(isMobile ? windowWidth * 1.5 : 800, dataPointCount * pointWidth);
  }, [filteredOddsData.length, windowWidth, timeZoom]);

  // グラフの時間軸を変更する関数
  const handleTimeZoomChange = useCallback((zoom: 'all' | 'normal') => {
    setTimeZoom(zoom);
    
    // ズーム変更時にスクロールを最適化
    setTimeout(() => {
      if (chartContainerRef.current) {
        if (zoom === 'all') {
          // 全体表示の場合は左端にスクロール
          chartContainerRef.current.scrollLeft = 0;
        } else {
          // それ以外は右端にスクロール（最新データを表示）
          chartContainerRef.current.scrollLeft = chartContainerRef.current.scrollWidth;
        }
      }
    }, 100);
  }, []);

  // オッズ推移グラフコンポーネントを最適化し、メモ化
  const OddsChart = useMemo(() => {
    if (filteredOddsData.length === 0) {
      return (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          オッズデータがありません
        </div>
      );
    }

    // X軸の設定をズームレベルに基づいて調整
    const getXAxisConfig = () => {
      // デフォルト設定
      let interval: number | 'preserveStartEnd' | 'preserveEnd' | 'preserveStart' | 'equidistantPreserveStart' = 'preserveStartEnd';
      let minTickGap = 50;
      
      const isMobile = windowWidth < 640;
      
      // ズームレベルに応じた調整
      if (timeZoom === 'all') {
        // 全体表示モードでは開始・終了・日付変更点を優先
        interval = 'preserveStartEnd';
        minTickGap = isMobile ? 50 : 100;
        return { interval, minTickGap };
      }
      
      // normal モード
      interval = isMobile ? 'preserveEnd' : Math.max(1, Math.floor(filteredOddsData.length / 7));
      minTickGap = isMobile ? 30 : 60;
      
      return { interval, minTickGap };
    };
    
    const xAxisConfig = getXAxisConfig();

    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart 
          data={filteredOddsData}
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
            interval={xAxisConfig.interval}
            minTickGap={xAxisConfig.minTickGap}
            tick={(props) => {
              const { x, y, payload } = props;
              const dataIndex = filteredOddsData.findIndex(item => item.timestamp === payload.value);
              const data = filteredOddsData[dataIndex];
              
              // 日付が変わるポイントか最初と最後のポイントの場合は日付と時刻を表示
              // それ以外は時刻のみ表示
              const displayText = data?.isDateChanged || dataIndex === 0 || dataIndex === filteredOddsData.length - 1
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
            domain={(_) => {
              // 各馬ごとの最小・最大オッズからレンジを決定
              const visibleHorseIds = visibleHorses.map(h => h.number);
              
              // 現在表示中の馬のオッズデータだけを考慮
              const visibleOddsValues = filteredOddsData.flatMap(data => {
                return visibleHorseIds.map(horseId => {
                  const key = `horse${horseId}` as keyof typeof data;
                  const value = data[key];
                  return typeof value === 'number' && !isNaN(value) ? value : null;
                }).filter(Boolean) as number[];
              });
              
              if (visibleOddsValues.length === 0) return [0, 100];
              
              // 外れ値の除外のため、値をソートして統計的に処理
              const sortedValues = [...visibleOddsValues].sort((a, b) => a - b);
              
              // 四分位範囲を計算して外れ値を特定
              const q1Index = Math.floor(sortedValues.length * 0.25);
              const q3Index = Math.floor(sortedValues.length * 0.75);
              const q1 = sortedValues[q1Index];
              const q3 = sortedValues[q3Index];
              const iqr = q3 - q1;
              
              // 外れ値の境界を計算（標準的な1.5*IQRルールを緩和して2.5*IQRを使用）
              const lowerBound = Math.max(0, q1 - 2.5 * iqr);
              const upperBound = q3 + 2.5 * iqr;
              
              // 範囲内のデータのみを使用
              const filteredValues = sortedValues.filter(v => v >= lowerBound && v <= upperBound);
              
              if (filteredValues.length === 0) {
                // 全てが外れ値の場合は元のデータを使用
                const actualMin = Math.min(...visibleOddsValues);
                const actualMax = Math.max(...visibleOddsValues);
                const range = actualMax - actualMin;
                const margin = range * 0.15; // マージンを増加
                return [Math.max(0, actualMin - margin), actualMax + margin];
              }
              
              // フィルタリングされた値の範囲を取得
              const actualMin = filteredValues[0];
              const actualMax = filteredValues[filteredValues.length - 1];
              
              // 適切なマージンを追加（マージンを増加）
              const range = actualMax - actualMin;
              const margin = range * 0.15;
              
              return [Math.max(0, actualMin - margin), actualMax + margin];
            }}
            tickFormatter={(value) => value.toFixed(1)}
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
            axisLine={{ stroke: 'hsl(var(--border))' }}
            tickLine={{ stroke: 'hsl(var(--border))' }}
            width={55}
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
            x={filteredOddsData[0]?.timestamp}
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
            x={filteredOddsData[filteredOddsData.length - 1]?.timestamp}
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
  }, [filteredOddsData, visibleHorses, selectedHorses, windowWidth, timeZoom]);

  // グラフコンテナのref追加
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // 初期表示時に右端にスクロール
  useEffect(() => {
    if (chartContainerRef.current) {
      chartContainerRef.current.scrollLeft = chartContainerRef.current.scrollWidth;
    }
  }, [filteredOddsData]);

  // オッズの変動率を計算する関数を追加
  const calculateOddsChange = useCallback((horseId: number) => {
    if (filteredOddsData.length < 2) return 0;
    
    const firstData = filteredOddsData[0];
    const latestData = filteredOddsData[filteredOddsData.length - 1];
    
    const firstOdds = Number(firstData[`horse${horseId}` as keyof typeof firstData]);
    const latestOdds = Number(latestData[`horse${horseId}` as keyof typeof latestData]);
    
    if (isNaN(firstOdds) || isNaN(latestOdds)) return 0;
    
    // 変動率を計算（マイナスなら下降、プラスなら上昇）
    return ((latestOdds - firstOdds) / firstOdds) * 100;
  }, [filteredOddsData]);
  
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
    if (filteredOddsData.length < 3) return 0; // 少なくとも3つのデータポイントが必要
    
    // 最新のデータと、その1つ前のデータを取得
    const latestData = filteredOddsData[filteredOddsData.length - 1];
    const previousData = filteredOddsData[filteredOddsData.length - 2];
    
    const previousOdds = Number(previousData[`horse${horseId}` as keyof typeof previousData]);
    const latestOdds = Number(latestData[`horse${horseId}` as keyof typeof latestData]);
    
    if (isNaN(previousOdds) || isNaN(latestOdds)) return 0;
    
    // 直近の変動率を計算
    return ((latestOdds - previousOdds) / previousOdds) * 100;
  }, [filteredOddsData]);
  
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

  const handleNavigateToPrediction = useCallback(() => {
    // Make sure race and horses data is already in the cache before navigating
    // This way PredictionSettings.tsx won't need to fetch them again
    if (id) {
      if (race && horses) {
        // Data is already in cache, just navigate
        navigate(`/predict/${id}`);
      } else {
        // Prefetch data if not already loaded
        Promise.all([
          !race && queryClient.prefetchQuery({
            queryKey: [`/api/races/${id}`],
            staleTime: Infinity,
            gcTime: Infinity,
          }),
          !horses.length && queryClient.prefetchQuery({
            queryKey: [`/api/horses/${id}`],
            staleTime: Infinity,
            gcTime: Infinity,
          })
        ]).then(() => {
          navigate(`/predict/${id}`);
        });
      }
    }
  }, [id, race, horses, navigate, queryClient]);

  // Update the Jotai atoms when race and horses data is loaded
  useEffect(() => {
    if (race) {
      setStoredRace(race);
    }
  }, [race, setStoredRace]);
  
  useEffect(() => {
    if (horses && horses.length > 0) {
      setStoredHorses(horses);
    }
  }, [horses, setStoredHorses]);

  if (!race && !raceLoading) return null;

  return (
    <MainLayout>
      <div className="space-y-4 sm:space-y-5 relative min-h-screen pb-8 -mt-6 sm:-mt-6">
        <div className="absolute inset-0 from-primary/10 via-background/5 to-transparent opacity-30 h-full w-full" />
        
        {/* レース情報カード - 最初に表示する重要コンテンツ */}
        <Card className={
          theme === 'light'
            ? "overflow-hidden bg-gradient-to-br from-secondary/50 to-background relative z-10 border border-secondary/30 shadow-sm"
            : "overflow-hidden bg-gradient-to-br from-black/40 to-primary/5 relative z-10"
        }>
          <CardContent className="p-3 sm:p-5">
            <div className={
              theme === 'light'
                ? "absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-transparent opacity-50"
                : "absolute inset-0 bg-gradient-to-r from-primary/10 via-background/5 to-transparent opacity-30"
            } />
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
                    <h1 className={
                      theme === 'light'
                        ? "text-base sm:text-2xl font-bold mb-2 tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent"
                        : "text-base sm:text-2xl font-bold mb-2 bg-gradient-to-br from-foreground to-foreground/80 bg-clip-text text-transparent"
                    }>
                      {race?.name}
                    </h1>
                    <p className="text-sm sm:text-base text-muted-foreground">
                      {format(new Date(race?.startTime!), 'yyyy年M月d日')} {race?.venue} {format(new Date(race?.startTime!), 'HH:mm')}発走
                    </p>
                  </>
                )}
              </div>
              {!raceLoading && (
                <div className="text-right flex flex-col items-end gap-2">
                  <Button 
                    onClick={handleNavigateToPrediction}
                    size="sm"
                    className="relative overflow-hidden group text-xs sm:text-sm px-2 py-1 h-auto sm:h-9 sm:px-3 sm:py-2"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="relative flex items-center justify-center">
                      <ChartBar className="mr-1 h-3 w-3 sm:h-4 sm:w-4 sm:mr-1.5 transition-transform duration-300 group-hover:scale-110" />
                      <span className="relative">確率予想へ</span>
                      <ArrowRight className="h-2.5 w-2.5 sm:h-3 sm:w-3 ml-0.5 sm:ml-1" />
                    </div>
                  </Button>
                  <p className="text-sm sm:text-base font-semibold">
                    {race?.status === 'done' ? '発走済' : null}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* スケルトンローダーを使用して、ユーザーに読み込み中であることを視覚的に示す */}
        {(horsesLoading || raceLoading) ? (
          <div className="grid grid-cols-1 lg:grid-cols-10 gap-4 sm:gap-6 relative z-10">
            <Card className="lg:col-span-4 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/50">
              <CardContent className="p-4 sm:p-6 space-y-4">
                {Array(8).fill(0).map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-[200px]" />
                      <Skeleton className="h-4 w-[160px]" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="lg:col-span-6 bg-background/50 backdrop-blur-sm">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-48" />
                </div>
                <Skeleton className="h-[300px] w-full rounded-lg" />
              </CardContent>
            </Card>
          </div>
        ) : (
          <>
            {/* 2カラムレイアウト */}
            <div className="grid grid-cols-1 lg:grid-cols-10 gap-4 sm:gap-6 relative z-10">
              {/* 左カラム: 出馬表 */}
              <Card className="lg:col-span-4 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/50">
                <CardContent className="p-0 sm:p-6 relative">
                  {/* グラデーションオーバーレイ */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
                  
                  <div className="relative">
                    <div className="flex justify-between items-center pt-4 pl-4 sm:p-0 sm:mb-4">
                      <h2 className="text-lg sm:text-xl font-semibold">出馬表</h2>
                      <Button
                        size="sm"
                        variant={theme === 'light' ? "outline" : "secondary"}
                        onClick={refreshOddsData}
                        disabled={isRefreshing}
                        aria-label={isRefreshing ? "オッズを更新中" : "オッズを更新"}
                        className={
                          theme === 'light' 
                            ? "text-xs flex items-center gap-1 mr-6" 
                            : "text-xs flex items-center gap-1 mr-6 bg-primary/10 hover:bg-primary/20 text-foreground border-primary/30"
                        }
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
                        <span>{isRefreshing ? '更新中...' : '更新'}</span>
                      </Button>
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
                                  aria-pressed={sortOrder === 'number-asc' || sortOrder === 'number-desc'}
                                  aria-sort={sortOrder === 'number-asc' ? 'ascending' : sortOrder === 'number-desc' ? 'descending' : 'none'}
                                >
                                  {sortOrder === 'number-asc' ? (
                                    <ChevronUp className="h-4 w-4 text-primary" aria-hidden="true" />
                                  ) : sortOrder === 'number-desc' ? (
                                    <ChevronDown className="h-4 w-4 text-primary" aria-hidden="true" />
                                  ) : (
                                    <ChevronUp className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
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
                                  aria-pressed={sortOrder === 'odds-asc' || sortOrder === 'odds-desc'}
                                  aria-sort={sortOrder === 'odds-asc' ? 'ascending' : sortOrder === 'odds-desc' ? 'descending' : 'none'}
                                >
                                  {sortOrder === 'odds-asc' ? (
                                    <ChevronUp className="h-4 w-4 text-primary" aria-hidden="true" />
                                  ) : sortOrder === 'odds-desc' ? (
                                    <ChevronDown className="h-4 w-4 text-primary" aria-hidden="true" />
                                  ) : (
                                    <ChevronUp className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
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
                                    {filteredOddsData.length >= 3 && (
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
                  <div className="flex items-center justify-between p-2 sm:p-0 sm:mb-4">
                    <h2 className="text-lg sm:text-xl font-semibold whitespace-nowrap">オッズ推移</h2>
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className={`text-xs ${excludeInitialData ? 'bg-primary/10' : ''} min-w-[80px]`}
                        onClick={() => setExcludeInitialData(!excludeInitialData)}
                      >
                        <span className="sm:block hidden">{excludeInitialData ? '初期値を除外中' : '初期値を除外'}</span>
                        <span className="sm:hidden block text-center leading-tight">
                          {excludeInitialData ? '初期値\n除外中' : '初期値\n除外'}
                        </span>
                      </Button>
                      <div className="text-xs text-muted-foreground hidden sm:block">
                        {filteredOddsData.length > 0 && 
                          `${filteredOddsData[0].timestamp} - ${filteredOddsData[filteredOddsData.length - 1].timestamp}`
                        }
                      </div>
                    </div>
                  </div>
                  
                  {/* スマホサイズのみのタイムスタンプ表示 */}
                  <div className="text-xs text-muted-foreground text-center sm:hidden mb-2">
                    {filteredOddsData.length > 0 && 
                      `${filteredOddsData[0].timestamp} - ${filteredOddsData[filteredOddsData.length - 1].timestamp}`
                    }
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
                    {/* グラフデータのロード中はスケルトンを表示 */}
                    {oddsLoading ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Skeleton className="h-full w-full rounded-lg" />
                        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                          オッズデータを読み込み中...
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* 背景グラデーション */}
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-30 pointer-events-none" />
                        
                        {/* スクロール可能なコンテナ */}
                        <div 
                          className={`absolute inset-0 overflow-x-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent`} 
                          ref={chartContainerRef}
                        >
                          {/* グラフコンテンツ */}
                          <div 
                            className="h-full" 
                            style={{ 
                              minWidth: typeof calculateChartMinWidth === 'string' 
                                ? calculateChartMinWidth 
                                : `${calculateChartMinWidth}px` 
                            }}
                          >
                            {OddsChart}
                          </div>
                        </div>
                        
                        {/* スマホでスクロールが不要な場合はフェードエフェクトを非表示に */}
                        {windowWidth >= 640 && (
                          <>
                            <div className="absolute left-0 top-0 bottom-0 w-8 z-10 pointer-events-none bg-gradient-to-r from-background/80 to-transparent" />
                            <div className="absolute right-0 top-0 bottom-0 w-8 z-10 pointer-events-none bg-gradient-to-l from-background/80 to-transparent" />
                          </>
                        )}
                      </>
                    )}
                  </div>
                  
                  {/* 時間軸切り替えボタン - グラフの下に移動 */}
                  {formattedOddsData.length > 4 && (
                    <div className="flex flex-wrap gap-2 mt-4 justify-center">
                      <div className="flex text-xs border border-border rounded-md overflow-hidden">
                        <button 
                          className={`px-3 py-1.5 ${timeZoom === 'all' ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted/50'}`}
                          onClick={() => handleTimeZoomChange('all')}
                        >
                          全体
                        </button>
                        <button 
                          className={`px-3 py-1.5 border-l border-border ${timeZoom === 'normal' ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted/50'}`}
                          onClick={() => handleTimeZoomChange('normal')}
                        >
                          最新
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* グラフ操作ガイド - スマホサイズでスクロールが不要な場合は非表示 */}
                  <div className="mt-2 text-xs text-muted-foreground text-center">
                    {windowWidth >= 640 && <p>左右にスクロールして時間推移を確認できます</p>}
                    <p className={windowWidth >= 640 ? "mt-1" : ""}>馬名をタップすると表示/非表示を切り替えられます</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* 予想確率入力ボタン */}
        <div className="flex justify-center relative z-10">
          <Button 
            size="lg" 
            className="w-full max-w-md h-16 relative overflow-hidden group"
            onClick={handleNavigateToPrediction}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative flex items-center justify-center">
              <ChartBar className="mr-2 h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
              <span className="relative">確率予想へ</span>
              <ArrowRight className="sm:h-4 sm:w-4 h-3 w-3 sm:ml-1" />
            </div>
          </Button>
        </div>
      </div>

    </MainLayout>
  );
}