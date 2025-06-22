// 更新的 src/components/Team/JoinTeamSelection.js
import React from 'react'
import LogoutButton from '../Common/LogoutButton'

function JoinTeamSelection({ user, onSelectJoinMethod, onLogout }) {
  
  const handleSelectRegistrationCode = () => {
    onSelectJoinMethod('registrationCode')
  }

  const handleSelectInviteCode = () => {
    onSelectJoinMethod('inviteCode')
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
        maxWidth: '600px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
        position: 'relative'
      }}>
        {/* 登出按鈕 */}
        <div style={{
          position: 'absolute',
          top: '15px',
          right: '15px'
        }}>
          <LogoutButton 
            onLogout={onLogout}
            variant="minimal"
            size="small"
          />
        </div>

        {/* 頭部區域 */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ fontSize: '4rem', marginBottom: '16px' }}>🏛️</div>
          <h1 style={{ fontSize: '2rem', color: '#333', marginBottom: '10px', margin: 0 }}>
            歡迎使用 Polify！
          </h1>
          <p style={{ color: '#666', fontSize: '1rem', marginBottom: '8px' }}>
            您好，{user?.user_metadata?.full_name || user?.email}
          </p>
          <p style={{ color: '#888', fontSize: '0.95rem', lineHeight: '1.4' }}>
            請選擇您的加入方式
          </p>
        </div>

        {/* 選擇區域 */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: window.innerWidth > 768 ? '1fr 1fr' : '1fr',
          gap: '20px',
          marginBottom: '30px'
        }}>
          {/* 政治人物選項 */}
          <div 
            onClick={handleSelectRegistrationCode}
            style={{
              border: '2px solid #e1e5e9',
              borderRadius: '12px',
              padding: '24px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              background: 'linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 5%)',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#667eea'
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(102, 126, 234, 0.15)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e1e5e9'
              e.currentTarget.style.transform = 'translateY(0px)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🏛️</div>
            <h3 style={{ 
              fontSize: '1.3rem', 
              fontWeight: '600', 
              marginBottom: '12px', 
              color: '#333', 
              margin: '0 0 12px 0' 
            }}>
              我是政治人物
            </h3>
            <p style={{ 
              color: '#666', 
              marginBottom: '16px', 
              fontSize: '0.9rem', 
              margin: '0 0 16px 0',
              lineHeight: '1.4'
            }}>
              市議員、立法委員、縣市長等民意代表
            </p>
            
            <div style={{
              background: 'rgba(102, 126, 234, 0.1)',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '16px',
              textAlign: 'left'
            }}>
              <p style={{ 
                fontSize: '0.8rem', 
                color: '#667eea', 
                fontWeight: '600',
                margin: '0 0 8px 0'
              }}>
                您需要：
              </p>
              <p style={{ 
                fontSize: '0.8rem', 
                color: '#555',
                margin: 0,
                lineHeight: '1.4'
              }}>
                • 8位團隊註冊碼<br/>
                • 由 Polify 工程團隊提供
              </p>
            </div>

            <div style={{
              background: '#667eea',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '0.85rem',
              fontWeight: '500',
              display: 'inline-block'
            }}>
              使用註冊碼加入
            </div>
          </div>

          {/* 幕僚助理選項 */}
          <div 
            onClick={handleSelectInviteCode}
            style={{
              border: '2px solid #e1e5e9',
              borderRadius: '12px',
              padding: '24px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              background: 'linear-gradient(135deg, #fff3e0 0%, #fce4ec 5%)',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#f093fb'
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(240, 147, 251, 0.15)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e1e5e9'
              e.currentTarget.style.transform = 'translateY(0px)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🤝</div>
            <h3 style={{ 
              fontSize: '1.3rem', 
              fontWeight: '600', 
              marginBottom: '12px', 
              color: '#333', 
              margin: '0 0 12px 0' 
            }}>
              我是幕僚助理
            </h3>
            <p style={{ 
              color: '#666', 
              marginBottom: '16px', 
              fontSize: '0.9rem', 
              margin: '0 0 16px 0',
              lineHeight: '1.4'
            }}>
              政治人物的助理、主任、專員等工作人員
            </p>
            
            <div style={{
              background: 'rgba(240, 147, 251, 0.1)',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '16px',
              textAlign: 'left'
            }}>
              <p style={{ 
                fontSize: '0.8rem', 
                color: '#f093fb', 
                fontWeight: '600',
                margin: '0 0 8px 0'
              }}>
                您需要：
              </p>
              <p style={{ 
                fontSize: '0.8rem', 
                color: '#555',
                margin: 0,
                lineHeight: '1.4'
              }}>
                • 6位團隊邀請碼<br/>
                • 由您的政治人物提供
              </p>
            </div>

            <div style={{
              background: '#f093fb',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '0.85rem',
              fontWeight: '500',
              display: 'inline-block'
            }}>
              使用邀請碼加入
            </div>
          </div>
        </div>

        {/* 說明區域 */}
        <div style={{ 
          textAlign: 'center', 
          padding: '20px',
          background: '#f8f9fa',
          borderRadius: '8px'
        }}>
          <p style={{ fontSize: '0.85rem', color: '#666', margin: '0 0 8px 0' }}>
            💡 <strong>不確定自己的身份？</strong>
          </p>
          <p style={{ fontSize: '0.8rem', color: '#666', margin: '0 0 8px 0' }}>
            如果您是<strong>民意代表本人</strong>，請選擇「政治人物」
          </p>
          <p style={{ fontSize: '0.8rem', color: '#666', margin: 0 }}>
            如果您是<strong>協助處理選民服務的工作人員</strong>，請選擇「幕僚助理」
          </p>
        </div>
      </div>
    </div>
  )
}

export default JoinTeamSelection