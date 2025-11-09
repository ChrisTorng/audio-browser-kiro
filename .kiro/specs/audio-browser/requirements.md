# Requirements Document

## Introduction

音頻瀏覽器 (Audio Browser) 是一個網頁應用程式，用於管理和瀏覽大量音頻檔案。系統能夠掃描指定資料夾中的所有音檔，以階層結構顯示，並提供波形圖視覺化、鍵盤導航、即時播放、評分標記及搜尋篩選功能。

## Glossary

- **Audio Browser System**: 整個音頻瀏覽器應用程式，包含前端和後端
- **Audio File**: 音頻檔案，支援常見格式（如 MP3、WAV、FLAC 等）
- **Waveform**: 音頻波形圖，視覺化呈現音頻內容
- **Rating**: 三星評分系統（1-3 星），0 星表示未評分
- **Metadata**: 音檔的附加資訊，包含評分和描述
- **Scan Service**: 掃描資料夾並識別音檔的後端服務
- **Waveform Generator**: 生成音頻波形圖的服務
- **Database**: SQLite 本地資料庫
- **Application**: Node.js + Fastify + TypeScript 整合式應用
- **Frontend**: React + TypeScript 前端（整合在同一服務）

## Requirements

### Requirement 1

**User Story:** 作為使用者，我想要掃描指定資料夾及其子資料夾中的所有音檔，以便查看我的音頻檔案集合

#### Acceptance Criteria

1. WHEN 使用者指定一個資料夾路徑，THE Audio Browser System SHALL 掃描該資料夾及所有子資料夾
2. THE Scan Service SHALL 識別所有支援的音頻檔案格式（MP3、WAV、FLAC、OGG、M4A、AAC）
3. THE Audio Browser System SHALL 保留原始資料夾的階層結構
4. THE Scan Service SHALL 在 5 秒內完成包含 1000 個檔案的資料夾掃描
5. IF 掃描過程中發生錯誤，THEN THE Audio Browser System SHALL 記錄錯誤並繼續掃描其他檔案

### Requirement 2

**User Story:** 作為使用者，我想要在網頁上以階層結構查看所有音檔，以便了解檔案的組織方式

#### Acceptance Criteria

1. THE Frontend SHALL 以樹狀結構顯示資料夾和音檔的階層關係
2. THE Frontend SHALL 在單行高度內依序顯示：星級、音檔名稱、波形圖、頻譜圖、描述
3. THE Frontend SHALL 顯示每個資料夾的名稱和包含的音檔數量
4. WHEN 使用者點擊資料夾，THE Frontend SHALL 展開或收合該資料夾的內容
5. THE Frontend SHALL 使用緊湊的 UI 設計以最大化可見的音檔數量

### Requirement 3

**User Story:** 作為使用者，我想要為每個音檔即時生成波形圖和頻譜圖，以便視覺化了解音頻內容

#### Acceptance Criteria

1. WHEN Frontend 下載音檔後，THE Frontend SHALL 即時在瀏覽器中生成波形圖和頻譜圖
2. THE Frontend SHALL 使用 Web Audio API 或相關函式庫處理音頻資料
3. THE Frontend SHALL 在音檔列表中依序顯示波形圖和頻譜圖
4. THE Frontend SHALL 在波形圖和頻譜圖上同步顯示播放進度條
5. THE Frontend SHALL 在 3 秒內完成單一音檔的波形圖和頻譜圖生成

### Requirement 4

**User Story:** 作為使用者，我想要使用鍵盤快速瀏覽和選擇音檔，以便提高操作效率

#### Acceptance Criteria

1. WHEN 使用者按下向上鍵，THE Frontend SHALL 選擇上一個項目並立即開始播放（若為音檔）
2. WHEN 使用者按下向下鍵，THE Frontend SHALL 選擇下一個項目並立即開始播放（若為音檔）
3. WHEN 使用者按下空白鍵，THE Frontend SHALL 停止當前播放或重新開始播放當前音檔
4. WHEN 當前選中項目為資料夾且使用者按下左鍵，THE Frontend SHALL 收合該資料夾
5. WHEN 當前選中項目為資料夾且使用者按下右鍵，THE Frontend SHALL 展開該資料夾
6. THE Frontend SHALL 視覺化標示當前選中的項目

### Requirement 5

**User Story:** 作為使用者，我想要即時播放選中的音檔，以便快速了解音檔內容

#### Acceptance Criteria

1. WHEN 使用者點擊或選擇音檔，THE Frontend SHALL 立即開始循環播放該音檔
2. THE Frontend SHALL 在波形圖上顯示播放進度
3. WHEN 音檔播放完畢，THE Frontend SHALL 自動重新開始播放
4. WHEN 使用者選擇其他音檔，THE Frontend SHALL 停止當前播放並開始新音檔的循環播放
5. WHEN 使用者按下空白鍵停止播放後再次播放，THE Frontend SHALL 從頭開始播放

### Requirement 6

**User Story:** 作為使用者，我想要為音檔標記三星評分，以便記錄我對音檔的喜好程度

#### Acceptance Criteria

1. THE Frontend SHALL 為每個音檔顯示三星評分介面
2. WHEN 使用者點擊星星，THE Frontend SHALL 更新該音檔的評分（1-3 星）並立即儲存
3. THE Frontend SHALL 不允許使用者直接設定 0 星（0 星僅表示未評分狀態）
4. WHEN 評分被更新，THE Backend SHALL 將評分儲存到 Database 中
5. THE Frontend SHALL 視覺化顯示當前的評分狀態（0 星顯示為空星）

### Requirement 7

**User Story:** 作為使用者，我想要為音檔添加自訂描述，以便記錄音檔的相關資訊

#### Acceptance Criteria

1. THE Frontend SHALL 為每個音檔提供可點擊的描述欄位
2. WHEN 使用者點擊描述欄位，THE Frontend SHALL 轉換為輸入框並根據點擊位置設定插入點
3. WHEN 使用者按下 Esc 鍵，THE Frontend SHALL 取消編輯並恢復原值
4. WHEN 使用者按下 Enter 鍵或輸入焦點離開，THE Frontend SHALL 自動儲存描述到 Backend
5. WHEN 描述被更新，THE Backend SHALL 將描述儲存到 Database 中

### Requirement 8

**User Story:** 作為使用者，我想要篩選音檔名稱、資料夾名稱和描述，以便快速找到特定音檔

#### Acceptance Criteria

1. THE Frontend SHALL 提供篩選輸入欄位
2. WHEN 使用者輸入文字，THE Frontend SHALL 逐字即時過濾顯示的音檔列表
3. THE Frontend SHALL 篩選音檔名稱、資料夾名稱和描述欄位
4. THE Frontend SHALL 高亮顯示符合篩選條件的文字部分
5. THE Frontend SHALL 即時更新顯示結果，不超過 100 毫秒延遲

### Requirement 9

**User Story:** 作為使用者，我想要依星級篩選音檔，以便只查看特定評分的音檔

#### Acceptance Criteria

1. THE Frontend SHALL 提供星級篩選選項（全部、未評分、1 星、2 星、3 星）
2. WHEN 使用者選擇星級篩選，THE Frontend SHALL 即時更新並只顯示符合該星級的音檔
3. THE Frontend SHALL 允許同時使用文字篩選和星級篩選
4. THE Frontend SHALL 顯示當前篩選條件下的音檔數量
5. THE Frontend SHALL 在 100 毫秒內完成篩選更新

### Requirement 10

**User Story:** 作為使用者，我想要系統保持良好的效能，以便流暢地瀏覽大量音檔

#### Acceptance Criteria

1. THE Frontend SHALL 使用虛擬滾動技術處理超過 100 個音檔的列表
2. THE Backend SHALL 在 200 毫秒內回應 API 請求
3. THE Audio Browser System SHALL 支援至少 10000 個音檔的管理
4. THE Frontend SHALL 在載入時顯示載入指示器
5. THE Waveform Generator SHALL 在背景執行，不阻塞使用者操作
