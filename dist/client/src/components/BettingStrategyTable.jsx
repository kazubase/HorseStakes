var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
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
import { memo, useMemo, useRef, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { optimizeBetAllocation } from "@/lib/betCalculator";
import * as Popover from '@radix-ui/react-popover';
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import html2canvas from 'html2canvas';
import { Camera } from 'lucide-react';
export var BettingStrategyTable = memo(function BettingStrategyTable(_a) {
    var _this = this;
    var strategy = _a.strategy, totalBudget = _a.totalBudget;
    // レンダリング回数の追跡
    var renderCount = useRef(0);
    // 最適化計算の結果をメモ化
    var optimizationResult = useMemo(function () {
        console.log('Optimizing bet allocation...', {
            recommendationsCount: strategy.recommendations.length,
            budget: totalBudget,
            renderCount: renderCount.current
        });
        return optimizeBetAllocation(strategy.recommendations, totalBudget);
    }, [strategy.recommendations, totalBudget]);
    // 馬券種別の表記を統一する関数
    var normalizeTicketType = function (type) {
        var typeMap = {
            "３連複": "3連複",
            "３連単": "3連単"
        };
        return typeMap[type] || type;
    };
    // ソート済みの馬券リストをメモ化
    var sortedBets = useMemo(function () {
        var typeOrder = {
            "単勝": 1,
            "複勝": 2,
            "枠連": 3,
            "馬連": 4,
            "ワイド": 5,
            "馬単": 6,
            "3連複": 7,
            "3連単": 8
        };
        return __spreadArray([], optimizationResult, true).sort(function (a, b) {
            var typeA = normalizeTicketType(a.type);
            var typeB = normalizeTicketType(b.type);
            return (typeOrder[typeA] || 0) - (typeOrder[typeB] || 0);
        });
    }, [optimizationResult]);
    // 馬券間の排反関係を計算する関数
    var calculateMutualExclusivity = function (bet1, bet2) {
        // 同じ馬券種別の場合
        if (bet1.type === bet2.type) {
            // 複勝・ワイド以外の同じ券種は完全排反
            if (bet1.type !== "複勝" && bet1.type !== "ワイド") {
                return 1.0;
            }
            // 複勝の場合
            if (bet1.type === "複勝") {
                // 同じ馬を含む場合
                if (bet1.horses.some(function (h) { return bet2.horses.includes(h); })) {
                    return 1.0; // 同じ馬の複勝を重複購入することはないため
                }
                return 0.4; // 異なる馬の場合は部分的に排反
            }
            // ワイドの場合
            if (bet1.type === "ワイド") {
                var commonHorses_1 = bet1.horses.filter(function (h) { return bet2.horses.includes(h); });
                if (commonHorses_1.length === 2)
                    return 1.0; // 完全に同じ組み合わせ
                if (commonHorses_1.length === 1)
                    return 0.5; // 1頭共通
                return 0.2; // 共通馬なし
            }
        }
        // 異なる馬券種別の場合
        var commonHorses = bet1.horses.filter(function (h) { return bet2.horses.includes(h); });
        if (commonHorses.length === 0)
            return 0;
        // 共通する馬がいる場合、券種の組み合わせに応じて排反度を設定
        if (bet1.type === "単勝" || bet2.type === "単勝") {
            return 0.8; // 単勝が絡む場合は強い排反関係
        }
        if (bet1.type === "複勝" || bet2.type === "複勝") {
            return 0.4; // 複勝が絡む場合は弱い排反関係
        }
        return 0.6; // その他の組み合わせは中程度の排反関係
    };
    // 集計値の計算をメモ化（排反事象を考慮）
    var totals = useMemo(function () {
        var totalInvestment = sortedBets.reduce(function (sum, bet) { return sum + bet.stake; }, 0);
        // 排反事象を考慮した期待収益の計算
        var adjustedExpectedReturn = sortedBets.map(function (bet) {
            var adjustedProb = bet.probability;
            // 他の馬券との排反関係を考慮して確率を調整
            sortedBets.forEach(function (otherBet) {
                if (bet !== otherBet) {
                    var exclusivity = calculateMutualExclusivity(bet, otherBet);
                    var otherStakeRatio = otherBet.stake / totalInvestment;
                    adjustedProb *= (1 - exclusivity * otherBet.probability * otherStakeRatio);
                }
            });
            return bet.expectedReturn * adjustedProb;
        }).reduce(function (sum, return_) { return sum + return_; }, 0);
        return {
            totalInvestment: totalInvestment,
            totalExpectedReturn: adjustedExpectedReturn,
            expectedReturnRate: ((adjustedExpectedReturn / totalInvestment - 1) * 100).toFixed(1)
        };
    }, [sortedBets]);
    // デバッグ用のレンダリングカウント
    useEffect(function () {
        renderCount.current += 1;
        console.log('BettingStrategyTable render:', {
            count: renderCount.current,
            recommendationsCount: strategy.recommendations.length,
            totalBudget: totalBudget,
            timestamp: new Date().toISOString()
        });
    }, [strategy.recommendations.length, totalBudget]);
    // テーブルデータの生成をメモ化
    var tableData = useMemo(function () { return ({
        headers: ['券種', '買い目', 'オッズ', '的中率', '最適投資額', '想定払戻金', ''],
        rows: sortedBets.map(function (bet) { return [
            normalizeTicketType(bet.type),
            (function () {
                if (["馬単", "3連単"].includes(normalizeTicketType(bet.type))) {
                    // 馬単と3連単は矢印区切り（配列を使用して結合）
                    return bet.horses.join('→');
                }
                else if (bet.horses.length === 1) {
                    // 単勝・複勝は馬番のみ
                    return bet.horses[0];
                }
                else {
                    // その他は単純なハイフン区切り
                    return bet.horses.join('-');
                }
            })(),
            Number(bet.expectedReturn / bet.stake).toFixed(1),
            (bet.probability * 100).toFixed(1) + '%',
            bet.stake.toLocaleString() + '円',
            bet.expectedReturn.toLocaleString() + '円',
            <Popover.Root key={bet.horses.join('-')}>
        <Popover.Trigger asChild>
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <InfoCircledIcon className="h-4 w-4"/>
          </Button>
        </Popover.Trigger>
        <Popover.Content className="w-80 rounded-lg border bg-card p-4 shadow-lg" sideOffset={5}>
          <div className="space-y-2">
            <h4 className="font-semibold text-base border-b pb-2 text-white">選択理由</h4>
            <p className="text-sm text-gray-200 leading-relaxed whitespace-normal break-words">
              {bet.reason || '理由なし'}
            </p>
          </div>
        </Popover.Content>
      </Popover.Root>
        ]; })
    }); }, [sortedBets]);
    // テーブルのref追加
    var tableRef = useRef(null);
    // スクリーンショット機能の追加
    var captureTable = function () { return __awaiter(_this, void 0, void 0, function () {
        var originalPadding, canvas, link, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!tableRef.current)
                        return [2 /*return*/];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    originalPadding = tableRef.current.style.padding;
                    tableRef.current.style.padding = '16px'; // 余白を追加
                    return [4 /*yield*/, html2canvas(tableRef.current, {
                            backgroundColor: '#000000',
                            scale: 1,
                            useCORS: true,
                            logging: false,
                            // キャプチャ範囲を少し広げる
                            width: tableRef.current.scrollWidth + 32, // 左右の余白を含む
                            height: tableRef.current.scrollHeight + 32, // 上下の余白を含む
                        })];
                case 2:
                    canvas = _a.sent();
                    // 元の余白に戻す
                    tableRef.current.style.padding = originalPadding;
                    link = document.createElement('a');
                    link.download = "betting-strategy-".concat(new Date().toISOString(), ".png");
                    link.href = canvas.toDataURL('image/png');
                    link.click();
                    return [3 /*break*/, 4];
                case 3:
                    error_1 = _a.sent();
                    console.error('スクリーンショットの作成に失敗:', error_1);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); };
    return (<Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>AI最適化戦略</CardTitle>
          <Button variant="outline" size="sm" onClick={captureTable} className="gap-2">
            <Camera className="h-4 w-4"/>
            買い目を保存
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4" ref={tableRef}>
          <Table>
            <TableHeader>
              <TableRow>
                {tableData.headers.map(function (header, i) { return (<TableHead key={i} className="whitespace-nowrap">
                    {header}
                  </TableHead>); })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableData.rows.map(function (row, i) { return (<TableRow key={i}>
                  {row.map(function (cell, j) { return (<TableCell key={j} className="whitespace-nowrap">
                      {cell}
                    </TableCell>); })}
                </TableRow>); })}
            </TableBody>
          </Table>

          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="font-medium">総投資額:</span>
              <span>{totals.totalInvestment.toLocaleString()}円</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">推定期待収益:</span>
              <span>{Math.round(totals.totalExpectedReturn).toLocaleString()}円</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">推定期待収益率:</span>
              <span>{totals.expectedReturnRate}%</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>);
});
