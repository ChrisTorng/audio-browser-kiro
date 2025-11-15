# Requirements Document

## Introduction

音頻瀏覽器 (Audio Browser) 是一個網頁應用程式，用於管理和瀏覽大量音頻檔案。系統在啟動時自動掃描設定檔指定的資料夾（預設為 "../music-player"），只保留包含音檔的資料夾，並以階層結構顯示。網頁載入時直接取得已掃描的音檔資料，提供波形圖視覺化、鍵盤導航、即時播放、評分標記及搜尋篩選功能。UI 設計以最大化音檔項目顯示為優先，將篩選功能置於標題右側，移除不必要的狀態顯示資訊。

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
- **Configuration File**: 設定檔，指定音檔資料夾路徑
- **Audio Directory**: 包含至少一個音檔的資料夾

## Requirements

### Requirement 1

**User Story:** 作為使用者，我想要系統在啟動時自動掃描設定檔指定的資料夾，以便網頁載入時直接查看音檔集合

#### Acceptance Criteria

1. THE Configuration File SHALL 指定音檔資料夾路徑，預設值為 "../music-player"
2. WHEN THE Application 啟動時，THE Scan Service SHALL 自動掃描設定檔指定的資料夾及所有子資料夾
3. THE Scan Service SHALL 識別所有支援的音頻檔案格式（MP3、WAV、FLAC、OGG、M4A、AAC）
4. THE Scan Service SHALL 只保留包含至少一個音檔的資料夾到階層結構中
5. THE Scan Service SHALL 排除不包含任何音檔的資料夾
6. THE Scan Service SHALL 在 5 秒內完成包含 1000 個檔案的資料夾掃描
7. IF 掃描過程中發生錯誤，THEN THE Audio Browser System SHALL 記錄錯誤並繼續掃描其他檔案

### Requirement 2

**User Story:** 作為使用者，我想要在網頁載入時直接查看已掃描的音檔階層結構，以便快速瀏覽檔案

#### Acceptance Criteria

1. WHEN THE Frontend 載入時，THE Frontend SHALL 從 Backend 取得已掃描完成的音檔資料
2. THE Frontend SHALL 以樹狀結構顯示資料夾和音檔的階層關係
3. THE Frontend SHALL 只顯示包含音檔的資料夾
4. THE Frontend SHALL 在單行高度內依序顯示：星級、音檔名稱、波形圖、頻譜圖、描述
5. THE Frontend SHALL 顯示每個資料夾的名稱和包含的音檔數量（僅顯示數字，不顯示 "files" 文字及括弧）
6. THE Frontend SHALL 遞迴計算資料夾下所有音檔數量（包括子資料夾內的音檔），不論是否展開顯示
7. WHEN 使用者點擊資料夾，THE Frontend SHALL 展開或收合該資料夾的內容
8. THE Frontend SHALL 使用緊湊的 UI 設計以最大化可見的音檔數量
9. THE Frontend SHALL 將篩選功能放置在網站標題右側以節省空間
10. THE Frontend SHALL 縮減資料夾和音檔的行高以顯示更多項目
11. THE Frontend SHALL 只在發生錯誤時顯示訊息，成功載入時不顯示任何訊息

### Requirement 3

**User Story:** 作為使用者，我想要為每個音檔即時生成波形圖和頻譜圖，以便視覺化了解音頻內容

#### Acceptance Criteria

1. WHEN Frontend 下載音檔後，THE Frontend SHALL 即時在瀏覽器中生成波形圖和頻譜圖
2. THE Frontend SHALL 使用 Web Audio API 或相關函式庫處理音頻資料
3. THE Frontend SHALL 在音檔列表中依序顯示波形圖和頻譜圖
4. THE Frontend SHALL 在波形圖和頻譜圖上同步顯示播放進度指示線（獨立的細直條）
5. THE Frontend SHALL 在 3 秒內完成單一音檔的波形圖和頻譜圖生成
6. THE Frontend SHALL 以固定寬度和固定高度顯示頻譜圖，不論音檔長度
7. THE Frontend SHALL 將完整音檔內容縮放至固定的頻譜圖顯示尺寸
8. THE Frontend SHALL 確保波形圖和頻譜圖在音檔列表中正確顯示且不閃爍
9. WHEN 音檔正在播放，THE Frontend SHALL 只更新播放進度指示線，不重新生成整個波形圖或頻譜圖
10. THE Frontend SHALL 在頻譜圖中顯示 20Hz 到 20KHz 的完整頻率範圍
11. THE Frontend SHALL 確保頻譜圖的最底點對應 20Hz，最高點對應 20KHz
12. THE Frontend SHALL 在可顯示高度內完整顯示整個頻率範圍，不截斷或遺漏任何頻率區段
13. THE Frontend SHALL 使用兩個獨立的細直條分別覆蓋在波形圖與頻譜圖上標示播放位置
14. THE Frontend SHALL 確保播放進度指示線清晰可見且位置準確

### Requirement 4

**User Story:** 作為使用者，我想要使用鍵盤快速瀏覽和選擇音檔，以便提高操作效率

#### Acceptance Criteria

1. WHEN 使用者按下向上鍵，THE Frontend SHALL 選擇上一個項目並立即開始播放（若為音檔）
2. WHEN 使用者按下向下鍵，THE Frontend SHALL 選擇下一個項目並立即開始播放（若為音檔）
3. WHEN 使用者按下空白鍵，THE Frontend SHALL 停止當前播放或重新開始播放當前音檔
4. WHEN 當前選中項目為音檔且使用者按下左鍵，THE Frontend SHALL 收合該音檔所屬的資料夾並選擇該資料夾
5. WHEN 當前選中項目為資料夾且使用者按下左鍵，THE Frontend SHALL 收合該資料夾
6. WHEN 當前選中項目為已收合的資料夾且使用者按下左鍵，THE Frontend SHALL 收合該資料夾的上層資料夾並選擇上層資料夾
7. WHEN 當前選中項目為資料夾且使用者按下右鍵，THE Frontend SHALL 展開該資料夾
8. WHEN 使用者按上下鍵移動選取項目超出可見區域，THE Frontend SHALL 自動捲動畫面以顯示當前選取項目
9. WHEN 使用者點擊資料夾項目的任何位置，THE Frontend SHALL 展開或收合該資料夾
10. THE Frontend SHALL 視覺化標示當前選中的項目（使用高亮背景色）
11. THE Frontend SHALL 確保選取項目的背景條高度與項目本身高度完全一致
12. WHEN 當前選取項目從音檔移動到資料夾，THE Frontend SHALL 停止音檔播放
13. WHEN 使用者在描述欄位輸入時按下空白鍵，THE Frontend SHALL 在描述欄位插入空白字元而非觸發播放控制
14. WHEN 使用者在描述欄位輸入時按下方向鍵，THE Frontend SHALL 在描述欄位內移動游標而非切換選取項目
15. WHEN 使用者在描述欄位輸入時按下左鍵，THE Frontend SHALL 在描述欄位內移動游標而非收合資料夾

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
2. WHEN 使用者點擊當前選取音檔項目的星星，THE Frontend SHALL 更新該音檔的評分（1-3 星）並立即儲存
3. WHEN 使用者點擊非當前選取音檔項目的星星，THE Frontend SHALL 選取該音檔項目並開始播放，不更新評分
4. THE Frontend SHALL 不允許使用者直接設定 0 星（0 星僅表示未評分狀態）
5. WHEN 評分被更新，THE Backend SHALL 將評分儲存到 Database 中
6. THE Frontend SHALL 視覺化顯示當前的評分狀態（0 星顯示為空星）
7. WHEN 使用者在選取的音檔項目上按下數字鍵 1/2/3，THE Frontend SHALL 直接設定該音檔的星級評分
8. THE Frontend SHALL 在網頁載入時從 Backend 取得所有音檔的評分和描述資料
9. WHEN 評分或描述被更新，THE Frontend SHALL 在瀏覽器記憶體中更新資料並同步傳送到 Backend 儲存
10. THE Frontend SHALL 不在更新後重新從 Backend 取得評分和描述資料

### Requirement 7

**User Story:** 作為使用者，我想要為音檔添加自訂描述，以便記錄音檔的相關資訊

#### Acceptance Criteria

1. THE Frontend SHALL 為每個音檔提供可點擊的描述欄位
2. WHEN 使用者點擊當前選取音檔項目的描述欄位，THE Frontend SHALL 轉換為輸入框並根據點擊位置設定插入點
3. WHEN 使用者點擊非當前選取音檔項目的描述欄位，THE Frontend SHALL 選取該音檔項目並開始播放，不開始編輯描述
4. WHEN 使用者按下 Esc 鍵，THE Frontend SHALL 取消編輯並恢復原值
5. WHEN 使用者按下 Enter 鍵或輸入焦點離開，THE Frontend SHALL 自動儲存描述到 Backend
6. WHEN 描述被更新，THE Backend SHALL 將描述儲存到 Database 中
7. WHEN 使用者在選取的音檔項目上按下 Enter 鍵，THE Frontend SHALL 直接開始編輯該音檔的描述
8. THE Frontend SHALL 在描述欄位取得輸入焦點時保持焦點狀態，不因畫面更新而失去焦點

### Requirement 8

**User Story:** 作為使用者，我想要篩選音檔名稱、資料夾名稱和描述，以便快速找到特定音檔

#### Acceptance Criteria

1. THE Frontend SHALL 在網站標題右側提供篩選輸入欄位
2. WHEN 使用者輸入文字，THE Frontend SHALL 從所有項目中篩選，包括收合和展開的所有資料夾和音檔
3. THE Frontend SHALL 篩選音檔名稱、資料夾名稱和描述欄位
4. WHEN 篩選文字符合資料夾名稱，THE Frontend SHALL 顯示該資料夾下所有項目（包括子資料夾和音檔）
5. WHEN 篩選文字符合音檔名稱或描述，THE Frontend SHALL 自動展開該音檔所在的所有上層資料夾
6. THE Frontend SHALL 高亮顯示符合篩選條件的文字部分
7. THE Frontend SHALL 確保高亮顯示不會改變文字或字母的寬度
8. THE Frontend SHALL 顯示被篩選出來的總音檔數量（不包含資料夾數量）
9. THE Frontend SHALL 即時更新顯示結果，不超過 100 毫秒延遲
10. THE Frontend SHALL 使用不區分大小寫的子字串比對進行篩選
11. THE Frontend SHALL 確保篩選邏輯能正確符合單字的首字母
12. THE Frontend SHALL 確保篩選邏輯能正確符合單字中間的字母
13. THE Frontend SHALL 確保篩選邏輯能正確符合連續輸入的多個字母
14. THE Frontend SHALL 確保篩選功能對所有階層的資料夾和音檔都能正常運作

### Requirement 9

**User Story:** 作為使用者，我想要依星級篩選音檔，以便只查看特定評分的音檔

#### Acceptance Criteria

1. THE Frontend SHALL 在網站標題右側提供星級篩選選項（全部、未評分、1 星、2 星、3 星）
2. WHEN 使用者選擇星級篩選，THE Frontend SHALL 從所有項目中篩選，包括收合和展開的所有資料夾和音檔
3. WHEN 使用者選擇星級篩選，THE Frontend SHALL 即時更新並只顯示符合該星級的音檔
4. WHEN 星級篩選符合音檔，THE Frontend SHALL 自動展開該音檔所在的所有上層資料夾
5. THE Frontend SHALL 允許同時使用文字篩選和星級篩選
6. THE Frontend SHALL 在 100 毫秒內完成篩選更新

### Requirement 10

**User Story:** 作為使用者，我想要最大化音檔項目的顯示空間，以便在畫面內看到更多音檔

#### Acceptance Criteria

1. THE Frontend SHALL 將篩選功能移至網站標題右側
2. THE Frontend SHALL 移除 Selected/Playing/Progress 等狀態顯示資訊
3. THE Frontend SHALL 將音檔項目內容儘可能加大以填滿畫面
4. THE Frontend SHALL 最小化其他螢幕元素的空間佔用
5. THE Frontend SHALL 優先顯示音檔列表和視覺化內容

### Requirement 11

**User Story:** 作為使用者，我想要系統保持良好的效能，以便流暢地瀏覽大量音檔

#### Acceptance Criteria

1. THE Frontend SHALL 使用虛擬滾動技術處理超過 100 個音檔的列表
2. THE Backend SHALL 在 200 毫秒內回應 API 請求
3. THE Audio Browser System SHALL 支援至少 10000 個音檔的管理
4. THE Frontend SHALL 在載入時顯示載入指示器
5. THE Waveform Generator SHALL 在背景執行，不阻塞使用者操作
6. THE Frontend SHALL 避免不必要的畫面更新以防止滑鼠懸停時的閃爍現象
7. THE Frontend SHALL 優化渲染效能以確保流暢的使用者體驗
8. THE Frontend SHALL 避免在播放音檔時造成波形圖和頻譜圖閃爍
9. THE Frontend SHALL 只在必要時重新渲染音檔項目，避免全部項目同時閃爍
10. THE Frontend SHALL 確保描述欄位在取得輸入焦點後不因畫面更新而失去焦點

### Requirement 12

**User Story:** 作為使用者，我想要系統正確處理音檔播放中斷，以便避免播放錯誤

#### Acceptance Criteria

1. WHEN 使用者快速切換音檔，THE Frontend SHALL 正確取消前一個音檔的播放請求
2. THE Frontend SHALL 處理 AbortError 並避免顯示錯誤訊息
3. THE Frontend SHALL 確保同一時間只有一個音檔在播放
4. WHEN 播放請求被中斷，THE Frontend SHALL 清理相關資源並準備下一次播放
