import { Switch, Route } from "wouter";
import Home from "@/pages/Home";
import RaceList from "@/pages/RaceList";

function App() {
  return (
    <Switch>
      <Route path="/" component={RaceList} />
      <Route path="/race/:id" component={Home} />
    </Switch>
  );
}

export default App;