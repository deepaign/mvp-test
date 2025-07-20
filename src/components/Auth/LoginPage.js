// 修正後的 LoginPage.js - 解決 Google OAuth 400 錯誤
// 檔案位置: src/components/Auth/LoginPage.js

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
      
      // 修正後的 Google OAuth 設定
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          // 修正：使用標準的 scopes 設定
          scopes: 'openid email profile https://www.googleapis.com/auth/calendar',
          queryParams: {
            // 移除衝突的參數，只保留 prompt
            prompt: 'consent select_account',
            access_type: 'offline',
            include_granted_scopes: 'false'
            // 移除 approval_prompt（已棄用）
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
      } else if (err.message?.includes('invalid_request')) {
        errorMessage = 'OAuth 設定錯誤，請聯繫管理員檢查 Google OAuth 設定';
      } else if (err.message?.includes('unauthorized_client')) {
        errorMessage = '應用程式未獲得授權，請聯繫管理員';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '40px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
        width: '100%',
        maxWidth: '420px',
        textAlign: 'center'
      }}>
        
        {/* 返回首頁按鈕 */}
        {onBackToHome && (
          <button
            onClick={onBackToHome}
            style={{
              position: 'absolute',
              top: '20px',
              left: '20px',
              background: 'rgba(255,255,255,0.9)',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 15px',
              fontSize: '14px',
              cursor: 'pointer',
              color: '#555',
              transition: 'all 0.3s ease'
            }}
          >
            ← 返回首頁
          </button>
        )}

        {/* 標題 */}
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
            <li>🔄 <strong>即時同步</strong> - 直接在 Google Calendar 中管理事件</li>
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
                border: '2px solid rgba(255,255,255,0.3)',
                borderTop: '2px solid white',
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

        {/* 說明文字 */}
        <p style={{
          color: '#95a5a6',
          fontSize: '13px',
          marginTop: '20px',
          lineHeight: '1.4'
        }}>
          點擊登入即表示您同意我們的服務條款和隱私政策。<br/>
          我們只會存取您授權的 Google 服務功能。
        </p>
      </div>

      {/* 載入動畫的 CSS */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default LoginPage;