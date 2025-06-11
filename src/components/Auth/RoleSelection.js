import React from 'react'

function RoleSelection({ user, onRoleSelect }) {
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
        padding: '40px',
        width: '100%',
        maxWidth: '700px',
        textAlign: 'center'
      }}>
        <div style={{ marginBottom: '30px' }}>
          <h1 style={{ fontSize: '2rem', color: '#333', marginBottom: '10px' }}>歡迎使用 Polify！</h1>
          <p style={{ color: '#666', marginBottom: '10px' }}>您好，{user?.user_metadata?.full_name || user?.email}</p>
          <p style={{ color: '#888' }}>請選擇您的身份以完成註冊</p>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: '20px', 
          margin: '30px 0' 
        }}>
          <div 
            onClick={() => onRoleSelect('politician')}
            style={{
              border: '2px solid #e1e5e9',
              borderRadius: '12px',
              padding: '24px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
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
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🏛️</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '8px', color: '#333' }}>政治人物</h3>
            <p style={{ color: '#666', marginBottom: '16px', fontSize: '0.875rem' }}>市議員、立法委員、縣市長等民意代表</p>
            <ul style={{ listStyle: 'none', padding: 0, textAlign: 'left' }}>
              <li style={{ color: '#555', fontSize: '0.875rem', marginBottom: '4px', paddingLeft: '16px', position: 'relative' }}>
                <span style={{ position: 'absolute', left: 0, color: '#4caf50', fontWeight: 'bold' }}>✓</span>
                案件管理與追蹤
              </li>
              <li style={{ color: '#555', fontSize: '0.875rem', marginBottom: '4px', paddingLeft: '16px', position: 'relative' }}>
                <span style={{ position: 'absolute', left: 0, color: '#4caf50', fontWeight: 'bold' }}>✓</span>
                選民資料分析
              </li>
              <li style={{ color: '#555', fontSize: '0.875rem', marginBottom: '4px', paddingLeft: '16px', position: 'relative' }}>
                <span style={{ position: 'absolute', left: 0, color: '#4caf50', fontWeight: 'bold' }}>✓</span>
                政績展示工具
              </li>
              <li style={{ color: '#555', fontSize: '0.875rem', marginBottom: '4px', paddingLeft: '16px', position: 'relative' }}>
                <span style={{ position: 'absolute', left: 0, color: '#4caf50', fontWeight: 'bold' }}>✓</span>
                團隊協作管理
              </li>
            </ul>
          </div>

          <div 
            onClick={() => onRoleSelect('staff')}
            style={{
              border: '2px solid #e1e5e9',
              borderRadius: '12px',
              padding: '24px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
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
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>👥</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '8px', color: '#333' }}>幕僚助理</h3>
            <p style={{ color: '#666', marginBottom: '16px', fontSize: '0.875rem' }}>政治人物的助理、主任、專員等工作人員</p>
            <ul style={{ listStyle: 'none', padding: 0, textAlign: 'left' }}>
              <li style={{ color: '#555', fontSize: '0.875rem', marginBottom: '4px', paddingLeft: '16px', position: 'relative' }}>
                <span style={{ position: 'absolute', left: 0, color: '#4caf50', fontWeight: 'bold' }}>✓</span>
                協助處理選民陳情
              </li>
              <li style={{ color: '#555', fontSize: '0.875rem', marginBottom: '4px', paddingLeft: '16px', position: 'relative' }}>
                <span style={{ position: 'absolute', left: 0, color: '#4caf50', fontWeight: 'bold' }}>✓</span>
                案件分派與追蹤
              </li>
              <li style={{ color: '#555', fontSize: '0.875rem', marginBottom: '4px', paddingLeft: '16px', position: 'relative' }}>
                <span style={{ position: 'absolute', left: 0, color: '#4caf50', fontWeight: 'bold' }}>✓</span>
                行程安排管理
              </li>
              <li style={{ color: '#555', fontSize: '0.875rem', marginBottom: '4px', paddingLeft: '16px', position: 'relative' }}>
                <span style={{ position: 'absolute', left: 0, color: '#4caf50', fontWeight: 'bold' }}>✓</span>
                資料整理分析
              </li>
            </ul>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '30px' }}>
          <p style={{ fontSize: '0.875rem', color: '#666' }}>選擇身份後，您可以隨時在設定中修改</p>
        </div>
      </div>
    </div>
  )
}

export default RoleSelection