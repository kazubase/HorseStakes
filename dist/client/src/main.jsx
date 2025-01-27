import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import App from './App';
import "./index.css";
// CSRFトークンを設定
var setCsrfToken = function () {
    var _a;
    var token = (_a = document.cookie
        .split('; ')
        .find(function (row) { return row.startsWith('XSRF-TOKEN='); })) === null || _a === void 0 ? void 0 : _a.split('=')[1];
    if (token) {
        var metaTag = document.querySelector('meta[name="csrf-token"]');
        if (metaTag) {
            metaTag.setAttribute('content', token);
        }
    }
};
// アプリケーション初期化時にCSRFトークンを設定
setCsrfToken();
createRoot(document.getElementById("root")).render(<StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster />
    </QueryClientProvider>
  </StrictMode>);
