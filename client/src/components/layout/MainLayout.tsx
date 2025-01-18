import { Link } from "wouter";
import { History, Settings } from "lucide-react";
import { SiJira } from "react-icons/si";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-3 cursor-pointer">
              <img 
                src="/horseshoe-icon2.PNG" 
                alt="馬券戦略" 
                className="h-10 w-10 rounded-lg shadow-sm"
              />
              <span className="font-bold text-2xl font-yuji">馬券戦略</span>
            </div>
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 container mx-auto px-4 py-6">
        {children}
      </main>

      {/* Footer navigation */}
      <footer className="border-t bg-card mt-auto">
        <nav className="container mx-auto">
          <div className="grid grid-cols-3 h-16">
            <Link href="/">
              <a className="flex flex-col items-center justify-center gap-1 hover:text-primary transition-colors">
                <SiJira className="h-6 w-6" />
                <span className="text-xs">レース選択</span>
              </a>
            </Link>
            <Link href="/history">
              <a className="flex flex-col items-center justify-center gap-1 hover:text-primary transition-colors">
                <History className="h-6 w-6" />
                <span className="text-xs">購入履歴</span>
              </a>
            </Link>
            <Link href="/settings">
              <a className="flex flex-col items-center justify-center gap-1 hover:text-primary transition-colors">
                <Settings className="h-6 w-6" />
                <span className="text-xs">設定</span>
              </a>
            </Link>
          </div>
        </nav>
      </footer>
    </div>
  );
}