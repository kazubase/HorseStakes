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
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useState, useEffect } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
export default function WinProbability() {
    var id = useParams().id;
    var _a = useState({}), probabilities = _a[0], setProbabilities = _a[1];
    var _b = useState(0), totalProbability = _b[0], setTotalProbability = _b[1];
    var horses = useQuery({
        queryKey: ["/api/horses/".concat(id)],
        enabled: !!id,
    }).data;
    useEffect(function () {
        if (horses) {
            var initial = horses.reduce(function (acc, horse) {
                acc[horse.id] = 0;
                return acc;
            }, {});
            setProbabilities(initial);
        }
    }, [horses]);
    var handleProbabilityChange = function (horseId, newValue) {
        var newProbabilities = __assign({}, probabilities);
        newProbabilities[horseId] = newValue;
        setProbabilities(newProbabilities);
        setTotalProbability(Object.values(newProbabilities).reduce(function (sum, value) { return sum + value; }, 0));
    };
    var normalizeAllProbabilities = function () {
        var factor = 100 / totalProbability;
        var normalizedProbabilities = Object.fromEntries(Object.entries(probabilities).map(function (_a) {
            var id = _a[0], prob = _a[1];
            return [
                id,
                Number((prob * factor).toFixed(1))
            ];
        }));
        setProbabilities(normalizedProbabilities);
        setTotalProbability(100);
    };
    var handleNext = function () {
        if (!horses || Math.abs(totalProbability - 100) > 0.1) {
            return;
        }
        var allProbabilities = horses.reduce(function (acc, horse) {
            acc[horse.id] = probabilities[horse.id] || 0;
            return acc;
        }, {});
        var encodedWinProbs = encodeURIComponent(JSON.stringify(allProbabilities));
        window.location.href = "/predict/place/".concat(id, "?winProbs=").concat(encodedWinProbs);
    };
    if (!horses)
        return null;
    return (<MainLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">単勝予想確率入力</h1>

        {Math.abs(totalProbability - 100) > 0.1 && (<Alert variant="destructive">
            <AlertCircle className="h-4 w-4"/>
            <AlertDescription className="flex items-center justify-between">
              <span>全ての確率の合計が100%になるように調整してください（現在: {totalProbability.toFixed(1)}%）</span>
              <Button variant="outline" size="sm" onClick={normalizeAllProbabilities}>
                一括調整
              </Button>
            </AlertDescription>
          </Alert>)}

        <Card>
          <CardContent className="p-6">
            <div className="space-y-6">
              {horses.map(function (horse, index) {
            var _a;
            return (<div key={horse.id} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium">
                      {index + 1}. {horse.name}
                    </label>
                    <span className="text-sm text-muted-foreground">
                      {(_a = probabilities[horse.id]) === null || _a === void 0 ? void 0 : _a.toFixed(1)}%
                    </span>
                  </div>
                  <Slider value={[probabilities[horse.id] || 0]} onValueChange={function (_a) {
                var value = _a[0];
                return handleProbabilityChange(horse.id, value);
            }} max={100} step={5} className="my-2"/>
                </div>);
        })}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button size="lg" disabled={Math.abs(totalProbability - 100) > 0.1} onClick={handleNext}>
            複勝予想へ進む
          </Button>
        </div>
      </div>
    </MainLayout>);
}
