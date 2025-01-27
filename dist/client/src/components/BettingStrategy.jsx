import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
export default function BettingStrategy() {
    var _a = useState(100), stake = _a[0], setStake = _a[1];
    var _b = useState(50), riskLevel = _b[0], setRiskLevel = _b[1];
    var toast = useToast().toast;
    var calculateStrategy = function () {
        toast({
            title: "Strategy Calculated",
            description: "Optimal strategy calculated for $".concat(stake, " stake with ").concat(riskLevel, "% risk level"),
        });
    };
    return (<div>
      <h2 className="text-xl font-semibold mb-4">Betting Strategy</h2>
      
      <div className="space-y-6">
        <div>
          <label className="block mb-2">Total Stake ($)</label>
          <Input type="number" value={stake} onChange={function (e) { return setStake(Number(e.target.value)); }} min={0}/>
        </div>
        
        <div>
          <label className="block mb-2">Risk Level: {riskLevel}%</label>
          <Slider value={[riskLevel]} onValueChange={function (_a) {
        var value = _a[0];
        return setRiskLevel(value);
    }} max={100} step={1}/>
        </div>
        
        <Button onClick={calculateStrategy} className="w-full">
          Calculate Optimal Strategy
        </Button>
      </div>
    </div>);
}
