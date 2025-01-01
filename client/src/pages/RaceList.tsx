import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Race } from "@db/schema";
import { useLocation } from "wouter";
import { format } from "date-fns";

interface RaceVenue {
  id: string;
  name: string;
}

// Mock venues for now - this should come from API later
const venues: RaceVenue[] = [
  { id: "tokyo", name: "東京" },
  { id: "nakayama", name: "中山" },
];

export default function RaceList() {
  const [_, setLocation] = useLocation();
  
  const { data: races } = useQuery<Race[]>({
    queryKey: ["/api/races"],
  });

  const getRacesForVenue = (venueId: string) => {
    return races?.filter(race => race.venue === venueId) || [];
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <h1 className="text-3xl font-bold mb-6">本日のレース</h1>
      
      <Tabs defaultValue={venues[0].id} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          {venues.map(venue => (
            <TabsTrigger key={venue.id} value={venue.id}>
              {venue.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {venues.map(venue => (
          <TabsContent key={venue.id} value={venue.id}>
            <div className="grid gap-4">
              {getRacesForVenue(venue.id).map(race => (
                <Card 
                  key={race.id}
                  className="cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => setLocation(`/race/${race.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-semibold">
                          {race.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(race.startTime), 'HH:mm')} 発走
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {race.status}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
