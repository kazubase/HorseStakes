import { Switch, Route } from "wouter";
import Home from "@/pages/Home";
import RaceList from "@/pages/RaceList";
import History from "@/pages/History";
import Settings from "@/pages/Settings";
import WinProbability from "@/pages/WinProbability";

function App() {
  return (
    <Switch>
      <Route path="/" component={RaceList} />
      <Route path="/race/:id" component={Home} />
      <Route path="/predict/win/:id" component={WinProbability} />
      <Route path="/history" component={History} />
      <Route path="/settings" component={Settings} />
    </Switch>
  );
}

export default App;