import { Link } from "wouter";
import { History, Settings, HelpCircle } from "lucide-react";
import { SiJira } from "react-icons/si";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm fixed top-0 left-0 right-0 z-10">
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

      {/* Main content */}
      <main className="flex-1 container mx-auto px-4 py-6 mt-12 mb-12">
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