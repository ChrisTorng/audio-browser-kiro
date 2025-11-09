# 語言與溝通規範

## 語言要求

- **主要語言**: 繁體中文（台灣用語）
- **技術術語**: 優先使用台灣慣用的中文技術術語，必要時可保留英文原文
- **程式碼**: 程式碼內容（變數名稱、函式名稱、註解等）使用英文
- **文件**: 所有文件、說明、對話均使用繁體中文

## 術語對照

### 常用技術術語（台灣用語）
- Server → 伺服器
- Client → 客戶端
- Database → 資料庫
- File → 檔案
- Folder/Directory → 資料夾
- Function → 函式
- Variable → 變數
- Array → 陣列
- Object → 物件
- String → 字串
- Interface → 介面
- Component → 元件
- Route → 路由
- API → API（保留英文）
- Framework → 框架
- Library → 函式庫
- Package → 套件
- Module → 模組
- Build → 建置
- Deploy → 部署
- Test → 測試
- Debug → 除錯
- Cache → 快取
- Cookie → Cookie（保留英文）
- Session → 會話/工作階段
- Request → 請求
- Response → 回應
- Query → 查詢
- Schema → 結構描述
- Migration → 遷移
- Validation → 驗證
- Authentication → 身份驗證
- Authorization → 授權
- Token → 權杖
- Endpoint → 端點
- Middleware → 中介軟體
- Plugin → 外掛程式
- Extension → 擴充功能
- Configuration → 配置/設定
- Environment → 環境
- Production → 正式環境/生產環境
- Development → 開發環境
- Staging → 測試環境
- Repository → 儲存庫
- Commit → 提交
- Branch → 分支
- Merge → 合併
- Pull Request → 拉取請求/PR
- Issue → 議題
- Bug → 錯誤/臭蟲
- Feature → 功能
- Refactor → 重構
- Optimize → 最佳化
- Performance → 效能
- Scalability → 可擴展性
- Maintainability → 可維護性

### 音頻相關術語
- Audio → 音頻/音訊
- Waveform → 波形圖
- Spectrogram → 頻譜圖
- Sample Rate → 取樣率
- Bit Depth → 位元深度
- Channel → 聲道
- Mono → 單聲道
- Stereo → 立體聲
- Playback → 播放
- Recording → 錄音
- Volume → 音量
- Mute → 靜音
- Loop → 循環播放

## 溝通風格

- 使用清晰、專業但友善的語氣
- 避免過於口語化的表達
- 技術說明要精確但易懂
- 適時提供範例和說明
- 回應要簡潔有力，避免冗長

## 範例

### ✅ 正確用法
「我將為您建立一個新的 API 路由來處理音檔掃描功能。這個路由會接收資料夾路徑作為參數，並回傳該資料夾下所有音檔的清單。」

### ❌ 錯誤用法
「I will create a new API route for audio file scanning. This route will receive folder path as parameter and return list of all audio files.」

## 程式碼註解範例

```typescript
// ✅ 正確：使用英文註解
/**
 * Scan directory for audio files
 * @param dirPath - Directory path to scan
 * @returns Array of audio file metadata
 */
async function scanAudioFiles(dirPath: string): Promise<AudioFile[]> {
  // Implementation
}

// ❌ 錯誤：程式碼中使用中文註解會影響可讀性
/**
 * 掃描資料夾中的音檔
 * @param 資料夾路徑 - 要掃描的資料夾路徑
 * @returns 音檔元資料陣列
 */
async function 掃描音檔(資料夾路徑: string): Promise<音檔[]> {
  // 實作
}
```

## 文件撰寫

- README、設計文件、需求文件等使用繁體中文
- 程式碼內的 JSDoc/TSDoc 註解使用英文
- Git commit 訊息可使用中文或英文，但要保持一致性
- 變數名稱、函式名稱、檔案名稱使用英文

## 注意事項

- 保持專業性，避免使用網路流行語或過度口語化的表達
- 技術術語以清晰準確為優先，必要時可在括號內附上英文原文
- 與使用者溝通時，根據對方的語言習慣調整用詞
