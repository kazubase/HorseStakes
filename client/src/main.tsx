import React from 'react'
import ReactDOM from 'react-dom/client'
import * as ReactJSXRuntime from 'react/jsx-runtime'
import App from './App'
import './index.css'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/queryClient'
import { HelmetProvider } from 'react-helmet-async'
import { Toaster } from "@/components/ui/toaster";

// React関連のグローバル設定
// Reactとその依存関係をグローバルに公開
window.React = React;
// JSX Runtimeもグローバルに公開
// @ts-ignore
window.ReactJSXRuntime = ReactJSXRuntime;
// @ts-ignore
window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = { isDisabled: true };

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
  // Intersection Observerを使用して、リソースが視界に入った時に読み込む
  const lazyLoadResources = () => {
    // 遅延読み込み対象の要素を監視
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          // 要素が表示領域に入った場合の処理
          observer.unobserve(entry.target);
          
          // 非クリティカルなCSS/JSを読み込む
          const targetElement = entry.target as HTMLElement;
          if (targetElement.dataset.src) {
            const src = targetElement.dataset.src;
            if (src.endsWith('.js')) {
              const script = document.createElement('script');
              script.src = src;
              script.async = true;
              document.body.appendChild(script);
            } else if (src.endsWith('.css')) {
              const link = document.createElement('link');
              link.rel = 'stylesheet';
              link.href = src;
              document.head.appendChild(link);
            }
          }
        }
      });
    }, { rootMargin: '200px' });
    
    // LazyLoad対象の要素を監視
    document.querySelectorAll('[data-lazy]').forEach(el => {
      observer.observe(el);
    });
  };

  // 画面が表示された後に実行
  if ('requestIdleCallback' in window) {
    // @ts-ignore
    window.requestIdleCallback(() => {
      lazyLoadResources();
    }, { timeout: 2000 });
  } else {
    // フォールバック
    setTimeout(lazyLoadResources, 1000);
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
