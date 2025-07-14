// src/components/Case/CaseModal/CaseForm/CaseForm.js - 支援 initialData
import React from 'react'
import { useCaseForm } from './useCaseForm'
import { 
  BasicInfoSection, 
  ContactInfoSection, 
  CaseContentSection, 
  NotificationSection 
} from './FormSections'
import { FormFooter } from './FormFields'
import '../../../../styles/CaseForm.css'

const CaseForm = ({ team, member, onSubmit, onCancel, initialData }) => {
  const {
    formData,
    dropdownOptions,
    loading,
    isSubmitting,
    handleInputChange,
    handleSubmit
  } = useCaseForm({ team, member, onSubmit, initialData }) // 🆕 傳入 initialData

  // 防止表單內的 Enter 鍵觸發提交
  const handleFormKeyDown = (e) => {
    if (e.key === 'Enter' && e.target.type !== 'submit' && e.target.type !== 'textarea') {
      e.preventDefault()
      console.log('攔截 Enter 鍵，防止意外提交表單')
    }
  }

  if (loading) {
    return (
      <div style={{ 
        padding: '40px', 
        textAlign: 'center',
        fontSize: '0.9rem',
        color: '#666'
      }}>
        載入中...
      </div>
    )
  }

  return (
    <div className="case-form-container">
      {/* 🆕 AI 填入提示 */}
      {initialData?.createdByAI && (
        <div className="ai-filled-notice">
          <div className="ai-notice-content">
            <span className="ai-icon">🤖</span>
            <div className="ai-notice-text">
              <strong>AI 已自動填入資訊</strong>
              <p>請檢查並修正 AI 提取的資訊，確認無誤後再提交案件</p>
            </div>
          </div>
          {initialData.originalTranscript && (
            <details className="original-transcript">
              <summary>查看原始逐字稿</summary>
              <div className="transcript-content">
                {initialData.originalTranscript}
              </div>
            </details>
          )}
        </div>
      )}

      <form 
        onSubmit={handleSubmit} 
        onKeyDown={handleFormKeyDown}
        className="case-form"
      >
        
        <BasicInfoSection 
          formData={formData}
          dropdownOptions={dropdownOptions}
          onChange={handleInputChange}
        />
        
        <ContactInfoSection 
          formData={formData}
          onChange={handleInputChange}
        />
        
        <CaseContentSection 
          formData={formData}
          dropdownOptions={dropdownOptions}
          onChange={handleInputChange}
        />
        
        <NotificationSection 
          formData={formData}
          onChange={handleInputChange}
        />
        
        <FormFooter 
          onCancel={onCancel}
          isSubmitting={isSubmitting}
          submitText={initialData?.createdByAI ? '確認並建立案件' : '建立案件'}
        />
      </form>
    </div>
  )
}

export default CaseForm