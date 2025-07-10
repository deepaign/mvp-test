// src/components/Case/CaseTables/CaseUnsavedChangesModal.js
import React from 'react'
import '../../../styles/CaseUnsavedChangesModal.css'

function CaseUnsavedChangesModal({ isOpen, onDiscard, onReturn }) {
  if (!isOpen) return null

  return (
    <div className="unsaved-changes-modal-overlay">
      <div className="unsaved-changes-modal">
        {/* 標題 */}
        <div className="unsaved-changes-modal-header">
          <h3>是否確定放棄修改？</h3>
        </div>

        {/* 內容 */}
        <div className="unsaved-changes-modal-content">
          <p>您的修改尚未儲存，確定要放棄所有變更嗎？</p>
        </div>

        {/* 按鈕區域 */}
        <div className="unsaved-changes-modal-actions">
          <button 
            className="unsaved-changes-modal-discard"
            onClick={onDiscard}
          >
            放棄修改
          </button>
          <button 
            className="unsaved-changes-modal-return"
            onClick={onReturn}
          >
            返回表單
          </button>
        </div>
      </div>
    </div>
  )
}

export default CaseUnsavedChangesModal