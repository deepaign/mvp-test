// 創建新檔案：src/components/Common/LogoutButton.js
import React, { useState } from 'react'
import { AuthService } from '../../services/authService'

function LogoutButton({ 
  onLogout, 
  style = {}, 
  variant = 'primary', // 'primary', 'secondary', 'minimal'
  size = 'normal', // 'small', 'normal', 'large'
  showConfirm = true,
  revokeGoogleAuth = true // 是否撤銷 Google 授權
}) {
  const [loading, setLoading] = useState(false)

  const handleLogout = async () => {
    // 確認對話框
    if (showConfirm) {
      const confirmMessage = revokeGoogleAuth 
        ? '確定要登出嗎？\n\n登出後下次登入將需要重新選擇 Google 帳號並授權。'
        : '確定要登出嗎？'
        
      if (!window.confirm(confirmMessage)) {
        return
      }
    }

    setLoading(true)
    
    try {
      let result
      
      if (revokeGoogleAuth) {
        // 完整登出：包括撤銷 Google OAuth
        result = await AuthService.completeLogout()
      } else {
        // 快速登出：只從 Supabase 登出
        result = await AuthService.quickLogout()
      }
      
      if (result.success) {
        console.log('登出成功')
        if (onLogout) {
          onLogout()
        }
      } else {
        console.error('登出失敗:', result.error)
        alert('登出失敗，請稍後重試')
      }
      
    } catch (error) {
      console.error('登出過程發生錯誤:', error)
      alert('登出過程發生錯誤，請稍後重試')
    } finally {
      setLoading(false)
    }
  }

  // 樣式配置
  const variants = {
    primary: {
      background: '#dc3545',
      color: 'white',
      border: 'none',
      ':hover': { background: '#c82333' }
    },
    secondary: {
      background: '#6c757d',
      color: 'white', 
      border: 'none',
      ':hover': { background: '#5a6268' }
    },
    minimal: {
      background: 'transparent',
      color: '#dc3545',
      border: '1px solid #dc3545',
      ':hover': { background: '#dc3545', color: 'white' }
    }
  }

  const sizes = {
    small: { padding: '6px 12px', fontSize: '0.8rem' },
    normal: { padding: '8px 16px', fontSize: '0.875rem' },
    large: { padding: '12px 24px', fontSize: '1rem' }
  }

  const buttonStyle = {
    borderRadius: '6px',
    fontWeight: '500',
    cursor: loading ? 'not-allowed' : 'pointer',
    transition: 'all 0.3s ease',
    opacity: loading ? 0.6 : 1,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    ...variants[variant],
    ...sizes[size],
    ...style
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      style={buttonStyle}
      onMouseEnter={(e) => {
        if (!loading) {
          if (variant === 'primary') e.target.style.background = '#c82333'
          else if (variant === 'secondary') e.target.style.background = '#5a6268'
          else if (variant === 'minimal') {
            e.target.style.background = '#dc3545'
            e.target.style.color = 'white'
          }
        }
      }}
      onMouseLeave={(e) => {
        if (!loading) {
          if (variant === 'primary') e.target.style.background = '#dc3545'
          else if (variant === 'secondary') e.target.style.background = '#6c757d'
          else if (variant === 'minimal') {
            e.target.style.background = 'transparent'
            e.target.style.color = '#dc3545'
          }
        }
      }}
    >
      {loading ? (
        <>
          <div style={{
            width: '12px',
            height: '12px',
            border: '2px solid currentColor',
            borderTop: '2px solid transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          登出中...
        </>
      ) : (
        <>
          🚪 登出
        </>
      )}
      
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </button>
  )
}

export default LogoutButton