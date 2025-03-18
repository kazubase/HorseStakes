import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import MainLayout from "@/components/layout/MainLayout";
import { Ticket, Calendar, Coins, Trophy, ChevronRight, Info, Award, BarChart3 } from "lucide-react";
import { Helmet } from "react-helmet-async";

export default function Guide() {
  return (
    <MainLayout>
      <Helmet>
        <title>競馬予想・馬券作成の使い方ガイド | 回収率アップの馬券戦略</title>
        <meta name="description" content="競馬予想と馬券作成をサポートするAIアシスタントの使い方ガイド。的中率と期待値を計算し、回収率アップのための最適な馬券戦略を提案します。初心者から上級者まで簡単に利用できる競馬予想ツールです。" />
        <link rel="canonical" href="https://horse-stakes.com/guide" />
      </Helmet>

      {/* ヘッダーセクション */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-t from-background to-primary/10 p-6 mb-8 shadow-sm">
        <div className="absolute inset-0 bg-grid-primary/5 [mask-image:linear-gradient(to_bottom,transparent_20%,black_70%)]" />
        <div className="relative flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">競馬予想ツール</span>
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
            <span className="text-sm font-medium">使い方ガイド</span>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
            競馬予想・馬券作成アシスタントの使い方
          </h1>
          <div className="flex flex-wrap gap-2 mt-1">
            <span className="inline-flex items-center text-xs bg-primary/10 px-3 py-1 rounded-full text-primary">
              <Info className="h-3 w-3 mr-1" />
              競馬初心者向け
            </span>
            <span className="inline-flex items-center text-xs bg-primary/10 px-3 py-1 rounded-full text-primary">
              <Award className="h-3 w-3 mr-1" />
              回収率アップ
            </span>
            <span className="inline-flex items-center text-xs bg-primary/10 px-3 py-1 rounded-full text-primary">
              <BarChart3 className="h-3 w-3 mr-1" />
              期待値計算
            </span>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <p className="text-lg text-muted-foreground">
          回収率アップを目指す競馬ファンのための、AI駆動の馬券戦略ツールの使い方をご紹介します。
          的中率と期待値を計算し、最適な馬券の組み合わせを提案します。初心者から上級者まで、
          競馬予想の精度を高め、効率的な馬券購入をサポートします。
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="relative">
          <h2 className="text-2xl font-bold mb-6">ステップバイステップガイド</h2>
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
                src="/images/horseshoe-icon.webp" 
                alt="競馬予想アプリのロゴ - 馬蹄アイコン" 
                className="h-6 w-6"
                width="24"
                height="24"
                loading="lazy"
              />
            </div>
            <div>
              <p className="font-semibold">馬券戦略</p>
              <p className="text-sm">AI駆動の投資最適化で回収率アップ</p>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-6">馬券生成の仕組みと回収率向上のポイント</h2>
          <Card className="overflow-hidden bg-background/50 backdrop-blur-sm">
            <CardContent className="space-y-8 pt-6">
              <div className="space-y-12">
                <div className="group">
                  <div className="overflow-hidden rounded-lg border border-primary/10 transition-all duration-300 group-hover:border-primary/20">
                    <img 
                      src="/images/betting-generation.webp" 
                      alt="馬券候補生成プロセスの図解 - 確率計算から候補抽出までのフロー" 
                      className="w-full max-w-lg mx-auto dark:opacity-90 transition-transform duration-300 group-hover:scale-[1.02]"
                      width="512"
                      height="300"
                      loading="lazy"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mt-4 px-2">
                    単勝、複勝など全ての券種について期待値と的中確率を計算し、有望な候補を抽出します
                  </p>
                </div>

                <div className="group">
                  <div className="overflow-hidden rounded-lg border border-primary/10 transition-all duration-300 group-hover:border-primary/20">
                    <img 
                      src="/images/ai-analysis.webp" 
                      alt="AI分析プロセスの図解 - 期待値と確率に基づく最適な馬券組み合わせの分析" 
                      className="w-full max-w-lg mx-auto dark:opacity-90 transition-transform duration-300 group-hover:scale-[1.02]"
                      width="512"
                      height="300"
                      loading="lazy"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mt-4 px-2">
                    期待値、的中確率、相関関係、リスク分散を考慮して最適な馬券の組み合わせを分析します
                  </p>
                </div>

                <div className="group">
                  <div className="overflow-hidden rounded-lg border border-primary/10 transition-all duration-300 group-hover:border-primary/20">
                    <img 
                      src="/images/fund-optimization.webp" 
                      alt="資金配分最適化プロセスの図解 - シャープレシオに基づく投資額決定方法" 
                      className="w-full max-w-lg mx-auto dark:opacity-90 transition-transform duration-300 group-hover:scale-[1.02]"
                      width="512"
                      height="300"
                      loading="lazy"
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
      
      <div className="mt-16">
        <h2 className="text-2xl font-bold mb-6">よくある質問</h2>
        <div className="space-y-6">
          <Card className="overflow-hidden bg-background/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>競馬初心者でも使えますか？</CardTitle>
            </CardHeader>
            <CardContent>
              <p>はい、競馬初心者の方でも簡単に使えるよう設計されています。単勝確率と複勝確率を入力するだけで、AIが最適な馬券戦略を提案します。馬券の種類や組み合わせに悩む必要はありません。</p>
            </CardContent>
          </Card>
          
          <Card className="overflow-hidden bg-background/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>回収率を上げるコツはありますか？</CardTitle>
            </CardHeader>
            <CardContent>
              <p>回収率向上のポイントは、正確な確率予想と適切な資金配分です。オッズと自分の予想確率のギャップを見つけ、期待値の高い馬券を選ぶことが重要です。当サービスはそのプロセスを自動化し、最適な馬券戦略を提案します。</p>
            </CardContent>
          </Card>
          
          <Card className="overflow-hidden bg-background/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>どのような馬券種類に対応していますか？</CardTitle>
            </CardHeader>
            <CardContent>
              <p>単勝、複勝、馬連、馬単、ワイド、三連複、三連単など、JRAの主要な馬券種類すべてに対応しています。AIがレース状況に応じて最適な馬券種類を選択し、組み合わせを提案します。</p>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <div className="mt-16 text-center">
        <h2 className="text-2xl font-bold mb-4">今すぐ競馬予想を始めましょう</h2>
        <p className="text-lg text-muted-foreground mb-6">
          AIを活用した馬券戦略で回収率アップを目指しませんか？
        </p>
        <a 
          href="/" 
          className="inline-flex items-center justify-center rounded-md bg-primary px-8 py-3 text-lg font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
        >
          レース一覧を見る
        </a>
      </div>
    </MainLayout>
  );
} 