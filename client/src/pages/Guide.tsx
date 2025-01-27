import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import MainLayout from "@/components/layout/MainLayout";
import { Ticket, Calendar, Coins, Trophy } from "lucide-react";

export default function Guide() {
  return (
    <MainLayout>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="relative">
          <h1 className="text-2xl font-bold mb-6">使い方ガイド</h1>
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Step 1: レース選択
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p>1. レース一覧から投票したいレースを選択</p>
                <p>2. レース検索から過去に開催されたレースを検索</p>
                <p className="text-sm text-muted-foreground">※レース一覧には当日9時からレースが表示されます</p>
                <p className="text-sm text-muted-foreground">※現在は2024年日本ダービー、ジャパンカップ、有馬記念を検索できます</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Step 2: 予想確率、投資設定を入力
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p>1. 単勝確率は合計100％、複勝確率は合計300％となるように入力</p>
                <p>2. 投資金額、リスクリワードを入力</p>
                <p className="text-sm text-muted-foreground">※AIがあなたの入力に応じて最適な馬券を提案します</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Ticket className="h-5 w-5" />
                  Step 3: AI戦略の確認
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p>1. AIが提案する馬券の組み合わせを確認</p>
                <p>2. オッズ、的中率、資金配分が確認できます</p>
                <p className="text-sm text-muted-foreground">※出力されるオッズ、的中率は必ずしも正確な値ではないことに注意して下さい</p>
              </CardContent>
            </Card>
          </div>
          
          <div className="hidden md:flex items-center gap-3 absolute bottom-4 left-4 text-muted-foreground">
            <div className="bg-primary/10 p-3 rounded-full">
              <img 
                src="/horseshoe-icon2.PNG" 
                alt="馬蹄アイコン" 
                className="h-6 w-6"
              />
            </div>
            <div>
              <p className="font-semibold">馬券戦略</p>
              <p className="text-sm">AI駆動の投資最適化</p>
            </div>
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-bold mb-6">馬券生成の仕組み</h1>
          <Card>
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-12">
                <div>
                  <img 
                    src="/betting-generation.png" 
                    alt="馬券候補の生成プロセス" 
                    className="w-full max-w-lg mx-auto dark:opacity-90"
                  />
                  <p className="text-sm text-muted-foreground mt-4">単勝、複勝など全ての馬券種別について期待値と的中確率を計算し、有望な候補を抽出します</p>
                </div>

                <div>
                  <img 
                    src="/ai-analysis.png" 
                    alt="AI分析プロセス" 
                    className="w-full max-w-lg mx-auto dark:opacity-90"
                  />
                  <p className="text-sm text-muted-foreground mt-4">期待値、的中確率、相関関係、リスク分散を考慮して最適な馬券の組み合わせを分析します</p>
                </div>

                <div>
                  <img 
                    src="/fund-optimization.png" 
                    alt="資金配分の最適化プロセス" 
                    className="w-full max-w-lg mx-auto dark:opacity-90"
                  />
                  <p className="text-sm text-muted-foreground mt-4">シャープレシオの最大化を目指し、リスクとリターンのバランスを考慮して投資額を決定します</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
} 