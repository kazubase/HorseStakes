import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/queryClient'
import { HelmetProvider } from 'react-helmet-async'
import { Toaster } from "@/components/ui/toaster";

// React18の新機能を使用するための設定
// @ts-ignore
window.React = React; // グローバルにReactを割り当て（RadixUIの依存解決のため）

// CSRFトークンを設定
const setCsrfToken = () => {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('XSRF-TOKEN='))
    ?.split('=')[1];

  if (token) {
    const metaTag = document.querySelector('meta[name="csrf-token"]');
    if (metaTag) {
      metaTag.setAttribute('content', token);
    }
  }
};

// パフォーマンス最適化：ロード後に非クリティカルリソースを読み込む
const loadNonCriticalResources = () => {
  // 画面が表示された後に実行
  if (window.requestIdleCallback) {
    window.requestIdleCallback(() => {
      // 必要な追加リソースをここで読み込み
      const preconnectLink = document.createElement('link');
      preconnectLink.rel = 'preconnect';
      preconnectLink.href = 'https://fonts.googleapis.com';
      document.head.appendChild(preconnectLink);
    });
  } else {
    // requestIdleCallbackが利用できないブラウザ用のフォールバック
    setTimeout(() => {
      // 同様の処理
    }, 1000);
  }
};

// アプリケーション初期化時にCSRFトークンを設定
setCsrfToken();

// DOMContentLoadedイベント後に非クリティカルリソースを読み込む
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadNonCriticalResources);
} else {
  loadNonCriticalResources();
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <App />
        <Toaster />
      </HelmetProvider>
    </QueryClientProvider>
  </React.StrictMode>,
)
