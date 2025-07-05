// src/components/Dashboard/DashboardNavBar.js
import React from 'react'
import { PermissionService } from '../../services/permissionService'
import '../../styles/DashboardNavBar.css'

function DashboardNavBar({ team, member, activeTab, onTabChange, onLogout }) {
  const getPositionLabel = (position) => {
    const labels = {
      'city_councilor': '市議員',
      'county_councilor': '縣議員',
      'legislator': '立法委員',
      'mayor': '市長',
      'county_magistrate': '縣長',
      'village_chief': '里長',
      'other': '其他'
    }
    return labels[position] || position
  }

  // 根據用戶權限獲取可見的導航項目
  const navItems = PermissionService.getVisibleNavItems(member)

  return (
    <div className="dashboard-navbar">
      {/* 左側：團隊資訊 */}
      <div className="navbar-left">
        <div className="team-info">
          <span className="team-name">{team.name}</span>
          <span className="team-details">
            {team.politician_name} • {getPositionLabel(team.position)} • {team.id}
          </span>
        </div>
      </div>

      {/* 中間：導航選項 */}
      <div className="navbar-center">
        <nav className="nav-tabs">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`nav-tab ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => onTabChange(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      {/* 右側：用戶資訊和登出 */}
      <div className="navbar-right">
        <span className="welcome-text">歡迎，{member.name}</span>
        <span className="role-badge">
          {member.is_leader ? '負責人' : '幕僚'}
        </span>
        <button className="logout-btn" onClick={onLogout}>
          登出
        </button>
      </div>
    </div>
  )
}

export default DashboardNavBar