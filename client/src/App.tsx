import { Switch, Route } from "wouter";
import React, { Suspense, lazy, useEffect } from "react";
import { useThemeStore } from "@/stores/themeStore";

// ローディングコンポーネント
const Loading = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
  </div>
);

// 遅延ロードの依存関係を明示的に解決
// ReactとRadix UIの依存関係を事前読み込み
const preloadReactDependencies = () => {
  // 依存関係のインポートを強制
  import('react/jsx-runtime');
  import('@radix-ui/react-slot');
};

// 依存関係を事前読み込み
preloadReactDependencies();

// 遅延ロード用にimportを変更（依存関係が解決された後に実行）
const Home = lazy(() => import("@/pages/Home"));
const RaceList = lazy(() => import("@/pages/RaceList"));
const Strategy = lazy(() => import("@/pages/Strategy"));
const Guide = lazy(() => import("@/pages/Guide"));
// BettingStrategyコンポーネントは名前付きエクスポートのため修正
const BettingStrategyLazy = lazy(() => 
  import("@/pages/BettingStrategy").then(module => ({ 
    default: module.BettingStrategy 
  }))
);
const PredictionSettings = lazy(() => import("@/pages/PredictionSettings"));

function App() {
  const { theme } = useThemeStore();

  // テーマの変更を監視して、HTMLのclassを更新
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
  }, [theme]);

  return (
    <div className={theme}>
      <div className="min-h-screen bg-background text-foreground">
        <Suspense fallback={<Loading />}>
          <Switch>
            <Route path="/" component={RaceList} />
            <Route path="/guide" component={Guide} />
            <Route path="/race/:id" component={Home} />
            {/* 以下の3つのルートは統合されたPredictionSettingsに置き換え */}
            {/* <Route path="/predict/win/:id" component={WinProbability} /> */}
            {/* <Route path="/predict/place/:id" component={PlaceProbability} /> */}
            {/* <Route path="/predict/budget/:id" component={Budget} /> */}
            <Route path="/predict/:id" component={PredictionSettings} />
            <Route path="/strategy/:id" component={Strategy} />
            <Route path="/races/:id/betting-strategy" component={BettingStrategyLazy} />
          </Switch>
        </Suspense>
      </div>
    </div>
  );
}
export default App;
