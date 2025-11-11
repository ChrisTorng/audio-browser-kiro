# React Window v2 API 升級修復

## 問題描述

開啟網頁時出現以下錯誤：

```
TypeError: Cannot convert undefined or null to object
    at Object.values (<anonymous>)
    at de (useMemoizedObject.ts:9:13)
    at Ae (List.tsx:40:20)
```

錯誤發生在 `react-window` 函式庫的 `useMemoizedObject.ts` 中，當嘗試對 undefined 或 null 呼叫 `Object.values()` 時觸發。

## 根本原因

專案使用了 `react-window` v2.2.3，但程式碼仍使用 v1 的 API：
- v1 使用 `children` 函式和 `itemData` prop
- v2 使用 `rowComponent` 和 `rowProps` prop

API 不匹配導致內部的 `useMemoizedObject` 無法正確處理 props，觸發 `Object.values()` 錯誤。

## 解決方案

將 `AudioTree.tsx` 升級為使用 react-window v2 API：

1. 將 `renderRow` 函式改為 `RowComponent` 元件
2. 使用 `rowComponent` prop 而非 `children`
3. 使用 `rowProps` prop 而非 `itemData`
4. 使用 `listRef` prop 而非 `ref`
5. 使用 `scrollToRow()` 方法而非 `scrollToItem()`

### 修改前 (v1 API)

```typescript
const renderRow = useCallback(
  ({ index, style, data }: { index: number; style: React.CSSProperties; data?: TreeItem[] }) => {
    const item = (data || items)[index];
    // ...
  },
  [items, selectedIndex, onItemClick, onExpandToggle, filterText, virtualScroll]
);

return (
  <List
    ref={listRef}
    height={height}
    itemCount={items.length}
    itemSize={itemHeight}
    width="100%"
    itemData={items}
  >
    {renderRow}
  </List>
);

// Scroll method
listRef.current.scrollToItem(selectedIndex, 'smart');
```

### 修改後 (v2 API)

```typescript
interface RowComponentProps {
  index: number;
  style: React.CSSProperties;
  ariaAttributes: {
    'aria-posinset': number;
    'aria-setsize': number;
    role: 'listitem';
  };
}

const RowComponent = useCallback(
  ({ index, style, ariaAttributes }: RowComponentProps) => {
    if (!style || index < 0 || index >= items.length) {
      return <div style={style || {}} {...ariaAttributes} />;
    }
    const item = items[index];
    // ...
    return <div style={style} {...ariaAttributes}>...</div>;
  },
  [items, selectedIndex, onItemClick, onExpandToggle, filterText, virtualScroll]
);

return (
  <List
    listRef={listRef}
    style={{ height, width: '100%' }}
    rowComponent={RowComponent}
    rowCount={items.length}
    rowHeight={itemHeight}
    rowProps={{}}
    overscanCount={5}
  />
);

// Scroll method
listRef.current.scrollToRow({ index: selectedIndex, align: 'smart' });
```

## 主要變更

### API 變更

| v1 API | v2 API | 說明 |
|--------|--------|------|
| `children` (function) | `rowComponent` | 渲染函式改為元件 |
| `itemData` | `rowProps` | 傳遞給每個 row 的額外 props |
| `ref` | `listRef` | ref prop 名稱變更 |
| `height`, `width` (props) | `style` (object) | 尺寸改為 style 物件 |
| `itemCount` | `rowCount` | 項目數量 prop 名稱變更 |
| `itemSize` | `rowHeight` | 項目高度 prop 名稱變更 |
| `scrollToItem()` | `scrollToRow()` | 滾動方法名稱和參數格式變更 |

### 新增功能

1. **ARIA 屬性自動注入**：v2 會自動為每個 row 提供 `ariaAttributes`，改善無障礙支援
2. **更好的型別安全**：v2 的 TypeScript 定義更完整
3. **效能改善**：v2 的內部實作更高效

## 優點

1. **修復錯誤**：解決了 `Object.values()` 錯誤
2. **符合最新 API**：使用 react-window v2 的正確 API
3. **更好的無障礙支援**：自動處理 ARIA 屬性
4. **更好的型別安全**：完整的 TypeScript 支援

## 測試驗證

### 單元測試

更新了 `tests/setup.ts` 中的 react-window mock 以支援 v2 API：
- 使用 `rowComponent` 和 `rowProps`
- 提供 `ariaAttributes`
- 實作 `scrollToRow()` 方法

所有 AudioTree 相關測試通過（19 個測試）：
1. `AudioTree.test.tsx` - 基本功能測試
2. `AudioTree-empty-data.test.tsx` - 空資料處理測試
3. `AudioTree-react-window-fix.test.tsx` - API 變更測試
4. `AudioTree-bug.test.tsx` - 錯誤修復測試

### E2E 測試

建立了 Playwright 測試來驗證實際瀏覽器行為：
1. `tests/e2e/homepage-load.spec.ts` - 首頁載入測試
2. `tests/e2e/debug-error.spec.ts` - 錯誤偵測測試

所有 E2E 測試通過，確認：
- 頁面正常載入
- 沒有 `Object.values()` 錯誤
- ErrorBoundary 沒有捕獲錯誤
- AudioTree 正常顯示

## 相關檔案

### 主要修改
- `src/client/components/AudioTree.tsx` - 升級為 v2 API
- `tests/setup.ts` - 更新 react-window mock

### 測試檔案
- `tests/client/components/AudioTree-*.test.tsx` - 單元測試
- `tests/e2e/homepage-load.spec.ts` - E2E 測試
- `tests/e2e/debug-error.spec.ts` - 錯誤偵測測試

### 配置檔案
- `playwright.config.ts` - Playwright 配置
- `package.json` - 新增 @playwright/test 依賴
