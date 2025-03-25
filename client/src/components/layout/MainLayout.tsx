import { Link } from "wouter";
import { useEffect, useState, useCallback, useMemo, memo } from "react";
import { Menu, X, Sun, Moon, Home, FileText, Shield, HelpCircle } from "lucide-react";
import { useLocation } from "wouter";
import { useThemeStore } from "@/stores/themeStore";
import { createPortal } from "react-dom";

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
  
  const menuItemClass = "flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors cursor-pointer";
  const activeMenuItemClass = "flex items-center gap-3 px-4 py-3 bg-accent/50 transition-colors cursor-pointer";
  
  const sidebarClass = theme === 'light'
    ? 'fixed inset-y-0 right-0 z-[9999] w-64 bg-card shadow-xl transform transition-all duration-300 ease-out'
    : 'fixed inset-y-0 right-0 z-[9999] w-64 bg-card/95 backdrop-blur-sm shadow-xl transform transition-all duration-300 ease-out';
  
  const overlayClass = "fixed inset-0 bg-black/50 z-[9998] transition-opacity duration-300";

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
            className={`${overlayClass} ${isOpen ? 'opacity-100' : 'opacity-0'}`}
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          
          {/* サイドバー */}
          <div 
            className={`${sidebarClass} ${isOpen ? 'translate-x-0 opacity-100 shadow-2xl' : 'translate-x-full opacity-80 shadow-none'}`}
          >
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between px-4 border-b h-12">
                <h2 className="text-lg font-semibold">メニュー</h2>
                <button
                  onClick={() => setIsOpen(false)}
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
                        animationDelay: '0.05s',
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
                        animationDelay: '0.1s',
                        animation: isOpen ? 'slideInRight 0.3s forwards' : 'none'
                      }}
                    >
                      <HelpCircle className="h-5 w-5 text-primary" />
                      <span>使い方ガイド</span>
                    </div>
                  </Link>

                  {/* 利用規約 - 3番目 */}
                  <Link href="/terms">
                    <div 
                      className={location === "/terms" ? activeMenuItemClass : menuItemClass}
                      style={{
                        animationDelay: '0.15s',
                        animation: isOpen ? 'slideInRight 0.3s forwards' : 'none'
                      }}
                    >
                      <FileText className="h-5 w-5 text-primary" />
                      <span>利用規約</span>
                    </div>
                  </Link>

                  {/* プライバシーポリシー - 4番目 */}
                  <Link href="/privacy">
                    <div 
                      className={location === "/privacy" ? activeMenuItemClass : menuItemClass}
                      style={{
                        animationDelay: '0.2s',
                        animation: isOpen ? 'slideInRight 0.3s forwards' : 'none'
                      }}
                    >
                      <Shield className="h-5 w-5 text-primary" />
                      <span>プライバシーポリシー</span>
                    </div>
                  </Link>

                  {/* テーマ切り替え - 最後 */}
                  <div 
                    className={menuItemClass}
                    onClick={toggleTheme}
                    style={{
                      animationDelay: '0.3s',
                      animation: isOpen ? 'slideInRight 0.3s forwards' : 'none'
                    }}
                  >
                    {theme === 'dark' ? (
                      <Sun className="h-5 w-5 text-primary" />
                    ) : (
                      <Moon className="h-5 w-5 text-primary" />
                    )}
                    <span>{theme === 'dark' ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}</span>
                  </div>
                </div>
              </div>

              {/* コピーライト表示を追加 */}
              <div className="px-4 py-2 text-xs text-muted-foreground border-t text-right">
                © {new Date().getFullYear()} 馬券戦略
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
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [location] = useLocation();
  const isRaceListPage = useMemo(() => location === "/", [location]);
  const isBettingStrategyPage = useMemo(() => location.includes("/races/") && location.includes("/betting-strategy"), [location]);
  const { theme } = useThemeStore();

  // スクロールイベントをデバウンス（制御）するための関数
  const debounce = useCallback((func: Function, wait: number) => {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    return (...args: any[]) => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }, []);

  // ヘッダーの表示/非表示を制御する最適化された関数
  const controlHeader = useCallback(() => {
    const currentScrollY = window.scrollY;
    const isScrolledToBottom = 
      window.innerHeight + currentScrollY >= document.documentElement.scrollHeight - 10;
    
    // コンテンツが短い場合はスクロールバーが表示されないため、常にヘッダーを表示
    const isContentShort = document.documentElement.scrollHeight <= window.innerHeight;

    // 馬券戦略ページの場合は、最上部でのみヘッダーを表示
    if (isBettingStrategyPage) {
      setIsHeaderVisible(currentScrollY === 0);
      return;
    }

    // コンテンツが短い場合は常にヘッダーを表示
    if (isContentShort) {
      setIsHeaderVisible(true);
    }
    // 一番下までスクロールした場合はヘッダーを非表示のままにする
    else if (isScrolledToBottom) {
      setIsHeaderVisible(false);
    }
    // 下スクロールで非表示（一番下でない場合）
    else if (currentScrollY > lastScrollY && currentScrollY > 50) {
      setIsHeaderVisible(false);
    }
    // 上スクロールで表示
    else if (currentScrollY < lastScrollY) {
      setIsHeaderVisible(true);
    }
    
    setLastScrollY(currentScrollY);
  }, [lastScrollY, isBettingStrategyPage]);

  // デバウンスされたスクロールハンドラー
  const debouncedScrollHandler = useMemo(
    () => debounce(controlHeader, 50),
    [debounce, controlHeader]
  );

  useEffect(() => {
    window.addEventListener('scroll', debouncedScrollHandler, { passive: true });
    controlHeader();
    window.addEventListener('resize', debouncedScrollHandler, { passive: true });

    return () => {
      window.removeEventListener('scroll', debouncedScrollHandler);
      window.removeEventListener('resize', debouncedScrollHandler);
    };
  }, [controlHeader, debouncedScrollHandler]);

  const headerTransitionClass = useMemo(() => 
    isHeaderVisible ? 'translate-y-0' : '-translate-y-full',
    [isHeaderVisible]
  );

  const mainContentClass = useMemo(() => 
    `flex-1 container mx-auto px-4 py-6 ${isRaceListPage ? '' : 'mt-8'}`,
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
        className={`fixed top-0 left-0 right-0 z-30 transition-transform duration-300 will-change-transform ${headerTransitionClass}`}
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
      <main className={`${mainContentClass} relative z-10`} role="main">
        {children}
      </main>
    </div>
  );
}