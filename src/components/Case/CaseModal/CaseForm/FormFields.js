// src/components/Case/CaseModal/CaseForm/FormFields.js
import React from 'react'

export const FormFooter = ({ onCancel, isSubmitting }) => (
  <div className="form-footer">
    <button
      type="button"
      onClick={onCancel}
      disabled={isSubmitting}
      className="cancel-btn"
    >
      取消
    </button>
    <button
      type="submit"
      disabled={isSubmitting}
      className="submit-btn"
    >
      {isSubmitting ? '建立中...' : '建立案件'}
    </button>
  </div>
)