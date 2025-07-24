import React, { useState } from 'react'
import '../../styles/CaseActionButton.css'

function CaseActionButton({ onViewModeChange, onAddCase }) {
  // 🔧 修改預設檢視模式為列表檢視
  const [viewMode, setViewMode] = useState('list') // 改為 'list' 預設

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

  // 🔧 修正：顯示下一個要切換到的模式，而不是當前模式
  const getViewModeDisplay = () => {
    if (viewMode === 'list') {
      return {
        icon: '⊞', // 窗戶形狀 - 表示點擊後會切換到卡片檢視
        text: '卡片檢視'
      }
    } else {
      return {
        icon: '☰', // 三條橫線 - 表示點擊後會切換到列表檢視
        text: '列表檢視'
      }
    }
  }

  const { icon, text } = getViewModeDisplay()

  return (
    <div className="case-action-buttons">
      {/* 檢視模式切換按鈕 */}
      {/* <button
        className="view-mode-toggle-btn"
        onClick={handleViewModeToggle}
        title={`切換到${viewMode === 'card' ? '列表' : '卡片'}檢視`}
      >
        <span className="view-mode-icon">{icon}</span>
        <span className="view-mode-text">{text}</span>
      </button> */}

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