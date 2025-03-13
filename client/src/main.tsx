import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HelmetProvider } from 'react-helmet-async'
import { Toaster } from "@/components/ui/toaster";

// CSRFトークンを設定
function setCsrfToken() {
  const token = document.getElementById('csrf-token')?.getAttribute('content');
  if (token) {
    document.cookie = `XSRF-TOKEN=${token}; path=/`;
  }
}

// アプリケーション初期化時にCSRFトークンを設定
setCsrfToken();

const queryClient = new QueryClient()

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
