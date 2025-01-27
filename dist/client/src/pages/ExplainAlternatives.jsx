import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import MainLayout from "@/components/layout/MainLayout";
import { ArrowLeft, Lightbulb, TrendingUp, Target, LoaderIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table";
export default function ExplainAlternatives() {
    var id = useParams().id;
    var _a = useQuery({
        queryKey: ["/api/betting-explanation/".concat(id, "/alternatives")],
        enabled: !!id,
    }), alternatives = _a.data, isLoading = _a.isLoading;
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
          <h1 className="text-2xl font-bold">代替戦略提案</h1>
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
                <Lightbulb className="h-5 w-5"/>
                代替戦略概要
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <p className="whitespace-pre-wrap">{alternatives === null || alternatives === void 0 ? void 0 : alternatives.summary}</p>
            </CardContent>
          </Card>

          {/* 代替戦略リスト */}
          {alternatives === null || alternatives === void 0 ? void 0 : alternatives.strategies.map(function (strategy, index) { return (<Card key={index}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="h-5 w-5"/>
                    {strategy.name}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    必要予算: ¥{strategy.requiredBudget.toLocaleString()}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-sm text-muted-foreground">
                  {strategy.description}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm font-medium mb-2">期待リターン</p>
                    <p className="text-2xl font-bold text-green-500">
                      {strategy.expectedReturn.toFixed(1)}倍
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2">的中確率</p>
                    <Progress value={strategy.winProbability} className="h-2 mt-4"/>
                    <p className="text-sm text-muted-foreground mt-1">
                      {strategy.winProbability.toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2">リスクレベル</p>
                    <Progress value={strategy.riskLevel} className="h-2 mt-4" style={{
                background: "hsl(".concat(100 - strategy.riskLevel, ", 100%, 30%)"),
            }}/>
                    <p className="text-sm text-muted-foreground mt-1">
                      {strategy.riskLevel.toFixed(1)}%
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">メリット</h4>
                    <ul className="space-y-1">
                      {strategy.advantages.map(function (adv, i) { return (<li key={i} className="text-sm text-muted-foreground">
                          • {adv}
                        </li>); })}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-2">デメリット</h4>
                    <ul className="space-y-1">
                      {strategy.disadvantages.map(function (dis, i) { return (<li key={i} className="text-sm text-muted-foreground">
                          • {dis}
                        </li>); })}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>); })}

          {/* 戦略比較 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5"/>
                現行戦略との比較
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>指標</TableHead>
                    <TableHead className="text-right">現行戦略</TableHead>
                    <TableHead className="text-right">代替戦略</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alternatives === null || alternatives === void 0 ? void 0 : alternatives.comparisonMetrics.map(function (metric, index) { return (<TableRow key={index}>
                      <TableCell>{metric.description}</TableCell>
                      <TableCell className="text-right">
                        {metric.currentStrategy.toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-right">
                        {metric.alternativeStrategy.toFixed(1)}%
                      </TableCell>
                    </TableRow>); })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <Alert>
          <AlertDescription>
            提案された代替戦略は参考情報です。実際の投資判断は、各自の責任において行ってください。
          </AlertDescription>
        </Alert>
      </div>
    </MainLayout>);
}
