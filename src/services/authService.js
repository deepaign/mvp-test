// 創建新檔案：src/services/authService.js
import { supabase } from '../supabase'

export class AuthService {
  
  // 完整登出：包括撤銷 Google OAuth 授權
  static async completeLogout() {
    try {
      console.log('開始完整登出流程...')
      
      // 步驟1：獲取當前 session（可能包含 provider_token）
      const { data: sessionData } = await supabase.auth.getSession()
      const session = sessionData?.session
      
      // 步驟2：如果有 Google provider_token，撤銷 Google OAuth 授權
      if (session?.provider_token) {
        try {
          console.log('撤銷 Google OAuth 授權...')
          
          // 撤銷 Google OAuth 授權
          await fetch(`https://oauth2.googleapis.com/revoke?token=${session.provider_token}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          })
          
          console.log('Google OAuth 授權已撤銷')
        } catch (error) {
          console.warn('撤銷 Google OAuth 授權失敗，但繼續登出流程:', error)
        }
      }
      
      // 步驟3：從 Supabase 登出
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Supabase 登出失敗:', error)
        throw error
      }
      
      console.log('Supabase 登出成功')
      
      // 步驟4：清除瀏覽器中相關的儲存資料
      try {
        // 清除可能的 OAuth 相關 cookies 和 localStorage
        localStorage.removeItem('supabase.auth.token')
        sessionStorage.clear()
        
        // 清除 Google 相關的 cookies（如果有的話）
        document.cookie.split(";").forEach(function(c) { 
          document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/") 
        })
        
        console.log('本地儲存已清除')
      } catch (error) {
        console.warn('清除本地儲存時發生錯誤:', error)
      }
      
      return { success: true }
      
    } catch (error) {
      console.error('完整登出失敗:', error)
      return { success: false, error: error.message }
    }
  }
  
  // 快速登出：只從 Supabase 登出
  static async quickLogout() {
    try {
      console.log('執行快速登出...')
      
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      console.log('快速登出成功')
      return { success: true }
      
    } catch (error) {
      console.error('快速登出失敗:', error)
      return { success: false, error: error.message }
    }
  }
}