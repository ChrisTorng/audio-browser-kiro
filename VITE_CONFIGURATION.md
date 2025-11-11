# Vite 建置配置說明

## 概述

本專案使用 Vite 作為前端建置工具，配置檔案位於 `vite.config.ts`。

## 主要配置項目

### 1. 建置輸出

- **輸出目錄**: `dist/client`
- **清空輸出目錄**: 每次建置前自動清空
- **Source Maps**: 開發模式啟用，生產模式關閉
- **程式碼分割**: 自動分割 React 相關套件以優化快取

```typescript
build: {
  outDir: '../../dist/client',
  emptyOutDir: true,
  sourcemap: mode === 'development',
  manualChunks: {
    'react-vendor': ['react', 'react-dom'],
    'react-window': ['react-window'],
  },
}
```

### 2. 開發環境 Proxy

開發時，Vite 開發伺服器會將所有 `/api` 請求代理到 Fastify 後端伺服器。

- **前端開發伺服器**: `http://localhost:5173`
- **後端 API 伺服器**: `http://localhost:3000`
- **Proxy 規則**: `/api/*` → `http://localhost:3000/api/*`

```typescript
server: {
  port: 5173,
  proxy: {
    '/api': {
      target: 'http://localhost:3000',
      changeOrigin: true,
    },
  },
}
```

### 3. 環境變數處理

#### 環境變數前綴

只有以 `VITE_` 開頭的環境變數會被暴露給客戶端程式碼。

#### 可用的環境變數

建立 `.env` 檔案來自訂配置（參考 `.env.example`）：

**前端相關（客戶端可存取）:**
- `VITE_DEV_PORT`: Vite 開發伺服器埠號（預設: 5173）
- `VITE_DEV_HOST`: Vite 開發伺服器主機（預設: localhost）
- `VITE_PREVIEW_PORT`: Vite 預覽伺服器埠號（預設: 4173）
- `VITE_PREVIEW_HOST`: Vite 預覽伺服器主機（預設: localhost）
- `VITE_API_HOST`: 後端 API 主機（預設: localhost）
- `VITE_API_PORT`: 後端 API 埠號（預設: 3000）

**後端相關（僅伺服器端可存取）:**
- `PORT`: Fastify 伺服器埠號（預設: 3000）
- `HOST`: Fastify 伺服器主機（預設: 0.0.0.0）
- `NODE_ENV`: 執行環境（development/production）
- `AUDIO_ROOT_PATH`: 音檔根目錄路徑

#### 在程式碼中使用環境變數

**客戶端程式碼:**
```typescript
// 使用 import.meta.env
const apiHost = import.meta.env.VITE_API_HOST;
const isDev = import.meta.env.DEV;
const isProd = import.meta.env.PROD;

// 使用全域常數（在 vite.config.ts 中定義）
console.log(__APP_VERSION__);
console.log(__DEV__);
```

**伺服器端程式碼:**
```typescript
// 使用 process.env
const port = process.env.PORT || 3000;
const nodeEnv = process.env.NODE_ENV;
```

### 4. 路徑別名

配置了路徑別名以簡化 import 語句：

```typescript
resolve: {
  alias: {
    '@shared': path.resolve(__dirname, './src/shared'),
    '@client': path.resolve(__dirname, './src/client'),
  },
}
```

使用範例：
```typescript
import { AudioMetadata } from '@shared/types';
import { AudioBrowser } from '@client/components';
```

### 5. TypeScript 型別支援

環境變數的 TypeScript 型別定義位於 `src/client/vite-env.d.ts`。

## 常用指令

### 開發模式
```bash
npm run dev          # 同時啟動前後端開發伺服器
npm run dev:client   # 只啟動 Vite 開發伺服器
npm run dev:server   # 只啟動 Fastify 後端伺服器
```

### 建置
```bash
npm run build        # 建置前後端
npm run build:client # 只建置前端
npm run build:server # 只建置後端
```

### 預覽生產建置
```bash
npm run build:client # 先建置前端
vite preview         # 啟動預覽伺服器
```

### 測試
```bash
npm test             # 執行所有測試
npm run test:watch   # 監視模式執行測試
npm run test:coverage # 執行測試並生成覆蓋率報告
```

## 生產環境部署

1. 建置前後端：
   ```bash
   npm run build
   ```

2. 啟動生產伺服器：
   ```bash
   npm start
   ```

3. Fastify 會自動服務 `dist/client` 目錄中的靜態檔案。

## 效能優化

### 程式碼分割

Vite 配置會自動將以下套件分割為獨立的 chunk：
- `react-vendor`: React 和 ReactDOM
- `react-window`: 虛擬滾動套件

這樣可以：
- 提升快取效率（框架程式碼變動較少）
- 減少初始載入時間
- 優化並行下載

### 建置優化

- **生產模式**: 使用 esbuild 進行程式碼壓縮
- **開發模式**: 不壓縮，保留 source maps 以便除錯
- **Tree Shaking**: 自動移除未使用的程式碼

## 疑難排解

### Proxy 無法連接到後端

確保：
1. Fastify 後端伺服器正在執行（`npm run dev:server`）
2. 後端伺服器監聽在正確的埠號（預設 3000）
3. `.env` 檔案中的 `VITE_API_PORT` 與後端埠號一致

### 環境變數未生效

確保：
1. 環境變數以 `VITE_` 開頭（客戶端變數）
2. 重新啟動開發伺服器
3. 使用 `import.meta.env` 而非 `process.env`（客戶端）

### 建置失敗

1. 清除快取：`rm -rf node_modules/.vite`
2. 重新安裝依賴：`npm install`
3. 檢查 TypeScript 錯誤：`npm run lint`

## 參考資源

- [Vite 官方文件](https://vitejs.dev/)
- [Vite 環境變數](https://vitejs.dev/guide/env-and-mode.html)
- [Vite 伺服器選項](https://vitejs.dev/config/server-options.html)
- [Vite 建置選項](https://vitejs.dev/config/build-options.html)
