# 技術棧

## 後端

- **框架**: Python FastAPI
- **資料庫**: SQLite (本地儲存)
- **音頻處理**: 用於波形圖生成
- **測試**: pytest

## 前端

- **框架**: React
- **語言**: TypeScript
- **UI 設計**: 緊湊型介面設計
- **測試**: Jest + React Testing Library

## 開發方法

- **TDD (Test-Driven Development)**: 先寫測試，再寫實作
- 所有前後端功能都需要對應的測試

## 常用指令

### 後端

```bash
# 安裝依賴
pip install -r requirements.txt

# 執行開發伺服器
uvicorn main:app --reload

# 執行測試
pytest

# 執行測試並顯示覆蓋率
pytest --cov
```

### 前端

```bash
# 安裝依賴
npm install

# 執行開發伺服器
npm run dev

# 執行測試
npm test

# 建置生產版本
npm run build
```

## 資料儲存

- **SQLite**: 僅儲存有星級評分或描述的音檔資料
- **波形圖**: 儲存於專案子資料夾（與原始音檔分離）
