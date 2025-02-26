import { useEffect, useState, useMemo, memo, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { useAtom } from 'jotai';
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { 
  horsesAtom, 
  analysisResultAtom,
  bettingOptionsAtom,
  raceNotesAtom,
  canProceedAtom
} from '@/stores/bettingStrategy';
import type { Horse, TanOddsHistory, FukuOdds, WakurenOdds, UmarenOdds, WideOdds, UmatanOdds, Fuku3Odds, Tan3Odds } from "@db/schema";
import { BettingOptionsTable } from "@/components/BettingOptionsTable";
import { GeminiAnalysisResult } from '@/lib/geminiAnalysis';
import { Spinner } from "@/components/ui/spinner";
import { evaluateBettingOptions } from '@/lib/betEvaluation';
import { analyzeWithGemini } from '@/lib/geminiAnalysis';
import { calculateConditionalProbability } from '@/lib/betConditionalProbability';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
    <Card>
      <CardHeader>
        <CardTitle>メモ</CardTitle>
        <CardDescription>レース分析のメモを残すことができます</CardDescription>
      </CardHeader>
      <CardContent>
        <textarea
          value={raceNotes}
          onChange={(e) => setRaceNotes(e.target.value)}
          className="w-full h-32 p-3 rounded-lg bg-secondary/50 border-0 resize-none 
            focus:outline-none focus:ring-2 focus:ring-primary 
            placeholder:text-muted-foreground text-foreground"
          placeholder="レース分析のメモを入力してください..."
        />
      </CardContent>
    </Card>
  );
};

// 馬券候補テーブルを分離
const BettingOptionsSection = memo(({ 
  bettingOptions, 
  conditionalProbabilities, 
  geminiRecommendations 
}: {
  bettingOptions: any[];
  conditionalProbabilities: any[];
  geminiRecommendations?: any;
}) => (
  <Card>
    <CardHeader>
      <CardTitle>馬券候補</CardTitle>
    </CardHeader>
    <CardContent className="p-0">
      <BettingOptionsTable
        bettingOptions={bettingOptions}
        selectedBets={[]}
        correlations={conditionalProbabilities}
        geminiRecommendations={geminiRecommendations}
      />
    </CardContent>
  </Card>
));

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
    <Card>
      <CardHeader>
        <CardTitle>予想設定</CardTitle>
      </CardHeader>
      <CardContent>
        {/* 投資条件 */}
        <div className="mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-secondary/50 p-4 rounded-lg">
              <p className="text-2xl font-bold">{budget.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">予算</p>
            </div>
            <div className="bg-secondary/50 p-4 rounded-lg">
              <p className="text-2xl font-bold">×{riskRatio.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">リスクリワード</p>
            </div>
          </div>
        </div>

        {/* 予想確率 */}
        {horses && horses.length > 0 ? (
          <div className="space-y-2">
            {horses
              .map(horse => ({
                ...horse,
                winProb: Number(winProbs[horse.id]) / 100 || 0,
                placeProb: Number(placeProbs[horse.id]) / 100 || 0
              }))
              .sort((a, b) => {
                if (b.winProb !== a.winProb) {
                  return b.winProb - a.winProb;
                }
                return b.placeProb - a.placeProb;
              })
              .slice(0, 5)
              .map(horse => (
                <div key={horse.id} 
                     className="flex items-center p-2 rounded-lg hover:bg-secondary/50 transition-colors">
                  <div className="flex items-center gap-2 flex-1">
                    <div className="flex items-center">
                      <span className={`px-2 py-1 rounded text-sm ${getFrameColor(horse.frame)}`}>
                        {horse.number}
                      </span>
                    </div>
                    <span className="text-sm truncate">{horse.name}</span>
                  </div>
                  <div className="flex gap-3 text-right">
                    <div className="w-14">
                      <p className="text-sm font-bold">{(horse.winProb * 100).toFixed(0)}%</p>
                      <p className="text-[10px] text-muted-foreground">単勝</p>
                    </div>
                    <div className="w-14">
                      <p className="text-sm font-bold">{(horse.placeProb * 100).toFixed(0)}%</p>
                      <p className="text-[10px] text-muted-foreground">複勝</p>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <div className="flex justify-center items-center h-32">
            <Spinner className="w-4 h-4 mr-2" />
            <span className="text-sm text-muted-foreground">読込中...</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

// Gemini分析セクションを分離
const GeminiAnalysisSection = memo(({ 
  isLoading, 
  data 
}: { 
  isLoading: boolean; 
  data: any; 
}) => (
  <Card>
    <CardHeader>
      <CardTitle>推奨アプローチ</CardTitle>
    </CardHeader>
    <CardContent>
      {isLoading ? (
        <div className="flex justify-center items-center p-4">
          <Spinner />
          <span className="ml-2">分析中...</span>
        </div>
      ) : data ? (
        <div className="space-y-4">
          {/* 推奨される馬券組み合わせ */}
          <div className="bg-secondary/50 p-3 rounded-lg">
            <h4 className="text-sm font-medium mb-2">推奨される馬券組み合わせ</h4>
            {data.analysis.betTypeAnalysis
              .filter((analysis: BetTypeAnalysis) => analysis.suitability > 70)
              .map((analysis: BetTypeAnalysis, i: number) => (
                <div key={i} className="mb-3">
                  <p className="text-xs font-medium mb-1">{analysis.type}</p>
                  <div className="grid gap-2">
                    {analysis.recommendedCombinations.map((combo, j) => (
                      <div key={j} className="text-xs bg-primary/10 p-2 rounded">
                        {combo}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>

          {/* 重要な洞察 */}
          <div className="bg-secondary/50 p-3 rounded-lg">
            <h4 className="text-sm font-medium mb-2">重要な洞察</h4>
            <ul className="list-disc pl-4 space-y-1">
              {data.summary.keyInsights.map((insight: string, i: number) => (
                <li key={i} className="text-xs">{insight}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </CardContent>
  </Card>
));

export function BettingAnalysis() {
  const { id } = useParams();
  const [location] = useLocation();
  const [horses, setHorses] = useAtom(horsesAtom);
  const [analysisResult, setAnalysisResult] = useAtom<GeminiAnalysisResult | null>(analysisResultAtom);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [, setBettingOptions] = useAtom(bettingOptionsAtom);
  const [isCalculated, setIsCalculated] = useState(false);

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
  });

  const { data: latestFukuOdds } = useQuery<FukuOdds[]>({
    queryKey: [`/api/fuku-odds/latest/${id}`],
    enabled: !!id,
  });

  const { data: wakurenOdds } = useQuery<WakurenOdds[]>({
    queryKey: [`/api/wakuren-odds/latest/${id}`],
    enabled: !!id,
  });

  const { data: umarenOdds } = useQuery<UmarenOdds[]>({
    queryKey: [`/api/umaren-odds/latest/${id}`],
    enabled: !!id,
  });

  const { data: wideOdds } = useQuery<WideOdds[]>({
    queryKey: [`/api/wide-odds/latest/${id}`],
    enabled: !!id,
  });

  const { data: umatanOdds } = useQuery<UmatanOdds[]>({
    queryKey: [`/api/umatan-odds/latest/${id}`],
    enabled: !!id,
  });

  const { data: sanrenpukuOdds } = useQuery<Fuku3Odds[]>({
    queryKey: [`/api/sanrenpuku-odds/latest/${id}`],
    enabled: !!id,
  });

  const { data: sanrentanOdds } = useQuery<Tan3Odds[]>({
    queryKey: [`/api/sanrentan-odds/latest/${id}`],
    enabled: !!id,
  });

  // メモ化された値の計算
  const bettingOptions = useMemo(() => {
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
  }, [
    horses?.length,
    latestOdds?.length,
    latestFukuOdds?.length,
    wakurenOdds?.length,
    umarenOdds?.length,
    wideOdds?.length,
    umatanOdds?.length,
    sanrenpukuOdds?.length,
    sanrentanOdds?.length,
    budget,
    riskRatio
  ]);

  const conditionalProbabilities = useMemo(() => {
    if (!horses || !bettingOptions) return [];
    
    return calculateConditionalProbability(
      bettingOptions,
      horses.map(horse => ({
        name: horse.name,
        odds: Number(latestOdds?.find(odd => Number(odd.horseId) === horse.number)?.odds || 0),
        winProb: winProbs[horse.id] / 100,
        placeProb: placeProbs[horse.id] / 100,
        frame: horse.frame,
        number: horse.number
      }))
    ).map(corr => ({
      condition: {
        type: corr.condition.type,
        horses: corr.condition.horses
      },
      target: {
        type: corr.target.type,
        horses: corr.target.horses
      },
      probability: corr.probability
    }));
  }, [horses, bettingOptions, latestOdds, winProbs, placeProbs]);

  // Step 2: Geminiによる分析
  const geminiAnalysis = useQuery({
    queryKey: ['gemini-analysis', bettingOptions, budget, riskRatio],
    queryFn: () => analyzeWithGemini({
      horses: horses?.map(horse => ({
        name: horse.name,
        odds: Number(latestOdds?.find(odd => Number(odd.horseId) === horse.number)?.odds || 0),
        winProb: winProbs[horse.id] / 100,
        placeProb: placeProbs[horse.id] / 100,
        frame: horse.frame,
        number: horse.number
      })) || [],
      bettingOptions: bettingOptions.map(bet => ({
        type: bet.type,
        horses: bet.horses,
        horseName: bet.horses.join(bet.type.includes('単') ? '→' : '-'),
        odds: bet.expectedReturn / bet.stake,
        probability: bet.probability,
        expectedReturn: bet.expectedReturn,
        stake: bet.stake
      })),
      budget,
      riskRatio,
      correlations: conditionalProbabilities
    }),
    enabled: !!horses && !!bettingOptions.length
  });

  // 副作用の最適化
  useEffect(() => {
    if (horsesData) {
      setHorses(horsesData);
    }
  }, [horsesData, setHorses]);

  useEffect(() => {
    setBettingOptions(bettingOptions);
  }, [bettingOptions, setBettingOptions]);

  useEffect(() => {
    if (geminiAnalysis.data) {
      setAnalysisResult(geminiAnalysis.data);
    }
  }, [geminiAnalysis.data, setAnalysisResult]);

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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-6 lg:sticky lg:top-4 lg:self-start">
        <BettingOptionsSection
          bettingOptions={bettingOptions}
          conditionalProbabilities={conditionalProbabilities}
          geminiRecommendations={geminiAnalysis.data?.recommendations}
        />
        <PredictionSettingsSection
          budget={budget}
          riskRatio={riskRatio}
          horses={horses || []}
          winProbs={winProbs}
          placeProbs={placeProbs}
        />
      </div>
      
      <div className="space-y-6">
        <RaceNotesCard />
        <GeminiAnalysisSection
          isLoading={geminiAnalysis.isLoading}
          data={geminiAnalysis.data}
        />
      </div>
    </div>
  );
}