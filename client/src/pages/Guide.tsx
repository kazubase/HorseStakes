import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import MainLayout from "@/components/layout/MainLayout";
import { Ticket, Calendar, Coins, Trophy, ChevronRight, Info, Award, BarChart3 } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { useThemeStore } from "@/stores/themeStore";

export default function Guide() {
  const { theme } = useThemeStore();
  
  return (
    <MainLayout>
      <Helmet>
        <title>馬券戦略ガイド | 競馬の期待値計算と戦略立案の方法</title>
        <meta name="description" content="競馬の期待値計算に基づく馬券戦略の立て方ガイド。的中率分析と期待値計算の基本から、確率計算を活用した効率的な投資戦略まで競馬予想の実践方法を解説します。" />
        <meta name="keywords" content="馬券戦略,競馬,期待値,期待値計算,期待値計算ツール,確率計算" />
        <link rel="canonical" href="https://horse-stakes.com/guide" />
        <meta property="og:title" content="馬券戦略ガイド | 競馬の期待値計算と戦略立案の方法" />
        <meta property="og:description" content="競馬の期待値計算に基づく馬券戦略の立て方ガイド。確率計算を活用した的中率分析と期待値計算の基本から、効率的な投資戦略まで競馬予想の実践方法を解説します。" />
        <meta property="og:type" content="article" />
        <meta property="og:url" content="https://horse-stakes.com/guide" />
        <meta property="og:image" content="https://horse-stakes.com/images/horseshoe-icon2.webp" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="馬券戦略ガイド | 競馬の期待値計算と戦略立案の方法" />
        <meta name="twitter:description" content="競馬の期待値計算、確率計算を活用した馬券戦略の立て方ガイド。的中率分析の基本から実践まで解説。" />
        <meta name="twitter:image" content="https://horse-stakes.com/images/horseshoe-icon2.webp" />
      </Helmet>

      {/* 構造化データの追加 */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": "馬券戦略ガイド | 競馬の期待値計算と戦略立案の方法",
          "description": "競馬の期待値計算に基づく馬券戦略の立て方ガイド。確率計算を活用した的中率分析の基本から、効率的な投資戦略まで競馬予想の実践方法を解説します。",
          "image": "https://horse-stakes.com/images/horseshoe-icon2.webp",
          "author": {
            "@type": "Organization",
            "name": "馬券戦略"
          },
          "publisher": {
            "@type": "Organization",
            "name": "馬券戦略",
            "logo": {
              "@type": "ImageObject",
              "url": "https://horse-stakes.com/images/horseshoe-icon2.webp"
            }
          },
          "datePublished": "2025-03-19",
          "dateModified": "2025-03-19",
          "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": "https://horse-stakes.com/guide"
          }
        })}
      </script>

      {/* FAQの構造化データ */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": [
            {
              "@type": "Question",
              "name": "競馬初心者でも期待値計算は使えますか？",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "はい、競馬初心者の方でも簡単に使えるよう設計されています。単勝確率と複勝確率を入力するだけで、馬券戦略が最適な馬券作成方法を提案します。期待値計算の詳細を理解する必要はなく、直感的に使えます。"
              }
            },
            {
              "@type": "Question",
              "name": "確率計算と期待値計算の違いは何ですか？",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "確率計算は馬券的中の可能性（的中確率）を予測する作業です。一方、期待値計算はその確率とオッズから投資価値を算出するもので、(オッズ×的中確率)の式で表されます。馬券戦略では確率計算の精度が期待値計算の精度を左右する重要な要素となります。"
              }
            },
            {
              "@type": "Question",
              "name": "期待値計算で回収率を上げるコツはありますか？",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "回収率向上のポイントは、正確な確率予想と適切な資金配分です。オッズと自分の予想確率の差を見つけ、期待値の高い馬券を選ぶことが重要です。馬券戦略アプリはそのプロセスを自動化し、最適な投資配分を提案します。"
              }
            },
            {
              "@type": "Question",
              "name": "期待値計算ツールはどのような馬券種類に対応していますか？",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "単勝、複勝、馬連、馬単、ワイド、三連複、三連単など、JRAの主要な馬券種類すべてに対応しています。馬券戦略ツールがレース状況に応じて期待値の高い馬券種類を選択し、組み合わせを提案します。"
              }
            },
            {
              "@type": "Question",
              "name": "期待値計算の基本的な数式は？",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "期待値 = オッズ × 的中確率 の数式で算出されます。例えば、オッズ10倍で的中確率が15%の馬券なら、期待値は 10 × 0.15 = 1.5 となります。期待値が1以上であれば理論上は長期的に利益が期待できる馬券と言えます。"
              }
            }
          ]
        })}
      </script>

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
            馬券戦略の使い方
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
          競馬ファンのための期待値計算に基づく馬券戦略ツールの使い方を紹介します。
          確率計算によって単勝・複勝率を算出し、オッズとの比較で期待値を計算。
          最適な馬券組み合わせを提案し、長期的な収益向上を目指します。
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="relative">
          <h2 className="text-2xl font-bold mb-6">期待値計算と馬券戦略ガイド</h2>
          <div className="space-y-4">
            <Card className="overflow-hidden bg-background/50 backdrop-blur-sm hover:bg-background/60 transition-all duration-300">
              <CardHeader className="relative pb-4">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-background/5 to-transparent opacity-30" />
                <CardTitle className="relative flex items-center gap-2 text-foreground">
                  <div className="bg-primary/10 p-2 rounded-full">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  Step 1: レースを選ぶ
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-foreground">
                <div className="space-y-3">
                  <p className="flex items-center gap-2 text-foreground">
                    <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">1</span>
                    レース一覧から期待値計算したいレースを選択
                  </p>
                  <p className="flex items-center gap-2 text-foreground">
                    <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">2</span>
                    レース検索から過去に開催されたレースも検索可能
                  </p>
                </div>
                <div className="mt-4 space-y-1.5 rounded-lg bg-secondary/30 p-3">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/50" />
                    レース一覧には当日のレース情報が表示されます
                  </p>
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/50" />
                    主要レースの期待値計算データを検索で見つけられます
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden bg-background/50 backdrop-blur-sm hover:bg-background/60 transition-all duration-300">
              <CardHeader className="relative pb-4">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-background/5 to-transparent opacity-30" />
                <CardTitle className="relative flex items-center gap-2 text-foreground">
                  <div className="bg-primary/10 p-2 rounded-full">
                    <Trophy className="h-5 w-5 text-primary" />
                  </div>
                  Step 2: 確率計算と予想値入力
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-foreground">
                <div className="space-y-3">
                  <p className="flex items-center gap-2 text-foreground">
                    <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">1</span>
                    単勝確率と複勝確率を入力（確率計算による期待値計算の基礎データ）
                  </p>
                  <p className="flex items-center gap-2 text-foreground">
                    <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">2</span>
                    投資金額とリスク許容度を設定して期待値を最適化
                  </p>
                </div>
                <div className="mt-4 rounded-lg bg-secondary/30 p-3">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/50" />
                    確率計算の精度が期待値計算の精度を左右します
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden bg-background/50 backdrop-blur-sm hover:bg-background/60 transition-all duration-300">
              <CardHeader className="relative pb-4">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-background/5 to-transparent opacity-30" />
                <CardTitle className="relative flex items-center gap-2 text-foreground">
                  <div className="bg-primary/10 p-2 rounded-full">
                    <Ticket className="h-5 w-5 text-primary" />
                  </div>
                  Step 3: 期待値に基づく戦略確認
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-foreground">
                <div className="space-y-3">
                  <p className="flex items-center gap-2 text-foreground">
                    <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">1</span>
                    期待値の高い馬券組み合わせを確認
                  </p>
                  <p className="flex items-center gap-2 text-foreground">
                    <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">2</span>
                    最適な資金配分を確認
                  </p>
                </div>
                <div className="mt-4 rounded-lg bg-secondary/30 p-3">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/50" />
                    プラスの期待値を持つ馬券が表示され、回収率向上につながります
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="hidden md:flex items-center gap-3 mt-12 text-muted-foreground">
            <div className="bg-primary/10 p-3 rounded-full">
              {theme === 'light' ? (
                <img 
                  src="/images/horseshoe-icon-light.webp" 
                  alt="競馬予想アプリのロゴ - 馬蹄アイコン" 
                  className="h-6 w-6"
                  width="24"
                  height="24"
                  loading="lazy"
                />
              ) : (
                <img 
                  src="/images/horseshoe-icon.webp" 
                  alt="競馬予想アプリのロゴ - 馬蹄アイコン" 
                  className="h-6 w-6"
                  width="24"
                  height="24"
                  loading="lazy"
                />
              )}
            </div>
            <div>
              <p className="font-semibold">馬券戦略</p>
              <p className="text-sm">期待値計算と確率計算で回収率アップを実現</p>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-6">期待値計算の仕組みと回収率向上のポイント</h2>
          <Card className="overflow-hidden bg-background/50 backdrop-blur-sm">
            <CardContent className="space-y-8 pt-6">
              <div className="space-y-12">
                <div className="group">
                  <div className="overflow-hidden rounded-lg border border-primary/10 transition-all duration-300 group-hover:border-primary/20">
                    <img 
                      src="/images/betting-generation.webp" 
                      alt="期待値計算プロセスの図解 - 確率とオッズから期待値を算出するフロー" 
                      className="w-full max-w-lg mx-auto dark:opacity-90 transition-transform duration-300 group-hover:scale-[1.02]"
                      width="512"
                      height="300"
                      loading="lazy"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mt-4 px-2">
                    確率計算を基に単勝、複勝など全ての券種について期待値と的中確率を計算し、プラスの期待値を持つ馬券を抽出します
                  </p>
                </div>

                <div className="group">
                  <div className="overflow-hidden rounded-lg border border-primary/10 transition-all duration-300 group-hover:border-primary/20">
                    <img 
                      src="/images/ai-analysis.webp" 
                      alt="期待値分析プロセスの図解 - 期待値に基づく最適な馬券組み合わせの分析" 
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
                      alt="期待値に基づく資金配分最適化の図解 - 期待値とリスクのバランスによる投資額決定方法" 
                      className="w-full max-w-lg mx-auto dark:opacity-90 transition-transform duration-300 group-hover:scale-[1.02]"
                      width="512"
                      height="300"
                      loading="lazy"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mt-4 px-2">
                    期待値とリスクのバランスを最適化し、長期的な回収率向上を目指した資金配分を決定します
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <div className="mt-16">
        <h2 className="text-2xl font-bold mb-6">期待値計算と確率計算に関するよくある質問</h2>
        <div className="space-y-6">
          <Card className="overflow-hidden bg-background/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-foreground">競馬初心者でも期待値計算は使えますか？</CardTitle>
            </CardHeader>
            <CardContent className="text-foreground">
              <p>はい、競馬初心者の方でも簡単に使えるよう設計されています。単勝確率と複勝確率を入力するだけで、馬券戦略が最適な馬券作成方法を提案します。期待値計算の詳細を理解する必要はなく、直感的に使えます。</p>
            </CardContent>
          </Card>
          
          <Card className="overflow-hidden bg-background/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-foreground">確率計算と期待値計算の違いは何ですか？</CardTitle>
            </CardHeader>
            <CardContent className="text-foreground">
              <p>確率計算は馬券的中の可能性（的中確率）を予測する作業です。一方、期待値計算はその確率とオッズから投資価値を算出するもので、(オッズ×的中確率)の式で表されます。馬券戦略では確率計算の精度が期待値計算の精度を左右する重要な要素となります。</p>
            </CardContent>
          </Card>
          
          <Card className="overflow-hidden bg-background/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-foreground">期待値計算で回収率を上げるコツはありますか？</CardTitle>
            </CardHeader>
            <CardContent className="text-foreground">
              <p>回収率向上のポイントは、正確な確率予想と適切な資金配分です。オッズと自分の予想確率の差を見つけ、期待値の高い馬券を選ぶことが重要です。馬券戦略アプリはそのプロセスを自動化し、最適な投資配分を提案します。</p>
            </CardContent>
          </Card>

          <Card className="overflow-hidden bg-background/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-foreground">期待値計算ツールはどのような馬券種類に対応していますか？</CardTitle>
            </CardHeader>
            <CardContent className="text-foreground">
              <p>単勝、複勝、馬連、馬単、ワイド、三連複、三連単など、JRAの主要な馬券種類すべてに対応しています。馬券戦略ツールがレース状況に応じて期待値の高い馬券種類を選択し、組み合わせを提案します。</p>
            </CardContent>
          </Card>

          <Card className="overflow-hidden bg-background/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-foreground">期待値計算の基本的な数式は？</CardTitle>
            </CardHeader>
            <CardContent className="text-foreground">
              <p>期待値 = オッズ × 的中確率 の数式で算出されます。例えば、オッズ10倍で的中確率が15%の馬券なら、期待値は 10 × 0.15 = 1.5 となります。期待値が1以上であれば理論上は長期的に利益が期待できる馬券と言えます。</p>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <div className="mt-16 text-center">
        <h2 className="text-2xl font-bold mb-4">確率計算と期待値計算ツールで競馬予想を始めましょう</h2>
        <p className="text-lg text-muted-foreground mb-6">
          期待値計算と確率計算に基づく馬券戦略で、効率的な競馬投資と回収率アップを実現しませんか？
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