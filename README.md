# 馬券戦略

競馬の予測と分析を行うためのWebアプリケーションです。AIによる分析、ベッティングポートフォリオの最適化、そしてユーザーフレンドリーなインターフェースを提供します。

## 主な機能

- **AIによる競馬予測**: 機械学習モデルを活用した高度な予測機能。
- **ベッティングポートフォリオ管理**: ユーザーの資金を最適化するためのベッティング戦略ツール。
- **リアルタイムオッズ収集**: 最新の競馬オッズを自動で収集・分析。
- **データ駆動型インサイト**: 過去のデータに基づいた詳細な分析と洞察。

## 技術スタック

### フロントエンド

- **React**: ユーザーインターフェース構築のためのJavaScriptライブラリ。
- **Vite**: 高速な開発サーバーとビルドツール。
- **TypeScript**: 静的型付けを可能にするJavaScriptのスーパーセット。
- **Tailwind CSS**: 高速なUI開発のためのユーティリティファーストのCSSフレームワーク。
- **Zustand / Jotai**: 状態管理ライブラリ。
- **Radix UI**: アクセシビリティに優れたUIコンポーネントライブラリ。
- **TanStack Query**: データフェッチ、キャッシュ、同期、サーバー状態の更新のための強力なツール。

### バックエンド

- **Node.js**: サーバーサイドJavaScript実行環境。
- **Express**: Node.jsのWebアプリケーションフレームワーク。
- **TypeScript**: バックエンドロジックの型安全性確保。
- **Drizzle ORM**: TypeScript ORMで、型安全なSQLクエリを可能にします。
- **PostgreSQL (via Neon)**: スケーラブルで信頼性の高いリレーショナルデータベース。
- **Passport.js**: 認証ミドルウェア。
- **node-schedule**: 定期的なタスク（例: オッズ収集）のスケジューリング。
- **Cheerio / Playwright**: Webスクレイピングと自動化。
- **Google Generative AI**: AI予測機能の基盤。

## セットアップ

このプロジェクトをローカル環境でセットアップするには、以下の手順に従ってください。

### 前提条件

- Node.js (v18.x 推奨)
- npm (または yarn)
- PostgreSQL データベースへのアクセス (Neon DBを使用することをお勧めします)

### 1. リポジトリのクローン

```bash
git clone https://github.com/YOUR_USERNAME/HorseStakes.git
cd HorseStakes
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. 環境変数の設定

プロジェクトのルートに`.env`ファイルを作成し、以下の環境変数を設定してください。

```dotenv
DATABASE_URL="your_postgresql_connection_string"
GOOGLE_API_KEY="your_google_generative_ai_api_key"
SESSION_SECRET="a_very_secret_string"
```

- `DATABASE_URL`: PostgreSQLデータベースへの接続文字列です。
- `GOOGLE_API_KEY`: Google Generative AI APIキーです。
- `SESSION_SECRET`: セッション管理のための秘密鍵です。任意の強力な文字列を設定してください。

### 4. データベースのマイグレーションとシード

```bash
npm run db:push
npm run db:seed-bet-types
```

これにより、データベーススキーマが適用され、初期データ（賭けの種類など）が投入されます。

## 開発サーバーの実行

```bash
npm run dev
```

これにより、フロントエンドとバックエンドの両方の開発サーバーが起動します。アプリケーションは通常、`http://localhost:5173`で利用可能になります。

## プロダクションビルド

```bash
npm run build
```

これにより、フロントエンドアセットが`dist`ディレクトリにビルドされ、TypeScriptコードがコンパイルされます。

## プロダクションモードでの実行

```bash
npm start
```

## その他のスクリプト

- `npm run check`: TypeScriptの型チェックを実行します。
- `npm run test-odds`: オッズ収集スクリプトのテストを実行します。
- `npm run collect`: 日次オッズ収集スクリプトを実行します。 