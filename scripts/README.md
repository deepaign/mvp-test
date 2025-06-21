# Polify 工程師管理工具

這個資料夾包含工程師用來管理 Polify 團隊的腳本工具。

## 🚀 快速開始

### 1. 安裝依賴
```bash
cd scripts
npm install
```

### 2. 設定環境變數
確認專案根目錄的 `.env` 檔案包含以下設定：

```env
REACT_APP_SUPABASE_URL=你的_supabase_網址
REACT_APP_SUPABASE_ANON_KEY=你的_anon_key
SUPABASE_SERVICE_ROLE_KEY=你的_service_role_key  # 新增這個！
```

**重要：** Service Role Key 可以在 Supabase Dashboard > Settings > API 找到

### 3. 使用腳本

#### 建立新團隊
```bash
npm run create-team
# 或直接執行
node createTeam.js
```

#### 查看現有團隊
```bash
npm run list-teams
# 或直接執行
node listTeams.js
```

## 📋 功能說明

### createTeam.js - 建立團隊
- 互動式問答收集團隊資訊
- 自動生成 8 位註冊碼
- 支援選擇職位和縣市
- 確認資訊後建立團隊
- 顯示註冊碼供政治人物使用

### listTeams.js - 查看團隊
- 列出所有團隊及狀態
- 支援搜尋功能
- 查看團隊詳細資訊
- 顯示團隊成員列表
- 統計各種狀態的團隊數量

## 🔧 團隊狀態說明

- **🟡 等待加入**: 團隊已建立但政治人物尚未使用註冊碼
- **🟢 已啟用**: 政治人物已使用註冊碼加入團隊
- **🔴 已停用**: 團隊已被停用

## 📝 操作流程

1. **工程師建立團隊**
   ```bash
   npm run create-team
   ```
   
2. **記錄註冊碼**
   - 腳本會生成 8 位註冊碼（例如：ABC12345）
   - 將註冊碼提供給對應的政治人物

3. **政治人物使用註冊碼**
   - 政治人物在 Polify 登入後輸入註冊碼
   - 系統自動將其加入對應團隊
   - 團隊狀態變更為「已啟用」

4. **查看團隊狀態**
   ```bash
   npm run list-teams
   ```

## ⚠️ 注意事項

1. **註冊碼只能使用一次**
   - 每個註冊碼只能讓一位政治人物加入
   - 使用後無法重複使用

2. **Service Role Key 安全**
   - 絕對不要將 Service Role Key 上傳到 GitHub
   - 確保 `.env` 檔案在 `.gitignore` 中

3. **資料備份**
   - 建議記錄建立的團隊和註冊碼
   - 定期備份重要資料

## 🆘 常見問題

### Q: 執行腳本時出現「Supabase 連接失敗」
A: 檢查以下項目：
- 環境變數是否正確設定
- Service Role Key 是否正確
- 網路連接是否正常

### Q: 註冊碼重複怎麼辦？
A: 系統會自動檢測重複並重新生成，機率極低

### Q: 如何修改已建立的團隊資訊？
A: 目前需要直接在 Supabase Dashboard 中修改，未來會加入編輯功能

## 📞 技術支援

如有問題請聯繫開發團隊。