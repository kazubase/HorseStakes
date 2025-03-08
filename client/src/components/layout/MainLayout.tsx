import { Link } from "wouter";
import { useEffect, useState } from "react";
import { FaList } from "react-icons/fa";
import { HelpCircle } from "lucide-react";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [isNavVisible, setIsNavVisible] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const controlHeader = () => {
      const currentScrollY = window.scrollY;
      const isScrolledToBottom = 
        window.innerHeight + currentScrollY >= document.documentElement.scrollHeight - 10; // 10pxのバッファを追加
      
      // コンテンツが短い場合はスクロールバーが表示されないため、常にヘッダーを表示
      const isContentShort = document.documentElement.scrollHeight <= window.innerHeight;

      // ナビゲーションの表示制御 - 最上部でのみ表示
      setIsNavVisible(currentScrollY === 0);

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
    };

    // スクロールイベントリスナーの登録
    window.addEventListener('scroll', controlHeader);
    
    // 初期状態の設定
    controlHeader();

    // リサイズ時にもヘッダー表示を制御
    window.addEventListener('resize', controlHeader);

    // クリーンアップ
    return () => {
      window.removeEventListener('scroll', controlHeader);
      window.removeEventListener('resize', controlHeader);
    };
  }, [lastScrollY]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* ヘッダー */}
      <div className={`fixed top-0 left-0 right-0 z-20 transition-transform duration-300 ${
        isHeaderVisible ? 'translate-y-0' : '-translate-y-full'
      }`}>
        <header className="border-b bg-card/80 backdrop-blur-sm">
          <div className="container mx-auto px-4 h-12 flex items-center justify-between">
            <Link href="/">
              <div className="flex items-center gap-3 cursor-pointer">
                <img 
                  src="/horseshoe-icon2.PNG" 
                  alt="馬券戦略" 
                  className="h-9 w-9 rounded-lg shadow-sm"
                />
                <span className="font-bold text-xl font-yuji">馬券戦略</span>
              </div>
            </Link>
          </div>
        </header>
      </div>
      
      {/* ナビゲーション - 固定位置で常に存在するが、透明度で表示/非表示を切り替え */}
      <div className={`fixed top-12 left-0 right-0 z-10 transition-opacity duration-300 ${
        isNavVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}>
        <nav className="border-b bg-card/80 backdrop-blur-sm">
          <div className="container mx-auto">
            <div className="flex justify-around h-10">
              <Link href="/">
                <div className="flex items-center justify-center px-4 h-full hover:text-primary hover:bg-muted/50 transition-colors">
                  <FaList className="h-4 w-4 mr-1.5" />
                  <span className="text-sm font-medium">レース選択</span>
                </div>
              </Link>
              <Link href="/guide">
                <div className="flex items-center justify-center px-4 h-full hover:text-primary hover:bg-muted/50 transition-colors">
                  <HelpCircle className="h-4 w-4 mr-1.5" />
                  <span className="text-sm font-medium">使い方</span>
                </div>
              </Link>
            </div>
          </div>
        </nav>
      </div>

      {/* メインコンテンツ - 常に固定の高さを確保 */}
      <div className="h-12"></div>
      <main className="flex-1 container mx-auto px-4 py-6 mt-10">
        {children}
      </main>
    </div>
  );
}