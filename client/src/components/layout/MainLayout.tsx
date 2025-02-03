import { Link } from "wouter";
import { History, Settings, HelpCircle } from "lucide-react";
import { SiJira } from "react-icons/si";
import { useEffect, useState } from "react";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const controlHeader = () => {
      const currentScrollY = window.scrollY;
      const isScrolledToBottom = 
        window.innerHeight + currentScrollY >= document.documentElement.scrollHeight - 10; // 10pxのバッファを追加

      // 一番下までスクロールした場合はヘッダーを非表示のままにする
      if (isScrolledToBottom) {
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

    // クリーンアップ
    return () => {
      window.removeEventListener('scroll', controlHeader);
    };
  }, [lastScrollY]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header - トランジション追加 */}
      <header className={`border-b bg-card/80 backdrop-blur-sm fixed top-0 left-0 right-0 z-10 transition-transform duration-300 ${
        isHeaderVisible ? 'translate-y-0' : '-translate-y-full'
      }`}>
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

      {/* Main content - マージン調整 */}
      <main className={`flex-1 container mx-auto px-4 py-6 mb-12 transition-[margin] duration-300 ${
        isHeaderVisible ? 'mt-12' : 'mt-0'
      }`}>
        {children}
      </main>

      {/* Footer navigation */}
      <footer className="border-t bg-card/80 backdrop-blur-sm fixed bottom-0 left-0 right-0 z-10">
        <nav className="container mx-auto">
          <div className="grid grid-cols-2 h-12">
            <Link href="/">
              <div className="flex flex-col items-center justify-center gap-1 hover:text-primary transition-colors pt-1">
                <SiJira className="h-5 w-5" />
                <span className="text-xs">レース選択</span>
              </div>
            </Link>
            <Link href="/guide">
              <div className="flex flex-col items-center justify-center gap-1 hover:text-primary transition-colors pt-1">
                <HelpCircle className="h-5 w-5" />
                <span className="text-xs">使い方</span>
              </div>
            </Link>
          </div>
        </nav>
      </footer>
    </div>
  );
}