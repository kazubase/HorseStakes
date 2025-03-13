import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/queryClient'
import { HelmetProvider } from 'react-helmet-async'
import { Toaster } from "@/components/ui/toaster";

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

// アプリケーション初期化時にCSRFトークンを設定
setCsrfToken();

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
