// src/components/Case/CaseModal/CaseModal.js - 支援 AI 數據傳遞
import React, { useState } from 'react'
import CaseForm from './CaseForm'
import CaseTextInput from './CaseTextInput'
import '../../../styles/CaseModal.css'
import {CaseService} from '../../../services/caseService'

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
      console.log('開始建立案件...')
      
      // 調用 CaseService 建立案件
      const result = await CaseService.createCaseWithRelations(caseData, {
        counties: [],
        categories: [],
        members: []
      })
      
      console.log('案件建立結果:', result)
      
      if (result.success) {
        console.log('✅ 案件建立成功')
        
        // 🔧 修復：確保傳遞完整的案件資料給父組件
        const completeCase = {
          ...result.data.case,
          // 確保包含建立時間等必要資訊
          created_at: result.data.case.created_at || new Date().toISOString(),
          updated_at: result.data.case.updated_at || new Date().toISOString()
        }
        
        // 🔧 修復：先通知父組件，再處理其他邏輯
        if (onCaseCreated) {
          console.log('通知父組件案件已建立')
          await onCaseCreated(completeCase)
        }
        
        // 如果有警告訊息，顯示給使用者
        if (result.data.warnings && result.data.warnings.length > 0) {
          console.warn('案件建立過程中的警告:', result.data.warnings)
          setTimeout(() => {
            alert(`案件建立成功，但有以下警告：\n${result.data.warnings.join('\n')}`)
          }, 500)
        }
        
        // 重置狀態
        setAiExtractedData(null)
        setInputMode('form')
        
        // 🔧 修復：移除這裡的 onClose()，讓父組件處理
        // onClose() 
        
      } else {
        console.error('❌ 案件建立失敗:', result.error)
        alert(`案件建立失敗：${result.error}`)
      }
      
    } catch (error) {
      console.error('❌ CaseModal.handleCaseSubmit 處理失敗:', error)
      alert(`案件建立過程發生錯誤：${error.message}`)
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