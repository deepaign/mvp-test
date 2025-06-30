// src/components/Common/Navigation.jsx
import React from 'react'
import '../../styles/Navigation.css';

function Navigation({ currentPage, onNavigate, onCreateCase, member }) {
  const navigationItems = [
    {
      id: 'dashboard',
      label: '後台管理',
      icon: '🏛️',
      description: '案件管理與團隊協作'
    },
    {
      id: 'voter-analysis', 
      label: '選民資料分析',
      icon: '📊',
      description: '選民數據分析與洞察'
    }
  ]

  return (
    <nav className="navigation-sidebar">
      {/* Logo 區域 */}
      <div className="nav-logo">
        <div className="logo-icon">📋</div>
        <div className="logo-text">
          <div className="logo-title">Polify</div>
          <div className="logo-subtitle">智能選服幕僚系統</div>
        </div>
      </div>

      {/* 新增案件按鈕 */}
      <div className="nav-actions">
        <button 
          className="create-case-btn"
          onClick={onCreateCase}
          title="新增陳情案件"
        >
          <span className="btn-icon">➕</span>
          <span className="btn-text">新增案件</span>
        </button>
      </div>

      {/* 導航項目 */}
      <div className="nav-items">
        {navigationItems.map(item => (
          <div
            key={item.id}
            className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
            onClick={() => onNavigate(item.id)}
            title={item.description}
          >
            <div className="nav-item-icon">{item.icon}</div>
            <div className="nav-item-content">
              <div className="nav-item-label">{item.label}</div>
              {item.id === 'voter-analysis' && (
                <div className="nav-item-badge">即將推出</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 用戶資訊 */}
      <div className="nav-user-info">
        <div className="user-avatar">
          {member?.name?.charAt(0) || '👤'}
        </div>
        <div className="user-details">
          <div className="user-name">{member?.name}</div>
          <div className="user-role">
            {member?.is_leader ? '團隊負責人' : '幕僚助理'}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navigation