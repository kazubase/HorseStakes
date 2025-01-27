import { Card, CardContent } from "@/components/ui/card";
import MainLayout from "@/components/layout/MainLayout";
export default function Settings() {
    return (<MainLayout>
      <h1 className="text-2xl font-bold mb-6">設定</h1>
      <div className="space-y-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">設定項目は準備中です。</p>
          </CardContent>
        </Card>
      </div>
    </MainLayout>);
}
