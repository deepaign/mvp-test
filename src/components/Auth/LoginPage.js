import React, { useState } from 'react'
import { supabase } from '../../supabase'

function LoginPage({ onBackToHome }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleGoogleLogin = async () => {
    try {
      setLoading(true)
      setError('')

      console.log('開始 Google 登入...')
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account', // 強制顯示帳號選擇
          }
        }
      })

      console.log('Google 登入調用結果:', { data, error })

      if (error) {
        console.error('Google 登入錯誤:', error)
        throw error
      }

      // OAuth 會重定向，所以這裡通常不會執行到
      console.log('Google 登入成功，等待重定向...')

    } catch (err) {
      console.error('Google 登入失敗:', err)
      
      let errorMessage = '登入失敗，請稍後重試'
      
      // 根據錯誤類型提供更具體的錯誤訊息
      if (err.message?.includes('signInWithOAuth')) {
        errorMessage = 'Google 登入設定有問題，請檢查 Supabase OAuth 設定'
      } else if (err.message?.includes('network')) {
        errorMessage = '網路連接問題，請檢查網路連接'
      } else if (err.message) {
        errorMessage = `登入錯誤：${err.message}`
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

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
        padding: '30px',
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
            padding: '5px 8px',
            fontSize: '11px',
            color: '#666',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.borderColor = '#667eea'
            e.target.style.color = '#667eea'
          }}
          onMouseLeave={(e) => {
            e.target.style.borderColor = '#ddd'
            e.target.style.color = '#666'
          }}
        >
          回首頁
        </button>

        <div style={{ marginBottom: '25px', marginTop: '15px' }}>
          <h1 style={{ fontSize: '2.2rem', color: '#333', marginBottom: '8px', fontWeight: '700' }}>
            Polify
          </h1>
          <h2 style={{ fontSize: '1.3rem', color: '#666', marginBottom: '8px', fontWeight: '400' }}>
            智能選服幕僚系統
          </h2>
          <p style={{ color: '#888', fontSize: '0.9rem', lineHeight: '1.4' }}>
            專為政治人物打造的一站式數位服務平台
          </p>
        </div>

        <div>
          {error && (
            <div style={{
              background: '#fee',
              border: '1px solid #fcc',
              color: '#e74c3c',
              padding: '10px 14px',
              borderRadius: '6px',
              marginBottom: '18px',
              fontSize: '0.8rem'
            }}>
              {error}
            </div>
          )}

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            style={{
              width: '100%',
              background: 'white',
              border: '2px solid #ddd',
              borderRadius: '8px',
              padding: '14px 20px',
              fontSize: '15px',
              fontWeight: '500',
              color: '#333',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              margin: '18px 0',
              opacity: loading ? 0.6 : 1,
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.target.style.borderColor = '#4285f4'
                e.target.style.boxShadow = '0 4px 12px rgba(66, 133, 244, 0.15)'
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.target.style.borderColor = '#ddd'
                e.target.style.boxShadow = 'none'
              }
            }}
          >
            {loading ? (
              <span>登入中...</span>
            ) : (
              <>
                <svg style={{ width: '18px', height: '18px' }} viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                使用 Google 帳號登入
              </>
            )}
          </button>

          <div style={{ textAlign: 'center', marginTop: '25px' }}>
            <p style={{ fontSize: '0.8rem', color: '#666' }}>
              登入即表示您同意我們的服務條款和隱私政策
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage