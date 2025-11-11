# Design Document

## Overview

音頻瀏覽器採用整合式架構，使用 Node.js + Fastify + TypeScript 建構單一服務，同時處理 API 和前端靜態檔案。前端使用 React + TypeScript 實現互動式使用者介面。系統在啟動時自動掃描設定檔指定的音檔資料夾（預設 "../music-player"），只保留包含音檔的資料夾，並快取掃描結果供前端使用。設計重點在於高效能的音檔管理、即時波形圖生成、流暢的鍵盤導航體驗、最大化音檔項目顯示的 UI 設計，以及未來可輕鬆轉換為 Electron 桌面應用的架構。

## Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Fastify Server (Node.js)                   │
│                                                               │
│  ┌────────────────────────────────────────────────────┐     │
│  │              Static File Serving                    │     │
│  │           (React Build / Vite Dev Proxy)            │     │
│  └────────────────────────────────────────────────────┘     │
│                            │                                 │
│  ┌────────────────────────────────────────────────────┐     │
│  │                  API Routes                         │     │
│  │  /api/scan  /api/audio  /api/metadata              │     │
│  └────────────────────────────────────────────────────┘     │
│                            │                                 │
│  ┌────────────────────────────────────────────────────┐     │
│  │                 Service Layer                       │     │
│  │  ScanService  MetadataService  AudioService         │     │
│  └────────────────────────────────────────────────────┘     │
│                            │                                 │
│  ┌────────────────────────────────────────────────────┐     │
│  │              Database Layer (better-sqlite3)        │     │
│  │                   SQLite Database                   │     │
│  └────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP (Same Origin)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   UI Layer   │  │  Audio       │  │  Waveform    │     │
│  │  Components  │  │  Player      │  │  Generator   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│  ┌──────────────────────────────────────────────────┐     │
│  │           State Management (React Hooks)          │     │
│  └──────────────────────────────────────────────────┘     │
│  ┌──────────────────────────────────────────────────┐     │
│  │              API Service Layer                    │     │
│  └──────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

**整合式服務:**
- Node.js: 執行環境
- Fastify: Web 框架（API + 靜態檔案服務）
- TypeScript: 全棧型別安全
- better-sqlite3: SQLite 資料庫驅動
- Vitest: 測試框架（前後端統一）

**Frontend:**
- React 18: UI 框架
- TypeScript: 型別安全
- Vite: 建置工具和開發伺服器
- Web Audio API: 音頻處理和波形圖生成
- Wavesurfer.js 或自訂實作: 波形圖視覺化

**未來擴展:**
- 架構設計便於轉換為 Electron 桌面應用
- Server 程式碼可直接作為 Electron main process
- React 前端可直接作為 renderer process

## Application Startup Flow

### Backend Initialization Sequence

1. **載入設定檔**
   - 讀取 `config.json`
   - 如果設定檔不存在，拋出錯誤並終止啟動
   - 驗證設定檔格式和必要欄位

2. **初始化資料庫**
   - 建立或開啟 SQLite 資料庫
   - 執行 schema 初始化

3. **掃描音檔資料夾**
   - 掃描設定檔指定的資料夾
   - 建立完整的目錄樹結構
   - 過濾掉不含音檔的資料夾
   - 快取結果於記憶體中

4. **啟動 Fastify 伺服器**
   - 註冊路由
   - 開始監聽請求

### Frontend Initialization Sequence

1. **載入應用程式**
   - React 應用初始化

2. **取得音檔樹**
   - 呼叫 `GET /api/tree` 取得已掃描的目錄結構

3. **載入 Metadata**
   - 呼叫 `GET /api/metadata` 取得所有評分和描述

4. **渲染 UI**
   - 顯示音檔樹狀結構
   - 準備好接受使用者互動

## Components and Interfaces

### Backend Components

#### 1. API Layer (`src/server/routes/`)

**`audioRoutes.ts`**
- `GET /api/tree`: 取得已掃描的音檔樹狀結構（啟動時已完成掃描）
- `GET /api/audio/*`: 串流音檔內容（支援 Range requests）
- `GET /api/metadata`: 取得所有已儲存的 metadata
- `POST /api/metadata`: 更新音檔的評分或描述
- `DELETE /api/metadata/:filePath`: 刪除音檔的 metadata

#### 2. Service Layer (`src/server/services/`)

**`configService.ts`**
```typescript
class ConfigService {
  getAudioDirectory(): string;
  loadConfig(): Config;  // 如果 config.json 不存在則拋出錯誤
}

interface Config {
  audioDirectory: string;
}
```

**`scanService.ts`**
```typescript
class ScanService {
  private cachedTree: DirectoryTree | null;
  
  async initialize(): Promise<void>;  // 啟動時呼叫，掃描並快取結果
  getTree(): DirectoryTree;  // 返回快取的樹狀結構
  getSupportedFormats(): string[];
  private async scanDirectory(rootPath: string): Promise<DirectoryTree>;
  private async buildTree(path: string): Promise<DirectoryNode>;
  private hasAudioFiles(node: DirectoryNode): boolean;  // 檢查是否包含音檔
  private countTotalAudioFiles(node: DirectoryNode): number;  // 遞迴計算所有音檔數量
}
```

**`metadataService.ts`**
```typescript
class MetadataService {
  getMetadata(filePath: string): AudioMetadata | null;
  getAllMetadata(): Record<string, AudioMetadata>;
  updateMetadata(filePath: string, rating: number, description: string): AudioMetadata;
  deleteMetadata(filePath: string): boolean;
}
```

**`audioService.ts`**
```typescript
class AudioService {
  async streamAudio(filePath: string, range?: string): Promise<ReadStream>;
  validateAudioFile(filePath: string): boolean;
  getAudioMimeType(filePath: string): string;
}
```

#### 3. Models (`src/server/models/`)

**`audioMetadata.ts`**
```typescript
interface AudioMetadata {
  id: number;
  filePath: string;  // Unique, 相對路徑
  rating: number;    // 0-3 (0=未評分, 1-3=評分)
  description: string;
  createdAt: Date;
  updatedAt: Date;
}
```

**`directoryTree.ts`**
```typescript
interface AudioFile {
  name: string;
  path: string;  // 相對路徑
  size: number;
}

interface DirectoryNode {
  name: string;
  path: string;
  files: AudioFile[];
  subdirectories: DirectoryNode[];
  totalFileCount: number;  // 遞迴計算的總音檔數量（包括所有子資料夾）
}

type DirectoryTree = DirectoryNode;
```

#### 4. Database Layer (`src/server/db/`)

**`database.ts`**
```typescript
class Database {
  private db: BetterSQLite3.Database;
  
  initialize(): void;
  getMetadata(filePath: string): AudioMetadata | null;
  getAllMetadata(): AudioMetadata[];
  upsertMetadata(data: Omit<AudioMetadata, 'id' | 'createdAt' | 'updatedAt'>): AudioMetadata;
  deleteMetadata(filePath: string): boolean;
}
```

### Frontend Components

#### UI Layout Design

整體佈局採用最大化內容顯示的設計原則：

```
┌─────────────────────────────────────────────────────────┐
│ Header: 網站標題              [篩選] [星級篩選]        │ ← 緊湊的標題列
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─ 資料夾 1 (5 files)                                 │
│  │  ├─ ⭐⭐⭐ song1.mp3  [波形圖] [頻譜圖] 描述...      │
│  │  └─ ☆☆☆ song2.mp3  [波形圖] [頻譜圖] 描述...      │
│  │                                                      │
│  ┌─ 資料夾 2 (3 files)                                 │
│  │  ├─ ⭐☆☆ track1.mp3 [波形圖] [頻譜圖] 描述...      │
│  │  ...                                                 │
│                                                         │
│                                                         │ ← 主要內容區域
│                                                         │   佔據絕大部分空間
│                                                         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

移除的元素：
- Selected 狀態顯示（改用項目背景色）
- Playing 狀態顯示（改用波形圖上的進度條）
- Progress 資訊顯示（整合在波形圖中）
- 獨立的篩選區塊（移至標題右側）

#### 1. Core Components (`frontend/src/components/`)

**`AudioBrowser.tsx`**
- 主要容器元件
- 管理全域狀態（音檔樹、篩選條件、當前選擇）
- 處理鍵盤事件
- 包含標題列和篩選功能

**`Header.tsx`**
- 網站標題
- 整合 FilterBar 於右側
- 緊湊設計以節省空間

**`FilterBar.tsx`**
- 文字篩選輸入框
- 星級篩選下拉選單
- 位於標題右側
- 顯示被篩選出來的總音檔數量（不包含資料夾數量）
- 高亮顯示符合篩選條件的文字（不改變文字寬度）

**`AudioTree.tsx`**
- 顯示音檔樹狀結構
- 虛擬滾動實作（處理大量項目）
- 管理展開/收合狀態
- 佔據主要畫面空間
- 顯示資料夾的總音檔數量（遞迴計算，不含 "files" 文字和括弧）
- 自動捲動以保持選中項目可見

**`AudioItem.tsx`**
- 單一音檔項目（單行顯示）
- 包含：星級、檔名、波形圖、頻譜圖、描述
- 處理選擇狀態視覺化（簡單的背景色或邊框）
- 不顯示額外的播放狀態資訊

**`StarRating.tsx`**
- 三星評分元件
- 可點擊互動
- 立即儲存評分

**`WaveformDisplay.tsx`**
- 波形圖顯示
- 整合播放進度條
- 使用 Canvas 或 SVG 繪製
- 即時在瀏覽器中生成（使用 Web Audio API）

**`SpectrogramDisplay.tsx`**
- 頻譜圖顯示
- 同步顯示播放進度條
- 使用 Canvas 繪製
- 即時在瀏覽器中生成（使用 Web Audio API）

**`DescriptionField.tsx`**
- 可編輯描述欄位
- 點擊進入編輯模式
- Esc 取消，Enter 或失焦儲存

**`AudioPlayer.tsx`**
- 音頻播放控制（無 UI）
- 循環播放邏輯
- 播放狀態管理
- 處理播放中斷和 AbortError
- 確保同一時間只有一個音檔播放

#### 2. Hooks (`frontend/src/hooks/`)

**`useAudioPlayer.ts`**
```typescript
interface UseAudioPlayerReturn {
  play: (audioUrl: string) => void;
  stop: () => void;
  toggle: () => void;
  isPlaying: boolean;
  progress: number;  // 0-1
  currentTime: number;
  duration: number;
}
```

**`useWaveform.ts`**
```typescript
interface UseWaveformReturn {
  waveformData: number[];  // 波形資料點
  isLoading: boolean;
  error: Error | null;
  generateWaveform: (audioBuffer: AudioBuffer) => void;
}
```

**`useSpectrogram.ts`**
```typescript
interface UseSpectrogramReturn {
  spectrogramData: number[][];  // 頻譜資料（2D 陣列）
  isLoading: boolean;
  error: Error | null;
  generateSpectrogram: (audioBuffer: AudioBuffer) => void;
}
```

**`useKeyboardNavigation.ts`**
```typescript
interface UseKeyboardNavigationReturn {
  selectedIndex: number;
  handleKeyDown: (event: KeyboardEvent) => void;
  selectNext: () => void;
  selectPrevious: () => void;
  collapseCurrentFolder: () => void;  // 收合當前資料夾
  expandCurrentFolder: () => void;    // 展開當前資料夾
  collapseParentFolder: () => void;   // 收合上層資料夾
  handleNumberKey: (rating: number) => void;  // 處理數字鍵 1/2/3 設定評分
  handleEnterKey: () => void;  // 處理 Enter 鍵進入描述編輯
}
```

**`useAudioMetadata.ts`**
```typescript
interface UseAudioMetadataReturn {
  metadata: Map<string, AudioMetadata>;
  updateRating: (filePath: string, rating: number) => Promise<void>;
  updateDescription: (filePath: string, description: string) => Promise<void>;
  isLoading: boolean;
}
```

#### 3. Services (`src/client/services/`)

**`api.ts`**
```typescript
class AudioBrowserAPI {
  async getTree(): Promise<DirectoryTree>;  // 取得已掃描的樹狀結構
  async getAudioFile(filePath: string): Promise<Blob>;
  async getAllMetadata(): Promise<Record<string, AudioMetadata>>;
  async updateMetadata(filePath: string, data: MetadataUpdate): Promise<AudioMetadata>;
  async deleteMetadata(filePath: string): Promise<void>;
}
```

**`waveformGenerator.ts`**
```typescript
class WaveformGenerator {
  async generateFromAudioBuffer(audioBuffer: AudioBuffer, width: number): Promise<number[]>;
  async generateFromBlob(audioBlob: Blob, width: number): Promise<number[]>;
}
```

**`spectrogramGenerator.ts`**
```typescript
class SpectrogramGenerator {
  async generateFromAudioBuffer(audioBuffer: AudioBuffer, width: number, height: number): Promise<number[][]>;
  async generateFromBlob(audioBlob: Blob, width: number, height: number): Promise<number[][]>;
}
```

## Data Models

### Configuration File

**`config.json`** (必須位於專案根目錄)
```json
{
  "audioDirectory": "../music-player"
}
```

此設定檔為必要檔案，如果不存在，應用程式將無法啟動並顯示錯誤訊息。預設內容中 `audioDirectory` 設定為 "../music-player"。

**設計決策**: 使用簡單的 JSON 設定檔而非環境變數，因為這是桌面應用的使用情境，使用者可以直接編輯設定檔來指定音檔資料夾路徑。

### Database Schema

```sql
CREATE TABLE audio_metadata (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_path TEXT UNIQUE NOT NULL,
    rating INTEGER DEFAULT 0 CHECK(rating >= 0 AND rating <= 3),
    description TEXT DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_file_path ON audio_metadata(file_path);
CREATE INDEX idx_rating ON audio_metadata(rating);
```

### API Data Transfer Objects

**DirectoryTree Response (GET /api/tree)**
```json
{
  "name": "root",
  "path": "/music",
  "files": [
    {
      "name": "song.mp3",
      "path": "/music/song.mp3",
      "size": 5242880
    }
  ],
  "subdirectories": [
    {
      "name": "album1",
      "path": "/music/album1",
      "files": [
        {
          "name": "track.mp3",
          "path": "/music/album1/track.mp3",
          "size": 3145728
        }
      ],
      "subdirectories": [],
      "totalFileCount": 1
    }
  ],
  "totalFileCount": 2
}
```

注意：
- 只包含有音檔的資料夾。空資料夾（不含音檔）會被過濾掉。
- `totalFileCount` 欄位遞迴計算該資料夾及所有子資料夾內的音檔總數。

**Metadata Response**
```json
{
  "/music/song.mp3": {
    "rating": 3,
    "description": "Great track",
    "updated_at": "2025-01-15T10:30:00Z"
  }
}
```

**Metadata Update Request**
```json
{
  "file_path": "/music/song.mp3",
  "rating": 2,
  "description": "Nice melody"
}
```

## Error Handling

### Backend Error Handling

1. **設定檔錯誤**
   - config.json 不存在：終止啟動並顯示錯誤訊息
   - config.json 格式錯誤：終止啟動並顯示錯誤訊息
   - audioDirectory 欄位缺失：終止啟動並顯示錯誤訊息

2. **檔案系統錯誤**
   - 音檔資料夾不存在：終止啟動並顯示錯誤訊息
   - 權限不足：記錄警告並繼續
   - 檔案讀取失敗：記錄錯誤並繼續處理其他檔案

3. **資料庫錯誤**
   - 連線失敗：返回 500 並記錄錯誤
   - 資料驗證失敗：返回 400 並提供詳細訊息
   - 唯一性衝突：使用 upsert 邏輯

4. **API 錯誤回應格式**
```json
{
  "error": {
    "code": "SCAN_FAILED",
    "message": "Failed to scan directory",
    "details": "Permission denied: /protected/folder"
  }
}
```

### Frontend Error Handling

1. **網路錯誤**
   - 顯示錯誤訊息 toast
   - 提供重試機制
   - 離線狀態提示

2. **音頻載入錯誤**
   - 顯示錯誤圖示取代波形圖
   - 記錄錯誤但不阻塞其他音檔

3. **波形圖生成錯誤**
   - 顯示簡化的佔位圖
   - 不影響播放功能

4. **播放中斷處理**
   - 正確處理 AbortError（快速切換音檔時）
   - 不顯示 AbortError 錯誤訊息
   - 清理被中斷的播放資源

5. **成功狀態處理**
   - 成功載入時不顯示任何訊息
   - 只在發生錯誤時顯示訊息

## Testing Strategy

### Backend Testing (Node.js + TypeScript)

#### Unit Tests
- **Models**: 測試型別定義和資料驗證
- **Services**: 測試業務邏輯、邊界條件
- **Database**: 測試 CRUD 操作
- **Utils**: 測試工具函式

#### Integration Tests
- **API Routes**: 測試完整的請求-回應流程
- **File System**: 測試檔案掃描邏輯
- **Audio Streaming**: 測試音檔串流和 Range requests

#### Test Structure
```typescript
// tests/server/services/scanService.test.ts
describe('ScanService', () => {
  it('should scan directory and return tree structure', async () => {});
  it('should filter supported audio formats only', async () => {});
  it('should handle permission errors gracefully', async () => {});
});
```

### Frontend Testing

#### Unit Tests
- **Components**: 測試渲染、互動、狀態變化
- **Hooks**: 測試自訂 Hook 邏輯
- **Services**: 測試 API 呼叫（使用 mock）
- **Utils**: 測試工具函式

#### Integration Tests
- **User Flows**: 測試完整的使用者操作流程
- **Keyboard Navigation**: 測試鍵盤快捷鍵
- **Audio Playback**: 測試播放邏輯

#### Test Structure
```typescript
// tests/client/components/AudioItem.test.tsx
describe('AudioItem', () => {
  it('renders audio file information correctly', () => {});
  it('updates rating when star is clicked', () => {});
  it('enters edit mode when description is clicked', () => {});
  it('saves description on Enter key', () => {});
  it('cancels edit on Escape key', () => {});
});
```

### 統一測試框架

使用 Vitest 作為前後端統一的測試框架：
- 與 Vite 完美整合
- 快速的測試執行速度
- Jest 相容的 API
- 原生 TypeScript 支援
- 程式碼覆蓋率報告

### TDD Workflow

1. **Red**: 先寫失敗的測試
2. **Green**: 寫最少的程式碼讓測試通過
3. **Refactor**: 重構程式碼保持測試通過

### Test Coverage Goals

- 整體覆蓋率：≥ 80%
- 核心業務邏輯：≥ 90%
- UI 元件：≥ 70%

## UI Design Decisions

### 最大化內容顯示

本系統的 UI 設計以最大化音檔項目顯示為核心原則：

1. **緊湊的標題列**
   - 將篩選功能整合到標題右側
   - 移除獨立的篩選區塊
   - 設計理由：節省垂直空間，讓更多音檔項目可見

2. **移除冗餘狀態顯示**
   - 不顯示 Selected 狀態文字（改用背景色）
   - 不顯示 Playing 狀態文字（整合在波形圖進度條中）
   - 不顯示 Progress 資訊（整合在波形圖中）
   - 設計理由：減少視覺雜訊，專注於音檔內容

3. **單行音檔項目**
   - 依序顯示：星級、檔名、波形圖、頻譜圖、描述
   - 所有資訊在單行內呈現
   - 設計理由：提高資訊密度，方便快速瀏覽

4. **資料夾顯示優化**
   - 顯示資料夾名稱和音檔數量（僅數字，不含 "files" 文字和括弧）
   - 遞迴計算所有子資料夾內的音檔總數
   - 設計理由：提供有用的統計資訊，同時保持簡潔

5. **篩選結果顯示**
   - 顯示被篩選出來的總音檔數量
   - 高亮顯示符合條件的文字（使用背景色，不改變文字寬度）
   - 設計理由：提供清晰的篩選反饋，避免版面跳動

6. **成功狀態處理**
   - 成功載入時不顯示任何訊息
   - 只在發生錯誤時顯示訊息
   - 設計理由：減少干擾，讓使用者專注於內容

## Keyboard Navigation Design

### 導航邏輯設計決策

鍵盤導航是本系統的核心功能之一，設計時考慮了以下原則：

1. **上下鍵導航**
   - 向上/向下鍵移動選取項目
   - 選中音檔時立即開始播放（提供即時反饋）
   - 自動捲動以保持選中項目可見

2. **左右鍵導航**
   - **右鍵**: 展開資料夾（僅對資料夾有效）
   - **左鍵**: 
     - 若選中音檔：收合該音檔所屬的資料夾並選擇該資料夾
     - 若選中已展開的資料夾：收合該資料夾
     - 若選中已收合的資料夾：收合上層資料夾並選擇上層資料夾
   - 設計理由：左鍵提供「向上導航」的直覺操作，類似檔案管理器的行為

3. **空白鍵控制**
   - 停止當前播放或重新開始播放當前音檔
   - 重新播放時從頭開始（不是暫停/繼續）
   - 設計理由：簡化播放控制，符合快速瀏覽的使用情境

4. **數字鍵快速評分**
   - 按下 1/2/3 鍵直接設定當前選中音檔的星級評分
   - 設計理由：提高評分效率，無需使用滑鼠點擊

5. **Enter 鍵快速編輯**
   - 按下 Enter 鍵直接進入描述編輯模式
   - 設計理由：提供純鍵盤操作流程

6. **播放狀態管理**
   - 從音檔切換到資料夾時自動停止播放
   - 設計理由：避免混淆，明確播放狀態與選中項目的關聯

### 視覺化反饋

- 使用高亮背景色標示當前選中項目
- 波形圖上顯示播放進度條
- 不顯示額外的 Selected/Playing 狀態文字（節省空間）

## Performance Considerations

### Frontend Optimization

1. **虛擬滾動**
   - 使用 `react-window` 或 `react-virtual`
   - 只渲染可見的音檔項目
   - 支援 10000+ 音檔

2. **波形圖與頻譜圖快取**
   - 使用 Map 快取已生成的波形和頻譜資料
   - LRU 策略限制記憶體使用
   - 設計理由：避免重複生成，提升效能

3. **延遲載入**
   - 音檔按需載入
   - 波形圖和頻譜圖在音檔下載後即時生成
   - 設計理由：平衡載入速度和使用者體驗

4. **篩選效能優化**
   - 篩選從所有項目中進行，不限於已展開的項目
   - 使用 debounce (100ms) 減少不必要的計算
   - 即時更新篩選結果和總數統計
   - 設計理由：提供完整的搜尋功能，同時保持流暢的輸入體驗

4. **防抖與節流**
   - 篩選輸入使用 debounce (100ms)
   - 滾動事件使用 throttle

### Backend Optimization

1. **檔案掃描**
   - 啟動時執行一次完整掃描
   - 使用非同步 I/O
   - 平行處理子資料夾
   - 快取掃描結果於記憶體中
   - 過濾不含音檔的資料夾以減少資料量

2. **音檔串流**
   - 使用 Range requests 支援
   - 適當的 buffer size

3. **資料庫查詢**
   - 使用索引加速查詢
   - 批次更新減少寫入次數

## Security Considerations

1. **路徑遍歷防護**
   - 驗證所有檔案路徑
   - 限制存取範圍在指定根目錄內

2. **輸入驗證**
   - 驗證評分範圍 (0-3)
   - 限制描述長度 (例如 500 字元)
   - 清理使用者輸入

3. **CORS 設定**
   - 適當的 CORS 政策
   - 開發與生產環境分離

## Deployment Considerations

### Development
- 使用 `npm run dev` 啟動整合開發環境
- 伺服器啟動時自動掃描設定檔指定的音檔資料夾
- Vite 開發伺服器處理前端熱更新（port 5173）
- Fastify 伺服器處理 API 請求（port 3000）
- Vite 自動 proxy API 請求到 Fastify

### Production
- 使用 `npm run build` 建置前端靜態檔案
- 使用 `npm start` 啟動生產版本
- 伺服器啟動時自動掃描音檔資料夾（可能需要幾秒鐘）
- Fastify 同時服務 API 和靜態檔案
- 單一 port 部署（預設 3000）
- 跨平台執行（Windows/Linux/macOS）

### Configuration
- 必須在專案根目錄建立 `config.json`
- 如果設定檔不存在，應用程式將無法啟動
- 預設設定檔內容（audioDirectory 為 "../music-player"）：
  ```json
  {
    "audioDirectory": "../music-player"
  }
  ```
- 使用者可修改 `audioDirectory` 來指定自己的音檔資料夾路徑

### 未來 Electron 轉換
- 最小化改動即可打包為桌面應用
- Server 程式碼作為 Electron main process
- React 前端作為 renderer process
- 使用 electron-builder 打包

## Future Enhancements

1. **匯出/匯入 metadata**

## Optimization Roadmap

### Phase 1: 智慧預載與自動生成
- 當前選取音檔下載完畢後自動播放並同步生成波形圖和頻譜圖
- 自動預載下一個音檔
- 持續下載直到螢幕可見範圍內的所有音檔都已下載並生成視覺化

### Phase 2: 壓縮檔支援
- 偵測特定副檔名的壓縮檔（如 .zip）
- 自動解壓縮並掃描內部音檔
- 解壓內容快取到專案子資料夾
- 壓縮檔顯示為虛擬資料夾，可展開瀏覽內部音檔
- 支援壓縮檔內音檔的播放、評分和描述功能

### Phase 3: 附加音檔功能
- 每個音檔可附加額外的音檔版本
- 附加音檔儲存於專案子資料夾
- 顯示附加音檔播放圖示
- 使用 → 鍵切換到附加音檔播放
- 使用 ← 鍵切換回原始音檔播放
- 空白鍵控制播放/停止，重新播放從頭開始
- 附加音檔不生成波形圖和頻譜圖
- 播放附加音檔時在圖示上顯示播放狀態
