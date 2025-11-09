# Design Document

## Overview

音頻瀏覽器採用前後端分離架構，後端使用 Python FastAPI 提供 RESTful API，前端使用 React + TypeScript 實現互動式使用者介面。系統設計重點在於高效能的音檔管理、即時波形圖生成、流暢的鍵盤導航體驗，以及緊湊的 UI 設計。

## Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                             │
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
                            │
                            │ HTTP/REST
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                         Backend                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   API        │  │   Service    │  │   Models     │     │
│  │   Routes     │  │   Layer      │  │              │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                            │                                 │
│                            ▼                                 │
│                    ┌──────────────┐                         │
│                    │   SQLite     │                         │
│                    │   Database   │                         │
│                    └──────────────┘                         │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

**Backend:**
- FastAPI: Web 框架
- SQLAlchemy: ORM
- SQLite: 資料庫
- Pydantic: 資料驗證
- pytest: 測試框架

**Frontend:**
- React 18: UI 框架
- TypeScript: 型別安全
- Vite: 建置工具
- Web Audio API: 音頻處理和波形圖生成
- Wavesurfer.js 或自訂實作: 波形圖視覺化
- Jest + React Testing Library: 測試框架

## Components and Interfaces

### Backend Components

#### 1. API Layer (`backend/api/`)

**`audio_routes.py`**
- `GET /api/scan`: 掃描指定資料夾並返回音檔樹狀結構
- `GET /api/audio/{file_path}`: 串流音檔內容
- `GET /api/metadata`: 取得所有已儲存的 metadata
- `POST /api/metadata`: 更新音檔的評分或描述
- `DELETE /api/metadata/{file_path}`: 刪除音檔的 metadata

#### 2. Service Layer (`backend/services/`)

**`scan_service.py`**
```python
class ScanService:
    def scan_directory(self, root_path: str) -> DirectoryTree:
        """掃描資料夾並建立樹狀結構"""
        
    def get_supported_formats(self) -> List[str]:
        """返回支援的音檔格式"""
        
    def build_tree(self, path: str) -> DirectoryNode:
        """遞迴建立目錄樹"""
```

**`metadata_service.py`**
```python
class MetadataService:
    def get_metadata(self, file_path: str) -> Optional[AudioMetadata]:
        """取得單一音檔的 metadata"""
        
    def get_all_metadata(self) -> Dict[str, AudioMetadata]:
        """取得所有 metadata"""
        
    def update_metadata(self, file_path: str, rating: int, description: str) -> AudioMetadata:
        """更新或建立 metadata"""
        
    def delete_metadata(self, file_path: str) -> bool:
        """刪除 metadata"""
```

**`audio_service.py`**
```python
class AudioService:
    def stream_audio(self, file_path: str) -> FileResponse:
        """串流音檔內容"""
        
    def validate_audio_file(self, file_path: str) -> bool:
        """驗證音檔是否存在且可讀取"""
```

#### 3. Models (`backend/models/`)

**`audio_metadata.py`**
```python
class AudioMetadata(Base):
    __tablename__ = "audio_metadata"
    
    id: int  # Primary key
    file_path: str  # Unique, 相對路徑
    rating: int  # 0-3 (0=未評分, 1-3=評分)
    description: str  # 可選描述
    created_at: datetime
    updated_at: datetime
```

**`directory_tree.py`**
```python
@dataclass
class AudioFile:
    name: str
    path: str  # 相對路徑
    size: int
    
@dataclass
class DirectoryNode:
    name: str
    path: str
    files: List[AudioFile]
    subdirectories: List[DirectoryNode]
```

### Frontend Components

#### 1. Core Components (`frontend/src/components/`)

**`AudioBrowser.tsx`**
- 主要容器元件
- 管理全域狀態（音檔樹、篩選條件、當前選擇）
- 處理鍵盤事件

**`FilterBar.tsx`**
- 文字篩選輸入框
- 星級篩選下拉選單
- 顯示篩選結果數量

**`AudioTree.tsx`**
- 顯示音檔樹狀結構
- 虛擬滾動實作（處理大量項目）
- 管理展開/收合狀態

**`AudioItem.tsx`**
- 單一音檔項目（單行顯示）
- 包含：星級、檔名、波形圖、描述
- 處理選擇狀態視覺化

**`StarRating.tsx`**
- 三星評分元件
- 可點擊互動
- 立即儲存評分

**`WaveformDisplay.tsx`**
- 波形圖顯示
- 整合播放進度條
- 使用 Canvas 或 SVG 繪製

**`DescriptionField.tsx`**
- 可編輯描述欄位
- 點擊進入編輯模式
- Esc 取消，Enter 或失焦儲存

**`AudioPlayer.tsx`**
- 音頻播放控制（無 UI）
- 循環播放邏輯
- 播放狀態管理

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

**`useKeyboardNavigation.ts`**
```typescript
interface UseKeyboardNavigationReturn {
  selectedIndex: number;
  handleKeyDown: (event: KeyboardEvent) => void;
  selectNext: () => void;
  selectPrevious: () => void;
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

#### 3. Services (`frontend/src/services/`)

**`api.ts`**
```typescript
class AudioBrowserAPI {
  async scanDirectory(path: string): Promise<DirectoryTree>;
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

## Data Models

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

**DirectoryTree Response**
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
      "files": [],
      "subdirectories": []
    }
  ]
}
```

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

1. **檔案系統錯誤**
   - 資料夾不存在：返回 404
   - 權限不足：返回 403
   - 檔案讀取失敗：記錄錯誤並繼續處理其他檔案

2. **資料庫錯誤**
   - 連線失敗：返回 500 並記錄錯誤
   - 資料驗證失敗：返回 400 並提供詳細訊息
   - 唯一性衝突：使用 upsert 邏輯

3. **API 錯誤回應格式**
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

## Testing Strategy

### Backend Testing

#### Unit Tests
- **Models**: 測試資料驗證、關聯關係
- **Services**: 測試業務邏輯、邊界條件
- **Utils**: 測試工具函式

#### Integration Tests
- **API Routes**: 測試完整的請求-回應流程
- **Database**: 測試 CRUD 操作
- **File System**: 測試檔案掃描邏輯

#### Test Structure
```python
# tests/services/test_scan_service.py
def test_scan_directory_returns_tree_structure():
    """測試掃描資料夾返回正確的樹狀結構"""
    
def test_scan_directory_filters_supported_formats():
    """測試只返回支援的音檔格式"""
    
def test_scan_directory_handles_permission_errors():
    """測試處理權限錯誤"""
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
// tests/components/AudioItem.test.tsx
describe('AudioItem', () => {
  it('renders audio file information correctly', () => {});
  it('updates rating when star is clicked', () => {});
  it('enters edit mode when description is clicked', () => {});
  it('saves description on Enter key', () => {});
  it('cancels edit on Escape key', () => {});
});
```

### TDD Workflow

1. **Red**: 先寫失敗的測試
2. **Green**: 寫最少的程式碼讓測試通過
3. **Refactor**: 重構程式碼保持測試通過

### Test Coverage Goals

- 整體覆蓋率：≥ 80%
- 核心業務邏輯：≥ 90%
- UI 元件：≥ 70%

## Performance Considerations

### Frontend Optimization

1. **虛擬滾動**
   - 使用 `react-window` 或 `react-virtual`
   - 只渲染可見的音檔項目
   - 支援 10000+ 音檔

2. **波形圖快取**
   - 使用 Map 快取已生成的波形資料
   - LRU 策略限制記憶體使用

3. **延遲載入**
   - 音檔按需載入
   - 波形圖按可見性生成

4. **防抖與節流**
   - 篩選輸入使用 debounce (100ms)
   - 滾動事件使用 throttle

### Backend Optimization

1. **檔案掃描**
   - 使用非同步 I/O
   - 平行處理子資料夾
   - 快取掃描結果（可選）

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
- Backend: `uvicorn main:app --reload --port 8000`
- Frontend: `npm run dev --port 3000`
- 使用 proxy 處理 CORS

### Production
- Backend: 使用 Gunicorn + Uvicorn workers
- Frontend: 建置靜態檔案，由 Backend 提供
- 單一 port 部署

## Future Enhancements

1. **播放清單功能**
2. **音檔標籤系統**
3. **匯出/匯入 metadata**
4. **多資料夾管理**
5. **音檔格式轉換**
6. **協作功能（多使用者）**
