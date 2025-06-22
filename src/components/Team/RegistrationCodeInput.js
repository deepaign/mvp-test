// 更新的 src/components/Team/RegistrationCodeInput.js
import React, { useState } from 'react'
import { TeamService } from '../../services/teamService'
import LogoutButton from '../Common/LogoutButton'

function RegistrationCodeInput({ user, onTeamJoined, onBack, onLogout }) {
  const [registrationCode, setRegistrationCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [teamPreview, setTeamPreview] = useState(null)
  const [validating, setValidating] = useState(false)

  // 驗證註冊碼格式
  const validateCodeFormat = (code) => {
    return /^[A-Z0-9]{8}$/.test(code.toUpperCase())
  }

  // 處理輸入變化
  const handleInputChange = (e) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
    setRegistrationCode(value)
    setError('')
    
    // 如果輸入8位就自動驗證
    if (value.length === 8 && validateCodeFormat(value)) {
      previewTeam(value)
    } else {
      setTeamPreview(null)
    }
  }

  // 預覽團隊資訊
  const previewTeam = async (code) => {
    try {
      setValidating(true)
      const result = await TeamService.validateRegistrationCode(code)
      
      if (result.valid) {
        setTeamPreview(result.team)
        setError('')
      } else {
        setTeamPreview(null)
        setError(result.message)
      }
    } catch (error) {
      console.error('預覽團隊失敗:', error)
      setTeamPreview(null)
    } finally {
      setValidating(false)
    }
  }

  // 加入團隊
  const handleJoinTeam = async () => {
    if (!registrationCode || !validateCodeFormat(registrationCode)) {
      setError('請輸入有效的8位註冊碼')
      return
    }

    setLoading(true)
    setError('')

    try {
      const result = await TeamService.joinTeamWithRegistrationCode(
        registrationCode,
        user.id,
        user.user_metadata?.full_name || '',
        user.email
      )

      if (result.success) {
        onTeamJoined(result.member, result.team)
      } else {
        setError(result.message || '加入團隊失敗')
      }
    } catch (error) {
      console.error('加入團隊失敗:', error)
      setError('加入團隊失敗，請稍後重試')
    } finally {
      setLoading(false)
    }
  }

  const getPositionLabel = (position) => {
    const labels = {
      'city_councilor': '市議員',
      'county_councilor': '縣議員',
      'legislator': '立法委員',
      'mayor': '市長',
      'county_magistrate': '縣長',
      'village_chief': '里長',
      'other': '其他'
    }
    return labels[position] || position
  }

  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '40px',
        width: '100%',
        maxWidth: '500px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
        position: 'relative'
      }}>
        {/* 返回和登出按鈕 */}
        <div style={{
          position: 'absolute',
          top: '15px',
          left: '15px',
          right: '15px',
          display: 'flex',
          justifyContent: 'space-between'
        }}>
          <button
            onClick={onBack}
            style={{
              background: 'transparent',
              border: '1.5px solid #ddd',
              borderRadius: '6px',
              padding: '5px 8px',
              fontSize: '11px',
              color: '#666',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
          >
            ← 返回
          </button>
          
          <LogoutButton 
            onLogout={onLogout}
            variant="minimal"
            size="small"
          />
        </div>

        {/* 頭部區域 */}
        <div style={{ textAlign: 'center', marginBottom: '30px', marginTop: '15px' }}>
          <div style={{ fontSize: '4rem', marginBottom: '16px' }}>🏛️</div>
          <h1 style={{ fontSize: '2rem', color: '#333', marginBottom: '10px', margin: 0 }}>
            歡迎加入 Polify！
          </h1>
          <p style={{ color: '#666', fontSize: '1rem', marginBottom: '8px' }}>
            您好，{user?.user_metadata?.full_name || user?.email}
          </p>
          <p style={{ color: '#888', fontSize: '0.9rem', lineHeight: '1.4' }}>
            請輸入我們提供給您的<strong>8位團隊註冊碼</strong>來加入您的服務團隊
          </p>
        </div>

        {/* 錯誤訊息 */}
        {error && (
          <div style={{
            background: '#fee',
            border: '1px solid #fcc',
            color: '#e74c3c',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '0.9rem',
            textAlign: 'center'
          }}>
            ❌ {error}
          </div>
        )}

        {/* 註冊碼輸入區域 */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '12px', 
            fontWeight: '600', 
            color: '#333',
            fontSize: '1rem'
          }}>
            團隊註冊碼
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              value={registrationCode}
              onChange={handleInputChange}
              placeholder="請輸入8位註冊碼"
              maxLength={8}
              style={{
                width: '100%',
                padding: '20px',
                border: `3px solid ${error ? '#e74c3c' : (teamPreview ? '#28a745' : '#e1e5e9')}`,
                borderRadius: '12px',
                fontSize: '1.5rem',
                textAlign: 'center',
                letterSpacing: '4px',
                textTransform: 'uppercase',
                fontFamily: 'monospace',
                boxSizing: 'border-box',
                fontWeight: 'bold',
                transition: 'all 0.3s ease'
              }}
              disabled={loading}
            />
            {validating && (
              <div style={{
                position: 'absolute',
                right: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '20px',
                height: '20px',
                border: '2px solid #e1e5e9',
                borderTop: '2px solid #667eea',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
            )}
          </div>
          <div style={{ 
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '8px'
          }}>
            <span style={{ fontSize: '0.8rem', color: '#888' }}>
              {registrationCode.length}/8 字元
            </span>
            {teamPreview && (
              <span style={{ fontSize: '0.8rem', color: '#28a745', fontWeight: '500' }}>
                ✅ 註冊碼有效
              </span>
            )}
          </div>
        </div>

        {/* 團隊預覽 */}
        {teamPreview && (
          <div style={{
            background: 'linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%)',
            border: '2px solid #2196f3',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '20px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              top: '-10px',
              right: '-10px',
              background: '#2196f3',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '0 0 0 12px',
              fontSize: '0.8rem',
              fontWeight: '600'
            }}>
              即將加入
            </div>
            
            <h3 style={{ 
              color: '#1976d2', 
              fontSize: '1.2rem', 
              marginBottom: '16px',
              textAlign: 'center',
              margin: '0 0 16px 0'
            }}>
              🎯 {teamPreview.name}
            </h3>
            
            <div style={{ fontSize: '0.95rem', color: '#555', lineHeight: '1.6' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ width: '20px', textAlign: 'center' }}>👤</span>
                <strong style={{ marginRight: '8px' }}>政治人物:</strong>
                {teamPreview.politician_name}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ width: '20px', textAlign: 'center' }}>🏷️</span>
                <strong style={{ marginRight: '8px' }}>職位:</strong>
                {getPositionLabel(teamPreview.position)}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ width: '20px', textAlign: 'center' }}>📍</span>
                <strong style={{ marginRight: '8px' }}>服務地區:</strong>
                {teamPreview.county} {teamPreview.district && `${teamPreview.district}`}
              </div>
              {teamPreview.phone && (
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ width: '20px', textAlign: 'center' }}>📞</span>
                  <strong style={{ marginRight: '8px' }}>辦公室電話:</strong>
                  {teamPreview.phone}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 加入按鈕 */}
        <button
          onClick={handleJoinTeam}
          disabled={loading || !teamPreview || registrationCode.length !== 8}
          style={{
            width: '100%',
            background: loading || !teamPreview || registrationCode.length !== 8 
              ? '#ccc' 
              : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            padding: '18px',
            fontSize: '1.1rem',
            fontWeight: '600',
            cursor: loading || !teamPreview || registrationCode.length !== 8 
              ? 'not-allowed' 
              : 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: loading || !teamPreview || registrationCode.length !== 8 
              ? 'none' 
              : '0 4px 16px rgba(102, 126, 234, 0.3)'
          }}
        >
          {loading ? (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <div style={{
                width: '18px',
                height: '18px',
                border: '2px solid #fff',
                borderTop: '2px solid transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
              正在加入團隊...
            </span>
          ) : '🚀 立即加入團隊'}
        </button>

        {/* 底部說明 */}
        <div style={{ 
          textAlign: 'center', 
          marginTop: '24px',
          padding: '20px',
          background: '#f8f9fa',
          borderRadius: '8px'
        }}>
          <p style={{ fontSize: '0.8rem', color: '#666', margin: '0 0 8px 0' }}>
            💡 <strong>註冊碼由 Polify 工程團隊提供</strong>
          </p>
          <p style={{ fontSize: '0.8rem', color: '#666', margin: 0 }}>
            如有問題請聯繫技術支援
          </p>
        </div>

        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  )
}

export default RegistrationCodeInput