# Implementation Plan

## 已完成的核心功能

大部分核心功能已經完成實作和測試，包括：

- ✅ 專案結構和基礎配置
- ✅ 資料模型和資料庫層
- ✅ 伺服器服務層（ConfigService, ScanService, MetadataService, AudioService）
- ✅ Fastify API 路由（音檔樹、音檔串流、Metadata API）
- ✅ 前端核心 Hooks（useAudioPlayer, useWaveform, useSpectrogram, useKeyboardNavigation, useAudioMetadata）
- ✅ 前端服務層（AudioBrowserAPI, WaveformGenerator, SpectrogramGenerator）
- ✅ 前端 UI 元件（AudioBrowser, Header, FilterBar, AudioTree, AudioItem, StarRating, WaveformDisplay, SpectrogramDisplay, DescriptionField, AudioPlayer）
- ✅ 前後端整合流程（初始化、播放、Metadata 同步、篩選搜尋）
- ✅ 效能優化和錯誤處理
- ✅ 測試（單元測試、整合測試）
- ✅ 建置配置和啟動腳本
- ✅ 使用者文件

## 待完成的核心功能優化

根據最新的需求文件，以下功能需要優化或新增：

- [x] 1. 資料夾音檔數量計算優化
  - [x] 1.1 更新 ScanService 以遞迴計算資料夾內所有音檔數量
    - 實作 `countTotalAudioFiles` 方法遞迴計算所有子資料夾內的音檔
    - 在 `DirectoryNode` 介面新增 `totalFileCount` 欄位
    - 更新 API 回應以包含 `totalFileCount` 資訊
    - _Requirements: 2.6_
  
  - [x] 1.2 更新前端顯示資料夾音檔數量
    - 修改 AudioTree 元件以顯示遞迴計算的音檔總數
    - 移除 "files" 文字和括弧，僅顯示數字
    - 確保數量計算包含所有子資料夾，不論是否展開
    - _Requirements: 2.5, 2.6_

- [ ] 2. 鍵盤導航功能增強
  - [x] 2.1 實作左鍵導航邏輯
    - 選中音檔時：收合該音檔所屬的資料夾並選擇該資料夾
    - 選中已展開的資料夾時：收合該資料夾
    - 選中已收合的資料夾時：收合上層資料夾並選擇上層資料夾
    - _Requirements: 4.4, 4.5, 4.6_
  
  - [x] 2.2 實作右鍵導航邏輯
    - 選中資料夾時：展開該資料夾
    - 選中音檔時：無動作
    - _Requirements: 4.7_
  
  - [x] 2.3 實作數字鍵快速評分
    - 按下 1/2/3 鍵直接設定當前選中音檔的星級評分
    - 更新 useKeyboardNavigation Hook 以處理數字鍵事件
    - _Requirements: 6.6_
  
  - [ ] 2.4 實作 Enter 鍵快速編輯描述
    - 按下 Enter 鍵直接進入描述編輯模式
    - 更新 useKeyboardNavigation Hook 以處理 Enter 鍵事件
    - _Requirements: 7.6_
  
  - [ ] 2.5 實作從音檔切換到資料夾時停止播放
    - 當選取項目從音檔移動到資料夾時自動停止播放
    - 更新 useKeyboardNavigation Hook 以處理播放狀態
    - _Requirements: 4.11_

- [ ] 3. UI 顯示優化
  - [ ] 3.1 移除成功載入訊息
    - 確保成功載入時不顯示任何訊息
    - 只在發生錯誤時顯示訊息
    - _Requirements: 2.11_
  
  - [ ] 3.2 實作篩選結果總數顯示
    - 在 FilterBar 顯示被篩選出來的總音檔數量
    - 不包含資料夾數量，僅計算音檔
    - _Requirements: 8.7_
  
  - [ ] 3.3 實作高亮顯示優化
    - 高亮顯示符合篩選條件的文字
    - 確保高亮不改變文字或字母的寬度（使用背景色而非粗體）
    - _Requirements: 8.5, 8.6_
  
  - [ ] 3.4 移除畫面最下方的狀態顯示區塊
    - 移除 Selected/Playing/Progress 顯示區塊
    - 使用高亮背景色表示 Selected 項目
    - 在波形圖和頻譜圖上顯示播放位置標記
    - _Requirements: 10.2_
  
  - [ ] 3.5 縮減項目行高以顯示更多內容
    - 減少資料夾和音檔的行高
    - 最大化可見的音檔數量
    - 保持可讀性和可點擊性
    - _Requirements: 2.8, 2.10, 10.3_
  
  - [ ] 3.6 修復滑鼠懸停時的閃爍問題
    - 檢查並移除不必要的畫面更新機制
    - 優化 hover 狀態的渲染邏輯
    - 確保流暢的使用者體驗
    - _Requirements: 11.6_

- [ ] 4. 播放錯誤處理優化
  - [ ] 4.1 實作 AbortError 處理
    - 正確處理快速切換音檔時的 AbortError
    - 不顯示 AbortError 錯誤訊息
    - 清理被中斷的播放資源
    - _Requirements: 12.1, 12.2, 12.4_
  
  - [ ] 4.2 確保單一音檔播放
    - 確保同一時間只有一個音檔在播放
    - 切換音檔時正確取消前一個播放請求
    - _Requirements: 12.3_

- [ ] 5. 波形圖和頻譜圖顯示
  - [ ] 5.1 確認波形圖和頻譜圖正確顯示
    - 檢查 WaveformDisplay 和 SpectrogramDisplay 元件是否正確整合
    - 確保波形圖和頻譜圖在音檔項目中正確顯示
    - 驗證即時生成功能是否正常運作
    - _Requirements: 2.4, 3.1, 3.2, 3.3, 3.4_
  
  - [ ] 5.2 在波形圖和頻譜圖上顯示播放進度
    - 實作播放位置標記（進度條或垂直線）
    - 同步更新播放進度顯示
    - 確保進度標記清晰可見
    - _Requirements: 3.4, 5.2_

- [ ] 6. 星級評分和描述功能
  - [ ] 6.1 確認星級評分元件正確顯示和互動
    - 檢查 StarRating 元件是否正確整合在音檔項目中
    - 驗證點擊星星可以更新評分
    - 確保評分立即儲存到後端
    - _Requirements: 6.1, 6.2, 6.4, 6.5_
  
  - [ ] 6.2 確認描述欄位正確顯示和編輯
    - 檢查 DescriptionField 元件是否正確整合在音檔項目中
    - 驗證點擊描述可以進入編輯模式
    - 確認 Esc 取消、Enter 或失焦儲存的功能
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

## 未來擴展功能（Phase 1-5）

以下是設計文件中規劃的未來擴展功能，目前尚未實作：

- [ ] 12. Phase 1: 智慧預載與自動生成
  - [ ] 12.1 實作智慧預載機制
    - 當前選取音檔下載完畢後自動播放並同步生成波形圖和頻譜圖
    - 自動預載下一個音檔
    - 持續下載直到螢幕可見範圍內的所有音檔都已下載並生成視覺化
    - _Requirements: 1.3, 1.5, 1.10_

- [ ] 13. Phase 2: 壓縮檔支援
  - [ ] 13.1 實作壓縮檔偵測和解壓縮
    - 偵測特定副檔名的壓縮檔（如 .zip）
    - 自動解壓縮並掃描內部音檔
    - 解壓內容快取到專案子資料夾
    - _Requirements: 1.1, 1.2_
  
  - [ ] 13.2 實作壓縮檔虛擬資料夾顯示
    - 壓縮檔顯示為虛擬資料夾，可展開瀏覽內部音檔
    - 支援壓縮檔內音檔的播放、評分和描述功能
    - _Requirements: 1.2, 1.5, 1.6, 1.7_

- [ ] 14. Phase 3: 附加音檔功能
  - [ ] 14.1 實作附加音檔儲存機制
    - 每個音檔可附加額外的音檔版本
    - 附加音檔儲存於專案子資料夾
    - _Requirements: 1.5_
  
  - [ ] 14.2 實作附加音檔播放控制
    - 顯示附加音檔播放圖示
    - 使用 → 鍵切換到附加音檔播放
    - 使用 ← 鍵切換回原始音檔播放
    - 空白鍵控制播放/停止，重新播放從頭開始
    - 附加音檔不生成波形圖和頻譜圖
    - 播放附加音檔時在圖示上顯示播放狀態
    - _Requirements: 1.4, 1.5_

- [ ] 15. Phase 4: Electron 桌面應用
  - [ ] 15.1 配置 Electron 建置環境
    - 安裝 electron 和 electron-builder
    - 配置 Electron main process（使用現有 server 程式碼）
    - 配置 Electron renderer process（使用現有 client 程式碼）
    - _Requirements: 所有需求_
  
  - [ ] 15.2 實作 Electron 特定功能
    - 原生檔案系統存取
    - 系統托盤整合
    - 自動更新機制
    - 打包為 Windows、Linux、macOS 應用程式
    - _Requirements: 所有需求_

- [ ] 16. Phase 5: 進階功能
  - [ ] 16.1 實作播放清單管理
    - 建立、編輯、刪除播放清單
    - 將音檔加入播放清單
    - 播放清單順序播放
    - _Requirements: 1.5_
  
  - [ ] 16.2 實作音檔標籤系統
    - 為音檔添加自訂標籤
    - 依標籤篩選音檔
    - 標籤管理介面
    - _Requirements: 1.8, 1.9_
  
  - [ ] 16.3 實作匯出/匯入 metadata
    - 匯出 metadata 為 JSON 或 CSV
    - 從檔案匯入 metadata
    - 備份和還原功能
    - _Requirements: 1.6, 1.7_
  
  - [ ] 16.4 實作音檔分析和統計
    - 顯示音檔統計資訊（總數、評分分布等）
    - 音檔時長分析
    - 格式分布統計
    - _Requirements: 1.1, 1.2_
  
  - [ ] 16.5 實作批次操作功能
    - 批次更新評分
    - 批次更新描述
    - 批次刪除 metadata
    - _Requirements: 1.6, 1.7_

## 注意事項

- 核心功能（任務 1-11）已全部完成，系統可正常運作
- 未來擴展功能（任務 12-16）為可選功能，可根據需求逐步實作
- 所有新功能應遵循 TDD 開發流程：先寫測試，再寫實作
- 每個新功能都應更新相關文件和測試
