import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import MainLayout from "@/components/layout/MainLayout";
import { Brain, Database, Calculator, TrendingUp } from "lucide-react";
export default function Algorithm() {
    return (<MainLayout>
      <h1 className="text-2xl font-bold mb-6">AIアルゴリズム解説</h1>
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5"/>
              データ収集と分析
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p>• JRAの公式データを基に、過去10年分のレース結果を分析</p>
            <p>• 馬場状態、天候、出走馬の成績など50以上の要素を考慮</p>
            <p className="text-sm text-muted-foreground">※データは毎週更新され、最新の傾向を反映します</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5"/>
              機械学習モデル
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p>• ディープラーニングを用いた独自の予測モデルを採用</p>
            <p>• 競走馬の能力、騎手の相性、コースの特徴を学習</p>
            <p className="text-sm text-muted-foreground">※月間100,000レース以上のシミュレーションで精度を向上</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5"/>
              投資最適化
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p>• 期待値計算に基づく最適な投資金額の算出</p>
            <p>• リスク分散を考慮した馬券の組み合わせ提案</p>
            <p className="text-sm text-muted-foreground">※オッズの変動も考慮した動的な投資戦略を採用</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5"/>
              パフォーマンス
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p>• 的中率：単勝30%以上、複勝45%以上を維持</p>
            <p>• 長期的な収支プラスを目指した予想を提供</p>
            <p className="text-sm text-muted-foreground">※過去の実績であり、将来の的中を保証するものではありません</p>
          </CardContent>
        </Card>
      </div>
    </MainLayout>);
}
