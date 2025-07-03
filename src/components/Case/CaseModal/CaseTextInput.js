import React, { useState } from 'react'

function CaseTextInput({ team, onSubmit, isSubmitting, onCancel }) {
  const [textContent, setTextContent] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!textContent.trim()) {
      alert('請輸入案件內容')
      return
    }

    // 將全文輸入轉換為案件資料格式
    const caseData = {
      title: '全文輸入案件',
      description: textContent.trim(),
      inputMode: 'text'
    }

    await onSubmit(caseData)
  }

  return (
    <div style={{ padding: '24px' }}>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px', 
            fontWeight: '500',
            color: '#333'
          }}>
            陳情內容全文 <span style={{ color: '#e74c3c' }}>*</span>
          </label>
          <textarea
            value={textContent}
            onChange={(e) => setTextContent(e.target.value)}
            placeholder="請點上陳情內容全文，系統將自動萃取關鍵資訊..."
            rows={15}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '0.9rem',
              lineHeight: '1.5',
              resize: 'vertical',
              minHeight: '300px'
            }}
            required
          />
        </div>

        <div style={{
          background: '#e3f2fd',
          padding: '16px',
          borderRadius: '6px',
          marginBottom: '24px'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            marginBottom: '8px',
            color: '#1976d2'
          }}>
            <span style={{ marginRight: '8px' }}>🤖</span>
            <strong>AI 萃取資訊</strong>
          </div>
          <p style={{ 
            margin: 0, 
            fontSize: '0.85rem',
            color: '#1976d2',
            opacity: 0.8
          }}>
            系統將自動分析文本並萃取案件標題、聯絡人、地點等關鍵資訊
          </p>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px',
          paddingTop: '20px',
          borderTop: '1px solid #e9ecef'
        }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            style={{
              background: '#f8f9fa',
              color: '#666',
              border: '1px solid #ddd',
              borderRadius: '6px',
              padding: '10px 20px',
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            取消
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !textContent.trim()}
            style={{
              background: isSubmitting ? '#ccc' : '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '10px 20px',
              fontSize: '0.9rem',
              fontWeight: '500',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {isSubmitting ? '建立中...' : '建立案件'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default CaseTextInput