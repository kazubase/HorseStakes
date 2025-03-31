import { Link } from "wouter";
import { useEffect, useState, useCallback, useMemo, memo } from "react";
import { Menu, X, Sun, Moon, Home, FileText, Shield, HelpCircle } from "lucide-react";
import { FaXTwitter } from "react-icons/fa6";
import { useLocation } from "wouter";
import { useThemeStore } from "@/stores/themeStore";
import { createPortal } from "react-dom";
import BreadcrumbComponent from "./Breadcrumb";

// ロゴコンポーネントをメモ化して不要な再レンダリングを防止
const Logo = memo(() => {
  const { theme } = useThemeStore();
  
  return (
    <Link href="/" aria-label="ホームページへ移動">
      <div className="flex items-center gap-3 cursor-pointer">
        {theme === 'light' ? (
          <img 
            src="/images/horseshoe-icon-light.webp" 
            alt="馬券戦略アプリロゴ" 
            className="h-9 w-9 rounded-lg"
            width="36"
            height="36"
            decoding="async"
            loading="eager"
            {...{ fetchpriority: "high" } as any}
          />
        ) : (
          <img 
            src="/images/horseshoe-icon.webp" 
            alt="馬券戦略アプリロゴ" 
            className="h-9 w-9 rounded-lg shadow-sm"
            width="36"
            height="36"
            decoding="async"
            loading="eager"
            {...{ fetchpriority: "high" } as any}
          />
        )}
        <span className="font-bold text-2xl font-yuji yuji-syuku">馬券戦略</span>
      </div>
    </Link>
  );
});

// サイドバーナビゲーションをメモ化
const SidebarNavigation = memo(() => {
  const [isOpen, setIsOpen] = useState(false);
  const { theme, toggleTheme } = useThemeStore();
  const [location] = useLocation();
  const [isClosing, setIsClosing] = useState(false);
  
  const menuItemClass = useMemo(() => 
    theme === 'light'
      ? "flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors cursor-pointer"
      : "flex items-center gap-3 px-4 py-3 hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer",
    [theme]
  );

  const activeMenuItemClass = useMemo(() => 
    theme === 'light'
      ? "flex items-center gap-3 px-4 py-3 bg-accent/50 transition-colors cursor-pointer"
      : "flex items-center gap-3 px-4 py-3 bg-primary/20 text-primary font-medium transition-colors cursor-pointer",
    [theme]
  );
  
  const sidebarClass = theme === 'light'
    ? 'fixed inset-y-0 right-0 z-[9999] w-64 bg-card shadow-xl transform transition-all duration-300 ease-out'
    : 'fixed inset-y-0 right-0 z-[9999] w-64 bg-card/95 backdrop-blur-sm shadow-xl transform transition-all duration-300 ease-out border-l border-border/50';
  
  const overlayClass = "fixed inset-0 bg-black/50 z-[9998] transition-opacity duration-300";

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
    }, 300); // アニメーションの時間と同じ
  };

  // bodyのスクロールを制御
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center justify-center w-9 h-9 rounded-md hover:bg-accent/30 transition-colors fixed right-4"
        aria-label="メニューを開く"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>
      
      {/* ReactPortalを使用してオーバーレイとサイドバーをbody直下にレンダリング */}
      {isOpen && createPortal(
        <>
          {/* オーバーレイ */}
          <div 
            className={`${overlayClass} ${isClosing ? 'opacity-0' : 'opacity-100'}`}
            onClick={handleClose}
            aria-hidden="true"
          />
          
          {/* サイドバー */}
          <div 
            className={`${sidebarClass} ${isClosing ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}`}
          >
            <div className="flex flex-col h-full">
              <div 
                className="flex items-center justify-between px-4 border-b h-12"
                style={{
                  animationDelay: '0.05s',
                  animation: isOpen ? 'slideInRight 0.3s forwards' : 'none'
                }}
              >
                <h2 className="text-lg font-semibold">メニュー</h2>
                <button
                  onClick={handleClose}
                  className="flex items-center justify-center w-9 h-9 rounded-md hover:bg-muted/70 transition-colors"
                  aria-label="メニューを閉じる"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto py-2">
                {/* メニュー項目をマップして少しずつディレイをつける */}
                <div className="space-y-0.5">
                  {/* レース選択 - 1番目 */}
                  <Link href="/">
                    <div 
                      className={location === "/" ? activeMenuItemClass : menuItemClass}
                      style={{
                        animationDelay: '0.1s',
                        animation: isOpen ? 'slideInRight 0.3s forwards' : 'none'
                      }}
                    >
                      <Home className="h-5 w-5 text-primary" />
                      <span>レース選択</span>
                    </div>
                  </Link>
                  
                  {/* 使い方ガイド - 2番目 */}
                  <Link href="/guide">
                    <div 
                      className={location === "/guide" ? activeMenuItemClass : menuItemClass}
                      style={{
                        animationDelay: '0.15s',
                        animation: isOpen ? 'slideInRight 0.3s forwards' : 'none'
                      }}
                    >
                      <HelpCircle className="h-5 w-5 text-primary" />
                      <span>使い方</span>
                    </div>
                  </Link>

                  {/* テーマ切り替え - 最後 */}
                  <div 
                    className={menuItemClass}
                    onClick={toggleTheme}
                    style={{
                      animationDelay: '0.2s',
                      animation: isOpen ? 'slideInRight 0.3s forwards' : 'none'
                    }}
                  >
                    {theme === 'dark' ? (
                      <Sun className="h-5 w-5 text-primary" />
                    ) : (
                      <Moon className="h-5 w-5 text-primary" />
                    )}
                    <span>テーマ</span>
                  </div>
                </div>
              </div>

              {/* フッター部分 */}
              <div 
                className="px-4 py-3 border-t"
                style={{
                  animationDelay: '0.25s',
                  animation: isOpen ? 'slideInRight 0.3s forwards' : 'none'
                }}
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-center">
                    <a 
                      href="https://x.com/horse_stakes" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary transition-colors"
                      aria-label="公式X（Twitter）"
                    >
                      <FaXTwitter className="h-4 w-4" />
                    </a>
                  </div>
                  <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                    <Link href="/terms" className="hover:text-primary transition-colors">
                      利用規約
                    </Link>
                    <span className="text-muted-foreground/50">|</span>
                    <Link href="/privacy" className="hover:text-primary transition-colors">
                      プライバシーポリシー
                    </Link>
                  </div>
                  <div className="text-xs text-muted-foreground text-center">
                    © {new Date().getFullYear()} 馬券戦略
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
});

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [headerTransform, setHeaderTransform] = useState(0); // スクロール量に合わせた変換値
  const [lastScrollY, setLastScrollY] = useState(0);
  const [location] = useLocation();
  const isRaceListPage = useMemo(() => location === "/", [location]);
  const isBettingStrategyPage = useMemo(() => location.includes("/races/") && location.includes("/betting-strategy"), [location]);
  const { theme } = useThemeStore();
  
  // 強制的にヘッダーを非表示にするための状態を追加
  const [isHeaderForcedHidden, setIsHeaderForcedHidden] = useState(false);

  // ヘッダーの表示/非表示を制御するカスタムイベントリスナーを追加
  useEffect(() => {
    const hideHeader = () => {
      setIsHeaderForcedHidden(true);
    };

    const showHeader = () => {
      setIsHeaderForcedHidden(false);
    };

    // イベントリスナーを登録
    window.addEventListener('hideAppHeader', hideHeader);
    window.addEventListener('showAppHeader', showHeader);

    // クリーンアップ
    return () => {
      window.removeEventListener('hideAppHeader', hideHeader);
      window.removeEventListener('showAppHeader', showHeader);
    };
  }, []);

  // スクロールハンドラの最適化（スロットリング）
  const throttle = useCallback((func: Function, limit: number) => {
    let inThrottle: boolean;
    return function(this: any, ...args: any[]) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }, []);

  // ヘッダーの表示/非表示を制御する関数
  const controlHeader = useCallback(() => {
    // 強制非表示が有効な場合
    if (isHeaderForcedHidden) {
      setHeaderTransform(-100);
      return;
    }

    const currentScrollY = window.scrollY;
    const headerHeight = 48; // ヘッダーの高さ（12 * 4px）
    
    // コンテンツが短い場合
    const isContentShort = document.documentElement.scrollHeight <= window.innerHeight;
    if (isContentShort) {
      setHeaderTransform(0);
      return;
    }

    // スクロール位置に応じたヘッダーの表示割合を計算
    if (currentScrollY <= 0) {
      // 最上部ではヘッダーを完全表示
      setHeaderTransform(0);
    } else if (currentScrollY <= headerHeight) {
      // ヘッダーの高さ以下のスクロール位置では、スクロール量に応じて段階的に隠す
      const hidePercentage = (currentScrollY / headerHeight) * 100;
      setHeaderTransform(-hidePercentage);
    } else {
      // ヘッダーの高さ以上スクロールしたら完全に隠す
      setHeaderTransform(-100);
    }
    
    setLastScrollY(currentScrollY);
  }, [isHeaderForcedHidden]);

  // スロットリングされたスクロールハンドラー
  const throttledScrollHandler = useMemo(
    () => throttle(controlHeader, 10), // 10msのスロットリングでスムーズな動きを実現
    [throttle, controlHeader]
  );

  useEffect(() => {
    window.addEventListener('scroll', throttledScrollHandler, { passive: true });
    controlHeader(); // 初期表示時にも実行
    window.addEventListener('resize', throttledScrollHandler, { passive: true });

    return () => {
      window.removeEventListener('scroll', throttledScrollHandler);
      window.removeEventListener('resize', throttledScrollHandler);
    };
  }, [controlHeader, throttledScrollHandler]);

  // スタイルオブジェクトとしてのトランスフォーム
  const headerStyle = useMemo(() => ({
    transform: `translateY(${headerTransform}%)`,
  }), [headerTransform]);

  const mainContentClass = useMemo(() => 
    `flex-1 container mx-auto px-4 py-6 ${isRaceListPage ? '' : ''}`,
    [isRaceListPage]
  );

  const headerBgClass = useMemo(() => 
    theme === 'light' 
      ? 'border-b bg-card/95 backdrop-blur-sm shadow-sm'
      : 'border-b bg-card/80 backdrop-blur-sm',
    [theme]
  );

  // アニメーション用のスタイルを追加
  useEffect(() => {
    // 既存のstyleタグをチェック
    let styleTag = document.getElementById('sidebar-animation-styles');
    
    // なければ作成
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = 'sidebar-animation-styles';
      styleTag.innerHTML = `
        @keyframes slideInRight {
          from {
            transform: translateX(20px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `;
      document.head.appendChild(styleTag);
    }
    
    // クリーンアップ関数（コンポーネントのアンマウント時に実行）
    return () => {
      // styleTag?.remove(); // スタイルを残す場合はコメントアウト
    };
  }, []);

  return (
    <div className={`min-h-screen flex flex-col bg-background ${theme}`}>
      {/* ヘッダー */}
      <div 
        className="fixed top-0 left-0 right-0 z-30 transition-transform duration-150 will-change-transform"
        style={headerStyle}
        role="banner"
      >
        <header className={headerBgClass}>
          <div className="container mx-auto px-4 h-12 flex items-center justify-between">
            <Logo />
            <SidebarNavigation />
          </div>
        </header>
      </div>

      {/* メインコンテンツ */}
      <div className="h-12"></div>
      
      {/* パンくずリスト */}
      <div className="container mx-auto px-4 mt-1 sm:mt-2 md:mt-3">
        <BreadcrumbComponent />
      </div>
      
      <main className={`${mainContentClass} relative z-10`} role="main">
        {children}
      </main>
    </div>
  );
}