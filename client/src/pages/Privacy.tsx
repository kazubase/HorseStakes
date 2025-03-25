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
            <p className="mt-2">本プライバシーポリシーにおける「個人情報」とは、個人情報保護法に定める個人情報を指します。具体的には、生存する個人に関する情報であって、当該情報に含まれる氏名、生年月日その他の記述等により特定の個人を識別できるもの、及び個人識別符号が含まれるものを指します。</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. 収集する情報</h2>
            <p>当サービスは、以下の情報を収集する場合があります：</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>基本情報（氏名、メールアドレス、電話番号など）</li>
              <li>アクセスログ情報（IPアドレス、ブラウザ情報、アクセス日時など）</li>
              <li>端末情報（デバイス種類、OS情報など）</li>
              <li>利用状況データ（ページビュー、滞在時間など）</li>
              <li>ユーザーが入力した情報（レース情報、予想データなど）</li>
              <li>位置情報（ユーザーの許可を得た場合）</li>
              <li>支払い情報（有料サービス利用時）</li>
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
              <li>マーケティング活動（ユーザーの同意がある場合）</li>
              <li>統計データの作成（個人を特定できない形式）</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. 情報の共有</h2>
            <p>当サービスは、以下の場合を除き、収集した個人情報を第三者と共有することはありません：</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>法令に基づく場合</li>
              <li>ユーザーの同意がある場合</li>
              <li>業務委託先との共有が必要な場合</li>
              <li>当サービスの事業譲渡に伴う場合</li>
              <li>グループ企業との共有が必要な場合</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. 情報の保護</h2>
            <p>当サービスは、個人情報の漏洩、滅失、毀損の防止その他個人情報の安全管理のために、以下の対策を実施しています：</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>アクセス制御の実施</li>
              <li>データの暗号化</li>
              <li>セキュリティソフトウェアの導入</li>
              <li>従業員への教育・研修</li>
              <li>定期的なセキュリティ監査</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. データの保持期間</h2>
            <p>当サービスは、収集した個人情報を、利用目的の達成に必要な期間を超えて保持することはありません。ただし、法令で定められた保存期間がある場合は、その期間を超えて保持することがあります。</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. ユーザーの権利</h2>
            <p>ユーザーは、当サービスに対して以下の請求を行うことができます：</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>個人情報の開示請求</li>
              <li>個人情報の訂正請求</li>
              <li>個人情報の削除請求</li>
              <li>利用停止請求</li>
              <li>第三者提供の停止請求</li>
            </ul>
            <p className="mt-2">これらの請求に関する手続きは、お問い合わせフォームまたはメールにてご連絡ください。</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. 海外へのデータ移転</h2>
            <p>当サービスは、必要に応じて個人情報を海外のサーバーやデータセンターに保存することがあります。この場合、適切な保護措置を講じた上で移転を行います。</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Cookieの使用</h2>
            <p>当サービスは、ユーザー体験の向上やサービスの改善のためにCookieを使用しています。Cookieの使用を希望しない場合は、ブラウザの設定で無効化することができます。ただし、一部の機能が利用できなくなる場合があります。</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. アクセス解析ツール</h2>
            <p>当サービスは、Google Analytics等のアクセス解析ツールを使用して、ユーザーの利用状況を分析しています。これらのツールは、Cookieを使用して情報を収集します。収集されたデータは、個人を特定できない形式で処理されます。</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">11. プライバシーポリシーの変更</h2>
            <p>当サービスは、必要に応じて本プライバシーポリシーを変更することがあります。変更があった場合は、当サービス上でお知らせします。また、重要な変更がある場合は、メール等で通知いたします。</p>
          </section>
          {/*
          <section>
            <h2 className="text-xl font-semibold mb-3">12. お問い合わせ</h2>
            <p>プライバシーポリシーに関するお問い合わせは、以下のメールアドレスまでご連絡ください：</p>
            <p className="mt-2">support@horse-stakes.com</p>
            <p className="mt-2">個人情報保護管理者：馬券戦略 プライバシー担当</p>
          </section>
          */}
        </div>
      </div>
    </MainLayout>
  );
} 