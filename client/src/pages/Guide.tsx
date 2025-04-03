import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import MainLayout from "@/components/layout/MainLayout";
import { Ticket, Calendar, Coins, Trophy, ChevronRight, Info, Award, BarChart3, Calculator, X, Check, Lightbulb } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { useThemeStore } from "@/stores/themeStore";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Race } from "@db/schema";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { memo, useCallback, useMemo } from "react";

// レースカードコンポーネント
const RaceCard = memo(({ race, onClick }: { race: Race; onClick: () => void }) => {
  const { theme } = useThemeStore();
  
  // 日付のフォーマット
  const formattedDate = format(new Date(race.startTime), 'MM/dd(E)', { locale: ja });
  const formattedTime = format(new Date(race.startTime), 'HH:mm');

  // カードのスタイル
  const cardStyle = "cursor-pointer group relative overflow-hidden bg-background/70 backdrop-blur-sm border-primary/20 hover:bg-primary/5 transition-all duration-300 hover:translate-y-[-2px] hover:shadow-md rounded-lg";

  return (
    <Card 
      className={cardStyle}
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-bold text-sm text-foreground/90 group-hover:text-primary transition-colors duration-300">
              {race.name}
            </h3>
            <p className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
              <span>
                {formattedDate}
              </span>
              <span className="inline-flex items-center justify-center bg-primary/20 px-2 py-0.5 rounded-full text-primary text-xs font-medium">
                {formattedTime}
              </span>
            </p>
          </div>
          <div className="text-right">
            {race.status === 'done' && (
              <p className="text-xs font-medium text-foreground/80 bg-primary/10 inline-flex items-center justify-center px-2 py-0.5 rounded-full">
                発走済
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

// 今週のレースコンポーネント
const ThisWeekRaces = () => {
  const [_, setLocation] = useLocation();
  const { theme } = useThemeStore();

  // レースデータの取得
  const { data: races = [], isLoading, error } = useQuery<Race[]>({
    queryKey: ["/api/races"],
    staleTime: 60000, // 1分間キャッシュを有効に
  });

  // 直近のレースを取得する関数
  const getRecentRaces = useCallback((races: Race[]) => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    
    // 土日または開催中のレースを優先
    const upcomingRaces = races
      .filter(race => race.status !== 'done')
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    
    if (upcomingRaces.length > 0) {
      return upcomingRaces.slice(0, 5);
    }
    
    // 平日の場合は直近の週末または次の週末のレースを表示
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      // 直前または次の週末のレースを取得
      const lastWeekendRaces = races
        .filter(race => {
          const raceDate = new Date(race.startTime);
          const raceDayOfWeek = raceDate.getDay();
          // 土日のレースを取得
          return raceDayOfWeek === 0 || raceDayOfWeek === 6;
        })
        .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
      
      return lastWeekendRaces.slice(0, 5);
    }
    
    // デフォルトでは最新のレースを表示
    return races
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
      .slice(0, 5);
  }, []);

  // 表示するレースを取得
  const recentRaces = useMemo(() => {
    return getRecentRaces(races);
  }, [races, getRecentRaces]);

  // レースがクリックされたときのハンドラー
  const handleRaceClick = useCallback((raceId: string) => {
    setLocation(`/race/${raceId}`);
  }, [setLocation]);

  // ローディング中の表示
  if (isLoading) {
    return (
      <div className="space-y-2 py-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 rounded-lg bg-primary/5 animate-pulse"></div>
        ))}
      </div>
    );
  }

  // エラー時の表示
  if (error) {
    return (
      <div className="p-4 text-center">
        <p className="text-sm text-muted-foreground">レース情報を取得できませんでした</p>
      </div>
    );
  }

  // レースがない場合の表示
  if (recentRaces.length === 0) {
    return (
      <div className="p-4 text-center">
        <p className="text-sm text-muted-foreground">現在開催中のレースはありません</p>
        <Link to="/" className="text-xs text-primary mt-2 inline-block hover:underline">
          レース一覧を見る
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {recentRaces.map((race) => (
        <RaceCard
          key={race.id}
          race={race}
          onClick={() => handleRaceClick(race.id.toString())}
        />
      ))}
      
      <div className="pt-2 mt-2 border-t border-primary/10 text-center">
        <Link
          to="/"
          className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center justify-center gap-1"
        >
          <span>すべてのレースを見る</span>
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
};

export default function Guide() {
  const { theme } = useThemeStore();
  
  return (
    <MainLayout>
      <Helmet>
        <title>競馬の期待値計算と回収率アップガイド | 馬券戦略</title>
        <meta name="description" content="競馬の期待値計算を分かりやすく解説。単勝確率と複勝確率を予想して期待値の高い馬券を見つける方法や、期待値計算ツールの使い方を詳しく紹介。期待値思考で競馬の回収率アップを目指す人のための完全ガイド。" />
        <meta name="keywords" content="競馬 期待値,競馬 期待値計算,期待値計算,馬券,回収率,単勝確率,複勝確率,期待値ツール,競馬予想,馬券戦略" />
        <link rel="canonical" href="https://example.com/guide" />
        <meta property="og:title" content="競馬の期待値計算と回収率アップガイド | 馬券戦略" />
        <meta property="og:description" content="競馬の期待値計算を分かりやすく解説。単勝確率と複勝確率を予想して期待値の高い馬券を見つける方法や、期待値計算ツールの使い方を詳しく紹介。期待値思考で競馬の回収率アップを目指す人のための完全ガイド。" />
        <meta property="og:type" content="article" />
        <meta property="og:url" content="https://example.com/guide" />
        <meta property="og:image" content="https://example.com/images/guide-ogp.png" />
        <meta property="og:site_name" content="馬券戦略" />
        <meta name="twitter:card" content="summary_large_image" />
        
        {/* グリッドパターンのスタイルを追加 */}
        <style>
          {`
            .bg-grid-pattern {
              background-image: 
                linear-gradient(to right, rgba(100, 100, 100, 0.1) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(100, 100, 100, 0.1) 1px, transparent 1px);
              background-size: 20px 20px;
            }

            .section-highlight {
              position: relative;
              overflow: hidden;
            }

            .section-highlight::before {
              content: '';
              position: absolute;
              top: -10%;
              left: -10%;
              width: 120%;
              height: 120%;
              background: radial-gradient(circle at 50% 50%, rgba(var(--primary-rgb), 0.15), transparent 70%);
              z-index: -1;
            }
            
            /* シンプルなフェードインアニメーション */
            @keyframes fadeIn {
              from { opacity: 0; transform: translateY(10px); }
              to { opacity: 1; transform: translateY(0); }
            }
            
            .animate-fadeIn {
              animation: fadeIn 0.6s ease-out forwards;
            }
          `}
        </style>
      </Helmet>

      {/* WebSite構造化データ */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          "name": "馬券戦略",
          "alternateName": ["期待値計算ツール", "馬券作成アシスタント", "horse-stakes.com"],
          "url": "https://horse-stakes.com"
        })}
      </script>

      {/* WebApplication構造化データ */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          "name": "馬券戦略",
          "description": "競馬予想と馬券作成をサポートするAIアシスタント。回収率アップのための馬券戦略を立て、的中率と期待値を計算。",
          "applicationCategory": "UtilityApplication",
          "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "JPY"
          },
          "operatingSystem": "Web",
          "url": "https://horse-stakes.com",
          "featureList": [
            "最新レース情報の表示",
            "AIによる馬券戦略の提案",
            "期待値計算",
            "回収率最適化",
            "初心者向けガイド"
          ],
          "screenshot": "https://horse-stakes.com/images/horseshoe-icon2.webp",
          "browserRequirements": "JavaScriptを有効にしてください"
        })}
      </script>

      {/* Article構造化データ */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": "競馬の期待値計算と回収率アップガイド | 馬券戦略",
          "description": "競馬の期待値計算を分かりやすく解説。単勝確率と複勝確率を予想して期待値の高い馬券を見つける方法や、期待値計算ツールの使い方を詳しく紹介。期待値思考で競馬の回収率アップを目指す人のための完全ガイド。",
          "image": "https://horse-stakes.com/images/guide_header.webp",
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
              "name": "競馬の期待値計算とは何ですか？",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "競馬の期待値計算とは、オッズと的中確率から理論上の投資価値を算出する方法です。「期待値 = オッズ × 的中確率」の式で計算され、期待値が1以上なら理論上は利益が期待できます。"
              }
            },
            {
              "@type": "Question",
              "name": "競馬の期待値計算で本当に回収率は上がりますか？",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "はい、期待値計算を正しく活用することで長期的な回収率向上が期待できます。特に期待値1.4以上の馬券を狙うことで、予想の誤差を考慮しても利益につながりやすくなります。オッズと自分の予想確率の差を正確に見つけられれば、期待値の高い馬券を選択でき、長期的な競馬投資の回収率アップにつながります。"
              }
            },
            {
              "@type": "Question",
              "name": "単勝の期待値計算と複勝の期待値計算、どちらが重要ですか？",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "両方重要ですが、複勝の期待値計算は初心者向けに安定性があります。単勝の期待値計算はリターンが大きい反面、的中率が低くなります。理想的には、単勝確率と複勝確率の両方を予想し、それぞれの期待値を計算した上で、より期待値の高い方を選ぶ、あるいは両方に賭けることも戦略として有効です。"
              }
            },
            {
              "@type": "Question",
              "name": "競馬の期待値計算ツールはどのような馬券種類に対応していますか？",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "期待値計算ツールは、単勝、複勝、馬連、馬単、ワイド、三連複、三連単など、JRAの主要な馬券種類すべてに対応しています。単勝確率と複勝確率を入力するだけで、すべての券種について期待値計算を行い、最も期待値の高い馬券種類と組み合わせを自動的に抽出します。これにより効率的な馬券選択が可能になります。"
              }
            },
            {
              "@type": "Question",
              "name": "競馬で期待値が高い馬券を見つけるコツはありますか？",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "期待値の高い馬券を見つけるコツは、①人気になっていない実力馬を見つける（休み明け、斤量増など理由がある場合）、②血統と適性を重視する（特定の条件に適した血統背景を持つ人気薄の馬）、③馬場状態の変化に注目する（雨などによる変化はオッズに十分反映されないことが多い）。これらの要素を考慮した精度の高い勝率予想が期待値計算の基礎となります。"
              }
            },
            {
              "@type": "Question",
              "name": "競馬の期待値と回収率の関係を教えてください",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "期待値と回収率には密接な関係があります。期待値は理論上の投資価値を示す指標で、期待値1.0は理論的回収率100%、期待値1.5なら理論的回収率150%を意味します。ただし実際には予想精度も影響するため、プロの競馬予想家は「期待値1.4以上」を投資判断の目安としています。期待値の高い馬券に継続的に投資することで、長期的な回収率向上が期待できます。"
              }
            }
          ]
        })}
      </script>

      {/* このページ専用の余白調整 */}
      <div className="mt-6 sm:mt-8 md:mt-10"></div>

      {/* コンテンツをメインとサイドバーの2カラムレイアウトに変更 */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 px-4 sm:px-6">
        {/* メインコンテンツ - 最大幅を左側2/3に制限 */}
        <div className="lg:col-span-2">
          {/* ヘッダーセクション - 改善したデザイン */}
          <div className="relative overflow-hidden rounded-xl mb-10 shadow-md bg-gradient-to-br from-primary/5 to-primary/20 dark:from-primary/10 dark:to-primary/30">
            <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
            
            <div className="flex flex-col items-center p-6 md:p-8">
              <div className="w-full text-center mb-6 z-10">
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
                  競馬の期待値思考
                </h1>
                <p className="text-xl font-medium text-foreground/90 mb-4">
                  回収率アップの秘訣と実践方法
                </p>
                <p className="text-base md:text-lg text-foreground/80 max-w-2xl mx-auto">
                  オッズと予想確率から期待値を算出し、長期的な回収率向上を目指す方法を解説します。
                </p>
              </div>
              
              <div className="w-full relative">
                <div className="overflow-hidden rounded-lg shadow-lg">
                  <img 
                    src="/images/guide_header.webp" 
                    alt="競馬の期待値思考 - 回収率アップの秘訣" 
                    className="w-full h-auto object-cover"
                    width="800"
                    height="421"
                    loading="eager"
                    {...{ fetchpriority: "high" } as any}
                  />
                </div>
                <div className="absolute -bottom-3 -right-3 bg-primary/10 p-3 rounded-full backdrop-blur-sm border border-primary/20 shadow-md hidden md:block">
                  <Calculator className="h-8 w-8 text-primary" />
                </div>
              </div>
            </div>
          </div>

          {/* キーポイントセクション - 追加 */}
          <div className="mb-10">
            <div className="flex items-center mb-5">
              <Info className="h-5 w-5 mr-2 text-primary" />
              <h2 className="text-xl font-bold">このページでわかること</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-background/50 backdrop-blur-sm rounded-lg p-4 border border-primary/10 shadow-sm flex flex-col items-center text-center">
                <div className="bg-primary/10 p-3 rounded-full mb-3">
                  <Calculator className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-medium mb-2">期待値の理解</h3>
                <p className="text-sm text-foreground/70">オッズと予想確率から理論上の投資価値を数値化</p>
              </div>
              
              <div className="bg-background/50 backdrop-blur-sm rounded-lg p-4 border border-primary/10 shadow-sm flex flex-col items-center text-center">
                <div className="bg-primary/10 p-3 rounded-full mb-3">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-medium mb-2">確率予想のコツ</h3>
                <p className="text-sm text-foreground/70">客観的データから精度の高い勝率予想を導き出す方法</p>
              </div>
              
              <div className="bg-background/50 backdrop-blur-sm rounded-lg p-4 border border-primary/10 shadow-sm flex flex-col items-center text-center">
                <div className="bg-primary/10 p-3 rounded-full mb-3">
                  <Trophy className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-medium mb-2">実践テクニック</h3>
                <p className="text-sm text-foreground/70">期待値1.4以上の馬券を見つけ出す具体的な方法</p>
              </div>
            </div>
          </div>
        
          {/* 目次 - 折りたたみ可能 */}
          <div className="mb-10">
            <details className="group shadow-sm">
              <summary className="flex items-center justify-between p-4 rounded-t-lg bg-background/50 backdrop-blur-sm border border-primary/10 cursor-pointer">
                <div className="flex items-center">
                  <Info className="h-5 w-5 mr-2 text-primary" />
                  <h2 className="text-lg font-medium">目次</h2>
                </div>
                <div className="transition-transform duration-300 group-open:rotate-180">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </summary>
              <div className="p-4 pt-2 pl-6 rounded-b-lg bg-background/50 backdrop-blur-sm border border-t-0 border-primary/10">
                <ul className="space-y-3">
                  <li className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">1</span>
                    <a href="#what-is-ev" className="hover:text-primary transition-colors">競馬の期待値思考とは？ - 勝ち続ける人の思考法</a>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">2</span>
                    <a href="#ev-examples" className="hover:text-primary transition-colors">具体例で理解する期待値計算 - 買うべき馬券の見極め方</a>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">3</span>
                    <a href="#win-place-prob" className="hover:text-primary transition-colors">単勝確率・複勝確率の予想方法 - 精度を高めるテクニック</a>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">4</span>
                    <a href="#optimal-betting" className="hover:text-primary transition-colors">期待値に基づく最適な馬券構成 - 資金配分の秘訣</a>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">5</span>
                    <a href="#ev-tools" className="hover:text-primary transition-colors">当サイトの期待値計算ツールの使い方 - 実践ガイド</a>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">6</span>
                    <a href="#ev-training" className="hover:text-primary transition-colors">期待値計算プロの実践トレーニング - あなたの予想力を高める方法</a>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">7</span>
                    <a href="#faq" className="hover:text-primary transition-colors">期待値計算と確率計算に関するよくある質問</a>
                  </li>
                </ul>
              </div>
            </details>
          </div>

          <div id="what-is-ev" className="mb-16 scroll-mt-16 section-highlight animate-fadeIn">
            <div className="flex items-center mb-6">
              <div className="bg-primary/10 p-2.5 rounded-lg mr-3 shadow-sm">
                <Calculator className="h-6 w-6 text-primary" />
              </div>
              <div>
                <span className="text-sm font-medium text-primary/70 block">SECTION 01</span>
                <h2 className="text-2xl sm:text-3xl font-bold">競馬の期待値思考とは？</h2>
              </div>
            </div>

            <div className="space-y-8">
              {/* 1つ目のカード：なぜ「印」ではなく「確率」で予想するのか */}
              <Card className="overflow-hidden bg-background/50 backdrop-blur-sm border-primary/10 shadow-md">
                <CardHeader className="border-b border-primary/5 bg-primary/5">
                  <CardTitle className="text-foreground text-xl">なぜ「印」ではなく「確率」で予想するのか</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-5 rounded-lg bg-red-500/10 space-y-3 border border-red-500/20 shadow-sm">
                      <p className="font-semibold text-red-500 flex items-center gap-2">
                        <X className="h-4 w-4" />
                        従来の印予想の限界
                      </p>
                      <ul className="space-y-2.5 text-sm">
                        <li className="flex items-start gap-2">
                          <span className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center text-xs font-medium mt-0.5">×</span>
                          <span>◎○▲△の印だけでは馬券の「価値」がわからない</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center text-xs font-medium mt-0.5">×</span>
                          <span>オッズに対して買うべきかの判断材料にならない</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center text-xs font-medium mt-0.5">×</span>
                          <span>資金配分の最適化ができない</span>
                        </li>
                      </ul>
                    </div>
                    <div className="p-5 rounded-lg bg-green-500/10 space-y-3 border border-green-500/20 shadow-sm">
                      <p className="font-semibold text-green-500 flex items-center gap-2">
                        <Check className="h-4 w-4" />
                        確率予想の優位性
                      </p>
                      <ul className="space-y-2.5 text-sm">
                        <li className="flex items-start gap-2">
                          <span className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center text-xs font-medium mt-0.5">○</span>
                          <span>各馬の勝つ確率を数値化して明確に把握できる</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center text-xs font-medium mt-0.5">○</span>
                          <span>オッズと比較して投資価値（期待値）を計算できる</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center text-xs font-medium mt-0.5">○</span>
                          <span>資金配分を科学的に最適化できる</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                  
                  <p className="mb-5 text-lg leading-relaxed">
                    競馬で長期的に勝ち続けている人たちは、「この馬が好き」「調子が良さそう」といった曖昧な印象ではなく、<strong className="text-primary">「この馬が勝つ確率は何%か」「このオッズは割安か割高か」</strong>という<strong className="text-primary">期待値思考</strong>で馬券を選んでいます。
                  </p>
                  
                  <div className="p-6 rounded-xl bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 mb-5 border border-primary/20 shadow-sm">
                    <div className="flex items-center justify-center mb-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <Trophy className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-center mb-3">勝ち続ける競馬の原則</h3>
                    <p className="text-2xl font-bold text-center mb-4 text-primary/90">「期待値が高い馬券だけを選んで買う」</p>
                    <div className="bg-background/50 backdrop-blur-sm p-3 rounded-lg text-sm text-center">
                      期待値とは、理論上の平均回収率を示す指標。期待値1.5の馬券は長期的に平均150%の回収率が期待できる
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 2つ目のカード：競馬における期待値の定義と計算方法 */}
              <Card className="overflow-hidden bg-background/50 backdrop-blur-sm border-primary/10 shadow-md">
                <CardHeader className="border-b border-primary/5 bg-primary/5">
                  <CardTitle className="text-foreground text-xl">競馬における期待値の定義と計算方法</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <p className="mb-5 text-lg leading-relaxed">
                    <strong className="text-primary">期待値とは、賭けに対して理論上得られる平均的な利益率を表す指標</strong>です。競馬における期待値計算は、オッズと予想確率（的中確率）から算出され、「1」を超える場合は理論上長期的に利益が見込めることを意味します。
                  </p>
                  
                  <div className="p-6 rounded-xl bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 mb-6 border border-primary/20 shadow-sm">
                    <div className="flex items-center justify-center mb-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <Calculator className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-center mb-3">期待値の基本計算式</h3>
                    <p className="text-2xl font-bold text-center mb-4 text-primary/90">期待値 = オッズ × 的中確率</p>
                    <div className="bg-background/50 backdrop-blur-sm p-3 rounded-lg text-sm text-center">
                      例：オッズ10倍で的中確率15%の馬券の期待値は「10 × 0.15 = 1.5」となります
                    </div>
                  </div>
                  
                  <div className="mb-6 p-5 rounded-lg border border-foreground/10 bg-background/70 shadow-sm">
                    <h4 className="font-semibold mb-3 text-lg">期待値の見方：</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex flex-col items-center p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                        <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center mb-2">
                          <span className="text-green-500 font-bold">↑</span>
                        </div>
                        <p className="font-bold text-center mb-1">期待値 &gt; 1.0</p>
                        <p className="text-sm text-center">理論上は長期的に利益が出る馬券</p>
                      </div>
                      
                      <div className="flex flex-col items-center p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                        <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center mb-2">
                          <span className="text-yellow-500 font-bold">=</span>
                        </div>
                        <p className="font-bold text-center mb-1">期待値 = 1.0</p>
                        <p className="text-sm text-center">トントンになる馬券</p>
                      </div>
                      
                      <div className="flex flex-col items-center p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                        <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center mb-2">
                          <span className="text-red-500 font-bold">↓</span>
                        </div>
                        <p className="font-bold text-center mb-1">期待値 &lt; 1.0</p>
                        <p className="text-sm text-center">理論上は長期的に損失が出る馬券</p>
                      </div>
                    </div>
                  </div>
                  
                  <p className="mb-5 text-lg leading-relaxed">
                    競馬では主催者側の控除率（約25%）があるため、<strong className="text-primary">市場全体の期待値は0.75程度</strong>です。つまり、期待値1.0以上の馬券を見つけることができれば、理論上は他の競馬ファンより優位に立てることになります。
                  </p>

                  <div className="p-6 rounded-xl bg-gradient-to-br from-blue-500/5 via-blue-500/10 to-blue-500/5 border border-blue-500/20 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 rounded-full bg-blue-500/20">
                        <Award className="h-5 w-5 text-blue-500" />
                      </div>
                      <h4 className="text-lg font-medium text-blue-500/90">実質期待値の考え方</h4>
                    </div>
                    <p className="mb-3 text-sm leading-relaxed">予想には誤差がつきものなので、安全マージンを考慮した実質期待値が重要です。</p>
                    <div className="bg-background/50 backdrop-blur-sm p-4 rounded-lg border border-blue-500/10 text-center mb-2">
                      <p className="text-xl font-bold text-foreground mb-1">「買うべき馬券の期待値は余裕を持って1.4以上」</p>
                      <p className="text-sm text-foreground/80">プロの競馬予想家の多くが、この「期待値1.4の法則」を投資判断の目安としています</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 最後のTips */}
              <div className="p-5 rounded-xl bg-amber-500/5 border border-amber-500/20 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    <Lightbulb className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <h4 className="text-lg font-medium mb-2 text-amber-500/90">期待値計算のプロTips</h4>
                    <p className="text-sm leading-relaxed text-foreground/90">
                      プロの競馬予想家は「期待値1.4以上」を投資判断の基準にしています。これは予想誤差を考慮した安全マージンを含んだ数値です。初心者は期待値1.5以上を目安にすると、予想精度の誤差をカバーできるでしょう。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div id="ev-examples" className="mb-16 scroll-mt-16 section-highlight animate-fadeIn" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center mb-6">
              <div className="bg-primary/10 p-2.5 rounded-lg mr-3 shadow-sm">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <span className="text-sm font-medium text-primary/70 block">SECTION 02</span>
                <h2 className="text-2xl sm:text-3xl font-bold">具体例で理解する期待値計算</h2>
              </div>
            </div>

            <div className="space-y-6">
              <Card className="overflow-hidden bg-background/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-foreground">印予想と確率予想の比較</CardTitle>
                </CardHeader>
                <CardContent className="pt-1">
                  <p className="mb-4">
                    従来の印予想から確率予想への転換を、具体的なレース例で見てみましょう。
                  </p>
                  
                  <div className="overflow-x-auto mb-4">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-primary/10">
                          <th className="border border-primary/20 p-2 text-left">馬番</th>
                          <th className="border border-primary/20 p-2 text-left">馬名</th>
                          <th className="border border-primary/20 p-2 text-center">従来の印</th>
                          <th className="border border-primary/20 p-2 text-center">単勝オッズ</th>
                          <th className="border border-primary/20 p-2 text-center">予想勝率</th>
                          <th className="border border-primary/20 p-2 text-center">期待値</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-primary/20 p-2">1</td>
                          <td className="border border-primary/20 p-2">サンプル馬A</td>
                          <td className="border border-primary/20 p-2 text-center">◎</td>
                          <td className="border border-primary/20 p-2 text-center">2.0倍</td>
                          <td className="border border-primary/20 p-2 text-center">40%</td>
                          <td className="border border-primary/20 p-2 text-center">0.8</td>
                        </tr>
                        <tr className="bg-background/30">
                          <td className="border border-primary/20 p-2">2</td>
                          <td className="border border-primary/20 p-2">サンプル馬B</td>
                          <td className="border border-primary/20 p-2 text-center">○</td>
                          <td className="border border-primary/20 p-2 text-center">4.0倍</td>
                          <td className="border border-primary/20 p-2 text-center">22%</td>
                          <td className="border border-primary/20 p-2 text-center">0.88</td>
                        </tr>
                        <tr>
                          <td className="border border-primary/20 p-2">3</td>
                          <td className="border border-primary/20 p-2">サンプル馬C</td>
                          <td className="border border-primary/20 p-2 text-center">▲</td>
                          <td className="border border-primary/20 p-2 text-center">8.0倍</td>
                          <td className="border border-primary/20 p-2 text-center">15%</td>
                          <td className="border border-primary/20 p-2 text-center">1.2</td>
                        </tr>
                        <tr className="bg-background/30">
                          <td className="border border-primary/20 p-2">4</td>
                          <td className="border border-primary/20 p-2">サンプル馬D</td>
                          <td className="border border-primary/20 p-2 text-center">△</td>
                          <td className="border border-primary/20 p-2 text-center">15.0倍</td>
                          <td className="border border-primary/20 p-2 text-center">10%</td>
                          <td className="border border-primary/20 p-2 text-center">1.5</td>
                        </tr>
                        <tr>
                          <td className="border border-primary/20 p-2">5</td>
                          <td className="border border-primary/20 p-2">サンプル馬E</td>
                          <td className="border border-primary/20 p-2 text-center">-</td>
                          <td className="border border-primary/20 p-2 text-center">30.0倍</td>
                          <td className="border border-primary/20 p-2 text-center">5%</td>
                          <td className="border border-primary/20 p-2 text-center">1.5</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="p-4 rounded-lg bg-primary/5 mb-4">
                    <p className="font-semibold mb-2">【印予想と確率予想の違い】</p>
                    <p>印予想だけでは、本命の◎サンプル馬Aを買うことになりますが、期待値が0.8と低いため理論上は損失が出る馬券です。</p>
                    <p className="mt-2">確率予想では、期待値が1.5と最も高いサンプル馬Dとサンプル馬Eを買うべきだとわかります。</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="overflow-hidden bg-background/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-foreground">期待値による馬券選択の実践</CardTitle>
                </CardHeader>
                <CardContent className="pt-1">
                  <p className="mb-4">
                    単勝オッズ2倍の1番人気と単勝オッズ10倍の穴馬、どちらを買うべきか考えてみましょう。
                  </p>
                  
                  <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-background/50 border border-primary/20 space-y-2">
                      <p className="font-semibold text-center">単勝オッズ2.0倍の1番人気</p>
                      <div className="space-y-1">
                        <p className="flex justify-between">
                          <span>市場予想勝率：</span>
                          <span className="font-medium">50%</span>
                        </p>
                        <p className="flex justify-between">
                          <span>あなたの予想勝率：</span>
                          <span className="font-medium">40%</span>
                        </p>
                        <p className="flex justify-between text-lg font-bold border-t border-primary/20 pt-1 mt-1">
                          <span>期待値：</span>
                          <span className="text-red-500">0.8</span>
                        </p>
                      </div>
                    </div>
                    <div className="p-4 rounded-lg bg-background/50 border border-primary/20 space-y-2">
                      <p className="font-semibold text-center">単勝オッズ10.0倍の穴馬</p>
                      <div className="space-y-1">
                        <p className="flex justify-between">
                          <span>市場予想勝率：</span>
                          <span className="font-medium">10%</span>
                        </p>
                        <p className="flex justify-between">
                          <span>あなたの予想勝率：</span>
                          <span className="font-medium">15%</span>
                        </p>
                        <p className="flex justify-between text-lg font-bold border-t border-primary/20 pt-1 mt-1">
                          <span>期待値：</span>
                          <span className="text-green-500">1.5</span>
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <p className="mb-4">
                    <strong className="text-primary">市場の予想と自分の予想のギャップ</strong>が期待値を生み出します。上の例では、1番人気は市場が過大評価している（実際より勝率が高く見積もられている）のに対し、穴馬は市場が過小評価している（実際より勝率が低く見積もられている）ため、期待値が高くなっています。
                  </p>
                  
                  <div className="p-4 rounded-lg bg-primary/5 mb-4">
                    <p className="font-semibold mb-2">【実践での判断基準】</p>
                    <ul className="space-y-1">
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium mt-0.5">1</span>
                        <span>自分の予想勝率が市場予想（オッズから逆算）より高い馬を探す</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium mt-0.5">2</span>
                        <span>期待値1.4以上の馬券を優先的に購入する</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium mt-0.5">3</span>
                        <span>1つのレースで複数の馬券が期待値1.4以上なら、期待値が高い順に資金配分</span>
                      </li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div id="win-place-prob" className="mb-12 scroll-mt-16">
            <div className="flex items-center gap-2 mb-6">
              <div className="bg-primary/10 p-2 rounded-full">
                <Coins className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">3. 単勝確率・複勝確率の予想方法 - 精度を高めるテクニック</h2>
            </div>

            <div className="space-y-6">
              <Card className="overflow-hidden bg-background/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-foreground">単勝確率の予想方法</CardTitle>
                </CardHeader>
                <CardContent className="pt-1">
                  <p className="mb-4">
                    単勝確率の予想は、競馬で最もシンプルな予想方法です。以下の手順で予想してみましょう。
                  </p>
                  
                  <div className="p-4 rounded-lg bg-primary/5 mb-4">
                    <p className="font-semibold mb-2">【手順1：人気順に並べる】</p>
                    <p>まずは、各馬の人気順に並べてみます。人気が高い馬ほど勝つ確率が高いと考えられます。</p>
                  </div>
                  
                  <div className="p-4 rounded-lg bg-primary/5 mb-4">
                    <p className="font-semibold mb-2">【手順2：過去の結果を参考にする】</p>
                    <p>過去のレース結果を参考にして、人気順に並べた馬が実際に勝ったかどうかを確認します。</p>
                  </div>
                  
                  <div className="p-4 rounded-lg bg-primary/5 mb-4">
                    <p className="font-semibold mb-2">【手順3：確率を計算する】</p>
                    <p>人気順に並べた馬の勝率を計算します。例えば、1番人気の馬が10回中3回勝っている場合、その馬の単勝確率は30%となります。</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="overflow-hidden bg-background/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-foreground">複勝確率の予想方法</CardTitle>
                </CardHeader>
                <CardContent className="pt-1">
                  <p className="mb-4">
                    複勝確率の予想は、単勝確率と同様に人気順に並べて予想します。以下の手順で予想してみましょう。
                  </p>
                  
                  <div className="p-4 rounded-lg bg-primary/5 mb-4">
                    <p className="font-semibold mb-2">【手順1：人気順に並べる】</p>
                    <p>まずは、各馬の人気順に並べてみます。人気が高い馬ほど勝つ確率が高いと考えられます。</p>
                  </div>
                  
                  <div className="p-4 rounded-lg bg-primary/5 mb-4">
                    <p className="font-semibold mb-2">【手順2：過去の結果を参考にする】</p>
                    <p>過去のレース結果を参考にして、人気順に並べた馬が実際に勝ったかどうかを確認します。</p>
                  </div>
                  
                  <div className="p-4 rounded-lg bg-primary/5 mb-4">
                    <p className="font-semibold mb-2">【手順3：確率を計算する】</p>
                    <p>人気順に並べた馬の勝率を計算します。例えば、1番人気の馬が10回中3回勝っている場合、その馬の複勝確率は30%となります。</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div id="optimal-betting" className="mb-12 scroll-mt-16">
            <div className="flex items-center gap-2 mb-6">
              <div className="bg-primary/10 p-2 rounded-full">
                <Coins className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">4. 期待値に基づく最適な馬券構成 - 資金配分の秘訣</h2>
            </div>

            <div className="space-y-6">
              <Card className="overflow-hidden bg-background/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-foreground">期待値1.4の法則とリスク管理</CardTitle>
                </CardHeader>
                <CardContent className="pt-1">
                  <p className="mb-4">
                    プロの競馬予想家が重視する「期待値1.4の法則」について、より詳しく見ていきましょう。単に期待値が1.0を超えていればよいというわけではなく、予想誤差を考慮したマージンが重要です。
                  </p>
                  
                  <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-primary/5 space-y-2">
                      <p className="font-semibold text-center">理論と現実のギャップ</p>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-start gap-2">
                          <span className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium mt-0.5">!</span>
                          <span>確率予想には必ず誤差が伴う（±5〜10%程度）</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium mt-0.5">!</span>
                          <span>理論上の期待値1.0では誤差でマイナスになるリスクが大きい</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium mt-0.5">!</span>
                          <span>予想精度が上がっても完璧な予想は不可能</span>
                        </li>
                      </ul>
                    </div>
                    <div className="p-4 rounded-lg bg-primary/5 space-y-2">
                      <p className="font-semibold text-center">期待値1.4以上を選ぶ理由</p>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-start gap-2">
                          <span className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium mt-0.5">✓</span>
                          <span>予想誤差を吸収できる安全マージンを確保できる</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium mt-0.5">✓</span>
                          <span>長期的に見て回収率130%以上を目指せる水準</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium mt-0.5">✓</span>
                          <span>資金効率を考慮した最適な投資判断の基準</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                  
                  <div className="p-4 rounded-lg bg-primary/5 mb-4">
                    <p className="font-semibold mb-2">【期待値に応じたリスク管理の指針】</p>
                    <p className="mb-2">期待値別のリスク管理方法を理解することで、馬券投資の精度が高まります：</p>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2">
                        <span className="text-yellow-500 font-bold">▲</span>
                        <span><strong>期待値1.0〜1.4</strong>：小額投資か見送り（予想誤差を考慮するとリスクが高い）</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-500 font-bold">○</span>
                        <span><strong>期待値1.4〜1.7</strong>：標準的な投資額（一定のリスクはあるが投資価値あり）</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-500 font-bold">◎</span>
                        <span><strong>期待値1.7以上</strong>：積極的な投資（予想誤差を考慮しても高い回収が期待できる）</span>
                      </li>
                    </ul>
                  </div>
                  
                  <p>
                    期待値1.4以上の馬券を選ぶことで、確率予想の誤差があったとしても長期的には利益を出せる可能性が高まります。しかし、<strong className="text-primary">期待値の高い馬券が毎回見つかるわけではない</strong>ことを理解し、無理な投資は避けることも重要です。
                  </p>
                </CardContent>
              </Card>

              <Card className="overflow-hidden bg-background/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-foreground">資金配分の最適化戦略</CardTitle>
                </CardHeader>
                <CardContent className="pt-1">
                  <p className="mb-4">
                    期待値計算はどの馬券に投資すべきかを教えてくれますが、それぞれの馬券にいくら投資するかという資金配分も同じく重要です。効率的な資金配分で回収率を最大化する方法を見ていきましょう。
                  </p>
                  
                  <div className="p-4 rounded-lg bg-primary/5 mb-6">
                    <p className="font-semibold mb-2">【期待値別の最適投資額の目安】</p>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-primary/10">
                            <th className="border border-primary/20 p-2 text-left">期待値</th>
                            <th className="border border-primary/20 p-2 text-center">投資金額（%）</th>
                            <th className="border border-primary/20 p-2 text-center">理由</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="border border-primary/20 p-2">1.0〜1.2</td>
                            <td className="border border-primary/20 p-2 text-center">0〜1%</td>
                            <td className="border border-primary/20 p-2 text-sm">予想誤差を考慮すると実質的に期待値が1.0を下回るリスクが高い</td>
                          </tr>
                          <tr className="bg-background/30">
                            <td className="border border-primary/20 p-2">1.2〜1.4</td>
                            <td className="border border-primary/20 p-2 text-center">1〜3%</td>
                            <td className="border border-primary/20 p-2 text-sm">ややリスクがあるため、合計投資額を抑える</td>
                          </tr>
                          <tr>
                            <td className="border border-primary/20 p-2">1.4〜1.7</td>
                            <td className="border border-primary/20 p-2 text-center">3〜5%</td>
                            <td className="border border-primary/20 p-2 text-sm">標準的な投資価値があり、安定した回収が期待できる</td>
                          </tr>
                          <tr className="bg-background/30">
                            <td className="border border-primary/20 p-2">1.7〜2.0</td>
                            <td className="border border-primary/20 p-2 text-center">5〜8%</td>
                            <td className="border border-primary/20 p-2 text-sm">高い期待値で、予想誤差があっても利益が期待できる</td>
                          </tr>
                          <tr>
                            <td className="border border-primary/20 p-2">2.0以上</td>
                            <td className="border border-primary/20 p-2 text-center">8〜10%</td>
                            <td className="border border-primary/20 p-2 text-sm">非常に高い期待値で、積極的な投資が正当化される</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">※投資金額は競馬投資用の総資金に対する割合</p>
                  </div>
                  
                  <div className="mb-6">
                    <p className="font-semibold mb-2">複数の馬券種を組み合わせた分散投資：</p>
                    <p className="mb-3">
                      同じレースで複数の馬券種が高い期待値を示す場合は、期待値に応じた分散投資が効果的です。
                    </p>
                    <div className="p-4 rounded-lg bg-background/50 border border-primary/20">
                      <p className="font-medium mb-2">【例】あるレースで以下の馬券が高い期待値を示した場合</p>
                      <ul className="space-y-2 text-sm">
                        <li className="flex justify-between">
                          <span>・3番単勝（期待値1.8）</span>
                          <span className="font-medium">投資額：総資金の6%</span>
                        </li>
                        <li className="flex justify-between">
                          <span>・3-5馬連（期待値1.5）</span>
                          <span className="font-medium">投資額：総資金の4%</span>
                        </li>
                        <li className="flex justify-between">
                          <span>・3-5-7三連複（期待値1.4）</span>
                          <span className="font-medium">投資額：総資金の3%</span>
                        </li>
                        <li className="flex justify-between border-t border-primary/20 pt-1 mt-1">
                          <span>合計</span>
                          <span className="font-medium">総資金の13%</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                  
                  <p>
                    期待値による資金配分最適化の基本原則は「<strong className="text-primary">期待値が高いほど投資額を増やす</strong>」という単純なものですが、<strong className="text-primary">一つのレースに投資しすぎない</strong>という点も重要です。一般的に総資金の15〜20%を一つのレースに投資する上限とする方法がリスク管理として効果的です。
                  </p>
                </CardContent>
              </Card>

              <Card className="overflow-hidden bg-background/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-foreground">馬券種別の選択ガイド</CardTitle>
                </CardHeader>
                <CardContent className="pt-1">
                  <p className="mb-4">
                    単勝確率と複勝確率から各馬券種の期待値を計算できますが、どの馬券種が自分の予想スタイルに合っているかを知ることも重要です。
                  </p>
                  
                  <div className="space-y-4 mb-6">
                    <div className="p-3 bg-primary/5 rounded-lg">
                      <p className="font-semibold mb-1">単勝馬券の特徴</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="font-medium text-green-500">メリット：</p>
                          <ul className="space-y-1">
                            <li>・計算がシンプルで期待値が分かりやすい</li>
                            <li>・的中時の回収額が大きい</li>
                          </ul>
                        </div>
                        <div>
                          <p className="font-medium text-red-500">デメリット：</p>
                          <ul className="space-y-1">
                            <li>・的中率が低い</li>
                            <li>・連敗が続くとメンタル面で厳しい</li>
                          </ul>
                        </div>
                      </div>
                      <p className="text-xs mt-2">向いている人：予想精度に自信があり、高い回収を狙いたい人</p>
                    </div>
                    
                    <div className="p-3 bg-primary/5 rounded-lg">
                      <p className="font-semibold mb-1">複勝馬券の特徴</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="font-medium text-green-500">メリット：</p>
                          <ul className="space-y-1">
                            <li>・的中率が高く安定している</li>
                            <li>・初心者でも取り組みやすい</li>
                          </ul>
                        </div>
                        <div>
                          <p className="font-medium text-red-500">デメリット：</p>
                          <ul className="space-y-1">
                            <li>・オッズが低いため大きな回収は難しい</li>
                            <li>・人気馬の複勝は特に期待値が低いことが多い</li>
                          </ul>
                        </div>
                      </div>
                      <p className="text-xs mt-2">向いている人：安定性を重視する人、資金が少ない人</p>
                    </div>
                    
                    <div className="p-3 bg-primary/5 rounded-lg">
                      <p className="font-semibold mb-1">馬連・ワイドの特徴</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="font-medium text-green-500">メリット：</p>
                          <ul className="space-y-1">
                            <li>・単勝より的中率が上がる</li>
                            <li>・人気と穴馬の組み合わせで高配当も</li>
                          </ul>
                        </div>
                        <div>
                          <p className="font-medium text-red-500">デメリット：</p>
                          <ul className="space-y-1">
                            <li>・2頭の予想精度が必要</li>
                            <li>・期待値計算がやや複雑</li>
                          </ul>
                        </div>
                      </div>
                      <p className="text-xs mt-2">向いている人：バランス重視の人、上位数頭の力関係を把握できる人</p>
                    </div>
                    
                    <div className="p-3 bg-primary/5 rounded-lg">
                      <p className="font-semibold mb-1">三連複・三連単の特徴</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="font-medium text-green-500">メリット：</p>
                          <ul className="space-y-1">
                            <li>・高配当が期待できる</li>
                            <li>・少額で大きなリターンを狙える</li>
                          </ul>
                        </div>
                        <div>
                          <p className="font-medium text-red-500">デメリット：</p>
                          <ul className="space-y-1">
                            <li>・的中率が極めて低い</li>
                            <li>・期待値計算が最も複雑</li>
                          </ul>
                        </div>
                      </div>
                      <p className="text-xs mt-2">向いている人：ハイリスク・ハイリターンを好む人、レース全体を読み解ける上級者</p>
                    </div>
                  </div>
                  
                  <p>
                    馬券種の選択は予想スタイルや性格によって異なりますが、期待値計算ツールを使えば、<strong className="text-primary">あなたの予想からどの馬券種が最も期待値が高いか</strong>を自動的に判断できます。初心者は単勝・複勝から始め、徐々に馬連・三連系に挑戦するのがおすすめです。
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          <div id="ev-tools" className="mb-12 scroll-mt-16">
            <div className="flex items-center gap-2 mb-6">
              <div className="bg-primary/10 p-2 rounded-full">
                <Ticket className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">5. 期待値計算ツールの使い方 - 的中率アップを実現する手順</h2>
            </div>

            <div className="space-y-6">
              <Card className="overflow-hidden bg-background/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-foreground">期待値計算の基本ステップ</CardTitle>
                </CardHeader>
                <CardContent className="pt-1">
                  <p className="mb-4">
                    当サイトの期待値計算ツールを使えば、複雑な計算をすることなく各馬券の期待値を簡単に求めることができます。基本的な使い方のステップを見ていきましょう。
                  </p>
                  
                  <div className="p-4 bg-primary/5 rounded-lg mb-6">
                    <p className="font-semibold mb-3">ツールの使用手順：</p>
                    <ol className="list-decimal list-inside space-y-2">
                      <li className="pl-2">
                        <span className="font-medium">レース情報の確認</span>
                        <p className="text-sm pl-6 mt-1">JRAや地方競馬のオッズ情報をチェックし、レース情報を把握します。</p>
                      </li>
                      <li className="pl-2">
                        <span className="font-medium">各馬の単勝確率の予想</span>
                        <p className="text-sm pl-6 mt-1">自分の予想に基づいて、各馬の勝つ確率を予想します（合計で100%になるよう調整）。</p>
                      </li>
                      <li className="pl-2">
                        <span className="font-medium">ツールへの入力</span>
                        <p className="text-sm pl-6 mt-1">予想した確率とJRA発表のオッズを入力します。</p>
                      </li>
                      <li className="pl-2">
                        <span className="font-medium">期待値の計算実行</span>
                        <p className="text-sm pl-6 mt-1">「計算する」ボタンをクリックして結果を表示します。</p>
                      </li>
                      <li className="pl-2">
                        <span className="font-medium">結果の分析と馬券選択</span>
                        <p className="text-sm pl-6 mt-1">期待値が1.4以上の馬券を中心に投資判断を行います。</p>
                      </li>
                    </ol>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="border border-primary/20 p-4 rounded-lg">
                      <p className="font-semibold mb-2">入力例：Aレースの場合</p>
                      <div className="space-y-2 text-sm">
                        <div className="grid grid-cols-3 gap-2">
                          <span className="font-medium">馬番</span>
                          <span className="font-medium">単勝オッズ</span>
                          <span className="font-medium">予想確率</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <span>1番</span>
                          <span>2.5倍</span>
                          <span>30%</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <span>2番</span>
                          <span>4.0倍</span>
                          <span>25%</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <span>3番</span>
                          <span>8.0倍</span>
                          <span>20%</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <span>4番</span>
                          <span>15.0倍</span>
                          <span>10%</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <span>5番</span>
                          <span>30.0倍</span>
                          <span>15%</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="border border-primary/20 p-4 rounded-lg">
                      <p className="font-semibold mb-2">計算結果例：</p>
                      <div className="space-y-2 text-sm">
                        <div className="grid grid-cols-3 gap-2">
                          <span className="font-medium">馬番</span>
                          <span className="font-medium">単勝オッズ</span>
                          <span className="font-medium">期待値</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <span>1番</span>
                          <span>2.5倍</span>
                          <span className="text-red-500">0.75</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <span>2番</span>
                          <span>4.0倍</span>
                          <span className="text-red-500">1.0</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <span>3番</span>
                          <span>8.0倍</span>
                          <span className="text-yellow-500">1.6</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <span>4番</span>
                          <span>15.0倍</span>
                          <span className="text-red-500">1.5</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <span>5番</span>
                          <span>30.0倍</span>
                          <span className="text-green-500">4.5</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">※この例では3番と5番の単勝に投資価値あり</p>
                    </div>
                  </div>
                  
                  <p>
                    上記の例では、市場の評価（オッズ）と比較して自分の予想確率が大きく異なる馬、特に5番馬に大きな期待値があることがわかります。このように期待値計算ツールは、<strong className="text-primary">どの馬券に投資すべきか</strong>を客観的に判断する手助けとなります。
                  </p>
                </CardContent>
              </Card>

              <Card className="overflow-hidden bg-background/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-foreground">複合的な馬券種の期待値計算</CardTitle>
                </CardHeader>
                <CardContent className="pt-1">
                  <p className="mb-4">
                    当サイトの期待値計算ツールでは、単勝だけでなく馬連、三連複などの複合的な馬券種の期待値も計算できます。その使い方と注意点を解説します。
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <p className="font-semibold mb-2">馬連の期待値計算</p>
                      <div className="p-3 bg-primary/5 rounded-lg space-y-2 text-sm">
                        <p className="font-medium">入力必要情報：</p>
                        <ul className="space-y-1">
                          <li>・各馬の単勝確率</li>
                          <li>・馬連のオッズ表</li>
                        </ul>
                        <p className="font-medium mt-2">計算の考え方：</p>
                        <p>馬連の的中確率 = A馬の勝率 × B馬の(2着以内率)</p>
                        <p className="text-xs text-muted-foreground mt-1">※実際のツールでは自動計算されます</p>
                      </div>
                    </div>
                    
                    <div>
                      <p className="font-semibold mb-2">三連複の期待値計算</p>
                      <div className="p-3 bg-primary/5 rounded-lg space-y-2 text-sm">
                        <p className="font-medium">入力必要情報：</p>
                        <ul className="space-y-1">
                          <li>・各馬の単勝確率</li>
                          <li>・各馬の複勝確率(上位3着以内率)</li>
                          <li>・三連複のオッズ</li>
                        </ul>
                        <p className="font-medium mt-2">注意点：</p>
                        <p>三連複は組み合わせが多く、全体の確率計算が複雑ですが、ツールが自動的に最適な組み合わせを提案します。</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-primary/5 rounded-lg mb-6">
                    <p className="font-semibold mb-2">利用時の注意点：</p>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2">
                        <span className="text-primary font-bold">●</span>
                        <span><strong>確率の入力精度</strong>：入力する確率の精度が期待値計算の精度に直結します。特に初心者は予想の精度を上げることに注力しましょう。</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary font-bold">●</span>
                        <span><strong>確率の合計</strong>：すべての馬の確率合計は100%になるように調整してください。ツールには自動調整機能もあります。</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary font-bold">●</span>
                        <span><strong>時間経過とオッズ変動</strong>：投票が進むとオッズは変動します。投票締め切り間際に最終確認することをおすすめします。</span>
                      </li>
                    </ul>
                  </div>
                  
                  <p>
                    期待値計算ツールは「買うべき馬券」を見つけるための強力な武器ですが、<strong className="text-primary">あくまで入力する確率予想の精度に依存している</strong>ことを忘れないでください。ツールの使い方に慣れると同時に、確率予想の精度を高めていくことが長期的な勝利への道となります。
                  </p>
                </CardContent>
              </Card>

              <Card className="overflow-hidden bg-background/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-foreground">期待値計算の高度な活用法</CardTitle>
                </CardHeader>
                <CardContent className="pt-1">
                  <p className="mb-4">
                    期待値計算ツールを使いこなせるようになったら、より高度な活用法を試してみましょう。期待値思考を取り入れた馬券戦略をさらに発展させるアプローチを紹介します。
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="p-4 rounded-lg bg-primary/5 space-y-2">
                      <p className="font-semibold">感度分析による確率検証</p>
                      <p className="text-sm">
                        予想した確率を±5%程度変動させたときの期待値の変化を確認します。期待値が大きく変動しない馬券は、予想誤差に対して堅牢で信頼性が高いと言えます。
                      </p>
                      <div className="mt-2 p-2 bg-background/50 rounded text-xs">
                        <p className="font-medium">例：5番馬の確率を15%→10%に下げても期待値が3.0を維持するなら、予想誤差に強い投資先と判断できる</p>
                      </div>
                    </div>
                    
                    <div className="p-4 rounded-lg bg-primary/5 space-y-2">
                      <p className="font-semibold">複数パターンの予想比較</p>
                      <p className="text-sm">
                        レース展開の異なる複数のシナリオを想定し、各シナリオでの確率予想と期待値計算を行います。複数のシナリオで高い期待値を維持する馬券は特に価値が高いと言えます。
                      </p>
                      <div className="mt-2 p-2 bg-background/50 rounded text-xs">
                        <p className="font-medium">例：逃げ馬が成功するパターンと後方から差す展開の両方で期待値計算を行い、共通して高い期待値を示す馬券を選ぶ</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-6">
                    <p className="font-semibold mb-2">進化する確率予想力：</p>
                    <p className="mb-3">
                      ツールを継続的に使うことで、あなたの確率予想の精度を検証・改善することができます。
                    </p>
                    <div className="p-4 rounded-lg bg-primary/5 space-y-2">
                      <p className="font-medium">【確率予想力向上のステップ】</p>
                      <ol className="list-decimal list-inside space-y-2 text-sm">
                        <li>
                          <span className="font-medium">予想記録のデータベース化</span>
                          <p className="pl-6 mt-1">各レースで予想した確率と実際の結果を記録し、予想的中率を分析します。</p>
                        </li>
                        <li>
                          <span className="font-medium">誤差パターンの特定</span>
                          <p className="pl-6 mt-1">どのようなタイプの馬や展開で予想が外れやすいか、傾向を分析します。</p>
                        </li>
                        <li>
                          <span className="font-medium">予想モデルの調整</span>
                          <p className="pl-6 mt-1">分析結果に基づいて予想方法を継続的に改善・調整します。</p>
                        </li>
                        <li>
                          <span className="font-medium">確率帯域別の精度確認</span>
                          <p className="pl-6 mt-1">「30%と予想した馬は実際に何%の確率で勝っているか」などを検証します。</p>
                        </li>
                      </ol>
                    </div>
                  </div>
                  
                  <p>
                    期待値計算ツールは、単に期待値を計算するだけでなく、<strong className="text-primary">あなたの予想スキルを向上させるための学習ツール</strong>としても活用できます。自分の予想の傾向や精度を客観的に振り返り、継続的に改善していくことで、競馬予想の精度と回収率を段階的に高めていくことが可能になります。
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          <div id="ev-training" className="mb-12 scroll-mt-16">
            <div className="flex items-center gap-2 mb-6">
              <div className="bg-primary/10 p-2 rounded-full">
                <Trophy className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">6. 期待値計算プロの実践トレーニング - あなたの予想力を高める方法</h2>
            </div>

            <div className="space-y-6">
              <Card className="overflow-hidden bg-background/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-foreground">初心者向け確率予想トレーニング</CardTitle>
                </CardHeader>
                <CardContent className="pt-1">
                  <p className="mb-4">
                    期待値計算の精度は確率予想の精度に左右されます。競馬予想の初心者が確率予想力を高めるためのトレーニング方法を紹介します。
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="p-4 rounded-lg bg-primary/5 space-y-2">
                      <p className="font-semibold">実践トレーニング①：人気順予想からの脱却</p>
                      <div className="space-y-2 text-sm">
                        <p className="font-medium">トレーニング内容：</p>
                        <ol className="list-decimal list-inside space-y-1">
                          <li>特定のレースで単純に人気順に1着〜3着を予想する</li>
                          <li>同じレースを血統、脚質、調子などの要素で分析</li>
                          <li>分析に基づいて各馬の勝率を予想（合計100%）</li>
                          <li>レース結果と照らし合わせて予想精度を検証</li>
                        </ol>
                        <p className="mt-2 text-xs">目標：オッズから受ける印象と実際の能力評価を区別する力を養う</p>
                      </div>
                    </div>
                    
                    <div className="p-4 rounded-lg bg-primary/5 space-y-2">
                      <p className="font-semibold">実践トレーニング②：パドック観察力の向上</p>
                      <div className="space-y-2 text-sm">
                        <p className="font-medium">トレーニング内容：</p>
                        <ol className="list-decimal list-inside space-y-1">
                          <li>レース前のパドック映像を観察（中継やYouTube）</li>
                          <li>馬の状態について具体的なメモを取る</li>
                          <li>良い状態と思われる馬に高い確率を予想</li>
                          <li>レース結果と照合して観察力を向上</li>
                        </ol>
                        <p className="mt-2 text-xs">目標：馬の状態から勝率を判断する力を養い、予想精度を高める</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 rounded-lg bg-primary/5 mb-6">
                    <p className="font-semibold mb-2">予想精度検証のためのフィードバックシート例：</p>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-primary/10">
                            <th className="border border-primary/20 p-2">レース名</th>
                            <th className="border border-primary/20 p-2">予想した勝率</th>
                            <th className="border border-primary/20 p-2">実際の結果</th>
                            <th className="border border-primary/20 p-2">分析（改善点）</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="border border-primary/20 p-2">東京5R</td>
                            <td className="border border-primary/20 p-2">3番：40%<br/>1番：30%<br/>5番：15%</td>
                            <td className="border border-primary/20 p-2">1着：1番<br/>2着：7番<br/>3着：3番</td>
                            <td className="border border-primary/20 p-2 text-sm">3番馬の評価が高すぎた。<br/>7番馬の評価が低すぎた。</td>
                          </tr>
                          <tr className="bg-background/30">
                            <td className="border border-primary/20 p-2">阪神3R</td>
                            <td className="border border-primary/20 p-2">2番：35%<br/>4番：25%<br/>6番：20%</td>
                            <td className="border border-primary/20 p-2">1着：2番<br/>2着：6番<br/>3着：1番</td>
                            <td className="border border-primary/20 p-2 text-sm">上位評価は良かった。<br/>1番馬の評価漏れ。</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">※予想と結果を記録することで、自分の予想傾向や弱点を把握できます</p>
                  </div>
                  
                  <p>
                    初心者は「すべての馬を評価対象とする」ことから始め、徐々に「<strong className="text-primary">消去法</strong>」で馬を絞り込む技術を身につけていくのが効果的です。また、最初は3〜5頭程度の少頭数レースから始めて、徐々に複雑なレースに挑戦していくことをおすすめします。
                  </p>
                </CardContent>
              </Card>

              <Card className="overflow-hidden bg-background/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-foreground">中級者向け確率予想精度向上法</CardTitle>
                </CardHeader>
                <CardContent className="pt-1">
                  <p className="mb-4">
                    ある程度確率予想に慣れてきたら、より高度な分析手法を取り入れてみましょう。中級者向けのトレーニング法を紹介します。
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="p-4 rounded-lg bg-primary/5 space-y-2">
                      <p className="font-semibold">要素別スコアリング法</p>
                      <div className="space-y-2 text-sm">
                        <p>各馬を以下の要素で10点満点で評価し、合計点から確率を算出する方法：</p>
                        <ul className="space-y-1">
                          <li>・適正距離：0〜10点</li>
                          <li>・適正馬場：0〜10点</li>
                          <li>・近走の調子：0〜10点</li>
                          <li>・騎手の相性：0〜10点</li>
                          <li>・脚質と枠順：0〜10点</li>
                        </ul>
                        <p className="mt-1">各馬の合計点を出して、全体に占める割合を確率とします。</p>
                      </div>
                    </div>
                    
                    <div className="p-4 rounded-lg bg-primary/5 space-y-2">
                      <p className="font-semibold">レース展開シミュレーション法</p>
                      <div className="space-y-2 text-sm">
                        <p>レースの流れを複数パターン想定し、各パターンの発生確率と馬の好走確率を掛け合わせる方法：</p>
                        <ol className="list-decimal list-inside space-y-1">
                          <li>ハイペース想定：30%の確率で発生</li>
                          <li>ミドルペース想定：50%の確率で発生</li>
                          <li>スローペース想定：20%の確率で発生</li>
                        </ol>
                        <p className="mt-1">各パターンでの馬の好走確率を評価し、加重平均で総合確率を算出します。</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 rounded-lg bg-primary/5 mb-6">
                    <p className="font-semibold mb-2">確率予想の精度を高めるための5つの視点：</p>
                    <ol className="list-decimal list-inside space-y-2">
                      <li className="pl-2">
                        <span className="font-medium">時計・ラップ分析の徹底</span>
                        <p className="text-sm pl-6 mt-1">単純な上がり3Fだけでなく、前半〜中盤のラップタイムも分析し、レース全体を通した実力を評価します。</p>
                      </li>
                      <li className="pl-2">
                        <span className="font-medium">血統と適性の相関関係の理解</span>
                        <p className="text-sm pl-6 mt-1">父系・母系の特徴を学び、距離・馬場・季節などの適性をより正確に判断します。</p>
                      </li>
                      <li className="pl-2">
                        <span className="font-medium">厩舎の調教パターンを知る</span>
                        <p className="text-sm pl-6 mt-1">厩舎ごとの調教パターンや仕上がり傾向を把握することで、馬の状態をより正確に判断できます。</p>
                      </li>
                      <li className="pl-2">
                        <span className="font-medium">条件変更の影響を数値化</span>
                        <p className="text-sm pl-6 mt-1">斤量増減、距離変更、馬場変化などが各馬に与える影響を具体的な数値（確率補正値）で評価します。</p>
                      </li>
                      <li className="pl-2">
                        <span className="font-medium">データベースからのパターン抽出</span>
                        <p className="text-sm pl-6 mt-1">過去の類似レースのデータを分析し、勝ち馬のパターンを見つけて現在のレースに応用します。</p>
                      </li>
                    </ol>
                  </div>
                  
                  <p>
                    中級者は、自分なりの予想システムを確立することが重要です。どの要素をどれだけ重視するかを明確にし、<strong className="text-primary">再現性のある予想方法</strong>を身につけましょう。また、予想と結果の検証を繰り返すことで、自分の予想の弱点を把握し、継続的に改善していくことが精度向上につながります。
                  </p>
                </CardContent>
              </Card>

              <Card className="overflow-hidden bg-background/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-foreground">上級者の期待値思考実践法</CardTitle>
                </CardHeader>
                <CardContent className="pt-1">
                  <p className="mb-4">
                    確率予想の精度が高まったら、より高度な期待値思考を実践してみましょう。上級者向けのアプローチを紹介します。
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="p-4 rounded-lg bg-primary/5 space-y-2">
                      <p className="font-semibold">市場の評価と自己評価の乖離分析</p>
                      <div className="space-y-2 text-sm">
                        <p>市場（他の参加者）の評価と自分の評価の差を徹底的に分析して投資機会を見つける方法：</p>
                        <ul className="space-y-1">
                          <li>・オッズ変動の分析（投票状況の把握）</li>
                          <li>・メディア予想との比較</li>
                          <li>・SNSでの人気度チェック</li>
                          <li>・特定条件での市場の過小評価パターンの発見</li>
                        </ul>
                        <p className="mt-1">乖離が大きく、自分の予想に自信がある場合に集中投資します。</p>
                      </div>
                    </div>
                    
                    <div className="p-4 rounded-lg bg-primary/5 space-y-2">
                      <p className="font-semibold">ポートフォリオ管理手法の応用</p>
                      <div className="space-y-2 text-sm">
                        <p>期待値の高い馬券を複数のレースにわたって組み合わせ、リスク分散と資金効率を最適化する方法：</p>
                        <ul className="space-y-1">
                          <li>・期待値とリスク（分散）を考慮した資産配分</li>
                          <li>・相関の低い馬券種の組み合わせ</li>
                          <li>・異なる展開パターンへの分散投資</li>
                          <li>・長期的な投資リターンの最大化</li>
                        </ul>
                        <p className="mt-1">金融工学の手法を競馬投資に応用します。</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 rounded-lg bg-primary/5 mb-6">
                    <p className="font-semibold mb-2">期待値最大化のための実践テクニック：</p>
                    <div className="space-y-4">
                      <div>
                        <p className="font-medium">①オッズの動向を読み、最適なタイミングで投票する</p>
                        <p className="text-sm">レース間際のオッズ変動パターンを分析し、最も有利なタイミングで馬券を購入します。人気馬は発走直前にオッズが下がることが多いため、早めに購入。人気薄の馬は直前に見直されてオッズが下がることがあるため、様子を見て購入するなど、戦略的に対応します。</p>
                      </div>
                      <div>
                        <p className="font-medium">②複数の馬券種を組み合わせたヘッジ戦略</p>
                        <p className="text-sm">単勝と馬連など異なる馬券種を組み合わせてリスクをヘッジし、複数のシナリオで回収できる構成を作ります。例えば、期待値の高い単勝を軸として購入しつつ、その馬が負けた場合のリスクヘッジとして、他の組み合わせの馬連や三連複も購入することで、回収の安定性を高めます。</p>
                      </div>
                      <div>
                        <p className="font-medium">③期待値アービトラージの実践</p>
                        <p className="text-sm">同一のレースで複数の馬券種間に期待値の不整合が生じることがあります。例えば単勝オッズと馬連オッズの関係性に矛盾がある場合など、こうした状況を見つけて効率的に資金を分配します。これはマーケットの非効率性を利用した高度な戦略です。</p>
                      </div>
                    </div>
                  </div>
                  
                  <p>
                    上級者にとっての最終目標は、<strong className="text-primary">予想の精度を高めること</strong>と<strong className="text-primary">資金管理の最適化</strong>の両方を達成することです。感情に左右されない冷静な判断と、データに基づく客観的な分析を組み合わせることで、競馬を「趣味」から「投資」へと昇華させることができます。期待値思考を徹底し、長期的な視点で競馬に取り組みましょう。
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          <div id="faq" className="mb-12 scroll-mt-16">
            <div className="flex items-center gap-2 mb-6">
              <div className="bg-primary/10 p-2 rounded-full">
                <Info className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">7. 期待値計算と確率計算に関するよくある質問</h2>
            </div>
            <div className="space-y-6">
              <Card className="overflow-hidden bg-background/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-foreground">①競馬の期待値計算とは何ですか？</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>競馬の期待値計算とは、オッズと予想勝率から理論上の投資価値を算出する方法です。「期待値 = オッズ × 的中確率」の式で計算され、期待値が1以上なら理論上は利益が期待できます。</p>
                </CardContent>
              </Card>
              <Card className="overflow-hidden bg-background/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-foreground">②競馬の期待値計算で本当に回収率は上がりますか？</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>はい、期待値計算を正しく活用することで長期的な回収率向上が期待できます。特に期待値1.4以上の馬券を狙うことで、予想の誤差を考慮しても利益につながりやすくなります。オッズと自分の予想確率の差を正確に見つけられれば、期待値の高い馬券を選択でき、長期的な競馬投資の回収率アップにつながります。</p>
                </CardContent>
              </Card>
              <Card className="overflow-hidden bg-background/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-foreground">③単勝の期待値計算と複勝の期待値計算、どちらが重要ですか？</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>両方重要ですが、複勝の期待値計算は初心者向けに安定性があります。単勝の期待値計算はリターンが大きい反面、的中率が低くなります。理想的には、単勝確率と複勝確率の両方を予想し、それぞれの期待値を計算した上で、より期待値の高い方を選ぶ、あるいは両方に賭けることも戦略として有効です。</p>
                </CardContent>
              </Card>
              <Card className="overflow-hidden bg-background/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-foreground">④競馬の期待値計算ツールはどのような馬券種類に対応していますか？</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>期待値計算ツールは、単勝、複勝、馬連、馬単、ワイド、三連複、三連単など、JRAの主要な馬券種類すべてに対応しています。単勝確率と複勝確率を入力するだけで、すべての券種について期待値計算を行い、最も期待値の高い馬券種類と組み合わせを自動的に抽出します。これにより効率的な馬券選択が可能になります。</p>
                </CardContent>
              </Card>
              <Card className="overflow-hidden bg-background/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-foreground">⑤競馬で期待値が高い馬券を見つけるコツはありますか？</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>期待値の高い馬券を見つけるコツは、①人気になっていない実力馬を見つける（休み明け、斤量増など理由がある場合）、②血統と適性を重視する（特定の条件に適した血統背景を持つ人気薄の馬）、③馬場状態の変化に注目する（雨などによる変化はオッズに十分反映されないことが多い）。これらの要素を考慮した精度の高い勝率予想が期待値計算の基礎となります。</p>
                </CardContent>
              </Card>
              <Card className="overflow-hidden bg-background/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-foreground">⑥競馬の期待値と回収率の関係を教えてください</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>期待値と回収率には密接な関係があります。期待値は理論上の投資価値を示す指標で、期待値1.0は理論的回収率100%、期待値1.5なら理論的回収率150%を意味します。ただし実際には予想精度も影響するため、プロの競馬予想家は「期待値1.4以上」を投資判断の目安としています。期待値の高い馬券に継続的に投資することで、長期的な回収率向上が期待できます。</p>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="mt-16 text-center">
            <h2 className="text-2xl font-bold mb-4">期待値思考で競馬を投資に変える - あなたの回収率アップを実現</h2>
            <p className="text-lg text-muted-foreground mb-6">
              期待値計算と確率予想に基づく馬券戦略で、効率的な競馬投資と長期的な回収率アップを実現しませんか？
              このサイトの期待値計算ツールを活用して、あなたの競馬予想を次のレベルに引き上げましょう。
            </p>
            <Link 
              to="/" 
              className="inline-flex items-center justify-center rounded-md bg-primary px-8 py-3 text-lg font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
            >
              期待値計算ツールを使ってみる
            </Link>
          </div>
        </div>
        
        {/* サイドバー - 今週のレース情報 */}
        <div className="lg:col-span-1">
          <div className="sticky top-16">
            <div className="bg-background/50 backdrop-blur-sm rounded-xl p-4 border border-primary/10 shadow-sm mb-6">
              <div className="flex items-center mb-4">
                <Calendar className="h-5 w-5 mr-2 text-primary" />
                <h2 className="text-xl font-bold">今週のレース</h2>
              </div>
              
              <ThisWeekRaces />
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
} 