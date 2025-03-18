import { Link } from "wouter";
import { useEffect, useState, useCallback, useMemo } from "react";
import { FaList } from "react-icons/fa";
import { HelpCircle } from "lucide-react";
import { useLocation } from "wouter";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [isNavVisible, setIsNavVisible] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [location] = useLocation();
  const isRaceListPage = useMemo(() => location === "/", [location]);

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

    // レース一覧画面以外の場合のみ最上部でナビゲーションを表示
    if (!isRaceListPage) {
      setIsNavVisible(currentScrollY === 0);
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
  }, [lastScrollY, isRaceListPage]);

  // デバウンスされたスクロールハンドラー
  const debouncedScrollHandler = useMemo(
    () => debounce(controlHeader, 10), 
    [debounce, controlHeader]
  );

  useEffect(() => {
    // スクロールイベントリスナーの登録（パフォーマンス最適化のためにpassiveオプションを使用）
    window.addEventListener('scroll', debouncedScrollHandler, { passive: true });
    
    // 初期状態の設定
    controlHeader();

    // リサイズ時にもヘッダー表示を制御（パフォーマンス最適化のためにpassiveオプションを使用）
    window.addEventListener('resize', debouncedScrollHandler, { passive: true });

    // クリーンアップ
    return () => {
      window.removeEventListener('scroll', debouncedScrollHandler);
      window.removeEventListener('resize', debouncedScrollHandler);
    };
  }, [controlHeader, debouncedScrollHandler]);

  // ナビゲーションのレンダリング関数
  const renderNavigation = useMemo(() => (
    <div className="flex justify-around h-10">
      <Link href="/" aria-label="レース選択ページへ移動">
        <div className="flex items-center justify-center px-4 h-full hover:text-primary hover:bg-muted/50 transition-colors">
          <FaList className="h-4 w-4 mr-1.5" aria-hidden="true" />
          <span className="text-sm font-medium">レース選択</span>
        </div>
      </Link>
      <Link href="/guide" aria-label="使い方ガイドページへ移動">
        <div className="flex items-center justify-center px-4 h-full hover:text-primary hover:bg-muted/50 transition-colors">
          <HelpCircle className="h-4 w-4 mr-1.5" aria-hidden="true" />
          <span className="text-sm font-medium">使い方</span>
        </div>
      </Link>
    </div>
  ), []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* ヘッダー */}
      <div 
        className={`fixed top-0 left-0 right-0 z-20 transition-transform duration-300 will-change-transform ${
          isHeaderVisible ? 'translate-y-0' : '-translate-y-full'
        }`}
        role="banner"
      >
        <header className="border-b bg-card/80 backdrop-blur-sm">
          <div className="container mx-auto px-4 h-12 flex items-center justify-between">
            <Link href="/" aria-label="ホームページへ移動">
              <div className="flex items-center gap-3 cursor-pointer">
                <img 
                  src="/images/horseshoe-icon.webp" 
                  alt="馬券戦略アプリロゴ" 
                  className="h-9 w-9 rounded-lg shadow-sm"
                  loading="lazy"
                  width="36"
                  height="36"
                  decoding="async"
                  {...{ fetchpriority: "high" }}
                />
                <span className="font-bold text-xl font-yuji">馬券戦略</span>
              </div>
            </Link>
          </div>
        </header>
      </div>
      
      {/* レース一覧画面以外の場合のみ上部ナビゲーションを表示 */}
      {!isRaceListPage && (
        <div 
          className={`fixed top-12 left-0 right-0 z-10 transition-opacity duration-300 will-change-opacity ${
            isNavVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          role="navigation" 
          aria-label="サイトナビゲーション"
        >
          <nav className="border-b bg-card/80 backdrop-blur-sm">
            <div className="container mx-auto">
              {renderNavigation}
            </div>
          </nav>
        </div>
      )}

      {/* メインコンテンツ */}
      <div className="h-12"></div>
      <main className={`flex-1 container mx-auto px-4 py-6 ${isRaceListPage ? '' : 'mt-10'}`} role="main">
        {children}
      </main>

      {/* レース一覧画面の場合のみフッターナビゲーションを表示 */}
      {isRaceListPage && (
        <div 
          className="fixed bottom-0 left-0 right-0 z-20 border-t bg-card/95 backdrop-blur-md shadow-lg"
          role="navigation" 
          aria-label="フッターナビゲーション"
        >
          <div className="container mx-auto">
            {renderNavigation}
          </div>
        </div>
      )}
    </div>
  );
}