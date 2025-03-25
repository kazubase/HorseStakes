import MainLayout from "@/components/layout/MainLayout";
import { Helmet } from "react-helmet-async";

export default function Privacy() {
  return (
    <MainLayout>
      <Helmet>
        <title>プライバシーポリシー | 馬券戦略</title>
        <meta name="description" content="馬券戦略のプライバシーポリシーです。個人情報の取り扱いについて説明しています。" />
        <link rel="canonical" href="https://horse-stakes.com/privacy" />
      </Helmet>

      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">プライバシーポリシー</h1>
        
        <div className="space-y-6 text-sm">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. はじめに</h2>
            <p>馬券戦略（以下「当サービス」）は、ユーザーのプライバシーを尊重し、個人情報の保護に努めています。本プライバシーポリシーでは、当サービスにおける個人情報の取り扱いについて説明します。</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. 収集する情報</h2>
            <p>当サービスは、以下の情報を収集する場合があります：</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>アクセスログ情報（IPアドレス、ブラウザ情報、アクセス日時など）</li>
              <li>端末情報（デバイス種類、OS情報など）</li>
              <li>利用状況データ（ページビュー、滞在時間など）</li>
              <li>ユーザーが入力した情報（レース情報、予想データなど）</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. 情報の利用目的</h2>
            <p>収集した情報は、以下の目的で利用されます：</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>サービスの提供・運営</li>
              <li>サービスの改善・新機能の開発</li>
              <li>ユーザーサポートの提供</li>
              <li>不正利用の防止</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. 情報の共有</h2>
            <p>当サービスは、以下の場合を除き、収集した個人情報を第三者と共有することはありません：</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>法令に基づく場合</li>
              <li>ユーザーの同意がある場合</li>
              <li>業務委託先との共有が必要な場合</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. 情報の保護</h2>
            <p>当サービスは、個人情報の漏洩、滅失、毀損の防止その他個人情報の安全管理のために、セキュリティ対策を実施しています。</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Cookieの使用</h2>
            <p>当サービスは、ユーザー体験の向上やサービスの改善のためにCookieを使用しています。Cookieの使用を希望しない場合は、ブラウザの設定で無効化することができます。</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. アクセス解析ツール</h2>
            <p>当サービスは、Google Analytics等のアクセス解析ツールを使用して、ユーザーの利用状況を分析しています。これらのツールは、Cookieを使用して情報を収集します。</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. プライバシーポリシーの変更</h2>
            <p>当サービスは、必要に応じて本プライバシーポリシーを変更することがあります。変更があった場合は、当サービス上でお知らせします。</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. お問い合わせ</h2>
            <p>プライバシーポリシーに関するお問い合わせは、以下のメールアドレスまでご連絡ください：</p>
            <p className="mt-2">support@horse-stakes.com</p>
          </section>
        </div>
      </div>
    </MainLayout>
  );
} 