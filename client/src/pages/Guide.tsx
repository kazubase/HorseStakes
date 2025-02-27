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
            <Card className="overflow-hidden bg-background/50 backdrop-blur-sm hover:bg-background/60 transition-all duration-300">
              <CardHeader className="relative pb-4">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-background/5 to-transparent opacity-30" />
                <CardTitle className="relative flex items-center gap-2">
                  <div className="bg-primary/10 p-2 rounded-full">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  Step 1: レースを選ぶ
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="space-y-3">
                  <p className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">1</span>
                    レース一覧から投票したいレースを選択
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">2</span>
                    レース検索から過去に開催されたレースを検索
                  </p>
                </div>
                <div className="mt-4 space-y-1.5 rounded-lg bg-secondary/30 p-3">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/50" />
                    レース一覧には当日9時からレースが表示されます
                  </p>
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/50" />
                    現在は2024年日本ダービー、ジャパンカップ、有馬記念を検索できます
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden bg-background/50 backdrop-blur-sm hover:bg-background/60 transition-all duration-300">
              <CardHeader className="relative pb-4">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-background/5 to-transparent opacity-30" />
                <CardTitle className="relative flex items-center gap-2">
                  <div className="bg-primary/10 p-2 rounded-full">
                    <Trophy className="h-5 w-5 text-primary" />
                  </div>
                  Step 2: 確率を予想する
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="space-y-3">
                  <p className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">1</span>
                    単勝確率は合計100％、複勝確率は合計300％となるように入力
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">2</span>
                    投資金額、リスクリワードを入力
                  </p>
                </div>
                <div className="mt-4 rounded-lg bg-secondary/30 p-3">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/50" />
                    AIがあなたの入力に応じて最適な馬券を提案します
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden bg-background/50 backdrop-blur-sm hover:bg-background/60 transition-all duration-300">
              <CardHeader className="relative pb-4">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-background/5 to-transparent opacity-30" />
                <CardTitle className="relative flex items-center gap-2">
                  <div className="bg-primary/10 p-2 rounded-full">
                    <Ticket className="h-5 w-5 text-primary" />
                  </div>
                  Step 3: 戦略を確認する
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="space-y-3">
                  <p className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">1</span>
                    AIが提案する馬券の組み合わせを確認
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">2</span>
                    資金配分、選定理由も確認できます
                  </p>
                </div>
                <div className="mt-4 rounded-lg bg-secondary/30 p-3">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/50" />
                    AIが出力する内容は必ずしも正確ではないことに注意して下さい
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="hidden md:flex items-center gap-3 mt-12 text-muted-foreground">
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
          <Card className="overflow-hidden bg-background/50 backdrop-blur-sm">
            <CardContent className="space-y-8 pt-6">
              <div className="space-y-12">
                <div className="group">
                  <div className="overflow-hidden rounded-lg border border-primary/10 transition-all duration-300 group-hover:border-primary/20">
                    <img 
                      src="/betting-generation.png" 
                      alt="馬券候補の生成プロセス" 
                      className="w-full max-w-lg mx-auto dark:opacity-90 transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mt-4 px-2">
                    単勝、複勝など全ての券種について期待値と的中確率を計算し、有望な候補を抽出します
                  </p>
                </div>

                <div className="group">
                  <div className="overflow-hidden rounded-lg border border-primary/10 transition-all duration-300 group-hover:border-primary/20">
                    <img 
                      src="/ai-analysis.png" 
                      alt="AI分析プロセス" 
                      className="w-full max-w-lg mx-auto dark:opacity-90 transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mt-4 px-2">
                    期待値、的中確率、相関関係、リスク分散を考慮して最適な馬券の組み合わせを分析します
                  </p>
                </div>

                <div className="group">
                  <div className="overflow-hidden rounded-lg border border-primary/10 transition-all duration-300 group-hover:border-primary/20">
                    <img 
                      src="/fund-optimization.png" 
                      alt="資金配分の最適化プロセス" 
                      className="w-full max-w-lg mx-auto dark:opacity-90 transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mt-4 px-2">
                    シャープレシオの最大化を目指し、リスクとリターンのバランスを考慮して投資額を決定します
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
} 