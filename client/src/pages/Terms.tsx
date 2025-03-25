import MainLayout from "@/components/layout/MainLayout";
import { Helmet } from "react-helmet-async";

export default function Terms() {
  return (
    <MainLayout>
      <Helmet>
        <title>利用規約 | 馬券戦略</title>
        <meta name="description" content="馬券戦略の利用規約です。サービスの利用条件や禁止事項について説明しています。" />
        <link rel="canonical" href="https://horse-stakes.com/terms" />
      </Helmet>

      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">利用規約</h1>
        
        <div className="space-y-6 text-sm">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. はじめに</h2>
            <p>本利用規約（以下「本規約」）は、馬券戦略（以下「当サービス」）の利用条件を定めるものです。</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. 定義</h2>
            <p>本規約において、以下の用語は以下の意味で使用します：</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>「ユーザー」とは、当サービスを利用する全ての方を指します。</li>
              <li>「コンテンツ」とは、当サービス上で提供される全ての情報を指します。</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. 利用規約の変更</h2>
            <p>当サービスは、必要と判断した場合には、ユーザーに通知することなく本規約を変更することができるものとします。</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. 禁止事項</h2>
            <p>ユーザーは、当サービスの利用にあたり、以下の行為をしてはなりません：</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>法令または公序良俗に違反する行為</li>
              <li>犯罪行為に関連する行為</li>
              <li>当サービスの運営を妨害するおそれのある行為</li>
              <li>他のユーザーに関する個人情報等を収集または蓄積する行為</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. 免責事項</h2>
            <p>当サービスは、以下の事項について一切の責任を負いません：</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>当サービスに掲載された情報の正確性</li>
              <li>当サービスの利用により生じた損害</li>
              <li>当サービスを利用したことによる馬券購入の結果</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. サービス内容の変更等</h2>
            <p>当サービスは、ユーザーに通知することなく、サービスの内容を変更しまたはサービスの提供を中止することができるものとします。</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. 利用制限の解除等</h2>
            <p>当サービスは、利用制限に該当するユーザーに通知することなく、当サービスの全部または一部の利用を制限することができます。</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. 保証の否認および免責事項</h2>
            <p>当サービスは、明示的にも黙示的にも、適法性、特定目的への適合性、安全性、正確性、完全性、有用性等について、いかなる保証も行いません。</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. サービス利用料金</h2>
            <p>当サービスは、現時点では無料で提供されています。ただし、将来的に有料化する可能性があります。</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. 準拠法・裁判管轄</h2>
            <p>本規約の解釈にあたっては、日本法を準拠法とします。また、当サービスに関して紛争が生じた場合には、当サービスの本店所在地を管轄する裁判所を専属的合意管轄とします。</p>
          </section>
        </div>
      </div>
    </MainLayout>
  );
} 