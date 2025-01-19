import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Race } from "@db/schema";
import { useLocation } from "wouter";
import { format } from "date-fns";
import MainLayout from "@/components/layout/MainLayout";
import { useEffect } from "react";

interface RaceVenue {
  id: string;
  name: string;
}

const venues: RaceVenue[] = [
  { id: "中山", name: "中山" },
  { id: "中京", name: "中京" },
];

export default function RaceList() {
  const [_, setLocation] = useLocation();

  const { data: races, isLoading, error } = useQuery<Race[]>({
    queryKey: ["/api/races"],
    gcTime: 0,
    staleTime: 0,
    retry: false,
    refetchOnMount: true,
    select: (data) => {
      console.log("Fetched races:", data);
      return data;
    }
  });

  useEffect(() => {
    if (error) console.error("Query error:", error);
  }, [error]);

  const getRacesForVenue = (venueId: string) => {
    console.log(`Filtering races for venue: ${venueId}`, races);
    return races?.filter(race => race.venue === venueId) || [];
  };

  return (
    <MainLayout>
      <h1 className="text-2xl font-bold mb-6">本日のレース</h1>

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
              {isLoading ? (
                <div>データを読み込み中...</div>
              ) : error ? (
                <div>データの読み込みに失敗しました</div>
              ) : (
                getRacesForVenue(venue.id).map(race => (
                  <Card 
                    key={race.id}
                    className="cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => {
                      console.log("Navigating to race:", race.id);
                      setLocation(`/race/${race.id}`);
                    }}
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
                ))
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </MainLayout>
  );
}