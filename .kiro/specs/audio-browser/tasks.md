# Implementation Plan

- [ ] 1. 建立專案結構和基礎配置
  - 建立 backend 和 frontend 資料夾結構
  - 設定 Python 虛擬環境和依賴 (FastAPI, SQLAlchemy, pytest)
  - 設定 React + TypeScript 專案 (Vite)
  - 配置 ESLint, Prettier 和 TypeScript
  - 建立 .gitignore 和基本 README
  - _Requirements: 所有需求的基礎_

- [ ] 2. 實作後端資料模型和資料庫
  - [ ] 2.1 建立 SQLite 資料庫 schema
    - 定義 AudioMetadata 模型 (file_path, rating, description, timestamps)
    - 建立索引 (file_path, rating)
    - 實作資料庫初始化腳本
    - _Requirements: 1.6, 1.7_
  
  - [ ] 2.2 實作 AudioMetadata ORM 模型
    - 使用 SQLAlchemy 定義模型類別
    - 實作資料驗證 (rating 0-3, description 長度限制)
    - _Requirements: 1.6, 1.7_
  
  - [ ] 2.3 實作 DirectoryTree 資料結構
    - 定義 AudioFile 和 DirectoryNode dataclass
    - 實作序列化方法
    - _Requirements: 1.1, 1.2_

- [ ] 3. 實作後端服務層
  - [ ] 3.1 實作 ScanService
    - 實作 scan_directory 方法掃描資料夾
    - 實作檔案格式過濾 (MP3, WAV, FLAC, OGG, M4A)
    - 實作遞迴建立目錄樹
    - 實作錯誤處理和日誌記錄
    - _Requirements: 1.1_
  
  - [ ] 3.2 實作 MetadataService
    - 實作 get_metadata 和 get_all_metadata 方法
    - 實作 update_metadata 方法 (upsert 邏輯)
    - 實作 delete_metadata 方法
    - 實作資料驗證
    - _Requirements: 1.6, 1.7_
  
  - [ ] 3.3 實作 AudioService
    - 實作 stream_audio 方法支援音檔串流
    - 實作路徑驗證防止路徑遍歷攻擊
    - 實作 Range requests 支援
    - _Requirements: 1.5_

- [ ] 4. 實作後端 API 路由
  - [ ] 4.1 實作掃描 API
    - POST /api/scan 接收資料夾路徑並返回目錄樹
    - 實作請求驗證
    - 實作錯誤回應格式
    - _Requirements: 1.1, 1.2_
  
  - [ ] 4.2 實作音檔串流 API
    - GET /api/audio/{file_path} 串流音檔
    - 實作 Content-Type 和 Content-Length headers
    - 實作 Range requests 支援
    - _Requirements: 1.5_
  
  - [ ] 4.3 實作 Metadata API
    - GET /api/metadata 取得所有 metadata
    - POST /api/metadata 更新 metadata
    - DELETE /api/metadata/{file_path} 刪除 metadata
    - _Requirements: 1.6, 1.7_
  
  - [ ] 4.4 設定 CORS 和中介軟體
    - 配置 CORS 允許前端存取
    - 實作錯誤處理中介軟體
    - 實作請求日誌中介軟體
    - _Requirements: 所有需求_

- [ ] 5. 實作前端核心 Hooks
  - [ ] 5.1 實作 useAudioPlayer Hook
    - 實作 play, stop, toggle 方法
    - 實作循環播放邏輯
    - 實作播放進度追蹤 (progress, currentTime, duration)
    - 實作播放狀態管理
    - _Requirements: 1.5_
  
  - [ ] 5.2 實作 useWaveform Hook
    - 實作從 AudioBuffer 生成波形資料
    - 實作載入狀態和錯誤處理
    - 實作波形資料快取
    - _Requirements: 1.3_
  
  - [ ] 5.3 實作 useSpectrogram Hook
    - 實作從 AudioBuffer 生成頻譜資料
    - 使用 FFT 分析音頻頻率
    - 實作載入狀態和錯誤處理
    - 實作頻譜資料快取
    - _Requirements: 1.3_
  
  - [ ] 5.4 實作 useKeyboardNavigation Hook
    - 實作上下鍵選擇項目
    - 實作左右鍵展開/收合資料夾
    - 實作空白鍵播放/停止控制
    - 實作選擇索引管理
    - _Requirements: 1.4_
  
  - [ ] 5.5 實作 useAudioMetadata Hook
    - 實作 metadata 狀態管理
    - 實作 updateRating 和 updateDescription 方法
    - 實作 API 呼叫和錯誤處理
    - _Requirements: 1.6, 1.7_

- [ ] 6. 實作前端服務層
  - [ ] 6.1 實作 AudioBrowserAPI 類別
    - 實作 scanDirectory 方法
    - 實作 getAudioFile 方法
    - 實作 getAllMetadata 方法
    - 實作 updateMetadata 和 deleteMetadata 方法
    - 實作錯誤處理和重試邏輯
    - _Requirements: 1.1, 1.5, 1.6, 1.7_
  
  - [ ] 6.2 實作 WaveformGenerator 類別
    - 實作從 AudioBuffer 生成波形
    - 實作從 Blob 生成波形
    - 實作波形資料降採樣以符合顯示寬度
    - _Requirements: 1.3_
  
  - [ ] 6.3 實作 SpectrogramGenerator 類別
    - 實作從 AudioBuffer 生成頻譜圖
    - 實作 FFT 分析
    - 實作頻譜資料正規化和色彩映射
    - _Requirements: 1.3_

- [ ] 7. 實作前端 UI 元件
  - [ ] 7.1 實作 AudioBrowser 主元件
    - 實作全域狀態管理 (音檔樹、篩選條件、當前選擇)
    - 實作鍵盤事件監聽
    - 整合所有子元件
    - _Requirements: 所有需求_
  
  - [ ] 7.2 實作 FilterBar 元件
    - 實作文字篩選輸入框
    - 實作星級篩選下拉選單
    - 實作篩選結果數量顯示
    - 實作即時篩選邏輯 (debounce 100ms)
    - _Requirements: 1.8, 1.9_
  
  - [ ] 7.3 實作 AudioTree 元件
    - 實作樹狀結構顯示
    - 實作虛擬滾動 (使用 react-window 或 react-virtual)
    - 實作展開/收合狀態管理
    - 實作篩選和高亮顯示
    - _Requirements: 1.2, 1.8, 1.10_
  
  - [ ] 7.4 實作 AudioItem 元件
    - 實作單行佈局：星級/檔名/波形圖/頻譜圖/描述
    - 實作選擇狀態視覺化
    - 整合 StarRating, WaveformDisplay, SpectrogramDisplay, DescriptionField
    - _Requirements: 1.2, 1.3, 1.6, 1.7_
  
  - [ ] 7.5 實作 StarRating 元件
    - 實作三星評分 UI (0-3 星)
    - 實作點擊互動更新評分
    - 實作立即儲存邏輯
    - 實作視覺化顯示當前評分
    - _Requirements: 1.6_
  
  - [ ] 7.6 實作 WaveformDisplay 元件
    - 實作波形圖繪製 (Canvas)
    - 實作播放進度條覆蓋層
    - 實作載入和錯誤狀態顯示
    - _Requirements: 1.3, 1.5_
  
  - [ ] 7.7 實作 SpectrogramDisplay 元件
    - 實作頻譜圖繪製 (Canvas)
    - 實作播放進度條覆蓋層
    - 實作色彩映射 (頻率強度視覺化)
    - 實作載入和錯誤狀態顯示
    - _Requirements: 1.3, 1.5_
  
  - [ ] 7.8 實作 DescriptionField 元件
    - 實作可點擊的描述欄位
    - 實作編輯模式切換和插入點設定
    - 實作 Esc 取消編輯
    - 實作 Enter 或失焦自動儲存
    - _Requirements: 1.7_
  
  - [ ] 7.9 實作 AudioPlayer 元件
    - 實作音頻播放控制邏輯 (無 UI)
    - 實作循環播放
    - 實作播放狀態和進度管理
    - 整合 useAudioPlayer Hook
    - _Requirements: 1.5_

- [ ] 8. 整合前後端並實作完整流程
  - [ ] 8.1 實作資料夾掃描流程
    - 前端發送掃描請求
    - 後端掃描並返回目錄樹
    - 前端顯示樹狀結構
    - _Requirements: 1.1, 1.2_
  
  - [ ] 8.2 實作音檔播放流程
    - 前端下載音檔
    - 生成波形圖和頻譜圖
    - 開始播放並顯示進度
    - _Requirements: 1.3, 1.5_
  
  - [ ] 8.3 實作 Metadata 同步流程
    - 前端載入所有 metadata
    - 更新評分或描述時同步到後端
    - 實作樂觀更新和錯誤回滾
    - _Requirements: 1.6, 1.7_
  
  - [ ] 8.4 實作篩選和搜尋流程
    - 整合文字篩選和星級篩選
    - 實作高亮顯示符合條件的文字
    - 實作即時更新顯示
    - _Requirements: 1.8, 1.9_

- [ ] 9. 效能優化和錯誤處理
  - [ ] 9.1 實作前端效能優化
    - 實作波形圖和頻譜圖快取 (LRU)
    - 實作延遲載入和按需生成
    - 優化虛擬滾動效能
    - _Requirements: 1.10_
  
  - [ ] 9.2 實作錯誤處理和使用者回饋
    - 實作錯誤訊息 toast 通知
    - 實作載入指示器
    - 實作重試機制
    - 實作錯誤邊界元件
    - _Requirements: 所有需求_
  
  - [ ] 9.3 實作後端效能優化
    - 實作非同步檔案掃描
    - 優化資料庫查詢
    - 實作適當的快取策略
    - _Requirements: 1.10_

- [ ] 10. 撰寫測試
  - [ ]* 10.1 撰寫後端單元測試
    - 測試 ScanService 掃描邏輯
    - 測試 MetadataService CRUD 操作
    - 測試 AudioService 串流邏輯
    - 測試資料模型驗證
    - _Requirements: 所有後端需求_
  
  - [ ]* 10.2 撰寫後端整合測試
    - 測試 API 路由完整流程
    - 測試資料庫操作
    - 測試錯誤處理
    - _Requirements: 所有後端需求_
  
  - [ ]* 10.3 撰寫前端單元測試
    - 測試 Hooks 邏輯
    - 測試 UI 元件渲染和互動
    - 測試服務層 API 呼叫 (使用 mock)
    - _Requirements: 所有前端需求_
  
  - [ ]* 10.4 撰寫前端整合測試
    - 測試完整使用者流程
    - 測試鍵盤導航
    - 測試音頻播放邏輯
    - _Requirements: 所有前端需求_

- [ ] 11. 文件和部署準備
  - [ ] 11.1 撰寫使用者文件
    - 撰寫 README 使用說明
    - 記錄鍵盤快捷鍵
    - 記錄支援的音檔格式
    - _Requirements: 所有需求_
  
  - [ ] 11.2 撰寫開發者文件
    - 記錄 API 端點
    - 記錄資料模型
    - 記錄架構設計
    - _Requirements: 所有需求_
  
  - [ ] 11.3 準備部署配置
    - 建立 requirements.txt 和 package.json
    - 撰寫啟動腳本
    - 配置生產環境設定
    - _Requirements: 所有需求_
