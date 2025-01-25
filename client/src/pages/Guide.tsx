import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import MainLayout from "@/components/layout/MainLayout";
import { Ticket, Calendar, Coins, Trophy } from "lucide-react";

export default function Guide() {
  return (
    <MainLayout>
      <h1 className="text-2xl font-bold mb-6">使い方ガイド</h1>
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Step 1: レース選択
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p>1. ホーム画面から対象のレース日を選択します</p>
            <p>2. 投票したいレースを選択します</p>
            <p className="text-sm text-muted-foreground">※前日20時までのレースが表示されます</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ticket className="h-5 w-5" />
              Step 2: 馬券種類の選択
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p>1. 単勝・複勝・馬連から馬券の種類を選択します</p>
            <p>2. 投資金額を入力します</p>
            <p className="text-sm text-muted-foreground">※AIが過去のデータを分析し、選択した馬券種類に最適な投票パターンを提案します</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5" />
              Step 3: AI予想の確認
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p>1. AIが提案する馬券の組み合わせを確認します</p>
            <p>2. 各馬の予想オッズと期待値を確認できます</p>
            <p className="text-sm text-muted-foreground">※予想根拠となる独自の指標やデータもご確認いただけます</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Step 4: 結果確認
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p>1. レース終了後、自動的に結果が反映されます</p>
            <p>2. 的中した場合は払戻金が表示されます</p>
            <p className="text-sm text-muted-foreground">※レース結果は通常、確定後5分以内に反映されます</p>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
} 