# 專案結構

## 整體架構

```
audio-browser-kiro/
├── backend/              # Python FastAPI 後端
│   ├── api/             # API 路由
│   ├── models/          # 資料模型
│   ├── services/        # 業務邏輯層
│   ├── utils/           # 工具函式
│   ├── tests/           # 後端測試
│   └── main.py          # 應用程式入口
├── frontend/            # React + TypeScript 前端
│   ├── src/
│   │   ├── components/  # React 元件
│   │   ├── hooks/       # 自訂 Hooks
│   │   ├── services/    # API 呼叫層
│   │   ├── types/       # TypeScript 型別定義
│   │   ├── utils/       # 工具函式
│   │   └── App.tsx      # 主應用程式
│   └── tests/           # 前端測試
├── waveforms/           # 生成的波形圖儲存位置
└── data/                # SQLite 資料庫檔案
```

## 架構分層原則

### 後端分層

1. **API 層** (`api/`): 處理 HTTP 請求與回應
2. **服務層** (`services/`): 業務邏輯實作
3. **模型層** (`models/`): 資料結構定義
4. **工具層** (`utils/`): 共用工具函式

### 前端分層

1. **元件層** (`components/`): UI 元件
2. **服務層** (`services/`): API 通訊
3. **狀態管理**: React Hooks 或狀態管理庫
4. **工具層** (`utils/`): 共用工具函式

## 模組化原則

- 每個功能模組應獨立且可測試
- 清晰的介面定義，便於擴充
- 遵循單一職責原則
- 依賴注入，降低耦合度

## 測試組織

- 測試檔案與源碼檔案對應
- 使用 TDD 方法：先寫測試，再寫實作
- 測試覆蓋率目標：80% 以上
