// 更新的 src/components/Team/StaffInviteInput.js
import React, { useState, useEffect } from 'react'
import { TeamService } from '../../services/teamService'
import LogoutButton from '../Common/LogoutButton'

function StaffInviteInput({ user, onTeamJoined, onBack, onLogout }) {
  const [inviteCode, setInviteCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [teamPreview, setTeamPreview] = useState(null)
  const [invitationInfo, setInvitationInfo] = useState(null)
  const [validating, setValidating] = useState(false)

  // 確保頁面可以滾動
  useEffect(() => {
    // 強制設置頁面可以滾動
    document.body.style.overflow = 'auto'
    document.documentElement.style.overflow = 'auto'
    document.body.style.height = 'auto'
    document.documentElement.style.height = 'auto'
    
    // 移除可能影響滾動的 CSS 類
    document.body.classList.remove('no-scroll')
    document.documentElement.classList.remove('no-scroll')
    
    return () => {
      // 清理時恢復預設
      document.body.style.overflow = ''
      document.documentElement.style.overflow = ''
      document.body.style.height = ''
      document.documentElement.style.height = ''
    }
  }, [])

  // 驗證邀請碼格式
  const validateCodeFormat = (code) => {
    return /^[A-Z0-9]{6}$/.test(code.toUpperCase())
  }

  // 處理輸入變化
  const handleInputChange = (e) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
    setInviteCode(value)
    setError('')
    
    // 如果輸入6位就自動驗證
    if (value.length === 6 && validateCodeFormat(value)) {
      previewTeam(value)
    } else {
      setTeamPreview(null)
      setInvitationInfo(null)
    }
  }

  // 預覽團隊資訊
  const previewTeam = async (code) => {
    try {
      setValidating(true)
      const result = await TeamService.validateInviteCode(code)
      
      if (result.valid) {
        setTeamPreview(result.team)
        setInvitationInfo(result.invitation)
        setError('')
      } else {
        setTeamPreview(null)
        setInvitationInfo(null)
        setError(result.message)
      }
    } catch (error) {
      console.error('預覽團隊失敗:', error)
      setTeamPreview(null)
      setInvitationInfo(null)
    } finally {
      setValidating(false)
    }
  }

  // 加入團隊
  const handleJoinTeam = async () => {
    if (!inviteCode || !validateCodeFormat(inviteCode)) {
      setError('請輸入有效的6位邀請碼')
      return
    }

    setLoading(true)
    setError('')

    try {
      console.log('🚀 開始加入團隊流程...')
      console.log('邀請碼:', inviteCode)
      console.log('用戶資訊:', {
        id: user.id,
        name: user.user_metadata?.full_name,
        email: user.email
      })

      const result = await TeamService.joinTeamWithInviteCode(
        inviteCode,
        user.id,
        user.user_metadata?.full_name || '',
        user.email
      )

      console.log('💫 加入團隊結果:', result)

      if (result.success) {
        console.log('✅ 加入團隊成功!')
        console.log('成員資料:', result.member)
        console.log('團隊資料:', result.team)
        
        // 顯示成功提示
        alert(`🎉 ${result.message}`)
        
        // 修正：傳遞正確的參數格式給 onTeamJoined
        if (onTeamJoined && typeof onTeamJoined === 'function') {
          console.log('🔄 調用 onTeamJoined 回調函數...')
          
          // 傳遞整個 result 物件，而不是分離的參數
          onTeamJoined(result)
          
        } else {
          console.error('❌ onTeamJoined 回調函數不存在或不是函數')
          console.error('onTeamJoined 類型:', typeof onTeamJoined)
          console.error('onTeamJoined 值:', onTeamJoined)
        }
        
      } else {
        console.error('❌ 加入團隊失敗:', result.message)
        setError(result.message || '加入團隊失敗，請稍後重試')
      }

    } catch (error) {
      console.error('❌ 加入團隊異常:', error)
      
      let errorMessage = '加入團隊失敗，請稍後重試'
      
      if (error.message?.includes('duplicate key')) {
        errorMessage = '您可能已經是團隊成員，請刷新頁面重試'
      } else if (error.message?.includes('not authenticated')) {
        errorMessage = '登入狀態已過期，請重新登入'
      } else if (error.message?.includes('network')) {
        errorMessage = '網路連接異常，請檢查網路連接'
      } else if (error.message) {
        errorMessage = `錯誤：${error.message}`
      }
      
      setError(errorMessage)
      
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

  const getRemainingTime = (expiresAt) => {
    const now = new Date()
    const expiry = new Date(expiresAt)
    const diff = expiry - now
    
    if (diff <= 0) return '已過期'
    
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    
    if (hours > 0) {
      return `${hours}小時${minutes > 0 ? `${minutes}分鐘` : ''}`
    } else {
      return `${minutes}分鐘`
    }
  }

  const StaffInviteInputStyles = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      padding: '20px',
      paddingTop: '40px',  // 增加頂部間距
      paddingBottom: '40px', // 增加底部間距
      overflow: 'auto',    // 允許滾動
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start'  // 改為 flex-start
    },
    card: {
      background: 'white',
      borderRadius: '16px',
      padding: '40px',
      width: '100%',
      maxWidth: '500px',
      boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
      position: 'relative',
      margin: 'auto',  // 自動居中
      flexShrink: 0    // 防止被壓縮
    }
  }

   return (
    <div 
      style={{ 
        // 關鍵修正：不要設置 height 或 minHeight 為 100vh
        background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        padding: '20px',
        paddingBottom: '60px', // 確保底部有足夠空間
        // 移除 display: flex 和 alignItems，使用普通文檔流
      }}
    >
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '40px',
        width: '100%',
        maxWidth: '500px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
        position: 'relative',
        margin: '40px auto', // 使用 margin 而不是 flex 居中
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
          <div style={{ fontSize: '4rem', marginBottom: '16px' }}>🤝</div>
          <h1 style={{ fontSize: '2rem', color: '#333', marginBottom: '10px', margin: 0 }}>
            加入團隊協作！
          </h1>
          <p style={{ color: '#666', fontSize: '1rem', marginBottom: '8px' }}>
            您好，{user?.user_metadata?.full_name || user?.email}
          </p>
          <p style={{ color: '#888', fontSize: '0.9rem', lineHeight: '1.4' }}>
            請輸入政治人物提供給您的<strong>6位邀請碼</strong>來加入工作團隊
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

        {/* 邀請碼輸入區域 */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '12px', 
            fontWeight: '600', 
            color: '#333',
            fontSize: '1rem'
          }}>
            團隊邀請碼
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              value={inviteCode}
              onChange={handleInputChange}
              placeholder="請輸入6位邀請碼"
              maxLength={6}
              style={{
                width: '100%',
                padding: '20px',
                border: `3px solid ${error ? '#e74c3c' : (teamPreview ? '#28a745' : '#ddd')}`,
                borderRadius: '12px',
                fontSize: '1.4rem',
                fontWeight: '600',
                textAlign: 'center',
                letterSpacing: '4px',
                textTransform: 'uppercase',
                outline: 'none',
                transition: 'all 0.3s ease',
                fontFamily: 'Monaco, Consolas, monospace',
                boxSizing: 'border-box'
              }}
            />
            {validating && (
              <div style={{
                position: 'absolute',
                right: '15px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '20px',
                height: '20px',
                border: '2px solid #ccc',
                borderTop: '2px solid #667eea',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
            )}
          </div>
        </div>

        {/* 團隊預覽區域 */}
        {teamPreview && invitationInfo && (
          <div style={{
            background: 'linear-gradient(135deg, #e8f5e8 0%, #f0f8f0 100%)',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '20px',
            border: '2px solid #28a745'
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              marginBottom: '16px' 
            }}>
              <div style={{ fontSize: '2rem', marginRight: '12px' }}>✅</div>
              <div>
                <h3 style={{ 
                  color: '#28a745', 
                  margin: '0 0 4px 0',
                  fontSize: '1.1rem',
                  fontWeight: '600'
                }}>
                  找到有效的邀請碼！
                </h3>
                <p style={{ 
                  color: '#666', 
                  margin: 0,
                  fontSize: '0.9rem'
                }}>
                  確認加入以下團隊
                </p>
              </div>
            </div>
            
            <div style={{
              background: 'white',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ width: '20px', textAlign: 'center' }}>🏛️</span>
                <strong style={{ marginRight: '8px' }}>團隊名稱:</strong>
                {teamPreview.name}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ width: '20px', textAlign: 'center' }}>👤</span>
                <strong style={{ marginRight: '8px' }}>政治人物:</strong>
                {teamPreview.politician_name}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ width: '20px', textAlign: 'center' }}>💼</span>
                <strong style={{ marginRight: '8px' }}>職位:</strong>
                {getPositionLabel(teamPreview.position)}
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ width: '20px', textAlign: 'center' }}>📍</span>
                <strong style={{ marginRight: '8px' }}>服務地區:</strong>
                {teamPreview.county} {teamPreview.district && `${teamPreview.district}`}
              </div>
              
              {/* 邀請碼資訊 */}
              <div style={{ 
                marginTop: '16px', 
                padding: '12px', 
                background: 'rgba(240, 147, 251, 0.1)', 
                borderRadius: '8px',
                border: '1px solid rgba(240, 147, 251, 0.3)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ width: '20px', textAlign: 'center' }}>⏰</span>
                  <strong style={{ marginRight: '8px' }}>有效期限:</strong>
                  <span style={{ color: '#d81b60', fontWeight: '500' }}>
                    {getRemainingTime(invitationInfo.expires_at)}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ width: '20px', textAlign: 'center' }}>👥</span>
                  <strong style={{ marginRight: '8px' }}>剩餘使用次數:</strong>
                  <span style={{ color: '#d81b60', fontWeight: '500' }}>
                    {invitationInfo.max_uses - invitationInfo.current_uses}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 加入按鈕 */}
        <button
          onClick={handleJoinTeam}
          disabled={loading || !teamPreview || inviteCode.length !== 6}
          style={{
            width: '100%',
            background: loading || !teamPreview || inviteCode.length !== 6 
              ? '#ccc' 
              : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            padding: '18px',
            fontSize: '1.1rem',
            fontWeight: '600',
            cursor: loading || !teamPreview || inviteCode.length !== 6 
              ? 'not-allowed' 
              : 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: loading || !teamPreview || inviteCode.length !== 6 
              ? 'none' 
              : '0 4px 16px rgba(240, 147, 251, 0.3)'
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
            💡 <strong>邀請碼由團隊負責人生成</strong>
          </p>
          <p style={{ fontSize: '0.8rem', color: '#666', margin: '0 0 8px 0' }}>
            如果沒有邀請碼，請聯繫您的政治人物
          </p>
          <p style={{ fontSize: '0.8rem', color: '#666', margin: 0 }}>
            如有技術問題請聯繫 Polify 支援團隊
          </p>
        </div>

        {/* 添加旋轉動畫 */}
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
      
      {/* 額外的底部間距確保內容不會被截斷 */}
      <div style={{ height: '40px' }}></div>
    </div>
  )
}

export default StaffInviteInput