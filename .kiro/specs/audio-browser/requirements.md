# Requirements Document

## Introduction

音頻瀏覽器 (Audio Browser) 是一個網頁應用程式，用於管理和瀏覽大量音頻檔案。系統能夠掃描指定資料夾中的所有音檔，以階層結構顯示，並提供波形圖視覺化、鍵盤導航、即時播放、評分標記及搜尋篩選功能。

## Glossary

- **Audio Browser System**: 整個音頻瀏覽器應用程式，包含前端和後端
- **Audio File**: 音頻檔案，支援常見格式（如 MP3、WAV、FLAC 等）
- **Waveform**: 音頻波形圖，視覺化呈現音頻內容
- **Rating**: 五星評分系統（0-5 星）
- **Metadata**: 音檔的附加資訊，包含評分和描述
- **Scan Service**: 掃描資料夾並識別音檔的後端服務
- **Waveform Generator**: 生成音頻波形圖的服務
- **Database**: SQLite 本地資料庫
- **Frontend**: React + TypeScript 前端應用
- **Backend**: Python FastAPI 後端服務

## Requirements

### Requirement 1

**User Story:** 作為使用者，我想要掃描指定資料夾及其子資料夾中的所有音檔，以便查看我的音頻檔案集合

#### Acceptance Criteria

1. WHEN 使用者指定一個資料夾路徑，THE Audio Browser System SHALL 掃描該資料夾及所有子資料夾
2. THE Scan Service SHALL 識別所有支援的音頻檔案格式（MP3、WAV、FLAC、OGG、M4A）
3. THE Audio Browser System SHALL 保留原始資料夾的階層結構
4. THE Scan Service SHALL 在 5 秒內完成包含 1000 個檔案的資料夾掃描
5. IF 掃描過程中發生錯誤，THEN THE Audio Browser System SHALL 記錄錯誤並繼續掃描其他檔案

### Requirement 2

**User Story:** 作為使用者，我想要在網頁上以階層結構查看所有音檔，以便了解檔案的組織方式

#### Acceptance Criteria

1. THE Frontend SHALL 以樹狀結構顯示資料夾和音檔的階層關係
2. THE Frontend SHALL 顯示每個音檔的檔案名稱
3. THE Frontend SHALL 顯示每個資料夾的名稱和包含的音檔數量
4. WHEN 使用者點擊資料夾，THE Frontend SHALL 展開或收合該資料夾的內容
5. THE Frontend SHALL 使用緊湊的 UI 設計以最大化可見的音檔數量

### Requirement 3

**User Story:** 作為使用者，我想要為每個音檔自動生成波形圖，以便視覺化了解音頻內容

#### Acceptance Criteria

1. WHEN 系統偵測到音檔沒有對應的波形圖，THE Waveform Generator SHALL 自動生成波形圖
2. THE Waveform Generator SHALL 將波形圖儲存在專案的 waveforms 子資料夾中
3. THE Waveform Generator SHALL 使用音檔的相對路徑作為波形圖檔案的命名基礎
4. THE Frontend SHALL 在音檔列表中顯示對應的波形圖
5. THE Waveform Generator SHALL 在 3 秒內完成單一音檔的波形圖生成

### Requirement 4

**User Story:** 作為使用者，我想要使用鍵盤快速瀏覽和選擇音檔，以便提高操作效率

#### Acceptance Criteria

1. WHEN 使用者按下向上鍵，THE Frontend SHALL 選擇上一個音檔
2. WHEN 使用者按下向下鍵，THE Frontend SHALL 選擇下一個音檔
3. WHEN 使用者按下 Enter 鍵，THE Frontend SHALL 播放當前選中的音檔
4. WHEN 使用者按下空白鍵，THE Frontend SHALL 暫停或繼續播放當前音檔
5. THE Frontend SHALL 視覺化標示當前選中的音檔

### Requirement 5

**User Story:** 作為使用者，我想要即時播放選中的音檔，以便快速了解音檔內容

#### Acceptance Criteria

1. WHEN 使用者點擊或選擇音檔，THE Frontend SHALL 立即開始播放該音檔
2. THE Frontend SHALL 顯示播放進度條
3. THE Frontend SHALL 顯示當前播放時間和總時長
4. THE Frontend SHALL 提供播放、暫停和停止控制按鈕
5. WHEN 音檔播放完畢，THE Frontend SHALL 自動停止播放

### Requirement 6

**User Story:** 作為使用者，我想要為音檔標記五星評分，以便記錄我對音檔的喜好程度

#### Acceptance Criteria

1. THE Frontend SHALL 為每個音檔顯示五星評分介面
2. WHEN 使用者點擊星星，THE Frontend SHALL 更新該音檔的評分（0-5 星）
3. WHEN 評分被更新，THE Backend SHALL 將評分儲存到 Database 中
4. THE Frontend SHALL 視覺化顯示當前的評分狀態
5. THE Database SHALL 只儲存有評分的音檔記錄

### Requirement 7

**User Story:** 作為使用者，我想要為音檔添加自訂描述，以便記錄音檔的相關資訊

#### Acceptance Criteria

1. THE Frontend SHALL 為每個音檔提供描述輸入欄位
2. WHEN 使用者輸入描述，THE Frontend SHALL 在 1 秒延遲後自動儲存
3. WHEN 描述被更新，THE Backend SHALL 將描述儲存到 Database 中
4. THE Frontend SHALL 顯示現有的描述內容
5. THE Database SHALL 只儲存有描述的音檔記錄

### Requirement 8

**User Story:** 作為使用者，我想要搜尋音檔名稱、資料夾名稱和描述，以便快速找到特定音檔

#### Acceptance Criteria

1. THE Frontend SHALL 提供搜尋輸入欄位
2. WHEN 使用者輸入搜尋關鍵字，THE Frontend SHALL 即時過濾顯示的音檔列表
3. THE Audio Browser System SHALL 搜尋音檔名稱、資料夾名稱和描述欄位
4. THE Frontend SHALL 高亮顯示符合搜尋條件的文字
5. THE Frontend SHALL 在 500 毫秒內完成包含 1000 個音檔的搜尋

### Requirement 9

**User Story:** 作為使用者，我想要依星級篩選音檔，以便只查看特定評分的音檔

#### Acceptance Criteria

1. THE Frontend SHALL 提供星級篩選選項（全部、1 星、2 星、3 星、4 星、5 星）
2. WHEN 使用者選擇星級篩選，THE Frontend SHALL 只顯示符合該星級的音檔
3. THE Frontend SHALL 允許選擇「未評分」選項以顯示沒有評分的音檔
4. THE Frontend SHALL 允許同時使用搜尋和星級篩選
5. THE Frontend SHALL 顯示當前篩選條件下的音檔數量

### Requirement 10

**User Story:** 作為使用者，我想要系統保持良好的效能，以便流暢地瀏覽大量音檔

#### Acceptance Criteria

1. THE Frontend SHALL 使用虛擬滾動技術處理超過 100 個音檔的列表
2. THE Backend SHALL 在 200 毫秒內回應 API 請求
3. THE Audio Browser System SHALL 支援至少 10000 個音檔的管理
4. THE Frontend SHALL 在載入時顯示載入指示器
5. THE Waveform Generator SHALL 在背景執行，不阻塞使用者操作
