import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Horse, Race } from "@db/schema";

export default function RaceSelector() {
  const [selectedRace, setSelectedRace] = useState<string>("");
  
  const { data: races } = useQuery<Race[]>({
    queryKey: ["/api/races"],
  });
  
  const { data: horses } = useQuery<Horse[]>({
    queryKey: ["/api/horses", selectedRace],
    enabled: !!selectedRace,
  });

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Select Race</h2>
      
      <Select value={selectedRace} onValueChange={setSelectedRace}>
        <SelectTrigger>
          <SelectValue placeholder="Select a race" />
        </SelectTrigger>
        <SelectContent>
          {races?.map((race) => (
            <SelectItem key={race.id} value={race.id.toString()}>
              {race.name} - {new Date(race.startTime).toLocaleTimeString()}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {horses && (
        <Table className="mt-4">
          <TableHeader>
            <TableRow>
              <TableHead>Horse</TableHead>
              <TableHead>Odds</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {horses.map((horse) => (
              <TableRow key={horse.id}>
                <TableCell>{horse.name}</TableCell>
                <TableCell>{horse.odds}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
