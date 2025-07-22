// src/components/Case/CaseModal/CaseModal.js - 支援 AI 數據傳遞
import React, { useState } from 'react'
import CaseForm from './CaseForm'
import CaseTextInput from './CaseTextInput'
import '../../../styles/CaseModal.css'

function CaseModal({ isOpen, onClose, team, member, onCaseCreated }) {
  const [inputMode, setInputMode] = useState('form') // 'form' 或 'text'
  const [aiExtractedData, setAiExtractedData] = useState(null) // AI 提取的資料

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

  // 處理 AI 提取完成的回調
  const handleAIExtractionComplete = (extractedData) => {
    console.log('🤖 AI 提取完成，收到資料:', extractedData)
    
    // 儲存 AI 提取的資料
    setAiExtractedData(extractedData)
    
    // 切換到表單模式
    setInputMode('form')
  }

  const handleCaseSubmit = async (caseData) => {
    console.log('=== CaseModal.handleCaseSubmit ===')
    console.log('收到的案件資料:', caseData)
    
    try {
      console.log('案件建立成功，準備關閉視窗')
      
      // 通知父組件案件已建立
      if (onCaseCreated) {
        console.log('通知父組件案件已建立')
        onCaseCreated(caseData)
      }
      
      // 重置狀態
      setAiExtractedData(null)
      setInputMode('form')
      
      // 關閉視窗
      console.log('關閉案件建立視窗')
      onClose()
      
    } catch (error) {
      console.error('CaseModal.handleCaseSubmit 處理失敗:', error)
    }
  }

  const handleCancel = () => {
    console.log('用戶取消案件建立')
    // 重置狀態
    setAiExtractedData(null)
    setInputMode('form')
    onClose()
  }

  return (
    <div className="case-modal-backdrop" onClick={handleBackdropClick}>
      <div className="case-modal">
        {/* Header */}
        <div className="case-modal-header">
          <div className="case-modal-title">
            <h2>新增陳情案件</h2>
            {aiExtractedData && (
              <span className="ai-badge">🤖 AI 已填入</span>
            )}
          </div>
          
          <div className="case-modal-tabs">
            <button
              className={`case-modal-tab ${inputMode === 'form' ? 'active' : ''}`}
              onClick={() => handleInputModeChange('form')}
            >
              逐欄填寫
              {aiExtractedData && <span className="tab-indicator">●</span>}
            </button>
            <button
              className={`case-modal-tab ${inputMode === 'text' ? 'active' : ''}`}
              onClick={() => handleInputModeChange('text')}
            >
              AI摘要
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
              initialData={aiExtractedData} // 傳遞 AI 提取的資料
            />
          ) : (
            <CaseTextInput 
              team={team}
              member={member} 
              onSubmit={handleCaseSubmit}
              onCancel={handleCancel}
              onAIExtractionComplete={handleAIExtractionComplete} // 新增回調
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default CaseModal