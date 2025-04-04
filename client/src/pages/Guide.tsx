import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import MainLayout from "@/components/layout/MainLayout";
import { Ticket, Calendar, Coins, Trophy, ChevronRight, Info, Award, BarChart3, Calculator, X, Check, Lightbulb, BookOpen, Settings, TrendingUp, Target, Pencil, ArrowRight, CheckCircle2, XCircle, InfoIcon, Quote, CircleArrowDownIcon, LineChartIcon, Brain, BadgeDollarSign, Gauge, Flag, LightbulbIcon, CircleCheck, Camera, BarChart3Icon, Image, Search, ArrowDownRight, ArrowUpRight, ArrowDown, ArrowUp, Percent, SearchIcon, ThumbsUp, Wallet, CircleDollarSign, LineChart, Circle, AlertTriangle, CalendarDays, Play, Star, Zap, SplitSquareVertical, ShieldAlert, Share, ArrowUpCircle } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { useThemeStore } from "@/stores/themeStore";
import { Link, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Race } from "@db/schema";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { memo, useCallback, useMemo, useEffect, useState } from "react";
import { isSameDay, subDays } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InlineBadge } from "@/components/ui/inline-badge";

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

// スクロールトップボタンコンポーネント
const ScrollToTopButton = () => {
  const [visible, setVisible] = useState(false);
  const { theme } = useThemeStore();

  const toggleVisible = () => {
    const scrolled = document.documentElement.scrollTop;
    if (scrolled > 300) {
      setVisible(true);
    } else {
      setVisible(false);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  useEffect(() => {
    window.addEventListener('scroll', toggleVisible);
    return () => window.removeEventListener('scroll', toggleVisible);
  }, []);

  return (
    <button
      onClick={scrollToTop}
      className={`fixed bottom-6 right-6 bg-primary/90 hover:bg-primary text-white p-3 rounded-full shadow-xl hover:shadow-primary/20 transition-all duration-300 z-50 backdrop-blur-sm border border-primary/20 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'
      } flex items-center justify-center`}
      aria-label="ページ上部へ戻る"
    >
      <ArrowUpCircle className="h-6 w-6 animate-pulse" />
    </button>
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
      
      {/* スクロールトップボタン */}
      <ScrollToTopButton />
      
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

          <div id="what-is-ev" className="mb-10 scroll-mt-16 section-highlight animate-fadeIn" style={{ animationDelay: 'calc(var(--animation-stagger) * 8)' }}>
            <div className="flex items-center mb-4">
              <div className="bg-primary/10 p-2 rounded-lg mr-2 shadow-sm">
                <Calculator className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <div>
                <span className="text-xs font-medium text-primary/70 block">01</span>
                <h2 className="text-lg sm:text-3xl font-bold">競馬の期待値思考</h2>
              </div>
            </div>

            <div className="space-y-4 sm:space-y-6">
              {/* 勝ち続ける競馬の原則 - 先に表示 */}
              <div className="p-3 sm:p-5 rounded-lg bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 border border-primary/20 shadow-sm">
                <div className="flex items-center mb-2">
                  <div className="w-6 sm:w-10 h-6 sm:h-10 rounded-full bg-primary/20 flex items-center justify-center mr-2.5">
                    <Trophy className="h-3 sm:h-5 w-3 sm:w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-xl font-bold">勝ち続ける競馬の原則</h3>
                    <p className="text-xs sm:text-base text-primary/80">期待値が高い馬券を買う</p>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-primary/10">
                  <div className="flex items-center">
                    <Check className="h-3.5 w-3.5 text-green-500 mr-1.5 flex-shrink-0" />
                    <p className="text-[10px] sm:text-sm">
                      <span className="font-medium">期待値 = 予想確率 × オッズ</span>
                      <span className="text-foreground/70 ml-1">（1.0より大きければ理論上勝てる）</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* 1つ目のカード：なぜ「印」ではなく「確率」で予想するのか */}
              <Card className="overflow-hidden bg-background/50 backdrop-blur-sm border-primary/10 shadow-md scroll-animate">
                <CardHeader className="border-b border-primary/5 bg-primary/5 py-2.5 px-3 sm:px-6">
                  <CardTitle className="text-foreground text-sm sm:text-lg flex items-center">
                  <Pencil className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary mr-1.5" />
                    印 vs 確率：予想手法の違い
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-3 px-3 sm:px-6 sm:pt-4">
                  
                  {/* ビジュアル比較図を最適化 */}
                  <div className="mb-4 border border-primary/10 p-3 rounded-lg bg-background/70 shadow-sm">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="relative">
                        <div className="absolute top-0 right-0 bg-red-500/10 text-red-500 text-[10px] font-medium py-0.5 px-1.5 rounded-full border border-red-500/20">従来型</div>
                        <div className="border-2 border-dashed border-red-500/30 p-2 rounded-lg h-full flex flex-col items-center justify-center">
                          <div className="w-12 sm:w-24 h-12 sm:h-24 mx-auto mb-1.5 flex items-center justify-center bg-red-500/5 rounded-full">
                            <div className="text-red-500 font-bold text-xl sm:text-4xl">◎○▲</div>
                          </div>
                          <div className="text-center">
                            <p className="text-xs font-medium">印予想</p>
                            <p className="text-[12px] text-red-500/80">「なんとなく」</p>
                          </div>
                        </div>
                      </div>
                      <div className="relative">
                        <div className="absolute top-0 right-0 bg-green-500/10 text-green-500 text-[10px] font-medium py-0.5 px-1.5 rounded-full border border-green-500/20">期待値</div>
                        <div className="border-2 border-dashed border-green-500/30 p-2 rounded-lg h-full flex flex-col items-center justify-center">
                          <div className="w-12 sm:w-24 h-12 sm:h-24 mx-auto mb-1.5 flex items-center justify-center bg-green-500/5 rounded-full">
                            <div className="text-center">
                              <div className="text-green-500 font-bold text-xs sm:text-sm">40% × 3.5倍</div>
                              <div className="text-green-500 font-bold text-xs sm:text-sm">= 1.4</div>
                            </div>
                          </div>
                          <div className="text-center">
                            <p className="text-xs font-medium">確率予想</p>
                            <p className="text-[12px] text-green-500/80">「数値で判断」</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6 stagger-container mb-4">
                    <div className="p-2.5 sm:p-4 rounded-lg bg-red-500/10 space-y-1 border border-red-500/20 shadow-sm scroll-animate-left">
                      <p className="font-semibold text-red-500 flex items-center gap-1 text-xs sm:text-base mb-1">
                        <X className="h-3 w-3 sm:h-4 sm:w-4" />
                        印予想の限界
                      </p>
                      <ul className="space-y-1 text-[10px] sm:text-sm">
                        <li className="flex items-start gap-1.5">
                          <span className="min-w-3.5 w-3.5 h-3.5 rounded-full bg-red-500/20 flex items-center justify-center text-[8px] font-medium mt-0.5 flex-shrink-0">×</span>
                          <span>馬券の「価値」がわからない</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <span className="min-w-3.5 w-3.5 h-3.5 rounded-full bg-red-500/20 flex items-center justify-center text-[8px] font-medium mt-0.5 flex-shrink-0">×</span>
                          <span>オッズ対比の判断不可</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <span className="min-w-3.5 w-3.5 h-3.5 rounded-full bg-red-500/20 flex items-center justify-center text-[8px] font-medium mt-0.5 flex-shrink-0">×</span>
                          <span>資金配分を最適化できない</span>
                        </li>
                      </ul>
                    </div>
                    <div className="p-2.5 sm:p-4 rounded-lg bg-green-500/10 space-y-1 border border-green-500/20 shadow-sm scroll-animate-right">
                      <p className="font-semibold text-green-500 flex items-center gap-1 text-xs sm:text-base mb-1">
                        <Check className="h-3 w-3 sm:h-4 sm:w-4" />
                        確率予想の優位性
                      </p>
                      <ul className="space-y-1 text-[10px] sm:text-sm">
                        <li className="flex items-start gap-1.5">
                          <span className="min-w-3.5 w-3.5 h-3.5 rounded-full bg-green-500/20 flex items-center justify-center text-[8px] font-medium mt-0.5 flex-shrink-0">○</span>
                          <span>馬の勝率を数値化できる</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <span className="min-w-3.5 w-3.5 h-3.5 rounded-full bg-green-500/20 flex items-center justify-center text-[8px] font-medium mt-0.5 flex-shrink-0">○</span>
                          <span>投資価値を計算可能</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <span className="min-w-3.5 w-3.5 h-3.5 rounded-full bg-green-500/20 flex items-center justify-center text-[8px] font-medium mt-0.5 flex-shrink-0">○</span>
                          <span>資金配分を最適化できる</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 2つ目のカード：競馬における期待値の定義と計算方法 */}
              <Card className="overflow-hidden bg-background/50 backdrop-blur-sm border-primary/10 shadow-md scroll-animate">
                <CardHeader className="border-b border-primary/5 bg-primary/5 py-2.5 px-3 sm:px-6">
                  <CardTitle className="text-foreground text-sm sm:text-lg flex items-center">
                    <Calculator className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary mr-1.5" />
                    期待値の計算と実践
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-3 px-3 sm:px-6 sm:pt-4">
                  {/* 視覚的な期待値計算の例をより簡潔に */}
                  <div className="mb-3 border border-primary/10 p-2.5 rounded-lg bg-background/70 shadow-sm">
                    <h4 className="text-center font-semibold text-primary mb-2 text-xs">期待値の計算方法</h4>
                    <div className="grid grid-cols-3 sm:grid-cols-5 items-center justify-center gap-1 text-center">
                      <div className="flex flex-col items-center">
                        <div className="w-9 sm:w-16 h-9 sm:h-16 rounded-full bg-primary/10 flex items-center justify-center mb-1">
                          <Image className="h-4 sm:h-7 w-4 sm:w-7 text-primary" />
                        </div>
                        <p className="text-[8px] sm:text-xs font-medium">予想確率</p>
                        <p className="text-sm sm:text-xl font-bold text-primary">20%</p>
                      </div>
                      
                      <div className="text-base sm:text-3xl font-bold text-primary hidden sm:block">×</div>
                      
                      <div className="flex flex-col items-center">
                        <div className="w-9 sm:w-16 h-9 sm:h-16 rounded-full bg-primary/10 flex items-center justify-center mb-1">
                          <Coins className="h-4 sm:h-7 w-4 sm:w-7 text-primary" />
                        </div>
                        <p className="text-[8px] sm:text-xs font-medium">オッズ</p>
                        <p className="text-sm sm:text-xl font-bold text-primary">8.0倍</p>
                      </div>
                      
                      <div className="text-base sm:text-3xl font-bold text-primary hidden sm:block">=</div>
                      
                      <div className="flex flex-col items-center">
                        <div className="w-9 sm:w-16 h-9 sm:h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-1">
                          <Calculator className="h-4 sm:h-7 w-4 sm:w-7 text-green-500" />
                        </div>
                        <p className="text-[8px] sm:text-xs font-medium">期待値</p>
                        <p className="text-sm sm:text-xl font-bold text-green-500">1.6</p>
                        <p className="text-[8px] text-green-500/80">買いの馬券</p>
                      </div>

                      {/* モバイル表示用の数式 */}
                      <div className="col-span-3 text-center text-[9px] block sm:hidden mt-1.5 bg-primary/5 py-1 px-1 rounded-md">
                        <span className="font-semibold">20% × 8.0倍 = <span className="text-green-500 font-bold">1.6</span></span>
                      </div>
                    </div>
                  </div>
                  
                  {/* 実質期待値のコンパクトバージョン */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    <div className="p-2.5 sm:p-4 rounded-lg bg-green-500/10 border border-green-500/20 shadow-sm">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <div className="p-1 rounded-full bg-green-500/20">
                          <Award className="h-3 w-3 text-green-500" />
                        </div>
                        <h4 className="text-xs sm:text-base font-medium text-green-500/90">予想の誤差を考慮する</h4>
                      </div>
                      
                      <div className="bg-background/80 p-2 rounded-md border border-green-500/10 text-[9px] sm:text-xs">
                        <div className="flex justify-between items-center mb-1">
                          <span>あなたの予想：<span className="font-medium">30%</span></span>
                          <span>実際の結果：<span className="font-medium text-red-500">20%</span></span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden mb-1.5">
                          <div className="bg-red-400 h-full" style={{ width: '66%' }}></div>
                        </div>
                        <p className="text-center font-medium">
                          期待値は<span className="text-green-500">1.4以上</span>を目安に
                        </p>
                      </div>
                    </div>
                    
                    <div className="p-2.5 sm:p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 shadow-sm">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <div className="p-1 rounded-full bg-amber-500/20">
                          <TrendingUp className="h-3 w-3 text-amber-500" />
                        </div>
                        <h4 className="text-xs sm:text-base font-medium text-amber-500/90">長期的な成績比較</h4>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-[9px] sm:text-xs">
                        <div className="p-1.5 rounded-md border border-red-400/30 text-center">
                          <p className="mb-1 font-medium">印予想派</p>
                          <p className="text-xs sm:text-lg font-bold text-red-500">-25%</p>
                        </div>
                        
                        <div className="p-1.5 rounded-md border border-green-400/30 text-center">
                          <p className="mb-1 font-medium">期待値思考派</p>
                          <p className="text-xs sm:text-lg font-bold text-green-500">+40%</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
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
                  <CardTitle className="text-foreground text-lg sm:text-xl flex items-center">
                    <TrendingUp className="h-4 sm:h-5 w-4 sm:w-5 text-primary mr-2" />
                    期待値で見極める勝率のギャップ
                  </CardTitle>
                </CardHeader>
                
                <CardContent className="pt-4 sm:pt-6">
                  <div className="mb-5 p-4 sm:p-5 rounded-xl bg-green-500/5 border border-green-500/20 shadow-sm">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-3">
                      <div className="p-2 rounded-full bg-green-500/20 flex-shrink-0">
                        <Lightbulb className="h-5 w-5 text-green-500" />
                      </div>
                      <p className="text-sm sm:text-base leading-relaxed">
                        競馬の予想で大切なのは<span className="font-semibold">「あなたの予想と市場の予想（オッズ）の差」</span>です。
                        単勝オッズ2倍の1番人気と単勝オッズ10倍の穴馬を比較し、どちらを買うべきか見てみましょう。
                      </p>
                    </div>
                    
                    <div className="relative rounded-lg bg-background/80 overflow-hidden">
                      <div className="absolute top-0 right-0 z-10 bg-green-500/20 text-green-600 text-xs font-medium py-1 px-2 rounded-bl-lg">
                        <div className="flex items-center">
                          <Info className="h-3 w-3 mr-1" />
                          <span>ポイント</span>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row items-center pt-8 pb-4 px-4">
                        <div className="text-center mb-4 sm:mb-0 sm:mr-8">
                          <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-green-500/20 to-green-700/20 flex items-center justify-center">
                            <Search className="h-7 w-7 text-green-600" />
                          </div>
                          <p className="mt-2 text-sm font-medium text-green-700">ギャップを探せ</p>
                        </div>
                        <div className="text-sm sm:text-base leading-relaxed space-y-2">
                          <p>● <span className="font-medium">市場よりも高く勝率を予想</span>できる馬 = <span className="text-green-600 font-medium">期待値が高い</span></p>
                          <p>● <span className="font-medium">市場よりも低く勝率を予想</span>する馬 = <span className="text-red-500 font-medium">期待値が低い</span></p>
                          <p>● <span className="font-medium">あなたの予想と市場の予想が一致</span> = <span className="font-medium">期待値は1.0</span></p>
                          <p className="pt-1 text-green-600 italic">「市場の"すきま"を見つけることが期待値投資の本質」</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 視覚的比較をカード形式で表示 */}
                  <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div className="rounded-xl bg-background/90 border-2 border-red-400/30 shadow-sm overflow-hidden transition-all hover:shadow-md">
                      <div className="bg-red-500/10 p-3 sm:p-4 border-b border-red-500/20">
                        <div className="flex items-center">
                          <div className="w-8 sm:w-10 h-8 sm:h-10 rounded-full bg-red-100 flex items-center justify-center mr-3">
                            <span className="text-red-600 font-bold text-xs sm:text-sm">1番</span>
                          </div>
                          <div>
                            <p className="font-semibold text-base sm:text-lg">単勝オッズ2.0倍の1番人気</p>
                            <p className="text-xs text-red-600/80 font-medium mt-0.5">
                              <ArrowDownRight className="h-3 w-3 inline-block mr-1" />
                              期待値0.8（買い控え推奨）
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="mb-4">
                          <div className="flex justify-between items-center text-xs sm:text-sm mb-1.5">
                            <span className="text-foreground/70">市場予想（オッズ換算）</span>
                            <span className="font-medium">50%</span>
                          </div>
                          <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                            <div className="bg-red-400 h-full" style={{ width: '50%' }}></div>
                          </div>
                        </div>
                        <div className="mb-6">
                          <div className="flex justify-between items-center text-xs sm:text-sm mb-1.5">
                            <span className="text-foreground/70">あなたの予想</span>
                            <span className="font-medium">40%</span>
                          </div>
                          <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                            <div className="bg-primary h-full" style={{ width: '40%' }}></div>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <div className="p-2 rounded-full bg-red-500/10 mr-3">
                            <ArrowDown className="h-4 w-4 text-red-500" />
                          </div>
                          <div>
                            <div className="flex items-baseline gap-2">
                              <span className="text-sm sm:text-base text-foreground/70">期待値</span>
                              <span className="text-xl sm:text-2xl font-bold text-red-500">0.8</span>
                            </div>
                            <p className="text-xs sm:text-sm text-foreground/70 mt-0.5">市場の過大評価 = 期待値が1.0未満</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl bg-background/90 border-2 border-green-400/30 shadow-sm overflow-hidden transition-all hover:shadow-md">
                      <div className="bg-green-500/10 p-3 sm:p-4 border-b border-green-500/20">
                        <div className="flex items-center">
                          <div className="w-8 sm:w-10 h-8 sm:h-10 rounded-full bg-emerald-100 flex items-center justify-center mr-3">
                            <span className="text-emerald-600 font-bold text-xs sm:text-sm">穴馬</span>
                          </div>
                          <div>
                            <p className="font-semibold text-base sm:text-lg">単勝オッズ10.0倍の穴馬</p>
                            <p className="text-xs text-green-600/80 font-medium mt-0.5">
                              <ArrowUpRight className="h-3 w-3 inline-block mr-1" />
                              期待値1.5（積極購入推奨）
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="mb-4">
                          <div className="flex justify-between items-center text-xs sm:text-sm mb-1.5">
                            <span className="text-foreground/70">市場予想（オッズ換算）</span>
                            <span className="font-medium">10%</span>
                          </div>
                          <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                            <div className="bg-red-400 h-full" style={{ width: '10%' }}></div>
                          </div>
                        </div>
                        <div className="mb-6">
                          <div className="flex justify-between items-center text-xs sm:text-sm mb-1.5">
                            <span className="text-foreground/70">あなたの予想</span>
                            <span className="font-medium">15%</span>
                          </div>
                          <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                            <div className="bg-primary h-full" style={{ width: '15%' }}></div>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <div className="p-2 rounded-full bg-green-500/10 mr-3">
                            <ArrowUp className="h-4 w-4 text-green-500" />
                          </div>
                          <div>
                            <div className="flex items-baseline gap-2">
                              <span className="text-sm sm:text-base text-foreground/70">期待値</span>
                              <span className="text-xl sm:text-2xl font-bold text-green-500">1.5</span>
                            </div>
                            <p className="text-xs sm:text-sm text-foreground/70 mt-0.5">市場の過小評価 = 期待値が1.0以上</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* 計算式の視覚化 */}
                  <div className="mb-8 overflow-hidden rounded-xl border border-primary/10 bg-background/80 shadow-sm">
                    <div className="bg-primary/5 p-3 sm:p-4 border-b border-primary/10">
                      <h3 className="font-semibold text-base sm:text-lg flex items-center">
                        <Calculator className="h-4 sm:h-5 w-4 sm:w-5 text-primary mr-2" />
                        期待値計算の視覚化
                      </h3>
                    </div>
                    <div className="p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-5 mb-6">
                        <div className="flex flex-col items-center">
                          <div className="w-14 sm:w-16 h-14 sm:h-16 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                            <Percent className="h-6 sm:h-7 w-6 sm:w-7 text-primary" />
                          </div>
                          <p className="text-xs sm:text-sm font-medium">あなたの予想確率</p>
                          <p className="text-primary font-bold text-base sm:text-lg">15%</p>
                        </div>
                        
                        <div className="text-xl sm:text-2xl font-bold text-primary">×</div>
                        
                        <div className="flex flex-col items-center">
                          <div className="w-14 sm:w-16 h-14 sm:h-16 rounded-full bg-yellow-500/10 flex items-center justify-center mb-2">
                            <Coins className="h-6 sm:h-7 w-6 sm:w-7 text-yellow-500" />
                          </div>
                          <p className="text-xs sm:text-sm font-medium">単勝オッズ</p>
                          <p className="text-yellow-600 font-bold text-base sm:text-lg">10.0倍</p>
                        </div>
                        
                        <div className="text-xl sm:text-2xl font-bold text-primary">=</div>
                        
                        <div className="flex flex-col items-center">
                          <div className="w-14 sm:w-16 h-14 sm:h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-2">
                            <TrendingUp className="h-6 sm:h-7 w-6 sm:w-7 text-green-500" />
                          </div>
                          <p className="text-xs sm:text-sm font-medium">期待値</p>
                          <p className="text-green-600 font-bold text-base sm:text-lg">1.5</p>
                        </div>
                      </div>
                      
                      <div className="text-center bg-primary/5 p-3 rounded-lg border border-primary/10 text-sm sm:text-base">
                        <p>
                          <span className="font-medium">期待値 = あなたの予想確率 × オッズ</span>
                        </p>
                        <p className="text-xs sm:text-sm text-foreground/70 mt-1">
                          15% × 10.0倍 = 1.5（長期的に50%の利益が期待できる）
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* 探すべきは市場との認識のギャップ */}
                  <div className="mb-8 p-4 sm:p-5 rounded-xl bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 shadow-sm border border-primary/20">
                    <div className="flex flex-col sm:flex-row items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mx-auto sm:mx-0">
                        <SearchIcon className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-lg sm:text-xl font-bold text-center sm:text-left mb-3">探すべきは市場との認識のギャップ</h3>
                        <div className="space-y-2 text-sm sm:text-base">
                          <p className="leading-relaxed">
                            上の例で分かるように、<span className="underline decoration-primary/30 decoration-2">期待値は市場の評価と自分の評価の差から生まれます</span>。
                          </p>
                          <div className="py-2 px-3 rounded-lg bg-background/70 border border-primary/10 my-3">
                            <p className="flex items-center mb-2 text-sm sm:text-base">
                              <ArrowDownRight className="h-4 w-4 text-red-500 mr-2" />
                              <span>1番人気は市場が<span className="font-semibold text-red-500">過大評価</span>（実際より勝率が高く見積もられている）</span>
                            </p>
                            <p className="flex items-center text-sm sm:text-base">
                              <ArrowUpRight className="h-4 w-4 text-green-500 mr-2" />
                              <span>穴馬は市場が<span className="font-semibold text-green-500">過小評価</span>（実際より勝率が低く見積もられている）</span>
                            </p>
                          </div>
                          <p className="font-medium text-primary pt-1 text-sm sm:text-base">
                            自分だけが気づいているギャップこそが、収益のチャンス
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* 実践的な期待値判断基準 */}
                  <div className="p-4 sm:p-5 rounded-xl bg-background/90 border border-primary/10 shadow-sm">
                    <h3 className="font-semibold text-base sm:text-lg mb-4 flex items-center">
                      <Target className="h-4 sm:h-5 w-4 sm:w-5 text-primary mr-2" />
                      実践的な期待値判断基準
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                      <div className="bg-gradient-to-br from-primary/5 to-primary/10 p-3 sm:p-4 rounded-lg border border-primary/10 relative">
                        <div className="absolute top-0 right-0 w-8 h-8 bg-primary/20 rounded-bl-lg flex items-center justify-center font-bold text-primary">1</div>
                        <div className="pt-6">
                          <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-primary/10 flex items-center justify-center">
                            <Search className="h-5 w-5 text-primary" />
                          </div>
                          <p className="font-medium text-center mb-1 text-sm sm:text-base">
                            市場より高く勝率予想できる馬を探す
                          </p>
                          <p className="text-xs text-center text-foreground/70">期待値1.0以上の必須条件</p>
                        </div>
                      </div>
                      
                      <div className="bg-gradient-to-br from-primary/5 to-primary/10 p-3 sm:p-4 rounded-lg border border-primary/10 relative">
                        <div className="absolute top-0 right-0 w-8 h-8 bg-primary/20 rounded-bl-lg flex items-center justify-center font-bold text-primary">2</div>
                        <div className="pt-6">
                          <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-primary/10 flex items-center justify-center">
                            <ThumbsUp className="h-5 w-5 text-primary" />
                          </div>
                          <p className="font-medium text-center mb-1 text-sm sm:text-base">
                            期待値1.4以上の馬券を優先購入
                          </p>
                          <p className="text-xs text-center text-foreground/70">長期的利益の重要な閾値</p>
                        </div>
                      </div>
                      
                      <div className="bg-gradient-to-br from-primary/5 to-primary/10 p-3 sm:p-4 rounded-lg border border-primary/10 relative">
                        <div className="absolute top-0 right-0 w-8 h-8 bg-primary/20 rounded-bl-lg flex items-center justify-center font-bold text-primary">3</div>
                        <div className="pt-6">
                          <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-primary/10 flex items-center justify-center">
                            <Wallet className="h-5 w-5 text-primary" />
                          </div>
                          <p className="font-medium text-center mb-1 text-sm sm:text-base">
                            期待値の高さに比例して資金配分
                          </p>
                          <p className="text-xs text-center text-foreground/70">期待値が高いほど投資額を増やす</p>
                        </div>
                      </div>
                    </div>
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
                <CardContent className="pt-6">
                  <div className="mb-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="p-4 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/10 shadow-sm">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                          <LineChartIcon className="h-5 w-5 text-primary" />
                        </div>
                        <p className="font-medium text-base sm:text-lg">オッズと勝率の相関関係</p>
                      </div>
                      <p className="text-sm sm:text-base">
                        単勝オッズは<span className="font-medium">市場予想を反映した指標</span>で、実際の勝率と強い相関関係があります。低いオッズほど実際の勝率も高くなります。
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-gradient-to-br from-yellow-500/5 to-yellow-500/10 border border-yellow-500/10 shadow-sm">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                          <Coins className="h-5 w-5 text-yellow-500" />
                        </div>
                        <p className="font-medium text-base sm:text-lg">回収率からの気づき</p>
                      </div>
                      <p className="text-sm sm:text-base">
                        どのオッズ帯でも回収率は80%前後。つまり<span className="font-medium">オッズだけで勝つことは難しい</span>ですが、オッズを参考に確率を正確に予想することが重要です。
                      </p>
                    </div>
                  </div>
                  
                  <div className="mb-6 overflow-x-auto">
                    <table className="w-full border-collapse bg-background/80 shadow-sm rounded-lg overflow-hidden text-sm">
                      <thead>
                        <tr className="bg-gradient-to-r from-primary/10 to-primary/5">
                          <th className="p-3 text-left border-b border-r border-primary/10 font-medium">オッズ範囲</th>
                          <th className="p-3 text-center border-b border-r border-primary/10 font-medium">勝率(%)</th>
                          <th className="p-3 text-center border-b border-primary/10 font-medium">回収率(%)</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="hover:bg-primary/5 transition-colors border-b border-primary/10">
                          <td className="p-3 border-r border-primary/10 font-medium">1.5倍以下</td>
                          <td className="p-3 text-center border-r border-primary/10">
                            <div className="flex items-center justify-center">
                              <span className="font-medium mr-2">59.2%</span>
                              <div className="w-24 bg-gray-200 h-2 rounded-full overflow-hidden">
                                <div className="bg-green-500 h-full" style={{ width: '59.2%' }}></div>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-center text-yellow-600 font-medium">81.6%</td>
                        </tr>
                        <tr className="hover:bg-primary/5 transition-colors border-b border-primary/10 bg-background/30">
                          <td className="p-3 border-r border-primary/10 font-medium">1.5〜3.0倍</td>
                          <td className="p-3 text-center border-r border-primary/10">
                            <div className="flex items-center justify-center">
                              <span className="font-medium mr-2">36.6%</span>
                              <div className="w-24 bg-gray-200 h-2 rounded-full overflow-hidden">
                                <div className="bg-green-500 h-full" style={{ width: '36.6%' }}></div>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-center text-yellow-600 font-medium">77.4%</td>
                        </tr>
                        <tr className="hover:bg-primary/5 transition-colors border-b border-primary/10">
                          <td className="p-3 border-r border-primary/10 font-medium">3.0〜7.0倍</td>
                          <td className="p-3 text-center border-r border-primary/10">
                            <div className="flex items-center justify-center">
                              <span className="font-medium mr-2">17.7%</span>
                              <div className="w-24 bg-gray-200 h-2 rounded-full overflow-hidden">
                                <div className="bg-green-500 h-full" style={{ width: '17.7%' }}></div>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-center text-yellow-600 font-medium">79.2%</td>
                        </tr>
                        <tr className="hover:bg-primary/5 transition-colors border-b border-primary/10 bg-background/30">
                          <td className="p-3 border-r border-primary/10 font-medium">7.0〜20.0倍</td>
                          <td className="p-3 text-center border-r border-primary/10">
                            <div className="flex items-center justify-center">
                              <span className="font-medium mr-2">8.1%</span>
                              <div className="w-24 bg-gray-200 h-2 rounded-full overflow-hidden">
                                <div className="bg-green-500 h-full" style={{ width: '8.1%' }}></div>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-center text-yellow-600 font-medium">84.1%</td>
                        </tr>
                        <tr className="hover:bg-primary/5 transition-colors border-b border-primary/10">
                          <td className="p-3 border-r border-primary/10 font-medium">20.0〜50.0倍</td>
                          <td className="p-3 text-center border-r border-primary/10">
                            <div className="flex items-center justify-center">
                              <span className="font-medium mr-2">2.6%</span>
                              <div className="w-24 bg-gray-200 h-2 rounded-full overflow-hidden">
                                <div className="bg-green-500 h-full" style={{ width: '2.6%' }}></div>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-center text-yellow-600 font-medium">79.3%</td>
                        </tr>
                        <tr className="hover:bg-primary/5 transition-colors bg-background/30">
                          <td className="p-3 border-r border-primary/10 font-medium">50.0倍以上</td>
                          <td className="p-3 text-center border-r border-primary/10">
                            <div className="flex items-center justify-center">
                              <span className="font-medium mr-2">0.8%</span>
                              <div className="w-24 bg-gray-200 h-2 rounded-full overflow-hidden">
                                <div className="bg-green-500 h-full" style={{ width: '0.8%' }}></div>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-center text-red-500 font-medium">69.1%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 shadow-sm">
                      <div className="flex items-center mb-2">
                        <CheckCircle2 className="h-5 w-5 text-green-500 mr-2" />
                        <p className="font-medium">人気馬は期待通りの勝率</p>
                      </div>
                      <p className="text-sm">オッズ1.5倍以下の1番人気馬は約60%の勝率を示し、市場の評価は比較的正確です</p>
                    </div>
                    
                    <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20 shadow-sm">
                      <div className="flex items-center mb-2">
                        <InfoIcon className="h-5 w-5 text-yellow-500 mr-2" />
                        <p className="font-medium">中穴馬の回収率が高い</p>
                      </div>
                      <p className="text-sm">7.0〜20.0倍のオッズ帯が84.1%と最も回収率が高く、期待値を見つけやすい領域</p>
                    </div>
                    
                    <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 shadow-sm">
                      <div className="flex items-center mb-2">
                        <X className="h-5 w-5 text-red-500 mr-2" />
                        <p className="font-medium">大穴馬は回収率が低下</p>
                      </div>
                      <p className="text-sm">50倍超の大穴馬は回収率が70%を下回り、期待値的に効率が悪い傾向があります</p>
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
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="p-5 rounded-xl bg-gradient-to-br from-red-500/5 to-red-500/10 border border-red-500/20 hover:shadow-md transition-all duration-300 relative overflow-hidden">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                          <span className="text-red-600 font-bold text-lg">単</span>
                        </div>
                        <p className="font-semibold text-lg">単勝確率の基本</p>
                      </div>
                      <ul className="space-y-2">
                        <li className="flex items-start gap-2">
                          <ArrowRight className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                          <span className="text-base">各馬の1着になる確率を予想</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <ArrowRight className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                          <span className="text-base"><strong>全馬の合計が100%</strong>になるよう調整</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <ArrowRight className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                          <span className="text-base">単勝オッズの逆数から市場予想を推定</span>
                        </li>
                      </ul>
                      <div className="absolute bottom-0 right-0 w-20 h-20 bg-red-500/5 rounded-tl-full"></div>
                    </div>
                    
                    <div className="p-5 rounded-xl bg-gradient-to-br from-green-500/5 to-green-500/10 border border-green-500/20 hover:shadow-md transition-all duration-300 relative overflow-hidden">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                          <span className="text-green-600 font-bold text-lg">複</span>
                        </div>
                        <p className="font-semibold text-lg">複勝確率の基本</p>
                      </div>
                      <ul className="space-y-2">
                        <li className="flex items-start gap-2">
                          <ArrowRight className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-base">各馬の3着以内に入る確率を予想</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <ArrowRight className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-base"><strong>全馬の合計が300%</strong>になるよう調整</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <ArrowRight className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-base">単勝確率の2〜3倍が目安になる</span>
                        </li>
                      </ul>
                      <div className="absolute bottom-0 right-0 w-20 h-20 bg-green-500/5 rounded-tl-full"></div>
                    </div>
                  </div>
                  
                  <div className="mb-6 border-2 border-primary/10 rounded-xl overflow-hidden">
                    <div className="p-3 sm:p-4 bg-primary/10 border-b border-primary/10">
                      <h3 className="font-semibold text-base sm:text-lg flex items-center">
                        <Target className="h-4 w-4 sm:h-5 w-5 text-primary mr-2" />
                        確率配分の具体例：10頭立てのレース
                      </h3>
                    </div>
                    <div className="p-4 sm:p-5 bg-background/90">
                      <div className="overflow-x-auto mb-3">
                        <table className="w-full text-sm border-collapse">
                          <thead>
                            <tr className="bg-gradient-to-r from-primary/10 to-primary/5">
                              <th className="p-3 text-left border-b border-primary/10">人気</th>
                              <th className="p-3 text-center border-b border-primary/10">単勝オッズ</th>
                              <th className="p-3 text-center border-b border-primary/10">市場予想</th>
                              <th className="p-3 text-center border-b border-primary/10">あなたの単勝確率</th>
                              <th className="p-3 text-center border-b border-primary/10">あなたの複勝確率</th>
                              <th className="p-3 text-center border-b border-primary/10">期待値</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border-b border-primary/10 hover:bg-primary/5 transition-colors">
                              <td className="p-3 border-r border-primary/10 font-medium">1人気</td>
                              <td className="p-3 text-center">2.5</td>
                              <td className="p-3 text-center">40%</td>
                              <td className="p-3 text-center">35%</td>
                              <td className="p-3 text-center">70%</td>
                              <td className="p-3 text-center text-red-500 font-medium">0.88</td>
                            </tr>
                            <tr className="border-b border-primary/10 bg-background/30 hover:bg-primary/5 transition-colors">
                              <td className="p-3 border-r border-primary/10 font-medium">2人気</td>
                              <td className="p-3 text-center">4.0</td>
                              <td className="p-3 text-center">25%</td>
                              <td className="p-3 text-center">20%</td>
                              <td className="p-3 text-center">50%</td>
                              <td className="p-3 text-center text-red-500 font-medium">0.80</td>
                            </tr>
                            <tr className="border-b border-primary/10 hover:bg-primary/5 transition-colors">
                              <td className="p-3 border-r border-primary/10 font-medium">3人気</td>
                              <td className="p-3 text-center">8.0</td>
                              <td className="p-3 text-center">12.5%</td>
                              <td className="p-3 text-center">15%</td>
                              <td className="p-3 text-center">40%</td>
                              <td className="p-3 text-center text-green-500 font-medium">1.20</td>
                            </tr>
                            <tr className="border-b border-primary/10 bg-background/30 hover:bg-primary/5 transition-colors">
                              <td className="p-3 border-r border-primary/10 font-medium">4〜10人気</td>
                              <td className="p-3 text-center">10.0〜</td>
                              <td className="p-3 text-center">22.5%</td>
                              <td className="p-3 text-center">30%</td>
                              <td className="p-3 text-center">140%</td>
                              <td className="p-3 text-center text-green-500 font-medium">1.33</td>
                            </tr>
                            <tr className="bg-primary/5 font-medium">
                              <td className="p-3 border-r border-primary/10">合計</td>
                              <td className="p-3 text-center">-</td>
                              <td className="p-3 text-center">100%</td>
                              <td className="p-3 text-center">100%</td>
                              <td className="p-3 text-center">300%</td>
                              <td className="p-3 text-center">-</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      <div className="p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20 text-sm">
                        <div className="flex items-center mb-1">
                          <Lightbulb className="h-4 w-4 text-yellow-500 mr-2 flex-shrink-0" />
                          <p className="font-medium">確率配分のポイント</p>
                        </div>
                        <p>競馬予想では市場との認識のズレを見つけることが重要です。上の例では人気サイドを低く見積もり、中穴馬を高く評価することで期待値の高い馬券を見つけています。</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-5 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5">
                    <h3 className="font-semibold text-lg mb-4">確率予想の精度を高めるテクニック</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-background/80 p-4 rounded-lg border border-primary/10 shadow-sm hover:shadow-md transition-all duration-300">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mb-3 mx-auto">
                          <LineChartIcon className="h-5 w-5 text-primary" />
                        </div>
                        <p className="font-medium text-center mb-2">類似レースの分析</p>
                        <p className="text-sm text-center">同コース・距離・クラスの過去レース結果から傾向を掴む</p>
                      </div>
                      
                      <div className="bg-background/80 p-4 rounded-lg border border-primary/10 shadow-sm hover:shadow-md transition-all duration-300">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mb-3 mx-auto">
                          <Brain className="h-5 w-5 text-primary" />
                        </div>
                        <p className="font-medium text-center mb-2">要素の数値化</p>
                        <p className="text-sm text-center">馬の調子・騎手・枠順などを点数化して客観的に評価する</p>
                      </div>
                      
                      <div className="bg-background/80 p-4 rounded-lg border border-primary/10 shadow-sm hover:shadow-md transition-all duration-300">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mb-3 mx-auto">
                          <Flag className="h-5 w-5 text-primary" />
                        </div>
                        <p className="font-medium text-center mb-2">適性マッチング</p>
                        <p className="text-sm text-center">馬場状態・距離・脚質などの適性を重視した確率配分</p>
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                    <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
                      <h3 className="font-semibold flex items-center gap-2 mb-2 text-lg">
                        <CircleDollarSign className="h-5 w-5 text-primary" />
                        期待値1.4の法則
                      </h3>
                      <div className="p-3 bg-background rounded-lg mb-3">
                        <div className="flex items-center gap-2 mb-2">
                          <InlineBadge className="bg-green-600">プロの競馬予想家が重視</InlineBadge>
                          <InlineBadge className="bg-yellow-600">安全マージン</InlineBadge>
                        </div>
                        <p className="text-sm">予想誤差を考慮しても利益を出せる確率が高い</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-3 bg-red-50/50 dark:bg-red-900/20 rounded-lg">
                          <h4 className="text-sm font-medium flex items-center mb-1">
                            <X className="h-4 w-4 text-red-500 mr-1" />
                            理論と現実のギャップ
                          </h4>
                          <ul className="text-xs space-y-1">
                            <li className="flex items-start">
                              <span className="text-red-500 mr-1">•</span>
                              <span>予想には常に誤差(±5〜10%)</span>
                            </li>
                            <li className="flex items-start">
                              <span className="text-red-500 mr-1">•</span>
                              <span>期待値1.0では損失リスク大</span>
                            </li>
                          </ul>
                        </div>
                        <div className="p-3 bg-green-50/50 dark:bg-green-900/20 rounded-lg">
                          <h4 className="text-sm font-medium flex items-center mb-1">
                            <Check className="h-4 w-4 text-green-500 mr-1" />
                            期待値1.4以上の価値
                          </h4>
                          <ul className="text-xs space-y-1">
                            <li className="flex items-start">
                              <span className="text-green-500 mr-1">•</span>
                              <span>予想誤差を吸収できる安全域</span>
                            </li>
                            <li className="flex items-start">
                              <span className="text-green-500 mr-1">•</span>
                              <span>長期的に回収率130%以上</span>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
                      <h3 className="font-semibold flex items-center gap-2 mb-3 text-lg">
                        <LineChart className="h-5 w-5 text-primary" />
                        期待値別リスク管理
                      </h3>
                      <div className="space-y-2">
                        <div className="flex items-center gap-3 p-2 rounded-lg bg-background">
                          <div className="w-8 h-8 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                            <AlertTriangle className="h-4 w-4 text-yellow-600" />
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between mb-1">
                              <span className="text-sm font-medium">1.0〜1.4</span>
                              <span className="text-xs text-muted-foreground">小額投資</span>
                            </div>
                            <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                              <div className="h-full bg-yellow-500 rounded-full" style={{ width: '30%' }}></div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3 p-2 rounded-lg bg-background">
                          <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                            <Circle className="h-4 w-4 text-green-600" />
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between mb-1">
                              <span className="text-sm font-medium">1.4〜1.7</span>
                              <span className="text-xs text-muted-foreground">標準投資額</span>
                            </div>
                            <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                              <div className="h-full bg-green-500 rounded-full" style={{ width: '60%' }}></div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3 p-2 rounded-lg bg-background">
                          <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                            <CircleCheck className="h-4 w-4 text-green-600" />
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between mb-1">
                              <span className="text-sm font-medium">1.7以上</span>
                              <span className="text-xs text-muted-foreground">積極投資</span>
                            </div>
                            <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                              <div className="h-full bg-green-500 rounded-full" style={{ width: '90%' }}></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
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
                            <td className="p-3 border-r border-b border-primary/10 text-center bg-red-50/50 dark:bg-red-900/20">0〜1%</td>
                            <td className="p-3 border-b border-primary/10 text-sm">予想誤差を考慮すると実質的に期待値が1.0を下回るリスクが高い</td>
                          </tr>
                          <tr className="hover:bg-primary/5 transition-colors bg-background/30">
                            <td className="p-3 border-r border-b border-primary/10 font-medium">1.2〜1.4</td>
                            <td className="p-3 border-r border-b border-primary/10 text-center bg-yellow-50/50 dark:bg-yellow-900/20">1〜3%</td>
                            <td className="p-3 border-b border-primary/10 text-sm">ややリスクがあるため、合計投資額を抑える</td>
                          </tr>
                          <tr className="hover:bg-primary/5 transition-colors">
                            <td className="p-3 border-r border-b border-primary/10 font-medium">1.4〜1.7</td>
                            <td className="p-3 border-r border-b border-primary/10 text-center bg-green-50/50 dark:bg-green-900/20">3〜5%</td>
                            <td className="p-3 border-b border-primary/10 text-sm">標準的な投資価値があり、安定した回収が期待できる</td>
                          </tr>
                          <tr className="hover:bg-primary/5 transition-colors bg-background/30">
                            <td className="p-3 border-r border-b border-primary/10 font-medium">1.7〜2.0</td>
                            <td className="p-3 border-r border-b border-primary/10 text-center bg-green-50/50 dark:bg-green-900/20">5〜8%</td>
                            <td className="p-3 border-b border-primary/10 text-sm">高い期待値で、予想誤差があっても利益が期待できる</td>
                          </tr>
                          <tr className="hover:bg-primary/5 transition-colors">
                            <td className="p-3 border-r border-primary/10 font-medium">2.0以上</td>
                            <td className="p-3 border-r border-primary/10 text-center bg-green-50/50 dark:bg-green-900/20">8〜10%</td>
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
                        <p className="font-medium mb-3">複数の高期待値馬券への配分例</p>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center p-2 bg-gradient-to-r from-green-50/30 dark:from-green-900/20 to-transparent rounded border border-green-200/50 dark:border-green-800/30">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-green-100/50 dark:bg-green-900/30 flex items-center justify-center text-sm font-medium">◎</div>
                              <span>3番単勝 <span className="text-sm text-green-600">(1.8)</span></span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="font-medium">6%</span>
                              <div className="w-16 h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div className="h-full bg-green-500 dark:bg-green-600" style={{ width: '60%' }}></div>
                              </div>
                            </div>
                          </div>
                          <div className="flex justify-between items-center p-2 bg-gradient-to-r from-green-50/30 dark:from-green-900/20 to-transparent rounded border border-green-200/50 dark:border-green-800/30">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-green-100/50 dark:bg-green-900/30 flex items-center justify-center text-sm font-medium">○</div>
                              <span>3-5馬連 <span className="text-sm text-green-600">(1.5)</span></span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="font-medium">4%</span>
                              <div className="w-16 h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div className="h-full bg-green-500 dark:bg-green-600" style={{ width: '40%' }}></div>
                              </div>
                            </div>
                          </div>
                          <div className="flex justify-between items-center p-2 bg-gradient-to-r from-green-50/30 dark:from-green-900/20 to-transparent rounded border border-green-200/50 dark:border-green-800/30">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-green-100/50 dark:bg-green-900/30 flex items-center justify-center text-sm font-medium">△</div>
                              <span>3-5-7 3連複 <span className="text-sm text-green-600">(1.4)</span></span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="font-medium">3%</span>
                              <div className="w-16 h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div className="h-full bg-green-500 dark:bg-green-600" style={{ width: '30%' }}></div>
                              </div>
                            </div>
                          </div>
                          <div className="flex justify-between items-center p-2 border-t border-primary/10 pt-3 font-medium">
                            <span>合計</span>
                            <div className="flex items-center gap-1">
                              <span>13%</span>
                              <div className="w-16 h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div className="h-full bg-yellow-500 dark:bg-yellow-600" style={{ width: '100%' }}></div>
                              </div>
                            </div>
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
                            <div className="w-7 h-7 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-sm font-medium mt-0.5 shadow-sm">1</div>
                            <div>
                              <p className="font-medium">期待値に比例して投資額を増やす</p>
                              <p className="text-xs text-foreground/70 mt-0.5">高期待値ほど資金配分を増やして効率的に運用</p>
                            </div>
                          </li>
                          <li className="flex items-start gap-3">
                            <div className="w-7 h-7 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center text-sm font-medium mt-0.5 shadow-sm">2</div>
                            <div>
                              <p className="font-medium">一レースへの集中投資を避ける</p>
                              <p className="text-xs text-foreground/70 mt-0.5">総資金の15〜20%以内に抑えてリスク分散</p>
                            </div>
                          </li>
                          <li className="flex items-start gap-3">
                            <div className="w-7 h-7 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-sm font-medium mt-0.5 shadow-sm">3</div>
                            <div>
                              <p className="font-medium">複数レースへの分散投資</p>
                              <p className="text-xs text-foreground/70 mt-0.5">期待値1.4以上の馬券が出るレースを複数選択</p>
                            </div>
                          </li>
                        </ul>
                      </div>
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
                  <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-primary/5 border border-primary/10">
                    <Info className="h-5 w-5 text-primary flex-shrink-0" />
                    <p className="text-sm">予想スタイルや性格に合った馬券種を選ぶことで収益の安定化が可能に</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="rounded-xl overflow-hidden shadow-sm border border-primary/10">
                      <div className="bg-gradient-to-r from-red-50 to-red-100 dark:from-red-950/40 dark:to-red-900/30 p-3">
                        <div className="flex items-center gap-3">
                          <div className="bg-background p-2 rounded-lg shadow-sm">
                            <span className="text-red-600 dark:text-red-400 font-bold text-lg">単勝</span>
                          </div>
                        </div>
                      </div>
                      <div className="p-4 bg-background">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <p className="font-medium text-green-600 dark:text-green-400 flex items-center">
                              <Check className="h-4 w-4 mr-1" />
                              メリット
                            </p>
                            <ul className="space-y-1 text-xs pl-5 list-disc">
                              <li>計算シンプル</li>
                              <li>的中時の回収額大</li>
                              <li>高期待値馬を直接選択</li>
                            </ul>
                          </div>
                          <div className="space-y-2">
                            <p className="font-medium text-red-600 dark:text-red-400 flex items-center">
                              <X className="h-4 w-4 mr-1" />
                              デメリット
                            </p>
                            <ul className="space-y-1 text-xs pl-5 list-disc">
                              <li>的中率が低い</li>
                              <li>連敗でメンタル影響</li>
                              <li>単頭の予想精度依存</li>
                            </ul>
                          </div>
                        </div>
                        <div className="mt-3 pt-1">
                          <div className="flex items-center justify-between mb-1 text-xs">
                            <span>的中率</span>
                            <span>回収額</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                              <div className="h-full bg-red-500 rounded-full" style={{ width: '25%' }}></div>
                            </div>
                            <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                              <div className="h-full bg-green-500 rounded-full" style={{ width: '90%' }}></div>
                            </div>
                          </div>
                        </div>
                        <div className="border-t border-primary/10 mt-3 pt-3">
                          <p className="text-xs flex items-center gap-1">
                            <InlineBadge className="bg-green-600">向いている人</InlineBadge>
                            予想精度に自信あり、高回収狙い
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="rounded-xl overflow-hidden shadow-sm border border-primary/10">
                      <div className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-950/40 dark:to-green-900/30 p-3">
                        <div className="flex items-center gap-3">
                          <div className="bg-background p-2 rounded-lg shadow-sm">
                            <span className="text-green-600 dark:text-green-400 font-bold text-lg">複勝</span>
                          </div>
                        </div>
                      </div>
                      <div className="p-4 bg-background">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <p className="font-medium text-green-600 dark:text-green-400 flex items-center">
                              <Check className="h-4 w-4 mr-1" />
                              メリット
                            </p>
                            <ul className="space-y-1 text-xs pl-5 list-disc">
                              <li>的中率が高い</li>
                              <li>初心者向き</li>
                              <li>連敗が少ない</li>
                            </ul>
                          </div>
                          <div className="space-y-2">
                            <p className="font-medium text-red-600 dark:text-red-400 flex items-center">
                              <X className="h-4 w-4 mr-1" />
                              デメリット
                            </p>
                            <ul className="space-y-1 text-xs pl-5 list-disc">
                              <li>オッズが低い</li>
                              <li>人気馬は期待値低</li>
                              <li>リターン小</li>
                            </ul>
                          </div>
                        </div>
                        <div className="mt-3 pt-1">
                          <div className="flex items-center justify-between mb-1 text-xs">
                            <span>的中率</span>
                            <span>回収額</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                              <div className="h-full bg-green-500 rounded-full" style={{ width: '75%' }}></div>
                            </div>
                            <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                              <div className="h-full bg-red-500 rounded-full" style={{ width: '30%' }}></div>
                            </div>
                          </div>
                        </div>
                        <div className="border-t border-primary/10 mt-3 pt-3">
                          <p className="text-xs flex items-center gap-1">
                            <InlineBadge className="bg-green-600">向いている人</InlineBadge>
                            安定重視、資金少、初心者
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="rounded-xl overflow-hidden shadow-sm border border-primary/10">
                      <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-950/40 dark:to-yellow-900/30 p-3">
                        <div className="flex items-center gap-3">
                          <div className="bg-background p-2 rounded-lg shadow-sm">
                            <span className="text-yellow-600 dark:text-yellow-400 font-bold text-lg">馬連/ワイド</span>
                          </div>
                        </div>
                      </div>
                      <div className="p-4 bg-background">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <p className="font-medium text-green-600 dark:text-green-400 flex items-center">
                              <Check className="h-4 w-4 mr-1" />
                              メリット
                            </p>
                            <ul className="space-y-1 text-xs pl-5 list-disc">
                              <li>単勝より的中率UP</li>
                              <li>穴馬組合せで高配当</li>
                              <li>バランス良好</li>
                            </ul>
                          </div>
                          <div className="space-y-2">
                            <p className="font-medium text-red-600 dark:text-red-400 flex items-center">
                              <X className="h-4 w-4 mr-1" />
                              デメリット
                            </p>
                            <ul className="space-y-1 text-xs pl-5 list-disc">
                              <li>2頭の予想精度必要</li>
                              <li>期待値計算やや複雑</li>
                              <li>組合せ多で投資増</li>
                            </ul>
                          </div>
                        </div>
                        <div className="mt-3 pt-1">
                          <div className="flex items-center justify-between mb-1 text-xs">
                            <span>的中率</span>
                            <span>回収額</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                              <div className="h-full bg-yellow-500 rounded-full" style={{ width: '50%' }}></div>
                            </div>
                            <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                              <div className="h-full bg-yellow-500 rounded-full" style={{ width: '60%' }}></div>
                            </div>
                          </div>
                        </div>
                        <div className="border-t border-primary/10 mt-3 pt-3">
                          <p className="text-xs flex items-center gap-1">
                            <InlineBadge className="bg-green-600">向いている人</InlineBadge>
                            バランス重視、上位馬把握可能
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="rounded-xl overflow-hidden shadow-sm border border-primary/10">
                      <div className="bg-gradient-to-r from-red-50 to-red-100 dark:from-red-950/40 dark:to-red-900/30 p-3">
                        <div className="flex items-center gap-3">
                          <div className="bg-background p-2 rounded-lg shadow-sm">
                            <span className="text-red-600 dark:text-red-400 font-bold text-lg">3連系</span>
                          </div>
                        </div>
                      </div>
                      <div className="p-4 bg-background">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <p className="font-medium text-green-600 dark:text-green-400 flex items-center">
                              <Check className="h-4 w-4 mr-1" />
                              メリット
                            </p>
                            <ul className="space-y-1 text-xs pl-5 list-disc">
                              <li>高配当期待</li>
                              <li>少額で大リターン</li>
                              <li>レース全体の読みで利益大</li>
                            </ul>
                          </div>
                          <div className="space-y-2">
                            <p className="font-medium text-red-600 dark:text-red-400 flex items-center">
                              <X className="h-4 w-4 mr-1" />
                              デメリット
                            </p>
                            <ul className="space-y-1 text-xs pl-5 list-disc">
                              <li>的中率が極めて低い</li>
                              <li>期待値計算が複雑</li>
                              <li>投資額が膨大に</li>
                            </ul>
                          </div>
                        </div>
                        <div className="mt-3 pt-1">
                          <div className="flex items-center justify-between mb-1 text-xs">
                            <span>的中率</span>
                            <span>回収額</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                              <div className="h-full bg-red-500 rounded-full" style={{ width: '15%' }}></div>
                            </div>
                            <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                              <div className="h-full bg-green-500 rounded-full" style={{ width: '100%' }}></div>
                            </div>
                          </div>
                        </div>
                        <div className="border-t border-primary/10 mt-3 pt-3">
                          <p className="text-xs flex items-center gap-1">
                            <InlineBadge className="bg-green-600">向いている人</InlineBadge>
                            ハイリスク・ハイリターン志向、上級者
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-green-50 to-yellow-50 dark:from-green-900/20 dark:to-yellow-900/20 p-4 rounded-xl mb-6">
                    <h3 className="font-semibold mb-3 flex items-center gap-2 text-lg">
                      <Lightbulb className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                      馬券種選択のポイント
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="flex flex-col items-center gap-2 bg-background rounded-lg p-3 border border-primary/10">
                        <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-sm font-medium shadow-sm">1</div>
                        <p className="font-medium text-center text-sm">予想スタイルに合わせる</p>
                        <div className="flex justify-center gap-1 mt-1">
                          <InlineBadge variant="outline" className="text-xs bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400">得意</InlineBadge>
                          <InlineBadge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">強み</InlineBadge>
                        </div>
                      </div>
                      <div className="flex flex-col items-center gap-2 bg-background rounded-lg p-3 border border-primary/10">
                        <div className="w-8 h-8 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center text-sm font-medium shadow-sm">2</div>
                        <p className="font-medium text-center text-sm">期待値比較で選択</p>
                        <div className="flex justify-center gap-1 mt-1">
                          <InlineBadge variant="outline" className="text-xs bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400">効率</InlineBadge>
                          <InlineBadge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">最適化</InlineBadge>
                        </div>
                      </div>
                      <div className="flex flex-col items-center gap-2 bg-background rounded-lg p-3 border border-primary/10">
                        <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-sm font-medium shadow-sm">3</div>
                        <p className="font-medium text-center text-sm">レース特性に合わせる</p>
                        <div className="flex justify-center gap-1 mt-1">
                          <InlineBadge variant="outline" className="text-xs bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400">荒レース→3連</InlineBadge>
                          <InlineBadge variant="outline" className="text-xs bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400">堅実→単複</InlineBadge>
                        </div>
                      </div>
                    </div>
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
                    期待値計算ツールの活用法
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-5 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50">
                    <Lightbulb className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                    <p className="text-sm">
                      感覚的な予想からデータに基づく<span className="font-medium">科学的投資</span>へ転換。収益率向上を実現します。
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
                    <div className="col-span-1 lg:col-span-2">
                      <h3 className="font-semibold mb-4 flex items-center gap-2 text-base border-b border-primary/10 pb-2">
                        <Play className="h-4 w-4 text-green-600" />
                        ツール操作の5ステップ
                      </h3>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                        <div className="flex flex-col items-center bg-green-50/50 dark:bg-green-900/10 rounded-lg p-3 text-center relative hover:shadow-md transition-shadow border border-green-100 dark:border-green-900/30">
                          <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-700 dark:text-green-400 mb-2">
                            <CalendarDays className="h-5 w-5" />
                          </div>
                          <p className="font-medium text-sm mb-1">レース選択</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">開催日・場所・レース</p>
                          <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-600 rounded-full text-white flex items-center justify-center text-xs font-bold">1</div>
                        </div>
                        
                        <div className="flex flex-col items-center bg-green-50/50 dark:bg-green-900/10 rounded-lg p-3 text-center relative hover:shadow-md transition-shadow border border-green-100 dark:border-green-900/30">
                          <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-700 dark:text-green-400 mb-2">
                            <Percent className="h-5 w-5" />
                          </div>
                          <p className="font-medium text-sm mb-1">確率入力</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">単勝率・複勝率設定</p>
                          <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-600 rounded-full text-white flex items-center justify-center text-xs font-bold">2</div>
                        </div>
                        
                        <div className="flex flex-col items-center bg-green-50/50 dark:bg-green-900/10 rounded-lg p-3 text-center relative hover:shadow-md transition-shadow border border-green-100 dark:border-green-900/30">
                          <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-700 dark:text-green-400 mb-2">
                            <Wallet className="h-5 w-5" />
                          </div>
                          <p className="font-medium text-sm mb-1">予算設定</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">投資額・リスク調整</p>
                          <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-600 rounded-full text-white flex items-center justify-center text-xs font-bold">3</div>
                        </div>
                        
                        <div className="flex flex-col items-center bg-green-50/50 dark:bg-green-900/10 rounded-lg p-3 text-center relative hover:shadow-md transition-shadow border border-green-100 dark:border-green-900/30">
                          <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-700 dark:text-green-400 mb-2">
                            <Calculator className="h-5 w-5" />
                          </div>
                          <p className="font-medium text-sm mb-1">計算実行</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">全馬券種の期待値算出</p>
                          <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-600 rounded-full text-white flex items-center justify-center text-xs font-bold">4</div>
                        </div>
                        
                        <div className="flex flex-col items-center bg-green-50/50 dark:bg-green-900/10 rounded-lg p-3 text-center relative hover:shadow-md transition-shadow border border-green-100 dark:border-green-900/30">
                          <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-700 dark:text-green-400 mb-2">
                            <Ticket className="h-5 w-5" />
                          </div>
                          <p className="font-medium text-sm mb-1">馬券選択</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">最適配分で馬券購入</p>
                          <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-600 rounded-full text-white flex items-center justify-center text-xs font-bold">5</div>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="font-semibold mb-4 flex items-center gap-2 text-base border-b border-primary/10 pb-2">
                        <ArrowRight className="h-4 w-4 text-red-600" />
                        期待値判断の基準
                      </h3>
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-3 p-2 rounded-lg border border-red-200 dark:border-red-900/30 bg-red-50/50 dark:bg-red-900/10">
                          <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                            <X className="h-4 w-4 text-red-600" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">期待値 &lt; 0.8</span>
                            <span className="text-xs text-gray-600 dark:text-gray-400">投資非推奨</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3 p-2 rounded-lg border border-yellow-200 dark:border-yellow-900/30 bg-yellow-50/50 dark:bg-yellow-900/10">
                          <div className="w-8 h-8 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                            <AlertTriangle className="h-4 w-4 text-yellow-600" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">0.8〜1.0</span>
                            <span className="text-xs text-gray-600 dark:text-gray-400">要注意</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3 p-2 rounded-lg border border-yellow-200 dark:border-yellow-900/30 bg-yellow-50/50 dark:bg-yellow-900/10">
                          <div className="w-8 h-8 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                            <Circle className="h-4 w-4 text-yellow-600" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">1.0〜1.4</span>
                            <span className="text-xs text-gray-600 dark:text-gray-400">投資検討可</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3 p-2 rounded-lg border border-green-200 dark:border-green-900/30 bg-green-50/50 dark:bg-green-900/10">
                          <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">1.4以上</span>
                            <span className="text-xs text-gray-600 dark:text-gray-400">積極投資</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="rounded-xl border border-primary/10 bg-primary/5 p-4 mb-6">
                    <h3 className="font-semibold mb-3 flex items-center gap-2 text-base border-b border-primary/10 pb-2">
                      <Lightbulb className="h-4 w-4 text-yellow-600" />
                      確率入力のポイント
                    </h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="flex flex-col p-3 bg-background rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <InlineBadge className="bg-green-600">単勝確率</InlineBadge>
                          <span className="text-xs font-medium">合計100%</span>
                        </div>
                        <div className="flex-1 flex items-center justify-center">
                          <div className="w-20 h-20 rounded-full border-8 border-green-200 dark:border-green-900/30 flex items-center justify-center text-sm font-bold text-green-600">
                            100%
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col p-3 bg-background rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <InlineBadge className="bg-yellow-600">複勝確率</InlineBadge>
                          <span className="text-xs font-medium">合計300%</span>
                        </div>
                        <div className="flex-1 flex items-center justify-center">
                          <div className="w-20 h-20 rounded-full border-8 border-yellow-200 dark:border-yellow-900/30 flex items-center justify-center text-sm font-bold text-yellow-600">
                            300%
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col p-3 bg-background rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <InlineBadge className="bg-yellow-600">データ入力</InlineBadge>
                          <span className="text-xs font-medium">現実的な値</span>
                        </div>
                        <div className="flex-1">
                          <ul className="text-xs space-y-1">
                            <li className="flex items-start gap-1">
                              <span className="text-green-500">●</span>
                              <span>本命馬：15〜25%</span>
                            </li>
                            <li className="flex items-start gap-1">
                              <span className="text-yellow-500">●</span>
                              <span>対抗馬：10〜15%</span>
                            </li>
                            <li className="flex items-start gap-1">
                              <span className="text-red-500">●</span>
                              <span>大穴馬：1〜5%</span>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2 text-base border-b border-primary/10 pb-2">
                      <Image className="h-4 w-4 text-primary" />
                      ツール画面サンプル
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="relative group">
                        <div className="border border-primary/10 rounded-lg overflow-hidden">
                          <img 
                            src="/images/Prediction.webp" 
                            alt="予想確率入力画面" 
                            className="w-full h-auto object-cover"
                          />
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <p className="text-xs text-white p-3">
                            スライダーUIで各馬の勝率・複勝率を簡単に設定できます
                          </p>
                        </div>
                      </div>
                      
                      <div className="relative group">
                        <div className="border border-primary/10 rounded-lg overflow-hidden">
                          <img 
                            src="/images/Output.webp" 
                            alt="期待値計算結果画面" 
                            className="w-full h-auto object-cover"
                          />
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <p className="text-xs text-white p-3">
                            馬券種別ごとの期待値を一覧表示し、最適な投資判断をサポート
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-yellow-50 to-green-50 dark:from-yellow-900/20 dark:to-green-900/20 rounded-lg p-4 mb-6">
                    <h3 className="font-semibold mb-3 flex items-center gap-2 text-base">
                      <Star className="h-4 w-4 text-yellow-600" />
                      プロが実践する3つの活用テクニック
                    </h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="bg-white/80 dark:bg-gray-800/90 p-3 rounded-lg flex flex-col">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-xs font-bold text-green-600">1</div>
                          <p className="text-sm font-medium">レース選別</p>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">複数レースの中から期待値が最も高いレースに投資集中</p>
                      </div>
                      
                      <div className="bg-white/80 dark:bg-gray-800/90 p-3 rounded-lg flex flex-col">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-xs font-bold text-green-600">2</div>
                          <p className="text-sm font-medium">予想精度向上</p>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">計算結果を記録し予想と実績の差を分析して精度を磨く</p>
                      </div>
                      
                      <div className="bg-white/80 dark:bg-gray-800/90 p-3 rounded-lg flex flex-col">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-xs font-bold text-green-600">3</div>
                          <p className="text-sm font-medium">オッズ変動対応</p>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">最終オッズで再計算し、期待値の変化に柔軟に対応</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-center">
                    <a href="/" className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-colors shadow-md text-sm">
                      <Play className="h-4 w-4" />
                      <span>期待値計算ツールを今すぐ試す</span>
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
                    <Trophy className="h-5 w-5 text-primary mr-2" />
                    実戦トレーニング：高松宮記念（G1）
                  </CardTitle>
                </CardHeader>
                <CardContent>
                    {/* 高松宮記念出馬表の画像を追加 */}
                    <div className="mb-6 mt-6 border border-primary/10 rounded-lg overflow-hidden">
                    <h4 className="font-medium text-sm p-3 bg-primary/5 border-b border-primary/10">高松宮記念 出馬表</h4>
                    <div className="p-3">
                      <div className="rounded-lg overflow-hidden shadow-sm">
                        <img 
                          src="/images/RaceCase.webp" 
                          alt="高松宮記念出馬表" 
                          className="w-full h-auto object-cover" 
                          loading="lazy"
                        />
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 text-center">※ 出典：https://race.netkeiba.com/race/result.html?race_id=202507020611&rf=race_list</p>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-green-50/50 to-yellow-50/50 dark:from-green-900/10 dark:to-yellow-900/10 rounded-lg p-3 mb-6 border border-green-100 dark:border-green-900/30">
                    <div className="flex items-center gap-3">
                      <div className="bg-white/80 dark:bg-gray-800/80 p-2 rounded-lg shadow-sm hidden sm:flex">
                        <Share className="h-10 w-10 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <h3 className="font-medium text-base">実際のレースデータで期待値計算を体験</h3>
                        <p className="text-xs text-gray-600 dark:text-gray-400">高松宮記念（G1）のデータを用いたプロの思考プロセスを学習</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 mb-6">
                    <div className="col-span-1 lg:col-span-2">
                      <h3 className="font-semibold mb-4 flex items-center gap-2 text-base border-b border-primary/10 pb-2">
                        <Brain className="h-4 w-4 text-green-600" />
                        プロの期待値計算プロセス
                      </h3>
                      
                      <div className="space-y-1">
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-green-100/50 to-green-50/50 dark:from-green-900/20 dark:to-green-900/10 hover:shadow-sm transition-shadow">
                          <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white shadow-sm">
                            <span className="text-xs font-bold">1</span>
                          </div>
                          <div>
                            <p className="font-medium text-sm">レース分析</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">過去走・血統・適性・調教</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-green-100/30 to-green-50/30 dark:from-green-900/15 dark:to-green-900/5 hover:shadow-sm transition-shadow">
                          <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white shadow-sm">
                            <span className="text-xs font-bold">2</span>
                          </div>
                          <div>
                            <p className="font-medium text-sm">確率予想</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">各馬の勝率・複勝率を算出</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-yellow-100/50 to-yellow-50/50 dark:from-yellow-900/20 dark:to-yellow-900/10 hover:shadow-sm transition-shadow">
                          <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center text-white shadow-sm">
                            <span className="text-xs font-bold">3</span>
                          </div>
                          <div>
                            <p className="font-medium text-sm">オッズ分析</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">市場オッズと予想の乖離を発見</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-yellow-100/30 to-yellow-50/30 dark:from-yellow-900/15 dark:to-yellow-900/5 hover:shadow-sm transition-shadow">
                          <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center text-white shadow-sm">
                            <span className="text-xs font-bold">4</span>
                          </div>
                          <div>
                            <p className="font-medium text-sm">期待値計算</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">各馬券種別の期待値を算出</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-red-100/50 to-red-50/50 dark:from-red-900/20 dark:to-red-900/10 hover:shadow-sm transition-shadow">
                          <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white shadow-sm">
                            <span className="text-xs font-bold">5</span>
                          </div>
                          <div>
                            <p className="font-medium text-sm">資金配分</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">期待値に応じた投資額決定</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="col-span-1 lg:col-span-3">
                      <h3 className="font-semibold mb-4 flex items-center gap-2 text-base border-b border-primary/10 pb-2">
                        <Zap className="h-4 w-4 text-yellow-600" />
                        プロの秘訣：期待値投資の4つの武器
                      </h3>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="flex items-start gap-3 p-3 bg-background rounded-lg border border-primary/10 hover:shadow-md transition-shadow relative">
                          <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-md absolute -top-2 -right-2">
                            <TrendingUp className="h-4 w-4 text-green-600" />
                          </div>
                          <div>
                            <h4 className="font-medium text-sm">相対価値の発見</h4>
                            <ul className="mt-1 space-y-1">
                              <li className="text-xs flex items-start gap-1">
                                <span className="text-green-500 font-bold">•</span>
                                <span>オッズと自己予想の差を活用</span>
                              </li>
                              <li className="text-xs flex items-start gap-1">
                                <span className="text-green-500 font-bold">•</span>
                                <span>市場の見落としを狙う</span>
                              </li>
                            </ul>
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-3 p-3 bg-background rounded-lg border border-primary/10 hover:shadow-md transition-shadow relative">
                          <div className="bg-yellow-100 dark:bg-yellow-900/30 p-2 rounded-md absolute -top-2 -right-2">
                            <CircleDollarSign className="h-4 w-4 text-yellow-600" />
                          </div>
                          <div>
                            <h4 className="font-medium text-sm">資金配分の最適化</h4>
                            <ul className="mt-1 space-y-1">
                              <li className="text-xs flex items-start gap-1">
                                <span className="text-yellow-500 font-bold">•</span>
                                <span>ケリー基準で資金調整</span>
                              </li>
                              <li className="text-xs flex items-start gap-1">
                                <span className="text-yellow-500 font-bold">•</span>
                                <span>高期待値ほど投資比率増</span>
                              </li>
                            </ul>
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-3 p-3 bg-background rounded-lg border border-primary/10 hover:shadow-md transition-shadow relative">
                          <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-md absolute -top-2 -right-2">
                            <ShieldAlert className="h-4 w-4 text-red-600" />
                          </div>
                          <div>
                            <h4 className="font-medium text-sm">リスク調整期待値</h4>
                            <ul className="mt-1 space-y-1">
                              <li className="text-xs flex items-start gap-1">
                                <span className="text-red-500 font-bold">•</span>
                                <span>変動リスクも考慮した分析</span>
                              </li>
                              <li className="text-xs flex items-start gap-1">
                                <span className="text-red-500 font-bold">•</span>
                                <span>大穴は投資比率を抑制</span>
                              </li>
                            </ul>
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-3 p-3 bg-background rounded-lg border border-primary/10 hover:shadow-md transition-shadow relative">
                          <div className="bg-yellow-100 dark:bg-yellow-900/30 p-2 rounded-md absolute -top-2 -right-2">
                            <SplitSquareVertical className="h-4 w-4 text-yellow-600" />
                          </div>
                          <div>
                            <h4 className="font-medium text-sm">複合期待値の活用</h4>
                            <ul className="mt-1 space-y-1">
                              <li className="text-xs flex items-start gap-1">
                                <span className="text-yellow-500 font-bold">•</span>
                                <span>複数馬券種でリスク分散</span>
                              </li>
                              <li className="text-xs flex items-start gap-1">
                                <span className="text-yellow-500 font-bold">•</span>
                                <span>相関性の低い馬券を組合せ</span>
                              </li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2 text-base border-b border-primary/10 pb-2">
                      <Target className="h-4 w-4 text-primary" />
                      単勝馬券の期待値比較
                    </h3>
                    
                    <div className="overflow-x-auto">
                      <div className="min-w-[600px]">
                        <div className="grid grid-cols-6 gap-2">
                          {/* ヘッダー行 */}
                          <div className="p-2 text-xs font-medium text-center bg-gray-100 dark:bg-gray-800 rounded-tl-md">馬番</div>
                          <div className="p-2 text-xs font-medium text-center bg-gray-100 dark:bg-gray-800">馬名</div>
                          <div className="p-2 text-xs font-medium text-center bg-gray-100 dark:bg-gray-800">単勝オッズ</div>
                          <div className="p-2 text-xs font-medium text-center bg-gray-100 dark:bg-gray-800">予想確率</div>
                          <div className="p-2 text-xs font-medium text-center bg-gray-100 dark:bg-gray-800">期待値</div>
                          <div className="p-2 text-xs font-medium text-center bg-gray-100 dark:bg-gray-800 rounded-tr-md">評価</div>
                          
                          {/* 馬データ行 */}
                          <div className="p-2 text-xs text-center bg-white dark:bg-gray-900 font-medium border-b border-gray-100 dark:border-gray-800">1</div>
                          <div className="p-2 text-xs bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">マッドクール</div>
                          <div className="p-2 text-xs text-center bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">7.1</div>
                          <div className="p-2 text-xs text-center bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">10%</div>
                          <div className="p-2 text-xs text-center bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 font-medium">0.71</div>
                          <div className="p-2 text-xs text-center bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
                            <InlineBadge className="bg-yellow-500 text-white">注意</InlineBadge>
                          </div>
                          
                          <div className="p-2 text-xs text-center bg-gray-50 dark:bg-gray-900 font-medium border-b border-gray-100 dark:border-gray-800">6</div>
                          <div className="p-2 text-xs bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">ルガル</div>
                          <div className="p-2 text-xs text-center bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">5.7</div>
                          <div className="p-2 text-xs text-center bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">10%</div>
                          <div className="p-2 text-xs text-center bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 font-medium">0.57</div>
                          <div className="p-2 text-xs text-center bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
                            <InlineBadge className="bg-red-500 text-white">低</InlineBadge>
                          </div>
                          
                          <div className="p-2 text-xs text-center bg-white dark:bg-gray-900 font-medium border-b border-gray-100 dark:border-gray-800">10</div>
                          <div className="p-2 text-xs bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">サトノレーヴ</div>
                          <div className="p-2 text-xs text-center bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">3.8</div>
                          <div className="p-2 text-xs text-center bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">30%</div>
                          <div className="p-2 text-xs text-center bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 font-medium">1.14</div>
                          <div className="p-2 text-xs text-center bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
                            <InlineBadge className="bg-green-500 text-white">良</InlineBadge>
                          </div>
                          
                          <div className="p-2 text-xs text-center bg-gray-50 dark:bg-gray-900 font-medium border-b border-gray-100 dark:border-gray-800">12</div>
                          <div className="p-2 text-xs bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">トウシンマカオ</div>
                          <div className="p-2 text-xs text-center bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">7.3</div>
                          <div className="p-2 text-xs text-center bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">15%</div>
                          <div className="p-2 text-xs text-center bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 font-medium">1.10</div>
                          <div className="p-2 text-xs text-center bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
                            <InlineBadge className="bg-green-500 text-white">良</InlineBadge>
                          </div>
                          
                          <div className="p-2 text-xs text-center bg-white dark:bg-gray-900 font-medium border-b border-gray-100 dark:border-gray-800">14</div>
                          <div className="p-2 text-xs bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">ナムラクレア</div>
                          <div className="p-2 text-xs text-center bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">3.5</div>
                          <div className="p-2 text-xs text-center bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">25%</div>
                          <div className="p-2 text-xs text-center bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 font-medium">0.88</div>
                          <div className="p-2 text-xs text-center bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
                            <InlineBadge className="bg-yellow-500 text-white">注意</InlineBadge>
                          </div>
                          
                          <div className="p-2 text-xs text-center bg-gray-50 dark:bg-gray-900 font-medium">15</div>
                          <div className="p-2 text-xs bg-gray-50 dark:bg-gray-900">ママコチャ</div>
                          <div className="p-2 text-xs text-center bg-gray-50 dark:bg-gray-900">14.6</div>
                          <div className="p-2 text-xs text-center bg-gray-50 dark:bg-gray-900">10%</div>
                          <div className="p-2 text-xs text-center bg-gray-50 dark:bg-gray-900 font-medium">1.46</div>
                          <div className="p-2 text-xs text-center bg-gray-50 dark:bg-gray-900">
                            <InlineBadge className="bg-green-500 text-white">推奨</InlineBadge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                    <div className="bg-gradient-to-r from-green-50 to-yellow-50 dark:from-green-900/10 dark:to-yellow-900/10 p-4 rounded-lg border border-green-100 dark:border-green-900/30">
                      <h4 className="font-medium text-sm mb-3 pb-1 border-b border-green-200 dark:border-green-800/30 flex items-center gap-2">
                        <CircleCheck className="h-4 w-4 text-green-600" />
                        期待値分析の結論
                      </h4>
                      <ul className="space-y-2">
                        <li className="flex items-start gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Check className="h-3 w-3 text-green-600" />
                          </div>
                          <span className="text-xs"><span className="font-medium">ママコチャ</span>：EV1.46で最適投資対象</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Check className="h-3 w-3 text-yellow-600" />
                          </div>
                          <span className="text-xs"><span className="font-medium">サトノレーヴ(1.14)・トウシンマカオ(1.10)</span>：投資価値あり</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <X className="h-3 w-3 text-red-600" />
                          </div>
                          <span className="text-xs"><span className="font-medium">ルガル(0.57)</span>：明確な投資対象外</span>
                        </li>
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-sm mb-3 pb-1 border-b border-primary/10 flex items-center gap-2">
                        <CircleDollarSign className="h-4 w-4 text-primary" />
                        資金配分（予算10,000円）
                      </h4>
                      <div className="space-y-3">
                        <div className="flex items-center p-2 rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30">
                          <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-xs font-bold text-green-600 mr-2">15</div>
                          <span className="text-xs font-medium flex-1">ママコチャ</span>
                          <div className="w-20 h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div className="h-full bg-green-500 rounded-full" style={{ width: '45%' }}></div>
                          </div>
                          <span className="text-xs ml-2">4,500円</span>
                        </div>
                        
                        <div className="flex items-center p-2 rounded-lg bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-900/30">
                          <div className="w-6 h-6 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center text-xs font-bold text-yellow-600 mr-2">10</div>
                          <span className="text-xs font-medium flex-1">サトノレーヴ</span>
                          <div className="w-20 h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div className="h-full bg-yellow-500 rounded-full" style={{ width: '30%' }}></div>
                          </div>
                          <span className="text-xs ml-2">3,000円</span>
                        </div>
                        
                        <div className="flex items-center p-2 rounded-lg bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-900/30">
                          <div className="w-6 h-6 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center text-xs font-bold text-yellow-600 mr-2">12</div>
                          <span className="text-xs font-medium flex-1">トウシンマカオ</span>
                          <div className="w-20 h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div className="h-full bg-yellow-500 rounded-full" style={{ width: '25%' }}></div>
                          </div>
                          <span className="text-xs ml-2">2,500円</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-center justify-between bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-900/10 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-3 sm:mb-0">
                      <Lightbulb className="h-5 w-5 text-amber-600" />
                      <p className="text-sm font-medium">期待値1.4以上が最も投資価値の高い馬券です</p>
                    </div>
                    <a href="/" className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors shadow-sm text-xs">
                      <Calculator className="h-3.5 w-3.5" />
                      <span>期待値計算ツールを試す</span>
                    </a>
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


            {/* FAQ カテゴリータブ */}
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              <InlineBadge className="py-2 px-4 bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer">
                <Calculator className="h-3.5 w-3.5 mr-1" />
                <span>期待値の基本</span>
              </InlineBadge>
              <InlineBadge className="py-2 px-4 bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer">
                <Percent className="h-3.5 w-3.5 mr-1" />
                <span>確率予想</span>
              </InlineBadge>
              <InlineBadge className="py-2 px-4 bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer">
                <TrendingUp className="h-3.5 w-3.5 mr-1" />
                <span>回収率アップ</span>
              </InlineBadge>
            </div>

            <div className="space-y-4">
              {/* 質問1 */}
              <div className="bg-background/70 backdrop-blur-sm border border-primary/10 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                <div className="border-b border-primary/10 p-4 cursor-pointer">
                  <div className="flex items-start gap-3">
                    <div className="bg-primary/10 p-2 rounded-lg shadow-sm flex-shrink-0">
                      <Calculator className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-base">競馬の期待値計算とは何ですか？</h3>
                        <InlineBadge variant="outline" className="bg-primary/10 text-primary">基本</InlineBadge>
                      </div>
                      <p className="mt-3 text-sm">
                        競馬の期待値計算とは、オッズと予想勝率から理論上の投資価値を算出する方法です。「期待値 = オッズ × 的中確率」の式で計算され、期待値が1以上なら理論上は利益が期待できます。
                      </p>
                      <div className="mt-3 p-3 bg-primary/5 rounded-lg border border-primary/10">
                        <div className="flex items-center gap-2">
                          <div className="bg-primary p-1 rounded-full">
                            <Lightbulb className="h-4 w-4 text-white" />
                          </div>
                          <p className="text-sm font-medium text-foreground">
                            例：3倍のオッズで勝率40%なら、期待値は3×0.4=1.2となり投資価値あり
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 質問2 */}
              <div className="bg-background/70 backdrop-blur-sm border border-primary/10 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                <div className="border-b border-primary/10 p-4 cursor-pointer">
                  <div className="flex items-start gap-3">
                    <div className="bg-primary/10 p-2 rounded-lg shadow-sm flex-shrink-0">
                      <TrendingUp className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-base">競馬の期待値計算で本当に回収率は上がりますか？</h3>
                        <InlineBadge variant="outline" className="bg-primary/10 text-primary">基本</InlineBadge>
                      </div>
                      <p className="mt-3 text-sm">
                        はい、期待値計算を正しく活用することで長期的な回収率向上が期待できます。特に<span className="font-medium text-primary">期待値1.4以上の馬券</span>を狙うことで、予想の誤差を考慮しても利益につながりやすくなります。
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                        <div className="bg-primary/5 p-3 rounded-lg border border-primary/10">
                          <div className="flex gap-2 items-center mb-1">
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                            <span className="font-medium text-foreground text-sm">期待値1.4以上</span>
                          </div>
                          <p className="text-xs text-muted-foreground">積極的に投資推奨</p>
                        </div>
                        <div className="bg-primary/5 p-3 rounded-lg border border-primary/10">
                          <div className="flex gap-2 items-center mb-1">
                            <Circle className="h-4 w-4 text-primary/70" />
                            <span className="font-medium text-foreground text-sm">期待値1.0〜1.3</span>
                          </div>
                          <p className="text-xs text-muted-foreground">少額投資検討可</p>
                        </div>
                        <div className="bg-primary/5 p-3 rounded-lg border border-primary/10">
                          <div className="flex gap-2 items-center mb-1">
                            <X className="h-4 w-4 text-destructive" />
                            <span className="font-medium text-foreground text-sm">期待値1.0未満</span>
                          </div>
                          <p className="text-xs text-muted-foreground">投資対象外</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 質問3 */}
              <div className="bg-background/70 backdrop-blur-sm border border-primary/10 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                <div className="border-b border-primary/10 p-4 cursor-pointer">
                  <div className="flex items-start gap-3">
                    <div className="bg-primary/10 p-2 rounded-lg shadow-sm flex-shrink-0">
                      <Ticket className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-base">単勝の期待値計算と複勝の期待値計算、どちらが重要ですか？</h3>
                        <InlineBadge variant="outline" className="bg-primary/10 text-primary">確率予想</InlineBadge>
                      </div>
                      <p className="mt-3 text-sm">
                        両方重要ですが、複勝の期待値計算は初心者向けに安定性があります。単勝の期待値計算はリターンが大きい反面、的中率が低くなります。
                      </p>

                      <div className="flex gap-4 mt-4 overflow-x-auto pb-2 flex-nowrap">
                        <div className="flex-shrink-0 w-32 bg-primary/5 p-3 rounded-lg text-center">
                          <p className="font-bold text-sm mb-1">単勝</p>
                          <div className="flex justify-center">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-xs font-medium text-primary">1着</span>
                            </div>
                          </div>
                          <p className="text-xs mt-2 text-muted-foreground">リターン大きい</p>
                          <p className="text-xs text-muted-foreground">的中率低い</p>
                        </div>
                        <div className="flex-shrink-0 w-32 bg-primary/5 p-3 rounded-lg text-center">
                          <p className="font-bold text-sm mb-1">複勝</p>
                          <div className="flex justify-center gap-1">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-xs font-medium text-primary">1</span>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-xs font-medium text-primary">2</span>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-xs font-medium text-primary">3</span>
                            </div>
                          </div>
                          <p className="text-xs mt-2 text-muted-foreground">リターン小さい</p>
                          <p className="text-xs text-muted-foreground">的中率高い</p>
                        </div>
                        <div className="flex-shrink-0 w-32 bg-primary/5 p-3 rounded-lg text-center border border-primary/20">
                          <p className="font-bold text-sm mb-1 text-primary">推奨戦略</p>
                          <div className="h-10 flex items-center justify-center">
                            <p className="text-xs font-medium">両方計算して<br/>高い方を選択</p>
                          </div>
                          <p className="text-xs mt-1 text-muted-foreground">または少額分散</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 質問4 */}
              <div className="bg-background/70 backdrop-blur-sm border border-primary/10 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                <div className="border-b border-primary/10 p-4 cursor-pointer">
                  <div className="flex items-start gap-3">
                    <div className="bg-primary/10 p-2 rounded-lg shadow-sm flex-shrink-0">
                      <Settings className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-base">競馬の期待値計算ツールはどのような馬券種類に対応していますか？</h3>
                        <InlineBadge variant="outline" className="bg-primary/10 text-primary">確率予想</InlineBadge>
                      </div>
                      <p className="mt-3 text-sm">
                        期待値計算ツールは、単勝、複勝、馬連、馬単、ワイド、3連複、3連単など、JRAの主要な馬券種類すべてに対応しています。単勝確率と複勝確率を入力するだけで、すべての券種について期待値計算を行います。
                      </p>

                      <div className="mt-4 p-3 bg-primary/5 rounded-lg">
                        <div className="grid grid-cols-3 sm:grid-cols-7 gap-2">
                          <div className="flex flex-col items-center">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-1">
                              <span className="text-xs font-bold text-primary">単勝</span>
                            </div>
                            <span className="text-xs text-muted-foreground">1着</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-1">
                              <span className="text-xs font-bold text-primary">複勝</span>
                            </div>
                            <span className="text-xs text-muted-foreground">1-3着</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-1">
                              <span className="text-xs font-bold text-primary">馬連</span>
                            </div>
                            <span className="text-xs text-muted-foreground">1,2着</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-1">
                              <span className="text-xs font-bold text-primary">馬単</span>
                            </div>
                            <span className="text-xs text-muted-foreground">1,2着順</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-1">
                              <span className="text-xs font-bold text-primary">ワイド</span>
                            </div>
                            <span className="text-xs text-muted-foreground">1-3着</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-1">
                              <span className="text-xs font-bold text-primary">3連複</span>
                            </div>
                            <span className="text-xs text-muted-foreground">1-3着</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-1">
                              <span className="text-xs font-bold text-primary">3連単</span>
                            </div>
                            <span className="text-xs text-muted-foreground">1-3順</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 質問5 */}
              <div className="bg-background/70 backdrop-blur-sm border border-primary/10 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                <div className="border-b border-primary/10 p-4 cursor-pointer">
                  <div className="flex items-start gap-3">
                    <div className="bg-primary/10 p-2 rounded-lg shadow-sm flex-shrink-0">
                      <Target className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-base">競馬で期待値が高い馬券を見つけるコツはありますか？</h3>
                        <InlineBadge variant="outline" className="bg-primary/10 text-primary">回収率アップ</InlineBadge>
                      </div>
                      <p className="mt-3 text-sm">
                        期待値の高い馬券を見つけるには、公式オッズと独自予想の差異を探すことが重要です。以下の3つの視点で「割安馬券」を見つけましょう。
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                        <div className="bg-primary/5 p-3 rounded-lg border border-primary/10">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold">1</div>
                            <span className="font-medium text-foreground text-sm">人気薄の実力馬</span>
                          </div>
                          <p className="text-xs text-muted-foreground">休み明け、斤量増、不良など表面的な理由で人気を落とした実力馬</p>
                        </div>
                        <div className="bg-primary/5 p-3 rounded-lg border border-primary/10">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold">2</div>
                            <span className="font-medium text-foreground text-sm">血統・適性重視</span>
                          </div>
                          <p className="text-xs text-muted-foreground">特定の条件（距離・馬場）に適した血統背景を持つ馬を見つける</p>
                        </div>
                        <div className="bg-primary/5 p-3 rounded-lg border border-primary/10">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold">3</div>
                            <span className="font-medium text-foreground text-sm">変化への対応</span>
                          </div>
                          <p className="text-xs text-muted-foreground">馬場状態・天候変化はオッズに十分反映されないことが多い</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 質問6 */}
              <div className="bg-background/70 backdrop-blur-sm border border-primary/10 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                <div className="border-b border-primary/10 p-4 cursor-pointer">
                  <div className="flex items-start gap-3">
                    <div className="bg-primary/10 p-2 rounded-lg shadow-sm flex-shrink-0">
                      <BadgeDollarSign className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-base">競馬の期待値と回収率の関係を教えてください</h3>
                        <InlineBadge variant="outline" className="bg-primary/10 text-primary">回収率アップ</InlineBadge>
                      </div>
                      <p className="mt-3 text-sm">
                        期待値と回収率には密接な関係があります。期待値は理論上の投資価値を示す指標で、期待値1.0は理論的回収率100%、期待値1.5なら理論的回収率150%を意味します。
                      </p>

                      <div className="mt-4 overflow-hidden rounded-lg border border-primary/10">
                        <div className="bg-primary/5 p-2 text-center">
                          <p className="text-sm font-medium">期待値と理論的回収率の関係</p>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[400px]">
                            <thead>
                              <tr className="bg-primary/5">
                                <th className="p-2 text-xs text-left">期待値</th>
                                <th className="p-2 text-xs text-left">理論的回収率</th>
                                <th className="p-2 text-xs text-left">推奨</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr className="border-t border-primary/10">
                                <td className="p-2 text-xs">0.7</td>
                                <td className="p-2 text-xs">70%</td>
                                <td className="p-2 text-xs"><InlineBadge variant="destructive" className="bg-destructive/80 text-white">非推奨</InlineBadge></td>
                              </tr>
                              <tr className="border-t border-primary/10 bg-primary/5">
                                <td className="p-2 text-xs">1.0</td>
                                <td className="p-2 text-xs">100%</td>
                                <td className="p-2 text-xs"><InlineBadge className="bg-primary/40 text-white">検討可</InlineBadge></td>
                              </tr>
                              <tr className="border-t border-primary/10">
                                <td className="p-2 text-xs">1.2</td>
                                <td className="p-2 text-xs">120%</td>
                                <td className="p-2 text-xs"><InlineBadge className="bg-primary/40 text-white">検討可</InlineBadge></td>
                              </tr>
                              <tr className="border-t border-primary/10 bg-primary/5">
                                <td className="p-2 text-xs font-medium">1.4</td>
                                <td className="p-2 text-xs font-medium">140%</td>
                                <td className="p-2 text-xs"><InlineBadge className="bg-primary text-white">積極投資</InlineBadge></td>
                              </tr>
                              <tr className="border-t border-primary/10">
                                <td className="p-2 text-xs font-medium">1.8</td>
                                <td className="p-2 text-xs font-medium">180%</td>
                                <td className="p-2 text-xs"><InlineBadge className="bg-primary text-white">積極投資</InlineBadge></td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-100 dark:border-amber-800/30">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                          <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                            期待値1.4以上を実用的な基準にすることで、予想の誤差があっても利益確保が期待できます
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
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