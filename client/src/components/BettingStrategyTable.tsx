import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface BettingRecommendation {
  type: string;
  horses: string[];
  stake: number;
  reason: string;
}

export function BettingStrategyTable({ recommendations }: { recommendations: BettingRecommendation[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>馬券種別</TableHead>
          <TableHead>買い目</TableHead>
          <TableHead>投資額</TableHead>
          <TableHead>理由</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {recommendations.map((rec, i) => (
          <TableRow key={i}>
            <TableCell>{rec.type}</TableCell>
            <TableCell>{rec.horses.join('-')}</TableCell>
            <TableCell>{rec.stake.toLocaleString()}円</TableCell>
            <TableCell>{rec.reason}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
} 