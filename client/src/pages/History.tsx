import { Card, CardContent } from "@/components/ui/card";
import MainLayout from "@/components/layout/MainLayout";

export default function History() {
  return (
    <MainLayout>
      <h1 className="text-2xl font-bold mb-6">購入履歴</h1>
      <div className="space-y-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">購入履歴はまだありません。</p>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
