import React from 'react'
import { supabase } from '../../supabase'

function RoleSelection({ user, onRoleSelect, onBackToLogin }) {
  const handleSwitchAccount = async () => {
    try {
      console.log('切換 Google 帳號...')
      // 先登出當前帳號
      await supabase.auth.signOut()
      // 導航回登入頁面
      onBackToLogin()
    } catch (error) {
      console.error('切換帳號失敗:', error)
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
      padding: '10px',
      boxSizing: 'border-box',
      overflow: 'hidden'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
        padding: '22px',
        width: '100%',
        maxWidth: '700px',
        textAlign: 'center',
        height: 'fit-content',
        maxHeight: '90vh',
        overflow: 'hidden' // 防止內部捲動
      }}>
        <div style={{ marginBottom: '25px' }}>
          <h1 style={{ fontSize: '1.8rem', color: '#333', marginBottom: '8px', margin: '0 0 8px 0' }}>歡迎使用 Polify！</h1>
          <p style={{ color: '#666', marginBottom: '8px', fontSize: '0.9rem', margin: '0 0 8px 0' }}>您好，{user?.user_metadata?.full_name || user?.email}</p>
          <p style={{ color: '#888', fontSize: '0.85rem', margin: '0' }}>請選擇您的身份以完成註冊</p>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: window.innerWidth > 768 ? '1fr 1fr' : '1fr',
          gap: '15px', 
          margin: '20px 0' 
        }}>
          <div 
            onClick={() => onRoleSelect('politician')}
            style={{
              border: '2px solid #e1e5e9',
              borderRadius: '10px',
              padding: '18px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              overflow: 'hidden' // 防止內容溢出
            }}
            onMouseEnter={(e) => {
              e.target.style.borderColor = '#667eea'
              e.target.style.transform = 'translateY(-2px)'
              e.target.style.boxShadow = '0 8px 24px rgba(102, 126, 234, 0.15)'
            }}
            onMouseLeave={(e) => {
              e.target.style.borderColor = '#e1e5e9'
              e.target.style.transform = 'translateY(0px)'
              e.target.style.boxShadow = 'none'
            }}
          >
            <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>🏛️</div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '600', marginBottom: '5px', color: '#333', margin: '0 0 6px 0' }}>政治人物</h3>
            <p style={{ color: '#666', marginBottom: '10px', fontSize: '0.875rem', margin: '0 0 10px 0' }}>市議員、立法委員、縣市長等民意代表</p>
            <ul style={{ listStyle: 'none', padding: 0, textAlign: 'left', margin: 0 }}>
              <li style={{ color: '#555', fontSize: '0.7rem', marginBottom: '2px', paddingLeft: '25px', position: 'relative' }}>
                <span style={{ position: 'absolute', left: '10px', color: '#4caf50', fontWeight: 'bold' }}>✓</span>
                案件管理與追蹤
              </li>
              <li style={{ color: '#555', fontSize: '0.7rem', marginBottom: '2px', paddingLeft: '25px', position: 'relative' }}>
                <span style={{ position: 'absolute', left: '10px', color: '#4caf50', fontWeight: 'bold' }}>✓</span>
                選民資料分析
              </li>
              <li style={{ color: '#555', fontSize: '0.7rem', marginBottom: '2px', paddingLeft: '25px', position: 'relative' }}>
                <span style={{ position: 'absolute', left: '10px', color: '#4caf50', fontWeight: 'bold' }}>✓</span>
                政績展示工具
              </li>
              <li style={{ color: '#555', fontSize: '0.7rem', marginBottom: '0', paddingLeft: '25px', position: 'relative' }}>
                <span style={{ position: 'absolute', left: '10px', color: '#4caf50', fontWeight: 'bold' }}>✓</span>
                團隊協作管理
              </li>
            </ul>
          </div>

          <div 
            onClick={() => onRoleSelect('staff')}
            style={{
              border: '2px solid #e1e5e9',
              borderRadius: '10px',
              padding: '18px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              overflow: 'hidden' // 防止內容溢出
            }}
            onMouseEnter={(e) => {
              e.target.style.borderColor = '#f093fb'
              e.target.style.transform = 'translateY(-2px)'
              e.target.style.boxShadow = '0 8px 24px rgba(240, 147, 251, 0.15)'
            }}
            onMouseLeave={(e) => {
              e.target.style.borderColor = '#e1e5e9'
              e.target.style.transform = 'translateY(0px)'
              e.target.style.boxShadow = 'none'
            }}
          >
            <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>👥</div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '600', marginBottom: '5px', color: '#333', margin: '0 0 6px 0' }}>幕僚助理</h3>
            <p style={{ color: '#666', marginBottom: '10px', fontSize: '0.875rem', margin: '0 0 10px 0' }}>政治人物的助理、主任、專員等工作人員</p>
            <ul style={{ listStyle: 'none', padding: 0, textAlign: 'left', margin: 0 }}>
              <li style={{ color: '#555', fontSize: '0.7rem', marginBottom: '2px', paddingLeft: '25px', position: 'relative' }}>
                <span style={{ position: 'absolute', left: '10px', color: '#4caf50', fontWeight: 'bold' }}>✓</span>
                協助處理選民陳情
              </li>
              <li style={{ color: '#555', fontSize: '0.7rem', marginBottom: '2px', paddingLeft: '25px', position: 'relative' }}>
                <span style={{ position: 'absolute', left: '10px', color: '#4caf50', fontWeight: 'bold' }}>✓</span>
                案件分派與追蹤
              </li>
              <li style={{ color: '#555', fontSize: '0.7rem', marginBottom: '2px', paddingLeft: '25px', position: 'relative' }}>
                <span style={{ position: 'absolute', left: '10px', color: '#4caf50', fontWeight: 'bold' }}>✓</span>
                行程安排管理
              </li>
              <li style={{ color: '#555', fontSize: '0.7rem', marginBottom: '0', paddingLeft: '25px', position: 'relative' }}>
                <span style={{ position: 'absolute', left: '10px', color: '#4caf50', fontWeight: 'bold' }}>✓</span>
                資料整理分析
              </li>
            </ul>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '12px', margin: '0 0 12px 0' }}>選擇身份後，您可以隨時在設定中修改</p>
          
          {/* 切換帳號按鈕 */}
          <button
            onClick={handleSwitchAccount}
            style={{
              background: 'transparent',
              border: '1.7px solid #ddd',
              borderRadius: '6px',
              padding: '5px 10px',
              fontSize: '12px',
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
            切換 Google 帳號
          </button>
        </div>
      </div>
    </div>
  )
}

export default RoleSelection