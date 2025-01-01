import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function BettingStrategy() {
  const [stake, setStake] = useState(100);
  const [riskLevel, setRiskLevel] = useState(50);
  const { toast } = useToast();

  const calculateStrategy = () => {
    toast({
      title: "Strategy Calculated",
      description: `Optimal strategy calculated for $${stake} stake with ${riskLevel}% risk level`,
    });
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Betting Strategy</h2>
      
      <div className="space-y-6">
        <div>
          <label className="block mb-2">Total Stake ($)</label>
          <Input
            type="number"
            value={stake}
            onChange={(e) => setStake(Number(e.target.value))}
            min={0}
          />
        </div>
        
        <div>
          <label className="block mb-2">Risk Level: {riskLevel}%</label>
          <Slider
            value={[riskLevel]}
            onValueChange={([value]) => setRiskLevel(value)}
            max={100}
            step={1}
          />
        </div>
        
        <Button onClick={calculateStrategy} className="w-full">
          Calculate Optimal Strategy
        </Button>
      </div>
    </div>
  );
}
