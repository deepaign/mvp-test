// ============================================================================
// 改善後的登入頁面
// 檔案位置: src/components/Auth/LoginPage.js
// ============================================================================

import React, { useState } from 'react';
import { supabase } from '../../supabase';

function LoginPage({ onBackToHome }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError('');

      console.log('開始 Google 登入...');
      
      // 改善後的 Google OAuth 設定
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          // 確保包含 Calendar 權限
          scopes: 'openid email profile https://www.googleapis.com/auth/calendar',
          queryParams: {
            prompt: 'consent select_account', // 強制顯示同意畫面和帳號選擇
            access_type: 'offline', // 必要：取得 refresh_token
            include_granted_scopes: 'false', // 不包含之前的授權範圍
            approval_prompt: 'force' // 強制重新授權（備用參數）
          }
        }
      });

      console.log('Google 登入調用結果:', { data, error });

      if (error) {
        console.error('Google 登入錯誤:', error);
        throw error;
      }

      // OAuth 會重定向，所以這裡通常不會執行到
      console.log('Google 登入成功，等待重定向...');

    } catch (err) {
      console.error('Google 登入失敗:', err);
      
      let errorMessage = '登入失敗，請稍後重試';
      
      // 根據錯誤類型提供更具體的錯誤訊息
      if (err.message?.includes('signInWithOAuth')) {
        errorMessage = 'Google 登入設定有問題，請聯繫管理員';
      } else if (err.message?.includes('network')) {
        errorMessage = '網路連接問題，請檢查網路連接';
      } else if (err.message?.includes('popup')) {
        errorMessage = '彈出視窗被封鎖，請允許彈出視窗或重試';
      } else if (err.message) {
        errorMessage = `登入錯誤：${err.message}`;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      width: '100vw',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px',
      boxSizing: 'border-box',
      overflow: 'hidden'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
        padding: '40px',
        width: '100%',
        maxWidth: '450px',
        textAlign: 'center',
        position: 'relative',
        maxHeight: '90vh',
        overflow: 'auto'
      }}>
        {/* 回到首頁按鈕 */}
        <button
          onClick={onBackToHome}
          style={{
            position: 'absolute',
            top: '15px',
            left: '15px',
            background: 'transparent',
            border: '1.5px solid #ddd',
            borderRadius: '6px',
            padding: '8px 12px',
            fontSize: '12px',
            color: '#666',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.borderColor = '#667eea';
            e.target.style.color = '#667eea';
          }}
          onMouseLeave={(e) => {
            e.target.style.borderColor = '#ddd';
            e.target.style.color = '#666';
          }}
        >
          ← 回首頁
        </button>

        {/* 主標題 */}
        <h1 style={{
          color: '#2c3e50',
          marginBottom: '10px',
          fontSize: '28px',
          fontWeight: '700'
        }}>
          政治助理系統
        </h1>

        <p style={{
          color: '#7f8c8d',
          marginBottom: '30px',
          fontSize: '16px',
          lineHeight: '1.5'
        }}>
          使用 Google 帳號登入，享受完整的行事曆整合功能
        </p>

        {/* 功能說明 */}
        <div style={{
          background: '#f8f9fa',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '30px',
          textAlign: 'left'
        }}>
          <h3 style={{
            color: '#2c3e50',
            marginBottom: '15px',
            fontSize: '18px',
            fontWeight: '600'
          }}>
            登入後您可以：
          </h3>
          <ul style={{
            color: '#555',
            fontSize: '14px',
            lineHeight: '1.8',
            paddingLeft: '20px'
          }}>
            <li>📅 <strong>一鍵建立行事曆事件</strong> - 記錄案件時自動同步到 Google Calendar</li>
            <li>🔄 <strong>雙向同步</strong> - 行事曆變更自動更新到系統</li>
            <li>⚡ <strong>快速操作</strong> - 無需重複授權，一次登入長期使用</li>
            <li>🔒 <strong>安全可靠</strong> - 使用 Google OAuth 2.0 加密保護</li>
          </ul>
        </div>

        {/* 錯誤訊息 */}
        {error && (
          <div style={{
            background: '#ffebee',
            color: '#c62828',
            padding: '15px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '14px',
            border: '1px solid #ffcdd2'
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Google 登入按鈕 */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          style={{
            width: '100%',
            backgroundColor: loading ? '#ccc' : '#4285f4',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '15px 20px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            boxShadow: loading ? 'none' : '0 2px 4px rgba(0,0,0,0.2)'
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              e.target.style.backgroundColor = '#357ae8';
              e.target.style.transform = 'translateY(-1px)';
            }
          }}
          onMouseLeave={(e) => {
            if (!loading) {
              e.target.style.backgroundColor = '#4285f4';
              e.target.style.transform = 'translateY(0)';
            }
          }}
        >
          {loading ? (
            <>
              <div style={{
                width: '20px',
                height: '20px',
                border: '2px solid #ffffff',
                borderTop: '2px solid transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
              正在登入...
            </>
          ) : (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              使用 Google 帳號登入
            </>
          )}
        </button>

        {/* 授權說明 */}
        <div style={{
          marginTop: '25px',
          padding: '20px',
          background: '#e8f4fd',
          borderRadius: '8px',
          border: '1px solid #b3d4fc'
        }}>
          <h4 style={{
            color: '#1565c0',
            marginBottom: '10px',
            fontSize: '16px',
            fontWeight: '600'
          }}>
            🔐 授權說明
          </h4>
          <p style={{
            color: '#1976d2',
            fontSize: '13px',
            lineHeight: '1.6',
            margin: 0
          }}>
            點擊登入後，系統將請求存取您的 Google Calendar 權限。
            <br />
            這是為了讓您能夠一鍵建立行事曆事件，提升工作效率。
            <br />
            <strong>我們承諾不會存取您的其他 Google 服務資料。</strong>
          </p>
        </div>

        {/* 技術說明 */}
        <div style={{
          marginTop: '20px',
          fontSize: '12px',
          color: '#95a5a6',
          lineHeight: '1.5'
        }}>
          <p>
            使用 OAuth 2.0 安全協議 • 支援 offline access_type
            <br />
            登入一次，長期使用 • 符合資料保護法規
          </p>
        </div>

        {/* CSS 動畫 */}
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}

export default LoginPage;