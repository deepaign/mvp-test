import React from 'react'
import CaseActionButton from './CaseActionButton'
import '../../styles/CaseTabs.css'

function CaseTabs({ activeTab, onTabChange, onViewModeChange, onAddCase }) {
  const statusMap = {
    all: '全部案件',
    pending: '待處理',
    processing: '處理中',
    completed: '已完成'
  }

  const tabItems = [
    { id: 'all', label: statusMap.all },
    { id: 'pending', label: statusMap.pending },
    { id: 'processing', label: statusMap.processing },
    { id: 'completed', label: statusMap.completed }
  ]

  return (
    <div className="case-tabs-container">
      <div className="case-tabs-wrapper">
        <div className="case-tabs">
          {tabItems.map((item) => (
            <button
              key={item.id}
              className={`case-tab ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => onTabChange(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        
        {/* ActionButton 移到右側 */}
        <CaseActionButton 
          onViewModeChange={onViewModeChange}
          onAddCase={onAddCase}
        />
      </div>
      <div className="case-tabs-divider"></div>
    </div>
  )
}

export default CaseTabs