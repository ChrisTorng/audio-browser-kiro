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

### 開發模式

1. 啟動開發伺服器：
   ```bash
   npm run dev
   ```
   - Fastify 伺服器會在 port 3000 啟動
   - Vite 開發伺服器會在 port 5173 啟動
   - 前端會自動 proxy API 請求到後端

2. 在瀏覽器開啟 http://localhost:5173

3. 輸入要掃描的音檔資料夾路徑（絕對路徑）

4. 使用鍵盤或滑鼠瀏覽和播放音檔

### 生產模式

1. 建置應用程式：
   ```bash
   npm run build
   ```

2. 啟動生產伺服器：
   ```bash
   npm start
   ```

3. 在瀏覽器開啟 http://localhost:3000

## 支援的音檔格式

- MP3 (.mp3)
- WAV (.wav)
- FLAC (.flac)
- OGG (.ogg)
- M4A (.m4a)
- AAC (.aac)

## 鍵盤快捷鍵

- `↑` / `↓` - 選擇上一個/下一個項目並播放
- `←` / `→` - 收合/展開資料夾（或切換附加音檔）
- `Space` - 播放/停止當前音檔
- `Esc` - 取消編輯描述
- `Enter` - 儲存描述編輯

## 功能說明

### 評分系統

- 點擊星星圖示為音檔評分（0-3 星）
- 評分會立即儲存到資料庫
- 可依星級篩選音檔

### 描述欄位

- 點擊描述欄位進入編輯模式
- 按 Enter 或失焦自動儲存
- 按 Esc 取消編輯

### 篩選功能

- 文字篩選：搜尋檔名、資料夾名稱或描述
- 星級篩選：依評分篩選音檔
- 即時更新顯示結果數量

### 波形圖與頻譜圖

- 自動生成並快取
- 顯示播放進度
- 延遲載入以優化效能

## 跨平台支援

此應用程式支援以下作業系統：

- **Windows**: 完整支援
- **Linux**: 完整支援
- **macOS**: 完整支援

### 注意事項

- 確保 Node.js 版本 >= 18
- 音檔路徑需使用絕對路徑
- 資料庫檔案會自動建立在 `data/` 目錄下
- 波形圖快取會儲存在記憶體中（LRU 快取）

## 測試

```bash
# 執行所有測試
npm test

# 執行測試並監看變更
npm run test:watch

# 執行測試並生成覆蓋率報告
npm run test:coverage
```

測試覆蓋率報告會生成在 `coverage/` 目錄下。

## 開發指南

### 程式碼風格

```bash
# 執行 ESLint 檢查
npm run lint

# 自動修復 ESLint 問題
npm run lint:fix

# 格式化程式碼
npm run format
```

### 專案架構

- **TDD 開發**: 先寫測試，再寫實作
- **模組化設計**: 清晰的分層架構
- **型別安全**: TypeScript 全棧統一
- **效能優化**: 虛擬滾動、快取策略、延遲載入

## 授權

MIT License