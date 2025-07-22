import React, { useState } from 'react'
import '../../styles/CaseActionButton.css'

function CaseActionButton({ onViewModeChange, onAddCase }) {
  const [viewMode, setViewMode] = useState('card') // 'card' 或 'list'

  const handleViewModeToggle = () => {
    const newMode = viewMode === 'card' ? 'list' : 'card'
    setViewMode(newMode)
    onViewModeChange(newMode)
    console.log('切換檢視模式:', newMode)
  }

  const handleAddCase = () => {
    console.log('點擊新增案件')
    if (onAddCase) {
      onAddCase()
    }
  }

  // 根據當前模式顯示不同的圖標和文字
  const getViewModeDisplay = () => {
    if (viewMode === 'list') {
      return {
        icon: '☰', // 三條橫線
        text: '列表檢視'
      }
    } else {
      return {
        icon: '⊞', // 窗戶形狀
        text: '卡片檢視'
      }
    }
  }

  const { icon, text } = getViewModeDisplay()

  return (
    <div className="case-action-buttons">
      {/* 檢視模式切換按鈕 */}
      <button
        className="view-mode-toggle-btn"
        onClick={handleViewModeToggle}
        title={`切換到${viewMode === 'card' ? '列表' : '卡片'}檢視`}
      >
        <span className="view-mode-icon">{icon}</span>
        <span className="view-mode-text">{text}</span>
      </button>

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