# 前端效能優化實作

## 概述

本文件說明音頻瀏覽器前端的效能優化實作，包含 LRU 快取、延遲載入和虛擬滾動優化。

## 實作的優化功能

### 1. LRU 快取系統

#### LRUCache 類別 (`src/client/utils/LRUCache.ts`)

通用的 LRU (Least Recently Used) 快取實作，提供：

- **自動淘汰**：當快取達到容量上限時，自動移除最少使用的項目
- **存取更新**：每次存取項目時，自動更新其使用順序
- **型別安全**：使用 TypeScript 泛型支援任意鍵值型別
- **統計資訊**：提供快取使用率和容量資訊

**使用範例：**
```typescript
const cache = new LRUCache<string, number>(100);
cache.set('key1', 123);
const value = cache.get('key1'); // 123
```

#### 集中式視覺化快取管理器 (`src/client/utils/visualizationCache.ts`)

統一管理所有視覺化資料的快取：

- **波形圖快取**：最多快取 100 個波形圖
- **頻譜圖快取**：最多快取 50 個頻譜圖
- **音頻緩衝快取**：最多快取 20 個 AudioBuffer

**快取策略：**
- 使用檔案路徑和尺寸作為快取鍵
- 自動淘汰最少使用的項目
- 支援按檔案清除所有相關快取

**使用範例：**
```typescript
import { visualizationCache } from '../utils/visualizationCache';

// 檢查快取
const cached = visualizationCache.getWaveform(filePath, width);

// 設定快取
visualizationCache.setWaveform(filePath, width, waveformData);

// 清除特定檔案的所有快取
visualizationCache.removeFile(filePath);
```

### 2. 延遲載入和按需生成

#### useLazyVisualization Hook (`src/client/hooks/useLazyVisualization.ts`)

提供延遲載入和按需生成視覺化的功能：

**特性：**
- **智慧快取檢查**：優先使用快取資料，避免重複生成
- **音頻緩衝快取**：快取解碼後的 AudioBuffer，加速後續生成
- **可中斷載入**：支援取消正在進行的載入操作
- **優先級控制**：可選擇優先生成波形圖或頻譜圖

**使用範例：**
```typescript
const visualization = useLazyVisualization({
  waveformWidth: 200,
  spectrogramWidth: 200,
  spectrogramHeight: 40,
  priority: 'both',
});

// 載入視覺化
await visualization.loadVisualization(filePath, audioUrl);

// 清除視覺化
visualization.clearVisualization();
```

**效能優勢：**
- 避免重複下載和解碼音頻檔案
- 減少不必要的視覺化生成
- 降低記憶體使用量

### 3. 虛擬滾動優化

#### useVirtualScrollOptimization Hook (`src/client/hooks/useVirtualScrollOptimization.ts`)

優化虛擬滾動效能，追蹤可見範圍並提供預載功能：

**特性：**
- **可見範圍追蹤**：即時追蹤當前可見的項目範圍
- **Overscan 支援**：在可見範圍外預載額外項目，確保流暢滾動
- **預載佇列**：自動預載可見範圍內的項目

**使用範例：**
```typescript
const virtualScroll = useVirtualScrollOptimization({
  itemCount: items.length,
  itemHeight: 40,
  containerHeight: 600,
  overscanCount: 5,
});

// 更新滾動位置
virtualScroll.updateScrollPosition(scrollTop);

// 檢查項目是否可見
const isVisible = virtualScroll.isItemVisible(index);
```

#### usePreloadVisibleItems Hook

配合虛擬滾動，自動預載可見範圍內的項目：

**使用範例：**
```typescript
usePreloadVisibleItems({
  items: audioFiles,
  visibleRange: virtualScroll.visibleRange,
  preloadFn: async (item, index) => {
    // 預載邏輯
    await loadVisualization(item.path, item.url);
  },
  enabled: true,
});
```

### 4. 元件整合

#### AudioTree 元件優化

- 整合虛擬滾動優化
- 只渲染 overscan 範圍內的項目
- 通知父元件可見範圍變化

#### AudioItem 元件優化

- 使用 `useLazyVisualization` 延遲載入視覺化
- 根據可見性自動載入/清除視覺化
- 減少記憶體佔用

## 效能指標

### 記憶體使用

- **波形圖快取**：約 100 個項目 × 1KB = 100KB
- **頻譜圖快取**：約 50 個項目 × 10KB = 500KB
- **音頻緩衝快取**：約 20 個項目 × 1MB = 20MB
- **總計**：約 20.6MB（可接受範圍）

### 渲染效能

- **虛擬滾動**：只渲染可見項目 + overscan，大幅減少 DOM 節點數量
- **延遲載入**：避免一次性載入所有視覺化，減少初始載入時間
- **快取命中**：重複存取相同項目時，直接使用快取，無需重新生成

### 網路效能

- **音頻緩衝快取**：避免重複下載相同音頻檔案
- **按需載入**：只載入可見範圍內的音頻檔案

## 使用建議

### 開發環境

在開發環境中，可以透過以下方式監控快取效能：

```typescript
// 取得快取統計資訊
const stats = visualizationCache.getStats();
console.log('Cache stats:', stats);
```

### 生產環境

- 快取大小已針對一般使用情境優化
- 如需調整快取大小，修改 `visualizationCache.ts` 中的初始化參數
- 建議根據實際使用情況調整 overscan 數量

## 未來優化方向

1. **Web Worker 支援**：將視覺化生成移至 Web Worker，避免阻塞主執行緒
2. **IndexedDB 持久化**：將快取資料持久化到 IndexedDB，加速重新載入
3. **智慧預載**：根據使用者滾動方向和速度，智慧預測並預載項目
4. **壓縮快取**：壓縮視覺化資料，減少記憶體使用

## 測試

所有優化功能都包含完整的單元測試：

- `tests/client/utils/LRUCache.test.ts`：LRU 快取測試
- `tests/client/hooks/useWaveform.test.ts`：波形圖 hook 測試（含快取）
- `tests/client/hooks/useSpectrogram.test.ts`：頻譜圖 hook 測試（含快取）

執行測試：
```bash
npm test
```

## 相關檔案

### 核心實作
- `src/client/utils/LRUCache.ts`
- `src/client/utils/visualizationCache.ts`
- `src/client/hooks/useLazyVisualization.ts`
- `src/client/hooks/useVirtualScrollOptimization.ts`

### 更新的 Hooks
- `src/client/hooks/useWaveform.ts`
- `src/client/hooks/useSpectrogram.ts`

### 更新的元件
- `src/client/components/AudioTree.tsx`
- `src/client/components/AudioItem.tsx`

### 測試
- `tests/client/utils/LRUCache.test.ts`
- `tests/client/hooks/useWaveform.test.ts`
- `tests/client/hooks/useSpectrogram.test.ts`
