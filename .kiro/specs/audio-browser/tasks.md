# Implementation Plan

## 已完成的核心功能

所有核心功能已經完成實作和測試，包括：

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
