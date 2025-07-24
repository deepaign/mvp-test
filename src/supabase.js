// src/supabase.js
import { createClient } from '@supabase/supabase-js'

// 替換成你的 Supabase 專案資訊
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY

// 創建 Supabase 客戶端，優化會話持久化設定
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // 啟用會話持久化
    persistSession: true,
    // 自動重新整理 token
    autoRefreshToken: true,
    // 檢測 URL 中的會話（用於 OAuth 重定向）
    detectSessionInUrl: true,
    // 自訂儲存 key（可選）
    storageKey: `sb-${supabaseUrl?.split('//')[1]?.split('.')[0]}-auth-token`,
    // 設定會話檢查間隔（可選，預設是 60 秒）
    // sessionRefreshMargin: 60,
  },
  // 全域設定
  global: {
    headers: {
      // 可以在這裡加入自訂 headers
    },
  },
  // 實時訂閱設定（如果不需要可以停用以提升效能）
  realtime: {
    channels: [],
    endpoint: `${supabaseUrl?.replace('http', 'ws')}/realtime/v1`,
  },
})

// 除錯用：監聽認證狀態變化
if (process.env.NODE_ENV === 'development') {
  supabase.auth.onAuthStateChange((event, session) => {
    console.log(`[Supabase Auth] ${event}`, session?.user?.email || 'no user')
    
    // 檢查 localStorage 中的會話資料
    const storageKey = `sb-${supabaseUrl?.split('//')[1]?.split('.')[0]}-auth-token`
    const storedSession = localStorage.getItem(storageKey)
    console.log(`[localStorage] Session stored:`, !!storedSession)
  })
}