# Metadata 同步流程實作說明

## 任務概述

任務 8.3：實作 Metadata 同步流程
- 前端載入所有 metadata
- 更新評分或描述時同步到後端
- 實作樂觀更新和錯誤回滾

## 實作狀態

✅ **已完成** - 所有功能已實作並通過測試

## 核心實作

### 1. 前端 Hook：`useAudioMetadata`

位置：`src/client/hooks/useAudioMetadata.ts`

**主要功能：**
- 自動載入所有 metadata（在 mount 時）
- 提供 `updateRating()` 和 `updateDescription()` 方法
- 實作樂觀更新（Optimistic Update）
- 實作錯誤回滾（Error Rollback）
- 提供 `refreshMetadata()` 方法手動刷新

**樂觀更新流程：**
1. 立即更新本地狀態（使用者看到即時反應）
2. 發送 API 請求到後端
3. 成功：用伺服器回應更新本地狀態
4. 失敗：回滾到原始值

### 2. API 服務層

位置：`src/client/services/api.ts`

**提供的方法：**
- `getAllMetadata()` - 取得所有 metadata
- `updateMetadata()` - 更新 metadata（支援 rating 和 description）
- `deleteMetadata()` - 刪除 metadata
- 內建重試機制和錯誤處理

### 3. 元件整合

**AudioItem 元件** (`src/client/components/AudioItem.tsx`)
- 使用 `useAudioMetadata` hook
- 整合 `StarRating` 元件處理評分更新
- 整合 `DescriptionField` 元件處理描述更新
- 自動處理錯誤並記錄到 console

**AudioBrowser 元件** (`src/client/components/AudioBrowser.tsx`)
- 使用 `useAudioMetadata` hook 管理全域 metadata
- 提供 metadata 給子元件使用
- 支援依 rating 篩選

## 測試覆蓋

### 單元測試

位置：`tests/client/hooks/useAudioMetadata.test.ts`

**測試項目：**
- ✅ 在 mount 時載入 metadata
- ✅ 處理載入錯誤
- ✅ 更新 rating 成功
- ✅ 驗證 rating 範圍（0-3）
- ✅ 樂觀更新 rating
- ✅ rating 更新失敗時回滾
- ✅ 更新 description 成功
- ✅ 樂觀更新 description
- ✅ description 更新失敗時回滾
- ✅ 刪除 metadata
- ✅ 刪除失敗時回滾
- ✅ 取得特定檔案的 metadata
- ✅ 刷新 metadata
- ✅ 為不存在的檔案建立新 metadata

**測試數量：** 13 個測試全部通過

### 整合測試

位置：`tests/integration/metadata-sync.test.ts`

**測試項目：**
- ✅ 初始載入所有 metadata
- ✅ 處理空 metadata
- ✅ 樂觀更新 rating 並同步後端
- ✅ Rating 更新失敗時回滾
- ✅ 為未評分檔案建立新 metadata
- ✅ 樂觀更新 description 並同步後端
- ✅ Description 更新失敗時回滾
- ✅ 處理多個連續的 rating 更新
- ✅ 同時處理 rating 和 description 更新
- ✅ 刷新 metadata
- ✅ 處理網路錯誤
- ✅ 驗證無效的 rating 值

**測試數量：** 12 個測試全部通過

## 使用範例

### 在元件中使用

```typescript
import { useAudioMetadata } from '../hooks/useAudioMetadata';

function MyComponent() {
  const audioMetadata = useAudioMetadata();

  // 取得特定檔案的 metadata
  const metadata = audioMetadata.getMetadata('audio/file.mp3');
  const rating = metadata?.rating || 0;
  const description = metadata?.description || '';

  // 更新 rating
  const handleRatingChange = async (newRating: number) => {
    try {
      await audioMetadata.updateRating('audio/file.mp3', newRating);
      // 成功：UI 已自動更新
    } catch (error) {
      // 失敗：已自動回滾，顯示錯誤訊息
      console.error('Failed to update rating:', error);
    }
  };

  // 更新 description
  const handleDescriptionChange = async (newDescription: string) => {
    try {
      await audioMetadata.updateDescription('audio/file.mp3', newDescription);
    } catch (error) {
      console.error('Failed to update description:', error);
    }
  };

  return (
    <div>
      <StarRating rating={rating} onChange={handleRatingChange} />
      <DescriptionField 
        description={description} 
        onChange={handleDescriptionChange} 
      />
    </div>
  );
}
```

## 技術特點

### 1. 樂觀更新（Optimistic Update）

**優點：**
- 使用者體驗流暢，無需等待伺服器回應
