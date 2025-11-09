# Audio Browser

音頻瀏覽器 - 大量音頻檔案的網頁管理與瀏覽工具

## 功能特色

- 🎵 掃描指定資料夾及子資料夾下的所有音檔
- 📊 自動生成波形圖和頻譜圖視覺化
- ⌨️ 鍵盤快速導航（上下鍵選擇、空白鍵播放/停止）
- 🎧 即時音檔播放與循環播放
- ⭐ 三星評分系統
- 📝 自訂音檔描述
- 🔍 依名稱和星級篩選搜尋

## 技術棧

### 後端
- Python FastAPI
- SQLAlchemy + SQLite
- pytest

### 前端
- React 18 + TypeScript
- Vite
- Web Audio API

## 專案結構

```
audio-browser/
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
│   │   └── utils/       # 工具函式
│   └── tests/           # 前端測試
├── waveforms/           # 生成的波形圖儲存位置
└── data/                # SQLite 資料庫檔案
```

## 開發環境設定

### 後端設定

```bash
cd backend

# 建立虛擬環境（使用 uv）
uv venv

# 啟動虛擬環境
# Linux/Mac:
source .venv/bin/activate
# Windows:
.venv\Scripts\activate

# 安裝依賴
uv pip install -e ".[dev]"

# 執行開發伺服器
uv run uvicorn main:app --reload --port 8000

# 執行測試
uv run pytest

# 執行測試並顯示覆蓋率
uv run pytest --cov
```

### 前端設定

```bash
# 安裝依賴
cd frontend
npm install

# 執行開發伺服器
npm run dev

# 執行測試
npm test

# 建置生產版本
npm run build
```

## 使用方式

1. 啟動後端服務（預設 port 8000）
2. 啟動前端服務（預設 port 3000）
3. 在瀏覽器開啟 http://localhost:3000
4. 輸入要掃描的音檔資料夾路徑
5. 使用鍵盤或滑鼠瀏覽和播放音檔

## 鍵盤快捷鍵

- `↑` / `↓` - 選擇上一個/下一個項目並播放
- `←` / `→` - 收合/展開資料夾（或切換附加音檔）
- `Space` - 播放/停止當前音檔
- `Esc` - 取消編輯描述

## 授權

MIT License