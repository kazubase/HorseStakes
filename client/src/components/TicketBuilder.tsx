import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface BetSelection {
  horse: string;
  stake: number;
  odds: number;
}

export default function TicketBuilder() {
  const [selections, setSelections] = useState<BetSelection[]>([]);
  const { toast } = useToast();

  const addSelection = () => {
    setSelections([...selections, { horse: "", stake: 0, odds: 0 }]);
  };

  const updateSelection = (index: number, field: keyof BetSelection, value: string | number) => {
    const newSelections = [...selections];
    newSelections[index] = { ...newSelections[index], [field]: value };
    setSelections(newSelections);
  };

  const calculateTotal = () => {
    return selections.reduce((total, sel) => total + sel.stake, 0);
  };

  const placeBet = () => {
    toast({
      title: "Bet Placed",
      description: `Total stake: $${calculateTotal()}`,
    });
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Ticket Builder</h2>
      
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Horse</TableHead>
            <TableHead>Stake ($)</TableHead>
            <TableHead>Odds</TableHead>
            <TableHead>Potential Return</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {selections.map((selection, index) => (
            <TableRow key={index}>
              <TableCell>
                <Input
                  value={selection.horse}
                  onChange={(e) => updateSelection(index, "horse", e.target.value)}
                  placeholder="Horse name"
                />
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  value={selection.stake}
                  onChange={(e) => updateSelection(index, "stake", Number(e.target.value))}
                  min={0}
                />
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  value={selection.odds}
                  onChange={(e) => updateSelection(index, "odds", Number(e.target.value))}
                  min={0}
                  step={0.1}
                />
              </TableCell>
              <TableCell>
                ${(selection.stake * selection.odds).toFixed(2)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      
      <div className="mt-4 space-x-4">
        <Button variant="outline" onClick={addSelection}>
          Add Selection
        </Button>
        <Button onClick={placeBet}>
          Place Bet (${calculateTotal()})
        </Button>
      </div>
    </div>
  );
}
