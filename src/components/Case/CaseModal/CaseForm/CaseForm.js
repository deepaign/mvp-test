// src/components/Case/CaseModal/CaseForm/CaseForm.js
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
      <form onSubmit={handleSubmit} className="case-form">
        
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