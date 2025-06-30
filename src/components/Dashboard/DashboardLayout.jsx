// src/components/Dashboard/DashboardLayout.jsx
import React, { useState, useEffect } from 'react'
import Navigation from '../Common/Navigation'
import CaseDashboard from '../Case/CaseDashboard'
import TeamManagement from '../Team/TeamManagement'
import CreateCaseModal from '../Case/CreateCaseModal'
import LogoutButton from '../Common/LogoutButton'
import '../../styles/DashboardLayout.css'

function DashboardLayout({ member, team, onLogout }) {
  // 當前頁面狀態
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [isCreateCaseModalOpen, setIsCreateCaseModalOpen] = useState(false)

  // 檢查用戶狀態
  const checkMemberStatus = async () => {
    try {
      // 動態導入 TeamService
      const { TeamService } = await import('../../services/teamService')
      
      const result = await TeamService.checkUserTeam(member.auth_user_id)
      
      if (!result.hasTeam) {
        console.log('❌ 成員已被移除，執行登出')
        alert('您已被移出團隊，請重新加入。')
        onLogout()
        return false
      }
      
      if (result.member.status !== 'active') {
        console.log('❌ 成員狀態非活躍，執行登出')
        alert('您的帳號狀態已變更，請重新登入。')
        onLogout()
        return false
      }
      
      return true
    } catch (error) {
      console.error('檢查成員狀態失敗:', error)
      return true // 如果檢查失敗，暫時允許繼續使用
    }
  }

  // 定期檢查成員狀態
  useEffect(() => {
    const interval = setInterval(async () => {
      await checkMemberStatus()
    }, 30000) // 每30秒檢查一次

    return () => clearInterval(interval)
  }, [member.auth_user_id, onLogout])

  // 處理導航
  const handleNavigate = (page) => {
    setCurrentPage(page)
  }

  // 打開新增案件 Modal
  const handleCreateCase = () => {
    setIsCreateCaseModalOpen(true)
  }

  // 關閉新增案件 Modal
  const handleCloseCreateCase = () => {
    setIsCreateCaseModalOpen(false)
  }

  // 處理案件新增成功
  const handleCaseCreated = () => {
    setIsCreateCaseModalOpen(false)
    // 如果當前不在案件管理頁面，自動跳轉
    if (currentPage !== 'dashboard') {
      setCurrentPage('dashboard')
    }
  }

  // 渲染主要內容
  const renderMainContent = () => {
    switch (currentPage) {
      case 'dashboard':
        return <CaseDashboard member={member} team={team} />
      
      case 'voter-analysis':
        return (
          <div className="coming-soon-page">
            <div className="coming-soon-content">
              <div className="coming-soon-icon">📊</div>
              <h2>選民資料分析</h2>
              <p>此功能正在開發中，敬請期待！</p>
              <div className="feature-preview">
                <h3>即將推出的功能：</h3>
                <ul>
                  <li>選民分佈地圖視覺化</li>
                  <li>年齡層與職業分析</li>
                  <li>陳情類型統計分析</li>
                  <li>滿意度趨勢追蹤</li>
                  <li>互動式數據儀表板</li>
                </ul>
              </div>
            </div>
          </div>
        )
      
      default:
        return <CaseDashboard member={member} team={team} />
    }
  }

  return (
    <div className="dashboard-layout">
      {/* 左側導航欄 */}
      <Navigation 
        currentPage={currentPage}
        onNavigate={handleNavigate}
        onCreateCase={handleCreateCase}
        member={member}
      />

      {/* 主要內容區域 */}
      <div className="main-content-area">
        {/* 頂部標題欄 */}
        <div className="content-header">
          <div className="header-left">
            <h1 className="page-title">
              {currentPage === 'dashboard' ? '後台管理' : 
               currentPage === 'voter-analysis' ? '選民資料分析' : '智能選服幕僚系統'}
            </h1>
            <div className="team-info">
              <span className="team-name">{team.name}</span>
              <span className="team-leader">{team.politician_name}</span>
            </div>
          </div>
          
          <div className="header-right">
            <div className="user-info">
              <div className="user-avatar">
                {member.name?.charAt(0) || '👤'}
              </div>
              <div className="user-details">
                <div className="user-name">{member.name}</div>
                <div className="user-role">
                  {member.is_leader ? '團隊負責人' : '幕僚助理'}
                </div>
              </div>
            </div>
            
            <LogoutButton 
              onLogout={onLogout}
              variant="secondary"
              size="normal"
              revokeGoogleAuth={true}
            />
          </div>
        </div>

        {/* 主要內容 */}
        <div className="content-body">
          {renderMainContent()}
          
          {/* 如果是政治人物，在案件管理上方顯示團隊管理 */}
          {member.is_leader && currentPage === 'dashboard' && (
            <div className="team-section">
              <TeamManagement 
                member={member} 
                team={team}
                onLogout={onLogout}
                compact={true} // 緊湊模式，不顯示頂部導航
              />
            </div>
          )}
        </div>
      </div>

      {/* 新增案件 Modal */}
      <CreateCaseModal 
        isOpen={isCreateCaseModalOpen}
        onClose={handleCloseCreateCase}
        onSave={handleCaseCreated}
        member={member}
        team={team}
      />
    </div>
  )
}

export default DashboardLayout