import React from 'react'

function Loading() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: '#f8f9fa'
    }}>
      <div style={{
        width: '40px',
        height: '40px',
        border: '4px solid #e9ecef',
        borderTop: '4px solid #667eea',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        marginBottom: '16px'
      }}></div>
      <p style={{
        color: '#666',
        fontSize: '1rem',
        fontWeight: '500'
      }}>載入中...</p>
      
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export default Loading