import { useEffect, useState, useMemo, memo, useCallback, lazy, Suspense } from "react";
import { useParams, useLocation } from "wouter";
import { useAtom, useAtomValue } from 'jotai';
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, ChevronLeft, ChevronRight, BarChart3, Settings, Lightbulb } from "lucide-react";
import { 
  horsesAtom, 
  analysisResultAtom,
  bettingOptionsAtom,
  raceNotesAtom,
  canProceedAtom,
  conditionalProbabilitiesAtom,
  winProbsAtom,
  placeProbsAtom,
  latestOddsAtom
} from '@/stores/bettingStrategy';
import type { Horse, TanOddsHistory, FukuOdds, WakurenOdds, UmarenOdds, WideOdds, UmatanOdds, Fuku3Odds, Tan3Odds } from "@db/schema";
import { BettingOptionsTable } from "@/components/BettingOptionsTable";
import { GeminiAnalysisResult } from '@/lib/geminiAnalysis';
import { Spinner } from "@/components/ui/spinner";
import { evaluateBettingOptions } from '@/lib/betEvaluation';
import { analyzeWithGemini } from '@/lib/geminiAnalysis';
import { calculateConditionalProbability } from '@/lib/betConditionalProbability';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useThemeStore } from "@/stores/themeStore";

// Lazy load HorseMarquee component
const HorseMarquee = lazy(() => import('@/components/HorseMarquee'));

// Geminiオプションの型定義
interface GeminiOptions {
  horses: Array<Horse & {
    odds: number;
    winProb: number;
    placeProb: number;
  }>;
  bettingOptions: Array<{
    type: string;
    horseName: string;
    odds: number;
    prob: number;
    ev: number;
    frame1: number;
    frame2: number;
    frame3: number;
    horse1: number;
    horse2: number;
    horse3: number;
  }>;
  conditionalProbabilities: any[];
}

interface BetTypeAnalysis {
  type: string;
  suitability: number;
  recommendedCombinations: string[];
}

// メモ入力用のコンポーネントを分離
const RaceNotesCard = () => {
  const [raceNotes, setRaceNotes] = useAtom(raceNotesAtom);
  
  return (
    <Card className="overflow-hidden bg-gradient-to-br from-black/40 to-primary/5">
      <CardHeader className="relative pb-4">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-background/5 to-transparent opacity-30" />
        <CardTitle className="relative">メモ</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative overflow-hidden rounded-lg bg-black/40 backdrop-blur-sm border border-primary/10 focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary/50 transition-all duration-200">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
          <textarea
            value={raceNotes}
            onChange={(e) => setRaceNotes(e.target.value)}
            className="w-full h-32 p-3 bg-transparent border-0 resize-none 
              focus:outline-none
              placeholder:text-muted-foreground text-foreground relative"
            placeholder="レース分析のメモを入力してください..."
          />
        </div>
      </CardContent>
    </Card>
  );
};

// 予想設定セクションを分離
const PredictionSettingsSection = memo(({ 
  budget, 
  riskRatio, 
  horses,
  winProbs,
  placeProbs 
}: {
  budget: number;
  riskRatio: number;
  horses: Horse[];
  winProbs: Record<string, number>;
  placeProbs: Record<string, number>;
}) => {
  const { theme } = useThemeStore();
  
  const getFrameColor = useCallback((frame: number) => {
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
  }, []);

  return (
    <Card className={
      theme === 'light'
        ? "overflow-hidden bg-gradient-to-br from-white to-secondary/5 border border-secondary/20 shadow-md"
        : "overflow-hidden bg-gradient-to-br from-background to-primary/5"
    }>
      <CardHeader className={
        theme === 'light'
          ? "relative pb-4 border-b border-secondary/20 bg-gradient-to-r from-secondary/10 to-transparent"
          : "relative pb-4"
      }>
        <div className={
          theme === 'light'
            ? "absolute inset-0 bg-gradient-to-r from-secondary/10 via-background/5 to-transparent opacity-30"
            : "absolute inset-0 bg-gradient-to-r from-primary/10 via-background/5 to-transparent opacity-50"
        } />
        <CardTitle className={
          theme === 'light'
            ? "relative text-xl font-bold text-gray-800"
            : "relative text-xl font-bold"
        }>予想設定</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {/* 投資条件 */}
        <div className={
          theme === 'light' 
            ? "p-4 bg-gradient-to-b from-secondary/5"
            : "p-4 bg-gradient-to-b from-primary/5"
        }>
          <div className="grid grid-cols-2 gap-4">
            <div className={
              theme === 'light'
                ? "bg-white rounded-xl p-3 shadow-md border border-gray-100"
                : "bg-background/80 backdrop-blur-sm rounded-xl p-3 shadow-lg border border-primary/10"
            }>
              <p className={
                theme === 'light'
                  ? "text-base sm:text-lg font-bold text-gray-800 truncate"
                  : "text-base sm:text-lg font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent truncate"
              }>
                ￥{budget.toLocaleString()}
              </p>
              <p className={
                theme === 'light'
                  ? "text-xs text-gray-500 mt-1 font-medium"
                  : "text-xs text-muted-foreground mt-1 font-medium"
              }>予算</p>
            </div>
            <div className={
              theme === 'light'
                ? "bg-white rounded-xl p-3 shadow-md border border-gray-100"
                : "bg-background/80 backdrop-blur-sm rounded-xl p-3 shadow-lg border border-primary/10"
            }>
              <p className={
                theme === 'light'
                  ? "text-base sm:text-lg font-bold text-gray-800"
                  : "text-base sm:text-lg font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent"
              }>
                ×{riskRatio.toFixed(1)}
              </p>
              <p className={
                theme === 'light'
                  ? "text-xs text-gray-500 mt-1 font-medium"
                  : "text-xs text-muted-foreground mt-1 font-medium"
              }>リスクリワード</p>
            </div>
          </div>
        </div>

        {/* 予想確率 */}
        <div className={
          theme === 'light'
            ? "divide-y divide-gray-200"
            : "divide-y divide-border/30"
        }>
          {horses && horses.length > 0 ? (
            horses
              .map(horse => ({
                ...horse,
                winProb: Number(winProbs[horse.id]) / 100 || 0,
                placeProb: Number(placeProbs[horse.id]) / 100 || 0
              }))
              // 単勝確率または複勝確率が0より大きい馬だけをフィルタリング
              .filter(horse => horse.winProb > 0 || horse.placeProb > 0)
              .sort((a, b) => {
                if (b.winProb !== a.winProb) return b.winProb - a.winProb;
                return b.placeProb - a.placeProb;
              })
              .map(horse => (
                <div key={horse.id} 
                     className={
                       theme === 'light'
                         ? "relative group hover:bg-gray-50 transition-colors"
                         : "relative group"
                     }>
                  <div className={
                    theme === 'light'
                      ? "absolute inset-0 bg-gradient-to-r from-secondary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
                      : "absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
                  } />
                  <div className="relative flex items-center px-4 py-3">
                    <div className="flex items-center gap-3 flex-1">
                      <div className={`
                        w-8 h-8 flex items-center justify-center rounded-lg font-bold shadow-sm
                        ${getFrameColor(horse.frame)}
                      `}>
                        {horse.number}
                      </div>
                      <span className={
                        theme === 'light'
                          ? "text-sm font-medium text-gray-700"
                          : "text-sm font-medium"
                      }>{horse.name}</span>
                    </div>
                    <div className="flex gap-6">
                      <div className="text-right">
                        <p className={`text-sm font-bold ${
                          theme === 'light'
                            ? horse.winProb >= 0.3 
                              ? 'text-green-600' 
                              : horse.winProb >= 0.2 
                                ? 'text-green-500' 
                                : 'text-gray-500'
                            : horse.winProb >= 0.3 
                              ? 'text-primary' 
                              : horse.winProb >= 0.2 
                                ? 'text-primary/80' 
                                : 'text-muted-foreground'
                        }`}>
                          {(horse.winProb * 100).toFixed(0)}%
                        </p>
                        <p className={
                          theme === 'light'
                            ? "text-[10px] text-gray-500 font-medium"
                            : "text-[10px] text-muted-foreground font-medium"
                        }>単勝</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-bold ${
                          theme === 'light'
                            ? horse.placeProb >= 0.75 
                              ? 'text-green-600' 
                              : horse.placeProb >= 0.5 
                                ? 'text-green-500' 
                                : 'text-gray-500'
                            : horse.placeProb >= 0.75 
                              ? 'text-primary' 
                              : horse.placeProb >= 0.5 
                                ? 'text-primary/80' 
                                : 'text-muted-foreground'
                        }`}>
                          {(horse.placeProb * 100).toFixed(0)}%
                        </p>
                        <p className={
                          theme === 'light'
                            ? "text-[10px] text-gray-500 font-medium"
                            : "text-[10px] text-muted-foreground font-medium"
                        }>複勝</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))
          ) : (
            <div className="flex justify-center items-center h-32">
              <Spinner className="w-4 h-4 mr-2" />
              <span className="text-sm text-muted-foreground">読込中...</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

// Gemini分析セクションを修正
const GeminiAnalysisSection = memo(({ 
  isLoading, 
  data 
}: { 
  isLoading: boolean; 
  data: any; 
}) => {
  const { theme } = useThemeStore();
  
  return (
    <Card className={
      theme === 'light'
        ? "overflow-hidden bg-gradient-to-br from-white to-secondary/5 border border-secondary/20 shadow-md"
        : "overflow-hidden bg-gradient-to-br from-black/40 to-primary/5"
    }>
      <CardHeader className={
        theme === 'light'
          ? "relative pb-4 border-b border-secondary/20 bg-gradient-to-r from-secondary/10 to-transparent"
          : "relative pb-4"
      }>
        <div className={
          theme === 'light'
            ? "absolute inset-0 bg-gradient-to-r from-secondary/10 via-background/5 to-transparent opacity-30"
            : "absolute inset-0 bg-gradient-to-r from-primary/10 via-background/5 to-transparent opacity-30"
        } />
        <CardTitle className={
          theme === 'light'
            ? "relative text-xl font-bold text-gray-800"
            : "relative text-xl font-bold"
        }>AI分析</CardTitle>
      </CardHeader>
      <CardContent className={
        theme === 'light'
          ? "p-4 bg-gradient-to-b from-secondary/5"
          : "p-4"
      }>
        {isLoading ? (
          <div className="flex justify-center items-center p-4">
            <Spinner className="w-4 h-4" />
            <span className={
              theme === 'light'
                ? "ml-2 text-gray-500"
                : "ml-2 text-muted-foreground"
            }>分析中...</span>
          </div>
        ) : data ? (
          <div className="space-y-4">
            {data.summary.keyInsights.map((insight: any, i: number) => (
              <div key={i} 
                className={
                  theme === 'light'
                    ? "relative overflow-hidden group bg-white rounded-lg border border-gray-200 shadow-sm transition-all duration-200 hover:shadow-md"
                    : "relative overflow-hidden group bg-black/40 backdrop-blur-sm rounded-lg border border-primary/10"
                }>
                <div className={
                  theme === 'light'
                    ? "absolute inset-0 bg-gradient-to-r from-indigo-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
                    : "absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
                } />
                <div className="relative p-4">
                  <div className="flex items-start gap-3">
                    <div className={
                      theme === 'light'
                        ? "w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center shrink-0"
                        : "w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0"
                    }>
                      <span className={
                        theme === 'light'
                          ? "text-xs font-medium text-indigo-700"
                          : "text-xs font-medium text-primary"
                      }>
                        {i + 1}
                      </span>
                    </div>
                    {typeof insight === 'string' ? (
                      <p className={
                        theme === 'light'
                          ? "text-sm leading-relaxed text-gray-700"
                          : "text-sm leading-relaxed"
                      }>{insight}</p>
                    ) : (
                      <div className="space-y-2 flex-1">
                        <h4 className={
                          theme === 'light'
                            ? "text-sm font-medium text-indigo-700"
                            : "text-sm font-medium text-primary"
                        }>{insight.strategy}</h4>
                        <p className={
                          theme === 'light'
                            ? "text-sm leading-relaxed text-gray-700"
                            : "text-sm leading-relaxed"
                        }>{insight.details}</p>
                        <div className="flex justify-between text-xs mt-2">
                          <span className={
                            theme === 'light'
                              ? "text-gray-500"
                              : "text-muted-foreground"
                          }>リスク: <span className={`font-medium ${
                            theme === 'light'
                              ? insight.riskLevel === '低' 
                                ? 'text-green-600' 
                                : insight.riskLevel === '中' 
                                  ? 'text-amber-600' 
                                  : 'text-red-600'
                              : insight.riskLevel === '低' 
                                ? 'text-green-400' 
                                : insight.riskLevel === '中' 
                                  ? 'text-yellow-400' 
                                  : 'text-red-400'
                          }`}>{insight.riskLevel}</span></span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
});

// サイドバーのタブ定義
interface SidebarTab {
  id: string;
  title: string;
  icon: React.ReactNode;
  component: React.ReactNode;
}

// BettingAnalysisコンポーネントのpropsインターフェースを追加
interface BettingAnalysisProps {
  initialSidebarOpen?: boolean;
}

export function BettingAnalysis({ initialSidebarOpen = false }: BettingAnalysisProps) {
  const { id } = useParams();
  const [location] = useLocation();
  const { theme } = useThemeStore();
  const [horses, setHorses] = useAtom(horsesAtom);
  const [analysisResult, setAnalysisResult] = useAtom<GeminiAnalysisResult | null>(analysisResultAtom);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [, setBettingOptions] = useAtom(bettingOptionsAtom);
  const [, setConditionalProbabilities] = useAtom(conditionalProbabilitiesAtom);
  const conditionalProbabilities = useAtomValue(conditionalProbabilitiesAtom);
  const [isCalculated, setIsCalculated] = useState(false);
  const [, setWinProbs] = useAtom(winProbsAtom);
  const [, setPlaceProbs] = useAtom(placeProbsAtom);
  const [, setLatestOdds] = useAtom(latestOddsAtom);
  
  // サイドバーの状態管理 - 初期値をpropsから取得
  const [isSidebarOpen, setIsSidebarOpen] = useState(initialSidebarOpen);
  const [activeTab, setActiveTab] = useState<string>("settings");

  // カスタムイベントリスナーを追加
  useEffect(() => {
    // サイドバーを開くイベントリスナー
    const handleOpenSidebar = () => {
      setIsSidebarOpen(true);
    };

    // 分析画面に移動してサイドバーを開くイベントリスナー
    const handleNavigateWithSidebar = () => {
      setIsSidebarOpen(true);
    };

    // イベントリスナーを登録
    window.addEventListener('openAnalysisSidebar', handleOpenSidebar);
    window.addEventListener('navigateToAnalysisWithSidebar', handleNavigateWithSidebar);

    // クリーンアップ関数
    return () => {
      window.removeEventListener('openAnalysisSidebar', handleOpenSidebar);
      window.removeEventListener('navigateToAnalysisWithSidebar', handleNavigateWithSidebar);
    };
  }, []);

  // initialSidebarOpenプロパティが変更されたときにサイドバーの状態を更新
  useEffect(() => {
    setIsSidebarOpen(initialSidebarOpen);
  }, [initialSidebarOpen]);

  const budget = Number(new URLSearchParams(window.location.search).get("budget")) || 10000;
  const riskRatio = Number(new URLSearchParams(window.location.search).get("risk")) || 1.0;

  const winProbsStr = new URLSearchParams(window.location.search).get("winProbs") || "{}";
  const placeProbsStr = new URLSearchParams(window.location.search).get("placeProbs") || "{}";
  
  const winProbs = JSON.parse(winProbsStr);
  const placeProbs = JSON.parse(placeProbsStr);

  const { data: horsesData, isError: isHorsesError } = useQuery<Horse[]>({
    queryKey: [`/api/horses/${id}`],
    enabled: !!id,
  });

  const { data: latestOdds } = useQuery<TanOddsHistory[]>({
    queryKey: [`/api/tan-odds-history/latest/${id}`],
    enabled: !!id,
    refetchInterval: 600000,
  });

  const { data: latestFukuOdds } = useQuery<FukuOdds[]>({
    queryKey: [`/api/fuku-odds/latest/${id}`],
    enabled: !!id,
    refetchInterval: 600000,
  });

  const { data: wakurenOdds } = useQuery<WakurenOdds[]>({
    queryKey: [`/api/wakuren-odds/latest/${id}`],
    enabled: !!id,
    refetchInterval: 600000,
  });

  const { data: umarenOdds } = useQuery<UmarenOdds[]>({
    queryKey: [`/api/umaren-odds/latest/${id}`],
    enabled: !!id,
    refetchInterval: 600000,
  });

  const { data: wideOdds } = useQuery<WideOdds[]>({
    queryKey: [`/api/wide-odds/latest/${id}`],
    enabled: !!id,
    refetchInterval: 600000,
  });

  const { data: umatanOdds } = useQuery<UmatanOdds[]>({
    queryKey: [`/api/umatan-odds/latest/${id}`],
    enabled: !!id,
    refetchInterval: 600000,
  });

  const { data: sanrenpukuOdds } = useQuery<Fuku3Odds[]>({
    queryKey: [`/api/sanrenpuku-odds/latest/${id}`],
    enabled: !!id,
    refetchInterval: 600000,
  });

  const { data: sanrentanOdds } = useQuery<Tan3Odds[]>({
    queryKey: [`/api/sanrentan-odds/latest/${id}`],
    enabled: !!id,
    refetchInterval: 600000,
  });

  // bettingOptionsの計算をクエリとしてキャッシュ
  const { data: calculatedBettingOptions } = useQuery({
    queryKey: ['betting-options', {
      horsesLength: horses?.length,
      latestOddsLength: latestOdds?.length,
      latestFukuOddsLength: latestFukuOdds?.length,
      wakurenOddsLength: wakurenOdds?.length,
      umarenOddsLength: umarenOdds?.length,
      wideOddsLength: wideOdds?.length,
      umatanOddsLength: umatanOdds?.length,
      sanrenpukuOddsLength: sanrenpukuOdds?.length,
      sanrentanOddsLength: sanrentanOdds?.length,
      budget,
      riskRatio
    }],
    queryFn: () => {
      if (!horses?.length || !latestOdds?.length || !latestFukuOdds?.length || 
          !wakurenOdds?.length || !umarenOdds?.length || !wideOdds?.length || 
          !umatanOdds?.length || !sanrenpukuOdds?.length || !sanrentanOdds?.length) {
        return [];
      }
      const mappedHorses = horses.map(horse => ({
        name: horse.name,
        odds: Number(latestOdds?.find(odd => Number(odd.horseId) === horse.number)?.odds || 0),
        winProb: winProbs[horse.id] / 100,
        placeProb: placeProbs[horse.id] / 100,
        frame: horse.frame,
        number: horse.number
      }));

      return evaluateBettingOptions(
        mappedHorses,
        budget,
        riskRatio,
        latestFukuOdds.map(odd => ({
          horse1: Number(odd.horseId),
          oddsMin: Number(odd.oddsMin),
          oddsMax: Number(odd.oddsMax)
        })),
        wakurenOdds.map(odd => ({
          frame1: odd.frame1,
          frame2: odd.frame2,
          odds: Number(odd.odds)
        })),
        umarenOdds.map(odd => ({
          horse1: Number(odd.horse1),
          horse2: Number(odd.horse2),
          odds: Number(odd.odds)
        })),
        wideOdds.map(odd => ({
          horse1: Number(odd.horse1),
          horse2: Number(odd.horse2),
          oddsMin: Number(odd.oddsMin),
          oddsMax: Number(odd.oddsMax)
        })),
        umatanOdds.map(odd => ({
          horse1: Number(odd.horse1),
          horse2: Number(odd.horse2),
          odds: Number(odd.odds)
        })),
        sanrenpukuOdds.map(odd => ({
          horse1: Number(odd.horse1),
          horse2: Number(odd.horse2),
          horse3: Number(odd.horse3),
          odds: Number(odd.odds)
        })),
        sanrentanOdds.map(odd => ({
          horse1: Number(odd.horse1),
          horse2: Number(odd.horse2),
          horse3: Number(odd.horse3),
          odds: Number(odd.odds)
        }))
      );
    },
    staleTime: 600000,
    gcTime: 601000,
  });

  // 条件付き確率の計算と保存をuseQueryで行う
  const { data: correlations } = useQuery({
    queryKey: ['conditional-probabilities', calculatedBettingOptions?.length],
    queryFn: () => calculateConditionalProbability(
      calculatedBettingOptions || [],
      horses?.map(horse => ({
        name: horse.name,
        odds: Number(latestOdds?.find(odd => Number(odd.horseId) === horse.number)?.odds || 0),
        winProb: winProbs[horse.id] / 100,
        placeProb: placeProbs[horse.id] / 100,
        frame: horse.frame,
        number: horse.number
      })) || []
    ),
    enabled: !!horses && !!calculatedBettingOptions?.length,
    staleTime: 600000,
    gcTime: 601000,
  });

  // correlationsが更新されたらatomに保存
  useEffect(() => {
    if (correlations) {
      setConditionalProbabilities(correlations);
    }
  }, [correlations]);

  // オッズフェッチ処理とatomの更新を最適化
  useEffect(() => {
    if (!latestOdds || latestOdds.length === 0) return;
    
    // TanOddsHistory[]からlatestOddsAtomの型に変換
    const formattedOdds = latestOdds.map(odd => ({
      horseId: String(odd.horseId),
      odds: Number(odd.odds)
    }));
    
    // 前回と同じデータでなければ更新
    setLatestOdds(prev => {
      if (!prev || prev.length !== formattedOdds.length) return formattedOdds;
      
      // 変更があるか確認
      const hasChanges = formattedOdds.some((odd, index) => 
        !prev[index] || prev[index].odds !== odd.odds || prev[index].horseId !== odd.horseId
      );
      
      return hasChanges ? formattedOdds : prev;
    });
  }, [latestOdds, setLatestOdds]);

  // 初期表示時のデータ読み込みを最適化
  const queryClient = useQueryClient();

  // 初期表示時にオッズデータを取得するための処理を修正
  useEffect(() => {
    // すでにlatestOddsAtomが設定されているか確認
    const currentOdds = queryClient.getQueryData([`/api/tan-odds-history/latest/${id}`]);
    
    // データがすでに存在する場合
    if (currentOdds && Array.isArray(currentOdds) && currentOdds.length > 0) {
      // キャッシュからオッズデータを設定
      const formattedOdds = currentOdds.map((odd: any) => ({
        horseId: String(odd.horseId),
        odds: Number(odd.odds)
      }));
      
      setLatestOdds(prev => {
        if (!prev || prev.length === 0) return formattedOdds;
        if (prev.length !== formattedOdds.length) return formattedOdds;
        
        // 変更があるか確認
        const hasChanges = formattedOdds.some((odd, index) => 
          !prev[index] || prev[index].odds !== odd.odds || prev[index].horseId !== odd.horseId
        );
        
        return hasChanges ? formattedOdds : prev;
      });
    } else if (horses && horses.length > 0 && id) {
      // データがなければクエリを明示的に実行（遅延ロード）
      queryClient.prefetchQuery({
        queryKey: [`/api/tan-odds-history/latest/${id}`],
        queryFn: () => 
          fetch(`/api/tan-odds-history/latest/${id}`).then(res => res.json()),
        staleTime: 300000, // 5分キャッシュを有効に
      });
    }
  }, [id, horses?.length, queryClient, setLatestOdds]);

  // 馬データと単勝オッズをマージ - 計算コストを削減
  const horseMarqueeData = useMemo(() => {
    if (!horses || !horses.length) return [];
    if (!latestOdds || !latestOdds.length) return [];
    
    // 以前の計算結果と入力データが同じなら再計算しない
    return horses.map(horse => ({
      number: horse.number,
      name: horse.name,
      frame: horse.frame,
      odds: Number(latestOdds?.find(odd => Number(odd.horseId) === horse.number)?.odds || 0)
    }));
    // 依存配列を最適化
  }, [horses, latestOdds]);

  // 遅延マーキー表示のためのコードを修正
  // shouldShowMarqueeの計算を最適化
  const shouldShowMarquee = useMemo(() => {
    return !!horseMarqueeData && horseMarqueeData.length > 0;
  }, [horseMarqueeData]);

  // コンポーネントがマウントされたときにサイズ再計算のイベントを発火
  useEffect(() => {
    if (!shouldShowMarquee) return;
    
    // 少し遅延を入れてからサイズ計算を確実に行う
    let timer1: number | null = null;
    let timer2: number | null = null;
    
    // リサイズイベントを一度だけ発火する関数
    const fireResizeEvent = () => {
      const resizeEvent = new Event('resize');
      window.dispatchEvent(resizeEvent);
    };
    
    // マウント後の初期化処理
    timer1 = window.setTimeout(() => {
      fireResizeEvent();
      // 2回目のリサイズイベントを追加で発火して確実に反映させる
      timer2 = window.setTimeout(() => {
        fireResizeEvent();
      }, 500);
    }, 100);
    
    return () => {
      if (timer1) window.clearTimeout(timer1);
      if (timer2) window.clearTimeout(timer2);
    };
  }, [shouldShowMarquee]);

  // geminiAnalysisの最適化されたクエリオプション
  const geminiAnalysisOptions = useMemo(() => ({
    queryKey: ['gemini-analysis', id, budget, riskRatio, 
      calculatedBettingOptions?.length, 
      correlations?.length
    ],
    queryFn: () => analyzeWithGemini({
      horses: horses?.map(horse => ({
        name: horse.name,
        odds: Number(latestOdds?.find(odd => Number(odd.horseId) === horse.number)?.odds || 0),
        winProb: winProbs[horse.id] / 100,
        placeProb: placeProbs[horse.id] / 100,
        frame: horse.frame,
        number: horse.number
      })) || [],
      bettingOptions: calculatedBettingOptions || [],
      budget,
      riskRatio,
      correlations: correlations || [],
      raceId: id || ''
    }),
    enabled: !!horses && !!calculatedBettingOptions?.length && !!correlations?.length,
    staleTime: 900000, // 15分キャッシュを有効に
    gcTime: 1800000, // 30分キャッシュを保持
  }), [id, budget, riskRatio, calculatedBettingOptions, correlations, horses, latestOdds, winProbs, placeProbs]);

  // Gemini分析のクエリは条件付き確率の計算が完了してから実行
  const geminiAnalysis = useQuery(geminiAnalysisOptions);

  // 副作用の最適化
  useEffect(() => {
    if (horsesData) {
      setHorses(horsesData);
    }
  }, [horsesData, setHorses]);

  useEffect(() => {
    if (calculatedBettingOptions) {
      setBettingOptions(calculatedBettingOptions);
    }
  }, [calculatedBettingOptions, setBettingOptions]);

  useEffect(() => {
    if (geminiAnalysis.data) {
      setAnalysisResult(geminiAnalysis.data);
    }
  }, [geminiAnalysis.data, setAnalysisResult]);

  // 確率計算が完了したら、atomに保存する
  useEffect(() => {
    if (calculatedBettingOptions && calculatedBettingOptions.length > 0) {
      // 単勝・複勝の確率をatomに保存
      const newWinProbs: Record<string, number> = {};
      const newPlaceProbs: Record<string, number> = {};
      
      // 馬券データから確率を抽出
      calculatedBettingOptions.forEach(bet => {
        if (bet.type === '単勝' && bet.horse1) {
          // 馬番号をキーとして使用
          newWinProbs[bet.horse1] = bet.probability * 100;
        }
        if (bet.type === '複勝' && bet.horse1) {
          // 馬番号をキーとして使用
          newPlaceProbs[bet.horse1] = bet.probability * 100;
        }
      });
      
      // atomに保存
      setWinProbs(newWinProbs);
      setPlaceProbs(newPlaceProbs);
    }
  }, [calculatedBettingOptions, setWinProbs, setPlaceProbs]);

  // サイドバータブの定義 - メモを削除
  const sidebarTabs = useMemo<SidebarTab[]>(() => [
    {
      id: "settings",
      title: "予想設定",
      icon: <Settings className="h-5 w-5" />,
      component: (
        <PredictionSettingsSection
          budget={budget}
          riskRatio={riskRatio}
          horses={horses || []}
          winProbs={winProbs}
          placeProbs={placeProbs}
        />
      )
    },
    {
      id: "analysis",
      title: "AI分析",
      icon: <Lightbulb className="h-5 w-5" />,
      component: (
        <GeminiAnalysisSection
          isLoading={geminiAnalysis.isLoading}
          data={geminiAnalysis.data}
        />
      )
    }
  ], [budget, riskRatio, horses, winProbs, placeProbs, geminiAnalysis.isLoading, geminiAnalysis.data]);

  if (isHorsesError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          データの取得に失敗しました。
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="relative">
      <div className="flex">
        {/* メインコンテンツ - 幅を調整 */}
        <div className={cn(
          "transition-all duration-300 ease-in-out w-full",
          isSidebarOpen ? "lg:w-2/3 xl:w-3/4" : "w-full"
        )}>
          <div className="space-y-2">
            <div className="flex justify-end p-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="flex items-center gap-1"
              >
                {isSidebarOpen ? (
                  <>
                    <ChevronRight className="h-4 w-4" />
                    <span className="hidden sm:inline">閉じる</span>
                  </>
                ) : (
                  <>
                    <ChevronLeft className="h-4 w-4" />
                    <span className="inline">設定確認とAI分析</span>
                  </>
                )}
              </Button>
            </div>
            {/* カードを削除して直接BettingOptionsTableを表示 */}
            <BettingOptionsTable
              bettingOptions={calculatedBettingOptions || []}
              selectedBets={[]}
              correlations={conditionalProbabilities}
              className="[&_tr:hover]:bg-transparent"
              showAnalysis={true}
              columnsCount={4} // 4列表示を指定
            />
          </div>
        </div>

        {/* サイドバー - レスポンシブ対応を強化 */}
        <div className={cn(
          theme === 'light'
            ? "fixed lg:relative right-0 top-0 h-full lg:h-auto z-50 bg-white backdrop-blur-sm border-l border-gray-200 transition-all duration-300 ease-in-out overflow-hidden"
            : "fixed lg:relative right-0 top-0 h-full lg:h-auto z-50 bg-background/95 backdrop-blur-sm border-l border-border/50 transition-all duration-300 ease-in-out overflow-hidden",
          isSidebarOpen 
            ? "translate-x-0 w-full sm:w-96 lg:w-1/3 xl:w-1/4" 
            : "translate-x-full w-full sm:w-96 lg:translate-x-full lg:w-0 lg:opacity-0 lg:invisible"
        )}>
          {/* サイドバーヘッダー */}
          <div className={
            theme === 'light'
              ? "flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white"
              : "flex items-center justify-between p-4 border-b border-border/50"
          }>
            <div className="flex items-center gap-2">
              {sidebarTabs.map(tab => (
                <Button
                  key={tab.id}
                  variant={
                    theme === 'light'
                      ? activeTab === tab.id 
                        ? "default" 
                        : "outline"
                      : activeTab === tab.id 
                        ? "default" 
                        : "ghost"
                  }
                  size="sm"
                  onClick={() => setActiveTab(tab.id)}
                  className={
                    theme === 'light'
                      ? "gap-1 font-medium" + (activeTab === tab.id 
                          ? " bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm" 
                          : " bg-white border-gray-400 text-gray-800 hover:bg-gray-50 shadow-sm")
                      : "gap-1"
                  }
                >
                  {tab.icon}
                  <span className="inline">{tab.title}</span>
                </Button>
              ))}
            </div>
            <Button
              variant={theme === 'light' ? "outline" : "ghost"}
              size="icon"
              onClick={() => setIsSidebarOpen(false)}
              className={
                theme === 'light'
                  ? "text-gray-500 hover:text-gray-800 border border-gray-200"
                  : "text-muted-foreground hover:text-foreground"
              }
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          {/* サイドバーコンテンツ */}
          <div className={
            theme === 'light'
              ? "p-4 overflow-y-auto h-[calc(100%-4rem)] bg-gradient-to-b from-gray-50/50 to-white/80"
              : "p-4 overflow-y-auto h-[calc(100%-4rem)]"
          }>
            {sidebarTabs.find(tab => tab.id === activeTab)?.component}
          </div>
        </div>
      </div>

      {/* 電光掲示板をフッターに固定表示 - 遅延ロード対応 */}
      {shouldShowMarquee && (
        <div className="fixed bottom-0 left-0 right-0 z-10 shadow-lg pointer-events-none">
          <div className="container mx-auto px-4">
            <Suspense fallback={
              <div className={`h-12 rounded-lg ${theme === 'light' ? 'bg-indigo-50' : 'bg-black/40'} animate-pulse`}></div>
            }>
              <HorseMarquee 
                horses={horseMarqueeData} 
                className={theme === 'light' ? 'shadow-sm mb-0' : 'shadow-lg mb-0'}
                speed={60}
              />
            </Suspense>
          </div>
        </div>
      )}
    </div>
  );
}