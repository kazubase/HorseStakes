import { Switch, Route } from "wouter";
import Home from "@/pages/Home";
import RaceList from "@/pages/RaceList";
// import WinProbability from "@/pages/WinProbability";
// import PlaceProbability from "@/pages/PlaceProbability";
// import Budget from "@/pages/Budget";
import Strategy from "@/pages/Strategy";
import Guide from "@/pages/Guide";
import { BettingStrategy } from "@/pages/BettingStrategy";
import PredictionSettings from "@/pages/PredictionSettings";

function App() {
  return (
    <div className="dark">
      <div className="min-h-screen bg-background text-foreground">
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
          <Route path="/races/:id/betting-strategy" component={BettingStrategy} />
        </Switch>
      </div>
    </div>
  );
}
export default App;
