// src/components/Case/CaseModal/CaseModal.js - 修正版：新增 member 參數傳遞
import React, { useState } from 'react'
import CaseForm from './CaseForm'
import CaseTextInput from './CaseTextInput'
import '../../../styles/CaseModal.css'

// 修正：新增 member 參數
function CaseModal({ isOpen, onClose, team, member, onCaseCreated }) {
  const [inputMode, setInputMode] = useState('form') // 'form' 或 'text'

  if (!isOpen) return null

  const handleInputModeChange = (mode) => {
    setInputMode(mode)
    console.log('切換輸入模式:', mode)
  }

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleCaseSubmit = async (caseData) => {
    console.log('=== CaseModal.handleCaseSubmit ===')
    console.log('收到的案件資料:', caseData)
    
    try {
      // 注意：這個函數是由 CaseForm 的 onSubmit 呼叫的
      // 在 CaseForm 中，案件已經建立成功了，所以這裡直接處理後續動作
      
      console.log('案件建立成功，準備關閉視窗')
      
      // 通知父組件案件已建立
      if (onCaseCreated) {
        console.log('通知父組件案件已建立')
        onCaseCreated(caseData)
      }
      
      // 關閉視窗
      console.log('關閉案件建立視窗')
      onClose()
      
    } catch (error) {
      console.error('CaseModal.handleCaseSubmit 處理失敗:', error)
      // 不要在這裡顯示 alert，因為 CaseForm 已經處理了錯誤
    }
  }

  const handleCancel = () => {
    console.log('用戶取消案件建立')
    onClose()
  }

  return (
    <div className="case-modal-backdrop" onClick={handleBackdropClick}>
      <div className="case-modal">
        {/* Header */}
        <div className="case-modal-header">
          <div className="case-modal-title">
            <h2>新增陳情案件</h2>
          </div>
          
          <div className="case-modal-tabs">
            <button
              className={`case-modal-tab ${inputMode === 'form' ? 'active' : ''}`}
              onClick={() => handleInputModeChange('form')}
            >
              逐欄填寫
            </button>
            <button
              className={`case-modal-tab ${inputMode === 'text' ? 'active' : ''}`}
              onClick={() => handleInputModeChange('text')}
            >
              全文輸入
            </button>
          </div>
          
          <button 
            className="case-modal-close" 
            onClick={handleCancel}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="case-modal-body">
          {inputMode === 'form' ? (
            <CaseForm 
              team={team}
              member={member}  
              onSubmit={handleCaseSubmit}
              onCancel={handleCancel}
            />
          ) : (
            <CaseTextInput 
              team={team}
              member={member} 
              onSubmit={handleCaseSubmit}
              onCancel={handleCancel}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default CaseModal