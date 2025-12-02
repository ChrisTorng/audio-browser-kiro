# AI Agent 指引 (AGENTS.md)

本文件彙整了專案開發的關鍵規範與指引，AI Agent 在執行任務時必須嚴格遵守。

## 1. 語言與溝通 (Language & Communication)

- **主要語言**: 繁體中文（台灣用語）。所有對話、文件、說明均使用繁體中文。
- **程式碼語言**: 變數、函式、類別名稱及**程式碼註解 (Comments)** 必須使用**英文**。
- **術語規範**: 優先使用台灣慣用術語（如：伺服器、資料庫、專案、程式碼）。
  - *Server* -> 伺服器
  - *Project* -> 專案
  - *Code* -> 程式碼
  - *Function* -> 函式
- **Commit 訊息**: 標題與內容可使用中文或英文，但必須包含使用者的原始 Prompt（詳見工作流程）。

## 2. 專案架構與技術棧 (Architecture & Tech Stack)

- **架構模式**: 整合式單一服務 (Monolithic Service)。
  - **Backend**: Node.js + Fastify + TypeScript。
  - **Frontend**: React + TypeScript + Vite。
  - **Database**: SQLite (`better-sqlite3`)，僅儲存 Metadata（評分、描述）。
  - **Testing**: Vitest (前後端統一)。
- **目錄結構**:
  - `src/server/`: Fastify 後端 (Routes, Services, Models, DB)。
  - `src/client/`: React 前端 (Components, Hooks, Services)。
  - `src/shared/`: 前後端共用型別 (Types)。
- **設計原則**:
  - 模組化設計，便於未來遷移至 Electron。
  - UI 設計最大化音檔顯示空間。

## 3. 開發流程與規範 (Development Workflow)

### TDD (測試驅動開發)
- **強制執行**: 必須遵循 **Red-Green-Refactor** 流程。
- **先寫測試**: 在實作任何功能前，必須先撰寫失敗的測試案例。
- **測試逾時**: 所有測試必須設定執行時間限制（預設 10s），避免無限等待。

### Git 提交流程 (Git Workflow)
1. **任務開始**: 立即建立 `USER_PROMPT.md`，內容為使用者的**完整原始 Prompt**。
2. **開發與測試**: 執行任務，確保通過測試。
3. **提交 (Commit)**:
   - 讀取 `USER_PROMPT.md` 內容。
   - **刪除** `USER_PROMPT.md`。
   - Commit 訊息格式：
     ```
     [使用者原始 prompt 內容]
     
     ---
     
     [此次 commit 的具體異動說明]
     ```

## 4. 程式碼風格 (Coding Style)

- **註解**: JSDoc/TSDoc 必須使用**英文**。
  ```typescript
  /**
   * Scans the directory for audio files.
   * @param path - The directory path.
   * @returns A list of audio files.
   */
  ```
- **命名**: 清晰、具描述性的英文命名。
- **型別安全**: 嚴格使用 TypeScript 型別，避免 `any`。前後端共用型別應定義在 `src/shared/`。

## 5. 產品核心功能 (Product Core)

- **音檔瀏覽**: 掃描資料夾，以樹狀結構顯示。
- **波形圖**: 自動生成並快取波形圖。
- **鍵盤導航**: 支援全鍵盤操作（上下移動、展開/收合、播放、評分）。
- **效能**: 針對大量檔案進行優化（虛擬滾動、非同步生成）。

請隨時參考 `.kiro/steering/` 下的完整文件以獲取更多細節。
另在 `.kiro/specs/` 目錄下有詳細的需求規格文件，務必在理解相關需求、設計後再進行實作。
