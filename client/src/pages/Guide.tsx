import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import MainLayout from "@/components/layout/MainLayout";
import { Ticket, Calendar, Coins, Trophy, ChevronRight, Info, Award, BarChart3, Calculator, X, Check, Lightbulb, BookOpen, Settings, TrendingUp, Target, Pencil, ArrowRight, CheckCircle2, XCircle, InfoIcon, Quote, CircleArrowDownIcon, LineChartIcon, Brain, BadgeDollarSign, Gauge, Flag, LightbulbIcon, CircleCheck, Camera, BarChart3Icon, Image } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { useThemeStore } from "@/stores/themeStore";
import { Link, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Race } from "@db/schema";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { memo, useCallback, useMemo, useEffect } from "react";
import { isSameDay, subDays } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
  const queryClient = useQueryClient();

  // レースデータの取得
  const { data: races = [], isLoading, error } = useQuery<Race[]>({
    queryKey: ["/api/races"],
    staleTime: 60000, // 1分間キャッシュを有効に
  });

  // レース情報を先読みする関数
  const prefetchRaceData = useCallback((raceId: string) => {
    // レース情報をプリフェッチ
    queryClient.prefetchQuery({
      queryKey: [`/api/races/${raceId}`],
      staleTime: 60000,
    });

    // 馬データをプリフェッチ
    queryClient.prefetchQuery({
      queryKey: [`/api/horses/${raceId}`],
      staleTime: 60000,
    });

    // オッズデータをプリフェッチ
    queryClient.prefetchQuery({
      queryKey: [`/api/tan-odds-history/latest/${raceId}`],
      staleTime: 60000,
    });
    
    queryClient.prefetchQuery({
      queryKey: [`/api/fuku-odds/latest/${raceId}`],
      staleTime: 60000,
    });
  }, [queryClient]);

  // 直近のレースを取得する関数
  const getRecentRaces = useCallback((races: Race[]) => {
    if (!races || races.length === 0) return [];
    
    const today = new Date();
    
    // 今日以降のレースを優先
    const upcomingRaces = races
      .filter(race => {
        const raceDate = new Date(race.startTime);
        return raceDate >= today;
      })
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    
    if (upcomingRaces.length > 0) {
      return upcomingRaces.slice(0, 5);
    }
    
    // 選択された日付が週末でない場合、直前の週末を取得
    const getTargetDate = (date: Date) => {
      const dayOfWeek = date.getDay();
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        // 月～金の場合、直前の日曜日を取得
        const prevSunday = new Date(date);
        prevSunday.setDate(date.getDate() - dayOfWeek);
        return prevSunday;
      }
      return date;
    };
    
    const targetDate = getTargetDate(today);
    
    // 直近の開催日のレースを取得（過去のレースも含む）
    const recentRaces = races
      .filter(race => {
        const raceDate = new Date(race.startTime);
        // 同じ日か前日のレースを取得
        return (
          isSameDay(raceDate, targetDate) ||
          isSameDay(raceDate, subDays(targetDate, 1))
        );
      })
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    
    if (recentRaces.length > 0) {
      return recentRaces.slice(0, 5);
    }
    
    // 該当するレースがない場合は、最新のレースを最大5件取得
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
    prefetchRaceData(raceId);
    setLocation(`/race/${raceId}`);
  }, [setLocation, prefetchRaceData]);

  // レースにマウスオーバーしたときのハンドラー
  const handleRaceHover = useCallback((raceId: string) => {
    prefetchRaceData(raceId);
  }, [prefetchRaceData]);

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
    <div className="space-y-2.5">
      {recentRaces.map((race) => (
        <div
          key={race.id}
          onClick={() => handleRaceClick(race.id.toString())}
          onMouseEnter={() => handleRaceHover(race.id.toString())}
          className="cursor-pointer group relative overflow-hidden bg-background/70 backdrop-blur-sm border border-primary/20 hover:bg-primary/5 transition-all duration-300 hover:scale-[1.01] hover:-translate-y-0.5 hover:shadow-md rounded-lg p-3"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-background/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative flex justify-between items-center">
            <div>
              <h3 className="font-bold text-base text-foreground/90 group-hover:text-primary transition-colors duration-300">
                {race.name}
              </h3>
              <p className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                <span>
                  {format(new Date(race.startTime), 'MM/dd(E)', { locale: ja })}
                </span>
                <span className="inline-flex items-center justify-center bg-primary/20 px-2 py-0.5 rounded-full text-primary text-xs font-medium">
                  {format(new Date(race.startTime), 'HH:mm')}
                </span>
              </p>
            </div>
            <div className="text-right">
              {race.status === 'done' && (
                <p className="text-xs font-medium text-foreground/80 bg-primary/10 inline-flex items-center justify-center px-2 py-0.5 rounded-full">
                  発走済
                </p>
              )}
              <p className="text-[10px] text-muted-foreground mt-1">
                {race.venue}
              </p>
            </div>
          </div>
        </div>
      ))}
      
      <div className="pt-3 mt-1 border-t border-primary/10 text-center">
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
  
  // IntersectionObserver設定のためのuseEffect
  useEffect(() => {
    // アニメーション要素の選択
    const animatedElements = document.querySelectorAll('.scroll-animate');
    
    // IntersectionObserverの設定
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          // 要素が表示領域に入った時
          if (entry.isIntersecting) {
            // アニメーションクラスを追加
            entry.target.classList.add('animate');
            // 一度アニメーションした要素は監視を解除
            observer.unobserve(entry.target);
          }
        });
      },
      {
        root: null, // ビューポートを基準
        rootMargin: '0px 0px -100px 0px', // 下部に少し余裕を持たせる
        threshold: 0.1 // 10%表示されたらアニメーション開始
      }
    );
    
    // すべてのアニメーション対象要素を監視
    animatedElements.forEach(el => {
      observer.observe(el);
    });
    
    // ページ読み込み完了時の処理
    const onLoad = () => {
      // 最初の画面に表示されている要素については、ページロード完了時にアニメーション実行
      setTimeout(() => {
        const initialElements = document.querySelectorAll('.animate-fadeInUp, .animate-fadeInLeft, .animate-fadeIn');
        initialElements.forEach(el => {
          if (el instanceof HTMLElement) {
            // 既に適用されている可能性があるのでリセット
            el.style.opacity = '0';
            // 少し遅延を入れてから再アニメーション
            setTimeout(() => {
              if (el.classList.contains('animate-fadeInUp') || 
                  el.classList.contains('animate-fadeInLeft') || 
                  el.classList.contains('animate-fadeIn')) {
                // 既存のアニメーションスタイルを活かす
                el.style.opacity = '';
              }
            }, 100);
          }
        });
      }, 200);
    };
    
    // ページが既に読み込まれている場合は即実行
    if (document.readyState === 'complete') {
      onLoad();
    } else {
      // そうでなければloadイベントで実行
      window.addEventListener('load', onLoad);
    }
    
    // クリーンアップ関数
    return () => {
      animatedElements.forEach(el => {
        observer.unobserve(el);
      });
      window.removeEventListener('load', onLoad);
    };
  }, []);
  
  // details要素の開閉状態を検知して目次のアニメーションを制御するuseEffect
  useEffect(() => {
    const detailsElement = document.querySelector('details');
    
    if (!detailsElement) return;
    
    // 目次アニメーションをリセットして再実行する関数
    const resetAndAnimateContent = () => {
      // アニメーション対象の要素を取得
      const menuItems = document.querySelectorAll('.animate-fadeInLeft');
      const containerElement = document.querySelector('.animate-fadeInUp');
      
      // 一度すべてのアニメーション要素をリセット
      if (containerElement instanceof HTMLElement) {
        containerElement.style.animation = 'none';
        containerElement.style.opacity = '0';
      }
      
      menuItems.forEach((item) => {
        if (item instanceof HTMLElement) {
          item.style.animation = 'none';
          item.style.opacity = '0';
        }
      });
      
      // レンダリングを強制
      void document.body.offsetHeight;
      
      // アニメーションを再開
      if (containerElement instanceof HTMLElement) {
        containerElement.style.animation = '';
        containerElement.style.opacity = '';
      }
      
      // 各メニュー項目を順番に表示
      menuItems.forEach((item, index) => {
        if (item instanceof HTMLElement) {
          setTimeout(() => {
            item.style.animation = '';
            item.style.opacity = '';
          }, 50 * (index + 1));
        }
      });
    };
    
    // details要素のクリックイベントリスナー
    const handleDetailsClick = () => {
      // details要素が開かれた場合のみアニメーションをリセット
      if (detailsElement.hasAttribute('open')) {
        // 少し遅延を入れてアニメーションを再実行（CSSトランジションが完了した後）
        setTimeout(() => {
          resetAndAnimateContent();
        }, 300);
      }
    };
    
    // イベントリスナーを追加
    detailsElement.addEventListener('click', handleDetailsClick);
    
    // クリーンアップ関数
    return () => {
      detailsElement.removeEventListener('click', handleDetailsClick);
    };
  }, []);
  
  // CSS変数をテーマに基づいて動的に変更するuseEffect
  useEffect(() => {
    // :root CSS変数を設定
    document.documentElement.style.setProperty(
      '--animation-easing', 
      theme === 'dark' 
        ? 'cubic-bezier(0.16, 1, 0.3, 1)' // 滑らかな動き (dark)
        : 'cubic-bezier(0.34, 1.56, 0.64, 1)' // 若干弾むような動き (light)
    );
    
    document.documentElement.style.setProperty(
      '--animation-duration', 
      theme === 'dark' ? '0.6s' : '0.5s'
    );
    
    document.documentElement.style.setProperty(
      '--animation-stagger', 
      theme === 'dark' ? '80ms' : '60ms'
    );
    
    // テーマ変更時のスムーズな遷移のために少し遅延を入れる
    setTimeout(() => {
      const animatedElements = document.querySelectorAll('.scroll-animate.animate');
      animatedElements.forEach(el => {
        // 一度アニメーションをリセットして再適用
        el.classList.remove('animate');
        setTimeout(() => {
          el.classList.add('animate');
        }, 50);
      });
    }, 100);
    
  }, [theme]);
  
  // カスタムアニメーション用のスタイル
  const animationStyles = `
    /* 基本的なアニメーション変数 */
    :root {
      --animation-duration: 0.6s;
      --animation-stagger: 80ms;
      --animation-easing: cubic-bezier(0.16, 1, 0.3, 1);
    }
    
    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(15px);
        filter: blur(5px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
        filter: blur(0);
      }
    }
    
    @keyframes fadeInLeft {
      from {
        opacity: 0;
        transform: translateX(-10px);
        filter: blur(2px);
      }
      50% {
        filter: blur(1px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
        filter: blur(0);
      }
    }
    
    @keyframes fadeInRight {
      from {
        opacity: 0;
        transform: translateX(10px);
        filter: blur(2px);
      }
      50% {
        filter: blur(1px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
        filter: blur(0);
      }
    }
    
    /* アニメーションの実行を保証するための明示的な初期状態 */
    .animate-fadeInUp, .animate-fadeInLeft, .animate-fadeInRight {
      will-change: transform, opacity;
      backface-visibility: hidden;
    }
    
    .animate-fadeInUp {
      animation: fadeInUp var(--animation-duration) var(--animation-easing) both;
    }
    
    .animate-fadeInLeft {
      animation: fadeInLeft var(--animation-duration) var(--animation-easing) both;
    }
    
    .animate-fadeInRight {
      animation: fadeInRight var(--animation-duration) var(--animation-easing) both;
    }

    /* シンプルなフェードインアニメーション */
    @keyframes fadeIn {
      from { 
        opacity: 0; 
        transform: translateY(8px);
        filter: blur(2px);
      }
      to { 
        opacity: 1; 
        transform: translateY(0);
        filter: blur(0);
      }
    }
    
    .animate-fadeIn {
      animation: fadeIn var(--animation-duration) var(--animation-easing) both;
      will-change: transform, opacity;
    }

    /* セクションハイライト改善 */
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
      opacity: 0;
      animation: fadeIn 1s var(--animation-easing) forwards;
      animation-delay: 0.3s;
    }
    
    /* スクロールアニメーション */
    .scroll-animate {
      opacity: 0;
      transform: translateY(20px);
      transition: opacity var(--animation-duration) var(--animation-easing),
                  transform var(--animation-duration) var(--animation-easing),
                  filter var(--animation-duration) var(--animation-easing);
      filter: blur(5px);
    }
    
    .scroll-animate.animate {
      opacity: 1;
      transform: translateY(0);
      filter: blur(0);
    }
    
    .scroll-animate-left {
      opacity: 1;
      transform: translateX(0);
      transition: opacity var(--animation-duration) var(--animation-easing),
                  transform var(--animation-duration) var(--animation-easing),
                  filter var(--animation-duration) var(--animation-easing);
      filter: blur(0);
    }
    
    .scroll-animate-left.animate {
      opacity: 1;
      transform: translateX(0);
      filter: blur(0);
    }
    
    .scroll-animate-right {
      opacity: 1;
      transform: translateX(0);
      transition: opacity var(--animation-duration) var(--animation-easing),
                  transform var(--animation-duration) var(--animation-easing),
                  filter var(--animation-duration) var(--animation-easing);
      filter: blur(0);
    }
    
    .scroll-animate-right.animate {
      opacity: 1;
      transform: translateX(0);
      filter: blur(0);
    }
    
    /* スタガーアニメーション（連続的な要素の遅延表示） */
    .stagger-container .stagger-item:nth-child(1) { transition-delay: calc(var(--animation-stagger) * 1); }
    .stagger-container .stagger-item:nth-child(2) { transition-delay: calc(var(--animation-stagger) * 2); }
    .stagger-container .stagger-item:nth-child(3) { transition-delay: calc(var(--animation-stagger) * 3); }
    .stagger-container .stagger-item:nth-child(4) { transition-delay: calc(var(--animation-stagger) * 4); }
    .stagger-container .stagger-item:nth-child(5) { transition-delay: calc(var(--animation-stagger) * 5); }
    .stagger-container .stagger-item:nth-child(6) { transition-delay: calc(var(--animation-stagger) * 6); }
    .stagger-container .stagger-item:nth-child(7) { transition-delay: calc(var(--animation-stagger) * 7); }
    .stagger-container .stagger-item:nth-child(8) { transition-delay: calc(var(--animation-stagger) * 8); }
    
    /* details要素のアニメーション改善 */
    details[open] summary ~ * {
      animation: fadeIn 0.4s var(--animation-easing);
    }
    
    details summary {
      cursor: pointer;
      transition: all 0.3s ease;
    }
    
    details[open] summary {
      margin-bottom: 10px;
    }
    
    /* ホバー効果の修正 - 個別要素のみがハイライトされるように */
    .guide-menu-item {
      transition: all 0.3s ease;
    }
    
    .guide-menu-item:hover {
      background-color: rgba(var(--primary-rgb), 0.05);
    }
    
    .guide-menu-item:hover .guide-menu-text {
      color: hsl(var(--primary));
    }
    
    .guide-menu-item:hover .guide-menu-circle {
      background-color: rgba(var(--primary-rgb), 0.2);
    }
    
    .guide-menu-item:hover .guide-menu-circle-bg {
      transform: scale(1);
    }
  `;

  return (
    <MainLayout>
      <Helmet>
        <title>競馬の期待値計算 | 回収率を上げる期待値思考の基本と実践</title>
        <meta
          name="description"
          content="競馬で期待値計算を活用して回収率を上げるための完全ガイド。オッズと予想確率から期待値を算出する方法と、期待値の高い馬券を効率的に見つけるコツを解説。期待値1.4以上の馬券を狙って長期的に利益を出す戦略を学びましょう。"
        />
        <meta
          name="keywords"
          content="競馬, 期待値, 期待値計算, 回収率, 競馬 期待値, 競馬 期待値計算, オッズ, 予想確率, 的中確率, 期待値1.4"
        />
        <link rel="canonical" href="https://www.horsestakes.net/guide" />
        <style type="text/css">{animationStyles}</style>
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

      {/* ヘッダー画像を最初に大きく表示 */}
      <div className="relative w-full max-w-6xl mx-auto px-4 sm:px-6 mb-8">
        {/* Canvaで作成する画像サイズ: 1200px × 600px (アスペクト比 2:1) */}
        <div className="relative w-full overflow-hidden rounded-xl shadow-xl aspect-[2/1]">
          <img 
            src="/images/guide_header.webp" 
            alt="競馬の期待値思考 - 回収率アップの秘訣" 
            className="w-full h-full object-cover"
            width="1200"
            height="600"
            loading="eager"
            {...{ fetchpriority: "high" } as any}
          />
          {/* オーバーレイ効果 */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
        </div>
      </div>

      {/* タイトルセクション - シンプルかつ洗練されたデザイン */}
      <div className="relative w-full max-w-6xl mx-auto px-4 sm:px-6 mb-12">
        <div className="text-center">
          <h1 className="pb-1 md:pb-2 text-3xl sm:text-4xl md:text-5xl font-bold mb-4 text-foreground relative inline-block whitespace-nowrap">
            競馬の期待値思考
            <span className="absolute -bottom-3 left-0 right-0 h-1 bg-primary rounded-full transform scale-x-75 mx-auto"></span>
          </h1>
          <p className="pt-1 md:pt-2 text-xl md:text-2xl font-medium text-foreground/90 mb-4 whitespace-nowrap">
            回収率アップの秘訣と実践方法
          </p>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
            オッズと予想確率から期待値を算出し、回収率向上を目指す方法を解説します。
          </p>
        </div>
      </div>

      {/* コンテンツをメインとサイドバーの2カラムレイアウトに変更 */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8 px-4 sm:px-6">
        {/* メインコンテンツ - 最大幅を左側3/4に制限 */}
        <div className="lg:col-span-3">
        
          {/* 目次 - 折りたたみ可能 */}
          <div className="mb-10">
            <details open className="group shadow-md">
              <summary className="flex items-center justify-between p-3 sm:p-4 rounded-t-lg bg-gradient-to-r from-primary/10 to-primary/5 backdrop-blur-sm border border-primary/20 cursor-pointer">
                <div className="flex items-center">
                  <div className="bg-primary/20 p-1.5 rounded-lg mr-2.5 shadow-sm">
                    <BookOpen className="h-4 w-4 text-primary" />
                  </div>
                  <h2 className="text-lg font-semibold tracking-tight">目次</h2>
                </div>
                <div className="transition-transform duration-300 ease-in-out group-open:rotate-180">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-primary">
                    <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </summary>
              <div className="p-4 rounded-b-lg bg-gradient-to-b from-background/90 to-background/70 backdrop-blur-sm border border-t-0 border-primary/20">
                {/* アニメーションで表示されるコンテンツ */}
                <div 
                  className="opacity-0 animate-fadeInUp"
                  style={{ 
                    animationDelay: '100ms', 
                    animationDuration: 'var(--animation-duration)'
                  }}
                >
                  
                  {/* セクション1: 基礎知識と理論 */}
                  <div className="mb-5">
                    <div className="flex items-center mb-2">
                      <div className="bg-primary/10 p-1.5 rounded-lg mr-2.5">
                        <BookOpen className="h-4 w-4 text-primary" />
                      </div>
                      <h3 className="text-base font-semibold text-primary/90">I. 基礎知識と理論</h3>
                    </div>
                    
                    <div className="space-y-2.5 ml-3 pl-6 border-l border-dashed border-primary/30">
                      <a 
                        href="#what-is-ev" 
                        className="guide-menu-item group flex items-center gap-2.5 pl-2 py-1.5 pr-3 rounded-md transition-all duration-300 cursor-pointer opacity-0 animate-fadeInLeft" 
                        style={{ 
                          animationDelay: 'calc(100ms + var(--animation-stagger))',
                          animationDuration: 'var(--animation-duration)'
                        }}
                      >
                        <div className="guide-menu-circle bg-primary/10 transition-colors duration-300 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-medium text-primary shadow-sm relative overflow-hidden">
                          <span className="relative z-10">1</span>
                          <span className="guide-menu-circle-bg absolute inset-0 bg-primary/10 transform scale-0 transition-transform duration-300 origin-center rounded-full"></span>
                        </div>
                        <div>
                          <span className="guide-menu-text font-medium block transition-colors text-sm sm:text-base">競馬の期待値思考とは？</span>
                          <span className="text-xs text-foreground/60 transition-colors">勝ち続ける人の思考法</span>
                        </div>
                      </a>
                      
                      <a 
                        href="#ev-examples" 
                        className="guide-menu-item group flex items-center gap-2.5 pl-2 py-1.5 pr-3 rounded-md transition-all duration-300 cursor-pointer opacity-0 animate-fadeInLeft" 
                        style={{ 
                          animationDelay: 'calc(100ms + var(--animation-stagger) * 2)',
                          animationDuration: 'var(--animation-duration)'
                        }}
                      >
                        <div className="guide-menu-circle bg-primary/10 transition-colors duration-300 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-medium text-primary shadow-sm relative overflow-hidden">
                          <span className="relative z-10">2</span>
                          <span className="guide-menu-circle-bg absolute inset-0 bg-primary/10 transform scale-0 transition-transform duration-300 origin-center rounded-full"></span>
                        </div>
                        <div>
                          <span className="guide-menu-text font-medium block transition-colors text-sm sm:text-base">具体例で理解する期待値計算</span>
                          <span className="text-xs text-foreground/60 transition-colors">買うべき馬券の見極め方</span>
                        </div>
                      </a>
                    </div>
                  </div>
                  
                  {/* セクション2: 実践方法と戦略 */}
                  <div className="mb-5">
                    <div className="flex items-center mb-2">
                      <div className="bg-primary/10 p-1.5 rounded-lg mr-2.5">
                        <BarChart3 className="h-4 w-4 text-primary" />
                      </div>
                      <h3 className="text-base font-semibold text-primary/90">II. 実践方法と戦略</h3>
                    </div>
                    
                    <div className="space-y-2.5 ml-3 pl-6 border-l border-dashed border-primary/30">
                      <a 
                        href="#win-place-prob" 
                        className="guide-menu-item group flex items-center gap-2.5 pl-2 py-1.5 pr-3 rounded-md transition-all duration-300 cursor-pointer opacity-0 animate-fadeInLeft" 
                        style={{ 
                          animationDelay: 'calc(100ms + var(--animation-stagger) * 3)',
                          animationDuration: 'var(--animation-duration)'
                        }}
                      >
                        <div className="guide-menu-circle bg-primary/10 transition-colors duration-300 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-medium text-primary shadow-sm relative overflow-hidden">
                          <span className="relative z-10">3</span>
                          <span className="guide-menu-circle-bg absolute inset-0 bg-primary/10 transform scale-0 transition-transform duration-300 origin-center rounded-full"></span>
                        </div>
                        <div>
                          <span className="guide-menu-text font-medium block transition-colors text-sm sm:text-base">単勝確率・複勝確率の予想方法</span>
                          <span className="text-xs text-foreground/60 transition-colors">精度を高めるテクニック</span>
                        </div>
                      </a>
                      
                      <a 
                        href="#optimal-betting" 
                        className="guide-menu-item group flex items-center gap-2.5 pl-2 py-1.5 pr-3 rounded-md transition-all duration-300 cursor-pointer opacity-0 animate-fadeInLeft" 
                        style={{ 
                          animationDelay: 'calc(100ms + var(--animation-stagger) * 4)',
                          animationDuration: 'var(--animation-duration)'
                        }}
                      >
                        <div className="guide-menu-circle bg-primary/10 transition-colors duration-300 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-medium text-primary shadow-sm relative overflow-hidden">
                          <span className="relative z-10">4</span>
                          <span className="guide-menu-circle-bg absolute inset-0 bg-primary/10 transform scale-0 transition-transform duration-300 origin-center rounded-full"></span>
                        </div>
                        <div>
                          <span className="guide-menu-text font-medium block transition-colors text-sm sm:text-base">期待値に基づく最適な馬券構成</span>
                          <span className="text-xs text-foreground/60 transition-colors">資金配分の秘訣</span>
                        </div>
                      </a>
                    </div>
                  </div>
                  
                  {/* セクション3: ツールの活用とスキルアップ */}
                  <div>
                    <div className="flex items-center mb-2">
                      <div className="bg-primary/10 p-1.5 rounded-lg mr-2.5">
                        <Settings className="h-4 w-4 text-primary" />
                      </div>
                      <h3 className="text-base font-semibold text-primary/90">III. ツールの活用とスキルアップ</h3>
                    </div>
                    
                    <div className="space-y-2.5 ml-3 pl-6 border-l border-dashed border-primary/30">
                      <a 
                        href="#ev-tools" 
                        className="guide-menu-item group flex items-center gap-2.5 pl-2 py-1.5 pr-3 rounded-md transition-all duration-300 cursor-pointer opacity-0 animate-fadeInLeft" 
                        style={{ 
                          animationDelay: 'calc(100ms + var(--animation-stagger) * 5)',
                          animationDuration: 'var(--animation-duration)'
                        }}
                      >
                        <div className="guide-menu-circle bg-primary/10 transition-colors duration-300 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-medium text-primary shadow-sm relative overflow-hidden">
                          <span className="relative z-10">5</span>
                          <span className="guide-menu-circle-bg absolute inset-0 bg-primary/10 transform scale-0 transition-transform duration-300 origin-center rounded-full"></span>
                        </div>
                        <div>
                          <span className="guide-menu-text font-medium block transition-colors text-sm sm:text-base">当サイトの期待値計算ツールの使い方</span>
                          <span className="text-xs text-foreground/60 transition-colors">実践ガイド</span>
                        </div>
                      </a>
                      
                      <a 
                        href="#ev-training" 
                        className="guide-menu-item group flex items-center gap-2.5 pl-2 py-1.5 pr-3 rounded-md transition-all duration-300 cursor-pointer opacity-0 animate-fadeInLeft" 
                        style={{ 
                          animationDelay: 'calc(100ms + var(--animation-stagger) * 6)',
                          animationDuration: 'var(--animation-duration)'
                        }}
                      >
                        <div className="guide-menu-circle bg-primary/10 transition-colors duration-300 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-medium text-primary shadow-sm relative overflow-hidden">
                          <span className="relative z-10">6</span>
                          <span className="guide-menu-circle-bg absolute inset-0 bg-primary/10 transform scale-0 transition-transform duration-300 origin-center rounded-full"></span>
                        </div>
                        <div>
                          <span className="guide-menu-text font-medium block transition-colors text-sm sm:text-base">期待値計算プロの実践トレーニング</span>
                          <span className="text-xs text-foreground/60 transition-colors">あなたの予想力を高める方法</span>
                        </div>
                      </a>
                      
                      <a 
                        href="#faq" 
                        className="guide-menu-item group flex items-center gap-2.5 pl-2 py-1.5 pr-3 rounded-md transition-all duration-300 cursor-pointer opacity-0 animate-fadeInLeft" 
                        style={{ 
                          animationDelay: 'calc(100ms + var(--animation-stagger) * 7)',
                          animationDuration: 'var(--animation-duration)'
                        }}
                      >
                        <div className="guide-menu-circle bg-primary/10 transition-colors duration-300 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-medium text-primary shadow-sm relative overflow-hidden">
                          <span className="relative z-10">7</span>
                          <span className="guide-menu-circle-bg absolute inset-0 bg-primary/10 transform scale-0 transition-transform duration-300 origin-center rounded-full"></span>
                        </div>
                        <div>
                          <span className="guide-menu-text font-medium block transition-colors text-sm sm:text-base">期待値計算と確率計算に関するよくある質問</span>
                          <span className="text-xs text-foreground/60 transition-colors">FAQ</span>
                        </div>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </details>
          </div>

          <div id="what-is-ev" className="mb-16 scroll-mt-16 section-highlight animate-fadeIn" style={{ animationDelay: 'calc(var(--animation-stagger) * 8)' }}>
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
              <Card className="overflow-hidden bg-background/50 backdrop-blur-sm border-primary/10 shadow-md scroll-animate">
                <CardHeader className="border-b border-primary/5 bg-primary/5">
                  <CardTitle className="text-foreground text-xl flex items-center">
                  <Pencil className="h-5 w-5 text-primary mr-2" />
                    なぜ「印」ではなく「確率」で予想するのか
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                
                  <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-6 stagger-container">
                    <div className="p-5 rounded-lg bg-red-500/10 space-y-3 border border-red-500/20 shadow-sm scroll-animate-left">
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
                    <div className="p-5 rounded-lg bg-green-500/10 space-y-3 border border-green-500/20 shadow-sm scroll-animate-right">
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
                          <span>資金配分を数学的に最適化できる</span>
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
              <Card className="overflow-hidden bg-background/50 backdrop-blur-sm border-primary/10 shadow-md scroll-animate">
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
                    <p className="mb-3 text-sm leading-relaxed">
                      予想には必ず誤差がつきものなので、理論値だけを追い求めるのではなく、安全マージンを考慮して判断することが重要です。
                    </p>
                    <div className="bg-background/50 backdrop-blur-sm p-4 rounded-lg border border-blue-500/10 text-center mb-2">
                      <p className="text-xl font-bold text-foreground mb-1">「期待値には余裕を持った判断を」</p>
                      <p className="text-sm text-foreground/80">単なる期待値1.0を目安にするのではなく、予想の誤差を考慮し、より高い期待値の馬券を選ぶ習慣をつけると長期的な回収率向上につながります。</p>
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

          <div id="ev-examples" className="mb-16 scroll-mt-16 section-highlight animate-fadeIn" style={{ animationDelay: 'calc(var(--animation-stagger) * 9)' }}>
            <div className="flex items-center mb-6">
              <div className="bg-primary/10 p-2.5 rounded-lg mr-3 shadow-sm">
                <Calculator className="h-6 w-6 text-primary" />
              </div>
              <div>
                <span className="text-sm font-medium text-primary/70 block">SECTION 02</span>
                <h2 className="text-2xl sm:text-3xl font-bold">期待値で見極める勝率のギャップ</h2>
              </div>
            </div>

            <div className="space-y-8">
              <Card className="overflow-hidden bg-background/50 backdrop-blur-sm border-primary/10 shadow-lg hover:shadow-xl transition-shadow duration-300 scroll-animate">
                <CardHeader className="border-b border-primary/10 bg-gradient-to-r from-primary/10 to-primary/5">
                  <CardTitle className="text-foreground text-xl flex items-center">
                    <TrendingUp className="h-5 w-5 text-primary mr-2" />
                    期待値で見極める勝率のギャップ
                  </CardTitle>
                </CardHeader>
                
                <CardContent className="pt-4">
                  <p className="mb-5 text-base leading-relaxed">
                    競馬の予想で大切なのは<span className="font-semibold">「あなたの予想と市場の予想（オッズ）の差」</span>です。
                    単勝オッズ2倍の1番人気と単勝オッズ10倍の穴馬を比較し、どちらを買うべきか考えてみましょう。
                  </p>
                  
                  <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-5 rounded-xl bg-background border-2 border-primary/10 hover:border-primary/20 transition-colors duration-300 shadow-sm space-y-3">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center">
                          <span className="text-rose-600 font-bold">1番</span>
                        </div>
                        <p className="font-semibold text-lg">単勝オッズ2.0倍の1番人気</p>
                      </div>
                      <div className="space-y-2">
                        <p className="flex justify-between items-center">
                          <span className="text-sm text-foreground/80">市場予想勝率：</span>
                          <span className="font-medium text-lg">50%</span>
                        </p>
                        <p className="flex justify-between items-center">
                          <span className="text-sm text-foreground/80">あなたの予想勝率：</span>
                          <span className="font-medium text-lg">40%</span>
                        </p>
                        <div className="border-t border-primary/10 pt-2 mt-2">
                          <p className="flex justify-between items-center">
                            <span className="font-semibold">期待値：</span>
                            <span className="text-rose-500 text-xl font-bold">0.8</span>
                          </p>
                          <p className="text-sm text-foreground/70 mt-1">市場の過大評価 = 期待値が1.0未満</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-5 rounded-xl bg-background border-2 border-primary/10 hover:border-primary/20 transition-colors duration-300 shadow-sm space-y-3">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                          <span className="text-emerald-600 font-bold">穴馬</span>
                        </div>
                        <p className="font-semibold text-lg">単勝オッズ10.0倍の穴馬</p>
                      </div>
                      <div className="space-y-2">
                        <p className="flex justify-between items-center">
                          <span className="text-sm text-foreground/80">市場予想勝率：</span>
                          <span className="font-medium text-lg">10%</span>
                        </p>
                        <p className="flex justify-between items-center">
                          <span className="text-sm text-foreground/80">あなたの予想勝率：</span>
                          <span className="font-medium text-lg">15%</span>
                        </p>
                        <div className="border-t border-primary/10 pt-2 mt-2">
                          <p className="flex justify-between items-center">
                            <span className="font-semibold">期待値：</span>
                            <span className="text-emerald-500 text-xl font-bold">1.5</span>
                          </p>
                          <p className="text-sm text-foreground/70 mt-1">市場の過小評価 = 期待値が1.0以上</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-5 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 mb-6">
                    <h3 className="font-semibold text-lg mb-3">期待値の正体：<span className="text-primary">市場の予想と自分の予想のギャップ</span></h3>
                    <p className="mb-4 leading-relaxed">
                      上の例で分かるように、<span className="underline decoration-primary/30 decoration-2">期待値は市場の評価と自分の評価の差から生まれます</span>。
                      1番人気は市場が過大評価（実際より勝率が高く見積もられている）している一方、
                      穴馬は市場が過小評価（実際より勝率が低く見積もられている）しているため、
                      期待値が高くなっています。
                    </p>
                    <div className="flex items-center gap-2 mb-2 text-primary">
                      <Lightbulb className="h-5 w-5" />
                      <span className="font-medium">期待値計算式：あなたの予想勝率 × オッズ</span>
                    </div>
                  </div>
                  
                  <div className="p-5 rounded-xl bg-primary/5 border border-primary/10 shadow-inner">
                    <h3 className="font-semibold text-lg mb-3 flex items-center">
                      <Target className="h-5 w-5 text-primary mr-2" />
                      実践的な期待値判断基準
                    </h3>
                    <ul className="space-y-3">
                      <li className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium mt-0.5 shadow-sm">1</div>
                        <div>
                          <p className="font-medium">自分の予想勝率が市場予想（オッズから逆算）より高い馬を探す</p>
                          <p className="text-sm text-foreground/70 mt-0.5">これが期待値1.0以上の条件です</p>
                        </div>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium mt-0.5 shadow-sm">2</div>
                        <div>
                          <p className="font-medium">期待値1.4以上の馬券を優先的に購入する</p>
                          <p className="text-sm text-foreground/70 mt-0.5">長期的に利益を出すために重要な閾値です</p>
                        </div>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium mt-0.5 shadow-sm">3</div>
                        <div>
                          <p className="font-medium">1つのレースで複数の馬券が期待値1.4以上なら、期待値が高い順に資金配分</p>
                          <p className="text-sm text-foreground/70 mt-0.5">期待値の高さに比例して資金を振り分けることで、最適な投資が可能になります</p>
                        </div>
                      </li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div id="win-place-prob" className="mb-12 scroll-mt-16">
            <div className="flex items-center mb-6">
              <div className="bg-primary/10 p-2.5 rounded-lg mr-3 shadow-sm">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <span className="text-sm font-medium text-primary/70 block">SECTION 03</span>
                <h2 className="text-2xl sm:text-3xl font-bold">単勝確率・複勝確率の科学的予想法</h2>
              </div>
            </div>

            <div className="space-y-8">
              <Card className="overflow-hidden bg-background/50 backdrop-blur-sm border-primary/10 shadow-lg hover:shadow-xl transition-shadow duration-300 scroll-animate">
                <CardHeader className="border-b border-primary/10 bg-gradient-to-r from-primary/10 to-primary/5">
                  <CardTitle className="text-foreground text-xl flex items-center">
                    <Target className="h-5 w-5 text-primary mr-2" />
                    単勝オッズから見る勝率データ
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <p className="mb-5 text-base leading-relaxed">
                    単勝オッズと実際の勝率には強い相関関係があります。以下の表は過去のデータから算出された<span className="font-semibold">オッズ別の勝率と回収率</span>です。
                    これらのデータを参考にすることで、各馬の勝率を客観的に推定できます。
                  </p>
                  
                  <div className="mb-6 overflow-x-auto">
                    <table className="w-full border-collapse bg-background/80 shadow-sm rounded-lg overflow-hidden">
                      <thead>
                        <tr className="bg-primary/10">
                          <th className="p-3 text-left border-b border-r border-primary/10 font-medium">オッズ超</th>
                          <th className="p-3 text-left border-b border-r border-primary/10 font-medium">オッズ以下</th>
                          <th className="p-3 text-center border-b border-r border-primary/10 font-medium">勝率(%)</th>
                          <th className="p-3 text-center border-b border-primary/10 font-medium">回収率(%)</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="hover:bg-primary/5 transition-colors">
                          <td className="p-3 border-r border-b border-primary/10">-</td>
                          <td className="p-3 border-r border-b border-primary/10">1.5</td>
                          <td className="p-3 text-center border-r border-b border-primary/10 font-medium">59.19</td>
                          <td className="p-3 text-center border-b border-primary/10 font-medium text-emerald-600">81.56</td>
                        </tr>
                        <tr className="hover:bg-primary/5 transition-colors bg-background/30">
                          <td className="p-3 border-r border-b border-primary/10">1.5</td>
                          <td className="p-3 border-r border-b border-primary/10">2.0</td>
                          <td className="p-3 text-center border-r border-b border-primary/10 font-medium">42.46</td>
                          <td className="p-3 text-center border-b border-primary/10 font-medium text-emerald-600">76.22</td>
                        </tr>
                        <tr className="hover:bg-primary/5 transition-colors">
                          <td className="p-3 border-r border-b border-primary/10">2.0</td>
                          <td className="p-3 border-r border-b border-primary/10">3.0</td>
                          <td className="p-3 text-center border-r border-b border-primary/10 font-medium">30.76</td>
                          <td className="p-3 text-center border-b border-primary/10 font-medium text-emerald-600">78.60</td>
                        </tr>
                        <tr className="hover:bg-primary/5 transition-colors bg-background/30">
                          <td className="p-3 border-r border-b border-primary/10">3.0</td>
                          <td className="p-3 border-r border-b border-primary/10">4.0</td>
                          <td className="p-3 text-center border-r border-b border-primary/10 font-medium">22.56</td>
                          <td className="p-3 text-center border-b border-primary/10 font-medium text-emerald-600">79.84</td>
                        </tr>
                        <tr className="hover:bg-primary/5 transition-colors">
                          <td className="p-3 border-r border-b border-primary/10">4.0</td>
                          <td className="p-3 border-r border-b border-primary/10">5.0</td>
                          <td className="p-3 text-center border-r border-b border-primary/10 font-medium">17.30</td>
                          <td className="p-3 text-center border-b border-primary/10 font-medium text-emerald-600">78.31</td>
                        </tr>
                        <tr className="hover:bg-primary/5 transition-colors bg-background/30">
                          <td className="p-3 border-r border-b border-primary/10">5.0</td>
                          <td className="p-3 border-r border-b border-primary/10">7.0</td>
                          <td className="p-3 text-center border-r border-b border-primary/10 font-medium">13.33</td>
                          <td className="p-3 text-center border-b border-primary/10 font-medium text-emerald-600">79.40</td>
                        </tr>
                        <tr className="hover:bg-primary/5 transition-colors">
                          <td className="p-3 border-r border-b border-primary/10">7.0</td>
                          <td className="p-3 border-r border-b border-primary/10">10.0</td>
                          <td className="p-3 text-center border-r border-b border-primary/10 font-medium">9.96</td>
                          <td className="p-3 text-center border-b border-primary/10 font-medium text-emerald-600">83.30</td>
                        </tr>
                        <tr className="hover:bg-primary/5 transition-colors bg-background/30">
                          <td className="p-3 border-r border-b border-primary/10">10.0</td>
                          <td className="p-3 border-r border-b border-primary/10">20.0</td>
                          <td className="p-3 text-center border-r border-b border-primary/10 font-medium">6.31</td>
                          <td className="p-3 text-center border-b border-primary/10 font-medium text-emerald-600">84.92</td>
                        </tr>
                        <tr className="hover:bg-primary/5 transition-colors">
                          <td className="p-3 border-r border-b border-primary/10">20.0</td>
                          <td className="p-3 border-r border-b border-primary/10">30.0</td>
                          <td className="p-3 text-center border-r border-b border-primary/10 font-medium">3.40</td>
                          <td className="p-3 text-center border-b border-primary/10 font-medium text-emerald-600">82.75</td>
                        </tr>
                        <tr className="hover:bg-primary/5 transition-colors bg-background/30">
                          <td className="p-3 border-r border-b border-primary/10">30.0</td>
                          <td className="p-3 border-r border-b border-primary/10">50.0</td>
                          <td className="p-3 text-center border-r border-b border-primary/10 font-medium">1.70</td>
                          <td className="p-3 text-center border-b border-primary/10 font-medium text-emerald-600">75.76</td>
                        </tr>
                        <tr className="hover:bg-primary/5 transition-colors">
                          <td className="p-3 border-r border-b border-primary/10">50.0</td>
                          <td className="p-3 border-r border-b border-primary/10">100.0</td>
                          <td className="p-3 text-center border-r border-b border-primary/10 font-medium">0.83</td>
                          <td className="p-3 text-center border-b border-primary/10 font-medium text-rose-500">69.06</td>
                        </tr>
                        <tr className="hover:bg-primary/5 transition-colors bg-background/30">
                          <td className="p-3 border-r border-b border-primary/10">100.0</td>
                          <td className="p-3 border-r border-b border-primary/10">200.0</td>
                          <td className="p-3 text-center border-r border-b border-primary/10 font-medium">0.29</td>
                          <td className="p-3 text-center border-b border-primary/10 font-medium text-rose-500">49.96</td>
                        </tr>
                        <tr className="hover:bg-primary/5 transition-colors">
                          <td className="p-3 border-r border-primary/10">200.0</td>
                          <td className="p-3 border-r border-primary/10">-</td>
                          <td className="p-3 text-center border-r border-primary/10 font-medium">0.08</td>
                          <td className="p-3 text-center border-primary/10 font-medium text-rose-500">29.82</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="p-5 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 mb-6">
                    <h3 className="font-semibold text-lg mb-3">表から分かること</h3>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium mt-0.5 shadow-sm">1</div>
                        <div>
                          <p className="font-medium">人気馬ほど勝率は高いが回収率は低い傾向</p>
                          <p className="text-sm text-foreground/70 mt-0.5">1.5倍以下の超人気馬でも回収率は81.56%に留まります</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium mt-0.5 shadow-sm">2</div>
                        <div>
                          <p className="font-medium">どのオッズ帯でも回収率は100%を下回る</p>
                          <p className="text-sm text-foreground/70 mt-0.5">市場全体では賭け手が不利になるように設計されています</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium mt-0.5 shadow-sm">3</div>
                        <div>
                          <p className="font-medium">大穴馬(50倍超)は回収率が著しく低下</p>
                          <p className="text-sm text-foreground/70 mt-0.5">50倍を超えるオッズでは回収率が70%を下回り、効率が悪化します</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="overflow-hidden bg-background/50 backdrop-blur-sm border-primary/10 shadow-lg hover:shadow-xl transition-shadow duration-300 scroll-animate">
                <CardHeader className="border-b border-primary/10 bg-gradient-to-r from-primary/10 to-primary/5">
                  <CardTitle className="text-foreground text-xl flex items-center">
                    <Calculator className="h-5 w-5 text-primary mr-2" />
                    確率予想の基本原則
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="p-5 rounded-xl bg-background border-2 border-primary/10 hover:border-primary/20 transition-colors duration-300 shadow-sm space-y-3">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center">
                          <span className="text-rose-600 font-bold">単</span>
                        </div>
                        <p className="font-semibold text-lg">単勝確率の特徴</p>
                      </div>
                      <ul className="space-y-2">
                        <li className="flex items-start gap-2">
                          <span className="text-primary font-bold">•</span>
                          <span>各馬の1着になる確率を予想</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary font-bold">•</span>
                          <span><strong>全馬の合計が100%</strong>になるように調整する</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary font-bold">•</span>
                          <span>オッズの逆数から市場の予想確率を推定可能</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary font-bold">•</span>
                          <span>例: オッズ2.0倍 → 市場予想確率 50%</span>
                        </li>
                      </ul>
                    </div>
                    <div className="p-5 rounded-xl bg-background border-2 border-primary/10 hover:border-primary/20 transition-colors duration-300 shadow-sm space-y-3">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                          <span className="text-emerald-600 font-bold">複</span>
                        </div>
                        <p className="font-semibold text-lg">複勝確率の特徴</p>
                      </div>
                      <ul className="space-y-2">
                        <li className="flex items-start gap-2">
                          <span className="text-primary font-bold">•</span>
                          <span>各馬の3着以内に入る確率を予想</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary font-bold">•</span>
                          <span><strong>全馬の合計が300%</strong>になるように調整する</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary font-bold">•</span>
                          <span>単勝確率が高い馬ほど複勝確率も高くなる傾向</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary font-bold">•</span>
                          <span>例: 単勝確率20%の馬 → 複勝確率 約50%前後</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                  
                  <div className="p-5 rounded-xl bg-primary/5 border border-primary/10 shadow-inner mb-6">
                    <h3 className="font-semibold text-lg mb-3 flex items-center">
                      <Lightbulb className="h-5 w-5 text-primary mr-2" />
                      確率配分の重要ポイント
                    </h3>
                    <div className="space-y-4">
                      <p className="leading-relaxed">
                        <span className="underline decoration-primary/30 decoration-2">確率配分で最も重要なのは、全体の合計を適切に調整すること</span>です。
                        単勝確率は全馬合計で<strong className="text-primary">100%</strong>、複勝確率は全馬合計で<strong className="text-primary">300%</strong>になるように各馬に配分します。
                      </p>
                      <div className="bg-background/70 p-4 rounded-lg border border-primary/10">
                        <p className="font-medium mb-2">例: 10頭立てのレースでの確率配分</p>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-primary/10">
                                <th className="p-2 text-left">馬番</th>
                                <th className="p-2 text-center">単勝オッズ</th>
                                <th className="p-2 text-center">市場予想確率</th>
                                <th className="p-2 text-center">あなたの単勝確率</th>
                                <th className="p-2 text-center">あなたの複勝確率</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr className="border-b border-primary/10">
                                <td className="p-2">1番人気</td>
                                <td className="p-2 text-center">2.5</td>
                                <td className="p-2 text-center">40%</td>
                                <td className="p-2 text-center">35%</td>
                                <td className="p-2 text-center">70%</td>
                              </tr>
                              <tr className="border-b border-primary/10 bg-background/30">
                                <td className="p-2">2番人気</td>
                                <td className="p-2 text-center">4.0</td>
                                <td className="p-2 text-center">25%</td>
                                <td className="p-2 text-center">20%</td>
                                <td className="p-2 text-center">50%</td>
                              </tr>
                              <tr className="border-b border-primary/10">
                                <td className="p-2">3番人気</td>
                                <td className="p-2 text-center">8.0</td>
                                <td className="p-2 text-center">12.5%</td>
                                <td className="p-2 text-center">15%</td>
                                <td className="p-2 text-center">40%</td>
                              </tr>
                              <tr className="border-b border-primary/10 bg-background/30">
                                <td className="p-2">その他7頭</td>
                                <td className="p-2 text-center">10.0~</td>
                                <td className="p-2 text-center">22.5%</td>
                                <td className="p-2 text-center">30%</td>
                                <td className="p-2 text-center">140%</td>
                              </tr>
                              <tr className="bg-primary/5 font-medium">
                                <td className="p-2">合計</td>
                                <td className="p-2 text-center">-</td>
                                <td className="p-2 text-center">100%</td>
                                <td className="p-2 text-center">100%</td>
                                <td className="p-2 text-center">300%</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-5 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5">
                    <h3 className="font-semibold text-lg mb-3">精度を高めるテクニック</h3>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium mt-0.5 shadow-sm">1</div>
                        <div>
                          <p className="font-medium">過去の類似レースデータを参考にする</p>
                          <p className="text-sm text-foreground/70 mt-0.5">同じコース・距離・クラスでの過去の結果から傾向を掴みます</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium mt-0.5 shadow-sm">2</div>
                        <div>
                          <p className="font-medium">馬の調子・騎手・枠順などの要素を数値化</p>
                          <p className="text-sm text-foreground/70 mt-0.5">各要素に点数をつけて客観的に評価することで精度が上がります</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium mt-0.5 shadow-sm">3</div>
                        <div>
                          <p className="font-medium">レース条件と馬の適性をマッチングさせる</p>
                          <p className="text-sm text-foreground/70 mt-0.5">馬場状態・距離適性・脚質などの相性を重視した確率配分が重要です</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div id="optimal-betting" className="mb-12 scroll-mt-16">
            <div className="flex items-center mb-6">
              <div className="bg-primary/10 p-2.5 rounded-lg mr-3 shadow-sm">
                <Coins className="h-6 w-6 text-primary" />
              </div>
              <div>
                <span className="text-sm font-medium text-primary/70 block">SECTION 04</span>
                <h2 className="text-2xl sm:text-3xl font-bold">期待値に基づく最適な馬券構成</h2>
              </div>
            </div>

            <div className="space-y-8">
              <Card className="overflow-hidden bg-background/50 backdrop-blur-sm border-primary/10 shadow-lg hover:shadow-xl transition-shadow duration-300 scroll-animate">
                <CardHeader className="border-b border-primary/10 bg-gradient-to-r from-primary/10 to-primary/5">
                  <CardTitle className="text-foreground text-xl flex items-center">
                    <Target className="h-5 w-5 text-primary mr-2" />
                    期待値1.4の法則とリスク管理
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="p-5 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 mb-6">
                    <h3 className="font-semibold text-lg mb-3">1.4の法則とは</h3>
                    <p className="mb-4 leading-relaxed">
                      プロの競馬予想家が重視する<span className="underline decoration-primary/30 decoration-2">「期待値1.4の法則」</span>は、単に期待値が1.0を超えるだけでなく、
                      予想誤差を考慮した<strong className="text-primary">安全マージン</strong>を確保するための重要な基準です。
                    </p>
                  </div>
                  
                  <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-5 rounded-xl bg-background border-2 border-primary/10 hover:border-primary/20 transition-colors duration-300 shadow-sm space-y-3">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center">
                          <X className="h-5 w-5 text-rose-600" />
                        </div>
                        <p className="font-semibold text-lg">理論と現実のギャップ</p>
                      </div>
                      <ul className="space-y-2">
                        <li className="flex items-start gap-2">
                          <span className="text-rose-500 font-bold">•</span>
                          <span>確率予想には必ず誤差が伴う（±5〜10%程度）</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-rose-500 font-bold">•</span>
                          <span>理論上の期待値1.0では誤差でマイナスになるリスクが大きい</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-rose-500 font-bold">•</span>
                          <span>予想精度が上がっても完璧な予想は不可能</span>
                        </li>
                      </ul>
                    </div>
                    <div className="p-5 rounded-xl bg-background border-2 border-primary/10 hover:border-primary/20 transition-colors duration-300 shadow-sm space-y-3">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                          <Check className="h-5 w-5 text-emerald-600" />
                        </div>
                        <p className="font-semibold text-lg">期待値1.4以上を選ぶ理由</p>
                      </div>
                      <ul className="space-y-2">
                        <li className="flex items-start gap-2">
                          <span className="text-emerald-500 font-bold">•</span>
                          <span>予想誤差を吸収できる安全マージンを確保できる</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-emerald-500 font-bold">•</span>
                          <span>長期的に見て回収率130%以上を目指せる水準</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-emerald-500 font-bold">•</span>
                          <span>資金効率を考慮した最適な投資判断の基準</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                  
                  <div className="p-5 rounded-xl bg-primary/5 border border-primary/10 shadow-inner mb-6">
                    <h3 className="font-semibold text-lg mb-3 flex items-center">
                      <Lightbulb className="h-5 w-5 text-primary mr-2" />
                      期待値別リスク管理の指針
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="bg-primary/10">
                            <th className="p-3 border-b border-r border-primary/10">評価</th>
                            <th className="p-3 border-b border-r border-primary/10">期待値</th>
                            <th className="p-3 border-b border-r border-primary/10">投資判断</th>
                            <th className="p-3 border-b border-primary/10">理由</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="hover:bg-primary/5 transition-colors">
                            <td className="p-3 border-r border-b border-primary/10 text-center">
                              <span className="text-yellow-500 font-bold text-lg">▲</span>
                            </td>
                            <td className="p-3 border-r border-b border-primary/10 font-medium">1.0〜1.4</td>
                            <td className="p-3 border-r border-b border-primary/10">小額投資か見送り</td>
                            <td className="p-3 border-b border-primary/10 text-sm">予想誤差を考慮するとリスクが高い</td>
                          </tr>
                          <tr className="hover:bg-primary/5 transition-colors bg-background/30">
                            <td className="p-3 border-r border-b border-primary/10 text-center">
                              <span className="text-emerald-500 font-bold text-lg">○</span>
                            </td>
                            <td className="p-3 border-r border-b border-primary/10 font-medium">1.4〜1.7</td>
                            <td className="p-3 border-r border-b border-primary/10">標準的な投資額</td>
                            <td className="p-3 border-b border-primary/10 text-sm">一定のリスクはあるが投資価値あり</td>
                          </tr>
                          <tr className="hover:bg-primary/5 transition-colors">
                            <td className="p-3 border-r border-primary/10 text-center">
                              <span className="text-emerald-500 font-bold text-lg">◎</span>
                            </td>
                            <td className="p-3 border-r border-primary/10 font-medium">1.7以上</td>
                            <td className="p-3 border-r border-primary/10">積極的な投資</td>
                            <td className="p-3 border-primary/10 text-sm">予想誤差を考慮しても高い回収が期待できる</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                  
                  <div className="border-t border-primary/10 mt-6 pt-6">
                    <div className="flex items-center">
                      <Quote className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mr-2" />
                      <p className="text-sm">
                        <span className="font-medium">プロが実践する法則：</span>
                        期待値1.4以上の馬券を選ぶことで、確率予想の誤差があったとしても長期的に利益を出せる可能性が高まります。
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="overflow-hidden bg-background/50 backdrop-blur-sm border-primary/10 shadow-lg hover:shadow-xl transition-shadow duration-300 scroll-animate">
                <CardHeader className="border-b border-primary/10 bg-gradient-to-r from-primary/10 to-primary/5">
                  <CardTitle className="text-foreground text-xl flex items-center">
                    <Settings className="h-5 w-5 text-primary mr-2" />
                    資金配分の最適化戦略
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <p className="mb-5 text-base leading-relaxed">
                    期待値計算はどの馬券に投資すべきかを教えてくれますが、馬券ごとの<span className="font-semibold">投資金額の配分</span>も重要です。
                    効率的な資金配分で回収率を最大化しましょう。
                  </p>
                  
                  <div className="p-5 rounded-xl bg-primary/5 border border-primary/10 shadow-inner mb-6">
                    <h3 className="font-semibold text-lg mb-3 flex items-center">
                      <Award className="h-5 w-5 text-primary mr-2" />
                      期待値別の最適投資額ガイド
                    </h3>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-gradient-to-r from-primary/15 to-primary/5">
                            <th className="p-3 text-left border-b border-r border-primary/10 font-medium">期待値</th>
                            <th className="p-3 text-center border-b border-r border-primary/10 font-medium w-24">投資金額</th>
                            <th className="p-3 text-left border-b border-primary/10 font-medium">解説</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="hover:bg-primary/5 transition-colors">
                            <td className="p-3 border-r border-b border-primary/10 font-medium">1.0〜1.2</td>
                            <td className="p-3 border-r border-b border-primary/10 text-center bg-amber-50/50 dark:bg-amber-900/20">0〜1%</td>
                            <td className="p-3 border-b border-primary/10 text-sm">予想誤差を考慮すると実質的に期待値が1.0を下回るリスクが高い</td>
                          </tr>
                          <tr className="hover:bg-primary/5 transition-colors bg-background/30">
                            <td className="p-3 border-r border-b border-primary/10 font-medium">1.2〜1.4</td>
                            <td className="p-3 border-r border-b border-primary/10 text-center bg-amber-50/50 dark:bg-amber-900/20">1〜3%</td>
                            <td className="p-3 border-b border-primary/10 text-sm">ややリスクがあるため、合計投資額を抑える</td>
                          </tr>
                          <tr className="hover:bg-primary/5 transition-colors">
                            <td className="p-3 border-r border-b border-primary/10 font-medium">1.4〜1.7</td>
                            <td className="p-3 border-r border-b border-primary/10 text-center bg-emerald-50/50 dark:bg-emerald-900/20">3〜5%</td>
                            <td className="p-3 border-b border-primary/10 text-sm">標準的な投資価値があり、安定した回収が期待できる</td>
                          </tr>
                          <tr className="hover:bg-primary/5 transition-colors bg-background/30">
                            <td className="p-3 border-r border-b border-primary/10 font-medium">1.7〜2.0</td>
                            <td className="p-3 border-r border-b border-primary/10 text-center bg-emerald-50/50 dark:bg-emerald-900/20">5〜8%</td>
                            <td className="p-3 border-b border-primary/10 text-sm">高い期待値で、予想誤差があっても利益が期待できる</td>
                          </tr>
                          <tr className="hover:bg-primary/5 transition-colors">
                            <td className="p-3 border-r border-primary/10 font-medium">2.0以上</td>
                            <td className="p-3 border-r border-primary/10 text-center bg-emerald-50/50 dark:bg-emerald-900/20">8〜10%</td>
                            <td className="p-3 border-primary/10 text-sm">非常に高い期待値で、積極的な投資が正当化される</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <p className="text-xs text-foreground/70 mt-2">※投資金額は競馬投資用の総資金に対する割合</p>
                  </div>
                  
                  <div className="mb-6 flex flex-col md:flex-row gap-6">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-3 flex items-center">
                        <BarChart3 className="h-5 w-5 text-primary mr-2" />
                        分散投資の例
                      </h3>
                      <div className="p-4 rounded-xl bg-background border-2 border-primary/10 hover:border-primary/20 transition-colors duration-300 shadow-sm h-full">
                        <p className="font-medium mb-3">あるレースで複数の馬券が高い期待値を示した場合</p>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center p-2 bg-gradient-to-r from-emerald-50/30 dark:from-emerald-900/20 to-transparent rounded border border-emerald-200/50 dark:border-emerald-800/30">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-emerald-100/50 dark:bg-emerald-900/30 flex items-center justify-center text-sm font-medium">◎</div>
                              <span>3番単勝（期待値1.8）</span>
                            </div>
                            <span className="font-medium">総資金の6%</span>
                          </div>
                          <div className="flex justify-between items-center p-2 bg-gradient-to-r from-emerald-50/30 dark:from-emerald-900/20 to-transparent rounded border border-emerald-200/50 dark:border-emerald-800/30">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-emerald-100/50 dark:bg-emerald-900/30 flex items-center justify-center text-sm font-medium">○</div>
                              <span>3-5馬連（期待値1.5）</span>
                            </div>
                            <span className="font-medium">総資金の4%</span>
                          </div>
                          <div className="flex justify-between items-center p-2 bg-gradient-to-r from-emerald-50/30 dark:from-emerald-900/20 to-transparent rounded border border-emerald-200/50 dark:border-emerald-800/30">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-emerald-100/50 dark:bg-emerald-900/30 flex items-center justify-center text-sm font-medium">△</div>
                              <span>3-5-7三連複（期待値1.4）</span>
                            </div>
                            <span className="font-medium">総資金の3%</span>
                          </div>
                          <div className="flex justify-between items-center p-2 border-t border-primary/10 pt-3 font-medium">
                            <span>合計投資額</span>
                            <span>総資金の13%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-3 flex items-center">
                        <Lightbulb className="h-5 w-5 text-primary mr-2" />
                        資金管理の鉄則
                      </h3>
                      <div className="p-4 rounded-xl bg-background border-2 border-primary/10 hover:border-primary/20 transition-colors duration-300 shadow-sm h-full">
                        <ul className="space-y-3">
                          <li className="flex items-start gap-3">
                            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium mt-0.5 shadow-sm">1</div>
                            <div>
                              <p className="font-medium">期待値が高いほど投資額を増やす</p>
                              <p className="text-sm text-foreground/70 mt-0.5">期待値の高さに比例して投資額を決めることで効率的な資金運用が可能に</p>
                            </div>
                          </li>
                          <li className="flex items-start gap-3">
                            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium mt-0.5 shadow-sm">2</div>
                            <div>
                              <p className="font-medium">一つのレースに投資しすぎない</p>
                              <p className="text-sm text-foreground/70 mt-0.5">総資金の15〜20%を一レースの上限とすることで、リスク分散ができる</p>
                            </div>
                          </li>
                          <li className="flex items-start gap-3">
                            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium mt-0.5 shadow-sm">3</div>
                            <div>
                              <p className="font-medium">複数のレースに分散投資する</p>
                              <p className="text-sm text-foreground/70 mt-0.5">期待値1.4以上の馬券が出るレースを複数選び、分散投資することで安定性向上</p>
                            </div>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-5 rounded-xl flex items-center gap-4">
                    <div className="bg-white/80 p-3 rounded-lg shadow-sm hidden md:block">
                      <Calculator className="h-10 w-10 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-1">当サイトの期待値計算ツールを活用しよう</h3>
                      <p className="text-sm mb-3">複雑な計算をすることなく、各馬券の期待値と最適投資額を自動計算できます</p>
                      <a href="/" className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm shadow-sm">
                        <Calculator className="h-4 w-4" />
                        <span>計算ツールを使ってみる</span>
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="overflow-hidden bg-background/50 backdrop-blur-sm border-primary/10 shadow-lg hover:shadow-xl transition-shadow duration-300 scroll-animate">
                <CardHeader className="border-b border-primary/10 bg-gradient-to-r from-primary/10 to-primary/5">
                  <CardTitle className="text-foreground text-xl flex items-center">
                    <Ticket className="h-5 w-5 text-primary mr-2" />
                    馬券種別の選択ガイド
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <p className="mb-5 text-base leading-relaxed">
                    単勝確率と複勝確率から各馬券種の期待値を計算できますが、<span className="font-semibold">予想スタイルや性格に合った馬券種を選ぶ</span>ことも収益を安定させるために重要です。
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="rounded-xl overflow-hidden shadow-sm border border-primary/10">
                      <div className="bg-gradient-to-r from-rose-50 to-rose-100 dark:from-rose-950/40 dark:to-rose-900/30 p-3">
                        <div className="flex items-center gap-3">
                          <div className="bg-background p-2 rounded-lg shadow-sm">
                            <span className="text-rose-600 dark:text-rose-400 font-bold text-lg">単勝</span>
                          </div>
                          <h3 className="font-semibold text-lg">単勝馬券の特徴</h3>
                        </div>
                      </div>
                      <div className="p-4 bg-background">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <p className="font-medium text-emerald-600 dark:text-emerald-400 flex items-center">
                              <Check className="h-4 w-4 mr-1" />
                              メリット
                            </p>
                            <ul className="space-y-1 text-sm pl-5 list-disc">
                              <li>計算がシンプルで期待値が分かりやすい</li>
                              <li>的中時の回収額が大きい</li>
                              <li>期待値が高い馬を直接選べる</li>
                            </ul>
                          </div>
                          <div className="space-y-2">
                            <p className="font-medium text-rose-600 dark:text-rose-400 flex items-center">
                              <X className="h-4 w-4 mr-1" />
                              デメリット
                            </p>
                            <ul className="space-y-1 text-sm pl-5 list-disc">
                              <li>的中率が低い</li>
                              <li>連敗が続くとメンタル面で厳しい</li>
                              <li>単頭のみの予想精度に依存</li>
                            </ul>
                          </div>
                        </div>
                        <div className="border-t border-primary/10 mt-3 pt-3">
                          <p className="text-sm flex items-center gap-1">
                            <span className="bg-primary/10 p-1 rounded">向いている人：</span>
                            <span>予想精度に自信があり、高い回収を狙いたい人</span>
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="rounded-xl overflow-hidden shadow-sm border border-primary/10">
                      <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 dark:from-emerald-950/40 dark:to-emerald-900/30 p-3">
                        <div className="flex items-center gap-3">
                          <div className="bg-background p-2 rounded-lg shadow-sm">
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold text-lg">複勝</span>
                          </div>
                          <h3 className="font-semibold text-lg">複勝馬券の特徴</h3>
                        </div>
                      </div>
                      <div className="p-4 bg-background">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <p className="font-medium text-emerald-600 dark:text-emerald-400 flex items-center">
                              <Check className="h-4 w-4 mr-1" />
                              メリット
                            </p>
                            <ul className="space-y-1 text-sm pl-5 list-disc">
                              <li>的中率が高く安定している</li>
                              <li>初心者でも取り組みやすい</li>
                              <li>連敗が少なく安心感がある</li>
                            </ul>
                          </div>
                          <div className="space-y-2">
                            <p className="font-medium text-rose-600 dark:text-rose-400 flex items-center">
                              <X className="h-4 w-4 mr-1" />
                              デメリット
                            </p>
                            <ul className="space-y-1 text-sm pl-5 list-disc">
                              <li>オッズが低く大きな回収は難しい</li>
                              <li>人気馬の複勝は期待値が低いことが多い</li>
                              <li>リターンが小さい</li>
                            </ul>
                          </div>
                        </div>
                        <div className="border-t border-primary/10 mt-3 pt-3">
                          <p className="text-sm flex items-center gap-1">
                            <span className="bg-primary/10 p-1 rounded">向いている人：</span>
                            <span>安定性を重視する人、資金が少ない人、初心者</span>
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="rounded-xl overflow-hidden shadow-sm border border-primary/10">
                      <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950/40 dark:to-blue-900/30 p-3">
                        <div className="flex items-center gap-3">
                          <div className="bg-background p-2 rounded-lg shadow-sm">
                            <span className="text-blue-600 dark:text-blue-400 font-bold text-lg">馬連/ワイド</span>
                          </div>
                          <h3 className="font-semibold text-lg">馬連・ワイドの特徴</h3>
                        </div>
                      </div>
                      <div className="p-4 bg-background">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <p className="font-medium text-emerald-600 dark:text-emerald-400 flex items-center">
                              <Check className="h-4 w-4 mr-1" />
                              メリット
                            </p>
                            <ul className="space-y-1 text-sm pl-5 list-disc">
                              <li>単勝より的中率が上がる</li>
                              <li>人気と穴馬の組み合わせで高配当も</li>
                              <li>馬券種としてバランスが良い</li>
                            </ul>
                          </div>
                          <div className="space-y-2">
                            <p className="font-medium text-rose-600 dark:text-rose-400 flex items-center">
                              <X className="h-4 w-4 mr-1" />
                              デメリット
                            </p>
                            <ul className="space-y-1 text-sm pl-5 list-disc">
                              <li>2頭の予想精度が必要</li>
                              <li>期待値計算がやや複雑</li>
                              <li>組み合わせが多いと投資額が増える</li>
                            </ul>
                          </div>
                        </div>
                        <div className="border-t border-primary/10 mt-3 pt-3">
                          <p className="text-sm flex items-center gap-1">
                            <span className="bg-primary/10 p-1 rounded">向いている人：</span>
                            <span>バランス重視の人、上位数頭の力関係を把握できる人</span>
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="rounded-xl overflow-hidden shadow-sm border border-primary/10">
                      <div className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-950/40 dark:to-purple-900/30 p-3">
                        <div className="flex items-center gap-3">
                          <div className="bg-background p-2 rounded-lg shadow-sm">
                            <span className="text-purple-600 dark:text-purple-400 font-bold text-lg">三連系</span>
                          </div>
                          <h3 className="font-semibold text-lg">三連複・三連単の特徴</h3>
                        </div>
                      </div>
                      <div className="p-4 bg-background">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <p className="font-medium text-emerald-600 dark:text-emerald-400 flex items-center">
                              <Check className="h-4 w-4 mr-1" />
                              メリット
                            </p>
                            <ul className="space-y-1 text-sm pl-5 list-disc">
                              <li>高配当が期待できる</li>
                              <li>少額で大きなリターンを狙える</li>
                              <li>レース全体の読みが合えば大きな利益</li>
                            </ul>
                          </div>
                          <div className="space-y-2">
                            <p className="font-medium text-rose-600 dark:text-rose-400 flex items-center">
                              <X className="h-4 w-4 mr-1" />
                              デメリット
                            </p>
                            <ul className="space-y-1 text-sm pl-5 list-disc">
                              <li>的中率が極めて低い</li>
                              <li>期待値計算が最も複雑</li>
                              <li>抑えると投資額が膨大になりがち</li>
                            </ul>
                          </div>
                        </div>
                        <div className="border-t border-primary/10 mt-3 pt-3">
                          <p className="text-sm flex items-center gap-1">
                            <span className="bg-primary/10 p-1 rounded">向いている人：</span>
                            <span>ハイリスク・ハイリターンを好む人、レース全体を読み解ける上級者</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-5 rounded-xl mb-6">
                    <h3 className="font-semibold text-lg mb-3 flex items-center">
                      <Lightbulb className="h-5 w-5 text-primary mr-2" />
                      馬券種選択のポイント
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium mt-0.5 shadow-sm">1</div>
                        <div>
                          <p className="font-medium">予想スタイルに合った馬券種を選ぶ</p>
                          <p className="text-sm text-foreground/70 mt-0.5">自分の強みを活かせる馬券種を中心に投資しましょう</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium mt-0.5 shadow-sm">2</div>
                        <div>
                          <p className="font-medium">複数の馬券種で期待値を比較する</p>
                          <p className="text-sm text-foreground/70 mt-0.5">同じ予想から複数の馬券種の期待値を計算し、最も効率の良い馬券を選びましょう</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium mt-0.5 shadow-sm">3</div>
                        <div>
                          <p className="font-medium">レース内容に応じて最適な馬券種を選ぶ</p>
                          <p className="text-sm text-foreground/70 mt-0.5">荒れそうなレースなら三連系、堅そうなレースなら単勝・複勝など、レース特性に合わせた選択を</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Calculator className="h-10 w-10 text-indigo-600 dark:text-indigo-400 mt-1" />
                      <div>
                        <h3 className="font-semibold text-lg">期待値計算ツールで最適な馬券種を見つけよう</h3>
                        <p className="text-sm text-foreground/70">あなたの予想に基づいた最適な馬券種と投資金額を自動計算できます</p>
                      </div>
                    </div>
                    <a href="/" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm whitespace-nowrap">
                      レース一覧を見る
                    </a>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div id="ev-tools" className="mb-12 scroll-mt-16">
            <div className="flex items-center mb-6">
              <div className="bg-primary/10 p-2.5 rounded-lg mr-3 shadow-sm">
                <Calculator className="h-6 w-6 text-primary" />
              </div>
              <div>
                <span className="text-sm font-medium text-primary/70 block">SECTION 05</span>
                <h2 className="text-2xl sm:text-3xl font-bold">期待値計算ツールの使い方</h2>
              </div>
            </div>

            <div className="space-y-8">
              <Card className="overflow-hidden bg-background/50 backdrop-blur-sm border-primary/10 shadow-lg hover:shadow-xl transition-shadow duration-300 scroll-animate">
                <CardHeader className="border-b border-primary/10 bg-gradient-to-r from-primary/10 to-primary/5">
                  <CardTitle className="text-foreground text-xl flex items-center">
                    <Settings className="h-5 w-5 text-primary mr-2" />
                    期待値計算ツールで投資効率を最大化する方法
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-5 p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50">
                    <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                    <p className="text-sm">
                      期待値計算ツールを使いこなすことで、あなたの馬券購入は感覚的な予想から
                      データに基づいた投資へと変わります。科学的アプローチで収益率を向上させましょう。
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                    <div className="flex flex-col">
                      <h3 className="text-lg font-semibold mb-5 flex items-center gap-2">
                        <ArrowRight className="h-5 w-5 text-primary/80" />
                        期待値計算の基本フロー
                      </h3>
                      
                      <div className="space-y-4">
                        <div className="flex gap-3 p-3 rounded-lg bg-muted/30 border border-muted">
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex-shrink-0 flex items-center justify-center font-medium">1</div>
                          <div>
                            <p className="font-medium mb-1">レース選択</p>
                            <p className="text-sm text-muted-foreground">
                              開催日・開催場・レース番号から分析したいレースを選択します
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex gap-3 p-3 rounded-lg bg-muted/30 border border-muted">
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex-shrink-0 flex items-center justify-center font-medium">2</div>
                          <div>
                            <p className="font-medium mb-1">確率予想入力</p>
                            <p className="text-sm text-muted-foreground">
                              各馬の単勝確率と複勝確率をスライダーで入力します（合計が自動調整されます）
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex gap-3 p-3 rounded-lg bg-muted/30 border border-muted">
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex-shrink-0 flex items-center justify-center font-medium">3</div>
                          <div>
                            <p className="font-medium mb-1">予算・リスク設定</p>
                            <p className="text-sm text-muted-foreground">
                              投資予算とリスク許容度を設定し、馬券ポートフォリオを調整します
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex gap-3 p-3 rounded-lg bg-muted/30 border border-muted">
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex-shrink-0 flex items-center justify-center font-medium">4</div>
                          <div>
                            <p className="font-medium mb-1">期待値計算実行</p>
                            <p className="text-sm text-muted-foreground">
                              全馬券種の期待値を自動計算し、最適な馬券を抽出します
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex gap-3 p-3 rounded-lg bg-muted/30 border border-muted">
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex-shrink-0 flex items-center justify-center font-medium">5</div>
                          <div>
                            <p className="font-medium mb-1">馬券選択・購入</p>
                            <p className="text-sm text-muted-foreground">
                              高期待値馬券を選択し、最適配分で投資します
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col">
                      <h3 className="text-lg font-semibold mb-5 flex items-center gap-2">
                        <Lightbulb className="h-5 w-5 text-primary/80" />
                        期待値計算ツールのポイント
                      </h3>
                      
                      <div className="bg-primary/5 p-4 rounded-lg border border-primary/10 mb-5">
                        <h4 className="font-medium mb-3 pb-2 border-b border-primary/10">確率入力のコツ</h4>
                        <ul className="space-y-2 text-sm">
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                            <span>単勝確率の合計は100%になるよう調整する</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                            <span>複勝確率の合計は300%になるよう調整する</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                            <span>確率が高すぎたり低すぎたりしないよう現実的な値を入力する</span>
                          </li>
                        </ul>
                      </div>
                      
                      <div className="bg-primary/5 p-4 rounded-lg border border-primary/10">
                        <h4 className="font-medium mb-3 pb-2 border-b border-primary/10">期待値判断基準</h4>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center p-2 rounded bg-background/80 border border-muted">
                            <span className="text-sm">期待値 &lt; 0.8</span>
                            <Badge variant="outline" className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">投資非推奨</Badge>
                          </div>
                          <div className="flex justify-between items-center p-2 rounded bg-background/80 border border-muted">
                            <span className="text-sm">0.8 ≤ 期待値 &lt; 1.0</span>
                            <Badge variant="outline" className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400">要注意</Badge>
                          </div>
                          <div className="flex justify-between items-center p-2 rounded bg-background/80 border border-muted">
                            <span className="text-sm">1.0 ≤ 期待値 &lt; 1.4</span>
                            <Badge variant="outline" className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">投資検討可</Badge>
                          </div>
                          <div className="flex justify-between items-center p-2 rounded bg-background/80 border border-muted">
                            <span className="text-sm">1.4 ≤ 期待値</span>
                            <Badge variant="outline" className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">積極投資</Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold mb-5 flex items-center gap-2">
                      <Image className="h-5 w-5 text-primary/80" />
                      期待値計算ツールのスクリーンショット
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex flex-col">
                        <h4 className="font-medium mb-3 text-center">予想確率入力画面</h4>
                        <div className="border border-primary/10 rounded-lg overflow-hidden">
                          <img 
                            src="/images/Prediction.webp" 
                            alt="予想確率入力画面" 
                            className="w-full h-auto object-cover"
                          />
                        </div>
                        <p className="text-sm text-muted-foreground mt-3 text-center">
                          直感的なスライダーUIで各馬の勝率・複勝率を簡単に入力できます
                        </p>
                      </div>
                      
                      <div className="flex flex-col">
                        <h4 className="font-medium mb-3 text-center">期待値計算結果画面</h4>
                        <div className="border border-primary/10 rounded-lg overflow-hidden">
                          <img 
                            src="/images/Output.webp" 
                            alt="期待値計算結果画面" 
                            className="w-full h-auto object-cover"
                          />
                        </div>
                        <p className="text-sm text-muted-foreground mt-3 text-center">
                          馬券種別ごとの期待値を一覧表示し、最適な投資判断をサポートします
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-lg p-4">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <InfoIcon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      効果的な活用ポイント
                    </h4>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <ArrowRight className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                        <span>複数のレースで期待値計算を行い、最も期待値の高いレースに投資集中する</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <ArrowRight className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                        <span>期待値の計算結果を記録し、予想と実績の差を分析して予想精度を向上させる</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <ArrowRight className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                        <span>最終オッズを使って再計算し、オッズ変動による期待値の変化に対応する</span>
                      </li>
                    </ul>
                  </div>
                  
                  <div className="mt-4 p-4 rounded-lg bg-muted/40 border border-muted">
                    <div className="flex items-center gap-2 mb-3">
                      <Lightbulb className="h-5 w-5 text-primary" />
                      <h4 className="font-medium">次のステップ</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      期待値計算ツールの基本的な使い方を理解したら、次のセクションで実際のレースデータを使った
                      実践的なトレーニングに進みましょう。リアルなレース例を通して期待値計算の応用力を高めます。
                    </p>
                    <a href="#ev-training" className="text-sm text-primary flex items-center gap-1 hover:underline">
                      <ArrowRight className="h-4 w-4" />
                      <span>期待値計算プロの実践トレーニングへ進む</span>
                    </a>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div id="ev-training" className="mb-12 scroll-mt-16">
            <div className="flex items-center mb-6">
              <div className="bg-primary/10 p-2.5 rounded-lg mr-3 shadow-sm">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <div>
                <span className="text-sm font-medium text-primary/70 block">SECTION 06</span>
                <h2 className="text-2xl sm:text-3xl font-bold">期待値計算プロの実践トレーニング</h2>
              </div>
            </div>

            <div className="space-y-8">
              <Card className="overflow-hidden bg-background/50 backdrop-blur-sm border-primary/10 shadow-lg hover:shadow-xl transition-shadow duration-300 scroll-animate">
                <CardHeader className="border-b border-primary/10 bg-gradient-to-r from-primary/10 to-primary/5">
                  <CardTitle className="text-foreground text-xl flex items-center">
                    <Target className="h-5 w-5 text-primary mr-2" />
                    実戦で使える期待値計算の応用テクニック
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-5 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50">
                    <Info className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                    <p className="text-sm">
                      高松宮記念（G1）のレースデータを使用して、実践的な期待値計算プロセスを体験します。
                      実際のレースデータから期待値を導き出し、最適な馬券選択の方法を習得しましょう。
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="flex flex-col">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <CircleArrowDownIcon className="h-5 w-5 text-primary/80" />
                        実践的な期待値計算のステップ
                      </h3>
                      <ol className="space-y-3 pl-2">
                        <li className="relative pl-8 pb-3 border-l border-primary/20">
                          <div className="absolute left-0 top-0 flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 border border-primary/30 -translate-x-1/2">
                            <span className="text-xs font-semibold text-primary">1</span>
                          </div>
                          <h4 className="font-medium mb-1">専門的なレース分析</h4>
                          <p className="text-sm text-muted-foreground">過去走・血統・適性・調教などの深い分析</p>
                        </li>
                        <li className="relative pl-8 pb-3 border-l border-primary/20">
                          <div className="absolute left-0 top-0 flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 border border-primary/30 -translate-x-1/2">
                            <span className="text-xs font-semibold text-primary">2</span>
                          </div>
                          <h4 className="font-medium mb-1">精密確率予想</h4>
                          <p className="text-sm text-muted-foreground">複合要素を考慮した勝率・複勝率の精密予想</p>
                        </li>
                        <li className="relative pl-8 pb-3 border-l border-primary/20">
                          <div className="absolute left-0 top-0 flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 border border-primary/30 -translate-x-1/2">
                            <span className="text-xs font-semibold text-primary">3</span>
                          </div>
                          <h4 className="font-medium mb-1">オッズの批判的分析</h4>
                          <p className="text-sm text-muted-foreground">市場心理とオッズの歪みを分析し価値を発見</p>
                        </li>
                        <li className="relative pl-8 pb-3 border-l border-primary/20">
                          <div className="absolute left-0 top-0 flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 border border-primary/30 -translate-x-1/2">
                            <span className="text-xs font-semibold text-primary">4</span>
                          </div>
                          <h4 className="font-medium mb-1">高度期待値計算</h4>
                          <p className="text-sm text-muted-foreground">馬券の相関関係も考慮した詳細な期待値計算</p>
                        </li>
                        <li className="relative pl-8">
                          <div className="absolute left-0 top-0 flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 border border-primary/30 -translate-x-1/2">
                            <span className="text-xs font-semibold text-primary">5</span>
                          </div>
                          <h4 className="font-medium mb-1">最適投資配分</h4>
                          <p className="text-sm text-muted-foreground">期待値とリスクを考慮した資金配分の最適化</p>
                        </li>
                      </ol>
                    </div>
                    
                    <div className="flex flex-col">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <LineChartIcon className="h-5 w-5 text-primary/80" />
                        プロの期待値計算実践テクニック
                      </h3>
                      <div className="space-y-3 pl-2">
                        <div className="flex items-start gap-2">
                          <div className="p-1.5 rounded-md bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                            <TrendingUp className="h-4 w-4" />
                          </div>
                          <div>
                            <h4 className="font-medium mb-0.5">相対価値の発見</h4>
                            <p className="text-sm text-muted-foreground">公式オッズと自己予想の差から価値を見出す</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <div className="p-1.5 rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                            <Brain className="h-4 w-4" />
                          </div>
                          <div>
                            <h4 className="font-medium mb-0.5">複合期待値の活用</h4>
                            <p className="text-sm text-muted-foreground">複数種類の馬券を組み合わせたリスク分散投資</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <div className="p-1.5 rounded-md bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                            <BadgeDollarSign className="h-4 w-4" />
                          </div>
                          <div>
                            <h4 className="font-medium mb-0.5">資金配分の最適化</h4>
                            <p className="text-sm text-muted-foreground">ケリー基準を応用した最適資金配分戦略</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <div className="p-1.5 rounded-md bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                            <Gauge className="h-4 w-4" />
                          </div>
                          <div>
                            <h4 className="font-medium mb-0.5">リスク調整期待値</h4>
                            <p className="text-sm text-muted-foreground">変動リスクを考慮した高度な期待値分析</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-6 p-5 rounded-xl bg-background border border-primary/10 shadow-sm">
                    <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                      <Flag className="h-5 w-5 text-primary" />
                      高松宮記念（G1）期待値計算実践例
                    </h3>
                    
                    <div className="overflow-x-auto mb-5">
                      <table className="w-full min-w-[600px] border-collapse">
                        <thead>
                          <tr className="bg-muted/50">
                            <th className="p-2 text-sm font-medium text-left border-b">枠番</th>
                            <th className="p-2 text-sm font-medium text-left border-b">馬番</th>
                            <th className="p-2 text-sm font-medium text-left border-b">馬名</th>
                            <th className="p-2 text-sm font-medium text-left border-b">単勝オッズ</th>
                            <th className="p-2 text-sm font-medium text-left border-b">予想確率</th>
                            <th className="p-2 text-sm font-medium text-left border-b">期待値</th>
                            <th className="p-2 text-sm font-medium text-left border-b">評価</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="hover:bg-muted/30">
                            <td className="p-2 text-sm border-b">1</td>
                            <td className="p-2 text-sm border-b">1</td>
                            <td className="p-2 text-sm border-b">マッドクール</td>
                            <td className="p-2 text-sm border-b">7.1</td>
                            <td className="p-2 text-sm border-b">10%</td>
                            <td className="p-2 text-sm border-b">0.71</td>
                            <td className="p-2 text-sm border-b"><Badge variant="outline" className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400">要注意</Badge></td>
                          </tr>
                          <tr className="hover:bg-muted/30">
                            <td className="p-2 text-sm border-b">3</td>
                            <td className="p-2 text-sm border-b">6</td>
                            <td className="p-2 text-sm border-b">ルガル</td>
                            <td className="p-2 text-sm border-b">5.7</td>
                            <td className="p-2 text-sm border-b">10%</td>
                            <td className="p-2 text-sm border-b">0.57</td>
                            <td className="p-2 text-sm border-b"><Badge variant="outline" className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">低</Badge></td>
                          </tr>
                          <tr className="hover:bg-muted/30">
                            <td className="p-2 text-sm border-b">6</td>
                            <td className="p-2 text-sm border-b">10</td>
                            <td className="p-2 text-sm border-b">サトノレーヴ</td>
                            <td className="p-2 text-sm border-b">3.8</td>
                            <td className="p-2 text-sm border-b">30%</td>
                            <td className="p-2 text-sm border-b">1.14</td>
                            <td className="p-2 text-sm border-b"><Badge variant="outline" className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">良</Badge></td>
                          </tr>
                          <tr className="hover:bg-muted/30">
                            <td className="p-2 text-sm border-b">6</td>
                            <td className="p-2 text-sm border-b">12</td>
                            <td className="p-2 text-sm border-b">トウシンマカオ</td>
                            <td className="p-2 text-sm border-b">7.3</td>
                            <td className="p-2 text-sm border-b">15%</td>
                            <td className="p-2 text-sm border-b">1.10</td>
                            <td className="p-2 text-sm border-b"><Badge variant="outline" className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">良</Badge></td>
                          </tr>
                          <tr className="hover:bg-muted/30">
                            <td className="p-2 text-sm border-b">7</td>
                            <td className="p-2 text-sm border-b">14</td>
                            <td className="p-2 text-sm border-b">ナムラクレア</td>
                            <td className="p-2 text-sm border-b">3.5</td>
                            <td className="p-2 text-sm border-b">25%</td>
                            <td className="p-2 text-sm border-b">0.88</td>
                            <td className="p-2 text-sm border-b"><Badge variant="outline" className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400">要注意</Badge></td>
                          </tr>
                          <tr className="hover:bg-muted/30">
                            <td className="p-2 text-sm border-b">7</td>
                            <td className="p-2 text-sm border-b">15</td>
                            <td className="p-2 text-sm border-b">ママコチャ</td>
                            <td className="p-2 text-sm border-b">14.6</td>
                            <td className="p-2 text-sm border-b">10%</td>
                            <td className="p-2 text-sm border-b">1.46</td>
                            <td className="p-2 text-sm border-b"><Badge variant="outline" className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">積極投資</Badge></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                      <div className="flex flex-col p-4 rounded-lg bg-muted/30 border border-muted">
                        <h4 className="font-medium mb-3 pb-2 border-b border-border">単勝馬券の期待値分析</h4>
                        <ul className="space-y-2">
                          <li className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                            <span><strong>ママコチャ</strong>: 期待値1.46が最も高く、積極的な投資対象です</span>
                          </li>
                          <li className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                            <span><strong>サトノレーヴ</strong>: 期待値1.14と<strong>トウシンマカオ</strong>: 期待値1.10も投資検討可能です</span>
                          </li>
                          <li className="flex items-start gap-2 text-sm">
                            <XCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                            <span><strong>ルガル</strong>: 期待値0.57は極めて低く、投資対象外です</span>
                          </li>
                          <li className="flex items-start gap-2 text-sm">
                            <Info className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                            <span><strong>マッドクール</strong>: 期待値0.71と<strong>ナムラクレア</strong>: 期待値0.88は境界線下のため、投資は慎重に検討</span>
                          </li>
                        </ul>
                      </div>
                      
                      <div className="flex flex-col p-4 rounded-lg bg-muted/30 border border-muted">
                        <h4 className="font-medium mb-3 pb-2 border-b border-border">最適投資配分（予算10,000円）</h4>
                        <div className="space-y-3">
                          <div className="flex items-center">
                            <span className="text-sm w-32">ママコチャ(15番)</span>
                            <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-primary/70 rounded-full" style={{ width: '45%' }}></div>
                            </div>
                            <span className="text-sm font-medium ml-2">4,500円</span>
                          </div>
                          <div className="flex items-center">
                            <span className="text-sm w-32">サトノレーヴ(10番)</span>
                            <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-primary/70 rounded-full" style={{ width: '30%' }}></div>
                            </div>
                            <span className="text-sm font-medium ml-2">3,000円</span>
                          </div>
                          <div className="flex items-center">
                            <span className="text-sm w-32">トウシンマカオ(12番)</span>
                            <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-primary/70 rounded-full" style={{ width: '25%' }}></div>
                            </div>
                            <span className="text-sm font-medium ml-2">2,500円</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/30">
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <LightbulbIcon className="h-4 w-4 text-blue-500" />
                        期待値計算の実践ポイント
                      </h4>
                      <ul className="space-y-1.5 text-sm">
                        <li className="flex items-start gap-2">
                          <CircleCheck className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                          <span>期待値1.4以上は積極投資、1.0〜1.4は通常投資、0.8〜1.0は慎重投資</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CircleCheck className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                          <span>期待値が高い順に投資配分することで資金効率を最大化できます</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CircleCheck className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                          <span>オッズが高い期待値馬券はリスクも高いため、投資比率調整が必要です</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                  
                </CardContent>
              </Card>
            </div>
          </div>

          <div id="faq" className="mb-12 scroll-mt-16">
            <div className="flex items-center mb-6">
              <div className="bg-primary/10 p-2.5 rounded-lg mr-3 shadow-sm">
                <Info className="h-6 w-6 text-primary" />
              </div>
              <div>
                <span className="text-sm font-medium text-primary/70 block">SECTION 07</span>
                <h2 className="text-2xl sm:text-3xl font-bold">期待値計算と確率計算に関するよくある質問</h2>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="overflow-hidden bg-background/50 backdrop-blur-sm border-primary/10 shadow-sm hover:shadow-md transition-all duration-300 hover:border-primary/20">
                <CardHeader className="bg-primary/5 border-b border-primary/10 pb-3">
                  <CardTitle className="text-foreground flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">1</span>
                    <span>競馬の期待値計算とは何ですか？</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <p>競馬の期待値計算とは、オッズと予想勝率から理論上の投資価値を算出する方法です。「期待値 = オッズ × 的中確率」の式で計算され、期待値が1以上なら理論上は利益が期待できます。</p>
                </CardContent>
              </Card>
              
              <Card className="overflow-hidden bg-background/50 backdrop-blur-sm border-primary/10 shadow-sm hover:shadow-md transition-all duration-300 hover:border-primary/20">
                <CardHeader className="bg-primary/5 border-b border-primary/10 pb-3">
                  <CardTitle className="text-foreground flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">2</span>
                    <span>競馬の期待値計算で本当に回収率は上がりますか？</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <p>はい、期待値計算を正しく活用することで長期的な回収率向上が期待できます。特に期待値1.4以上の馬券を狙うことで、予想の誤差を考慮しても利益につながりやすくなります。オッズと自分の予想確率の差を正確に見つけられれば、期待値の高い馬券を選択でき、長期的な競馬投資の回収率アップにつながります。</p>
                </CardContent>
              </Card>
              
              <Card className="overflow-hidden bg-background/50 backdrop-blur-sm border-primary/10 shadow-sm hover:shadow-md transition-all duration-300 hover:border-primary/20">
                <CardHeader className="bg-primary/5 border-b border-primary/10 pb-3">
                  <CardTitle className="text-foreground flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">3</span>
                    <span>単勝の期待値計算と複勝の期待値計算、どちらが重要ですか？</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <p>両方重要ですが、複勝の期待値計算は初心者向けに安定性があります。単勝の期待値計算はリターンが大きい反面、的中率が低くなります。理想的には、単勝確率と複勝確率の両方を予想し、それぞれの期待値を計算した上で、より期待値の高い方を選ぶ、あるいは両方に賭けることも戦略として有効です。</p>
                </CardContent>
              </Card>
              
              <Card className="overflow-hidden bg-background/50 backdrop-blur-sm border-primary/10 shadow-sm hover:shadow-md transition-all duration-300 hover:border-primary/20">
                <CardHeader className="bg-primary/5 border-b border-primary/10 pb-3">
                  <CardTitle className="text-foreground flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">4</span>
                    <span>競馬の期待値計算ツールはどのような馬券種類に対応していますか？</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <p>期待値計算ツールは、単勝、複勝、馬連、馬単、ワイド、三連複、三連単など、JRAの主要な馬券種類すべてに対応しています。単勝確率と複勝確率を入力するだけで、すべての券種について期待値計算を行い、最も期待値の高い馬券種類と組み合わせを自動的に抽出します。これにより効率的な馬券選択が可能になります。</p>
                </CardContent>
              </Card>
              
              <Card className="overflow-hidden bg-background/50 backdrop-blur-sm border-primary/10 shadow-sm hover:shadow-md transition-all duration-300 hover:border-primary/20">
                <CardHeader className="bg-primary/5 border-b border-primary/10 pb-3">
                  <CardTitle className="text-foreground flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">5</span>
                    <span>競馬で期待値が高い馬券を見つけるコツはありますか？</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <p>期待値の高い馬券を見つけるコツは、①人気になっていない実力馬を見つける（休み明け、斤量増など理由がある場合）、②血統と適性を重視する（特定の条件に適した血統背景を持つ人気薄の馬）、③馬場状態の変化に注目する（雨などによる変化はオッズに十分反映されないことが多い）。これらの要素を考慮した精度の高い勝率予想が期待値計算の基礎となります。</p>
                </CardContent>
              </Card>
              
              <Card className="overflow-hidden bg-background/50 backdrop-blur-sm border-primary/10 shadow-sm hover:shadow-md transition-all duration-300 hover:border-primary/20">
                <CardHeader className="bg-primary/5 border-b border-primary/10 pb-3">
                  <CardTitle className="text-foreground flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">6</span>
                    <span>競馬の期待値と回収率の関係を教えてください</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <p>期待値と回収率には密接な関係があります。期待値は理論上の投資価値を示す指標で、期待値1.0は理論的回収率100%、期待値1.5なら理論的回収率150%を意味します。ただし実際には予想精度も影響するため、プロの競馬予想家は「期待値1.4以上」を投資判断の目安としています。期待値の高い馬券に継続的に投資することで、長期的な回収率向上が期待できます。</p>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="mt-16 text-center bg-gradient-to-b from-primary/5 to-background p-8 rounded-2xl border border-primary/10 shadow-sm">
            <h2 className="text-2xl font-bold mb-4">最新のレース情報をチェックして馬券戦略を立てよう</h2>
            <p className="text-lg text-muted-foreground mb-6">
              学んだ期待値の考え方を実際のレースに活用して、より効率的な馬券選びを始めましょう。
              最新のレース情報をチェックして、あなたの競馬予想を次のレベルに引き上げませんか？
            </p>
            <Link 
              to="/" 
              className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-8 py-3 text-lg font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
            >
              <Calendar className="h-5 w-5" />
              <span>レース一覧を見る</span>
            </Link>
          </div>
        </div>
        
        {/* サイドバー - 今週のレース情報 */}
        <div className="lg:col-span-1">
          <div className="sticky top-16">
            <div className="bg-background/50 backdrop-blur-sm rounded-xl p-4 border border-primary/10 shadow-sm mb-6">
              <div className="flex items-center mb-3">
                <Calendar className="h-5 w-5 mr-2 text-primary" />
                <h2 className="text-lg font-bold">今週のレース</h2>
              </div>    
              <ThisWeekRaces />
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
} 