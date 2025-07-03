import React, { useState } from 'react'
import '../../styles/CaseActionButton.css'

function CaseActionButton({ onViewModeChange, onAddCase }) {
  const [viewMode, setViewMode] = useState('card') // 'card' 或 'list'

  const handleViewModeChange = (mode) => {
    setViewMode(mode)
    onViewModeChange(mode)
    console.log('切換檢視模式:', mode)
  }

  const handleAddCase = () => {
    console.log('點擊新增案件')
    if (onAddCase) {
      onAddCase()
    }
  }

  return (
    <div className="case-action-buttons">
      {/* 檢視模式切換 */}
      <div className="view-mode-group">
        <button
          className={`view-mode-btn ${viewMode === 'list' ? 'active' : ''}`}
          onClick={() => handleViewModeChange('list')}
          title="逐條檢視"
        >
          逐條檢視
        </button>
        <button
          className={`view-mode-btn ${viewMode === 'card' ? 'active' : ''}`}
          onClick={() => handleViewModeChange('card')}
          title="卡片檢視"
        >
          卡片檢視
        </button>
      </div>

      {/* 新增案件按鈕 */}
      <button
        className="add-case-btn"
        onClick={handleAddCase}
        title="新增案件"
      >
        + 新增案件
      </button>
    </div>
  )
}

export default CaseActionButton