import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import MainLayout from "@/components/layout/MainLayout";
import { ArrowLeft, History, TrendingUp, Target, LoaderIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table";
export default function ExplainHistory() {
    var id = useParams().id;
    var _a = useQuery({
        queryKey: ["/api/betting-explanation/".concat(id, "/history")],
        enabled: !!id,
    }), backtest = _a.data, isLoading = _a.isLoading;
    if (isLoading) {
        return (<MainLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <LoaderIcon className="h-8 w-8 animate-spin"/>
        </div>
      </MainLayout>);
    }
    return (<MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">過去実績分析</h1>
          <Button variant="outline" size="sm" onClick={function () { return window.location.href = "/explain/".concat(id); }}>
            <ArrowLeft className="mr-2 h-4 w-4"/>
            戻る
          </Button>
        </div>

        <div className="grid gap-6">
          {/* 概要 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5"/>
                バックテスト結果概要
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <p className="whitespace-pre-wrap">{backtest === null || backtest === void 0 ? void 0 : backtest.summary}</p>
            </CardContent>
          </Card>

          {/* パフォーマンス指標 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5"/>
                パフォーマンス指標
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">分析対象レース数</p>
                  <p className="text-2xl font-bold">
                    {backtest === null || backtest === void 0 ? void 0 : backtest.performanceMetrics.totalRaces.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">的中率</p>
                  <p className="text-2xl font-bold text-green-500">
                    {backtest === null || backtest === void 0 ? void 0 : backtest.performanceMetrics.winRate.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">投資収益率</p>
                  <p className="text-2xl font-bold text-green-500">
                    {backtest === null || backtest === void 0 ? void 0 : backtest.performanceMetrics.roiPercent.toFixed(1)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 月次パフォーマンス */}
          <Card>
            <CardHeader>
              <CardTitle>月次パフォーマンス</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>月</TableHead>
                    <TableHead>レース数</TableHead>
                    <TableHead className="text-right">的中率</TableHead>
                    <TableHead className="text-right">ROI</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {backtest === null || backtest === void 0 ? void 0 : backtest.monthlyPerformance.map(function (month, index) { return (<TableRow key={index}>
                      <TableCell>{month.month}</TableCell>
                      <TableCell>{month.races}</TableCell>
                      <TableCell className="text-right">
                        {month.winRate.toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-right">
                        {month.roi.toFixed(1)}%
                      </TableCell>
                    </TableRow>); })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* 戦略分析 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5"/>
                戦略分析
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {backtest === null || backtest === void 0 ? void 0 : backtest.strategyAnalysis.map(function (strategy, index) { return (<div key={index} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-medium">{strategy.description}</p>
                      <span className="text-sm text-muted-foreground">
                        有効性: {strategy.effectiveness.toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={strategy.effectiveness} className="h-2" style={{
                background: "hsl(".concat(strategy.effectiveness, ", 100%, 30%)"),
            }}/>
                  </div>); })}
              </div>
            </CardContent>
          </Card>
        </div>

        <Alert>
          <AlertDescription>
            本分析は過去のデータに基づくものです。将来の結果を保証するものではありません。
          </AlertDescription>
        </Alert>
      </div>
    </MainLayout>);
}
