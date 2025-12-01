Implement the task from the markdown document at .kiro/specs/audio-browser/tasks.md:
        
<task title="21.1 實作背景波形圖生成">

Status: not started

Task details:
- 修改 WaveformGenerator 使用 Web Workers 或 requestIdleCallback 在背景執行
- 確保波形圖生成不阻塞主執行緒
- 實作任務取消機制（當使用者切換音檔時）
- 更新 useWaveform Hook 支援非同步背景生成
- _Requirements: 3.1, 3.15, 3.18, 11.5, 11.12_

</task>