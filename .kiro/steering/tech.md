# 技術棧

## 整合式架構

- **框架**: Node.js + Fastify + TypeScript
- **前端**: React + TypeScript (整合在同一服務)
- **資料庫**: SQLite (本地儲存，使用 better-sqlite3)
- **音頻處理**: Web Audio API / wavesurfer.js
- **測試**: Vitest (前後端統一)
- **建置工具**: Vite
- **未來擴展**: 可轉移到 Electron 桌面應用

## 開發方法

- **TDD (Test-Driven Development)**: 先寫測試，再寫實作
- 所有功能都需要對應的測試
- 前後端整合在單一服務，簡化開發流程

## 常用指令

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

## 資料儲存

- **SQLite**: 僅儲存有星級評分或描述的音檔資料
- **波形圖**: 儲存於專案子資料夾（與原始音檔分離）

## 專案特色

- 單一 Node.js 服務，Fastify 同時處理 API 和靜態檔案
- TypeScript 全棧統一，型別安全
- 跨平台支援 (Windows/Linux/macOS)
- 未來可輕鬆轉換為 Electron 桌面應用
