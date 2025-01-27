var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
export default function TicketBuilder() {
    var _a = useState([]), selections = _a[0], setSelections = _a[1];
    var toast = useToast().toast;
    var addSelection = function () {
        setSelections(__spreadArray(__spreadArray([], selections, true), [{ horse: "", stake: 0, odds: 0 }], false));
    };
    var updateSelection = function (index, field, value) {
        var _a;
        var newSelections = __spreadArray([], selections, true);
        newSelections[index] = __assign(__assign({}, newSelections[index]), (_a = {}, _a[field] = value, _a));
        setSelections(newSelections);
    };
    var calculateTotal = function () {
        return selections.reduce(function (total, sel) { return total + sel.stake; }, 0);
    };
    var placeBet = function () {
        toast({
            title: "Bet Placed",
            description: "Total stake: $".concat(calculateTotal()),
        });
    };
    return (<div>
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
          {selections.map(function (selection, index) { return (<TableRow key={index}>
              <TableCell>
                <Input value={selection.horse} onChange={function (e) { return updateSelection(index, "horse", e.target.value); }} placeholder="Horse name"/>
              </TableCell>
              <TableCell>
                <Input type="number" value={selection.stake} onChange={function (e) { return updateSelection(index, "stake", Number(e.target.value)); }} min={0}/>
              </TableCell>
              <TableCell>
                <Input type="number" value={selection.odds} onChange={function (e) { return updateSelection(index, "odds", Number(e.target.value)); }} min={0} step={0.1}/>
              </TableCell>
              <TableCell>
                ${(selection.stake * selection.odds).toFixed(2)}
              </TableCell>
            </TableRow>); })}
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
    </div>);
}
