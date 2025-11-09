# 專案結構

## 整體架構（整合式單一服務）

```
audio-browser-kiro/
├── src/
│   ├── server/           # Fastify 後端
│   │   ├── routes/       # API 路由
│   │   ├── services/     # 業務邏輯層
│   │   ├── models/       # 資料模型
│   │   ├── db/           # 資料庫相關
│   │   └── utils/        # 後端工具函式
│   ├── client/           # React 前端
│   │   ├── components/   # React 元件
│   │   ├── hooks/        # 自訂 Hooks
│   │   ├── services/     # API 呼叫層
│   │   ├── types/        # TypeScript 型別定義
│   │   ├── utils/        # 前端工具函式
│   │   └── App.tsx       # 主應用程式
│   ├── shared/           # 前後端共用
│   │   └── types/        # 共用型別定義
│   └── index.ts          # 應用程式入口
├── tests/                # 測試檔案
│   ├── server/           # 後端測試
│   └── client/           # 前端測試
├── public/               # 靜態資源
├── waveforms/            # 生成的波形圖儲存位置
├── data/                 # SQLite 資料庫檔案
└── dist/                 # 建置輸出
```

## 架構分層原則

### 後端分層 (src/server/)

1. **路由層** (`routes/`): 處理 HTTP 請求與回應
2. **服務層** (`services/`): 業務邏輯實作
3. **模型層** (`models/`): 資料結構定義
4. **資料庫層** (`db/`): 資料庫操作
5. **工具層** (`utils/`): 共用工具函式

### 前端分層 (src/client/)

1. **元件層** (`components/`): UI 元件
2. **服務層** (`services/`): API 通訊
3. **狀態管理**: React Hooks
4. **工具層** (`utils/`): 共用工具函式

### 共用層 (src/shared/)

- 前後端共用的型別定義
- 確保型別一致性

## 整合式服務特點

- Fastify 同時處理 API 請求和靜態檔案服務
- 單一 TypeScript 專案，統一建置流程
- 開發時使用 Vite 進行前端熱更新
- 生產環境 Fastify 直接服務建置後的前端檔案

## 模組化原則

- 每個功能模組應獨立且可測試
- 清晰的介面定義，便於擴充
- 遵循單一職責原則
- 前後端共用型別，減少重複定義

## 測試組織

- 測試檔案與源碼檔案對應
- 使用 TDD 方法：先寫測試，再寫實作
- 使用 Vitest 統一測試框架
- 測試覆蓋率目標：80% 以上

## 未來 Electron 轉換

此架構設計便於未來轉換為 Electron 應用：
- `src/server/` 可直接作為 Electron main process
- `src/client/` 可直接作為 renderer process
- 最小化改動即可打包為桌面應用
