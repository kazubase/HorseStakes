import { Switch, Route } from "wouter";
import React, { Suspense, lazy } from "react";
// 遅延ロード用にimportを変更
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

// ローディングコンポーネント
const Loading = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
  </div>
);

function App() {
  return (
    <div className="dark">
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
