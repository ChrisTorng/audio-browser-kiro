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

- **整合式架構**: Node.js + Fastify + TypeScript
- **前端**: React 18 + TypeScript
- **資料庫**: SQLite (better-sqlite3)
- **音頻處理**: Web Audio API / wavesurfer.js
- **測試**: Vitest
- **建置工具**: Vite
- **未來擴展**: 可轉移到 Electron 桌面應用

## 專案結構

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

## 開發環境設定

```bash
# 安裝依賴
npm install

# 執行開發伺服器（前後端整合）
npm run dev

# 執行測試
npm test

# 執行測試並顯示覆蓋率
npm run test:coverage

# 建置生產版本
npm run build

# 執行生產版本
npm start
```

## 使用方式

1. 啟動整合服務（預設 port 3000）
2. 在瀏覽器開啟 http://localhost:3000
3. 輸入要掃描的音檔資料夾路徑
4. 使用鍵盤或滑鼠瀏覽和播放音檔

## 鍵盤快捷鍵

- `↑` / `↓` - 選擇上一個/下一個項目並播放
- `←` / `→` - 收合/展開資料夾（或切換附加音檔）
- `Space` - 播放/停止當前音檔
- `Esc` - 取消編輯描述

## 授權

MIT License