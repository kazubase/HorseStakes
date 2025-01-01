import { Card, CardContent } from "@/components/ui/card";
import RaceSelector from "@/components/RaceSelector";
import BettingStrategy from "@/components/BettingStrategy";
import OddsChart from "@/components/OddsChart";
import TicketBuilder from "@/components/TicketBuilder";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <h1 className="text-3xl font-bold mb-6">Horse Racing Betting Assistant</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="col-span-1">
          <CardContent className="p-6">
            <RaceSelector />
          </CardContent>
        </Card>
        
        <Card className="col-span-1">
          <CardContent className="p-6">
            <OddsChart />
          </CardContent>
        </Card>
        
        <Card className="col-span-1 lg:col-span-2">
          <CardContent className="p-6">
            <BettingStrategy />
          </CardContent>
        </Card>
        
        <Card className="col-span-1 lg:col-span-2">
          <CardContent className="p-6">
            <TicketBuilder />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
