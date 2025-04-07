import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import MainLayout from "@/components/layout/MainLayout";
import { Ticket, Calendar, Coins, Trophy, ChevronRight, Info, Award, BarChart3, Calculator, X, Check, Lightbulb, BookOpen, Settings, TrendingUp, Target, Pencil, ArrowRight, CheckCircle2, XCircle, InfoIcon, Quote, CircleArrowDownIcon, LineChartIcon, Brain, BadgeDollarSign, Gauge, Flag, LightbulbIcon, CircleCheck, Camera, BarChart3Icon, Image, Search, ArrowDownRight, ArrowUpRight, ArrowDown, ArrowUp, Percent, SearchIcon, ThumbsUp, Wallet, CircleDollarSign, LineChart, Circle, AlertTriangle, CalendarDays, Play, Star, Zap, SplitSquareVertical, ShieldAlert, Share, ArrowUpCircle, Rocket, CircleDot, MoveDown, Sparkles } from "lucide-react";
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
            <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
              <span>
                {formattedDate}
              </span>
              <span className="inline-flex items-center justify-center bg-primary/20 px-2 py-0.5 rounded-full text-primary text-sm font-medium">
                {formattedTime}
              </span>
            </p>
          </div>
          <div className="text-right">
            {race.status === 'done' && (
              <p className="text-sm font-medium text-foreground/80 bg-primary/10 inline-flex items-center justify-center px-2 py-0.5 rounded-full">
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
        <Link to="/" className="text-sm text-primary mt-2 inline-block hover:underline">
          レース一覧を見る
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {recentRaces.map((race) => (
        <div
          key={race.id}
          onClick={() => handleRaceClick(race.id.toString())}
          onMouseEnter={() => handleRaceHover(race.id.toString())}
          className="cursor-pointer group relative overflow-hidden bg-background/70 backdrop-blur-sm border border-primary/20 hover:bg-primary/5 transition-all duration-300 hover:scale-[1.01] hover:-translate-y-0.5 hover:shadow-md rounded-lg p-2"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-background/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative flex justify-between items-center">
            <div>
              <h3 className="font-bold text-sm text-foreground/90 group-hover:text-primary transition-colors duration-300">
                {race.name}
              </h3>
              <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                <span>
                  {format(new Date(race.startTime), 'MM/dd(E)', { locale: ja })}
                </span>
                <span className="inline-flex items-center justify-center bg-primary/20 px-1.5 py-0.5 rounded-full text-primary text-sm font-medium">
                  {format(new Date(race.startTime), 'HH:mm')}
                </span>
              </p>
            </div>
            <div className="text-right">
              {race.status === 'done' && (
                <p className="text-sm font-medium text-foreground/80 bg-primary/10 inline-flex items-center justify-center px-1.5 py-0.5 rounded-full">
                  発走済
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-0.5">
                {race.venue}
              </p>
            </div>
          </div>
        </div>
      ))}
      
      <div className="pt-2 mt-1 border-t border-primary/10 text-center">
        <Link
          to="/"
          className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center justify-center gap-1"
        >
          <span>すべてのレースを見る</span>
          <ChevronRight className="h-3 w-3" />
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
      } flex items-center justify-center lg:hidden`}
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
    
    // モバイルデバイスかどうかを判定
    const isMobile = window.innerWidth <= 768;
    
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
        rootMargin: isMobile ? '0px 0px -50px 0px' : '0px 0px -100px 0px', // モバイルでは上部からより早めに表示
        threshold: isMobile ? 0.05 : 0.1 // モバイルでは僅かに表示された時点でアニメーション開始
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
            }, isMobile ? 50 : 100); // モバイルではさらに遅延を短く
          }
        });
      }, isMobile ? 100 : 200); // モバイルではさらに遅延を短く
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
  
  // スクロール位置に基づいて目次項目をハイライトするuseEffect
  useEffect(() => {
    // セクションのIDとそれに対応する目次の要素を関連付ける
    const sectionIds = [
      'what-is-ev',
      'ev-examples',
      'win-place-prob',
      'optimal-betting',
      'ev-tools',
      'ev-training',
      'faq'
    ];
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // 現在表示されているセクションのID
            const currentId = entry.target.id;
            
            // すべての目次項目からアクティブクラスを削除
            document.querySelectorAll('.toc-item').forEach((item) => {
              item.classList.remove('toc-active');
            });
            
            // 現在のセクションに対応する目次項目にアクティブクラスを追加
            const tocItems = document.querySelectorAll(`.toc-item[href="#${currentId}"]`);
            tocItems.forEach(item => {
              item.classList.add('toc-active');
            });
          }
        });
      },
      { threshold: 0.2, rootMargin: '-100px 0px -100px 0px' } // セクションが20%以上表示されたらハイライト、マージンを追加
    );
    
    // 監視対象のセクションを設定
    sectionIds.forEach((id) => {
      const element = document.getElementById(id);
      if (element) {
        observer.observe(element);
      }
    });
    
    return () => {
      // クリーンアップ
      sectionIds.forEach((id) => {
        const element = document.getElementById(id);
        if (element) {
          observer.unobserve(element);
        }
      });
    };
  }, []);

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
    
    /* モバイルデバイス用のアニメーション変数とスタイルを追加 */
    @media (max-width: 768px) {
      :root {
        --animation-duration: 0.4s; /* モバイルでは少し速めにアニメーション */
        --animation-easing: cubic-bezier(0.25, 0.1, 0.25, 1); /* より単純なイージング関数 */
      }
      
      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(15px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      @keyframes fadeInLeft {
        from {
          opacity: 0;
          transform: translateX(-10px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
      
      @keyframes fadeInRight {
        from {
          opacity: 0;
          transform: translateX(10px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
      
      @keyframes fadeIn {
        from { 
          opacity: 0; 
          transform: translateY(8px);
        }
        to { 
          opacity: 1; 
          transform: translateY(0);
        }
      }
      
      /* スクロールアニメーションのblurを無効化し、トランジションを最適化 */
      .scroll-animate {
        filter: none !important;
        transition: opacity var(--animation-duration) var(--animation-easing),
                    transform var(--animation-duration) var(--animation-easing);
      }
      
      .scroll-animate-left, .scroll-animate-right {
        filter: none !important;
      }
      
      /* アニメーション要素のパフォーマンス最適化 */
      .animate-fadeInUp, .animate-fadeInLeft, .animate-fadeInRight, .animate-fadeIn {
        will-change: transform, opacity;
        contain: layout paint style; /* コンテンツの影響範囲を制限 */
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
    
    /* 目次のアクティブ状態のスタイル - 共通 */
    .toc-item {
      transition: all 0.3s ease;
      position: relative; /* すべてのtoc-itemに位置指定を追加 */
      border-left: 2px solid transparent; /* すべてのtoc-itemに透明なボーダーを追加 */
    }
    
    /* サイドバー内の目次のアクティブ状態 */
    .toc-active {
      color: hsl(var(--primary));
      background-color: rgba(var(--primary-rgb), 0.05);
    }
    
    /* サイドバー内の目次アイテムの追加スタイル */
    .lg\\:block .toc-item.toc-active {
      border-left: 2px solid hsl(var(--primary));
      padding-left: 8px;
    }
    
    .lg\\:block .toc-active .circle-number {
      background-color: rgba(var(--primary-rgb), 0.3);
    }
    
    /* モバイル目次のアクティブ状態 */
    .lg\\:hidden .toc-active {
      background-color: rgba(var(--primary-rgb), 0.1);
      font-weight: 600;
    }
    
    .lg\\:hidden .toc-active div {
      background-color: rgba(var(--primary-rgb), 0.3);
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
          content="競馬, 期待値, 期待値計算, 期待値計算ツール, 馬券戦略"
        />
        <link rel="canonical" href="https://horse-stakes.com/guide" />
        {/* クリティカルCSSをインライン化 */}
        <style>
          {`
          /* クリティカルCSS - ファーストビューのみ最適化 */
          .hero-image {
            width: 100%;
            height: 100%;
            display: block;
            object-fit: cover;
            object-position: center center;
            background-color: transparent;
            content-visibility: auto;
            will-change: transform; /* GPU支援を有効化 */
            transform: translateZ(0); /* GPU支援を有効化 */
            transition: opacity 0.2s ease-in-out;
          }
          .hero-image-container {
            position: relative;
            width: 100%;
            overflow: hidden;
            border-radius: 0.75rem;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
            aspect-ratio: 16/9;
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: transparent;
            will-change: transform; /* GPU支援を有効化 */
            transform: translateZ(0); /* GPU支援を有効化 */
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='360' height='203' viewBox='0 0 360 203' fill='none'%3E%3Crect width='360' height='203' fill='%23EAECEF'/%3E%3Cpath d='M180 101.5C191.046 101.5 200 92.5457 200 81.5C200 70.4543 191.046 61.5 180 61.5C168.954 61.5 160 70.4543 160 81.5C160 92.5457 168.954 101.5 180 101.5Z' fill='%23D4D6D9'/%3E%3Cpath d='M125 145.5L235 145.5' stroke='%23D4D6D9' stroke-width='4'/%3E%3Cpath d='M155 125.5L205 125.5' stroke='%23D4D6D9' stroke-width='4'/%3E%3C/svg%3E");
            background-size: cover;
            background-position: center;
          }
          picture {
            width: 100%;
            height: 100%;
            display: block;
          }
          .hero-overlay {
            position: absolute;
            inset: 0;
            background: linear-gradient(to top, rgba(0,0,0,0.1) 0%, transparent 80%);
            pointer-events: none;
            z-index: 1;
          }
          /* スマホ最適化 */
          @media (max-width: 640px) {
            .hero-image-container {
              min-height: unset; /* min-heightを削除 */
              transform: translateZ(0);
              contain: layout paint; /* パフォーマンス向上 */
            }
            .hero-image {
              transform: translateZ(0);
              contain: layout paint; /* パフォーマンス向上 */
            }
          }

          /* --- Added Title styles --- */
          #title-section-wrapper .text-center {
            text-align: center;
          }
          #title-section-wrapper h1 {
            /* pb-1 md:pb-2 text-3xl sm:text-4xl md:text-5xl font-bold mb-4 text-foreground relative inline-block whitespace-nowrap */
            padding-bottom: 0.25rem; /* pb-1 */
            font-size: 1.875rem; /* 3xl */
            line-height: 2.25rem;
            font-weight: 700;
            margin-bottom: 1rem; /* mb-4 */
            /* color: hsl(var(--foreground)); Replace with actual color */
            position: relative;
            display: inline-block;
            white-space: nowrap;
          }
          #title-section-wrapper h1 span {
            /* absolute -bottom-3 left-0 right-0 h-1 bg-primary rounded-full transform scale-x-75 mx-auto */
            position: absolute;
            bottom: -0.75rem; /* -bottom-3 */
            left: 0;
            right: 0;
            height: 0.25rem; /* h-1 */
            /* background-color: hsl(var(--primary)); Replace with actual color */
            border-radius: 9999px;
            transform: scaleX(0.75);
            margin-left: auto;
            margin-right: auto;
          }
          #title-section-wrapper p:nth-of-type(1) { /* Subtitle */
            /* pt-1 md:pt-2 text-xl md:text-2xl font-medium text-foreground/90 mb-4 whitespace-nowrap */
            padding-top: 0.25rem; /* pt-1 */
            font-size: 1.25rem; /* xl */
            line-height: 1.75rem;
            font-weight: 500;
            /* color: hsla(var(--foreground), 0.9); Replace with actual color */
            margin-bottom: 1rem; /* mb-4 */
            white-space: nowrap;
          }
          #title-section-wrapper p:nth-of-type(2) { /* Description */
            /* text-base md:text-lg text-muted-foreground max-w-2xl mx-auto mb-6 */
            font-size: 1rem; /* base */
            line-height: 1.5rem;
            /* color: hsl(var(--muted-foreground)); Replace with actual color */
            max-width: 42rem; /* max-w-2xl */
            margin-left: auto;
            margin-right: auto;
            margin-bottom: 1.5rem; /* mb-6 */
          }

          /* Responsive Title Styles */
          @media (min-width: 768px) { /* md: */
            #title-section-wrapper h1 { padding-bottom: 0.5rem; font-size: 3rem; line-height: 1; }
            #title-section-wrapper p:nth-of-type(1) { padding-top: 0.5rem; font-size: 1.5rem; line-height: 2rem; }
            #title-section-wrapper p:nth-of-type(2) { font-size: 1.125rem; line-height: 1.75rem; }
          }
          @media (min-width: 640px) { /* sm: */
            #title-section-wrapper h1 { font-size: 2.25rem; line-height: 2.5rem; }
          }
          /* --- End Added Title styles --- */
          `}
        </style>
        {/* モバイル向けの画像をプリロード（優先度高） */}
        <link
          rel="preload"
          href="/images/mobile/optimized_guide_header_mobile.webp"
          as="image"
          type="image/webp"
          media="(max-width: 640px)"
          {...({fetchpriority: 'high', importance: 'high'} as any)}
        />
        {/* デスクトップ向けの画像をプリロード */}
        <link
          rel="preload"
          href="/images/optimized_guide_header.webp"
          as="image"
          type="image/webp"
          media="(min-width: 641px)"
          {...({fetchpriority: 'high', importance: 'high'} as any)}
        />
        <meta property="og:title" content="競馬の期待値計算と回収率アップガイド | 馬券戦略" />
        <meta property="og:description" content="競馬で期待値計算を活用して回収率を上げるための完全ガイド。オッズと予想確率から期待値を算出する方法と、期待値の高い馬券を効率的に見つけるコツを解説。期待値1.4以上の馬券を狙って長期的に利益を出す戦略を学びましょう。" />
        <meta property="og:type" content="article" />
        <meta property="og:url" content="https://horse-stakes.com/guide" />
        <meta property="og:image" content="https://horse-stakes.com/images/optimized_guide_header.webp" />
        <meta property="og:site_name" content="馬券戦略" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="競馬の期待値計算と回収率アップガイド | 馬券戦略" />
        <meta name="twitter:description" content="競馬で期待値計算を活用して回収率を上げるための完全ガイド。オッズと予想確率から期待値を算出する方法と、期待値の高い馬券を効率的に見つけるコツを解説。" />
        <meta name="twitter:image" content="https://horse-stakes.com/images/optimized_guide_header.webp" />
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
          "dateModified": "2025-04-04",
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
                "text": "期待値計算ツールは、単勝、複勝、馬連、馬単、ワイド、3連複、3連単など、JRAの主要な馬券種類すべてに対応しています。単勝確率と複勝確率を入力するだけで、すべての券種について期待値計算を行います。"
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

      {/* BreadcrumbList構造化データ */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          "itemListElement": [
            {
              "@type": "ListItem",
              "position": 1,
              "name": "トップページ",
              "item": "https://horse-stakes.com"
            },
            {
              "@type": "ListItem",
              "position": 2,
              "name": "競馬の期待値計算と回収率アップガイド",
              "item": "https://horse-stakes.com/guide"
            }
          ]
        })}
      </script>

      {/* このページ専用の余白調整 */}
      <div className="mt-6 sm:mt-8 md:mt-10"></div>

      {/* ヘッダー画像を最初に大きく表示 */}
      <div className="relative w-full max-w-6xl mx-auto px-4 sm:px-6 mb-8">
        {/* スマホとPCで異なるサイズの画像を使用 */}
        <div className="hero-image-container" data-lcp-container="true">
          {/* LCP対策：スマホ画像の事前読み込み */}
          <link 
            rel="preload" 
            href="/images/mobile/optimized_guide_header_mobile.webp" 
            as="image" 
            type="image/webp" 
            media="(max-width: 640px)" 
          />
          <picture>
            {/* スマホ向け (640px以下) - モバイル向け最適化画像を直接使用 */}
            <source
              media="(max-width: 640px)"
              srcSet="/images/mobile/optimized_guide_header_mobile.webp"
              sizes="100vw"
              type="image/webp"
              {...{ fetchpriority: 'high' } as any}
            />
            {/* タブレット向け (641px-1024px) */}
            <source
              media="(max-width: 1024px)"
              srcSet="/images/optimized_guide_header.webp"
              sizes="100vw"
              type="image/webp"
              {...{ fetchpriority: 'high' } as any}
            />
            {/* デスクトップ向け */}
            <source
              media="(min-width: 1025px)"
              srcSet="/images/optimized_guide_header.webp"
              sizes="1200px"
              type="image/webp"
              {...{ fetchpriority: 'high' } as any}
            />
            {/* フォールバック - 直接最適化された画像を使用 */}
            <img 
              src="/images/mobile/optimized_guide_header_mobile.webp" 
              alt="競馬の期待値思考 - 回収率アップの秘訣" 
              className="hero-image smart-loading lcp-priority"
              width="640"
              height="360"
              loading="eager"
              decoding="async"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 100vw, min(100vw, 1200px)" 
              {...{ fetchpriority: 'high', importance: 'high' } as any}
              onLoad={(e) => {
                if (e.currentTarget) {
                  // シンプルに表示のみ
                  e.currentTarget.classList.add('critical-visible');
                  
                  // ロード完了を報告
                  if (window.performance && window.performance.mark) {
                    window.performance.mark('hero-image-loaded');
                  }
                  
                  // レイアウトシフト防止のためのマーカー
                  document.documentElement.classList.add('lcp-loaded');
                }
              }}
            />
          </picture>
          {/* オーバーレイ効果を調整 - より薄く */}
          <div className="hero-overlay"></div>
        </div>
      </div>

      {/* タイトルセクション - シンプルかつ洗練されたデザイン */}
      <div id="title-section-wrapper" className="relative w-full max-w-6xl mx-auto px-4 sm:px-6 mb-12">
        <div className="text-center">
          <h1 className="pb-1 md:pb-2 text-3xl sm:text-4xl md:text-5xl font-bold mb-4 text-foreground relative inline-block whitespace-nowrap">
            競馬の期待値思考
            <span className="absolute -bottom-3 left-0 right-0 h-1 bg-primary rounded-full transform scale-x-75 mx-auto"></span>
          </h1>
          <p className="pt-1 md:pt-2 text-xl md:text-2xl font-medium text-foreground/90 mb-4 whitespace-nowrap">
            回収率アップの秘訣と実践方法
          </p>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto mb-6">
            オッズと予想確率から期待値を算出し、回収率向上を目指す方法を解説します。
          </p>
          
          {/* モバイル/タブレット用のコンパクト目次 */}
          <div className="lg:hidden w-full max-w-md mx-auto bg-background/80 border border-primary/20 rounded-lg p-3 shadow-sm backdrop-blur-sm mb-8 animate-fadeInUp">
            <div className="flex items-center justify-center mb-2 text-primary font-medium">
              <BookOpen className="h-4 w-4 mr-1.5" />
              <span className="text-sm">目次</span>
            </div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-xs">
              <a href="#what-is-ev" className="toc-item px-2 py-1 rounded hover:bg-primary/5 transition-colors flex items-center">
                <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center mr-1.5 flex-shrink-0">1</div>
                <span className="truncate">期待値思考とは？</span>
              </a>
              <a href="#ev-examples" className="toc-item px-2 py-1 rounded hover:bg-primary/5 transition-colors flex items-center">
                <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center mr-1.5 flex-shrink-0">2</div>
                <span className="truncate">期待値計算例</span>
              </a>
              <a href="#win-place-prob" className="toc-item px-2 py-1 rounded hover:bg-primary/5 transition-colors flex items-center">
                <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center mr-1.5 flex-shrink-0">3</div>
                <span className="truncate">確率予想法</span>
              </a>
              <a href="#optimal-betting" className="toc-item px-2 py-1 rounded hover:bg-primary/5 transition-colors flex items-center">
                <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center mr-1.5 flex-shrink-0">4</div>
                <span className="truncate">最適馬券構成</span>
              </a>
              <a href="#ev-tools" className="toc-item px-2 py-1 rounded hover:bg-primary/5 transition-colors flex items-center">
                <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center mr-1.5 flex-shrink-0">5</div>
                <span className="truncate">計算ツール</span>
              </a>
              <a href="#ev-training" className="toc-item px-2 py-1 rounded hover:bg-primary/5 transition-colors flex items-center">
                <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center mr-1.5 flex-shrink-0">6</div>
                <span className="truncate">実践トレーニング</span>
              </a>
              <a href="#faq" className="toc-item px-2 py-1 rounded hover:bg-primary/5 transition-colors flex items-center col-span-2">
                <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center mr-1.5 flex-shrink-0">7</div>
                <span className="truncate">よくある質問</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* コンテンツをメインとサイドバーの2カラムレイアウトに変更 */}
      {/* v1.2 - サイドバーはPCのみ表示、モバイルは下部に目次リンク追加 */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8 px-4 sm:px-6">
        {/* メインコンテンツ - 最大幅を左側3/4に制限 */}
        <div className="lg:col-span-3">

          {/* セクション1: 期待値の基本概念 */}
          <div id="what-is-ev" className="mb-12 scroll-mt-16 section-highlight">
            <div className="flex items-center mb-4">
              <div className="bg-primary/10 p-2 rounded-lg mr-2 shadow-sm">
                <Calculator className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <div>
                <span className="text-xs sm:text-sm font-medium text-primary/70 block">01</span>
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
                  <div className="flex items-start">
                    <Check className="h-3.5 w-3.5 text-green-500 ml-1 sm:ml-3 mr-4 sm:mr-5 flex-shrink-0 mt-1" />
                    <div className="text-xs sm:text-sm">
                      <div className="mb-1 sm:mb-2 font-medium">期待値 = 予想確率 × オッズ</div>
                      <div className="-ml-2 text-foreground/70">（1.0より大きければ理論上勝てる）</div>
                    </div>
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
                        <div className="absolute top-0 right-0 bg-red-500/10 text-red-500 text-xs sm:text-sm font-medium py-0.5 px-1.5 rounded-full border border-red-500/20">従来型</div>
                        <div className="border-2 border-dashed border-red-500/30 p-2 rounded-lg h-full flex flex-col items-center justify-center">
                          <div className="w-20 sm:w-24 h-20 sm:h-24 mx-auto mb-1.5 flex items-center justify-center bg-red-500/5 rounded-full">
                            <div className="text-red-500 font-bold text-xl sm:text-4xl">◎○▲</div>
                          </div>
                          <div className="text-center">
                            <p className="text-xs sm:text-sm font-medium">印予想</p>
                            <p className="text-xs sm:text-sm text-red-500/80">「なんとなく」</p>
                          </div>
                        </div>
                      </div>
                      <div className="relative">
                        <div className="absolute top-0 right-0 bg-green-500/10 text-green-500 text-xs sm:text-sm font-medium py-0.5 px-1.5 rounded-full border border-green-500/20">期待値</div>
                        <div className="border-2 border-dashed border-green-500/30 p-2 rounded-lg h-full flex flex-col items-center justify-center">
                          <div className="w-20 sm:w-24 h-20 sm:h-24 mx-auto mb-1.5 flex items-center justify-center bg-green-500/5 rounded-full">
                            <div className="text-center">
                              <div className="text-green-500 font-bold text-xs sm:text-sm">40% × 3.5倍</div>
                              <div className="text-green-500 font-bold text-xs sm:text-sm">= 1.4</div>
                            </div>
                          </div>
                          <div className="text-center">
                            <p className="text-xs sm:text-sm font-medium">確率予想</p>
                            <p className="text-xs sm:text-sm text-green-500/80">「数値で判断」</p>
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
                      <ul className="space-y-1 text-xs sm:text-sm">
                        <li className="flex items-start gap-1.5">
                          <span className="min-w-3.5 w-3.5 h-3.5 rounded-full bg-red-500/20 flex items-center justify-center text-xs sm:text-sm font-medium mt-0.5 flex-shrink-0">×</span>
                          <span>馬券の「価値」がわからない</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <span className="min-w-3.5 w-3.5 h-3.5 rounded-full bg-red-500/20 flex items-center justify-center text-xs sm:text-sm font-medium mt-0.5 flex-shrink-0">×</span>
                          <span>オッズ対比の判断不可</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <span className="min-w-3.5 w-3.5 h-3.5 rounded-full bg-red-500/20 flex items-center justify-center text-xs sm:text-sm font-medium mt-0.5 flex-shrink-0">×</span>
                          <span>資金配分を最適化できない</span>
                        </li>
                      </ul>
                    </div>
                    <div className="p-2.5 sm:p-4 rounded-lg bg-green-500/10 space-y-1 border border-green-500/20 shadow-sm scroll-animate-right">
                      <p className="font-semibold text-green-500 flex items-center gap-1 text-xs sm:text-base mb-1">
                        <Check className="h-3 w-3 sm:h-4 sm:w-4" />
                        確率予想の優位性
                      </p>
                      <ul className="space-y-1 text-xs sm:text-sm">
                        <li className="flex items-start gap-1.5">
                          <span className="min-w-3.5 w-3.5 h-3.5 rounded-full bg-green-500/20 flex items-center justify-center text-xs sm:text-sm font-medium mt-0.5 flex-shrink-0">○</span>
                          <span>馬の勝率を数値化できる</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <span className="min-w-3.5 w-3.5 h-3.5 rounded-full bg-green-500/20 flex items-center justify-center text-xs sm:text-sm font-medium mt-0.5 flex-shrink-0">○</span>
                          <span>投資価値を計算可能</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <span className="min-w-3.5 w-3.5 h-3.5 rounded-full bg-green-500/20 flex items-center justify-center text-xs sm:text-sm font-medium mt-0.5 flex-shrink-0">○</span>
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
                        <p className="text-xs sm:text-sm font-medium">予想確率</p>
                        <p className="text-sm sm:text-xl font-bold text-primary">20%</p>
                      </div>
                      
                      <div className="text-base sm:text-3xl font-bold text-primary hidden sm:block">×</div>
                      
                      <div className="flex flex-col items-center">
                        <div className="w-9 sm:w-16 h-9 sm:h-16 rounded-full bg-primary/10 flex items-center justify-center mb-1">
                          <Coins className="h-4 sm:h-7 w-4 sm:w-7 text-primary" />
                        </div>
                        <p className="text-xs sm:text-sm font-medium">オッズ</p>
                        <p className="text-sm sm:text-xl font-bold text-primary">8.0倍</p>
                      </div>
                      
                      <div className="text-base sm:text-3xl font-bold text-primary hidden sm:block">=</div>
                      
                      <div className="flex flex-col items-center">
                        <div className="w-9 sm:w-16 h-9 sm:h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-1">
                          <Calculator className="h-4 sm:h-7 w-4 sm:w-7 text-green-500" />
                        </div>
                        <p className="text-xs sm:text-sm font-medium">期待値</p>
                        <p className="text-sm sm:text-xl font-bold text-green-500">1.6</p>
                        <p className="text-xs sm:text-sm text-green-500/80">買いの馬券</p>
                      </div>

                      {/* モバイル表示用の数式 */}
                      <div className="col-span-3 text-center text-xs block sm:hidden mt-1.5 bg-primary/5 py-1 px-1 rounded-md">
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
                      
                      <div className="bg-background/80 p-2 rounded-md border border-green-500/10 text-xs sm:text-sm">
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
                      
                      <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
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

          <div id="ev-examples" className="mb-10 scroll-mt-16 section-highlight animate-fadeIn" style={{ animationDelay: 'calc(var(--animation-stagger) * 9)' }}>
            <div className="flex items-center mb-4">
              <div className="bg-primary/10 p-2 rounded-lg mr-2 shadow-sm">
                <Calculator className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <div>
                <span className="text-xs sm:text-sm font-medium text-primary/70 block">02</span>
                <h2 className="text-lg sm:text-3xl font-bold">期待値の実践活用</h2>
              </div>
            </div>

            <div className="space-y-4 sm:space-y-6">
              <Card className="overflow-hidden bg-background/50 backdrop-blur-sm border-primary/10 shadow-md scroll-animate">
                <CardHeader className="border-b border-primary/5 bg-primary/5 py-2.5 px-3 sm:px-6">
                  <CardTitle className="text-foreground text-sm sm:text-lg flex items-center">
                    <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary mr-1.5" />
                    市場予想 vs 自分予想：ギャップを狙う
                  </CardTitle>
                </CardHeader>
                
                <CardContent className="pt-3 px-3 sm:px-6">
                  {/* モバイル向けシンプルな期待値計算例示 */}
                  <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-lg border border-red-400/30 shadow-sm overflow-hidden">
                      <div className="bg-red-500/10 p-2 border-b border-red-500/20 flex items-center">
                        <div className="w-8 h-8 flex-shrink-0 rounded-full bg-red-100 flex items-center justify-center mr-2">
                          <span className="text-red-600 font-bold text-xs sm:text-sm">1番</span>
                        </div>
                        <p className="text-xs sm:text-sm font-semibold">単勝2.0倍の1番人気</p>
                      </div>
                      <div className="p-2 text-xs sm:text-sm">
                        <div className="flex justify-between items-center mb-1">
                          <span>市場予想：<span className="font-medium">50%</span></span>
                          <span>あなた：<span className="font-medium">40%</span></span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden mb-2">
                          <div className="bg-red-400 h-full" style={{ width: '80%' }}></div>
                        </div>
                        <div className="flex items-center gap-1">
                          <ArrowDown className="h-3 w-3 text-red-500" />
                          <span className="font-medium">期待値：<span className="text-red-500">0.8</span></span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="rounded-lg border border-green-400/30 shadow-sm overflow-hidden">
                      <div className="bg-green-500/10 p-2 border-b border-green-500/20 flex items-center">
                        <div className="w-8 h-8 flex-shrink-0 rounded-full bg-emerald-100 flex items-center justify-center mr-2">
                          <span className="text-emerald-600 font-bold text-xs sm:text-sm">穴馬</span>
                        </div>
                        <p className="text-xs sm:text-sm font-semibold">単勝10.0倍の穴馬</p>
                      </div>
                      <div className="p-2 text-xs sm:text-sm">
                        <div className="flex justify-between items-center mb-1">
                          <span>市場予想：<span className="font-medium">10%</span></span>
                          <span>あなた：<span className="font-medium">15%</span></span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden mb-2">
                          <div className="bg-green-400 h-full" style={{ width: '150%' }}></div>
                        </div>
                        <div className="flex items-center gap-1">
                          <ArrowUp className="h-3 w-3 text-green-500" />
                          <span className="font-medium">期待値：<span className="text-green-500">1.5</span></span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mb-4 p-2 sm:p-4 rounded-lg bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 border border-primary/20 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 sm:w-9 sm:h-9 flex-shrink-0 rounded-full bg-primary/20 flex items-center justify-center">
                        <SearchIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                      </div>
                      <h3 className="text-xs sm:text-base font-semibold">市場とのギャップを狙う</h3>
                    </div>
                    <div className="space-y-1 text-xs sm:text-sm">
                      <div className="py-1.5 px-2 rounded-md bg-background/70 border border-primary/10">
                        <div className="flex items-center">
                          <ArrowDownRight className="h-3 w-3 text-red-500 mr-1 flex-shrink-0" />
                          <span>1番人気：市場の<span className="font-medium text-red-500">過大評価</span></span>
                        </div>
                        <div className="flex items-center mt-1">
                          <ArrowUpRight className="h-3 w-3 text-green-500 mr-1 flex-shrink-0" />
                          <span>穴馬：市場の<span className="font-medium text-green-500">過小評価</span></span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* 実践的な期待値判断基準 - モバイル最適化 */}
                  <div className="p-2 sm:p-4 rounded-lg bg-background/90 border border-primary/10 shadow-sm mb-1">
                    <h3 className="font-medium text-xs sm:text-base mb-2 flex items-center">
                      <Target className="h-3 w-3 sm:h-4 sm:w-4 text-primary mr-1" />
                      実践ガイド：3ステップ
                    </h3>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="p-2 rounded-md bg-primary/5 border border-primary/10 relative">
                        <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">1</div>
                        <div className="flex flex-col items-center pt-3 pb-1">
                          <Search className="h-4 w-4 sm:h-6 sm:w-6 text-primary mb-3" />
                          <p className="text-xs sm:text-sm text-center font-medium">市場より高く予想できる馬を探す</p>
                        </div>
                      </div>
                      
                      <div className="p-2 rounded-md bg-primary/5 border border-primary/10 relative">
                        <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">2</div>
                        <div className="flex flex-col items-center pt-3 pb-1">
                          <ThumbsUp className="h-4 w-4 sm:h-6 sm:w-6 text-primary mb-3" />
                          <p className="text-xs sm:text-sm text-center font-medium">期待値1.4以上を優先</p>
                        </div>
                      </div>
                      
                      <div className="p-2 rounded-md bg-primary/5 border border-primary/10 relative">
                        <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">3</div>
                        <div className="flex flex-col items-center pt-3 pb-1">
                          <Wallet className="h-4 w-4 sm:h-6 sm:w-6 text-primary mb-3" />
                          <p className="text-xs sm:text-sm text-center font-medium">期待値の高さで資金配分</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="overflow-hidden bg-background/50 backdrop-blur-sm border-primary/10 shadow-md scroll-animate">
                <CardHeader className="border-b border-primary/5 bg-primary/5 py-2.5 px-3 sm:px-6">
                  <CardTitle className="text-foreground text-sm sm:text-lg flex items-center">
                    <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary mr-1.5" />
                    期待値別の馬券購入戦略
                  </CardTitle>
                </CardHeader>
                
                <CardContent className="pt-3 px-3 sm:px-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                    <div className="p-2 sm:p-4 bg-primary/5 rounded-lg border border-primary/10">
                      <h4 className="text-xs sm:text-base font-medium flex items-center gap-1 mb-1.5">
                        <CircleDollarSign className="h-3.5 w-3.5 text-primary" />
                        期待値1.4の法則
                      </h4>
                      <div className="grid grid-cols-2 gap-1.5 text-xs sm:text-sm">
                        <div className="p-1.5 bg-red-50/50 dark:bg-red-900/20 rounded">
                          <div className="flex items-center mb-0.5">
                            <X className="h-3 w-3 text-red-500 mr-0.5" />
                            <span className="font-medium">期待値1.0の罠</span>
                          </div>
                          <p>予想誤差で実質マイナス</p>
                        </div>
                        <div className="p-1.5 bg-green-50/50 dark:bg-green-900/20 rounded">
                          <div className="flex items-center mb-0.5">
                            <Check className="h-3 w-3 text-green-500 mr-0.5" />
                            <span className="font-medium">1.4以上の価値</span>
                          </div>
                          <p>誤差があっても利益確保</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-2 sm:p-4 bg-primary/5 rounded-lg border border-primary/10">
                      <h4 className="text-xs sm:text-base font-medium flex items-center gap-1 mb-1.5">
                        <LineChart className="h-3.5 w-3.5 text-primary" />
                        投資額目安
                      </h4>
                      <div className="space-y-1.5 text-xs sm:text-sm">
                        <div className="flex items-center gap-1">
                          <div className="w-4 h-4 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                            <AlertTriangle className="h-2 w-2 text-yellow-600" />
                          </div>
                          <span className="font-medium text-yellow-600">〜1.4</span>
                          <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full ml-2">
                            <div className="h-full bg-yellow-500 rounded-full" style={{ width: '30%' }}></div>
                          </div>
                          <span>〜3%</span>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <div className="w-4 h-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                            <CircleCheck className="h-2 w-2 text-green-600" />
                          </div>
                          <span className="font-medium text-green-600">〜1.7</span>
                          <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full ml-2">
                            <div className="h-full bg-green-500 rounded-full" style={{ width: '60%' }}></div>
                          </div>
                          <span>〜6%</span>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <div className="w-4 h-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                            <CircleCheck className="h-2 w-2 text-green-600" />
                          </div>
                          <span className="font-medium text-green-600">1.7〜</span>
                          <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full ml-2">
                            <div className="h-full bg-green-500 rounded-full" style={{ width: '90%' }}></div>
                          </div>
                          <span>〜9%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border border-primary/10 rounded-lg overflow-hidden bg-background/90 shadow-sm mb-3">
                    <div className="p-2 bg-primary/5 border-b border-primary/10 flex items-center">
                      <Award className="h-3.5 w-3.5 text-primary mr-1.5" />
                      <p className="text-xs sm:text-sm font-medium">分散投資の例（期待値で配分）</p>
                    </div>
                    <div className="p-2">
                      <div className="space-y-2 text-xs sm:text-sm">
                        <div className="flex justify-between items-center p-1.5 bg-green-50/30 dark:bg-green-900/20 rounded border border-green-200/50 dark:border-green-800/30">
                          <div className="flex items-center gap-1">
                            <div className="w-4 h-4 rounded-full bg-green-100/50 dark:bg-green-900/30 flex items-center justify-center text-xs font-medium">◎</div>
                            <span>3番 単勝 <span className="text-green-600">(1.8)</span></span>
                          </div>
                          <div className="flex items-center">
                            <span className="mr-1 font-medium">6%</span>
                            <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div className="h-full bg-green-500" style={{ width: '60%' }}></div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-center p-1.5 bg-green-50/30 dark:bg-green-900/20 rounded border border-green-200/50 dark:border-green-800/30">
                          <div className="flex items-center gap-1">
                            <div className="w-4 h-4 rounded-full bg-green-100/50 dark:bg-green-900/30 flex items-center justify-center text-xs font-medium">○</div>
                            <span>3-5 馬連 <span className="text-green-600">(1.5)</span></span>
                          </div>
                          <div className="flex items-center">
                            <span className="mr-1 font-medium">4%</span>
                            <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div className="h-full bg-green-500" style={{ width: '40%' }}></div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-center p-1.5 bg-green-50/30 dark:bg-green-900/20 rounded border border-green-200/50 dark:border-green-800/30">
                          <div className="flex items-center gap-1">
                            <div className="w-4 h-4 rounded-full bg-green-100/50 dark:bg-green-900/30 flex items-center justify-center text-xs font-medium">△</div>
                            <span>3-5-7 3連複 <span className="text-green-600">(1.4)</span></span>
                          </div>
                          <div className="flex items-center">
                            <span className="mr-1 font-medium">3%</span>
                            <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div className="h-full bg-green-500" style={{ width: '30%' }}></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div id="win-place-prob" className="mb-10 scroll-mt-16">
            <div className="flex items-center mb-4">
              <div className="bg-primary/10 p-2 rounded-lg mr-2 shadow-sm">
                <BarChart3 className="h-4 w-4 sm:h-6 sm:w-6 text-primary" />
              </div>
              <div>
                <span className="text-xs sm:text-sm font-medium text-primary/70 block">03</span>
                <h2 className="text-lg sm:text-3xl font-bold">確率の科学的予想法</h2>
              </div>
            </div>

            <div className="space-y-4 sm:space-y-8">
              <Card className="overflow-hidden bg-background/50 backdrop-blur-sm border-primary/10 shadow-md scroll-animate">
                <CardHeader className="border-b border-primary/5 bg-primary/5 py-2.5 px-3 sm:px-6">
                  <CardTitle className="text-foreground text-sm sm:text-xl flex items-center">
                    <Target className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-primary mr-1.5" />
                    単勝オッズと勝率の関係
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-3 px-3 sm:px-6 sm:pt-6">
                  <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5">
                    <div className="p-3 rounded-lg bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/10 shadow-sm">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                          <LineChartIcon className="h-4 w-4 text-primary" />
                        </div>
                        <p className="font-medium text-xs sm:text-lg">オッズと勝率の相関</p>
                      </div>
                      <p className="text-xs sm:text-base">
                        オッズは市場予想の反映であり、実際の勝率と相関している
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-gradient-to-br from-yellow-500/5 to-yellow-500/10 border border-yellow-500/10 shadow-sm">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center">
                          <Coins className="h-4 w-4 text-yellow-500" />
                        </div>
                        <p className="font-medium text-xs sm:text-lg">回収率の現実</p>
                      </div>
                      <p className="text-xs sm:text-base">
                        各オッズ帯の回収率は80%前後、オッズ以上の価値を見出す必要あり
                      </p>
                    </div>
                  </div>
                  
                  <div className="mb-4 overflow-x-auto">
                    <table className="w-full border-collapse bg-background/80 shadow-sm rounded-lg overflow-hidden text-xs sm:text-sm">
                      <thead>
                        <tr className="bg-gradient-to-r from-primary/10 to-primary/5">
                          <th className="p-2 sm:p-3 text-left border-b border-r border-primary/10 font-medium">オッズ</th>
                          <th className="p-2 sm:p-3 text-center border-b border-r border-primary/10 font-medium">勝率</th>
                          <th className="p-2 sm:p-3 text-center border-b border-primary/10 font-medium">回収率</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="hover:bg-primary/5 transition-colors border-b border-primary/10">
                          <td className="p-2 sm:p-3 border-r border-primary/10 font-medium">1.5倍以下</td>
                          <td className="p-2 sm:p-3 text-center border-r border-primary/10">
                            <div className="flex items-center justify-center">
                              <span className="font-medium mr-1 sm:mr-2">59.2%</span>
                              <div 
                                className="w-12 sm:w-24 bg-gray-200 h-1.5 sm:h-2 rounded-full"
                                style={{ backgroundImage: 'linear-gradient(to right, #22c55e 59.2%, transparent 59.2%)' }}
                              >
                              </div>
                            </div>
                          </td>
                          <td className="p-2 sm:p-3 text-center text-yellow-600 font-medium">81.6%</td>
                        </tr>
                        <tr className="hover:bg-primary/5 transition-colors border-b border-primary/10 bg-background/30">
                          <td className="p-2 sm:p-3 border-r border-primary/10 font-medium">1.5〜3.0倍</td>
                          <td className="p-2 sm:p-3 text-center border-r border-primary/10">
                            <div className="flex items-center justify-center">
                              <span className="font-medium mr-1 sm:mr-2">36.6%</span>
                              <div 
                                className="w-12 sm:w-24 bg-gray-200 h-1.5 sm:h-2 rounded-full"
                                style={{ backgroundImage: 'linear-gradient(to right, #22c55e 36.6%, transparent 36.6%)' }}
                              >
                              </div>
                            </div>
                          </td>
                          <td className="p-2 sm:p-3 text-center text-yellow-600 font-medium">77.4%</td>
                        </tr>
                        <tr className="hover:bg-primary/5 transition-colors border-b border-primary/10">
                          <td className="p-2 sm:p-3 border-r border-primary/10 font-medium">3.0〜7.0倍</td>
                          <td className="p-2 sm:p-3 text-center border-r border-primary/10">
                            <div className="flex items-center justify-center">
                              <span className="font-medium mr-1 sm:mr-2">17.7%</span>
                              <div 
                                className="w-12 sm:w-24 bg-gray-200 h-1.5 sm:h-2 rounded-full"
                                style={{ backgroundImage: 'linear-gradient(to right, #22c55e 17.7%, transparent 17.7%)' }}
                              >
                              </div>
                            </div>
                          </td>
                          <td className="p-2 sm:p-3 text-center text-yellow-600 font-medium">79.2%</td>
                        </tr>
                        <tr className="hover:bg-primary/5 transition-colors border-b border-primary/10 bg-background/30">
                          <td className="p-2 sm:p-3 border-r border-primary/10 font-medium">7.0〜20.0倍</td>
                          <td className="p-2 sm:p-3 text-center border-r border-primary/10">
                            <div className="flex items-center justify-center">
                              <span className="font-medium mr-1 sm:mr-2">8.1%</span>
                              <div 
                                className="w-12 sm:w-24 bg-gray-200 h-1.5 sm:h-2 rounded-full"
                                style={{ backgroundImage: 'linear-gradient(to right, #22c55e 8.1%, transparent 8.1%)' }}
                              >
                              </div>
                            </div>
                          </td>
                          <td className="p-2 sm:p-3 text-center text-yellow-600 font-medium">84.1%</td>
                        </tr>
                        <tr className="hover:bg-primary/5 transition-colors border-b border-primary/10">
                          <td className="p-2 sm:p-3 border-r border-primary/10 font-medium">20.0〜50.0倍</td>
                          <td className="p-2 sm:p-3 text-center border-r border-primary/10">
                            <div className="flex items-center justify-center">
                              <span className="font-medium mr-1 sm:mr-2">2.6%</span>
                              <div 
                                className="w-12 sm:w-24 bg-gray-200 h-1.5 sm:h-2 rounded-full"
                                style={{ backgroundImage: 'linear-gradient(to right, #22c55e 2.6%, transparent 2.6%)' }}
                              >
                              </div>
                            </div>
                          </td>
                          <td className="p-2 sm:p-3 text-center text-yellow-600 font-medium">79.3%</td>
                        </tr>
                        <tr className="hover:bg-primary/5 transition-colors bg-background/30">
                          <td className="p-2 sm:p-3 border-r border-primary/10 font-medium">50.0倍以上</td>
                          <td className="p-2 sm:p-3 text-center border-r border-primary/10">
                            <div className="flex items-center justify-center">
                              <span className="font-medium mr-1 sm:mr-2">0.8%</span>
                              <div 
                                className="w-12 sm:w-24 bg-gray-200 h-1.5 sm:h-2 rounded-full"
                                style={{ backgroundImage: 'linear-gradient(to right, #22c55e 0.8%, transparent 0.8%)' }}
                              >
                              </div>
                            </div>
                          </td>
                          <td className="p-2 sm:p-3 text-center text-red-500 font-medium">69.1%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 shadow-sm">
                      <div className="flex items-center mb-2">
                        <CheckCircle2 className="h-5 w-5 text-green-500 mr-2" />
                        <p className="font-medium text-xs sm:text-sm">人気馬は期待通りの勝率</p>
                      </div>
                      <p className="text-xs sm:text-sm">オッズ1.5倍以下の1番人気馬は約60%の勝率を示し、市場の評価は比較的正確です</p>
                    </div>
                    
                    <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20 shadow-sm">
                      <div className="flex items-center mb-2">
                        <InfoIcon className="h-5 w-5 text-yellow-500 mr-2" />
                        <p className="font-medium text-xs sm:text-sm">中穴馬の回収率が高い</p>
                      </div>
                      <p className="text-xs sm:text-sm">7.0〜20.0倍のオッズ帯が84.1%と最も回収率が高く、期待値を見つけやすい領域</p>
                    </div>
                    
                    <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 shadow-sm">
                      <div className="flex items-center mb-2">
                        <X className="h-5 w-5 text-red-500 mr-2" />
                        <p className="font-medium text-xs sm:text-sm">大穴馬は回収率が低下</p>
                      </div>
                      <p className="text-xs sm:text-sm">50倍超の大穴馬は回収率が70%を下回り、期待値的に効率が悪い傾向があります</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="overflow-hidden bg-background/50 backdrop-blur-sm border-primary/10 shadow-lg hover:shadow-xl transition-shadow duration-300 scroll-animate">
                  <CardHeader className="border-b border-primary/5 bg-primary/5 py-2.5 px-3 sm:px-6">
                    <CardTitle className="text-foreground text-sm sm:text-xl flex items-center">
                      <Target className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-primary mr-1.5" />
                      確率予想の基本原則
                    </CardTitle>
                  </CardHeader>
                <CardContent className="pt-3 sm:pt-6 px-3 sm:px-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6 mb-3 sm:mb-6">
                    <div className="p-3 sm:p-5 rounded-xl bg-gradient-to-br from-red-500/5 to-red-500/10 border border-red-500/20 hover:shadow-md transition-all duration-300 relative overflow-hidden">
                      <div className="flex items-center space-x-2 sm:space-x-3 mb-2 sm:mb-3">
                        <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                          <span className="text-red-600 font-bold text-xs sm:text-lg">単</span>
                        </div>
                        <p className="font-semibold text-xs sm:text-lg">単勝確率の基本</p>
                      </div>
                      <ul className="space-y-1 sm:space-y-2">
                        <li className="flex items-start gap-1 sm:gap-2">
                          <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 text-red-500 mt-0.5 flex-shrink-0" />
                          <span className="text-xs sm:text-sm">各馬の1着になる確率を予想</span>
                        </li>
                        <li className="flex items-start gap-1 sm:gap-2">
                          <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 text-red-500 mt-0.5 flex-shrink-0" />
                          <span className="text-xs sm:text-sm"><strong>全馬の合計が100%</strong>になるよう調整</span>
                        </li>
                        <li className="flex items-start gap-1 sm:gap-2">
                          <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 text-red-500 mt-0.5 flex-shrink-0" />
                          <span className="text-xs sm:text-sm">単勝オッズの逆数から市場予想を推定</span>
                        </li>
                      </ul>
                      <div className="absolute bottom-0 right-0 w-12 h-12 sm:w-20 sm:h-20 bg-red-500/5 rounded-tl-full"></div>
                    </div>
                    
                    <div className="p-3 sm:p-5 rounded-xl bg-gradient-to-br from-green-500/5 to-green-500/10 border border-green-500/20 hover:shadow-md transition-all duration-300 relative overflow-hidden">
                      <div className="flex items-center space-x-2 sm:space-x-3 mb-2 sm:mb-3">
                        <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                          <span className="text-green-600 font-bold text-xs sm:text-lg">複</span>
                        </div>
                        <p className="font-semibold text-xs sm:text-lg">複勝確率の基本</p>
                      </div>
                      <ul className="space-y-1 sm:space-y-2">
                        <li className="flex items-start gap-1 sm:gap-2">
                          <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-xs sm:text-sm">各馬の3着以内に入る確率を予想</span>
                        </li>
                        <li className="flex items-start gap-1 sm:gap-2">
                          <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-xs sm:text-sm"><strong>全馬の合計が300%</strong>になるよう調整</span>
                        </li>
                        <li className="flex items-start gap-1 sm:gap-2">
                          <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-xs sm:text-sm">単勝確率の2〜3倍が目安になる</span>
                        </li>
                      </ul>
                      <div className="absolute bottom-0 right-0 w-12 h-12 sm:w-20 sm:h-20 bg-green-500/5 rounded-tl-full"></div>
                    </div>
                  </div>
                  
                  <div className="mb-3 sm:mb-6 border border-primary/10 sm:border-2 rounded-xl overflow-hidden">
                    <div className="p-2 sm:p-4 bg-primary/10 border-b border-primary/10">
                      <h3 className="font-semibold text-xs sm:text-lg flex items-center">
                        <Target className="h-3 w-3 sm:h-5 sm:w-5 text-primary mr-1 sm:mr-2" />
                        確率配分の具体例：10頭立てレース
                      </h3>
                    </div>
                    <div className="p-2 sm:p-5 bg-background/90">
                      <div className="overflow-x-auto mb-2 sm:mb-3">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="bg-gradient-to-r from-primary/10 to-primary/5">
                              <th className="p-1 sm:p-3 text-center border-b border-primary/10 text-xs sm:text-sm">人気</th>
                              <th className="p-1 sm:p-3 text-center border-b border-primary/10 text-xs sm:text-sm">単勝<span className="hidden sm:inline">オッズ</span></th>
                              <th className="p-1 sm:p-3 text-center border-b border-primary/10 text-xs sm:text-sm"><span className="hidden sm:inline">あなたの</span>単勝<span className="hidden sm:inline">確率</span></th>
                              <th className="p-1 sm:p-3 text-center border-b border-primary/10 text-xs sm:text-sm"><span className="hidden sm:inline">あなたの</span>複勝<span className="hidden sm:inline">確率</span></th>
                              <th className="p-1 sm:p-3 text-center border-b border-primary/10 text-xs sm:text-sm">期待値</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border-b border-primary/10 hover:bg-primary/5 transition-colors">
                              <td className="p-1 sm:p-3 text-center border-r border-primary/10 font-medium text-xs sm:text-sm">1人気</td>
                              <td className="p-1 sm:p-3 text-center text-xs sm:text-sm">2.5</td>
                              <td className="p-1 sm:p-3 text-center text-xs sm:text-sm">35%</td>
                              <td className="p-1 sm:p-3 text-center text-xs sm:text-sm">70%</td>
                              <td className="p-1 sm:p-3 text-center text-red-500 font-medium text-xs sm:text-sm">0.88</td>
                            </tr>
                            <tr className="border-b border-primary/10 bg-background/30 hover:bg-primary/5 transition-colors">
                              <td className="p-1 sm:p-3 text-center border-r border-primary/10 font-medium text-xs sm:text-sm">2人気</td>
                              <td className="p-1 sm:p-3 text-center text-xs sm:text-sm">4.0</td>
                              <td className="p-1 sm:p-3 text-center text-xs sm:text-sm">20%</td>
                              <td className="p-1 sm:p-3 text-center text-xs sm:text-sm">50%</td>
                              <td className="p-1 sm:p-3 text-center text-red-500 font-medium text-xs sm:text-sm">0.80</td>
                            </tr>
                            <tr className="border-b border-primary/10 hover:bg-primary/5 transition-colors">
                              <td className="p-1 sm:p-3 text-center border-r border-primary/10 font-medium text-xs sm:text-sm">3人気</td>
                              <td className="p-1 sm:p-3 text-center text-xs sm:text-sm">8.0</td>
                              <td className="p-1 sm:p-3 text-center text-xs sm:text-sm">12.5%</td>
                              <td className="p-1 sm:p-3 text-center text-xs sm:text-sm">15%</td>
                              <td className="p-1 sm:p-3 text-center text-green-500 font-medium text-xs sm:text-sm">1.20</td>
                            </tr>
                            <tr className="border-b border-primary/10 bg-background/30 hover:bg-primary/5 transition-colors">
                              <td className="p-1 sm:p-3 text-center border-r border-primary/10 font-medium text-xs sm:text-sm">4〜10<span className="hidden sm:inline">人気</span></td>
                              <td className="p-1 sm:p-3 text-center text-xs sm:text-sm">10<span className="hidden sm:inline">.0</span>〜</td>
                              <td className="p-1 sm:p-3 text-center text-xs sm:text-sm">22.5%</td>
                              <td className="p-1 sm:p-3 text-center text-xs sm:text-sm">30%</td>
                              <td className="p-1 sm:p-3 text-center text-green-500 font-medium text-xs sm:text-sm">1.33</td>
                            </tr>
                            <tr className="bg-primary/5 font-medium">
                              <td className="p-1 sm:p-3 text-center border-r border-primary/10 text-xs sm:text-sm">合計</td>
                              <td className="p-1 sm:p-3 text-center text-xs sm:text-sm">-</td>
                              <td className="p-1 sm:p-3 text-center text-xs sm:text-sm">100%</td>
                              <td className="p-1 sm:p-3 text-center text-xs sm:text-sm">300%</td>
                              <td className="p-1 sm:p-3 text-center text-xs sm:text-sm">-</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      <div className="p-2 sm:p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                        <div className="flex items-center mb-1">
                          <Lightbulb className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-500 mr-1 sm:mr-2 flex-shrink-0" />
                          <p className="font-medium text-xs sm:text-sm">確率配分のポイント</p>
                        </div>
                        <p className="text-xs sm:text-sm">競馬予想では市場との認識のズレを見つけることが重要です。上の例では人気サイドを低く見積もり、中穴馬を高く評価することで期待値の高い馬券を見つけています。</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-2 sm:p-5 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5">
                    <h3 className="font-semibold text-xs sm:text-lg mb-2 sm:mb-4">確率予想の精度を高めるテクニック</h3>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-4">
                      <div className="bg-background/80 p-2 sm:p-4 rounded-lg border border-primary/10 shadow-sm hover:shadow-md transition-all duration-300">
                        <div className="w-6 h-6 sm:w-10 sm:h-10 rounded-full bg-primary/20 flex items-center justify-center mb-1 sm:mb-3 mx-auto">
                          <LineChartIcon className="h-3 w-3 sm:h-5 sm:w-5 text-primary" />
                        </div>
                        <p className="font-medium text-center mb-1 sm:mb-2 text-xs sm:text-sm">類似レース<span className="hidden sm:inline">の</span>分析</p>
                        <p className="text-xs sm:text-sm text-center">同コース・距離<span className="hidden sm:inline">・クラス</span>の過去<span className="hidden sm:inline">レース</span>結果から傾向を掴む</p>
                      </div>
                      
                      <div className="bg-background/80 p-2 sm:p-4 rounded-lg border border-primary/10 shadow-sm hover:shadow-md transition-all duration-300">
                        <div className="w-6 h-6 sm:w-10 sm:h-10 rounded-full bg-primary/20 flex items-center justify-center mb-1 sm:mb-3 mx-auto">
                          <Brain className="h-3 w-3 sm:h-5 sm:w-5 text-primary" />
                        </div>
                        <p className="font-medium text-center mb-1 sm:mb-2 text-xs sm:text-sm">要素の数値化</p>
                        <p className="text-xs sm:text-sm text-center">馬の調子・騎手・枠順などを点数化<span className="hidden sm:inline">して客観的に評価</span>する</p>
                      </div>
                      
                      <div className="bg-background/80 p-2 sm:p-4 rounded-lg border border-primary/10 shadow-sm hover:shadow-md transition-all duration-300">
                        <div className="w-6 h-6 sm:w-10 sm:h-10 rounded-full bg-primary/20 flex items-center justify-center mb-1 sm:mb-3 mx-auto">
                          <Flag className="h-3 w-3 sm:h-5 sm:w-5 text-primary" />
                        </div>
                        <p className="font-medium text-center mb-1 sm:mb-2 text-xs sm:text-sm">適性マッチング</p>
                        <p className="text-xs sm:text-sm text-center">馬場<span className="hidden sm:inline">状態</span>・距離・脚質<span className="hidden sm:inline">などの</span>適性を<span className="hidden sm:inline">重視した確率配分</span>分析</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div id="optimal-betting" className="mb-8 sm:mb-12 scroll-mt-16">
            <div className="flex items-center mb-4 sm:mb-6">
              <div className="bg-primary/10 p-1.5 sm:p-2.5 rounded-lg mr-2 sm:mr-3 shadow-sm">
                <Coins className="h-4 w-4 sm:h-6 sm:w-6 text-primary" />
              </div>
              <div>
                <span className="text-xs sm:text-sm font-medium text-primary/70 block">04</span>
                <h2 className="text-lg sm:text-2xl md:text-3xl font-bold">期待値に基づく最適な馬券構成</h2>
              </div>
            </div>

            <div className="space-y-5 sm:space-y-8">
              <Card className="overflow-hidden bg-background/50 backdrop-blur-sm border-primary/10 shadow-md sm:shadow-lg hover:shadow-xl transition-shadow duration-300 scroll-animate">
                <CardHeader className="border-b border-primary/10 bg-gradient-to-r from-primary/10 to-primary/5 py-2 sm:py-3 px-3 sm:px-6">
                  <CardTitle className="text-foreground text-base sm:text-xl flex items-center">
                    <Target className="h-4 w-4 sm:h-5 sm:w-5 text-primary mr-1.5 sm:mr-2" />
                    期待値1.4の法則
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-3 sm:pt-4 px-3 sm:px-6">
                  <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 mb-4 sm:mb-6">
                    <div className="sm:w-1/3 p-3 sm:p-4 rounded-xl bg-primary/5 border border-primary/10">
                      <h3 className="font-semibold text-sm sm:text-base mb-2 flex items-center justify-center">
                        <CircleDollarSign className="h-4 w-4 text-primary mr-1.5" />
                        期待値1.4とは？
                      </h3>
                      <div className="flex justify-center">
                        <div className="w-24 h-24 flex items-center justify-center rounded-full bg-primary/10 border-4 border-primary/30 shadow-inner">
                          <div className="text-center">
                            <span className="block text-2xl font-bold text-primary">1.4倍</span>
                            <span className="text-xs sm:text-sm">以上が勝率の鍵</span>
                          </div>
                        </div>
                      </div>
                      <p className="mt-3 text-xs sm:text-sm text-center">予想誤差を考慮した<span className="font-semibold text-primary">安全マージン</span>を確保する基準値</p>
                    </div>
                    
                    <div className="sm:w-2/3">
                      <div className="bg-gradient-to-r from-primary/5 to-transparent p-3 sm:p-4 mb-4 rounded-xl">
                        <h3 className="font-semibold text-sm sm:text-base mb-2">期待値で選ぶ、プロの投資判断</h3>
                      </div>
                      <div className="grid grid-cols-3 gap-2 sm:gap-3">
                        <div className="p-2 sm:p-3 rounded-xl bg-yellow-50/80 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/30 text-center">
                          <div className="mx-auto w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center mb-1">
                            <AlertTriangle className="h-4 w-4 text-yellow-600" />
                          </div>
                          <span className="block text-sm font-semibold">1.0～1.4</span>
                          <span className="block text-xs sm:text-sm">小額/見送り</span>
                        </div>
                        <div className="p-2 sm:p-3 rounded-xl bg-green-50/80 dark:bg-green-900/20 border border-green-200 dark:border-green-800/30 text-center">
                          <div className="mx-auto w-8 h-8 rounded-full bg-green-100 flex items-center justify-center mb-1">
                            <Circle className="h-4 w-4 text-green-600" />
                          </div>
                          <span className="block text-sm font-semibold">1.4～1.7</span>
                          <span className="block text-xs sm:text-sm">標準投資</span>
                        </div>
                        <div className="p-2 sm:p-3 rounded-xl bg-green-50/80 dark:bg-green-900/20 border border-green-200 dark:border-green-800/30 text-center">
                          <div className="mx-auto w-8 h-8 rounded-full bg-green-100 flex items-center justify-center mb-1">
                            <CircleCheck className="h-4 w-4 text-green-600" />
                          </div>
                          <span className="block text-sm font-semibold">1.7以上</span>
                          <span className="block text-xs sm:text-sm">積極投資</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    <div className="flex flex-col bg-background border border-primary/10 rounded-xl overflow-hidden">
                      <div className="bg-red-50 dark:bg-red-900/20 p-2 border-b border-primary/10">
                        <p className="text-center font-medium text-sm flex items-center justify-center">
                          <X className="h-4 w-4 text-red-500 mr-1.5" />
                          期待値1.0の落とし穴
                        </p>
                      </div>
                      <div className="p-3 sm:p-4 text-sm space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600">!</span>
                          <p>予想には必ず誤差が伴う(±5～10%)</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600">!</span>
                          <p>誤差でマイナス収支になるリスク大</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col bg-background border border-primary/10 rounded-xl overflow-hidden">
                      <div className="bg-green-50 dark:bg-green-900/20 p-2 border-b border-primary/10">
                        <p className="text-center font-medium text-sm flex items-center justify-center">
                          <Check className="h-4 w-4 text-green-500 mr-1.5" />
                          期待値1.4以上のメリット
                        </p>
                      </div>
                      <div className="p-3 sm:p-4 text-sm space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600">✓</span>
                          <p>予想誤差を吸収できる安全域確保</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600">✓</span>
                          <p>長期的に回収率130%以上も狙える</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="overflow-hidden bg-background/50 backdrop-blur-sm border-primary/10 shadow-md sm:shadow-lg hover:shadow-xl transition-shadow duration-300 scroll-animate">
                <CardHeader className="border-b border-primary/10 bg-gradient-to-r from-primary/10 to-primary/5 py-2 sm:py-3 px-3 sm:px-6">
                  <CardTitle className="text-foreground text-base sm:text-xl flex items-center">
                    <Settings className="h-4 w-4 sm:h-5 sm:w-5 text-primary mr-1.5 sm:mr-2" />
                    資金配分と馬券種別
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-3 sm:pt-4 px-3 sm:px-6">
                  <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 mb-6">
                    <div className="flex-1 bg-primary/5 rounded-xl p-3 sm:p-4">
                      <h3 className="font-semibold text-sm sm:text-base mb-3 flex items-center justify-center">
                        <Wallet className="h-4 w-4 text-primary mr-1.5" />
                        資金管理の鉄則
                      </h3>
                      <div className="space-y-3">
                        <div className="flex items-center bg-background rounded-lg p-2 border border-primary/10">
                          <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center mr-2 text-xs text-orange-400 font-bold">1</div>
                          <p className="text-sm">期待値に比例した投資額</p>
                        </div>
                        <div className="flex items-center bg-background rounded-lg p-2 border border-primary/10">
                          <div className="w-6 h-6 rounded-full bg-yellow-100 flex items-center justify-center mr-2 text-xs text-orange-400 font-bold">2</div>
                          <p className="text-sm">1レース最大20%まで</p>
                        </div>
                        <div className="flex items-center bg-background rounded-lg p-2 border border-primary/10">
                          <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center mr-2 text-xs text-orange-400 font-bold">3</div>
                          <p className="text-sm">複数レースへの分散投資</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex-1 bg-primary/5 rounded-xl p-3 sm:p-4">
                      <h3 className="font-semibold text-sm sm:text-base mb-3 flex items-center justify-center">
                        <BarChart3 className="h-4 w-4 text-primary mr-1.5" />
                        投資額の目安（期待値別）
                      </h3>
                      <div className="space-y-2">
                        <div className="flex items-center">
                          <div className="w-20 text-center text-sm">1.0～1.4</div>
                          <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-800 rounded relative">
                            <div className="absolute inset-0 flex items-center px-2">
                              <div className="h-3 bg-yellow-500 rounded" style={{ width: '20%' }}></div>
                              <span className="ml-1 text-xs sm:text-sm">0～3%</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <div className="w-20 text-center text-sm">1.4～1.7</div>
                          <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-800 rounded relative">
                            <div className="absolute inset-0 flex items-center px-2">
                              <div className="h-3 bg-green-500 rounded" style={{ width: '50%' }}></div>
                              <span className="ml-1 text-xs sm:text-sm">3～6%</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <div className="w-20 text-center text-sm">1.7以上</div>
                          <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-800 rounded relative">
                            <div className="absolute inset-0 flex items-center px-2">
                              <div className="h-3 bg-green-500 rounded" style={{ width: '80%' }}></div>
                              <span className="ml-1 text-xs sm:text-sm whitespace-nowrap">6～9%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <p className="text-xs sm:text-sm mt-2 text-center">※総資金に対する割合</p>
                    </div>
                  </div>
                  
                  <h3 className="font-semibold text-sm sm:text-base mb-3 flex items-center">
                    <Ticket className="h-4 w-4 text-primary mr-1.5" />
                    馬券種の特性比較
                  </h3>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-5">
                    <div className="flex flex-col bg-background border border-primary/10 rounded-lg overflow-hidden">
                      <div className="bg-red-50 dark:bg-red-900/20 p-2 flex justify-center">
                        <div className="rounded bg-white px-2 py-1 text-sm font-bold shadow-sm text-red-600">単勝</div>
                      </div>
                      <div className="p-3 text-xs sm:text-sm space-y-2 flex-1">
                        <div className="flex justify-between items-center">
                          <span>的中率:</span>
                          <div className="w-20 h-2 bg-gray-200 rounded-full">
                            <div className="h-full bg-red-500 rounded-full" style={{ width: '25%' }}></div>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>回収額:</span>
                          <div className="w-20 h-2 bg-gray-200 rounded-full">
                            <div className="h-full bg-green-500 rounded-full" style={{ width: '90%' }}></div>
                          </div>
                        </div>
                        <p className="mt-2 pt-2 border-t border-dashed border-primary/10 text-center">
                          <span className="text-xs bg-primary/10 rounded px-1.5 py-0.5">予想精度高い人向け</span>
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col bg-background border border-primary/10 rounded-lg overflow-hidden">
                      <div className="bg-green-50 dark:bg-green-900/20 p-2 flex justify-center">
                        <div className="rounded bg-white px-2 py-1 text-sm font-bold shadow-sm text-green-600">複勝</div>
                      </div>
                      <div className="p-3 text-xs sm:text-sm space-y-2 flex-1">
                        <div className="flex justify-between items-center">
                          <span>的中率:</span>
                          <div className="w-20 h-2 bg-gray-200 rounded-full">
                            <div className="h-full bg-green-500 rounded-full" style={{ width: '75%' }}></div>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>回収額:</span>
                          <div className="w-20 h-2 bg-gray-200 rounded-full">
                            <div className="h-full bg-red-500 rounded-full" style={{ width: '30%' }}></div>
                          </div>
                        </div>
                        <p className="mt-2 pt-2 border-t border-dashed border-primary/10 text-center">
                          <span className="text-xs bg-primary/10 rounded px-1.5 py-0.5">初心者・安定志向向け</span>
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col bg-background border border-primary/10 rounded-lg overflow-hidden">
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 p-2 flex justify-center">
                        <div className="rounded bg-white px-2 py-1 text-sm font-bold shadow-sm text-yellow-600">馬連/ワイド</div>
                      </div>
                      <div className="p-3 text-xs sm:text-sm space-y-2 flex-1">
                        <div className="flex justify-between items-center">
                          <span>的中率:</span>
                          <div className="w-20 h-2 bg-gray-200 rounded-full">
                            <div className="h-full bg-yellow-500 rounded-full" style={{ width: '50%' }}></div>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>回収額:</span>
                          <div className="w-20 h-2 bg-gray-200 rounded-full">
                            <div className="h-full bg-yellow-500 rounded-full" style={{ width: '60%' }}></div>
                          </div>
                        </div>
                        <p className="mt-2 pt-2 border-t border-dashed border-primary/10 text-center">
                          <span className="text-xs bg-primary/10 rounded px-1.5 py-0.5">バランス重視の人向け</span>
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col bg-background border border-primary/10 rounded-lg overflow-hidden">
                      <div className="bg-red-50 dark:bg-red-900/20 p-2 flex justify-center">
                        <div className="rounded bg-white px-2 py-1 text-sm font-bold shadow-sm text-red-600">3連系</div>
                      </div>
                      <div className="p-3 text-xs sm:text-sm space-y-2 flex-1">
                        <div className="flex justify-between items-center">
                          <span>的中率:</span>
                          <div className="w-20 h-2 bg-gray-200 rounded-full">
                            <div className="h-full bg-red-500 rounded-full" style={{ width: '15%' }}></div>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>回収額:</span>
                          <div className="w-20 h-2 bg-gray-200 rounded-full">
                            <div className="h-full bg-green-500 rounded-full" style={{ width: '100%' }}></div>
                          </div>
                        </div>
                        <p className="mt-2 pt-2 border-t border-dashed border-primary/10 text-center">
                          <span className="text-xs bg-primary/10 rounded px-1.5 py-0.5">ハイリスク志向の人向け</span>
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-primary/5 to-transparent p-3 rounded-lg text-sm">
                    <p className="font-medium flex items-center mb-1">
                      <Lightbulb className="h-4 w-4 text-primary mr-1.5" />
                      馬券選択のポイント
                    </p>
                    <p>予想スタイル・得意レース・目標回収率に合わせた馬券種を選ぶことが成功の鍵です</p>
                  </div>
                  
                </CardContent>
              </Card>
            </div>
          </div>

          <div id="ev-tools" className="mb-12 scroll-mt-16">
            <div className="flex items-center mb-6">
              <div className="bg-primary/10 p-1.5 sm:p-2.5 rounded-lg mr-2 sm:mr-3 shadow-sm">
                <Calculator className="h-4 w-4 sm:h-6 sm:w-6 text-primary" />
              </div>
              <div>
                <span className="text-xs sm:text-sm font-medium text-primary/70 block">05</span>
                <h2 className="text-lg sm:text-2xl md:text-3xl font-bold">期待値計算ツールの使い方</h2>
              </div>
            </div>

            <div className="space-y-5 sm:space-y-8">
              <Card className="overflow-hidden bg-background/50 backdrop-blur-sm border-primary/10 shadow-md sm:shadow-lg hover:shadow-xl transition-shadow duration-300 scroll-animate">
                <CardHeader className="border-b border-primary/10 bg-gradient-to-r from-primary/10 to-primary/5 py-2 sm:py-3 px-3 sm:px-6">
                  <CardTitle className="text-foreground text-base sm:text-xl flex items-center">
                    <Settings className="h-4 w-4 sm:h-5 sm:w-5 text-primary mr-1.5 sm:mr-2" />
                    期待値計算のプロセス
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-3 sm:pt-4 px-3 sm:px-6">
                  <div className="flex flex-col gap-5 sm:gap-6 mb-6">
                    <div className="bg-gradient-to-r from-primary/5 to-transparent p-3 rounded-lg flex items-center gap-3">
                      <div className="bg-green-100 dark:bg-green-900/30 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">
                        <Rocket className="h-5 w-5 text-green-600" />
                      </div>
                      <p className="text-sm">データに基づく<span className="font-semibold">科学的投資</span>で収益率を向上させるツールです</p>
                    </div>
                    
                    <div className="flex gap-3 overflow-x-auto pb-1 sm:gap-4 sm:grid sm:grid-cols-5 snap-x">
                      <div className="flex-shrink-0 w-[80px] sm:w-auto snap-start">
                        <div className="relative bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-primary/10 p-1.5 sm:p-3 h-full">
                          <div className="absolute top-1 right-1 w-5 h-5 sm:w-7 sm:h-7 bg-green-600 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm">1</div>
                          <div className="flex flex-col items-center text-center h-full">
                            <div className="w-7 h-7 sm:w-12 sm:h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-1 sm:mb-2">
                              <CalendarDays className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-green-600" />
                            </div>
                            <p className="font-semibold text-xs sm:text-sm">レース選択</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 sm:mt-1 hidden sm:block">開催情報から対象レースを選択</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex-shrink-0 w-[80px] sm:w-auto snap-start">
                        <div className="relative bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-primary/10 p-1.5 sm:p-3 h-full">
                          <div className="absolute top-1 right-1 w-5 h-5 sm:w-7 sm:h-7 bg-green-600 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm">2</div>
                          <div className="flex flex-col items-center text-center h-full">
                            <div className="w-7 h-7 sm:w-12 sm:h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-1 sm:mb-2">
                              <Percent className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-green-600" />
                            </div>
                            <p className="font-semibold text-xs sm:text-sm">確率入力</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 sm:mt-1 hidden sm:block">各馬の勝率・複勝率を予想</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex-shrink-0 w-[80px] sm:w-auto snap-start">
                        <div className="relative bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-primary/10 p-1.5 sm:p-3 h-full">
                          <div className="absolute top-1 right-1 w-5 h-5 sm:w-7 sm:h-7 bg-green-600 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm">3</div>
                          <div className="flex flex-col items-center text-center h-full">
                            <div className="w-7 h-7 sm:w-12 sm:h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-1 sm:mb-2">
                              <Wallet className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-green-600" />
                            </div>
                            <p className="font-semibold text-xs sm:text-sm">予算設定</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 sm:mt-1 hidden sm:block">投資予算とリスク許容度</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex-shrink-0 w-[80px] sm:w-auto snap-start">
                        <div className="relative bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-primary/10 p-1.5 sm:p-3 h-full">
                          <div className="absolute top-1 right-1 w-5 h-5 sm:w-7 sm:h-7 bg-green-600 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm">4</div>
                          <div className="flex flex-col items-center text-center h-full">
                            <div className="w-7 h-7 sm:w-12 sm:h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-1 sm:mb-2">
                              <Calculator className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-green-600" />
                            </div>
                            <p className="font-semibold text-xs sm:text-sm">計算実行</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 sm:mt-1 hidden sm:block">全馬券種の期待値を算出</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex-shrink-0 w-[80px] sm:w-auto snap-start">
                        <div className="relative bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-primary/10 p-1.5 sm:p-3 h-full">
                          <div className="absolute top-1 right-1 w-5 h-5 sm:w-7 sm:h-7 bg-green-600 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm">5</div>
                          <div className="flex flex-col items-center text-center h-full">
                            <div className="w-7 h-7 sm:w-12 sm:h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-1 sm:mb-2">
                              <Ticket className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-green-600" />
                            </div>
                            <p className="font-semibold text-xs sm:text-sm">馬券購入</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 sm:mt-1 hidden sm:block">期待値の高い馬券を選択</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 sm:gap-6 mb-6">
                    <div className="md:col-span-2">
                      <h3 className="text-sm sm:text-base font-semibold mb-3 flex items-center">
                        <LineChart className="h-4 w-4 text-primary mr-1.5" />
                        期待値の判断基準
                      </h3>
                      
                      <div className="flex flex-col gap-2 bg-primary/5 p-3 rounded-lg border border-primary/10">
                        <div className="grid grid-cols-2 gap-2 items-center">
                          <div className="flex items-center justify-center py-1.5 px-2 bg-white dark:bg-gray-800 rounded border border-primary/10">
                            <MoveDown className="h-3.5 w-3.5 text-red-600 mr-1" />
                            <span className="text-xs font-medium">0.8未満</span>
                          </div>
                          <p className="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 py-1.5 px-2 rounded text-center font-medium">投資見送り</p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 items-center">
                          <div className="flex items-center justify-center py-1.5 px-2 bg-white dark:bg-gray-800 rounded border border-primary/10">
                            <AlertTriangle className="h-3.5 w-3.5 text-yellow-600 mr-1" />
                            <span className="text-xs font-medium">0.8〜1.0</span>
                          </div>
                          <p className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 py-1.5 px-2 rounded text-center font-medium">要注意</p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 items-center">
                          <div className="flex items-center justify-center py-1.5 px-2 bg-white dark:bg-gray-800 rounded border border-primary/10">
                            <Circle className="h-3.5 w-3.5 text-green-600 mr-1" />
                            <span className="text-xs font-medium">1.0〜1.4</span>
                          </div>
                          <p className="text-xs sm:text-sm bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 py-1.5 px-2 rounded text-center font-medium">少額投資</p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 items-center">
                          <div className="flex items-center justify-center py-1.5 px-2 bg-white dark:bg-gray-800 rounded border border-primary/10">
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-600 mr-1" />
                            <span className="text-xs font-medium">1.4以上</span>
                          </div>
                          <p className="text-xs sm:text-sm bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 py-1.5 px-2 rounded text-center font-medium">積極投資</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="md:col-span-3">
                      <h3 className="text-sm sm:text-base font-semibold mb-3 flex items-center">
                        <Percent className="h-4 w-4 text-primary mr-1.5" />
                        確率入力のポイント
                      </h3>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-primary/10 flex flex-col items-center shadow-sm">
                          <div className="flex items-center gap-1 mb-2">
                            <CircleDot className="h-3.5 w-3.5 text-green-600" />
                            <span className="text-xs font-semibold">単勝確率</span>
                          </div>
                          <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 border-4 border-green-200 dark:border-green-800/50 flex items-center justify-center mb-1">
                            <span className="text-xs sm:text-sm font-bold text-green-600 text-center leading-tight">合計<br/>100%</span>
                          </div>
                        </div>
                        
                        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-primary/10 flex flex-col items-center shadow-sm">
                          <div className="flex items-center gap-1 mb-2">
                            <CircleDot className="h-3.5 w-3.5 text-yellow-600" />
                            <span className="text-xs font-semibold">複勝確率</span>
                          </div>
                          <div className="w-16 h-16 rounded-full bg-yellow-100 dark:bg-yellow-900/30 border-4 border-yellow-200 dark:border-yellow-800/50 flex items-center justify-center mb-1">
                            <span className="text-xs sm:text-sm font-bold text-yellow-600 text-center leading-tight">合計<br/>300%</span>
                          </div>
                        </div>
                        
                        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-primary/10 flex flex-col shadow-sm">
                          <div className="flex items-center gap-1 mb-2">
                            <CircleDot className="h-3.5 w-3.5 text-blue-600" />
                            <span className="text-xs font-semibold">現実的な値</span>
                          </div>
                          <div className="flex-1 flex flex-col justify-center">
                            <ul className="space-y-0.5 text-center">
                              <li className="text-xs sm:text-sm">
                                <span className="text-green-500 font-bold">本命馬</span>：15〜25%
                              </li>
                              <li className="text-xs sm:text-sm">
                                <span className="text-yellow-500 font-bold">対抗馬</span>：10〜15%
                              </li>
                              <li className="text-xs sm:text-sm">
                                <span className="text-red-500 font-bold">大穴馬</span>：1〜5%
                              </li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="border border-primary/10 rounded-lg overflow-hidden shadow-sm">
                      <div className="bg-primary/5 p-2 border-b border-primary/10 flex items-center gap-2">
                        <Image className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">予想確率入力画面</span>
                      </div>
                      <div className="relative">
                        <img 
                          src="/images/optimized_Prediction.webp" 
                          alt="レース予想と的中率" 
                          className="rounded-lg shadow-md" 
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 text-white text-xs sm:text-sm">
                          直感的なスライダーで各馬の勝率・複勝率を簡単に設定
                        </div>
                      </div>
                    </div>
                    
                    <div className="border border-primary/10 rounded-lg overflow-hidden shadow-sm">
                      <div className="bg-primary/5 p-2 border-b border-primary/10 flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">期待値計算結果画面</span>
                      </div>
                      <div className="relative">
                        <img 
                          src="/images/optimized_Output.webp" 
                          alt="期待値計算結果" 
                          className="rounded-lg shadow-md" 
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 text-white text-xs sm:text-sm">
                          馬券種別ごとの期待値を一覧表示し、最適な投資判断をサポート
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-5">
                    <h3 className="text-sm sm:text-base font-semibold mb-3 flex items-center">
                      <Sparkles className="h-4 w-4 text-primary mr-1.5" />
                      プロが実践する活用テクニック
                    </h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="bg-white dark:bg-gray-800 rounded-lg border border-primary/10 p-3 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-7 h-7 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center text-green-600">
                            <span className="text-xs font-bold">1</span>
                          </div>
                          <p className="text-sm font-medium">レース選別</p>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">複数レースから期待値が最も高いレースに集中投資する戦略</p>
                      </div>
                      
                      <div className="bg-white dark:bg-gray-800 rounded-lg border border-primary/10 p-3 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-7 h-7 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center text-green-600">
                            <span className="text-xs font-bold">2</span>
                          </div>
                          <p className="text-sm font-medium">予想精度向上</p>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">計算結果を記録・分析して自分の予想精度を高める継続学習</p>
                      </div>
                      
                      <div className="bg-white dark:bg-gray-800 rounded-lg border border-primary/10 p-3 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-7 h-7 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center text-green-600">
                            <span className="text-xs font-bold">3</span>
                          </div>
                          <p className="text-sm font-medium">オッズ変動対応</p>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">レース直前のオッズ変動に合わせて期待値を再計算する柔軟性</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-center">
                    <a href="/" className="inline-flex items-center gap-2 px-4 py-2 sm:px-6 sm:py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-colors shadow-md text-xs sm:text-sm">
                      <Play className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
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
                <span className="text-sm font-medium text-primary/70 block">06</span>
                <h2 className="text-2xl sm:text-3xl font-bold">期待値計算プロの実践トレーニング</h2>
              </div>
            </div>

            <div className="space-y-8">
              <Card className="overflow-hidden border-primary/10 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader className="border-b border-primary/10 bg-gradient-to-r from-primary/10 to-primary/5">
                  <CardTitle className="text-foreground text-xl flex items-center">
                    <Trophy className="h-5 w-5 text-primary mr-2" />
                    実戦トレーニング：高松宮記念（G1）
                  </CardTitle>
                  <CardDescription className="text-sm">
                    実際のレースデータで期待値計算を体験し、プロの思考プロセスを学びましょう
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="p-4">

                  {/* 出馬表（タブレット・PC表示） */}
                  <div className="mb-6 overflow-hidden rounded-lg border border-primary/10 hidden sm:block">
                    <div className="bg-primary/5 p-3 border-b border-primary/10 flex justify-between items-center">
                      <h4 className="font-medium">高松宮記念 出馬表</h4>
                      <Badge variant="outline" className="text-xs">出走馬18頭</Badge>
                    </div>
                    <div className="p-4">
                      <img 
                        src="/images/optimized_RaceCase.webp" 
                        alt="期待値計算の実例" 
                        className="rounded-lg shadow-md"
                      />
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-2 text-center">※ 出典：https://race.netkeiba.com/race/result.html?race_id=202507020611</p>
                    </div>
                  </div>

                  {/* 出馬表（スマホ表示） */}
                  <div className="mb-6 overflow-hidden rounded-lg border border-primary/10 sm:hidden">
                    <div className="bg-primary/5 p-3 border-b border-primary/10 flex justify-between items-center">
                      <h4 className="font-medium">高松宮記念 出馬表</h4>
                      <Badge variant="outline" className="text-xs">出走馬18頭</Badge>
                    </div>
                    <div className="p-4">
                      <img 
                        src="/images/optimized_RaceCase1.webp" 
                        alt="競馬回収率アップの期待値計算例" 
                        className="rounded-lg shadow-md"
                      />
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-2 text-center">※ 出典：https://race.netkeiba.com/race/result.html?race_id=202507020611</p>
                    </div>
                  </div>
                  
                  {/* 期待値計算プロセス */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* 左側：プロの期待値計算プロセス */}
                    <div className="bg-gradient-to-br from-background to-primary/5 rounded-xl border border-primary/10 p-4 shadow-sm">
                      <h3 className="font-semibold mb-4 flex items-center gap-2 text-base border-b border-primary/10 pb-2">
                        <Brain className="h-4 w-4 text-green-600" />
                        プロの期待値計算プロセス
                      </h3>
                      
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-white/70 dark:bg-gray-900/70 hover:shadow-sm transition-shadow">
                          <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white shadow-sm">
                            <span className="text-xs font-bold">1</span>
                          </div>
                          <div>
                            <p className="font-medium text-sm">レース分析</p>
                            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">近走成績・血統・適性・調教</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-white/70 dark:bg-gray-900/70 hover:shadow-sm transition-shadow">
                          <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white shadow-sm">
                            <span className="text-xs font-bold">2</span>
                          </div>
                          <div>
                            <p className="font-medium text-sm">確率予想</p>
                            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">各馬の勝率・複勝率を算出</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-white/70 dark:bg-gray-900/70 hover:shadow-sm transition-shadow">
                          <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center text-white shadow-sm">
                            <span className="text-xs font-bold">3</span>
                          </div>
                          <div>
                            <p className="font-medium text-sm">オッズ分析</p>
                            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">市場オッズと予想の乖離を発見</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-white/70 dark:bg-gray-900/70 hover:shadow-sm transition-shadow">
                          <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center text-white shadow-sm">
                            <span className="text-xs font-bold">4</span>
                          </div>
                          <div>
                            <p className="font-medium text-sm">期待値計算</p>
                            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">各馬券の期待値を算出</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-white/70 dark:bg-gray-900/70 hover:shadow-sm transition-shadow">
                          <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white shadow-sm">
                            <span className="text-xs font-bold">5</span>
                          </div>
                          <div>
                            <p className="font-medium text-sm">資金配分</p>
                            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">期待値に応じた投資額決定</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* 右側：プロの武器 */}
                    <div className="bg-gradient-to-br from-background to-primary/5 rounded-xl border border-primary/10 p-4 shadow-sm">
                      <h3 className="font-semibold mb-4 flex items-center gap-2 text-base border-b border-primary/10 pb-2">
                        <Zap className="h-4 w-4 text-yellow-600" />
                        プロの秘訣：期待値投資の武器
                      </h3>
                      
                      <div className="grid grid-cols-1 gap-3">
                        <div className="bg-white/70 dark:bg-gray-900/70 rounded-lg p-3 hover:shadow-md transition-shadow relative flex items-start gap-3">
                          <div className="absolute -top-2 -right-2 bg-green-100 dark:bg-green-900/30 p-2 rounded-md shadow-sm">
                            <TrendingUp className="h-4 w-4 text-green-600" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-sm mb-1">相対価値の発見</h4>
                            <ul className="space-y-1">
                              <li className="text-xs sm:text-sm flex items-start gap-1">
                                <span className="text-green-500 font-bold">•</span>
                                <span>オッズと自己予想の差を活用</span>
                              </li>
                              <li className="text-xs sm:text-sm flex items-start gap-1">
                                <span className="text-green-500 font-bold">•</span>
                                <span>市場の見落としを狙う</span>
                              </li>
                            </ul>
                          </div>
                        </div>
                        
                        <div className="bg-white/70 dark:bg-gray-900/70 rounded-lg p-3 hover:shadow-md transition-shadow relative flex items-start gap-3">
                          <div className="absolute -top-2 -right-2 bg-yellow-100 dark:bg-yellow-900/30 p-2 rounded-md shadow-sm">
                            <CircleDollarSign className="h-4 w-4 text-yellow-600" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-sm mb-1">資金配分の最適化</h4>
                            <ul className="space-y-1">
                              <li className="text-xs sm:text-sm flex items-start gap-1">
                                <span className="text-yellow-500 font-bold">•</span>
                                <span>シャープレシオ最大化で資金調整</span>
                              </li>
                              <li className="text-xs sm:text-sm flex items-start gap-1">
                                <span className="text-yellow-500 font-bold">•</span>
                                <span>高期待値ほど投資比率増</span>
                              </li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* 単勝馬券の期待値比較 */}
                  <div className="mb-8 bg-gradient-to-br from-background to-primary/5 rounded-xl border border-primary/10 p-4 shadow-sm">
                    <h3 className="font-semibold mb-4 flex items-center gap-2 text-base border-b border-primary/10 pb-2">
                      <Target className="h-4 w-4 text-primary" />
                      単勝馬券の期待値比較
                    </h3>
                    
                    <div className="overflow-x-auto">
                      <div className="min-w-[600px]">
                        <div className="grid grid-cols-6 gap-2">
                          {/* ヘッダー行 */}
                          <div className="p-2 text-xs sm:text-sm font-medium text-center bg-gray-100 dark:bg-gray-800/80 rounded-tl-md">馬番</div>
                          <div className="p-2 text-xs sm:text-sm font-medium text-center bg-gray-100 dark:bg-gray-800/80">馬名</div>
                          <div className="p-2 text-xs sm:text-sm font-medium text-center bg-gray-100 dark:bg-gray-800/80">単勝オッズ</div>
                          <div className="p-2 text-xs sm:text-sm font-medium text-center bg-gray-100 dark:bg-gray-800/80">予想確率</div>
                          <div className="p-2 text-xs sm:text-sm font-medium text-center bg-gray-100 dark:bg-gray-800/80">期待値</div>
                          <div className="p-2 text-xs sm:text-sm font-medium text-center bg-gray-100 dark:bg-gray-800/80 rounded-tr-md">評価</div>
                          
                          {/* 馬データ行 */}
                          {/* 上位評価馬のみ表示してシンプルに */}
                          <div className="p-2 text-xs sm:text-sm text-center bg-white dark:bg-gray-900/80 font-medium border-b border-gray-100 dark:border-gray-800/50">15</div>
                          <div className="p-2 text-xs sm:text-sm bg-white dark:bg-gray-900/80 font-medium border-b border-gray-100 dark:border-gray-800/50">ママコチャ</div>
                          <div className="p-2 text-xs sm:text-sm text-center bg-white dark:bg-gray-900/80 border-b border-gray-100 dark:border-gray-800/50">14.6</div>
                          <div className="p-2 text-xs sm:text-sm text-center bg-white dark:bg-gray-900/80 border-b border-gray-100 dark:border-gray-800/50">10%</div>
                          <div className="p-2 text-xs sm:text-sm text-center bg-white dark:bg-gray-900/80 border-b border-gray-100 dark:border-gray-800/50 font-medium text-green-600">1.46</div>
                          <div className="p-2 text-xs sm:text-sm text-center bg-white dark:bg-gray-900/80 border-b border-gray-100 dark:border-gray-800/50">
                            <span className="bg-green-500 text-white px-2 py-1 rounded-full text-xs sm:text-sm">推奨</span>
                          </div>
                          
                          <div className="p-2 text-xs sm:text-sm text-center bg-gray-50 dark:bg-gray-900/60 font-medium border-b border-gray-100 dark:border-gray-800/50">10</div>
                          <div className="p-2 text-xs sm:text-sm bg-gray-50 dark:bg-gray-900/60 font-medium border-b border-gray-100 dark:border-gray-800/50">サトノレーヴ</div>
                          <div className="p-2 text-xs sm:text-sm text-center bg-gray-50 dark:bg-gray-900/60 border-b border-gray-100 dark:border-gray-800/50">3.8</div>
                          <div className="p-2 text-xs sm:text-sm text-center bg-gray-50 dark:bg-gray-900/60 border-b border-gray-100 dark:border-gray-800/50">30%</div>
                          <div className="p-2 text-xs sm:text-sm text-center bg-gray-50 dark:bg-gray-900/60 border-b border-gray-100 dark:border-gray-800/50 font-medium text-green-600">1.14</div>
                          <div className="p-2 text-xs sm:text-sm text-center bg-gray-50 dark:bg-gray-900/60 border-b border-gray-100 dark:border-gray-800/50">
                            <span className="bg-green-500 text-white px-2 py-1 rounded-full text-xs sm:text-sm">良</span>
                          </div>
                          
                          <div className="p-2 text-xs sm:text-sm text-center bg-white dark:bg-gray-900/80 font-medium border-b border-gray-100 dark:border-gray-800/50">12</div>
                          <div className="p-2 text-xs sm:text-sm bg-white dark:bg-gray-900/80 font-medium border-b border-gray-100 dark:border-gray-800/50">トウシンマカオ</div>
                          <div className="p-2 text-xs sm:text-sm text-center bg-white dark:bg-gray-900/80 border-b border-gray-100 dark:border-gray-800/50">7.3</div>
                          <div className="p-2 text-xs sm:text-sm text-center bg-white dark:bg-gray-900/80 border-b border-gray-100 dark:border-gray-800/50">15%</div>
                          <div className="p-2 text-xs sm:text-sm text-center bg-white dark:bg-gray-900/80 border-b border-gray-100 dark:border-gray-800/50 font-medium text-green-600">1.10</div>
                          <div className="p-2 text-xs sm:text-sm text-center bg-white dark:bg-gray-900/80 border-b border-gray-100 dark:border-gray-800/50">
                            <span className="bg-green-500 text-white px-2 py-1 rounded-full text-xs sm:text-sm">良</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* 結論と資金配分 */}
                  <div className="mb-6 bg-gradient-to-br from-green-50/50 to-yellow-50/50 dark:from-green-900/10 dark:to-yellow-900/10 rounded-xl p-4 border border-green-100 dark:border-green-900/30 shadow-sm">
                    <div className="flex flex-col md:flex-row gap-6">
                      {/* 左側：期待値分析の結論 */}
                      <div className="flex-1">
                        <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                          <CircleCheck className="h-4 w-4 text-green-600" />
                          期待値分析の結論
                        </h4>
                        <div className="space-y-3">
                          <div className="flex gap-2 items-center p-2 bg-white/70 dark:bg-gray-900/70 rounded-lg shadow-sm">
                            <Badge className="bg-green-500">推奨</Badge>
                            <div>
                              <span className="text-sm font-semibold">ママコチャ</span>
                              <span className="text-xs ml-2">期待値: 1.46</span>
                            </div>
                          </div>
                          <div className="flex gap-2 items-center p-2 bg-white/70 dark:bg-gray-900/70 rounded-lg shadow-sm">
                            <Badge className="bg-green-500">良</Badge>
                            <div>
                              <span className="text-sm font-semibold">サトノレーヴ</span>
                              <span className="text-xs ml-2">期待値: 1.14</span>
                            </div>
                          </div>
                          <div className="flex gap-2 items-center p-2 bg-white/70 dark:bg-gray-900/70 rounded-lg shadow-sm">
                            <Badge className="bg-green-500">良</Badge>
                            <div>
                              <span className="text-sm font-semibold">トウシンマカオ</span>
                              <span className="text-xs ml-2">期待値: 1.10</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* 右側：資金配分 */}
                      <div className="flex-1">
                        <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                          <CircleDollarSign className="h-4 w-4 text-yellow-600" />
                          資金配分（予算10,000円）
                        </h4>
                        <div className="space-y-3">
                          <div className="flex items-center p-2 bg-white/80 dark:bg-gray-900/80 rounded-lg shadow-sm">
                            <div className="flex items-center gap-2 flex-1">
                              <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-xs sm:text-sm font-bold text-green-600">15</div>
                              <span className="text-xs sm:text-sm font-medium">ママコチャ</span>
                            </div>
                            <div className="w-24 h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                              <div className="h-full bg-green-500 rounded-full" style={{ width: '45%' }}></div>
                            </div>
                            <span className="text-xs sm:text-sm ml-2 font-medium">4,500円</span>
                          </div>
                          
                          <div className="flex items-center p-2 bg-white/80 dark:bg-gray-900/80 rounded-lg shadow-sm">
                            <div className="flex items-center gap-2 flex-1">
                              <div className="w-6 h-6 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center text-xs sm:text-sm font-bold text-yellow-600">10</div>
                              <span className="text-xs sm:text-sm font-medium">サトノレーヴ</span>
                            </div>
                            <div className="w-24 h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                              <div className="h-full bg-yellow-500 rounded-full" style={{ width: '30%' }}></div>
                            </div>
                            <span className="text-xs sm:text-sm ml-2 font-medium">3,000円</span>
                          </div>
                          
                          <div className="flex items-center p-2 bg-white/80 dark:bg-gray-900/80 rounded-lg shadow-sm">
                            <div className="flex items-center gap-2 flex-1">
                              <div className="w-6 h-6 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center text-xs sm:text-sm font-bold text-yellow-600">12</div>
                              <span className="text-xs sm:text-sm font-medium">トウシンマカオ</span>
                            </div>
                            <div className="w-24 h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                              <div className="h-full bg-yellow-500 rounded-full" style={{ width: '25%' }}></div>
                            </div>
                            <span className="text-xs sm:text-sm ml-2 font-medium">2,500円</span>
                          </div>
                        </div>
                      </div>
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
                <span className="text-sm font-medium text-primary/70 block">07</span>
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold">期待値計算と確率計算に関するよくある質問</h2>
              </div>
            </div>


            {/* FAQ カテゴリータブ */}
            <div className="flex flex-wrap justify-center gap-2 mb-6">
              <InlineBadge className="py-2 px-3 sm:px-4 bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer text-sm">
                <Calculator className="h-3.5 w-3.5 mr-1" />
                <span>期待値の基本</span>
              </InlineBadge>
              <InlineBadge className="py-2 px-3 sm:px-4 bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer text-sm">
                <Percent className="h-3.5 w-3.5 mr-1" />
                <span>確率予想</span>
              </InlineBadge>
              <InlineBadge className="py-2 px-3 sm:px-4 bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer text-sm">
                <TrendingUp className="h-3.5 w-3.5 mr-1" />
                <span>回収率アップ</span>
              </InlineBadge>
            </div>

            <div className="space-y-4">
              {/* 質問1 */}
              <div className="bg-background/70 backdrop-blur-sm border border-primary/10 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                <div className="border-b border-primary/10 p-4 cursor-pointer">
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-base sm:text-lg">競馬の期待値計算とは何ですか？</h3>
                      <InlineBadge variant="outline" className="bg-primary/10 text-primary text-xs">基本</InlineBadge>
                    </div>
                    <p className="mt-3 text-sm sm:text-base">
                      競馬の期待値計算とは、オッズと予想勝率から理論上の投資価値を算出する方法です。「期待値 = オッズ × 的中確率」の式で計算され、期待値が1以上なら理論上は利益が期待できます。
                    </p>
                    <div className="mt-3 p-3 bg-primary/5 rounded-lg border border-primary/10">
                      <div className="flex items-center gap-2">
                        <div className="bg-primary p-1.5 rounded-full">
                          <Lightbulb className="h-4 w-4 text-white" />
                        </div>
                        <p className="text-sm sm:text-base font-medium text-foreground">
                          例：3倍のオッズで勝率40%なら、期待値は3×0.4=1.2となり投資価値あり
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 質問2 */}
              <div className="bg-background/70 backdrop-blur-sm border border-primary/10 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                <div className="border-b border-primary/10 p-4 cursor-pointer">
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-base sm:text-lg">競馬の期待値計算で本当に回収率は上がりますか？</h3>
                      <InlineBadge variant="outline" className="bg-primary/10 text-primary text-xs">基本</InlineBadge>
                    </div>
                    <p className="mt-3 text-sm sm:text-base">
                      はい、期待値計算を正しく活用することで長期的な回収率向上が期待できます。特に<span className="font-medium text-primary">期待値1.4以上の馬券</span>を狙うことで、予想の誤差を考慮しても利益につながりやすくなります。
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                      <div className="bg-primary/5 p-3 rounded-lg border border-primary/10">
                        <div className="flex gap-2 items-center mb-1">
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                          <span className="font-medium text-foreground text-sm sm:text-base">期待値1.4以上</span>
                        </div>
                        <p className="text-sm text-muted-foreground">積極的に投資推奨</p>
                      </div>
                      <div className="bg-primary/5 p-3 rounded-lg border border-primary/10">
                        <div className="flex gap-2 items-center mb-1">
                          <Circle className="h-4 w-4 text-primary/70" />
                          <span className="font-medium text-foreground text-sm sm:text-base">期待値1.0〜1.3</span>
                        </div>
                        <p className="text-sm text-muted-foreground">少額投資検討可</p>
                      </div>
                      <div className="bg-primary/5 p-3 rounded-lg border border-primary/10">
                        <div className="flex gap-2 items-center mb-1">
                          <X className="h-4 w-4 text-destructive" />
                          <span className="font-medium text-foreground text-sm sm:text-base">期待値1.0未満</span>
                        </div>
                        <p className="text-sm text-muted-foreground">投資対象外</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 質問3 */}
              <div className="bg-background/70 backdrop-blur-sm border border-primary/10 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                <div className="border-b border-primary/10 p-4 cursor-pointer">
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-base sm:text-lg">単勝の期待値計算と複勝の期待値計算、どちらが重要ですか？</h3>
                      <InlineBadge variant="outline" className="bg-primary/10 text-primary text-xs">確率予想</InlineBadge>
                    </div>
                    <p className="mt-3 text-sm sm:text-base">
                      両方重要ですが、複勝の期待値計算は初心者向けに安定性があります。単勝の期待値計算はリターンが大きい反面、的中率が低くなります。
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                      <div className="bg-primary/5 p-3 rounded-lg text-center">
                        <p className="font-bold text-sm sm:text-base mb-1">単勝</p>
                        <div className="flex justify-center">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-medium text-primary">1着</span>
                          </div>
                        </div>
                        <p className="text-xs sm:text-sm mt-2 text-muted-foreground">リターン大きい</p>
                        <p className="text-xs sm:text-sm text-muted-foreground">的中率低い</p>
                      </div>
                      <div className="bg-primary/5 p-3 rounded-lg text-center">
                        <p className="font-bold text-sm sm:text-base mb-1">複勝</p>
                        <div className="flex justify-center gap-1">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-medium text-primary">1</span>
                          </div>
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-medium text-primary">2</span>
                          </div>
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-medium text-primary">3</span>
                          </div>
                        </div>
                        <p className="text-xs sm:text-sm mt-2 text-muted-foreground">リターン小さい</p>
                        <p className="text-xs sm:text-sm text-muted-foreground">的中率高い</p>
                      </div>
                      <div className="bg-primary/5 p-3 rounded-lg text-center border border-primary/20">
                        <p className="font-bold text-sm sm:text-base mb-1 text-primary">推奨戦略</p>
                        <div className="h-10 flex items-center justify-center">
                          <p className="text-xs sm:text-sm font-medium">両方計算して<br/>高い方を選択</p>
                        </div>
                        <p className="text-xs sm:text-sm mt-1 text-muted-foreground">または少額分散</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 質問4 */}
              <div className="bg-background/70 backdrop-blur-sm border border-primary/10 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                <div className="border-b border-primary/10 p-4 cursor-pointer">
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-base sm:text-lg">競馬の期待値計算ツールはどのような馬券種類に対応していますか？</h3>
                      <InlineBadge variant="outline" className="bg-primary/10 text-primary text-xs">確率予想</InlineBadge>
                    </div>
                    <p className="mt-3 text-sm sm:text-base">
                      期待値計算ツールは、単勝、複勝、馬連、馬単、ワイド、3連複、3連単など、JRAの主要な馬券種類すべてに対応しています。単勝確率と複勝確率を入力するだけで、すべての券種について期待値計算を行います。
                    </p>
                  </div>
                </div>
              </div>

              {/* 質問5 */}
              <div className="bg-background/70 backdrop-blur-sm border border-primary/10 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                <div className="border-b border-primary/10 p-4 cursor-pointer">
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-base sm:text-lg">競馬で期待値が高い馬券を見つけるコツはありますか？</h3>
                      <InlineBadge variant="outline" className="bg-primary/10 text-primary text-xs">回収率アップ</InlineBadge>
                    </div>
                    <p className="mt-3 text-sm sm:text-base">
                      期待値の高い馬券を見つけるには、公式オッズと独自予想の差異を探すことが重要です。以下の3つの視点で「割安馬券」を見つけましょう。
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                      <div className="bg-primary/5 p-3 rounded-lg border border-primary/10">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold">1</div>
                          <span className="font-medium text-foreground text-sm sm:text-base">人気薄の実力馬</span>
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground">休み明け、斤量増、不良など表面的な理由で人気を落とした実力馬</p>
                      </div>
                      <div className="bg-primary/5 p-3 rounded-lg border border-primary/10">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold">2</div>
                          <span className="font-medium text-foreground text-sm sm:text-base">血統・適性重視</span>
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground">特定の条件（距離・馬場）に適した血統背景を持つ馬を見つける</p>
                      </div>
                      <div className="bg-primary/5 p-3 rounded-lg border border-primary/10">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold">3</div>
                          <span className="font-medium text-foreground text-sm sm:text-base">変化への対応</span>
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground">馬場状態・天候変化はオッズに十分反映されないことが多い</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 質問6 */}
              <div className="bg-background/70 backdrop-blur-sm border border-primary/10 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                <div className="border-b border-primary/10 p-4 cursor-pointer">
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-base sm:text-lg">競馬の期待値と回収率の関係を教えてください</h3>
                      <InlineBadge variant="outline" className="bg-primary/10 text-primary text-xs">回収率アップ</InlineBadge>
                    </div>
                    <p className="mt-3 text-sm sm:text-base">
                      期待値と回収率には密接な関係があります。期待値は理論上の投資価値を示す指標で、期待値1.0は理論的回収率100%、期待値1.5なら理論的回収率150%を意味します。
                    </p>

                    <div className="mt-4 overflow-hidden rounded-lg border border-primary/10">
                      <div className="bg-primary/5 p-2 text-center">
                        <p className="text-sm font-medium">期待値と理論的回収率の関係</p>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-primary/5">
                              <th className="p-2 text-xs sm:text-sm text-left">期待値</th>
                              <th className="p-2 text-xs sm:text-sm text-left">理論的回収率</th>
                              <th className="p-2 text-xs sm:text-sm text-left">推奨</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border-t border-primary/10">
                              <td className="p-2 text-xs sm:text-sm">0.7</td>
                              <td className="p-2 text-xs sm:text-sm">70%</td>
                              <td className="p-2 text-xs sm:text-sm"><InlineBadge variant="destructive" className="bg-destructive/80 text-white text-xs">非推奨</InlineBadge></td>
                            </tr>
                            <tr className="border-t border-primary/10 bg-primary/5">
                              <td className="p-2 text-xs sm:text-sm">1.0</td>
                              <td className="p-2 text-xs sm:text-sm">100%</td>
                              <td className="p-2 text-xs sm:text-sm"><InlineBadge className="bg-primary/40 text-white text-xs">検討可</InlineBadge></td>
                            </tr>
                            <tr className="border-t border-primary/10">
                              <td className="p-2 text-xs sm:text-sm">1.2</td>
                              <td className="p-2 text-xs sm:text-sm">120%</td>
                              <td className="p-2 text-xs sm:text-sm"><InlineBadge className="bg-primary/40 text-white text-xs">検討可</InlineBadge></td>
                            </tr>
                            <tr className="border-t border-primary/10 bg-primary/5">
                              <td className="p-2 text-xs sm:text-sm font-medium">1.4</td>
                              <td className="p-2 text-xs sm:text-sm font-medium">140%</td>
                              <td className="p-2 text-xs sm:text-sm"><InlineBadge className="bg-primary text-white text-xs">積極投資</InlineBadge></td>
                            </tr>
                            <tr className="border-t border-primary/10">
                              <td className="p-2 text-xs sm:text-sm font-medium">1.8</td>
                              <td className="p-2 text-xs sm:text-sm font-medium">180%</td>
                              <td className="p-2 text-xs sm:text-sm"><InlineBadge className="bg-primary text-white text-xs">積極投資</InlineBadge></td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-100 dark:border-amber-800/30">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        <p className="text-sm sm:text-base font-medium text-amber-700 dark:text-amber-400">
                          期待値1.4以上を実用的な基準にすることで、予想の誤差があっても利益確保が期待できます
                        </p>
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
        <div className="lg:col-span-1 hidden lg:block">
          <div className="sticky top-14">
            <div className="bg-background/50 backdrop-blur-sm rounded-xl p-3 border border-primary/10 shadow-sm mb-3">
              <div className="flex items-center mb-2">
                <Calendar className="h-5 w-5 mr-2 text-primary" />
                <h2 className="text-lg font-bold">今週のレース</h2>
              </div>    
              <ThisWeekRaces />
            </div>
            
            {/* 目次 - サイドバーに移動 */}
            <div className="bg-background/50 backdrop-blur-sm rounded-xl p-3 border border-primary/10 shadow-sm mb-3">
              <div className="flex items-center mb-2">
                <BookOpen className="h-5 w-5 mr-2 text-primary" />
                <h2 className="text-lg font-bold">目次</h2>
              </div>
              <div className="space-y-2">
                {/* セクション1: 基礎知識と理論 */}
                <div>
                  <h3 className="text-sm font-medium text-primary/70 mb-1">I. 基礎知識と理論</h3>
                  <div className="space-y-1 pl-2">
                    <a 
                      href="#what-is-ev" 
                      className="toc-item flex items-center gap-1.5 py-1 text-sm rounded-md transition-all duration-200 hover:bg-primary/5 pl-2"
                    >
                      <div className="circle-number flex-shrink-0 w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center text-sm">1</div>
                      <span>競馬の期待値思考とは？</span>
                    </a>
                    
                    <a 
                      href="#ev-examples" 
                      className="toc-item flex items-center gap-1.5 py-1 text-sm rounded-md transition-all duration-200 hover:bg-primary/5 pl-2"
                    >
                      <div className="circle-number flex-shrink-0 w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center text-sm">2</div>
                      <span>具体例で理解する期待値計算</span>
                    </a>
                  </div>
                </div>
                
                {/* セクション2: 実践方法と戦略 */}
                <div>
                  <h3 className="text-sm font-medium text-primary/70 mb-1">II. 実践方法と戦略</h3>
                  <div className="space-y-1 pl-2">
                    <a 
                      href="#win-place-prob" 
                      className="toc-item flex items-center gap-1.5 py-1 text-sm rounded-md transition-all duration-200 hover:bg-primary/5 pl-2"
                    >
                      <div className="circle-number flex-shrink-0 w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center text-sm">3</div>
                      <span>単勝・複勝確率の予想方法</span>
                    </a>
                    
                    <a 
                      href="#optimal-betting" 
                      className="toc-item flex items-center gap-1.5 py-1 text-sm rounded-md transition-all duration-200 hover:bg-primary/5 pl-2"
                    >
                      <div className="circle-number flex-shrink-0 w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center text-sm">4</div>
                      <span>期待値による最適な馬券構成</span>
                    </a>
                  </div>
                </div>
                
                {/* セクション3: ツールの活用とスキルアップ */}
                <div>
                  <h3 className="text-sm font-medium text-primary/70 mb-1">III. ツールとスキルアップ</h3>
                  <div className="space-y-1 pl-2">
                    <a 
                      href="#ev-tools" 
                      className="toc-item flex items-center gap-1.5 py-1 text-sm rounded-md transition-all duration-200 hover:bg-primary/5 pl-2"
                    >
                      <div className="circle-number flex-shrink-0 w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center text-sm">5</div>
                      <span>期待値計算ツールの使い方</span>
                    </a>
                    
                    <a 
                      href="#ev-training" 
                      className="toc-item flex items-center gap-1.5 py-1 text-sm rounded-md transition-all duration-200 hover:bg-primary/5 pl-2"
                    >
                      <div className="circle-number flex-shrink-0 w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center text-sm">6</div>
                      <span>実践トレーニング</span>
                    </a>
                    
                    <a 
                      href="#faq" 
                      className="toc-item flex items-center gap-1.5 py-1 text-sm rounded-md transition-all duration-200 hover:bg-primary/5 pl-2"
                    >
                      <div className="circle-number flex-shrink-0 w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center text-sm">7</div>
                      <span>よくある質問</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
} 