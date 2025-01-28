import { Switch, Route } from "wouter";
import Home from "@/pages/Home";
import RaceList from "@/pages/RaceList";
import History from "@/pages/History";
import Settings from "@/pages/Settings";
import WinProbability from "@/pages/WinProbability";
import PlaceProbability from "@/pages/PlaceProbability";
import Budget from "@/pages/Budget";
import RiskReward from "@/pages/RiskReward";
import Strategy from "@/pages/Strategy";
import Explain from "@/pages/Explain";
import ExplainDetail from "@/pages/ExplainDetail";
import ExplainHistory from "@/pages/ExplainHistory";
import ExplainAlternatives from "@/pages/ExplainAlternatives";
import Guide from "@/pages/Guide";
import Algorithm from "@/pages/Algorithm";

function App() {
  return (
    <div className="dark">
      <div className="min-h-screen bg-background text-foreground">
        <Switch>
          <Route path="/" component={RaceList} />
          <Route path="/guide" component={Guide} />
          <Route path="/algorithm" component={Algorithm} />
          <Route path="/race/:id" component={Home} />
          <Route path="/predict/win/:id" component={WinProbability} />
          <Route path="/predict/place/:id" component={PlaceProbability} />
          <Route path="/predict/budget/:id" component={Budget} />
          <Route path="/predict/risk-reward/:id" component={RiskReward} />
          <Route path="/strategy/:id" component={Strategy} />
          <Route path="/explain/:id" component={Explain} />
          <Route path="/explain/detail/:id" component={ExplainDetail} />
          <Route path="/explain/history/:id" component={ExplainHistory} />
          <Route path="/explain/alternatives/:id" component={ExplainAlternatives} />
          <Route path="/history" component={History} />
          <Route path="/settings" component={Settings} />
        </Switch>
      </div>
    </div>
  );
}
export default App;
