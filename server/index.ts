import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import csrf from 'csurf';
import cookieParser from 'cookie-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ルートディレクトリの.envファイルを読み込む
dotenv.config({ 
  path: path.resolve(__dirname, '../.env') 
});

const app = express();
app.set('trust proxy', 1);  // Herokuで必要な設定
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        manifestSrc: ["'self'"],
        workerSrc: ["'none'"],
        childSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: true,
    crossOriginResourcePolicy: { policy: "same-site" },
    dnsPrefetchControl: true,
    frameguard: { action: "deny" },
    hsts: true,
    noSniff: true,
    originAgentCluster: true,
    permittedCrossDomainPolicies: true,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  })
);

// 開発環境かどうかをチェック
const isDevelopment = process.env.NODE_ENV === 'development';

// Gemini API用のレート制限
const geminiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDevelopment ? Infinity : 200,  // 開発環境では制限なし
  skip: (req) => !req.path.includes('/api/gemini')
});

// Gemini APIルートにのみ適用
app.use('/api/gemini', geminiLimiter);

// 一般的なレート制限
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDevelopment ? Infinity : 2000  // 開発環境では制限なし
});

app.use(generalLimiter);

// Cookie parserを追加（csurfの前に必要）
app.use(cookieParser());

// CSRFミドルウェアを追加
app.use(csrf({ 
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  } 
}));

// CSRFトークンをレスポンスヘッダーに含める
app.use((req, res, next) => {
  res.cookie('XSRF-TOKEN', req.csrfToken(), {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  // 明示的にDOCTYPEを設定
  res.setHeader('X-UA-Compatible', 'IE=edge');
  next();
});

(async () => {
  const server = registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 3000
  // this serves both the API and the client
  const PORT = Number(process.env.PORT) || 3000;
  server.listen(PORT, "0.0.0.0", () => {
    log(`serving on port ${PORT}`);
  });
})();

// HTMLテンプレートにDOCTYPEを追加
const htmlTemplate = `
<!DOCTYPE html>
<html lang="ja">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HorseStakes</title>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
`;
