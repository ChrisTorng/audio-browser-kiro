# 前端 Hooks 測試

本資料夾包含所有前端 React Hooks 的測試。

## 測試檔案

### useAudioPlayer.test.ts
測試音頻播放器 Hook 的功能：
- 播放、停止、切換控制
- 循環播放
- 播放進度追蹤
- 播放狀態管理

### useWaveform.test.ts
測試波形圖生成 Hook 的功能：
- 從 AudioBuffer 生成波形資料
- 資料正規化
- 快取機制
- 錯誤處理

### useSpectrogram.test.ts
測試頻譜圖生成 Hook 的功能：
- 從 AudioBuffer 生成頻譜資料
- FFT 分析
- 快取機制
- 錯誤處理

### useKeyboardNavigation.test.ts
測試鍵盤導航 Hook 的功能：
- 上下鍵選擇項目
- 左右鍵展開/收合資料夾
- 空白鍵播放/停止
- 選擇索引管理

### useAudioMetadata.test.ts
測試音頻 metadata 管理 Hook 的功能：
- 獲取 metadata
- 更新評分和描述
- 刪除 metadata
- 樂觀更新和錯誤回滾

## 執行測試

```bash
# 執行所有 hooks 測試
npm test tests/client/hooks/

# 執行特定測試檔案
npm test tests/client/hooks/useAudioPlayer.test.ts

# 執行測試並顯示覆蓋率
npm run test:coverage
```

## 測試覆蓋率

所有 hooks 都有完整的測試覆蓋，包括：
- 正常功能測試
- 邊界條件測試
- 錯誤處理測試
- 非同步操作測試
