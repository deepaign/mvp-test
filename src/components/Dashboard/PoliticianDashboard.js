import React from 'react'

function PoliticianDashboard({ member, onLogout }) {
  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa' }}>
      <div style={{
        background: 'white',
        borderBottom: '1px solid #e9ecef',
        padding: '20px 40px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
      }}>
        <h1 style={{ color: '#333', fontSize: '1.5rem', fontWeight: '600', margin: 0 }}>
          政治人物後台
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ color: '#666', fontWeight: '500' }}>
            歡迎，{member.name}
          </span>
          <button 
            onClick={onLogout}
            style={{
              background: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 16px',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            登出
          </button>
        </div>
      </div>
      
      <div style={{
        padding: '40px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 'calc(100vh - 120px)'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '40px',
          textAlign: 'center',
          boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
          maxWidth: '500px',
          width: '100%'
        }}>
          <h2 style={{ color: '#28a745', fontSize: '2rem', marginBottom: '16px', fontWeight: '600' }}>
            🎉 登入成功
          </h2>
          <p style={{ color: '#666', fontSize: '1.125rem', marginBottom: '24px', lineHeight: '1.5' }}>
            您已成功登入 Polify 智能選服幕僚系統
          </p>
          <div style={{
            textAlign: 'left',
            background: '#f8f9fa',
            borderRadius: '8px',
            padding: '20px',
            marginTop: '24px'
          }}>
            <p style={{ margin: '8px 0', fontSize: '1rem', color: '#555' }}>
              <strong style={{ color: '#333', fontWeight: '600' }}>身份:</strong> 政治人物
            </p>
            <p style={{ margin: '8px 0', fontSize: '1rem', color: '#555' }}>
              <strong style={{ color: '#333', fontWeight: '600' }}>Email:</strong> {member.email}
            </p>
            <p style={{ margin: '8px 0', fontSize: '1rem', color: '#555' }}>
              <strong style={{ color: '#333', fontWeight: '600' }}>電話:</strong> {member.phone}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PoliticianDashboard