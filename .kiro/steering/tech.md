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

### Git 提交工作流程

**重要：必須嚴格遵循以下流程順序**

#### 步驟 1：接收任務後立即建立 USER_PROMPT.md

當接收到使用者的任務要求時，**第一件事**就是：

- 在專案根目錄建立 `USER_PROMPT.md` 檔案
- 將使用者的**完整原始 prompt 內容**儲存到該檔案中
- **注意**：檔案內容僅包含使用者的原始提示文字，不要加入任何其他文字或說明

#### 步驟 2：執行任務

- 執行所有必要的實作、測試和驗證工作
- 確保所有變更都已完成且通過測試
- `USER_PROMPT.md` 在整個任務執行期間保持存在

#### 步驟 3：任務完成後進行 Git Commit

當所有工作都完成並確認無誤後：

1. 讀取 `USER_PROMPT.md` 的內容（使用者的原始 prompt）
2. **立即刪除 `USER_PROMPT.md` 檔案**（確保不會被加入 commit）
3. 建立 git commit 訊息，格式如下：
   ```
   [使用者原始 prompt 內容]
   
   ---
   
   [此次 commit 的具體異動說明]
   ```
4. 執行 git commit
5. 此時任務才算全部完成

#### Commit 訊息格式說明

- **第一部分**：使用者的完整原始 prompt（從 USER_PROMPT.md 讀取）
- **分隔線**：使用 `---` 分隔兩個部分
- **第二部分**：簡潔描述此次 commit 的具體變更內容（例如：新增了哪些檔案、修改了哪些功能、通過了哪些測試等）

#### 重要提醒

- `USER_PROMPT.md` 是暫時性檔案，用於在任務執行期間保存使用者的原始需求
- 必須在 commit 之前刪除，避免被加入版本控制
- 這個檔案的目的是確保 commit 訊息能準確反映使用者的原始需求

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
