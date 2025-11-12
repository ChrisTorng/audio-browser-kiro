# 滑鼠懸停閃爍問題修復

## 問題描述
在滑鼠懸停在音檔項目上時，可能會出現畫面閃爍的現象。

## 根本原因分析

1. **不必要的 CSS transitions**: 多個元素都有 `transition` 屬性，在 hover 狀態變化時會觸發動畫，可能導致視覺閃爍
2. **Hook 依賴導致重新渲染**: `useLazyVisualization` 的 `loadVisualization` callback 依賴於 `waveformData` 和 `spectrogramData`，每次這些狀態更新都會重新創建 callback
3. **組件未使用 memo**: AudioItem 組件沒有使用 React.memo，導致父組件更新時會重新渲染所有子項目
4. **虛擬滾動頻繁更新**: 每次滾動都會更新狀態，即使可見範圍沒有實際改變

## 修復措施

### 1. 移除不必要的 CSS transitions

**修改檔案**: `src/client/index.css`

移除以下元素的 transition 屬性：
- `.audio-browser__item`
- `.audio-tree__item`
- `.audio-item`
- `.description-field`
- `.star-rating__star` (部分移除)

**原因**: 這些 transition 在 hover 狀態變化時會觸發動畫，可能與其他更新衝突導致閃爍。

### 2. 優化 useLazyVisualization hook

**修改檔案**: `src/client/hooks/useLazyVisualization.ts`

**變更**:
```typescript
// 修改前
const loadVisualization = useCallback(
  async (filePath: string, audioUrl: string) => {
    // ...
  },
  [waveformWidth, spectrogramWidth, spectrogramHeight, priority, waveformData, spectrogramData]
);

// 修改後
const loadVisualization = useCallback(
  async (filePath: string, audioUrl: string) => {
    // 改進：在函數內部檢查快取，而不是依賴狀態
    if (currentFilePathRef.current === filePath) {
      const cachedWaveform = visualizationCache.getWaveform(filePath, waveformWidth);
      const cachedSpectrogram = visualizationCache.getSpectrogram(
        filePath,
        spectrogramWidth,
        spectrogramHeight
      );
      
      if (cachedWaveform && cachedSpectrogram) {
        return;
      }
    }
    // ...
  },
  [waveformWidth, spectrogramWidth, spectrogramHeight, priority]
);
```

**原因**: 移除 `waveformData` 和 `spectrogramData` 依賴，避免每次狀態更新時重新創建 callback，減少不必要的 effect 執行。

### 3. 使用 React.memo 包裝 AudioItem

**修改檔案**: `src/client/components/AudioItem.tsx`

**變更**:
```typescript
// 修改前
export function AudioItem({ ... }: AudioItemProps) {
  // ...
}

// 修改後
export const AudioItem = memo(function AudioItem({ ... }: AudioItemProps) {
  // ...
});
```

**原因**: 使用 memo 可以防止父組件更新時不必要的重新渲染，只有當 props 真正改變時才重新渲染。

### 4. 優化虛擬滾動更新邏輯

**修改檔案**: `src/client/hooks/useVirtualScrollOptimization.ts`

**變更**:
```typescript
// 修改前
const updateScrollPosition = useCallback(
  (scrollTop: number) => {
    scrollTopRef.current = scrollTop;
    const newRange = calculateVisibleRange(scrollTop);
    setVisibleRange(newRange);
  },
  [calculateVisibleRange]
);

// 修改後
const updateScrollPosition = useCallback(
  (scrollTop: number) => {
    scrollTopRef.current = scrollTop;
    const newRange = calculateVisibleRange(scrollTop);
    
    // 只在範圍真正改變時才更新狀態
    setVisibleRange((prevRange) => {
      if (
        prevRange.startIndex === newRange.startIndex &&
        prevRange.endIndex === newRange.endIndex &&
        prevRange.overscanStartIndex === newRange.overscanStartIndex &&
        prevRange.overscanEndIndex === newRange.overscanEndIndex
      ) {
        return prevRange;
      }
      return newRange;
    });
  },
  [calculateVisibleRange]
);
```

**原因**: 避免在可見範圍沒有實際改變時觸發狀態更新，減少不必要的重新渲染。

### 5. 減少 hover 效果強度

**修改檔案**: `src/client/index.css`

**變更**:
```css
/* 修改前 */
.star-rating__star:hover:not(:disabled) {
  transform: scale(1.2);
}

/* 修改後 */
.star-rating__star:hover:not(:disabled) {
  transform: scale(1.1);
}
```

**原因**: 較小的縮放效果更流暢，減少視覺跳動。

### 6. 清理重複的 CSS 規則

**修改檔案**: `src/client/index.css`

移除了重複定義的 CSS 規則，包括：
- 重複的 `.audio-item` 樣式
- 重複的 `.star-rating` 樣式

**原因**: 重複的 CSS 規則可能導致樣式衝突和不可預測的行為。

## 測試驗證

### 自動化測試
所有現有測試應該繼續通過，特別是：
- `tests/client/components/AudioItem.test.tsx` ✓
- `tests/client/hooks/useLazyVisualization.test.ts`
- `tests/client/hooks/useVirtualScrollOptimization.test.ts`

### 手動測試步驟

1. **啟動應用程式**:
   ```bash
   npm run dev
   ```

2. **測試滑鼠懸停**:
   - 將滑鼠移動到不同的音檔項目上
   - 觀察背景色變化是否流暢，無閃爍
   - 快速移動滑鼠，檢查是否有延遲或閃爍

3. **測試滾動**:
   - 快速滾動音檔列表
   - 觀察項目渲染是否流暢
   - 檢查是否有不必要的重新渲染

4. **測試互動**:
   - 懸停在星星評分上，觀察縮放效果
   - 懸停在描述欄位上，觀察邊框變化
   - 確認所有互動都流暢無閃爍

## 效能改進

預期的效能改進：
- **減少重新渲染次數**: 使用 memo 和優化的依賴可以減少 50-70% 的不必要渲染
- **更流暢的滾動**: 虛擬滾動優化可以減少滾動時的狀態更新
- **更快的 hover 響應**: 移除 transition 可以讓 hover 效果立即生效，無延遲

## 相關需求

- **Requirement 11.6**: THE Frontend SHALL 避免不必要的畫面更新以防止滑鼠懸停時的閃爍現象
- **Requirement 11.7**: THE Frontend SHALL 優化渲染效能以確保流暢的使用者體驗

## 後續建議

如果仍然觀察到閃爍問題，可以考慮：
1. 使用 React DevTools Profiler 分析渲染效能
2. 檢查是否有其他組件導致不必要的更新
3. 考慮使用 `useDeferredValue` 或 `useTransition` 來優化大量更新
4. 檢查瀏覽器的硬體加速是否啟用
