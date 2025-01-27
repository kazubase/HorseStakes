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
export default function PlaceProbability() {
    var id = useParams().id;
    var _a = useState({}), probabilities = _a[0], setProbabilities = _a[1];
    var _b = useState(0), totalProbability = _b[0], setTotalProbability = _b[1];
    var _c = useState(false), isInitialized = _c[0], setIsInitialized = _c[1];
    var getRequiredTotalProbability = function (horseCount) {
        return horseCount >= 8 ? 300 : 200;
    };
    // URLから単勝確率を取得
    var winProbabilities = JSON.parse(decodeURIComponent(new URLSearchParams(window.location.search).get('winProbs') || '{}'));
    var horses = useQuery({
        queryKey: ["/api/horses/".concat(id)],
        enabled: !!id,
    }).data;
    useEffect(function () {
        if (horses && !isInitialized) {
            // 初期値を単勝確率に設定
            var initial = horses.reduce(function (acc, horse) {
                acc[horse.id] = winProbabilities[horse.id] || 0;
                return acc;
            }, {});
            setProbabilities(initial);
            setTotalProbability(Object.values(initial).reduce(function (sum, value) { return sum + value; }, 0));
            setIsInitialized(true);
        }
    }, [horses, isInitialized]);
    var handleProbabilityChange = function (horseId, newValue) {
        // 単勝確率より小さい値は設定できないようにする
        if (newValue < (winProbabilities[horseId] || 0)) {
            return;
        }
        var newProbabilities = __assign({}, probabilities);
        newProbabilities[horseId] = newValue;
        setProbabilities(newProbabilities);
        setTotalProbability(Object.values(newProbabilities).reduce(function (sum, value) { return sum + value; }, 0));
    };
    var normalizeAllProbabilities = function () {
        var requiredTotal = getRequiredTotalProbability((horses === null || horses === void 0 ? void 0 : horses.length) || 0);
        var factor = requiredTotal / totalProbability;
        var normalizedProbabilities = Object.fromEntries(Object.entries(probabilities).map(function (_a) {
            var id = _a[0], prob = _a[1];
            return [
                id,
                Number((prob * factor).toFixed(1))
            ];
        }));
        setProbabilities(normalizedProbabilities);
        setTotalProbability(requiredTotal);
    };
    var handleNext = function () {
        var requiredTotal = getRequiredTotalProbability((horses === null || horses === void 0 ? void 0 : horses.length) || 0);
        if (!horses || Math.abs(totalProbability - requiredTotal) > 0.1) {
            return;
        }
        var allProbabilities = horses.reduce(function (acc, horse) {
            acc[horse.id] = probabilities[horse.id] || 0;
            return acc;
        }, {});
        var params = new URLSearchParams(window.location.search);
        var winProbs = params.get('winProbs') || '{}';
        var encodedPlaceProbs = encodeURIComponent(JSON.stringify(allProbabilities));
        window.location.href = "/predict/budget/".concat(id, "?winProbs=").concat(winProbs, "&placeProbs=").concat(encodedPlaceProbs);
    };
    if (!horses)
        return null;
    return (<MainLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">複勝予想確率入力</h1>

        {horses && Math.abs(totalProbability - getRequiredTotalProbability(horses.length)) > 0.1 && (<Alert variant="destructive">
            <AlertCircle className="h-4 w-4"/>
            <AlertDescription className="flex items-center justify-between">
              <span>
                全ての確率の合計が{getRequiredTotalProbability(horses.length)}%になるように調整してください
                （現在: {totalProbability.toFixed(1)}%）
              </span>
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
                      {probabilities[horse.id] < (winProbabilities[horse.id] || 0) && (<span className="text-red-500 ml-2">
                          （単勝確率以上にしてください）
                        </span>)}
                    </span>
                  </div>
                  <Slider value={[probabilities[horse.id] || 0]} onValueChange={function (_a) {
                var value = _a[0];
                return handleProbabilityChange(horse.id, value);
            }} min={0} max={100} step={5} className="my-2"/>
                </div>);
        })}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button size="lg" disabled={Math.abs(totalProbability - getRequiredTotalProbability((horses === null || horses === void 0 ? void 0 : horses.length) || 0)) > 0.1} onClick={handleNext}>
            予算・リスク設定へ進む
          </Button>
        </div>
      </div>
    </MainLayout>);
}
