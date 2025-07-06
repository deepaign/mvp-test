// src/components/Case/CaseModal/CaseForm/FormFields.js
import React from 'react'

export const FormFooter = ({ onCancel, isSubmitting }) => (
  <div className="form-footer">
    <button
      type="button"
      onClick={onCancel}
      disabled={isSubmitting}
      className="cancel-btn"
      aria-label="取消建立案件"
    >
      取消
    </button>
    <button
      type="submit"
      disabled={isSubmitting}
      className="submit-btn"
      aria-label={isSubmitting ? '正在建立案件' : '建立案件'}
    >
      {isSubmitting ? '建立中...' : '建立案件'}
    </button>
  </div>
)