# React Window itemData 錯誤修復

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

在 `AudioTree.tsx` 中，`List` 元件接收了 `itemData={items}` prop。這個 prop 會在每次 render 時建立新的陣列參考，導致 `react-window` 的 `useMemoizedObject` hook 嘗試記憶化這個物件。

當 items 陣列頻繁變化時，可能會在某個時刻傳遞 undefined 或 null 值，導致 `Object.values()` 錯誤。

## 解決方案

移除 `itemData` prop，改為在 `renderRow` 回呼函式中直接使用閉包訪問 `items` 陣列。

### 修改前

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
    itemData={items}  // 問題所在
  >
    {renderRow}
  </List>
);
```

### 修改後

```typescript
const renderRow = useCallback(
  ({ index, style }: { index: number; style: React.CSSProperties }) => {
    // 直接從閉包訪問 items
    if (!style || index < 0 || index >= items.length) {
      return <div style={style || {}} />;
    }
    const item = items[index];
    // ...
  },
  [items, selectedIndex, onItemClick, onExpandToggle, filterText, virtualScroll]
);

return (
  <List
    // 移除 itemData prop
  >
    {renderRow}
  </List>
);
```

## 優點

1. **避免 undefined/null 錯誤**：不再依賴 `itemData` prop，避免了 `useMemoizedObject` 的問題
2. **更簡潔的程式碼**：減少了不必要的 prop 傳遞
3. **效能相同**：`renderRow` 已經在 `useCallback` 的依賴陣列中包含 `items`，效能沒有損失
4. **更好的型別安全**：不需要處理 `data` 可能為 undefined 的情況

## 測試驗證

建立了以下測試來驗證修復：

1. `AudioTree-empty-data.test.tsx` - 測試空資料處理
2. `AudioTree-react-window-fix.test.tsx` - 測試 itemData 移除後的行為
3. `AudioBrowser-initialization.test.tsx` - 測試實際 API 資料的初始化

所有測試都通過，確認修復有效且沒有破壞現有功能。

## 相關檔案

- `src/client/components/AudioTree.tsx` - 主要修改檔案
- `tests/client/components/AudioTree-*.test.tsx` - 相關測試檔案
