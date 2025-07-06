// src/components/Case/CaseModal/CaseForm/CaseForm.js - 修正版
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

const CaseForm = ({ team, onSubmit, onCancel }) => {
  const {
    formData,
    dropdownOptions,
    loading,
    isSubmitting,
    handleInputChange,
    handleSubmit
  } = useCaseForm(team, onSubmit)

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
        />
      </form>
    </div>
  )
}

export default CaseForm