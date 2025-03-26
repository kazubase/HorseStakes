import React from 'react'
import ReactDOM from 'react-dom/client'
import * as ReactJSXRuntime from 'react/jsx-runtime'
import App from './App'
import './index.css'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/queryClient'
import { HelmetProvider } from 'react-helmet-async'
import { Toaster } from "@/components/ui/toaster"

// React関連のグローバル設定
// Reactとその依存関係をグローバルに公開
window.React = React;
// JSX Runtimeもグローバルに公開
// @ts-ignore
window.ReactJSXRuntime = ReactJSXRuntime;
// @ts-ignore
window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = process.env.NODE_ENV === 'production' 
  ? { isDisabled: true }
  : (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;

// デバッグ用に環境変数の状態を出力
if (process.env.NODE_ENV !== 'production') {
  console.log('Running in development mode - NODE_ENV:', process.env.NODE_ENV);
}

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

// パフォーマンス最適化：非クリティカルリソースの遅延読み込み
const loadNonCriticalResources = () => {
  // Intersection Observerを使用して、要素が視界に入った時にリソースを読み込む
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        observer.unobserve(entry.target);
        const el = entry.target as HTMLElement;
        const src = el.dataset.src;
        
        if (src) {
          if (src.endsWith('.js')) {
            import(/* @vite-ignore */ src).catch(console.error);
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
  document.querySelectorAll('[data-lazy]').forEach(el => observer.observe(el));
};

// アプリケーション初期化
const initApp = () => {
  // CSRFトークンを設定
  setCsrfToken();

  // 非クリティカルリソースの遅延読み込みを設定
  if ('requestIdleCallback' in window) {
    // @ts-ignore
    requestIdleCallback(loadNonCriticalResources, { timeout: 2000 });
  } else {
    setTimeout(loadNonCriticalResources, 1000);
  }

  // Reactアプリケーションをレンダリング
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <HelmetProvider>
          <App />
          <Toaster />
        </HelmetProvider>
      </QueryClientProvider>
    </React.StrictMode>
  );
};

// DOMContentLoadedイベント後にアプリケーションを初期化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
