// src/App.js
import React, { useState, useEffect } from 'react'
import { supabase } from './supabase'

// 組件導入
import LoginPage from './components/Auth/LoginPage'
import Loading from './components/Common/Loading'
import ErrorMessage from './components/Common/ErrorMessage'
import Homepage from './components/Homepage/Homepage'
import JoinTeamSelection from './components/Team/JoinTeamSelection'
import RegistrationCodeInput from './components/Team/RegistrationCodeInput'
import StaffInviteInput from './components/Team/StaffInviteInput'
import DashboardLayout from './components/Dashboard/DashboardLayout'

// 服務導入
import { AuthService } from './services/authService'
import { TeamService } from './services/teamService'

// 樣式導入
import './App.css'

function App() {
  // 認證狀態
  const [user, setUser] = useState(null)
  const [member, setMember] = useState(null)
  const [team, setTeam] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // 頁面狀態
  const [currentPage, setCurrentPage] = useState('homepage')
  const [isFullscreen, setIsFullscreen] = useState(false)

  // OAuth 重定向處理
  const [processingOAuth, setProcessingOAuth] = useState(false)

  // 檢查初始認證狀態
  useEffect(() => {
    checkInitialAuth()
    
    // 監聽認證狀態變化
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔔 認證狀態變化:', event, session?.user?.email)
      
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('✅ 用戶已登入，處理登入後邏輯')
        await handleUserSignedIn(session.user)
      } else if (event === 'SIGNED_OUT') {
        console.log('👋 用戶已登出')
        handleSignOut()
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // 檢查初始認證狀態
  const checkInitialAuth = async () => {
    try {
      console.log('🔍 檢查初始認證狀態...')
      
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('❌ 獲取 session 失敗:', error)
        setError('認證檢查失敗，請重新整理頁面')
        setLoading(false)
        return
      }

      if (session?.user) {
        console.log('✅ 發現現有 session，用戶:', session.user.email)
        await handleUserSignedIn(session.user)
      } else {
        console.log('ℹ️ 無現有 session，顯示首頁')
        setCurrentPage('homepage')
        setLoading(false)
      }
    } catch (error) {
      console.error('❌ 初始認證檢查失敗:', error)
      setError('系統初始化失敗，請重新整理頁面')
      setLoading(false)
    }
  }

  // 處理用戶登入後的邏輯
  const handleUserSignedIn = async (user) => {
    try {
      setProcessingOAuth(true)
      setUser(user)
      setError('')

      console.log('🔍 檢查用戶團隊狀態...')
      const teamResult = await TeamService.checkUserTeam(user.id)
      
      if (teamResult.hasTeam && teamResult.member && teamResult.team) {
        console.log('✅ 用戶已加入團隊:', teamResult.team.name)
        setMember(teamResult.member)
        setTeam(teamResult.team)
        setCurrentPage('dashboard')
        setIsFullscreen(true)
      } else {
        console.log('ℹ️ 用戶尚未加入團隊，導向團隊加入流程')
        setCurrentPage('joinTeamSelection')
        setIsFullscreen(true)
      }
    } catch (error) {
      console.error('❌ 處理登入後邏輯失敗:', error)
      setError('登入後處理失敗，請稍後重試')
    } finally {
      setProcessingOAuth(false)
      setLoading(false)
    }
  }

  // 處理登出
  const handleSignOut = () => {
    setUser(null)
    setMember(null)
    setTeam(null)
    setCurrentPage('homepage')
    setIsFullscreen(false)
    setError('')
  }

  // 處理登出操作
  const handleLogout = async (useCompleteLogout = true) => {
    try {
      setLoading(true)
      console.log('🚪 執行登出...')
      
      if (useCompleteLogout) {
        await AuthService.completeLogout()
      } else {
        await AuthService.quickLogout()
      }
      
      handleSignOut()
    } catch (error) {
      console.error('❌ 登出失敗:', error)
      setError('登出失敗，請稍後重試')
    } finally {
      setLoading(false)
    }
  }

  // 處理團隊加入成功
  const handleTeamJoinSuccess = async (memberData, teamData) => {
    try {
      console.log('✅ 團隊加入成功:', teamData.name)
      setMember(memberData)
      setTeam(teamData)
      setCurrentPage('dashboard')
      setIsFullscreen(true)
    } catch (error) {
      console.error('❌ 處理團隊加入成功失敗:', error)
      setError('加入團隊後處理失敗')
    }
  }

  // 處理頁面導航
  const handleNavigate = (page) => {
    setCurrentPage(page)
    
    // 設定全螢幕模式
    const fullscreenPages = ['login', 'joinTeamSelection', 'registrationCode', 'inviteCode', 'dashboard']
    setIsFullscreen(fullscreenPages.includes(page))
  }

  // 渲染頁面內容
  const renderPage = () => {
    // OAuth 處理中
    if (processingOAuth) {
      return (
        <Loading message="正在處理 Google 登入，請稍候..." />
      )
    }

    // 頁面路由
    switch(currentPage) {
      case 'homepage':
        return <Homepage onNavigate={handleNavigate} />
      
      case 'login':
        return (
          <LoginPage 
            onNavigate={handleNavigate}
            onLoginSuccess={(user) => handleUserSignedIn(user)}
          />
        )
      
      case 'joinTeamSelection':
        return (
          <JoinTeamSelection 
            user={user}
            onNavigate={handleNavigate}
            onJoinSuccess={handleTeamJoinSuccess}
            onLogout={handleLogout}
          />
        )
      
      case 'registrationCode':
        return (
          <RegistrationCodeInput 
            user={user}
            onNavigate={handleNavigate}
            onJoinSuccess={handleTeamJoinSuccess}
            onLogout={handleLogout}
          />
        )
      
      case 'inviteCode':
        return (
          <StaffInviteInput 
            user={user}
            onNavigate={handleNavigate}
            onJoinSuccess={handleTeamJoinSuccess}
            onLogout={handleLogout}
          />
        )
      
      case 'dashboard':
        if (!member || !team) {
          return <Loading message="載入用戶資料中..." />
        }
        return (
          <DashboardLayout 
            member={member}
            team={team}
            onLogout={handleLogout}
          />
        )
      
      default:
        return <Homepage onNavigate={handleNavigate} />
    }
  }

  // 載入中狀態
  if (loading) {
    return <Loading message="系統初始化中..." />
  }

  return (
    <div className={`app-container ${isFullscreen ? 'fullscreen' : ''}`}>
      {/* 錯誤訊息 */}
      {error && (
        <ErrorMessage 
          message={error} 
          onClose={() => setError('')}
        />
      )}
      
      {/* 頂部導航 - 僅在非全螢幕模式下顯示 */}
      {!isFullscreen && (
        <header className="navbar">
          <div className="logo" onClick={() => handleNavigate('homepage')} style={{ cursor: 'pointer' }}>
            <span className="icon-clock">📋</span>
            <span>Polify 智能選服幕僚系統</span>
          </div>
          <nav className="nav-links">
            <a 
              href="#" 
              className={currentPage === 'homepage' ? 'active' : ''} 
              onClick={(e) => { e.preventDefault(); handleNavigate('homepage'); }}
            >
              首頁
            </a>
            <a 
              href="#" 
              className={currentPage === 'login' ? 'active' : ''} 
              onClick={(e) => { e.preventDefault(); handleNavigate('login'); }}
            >
              登入
            </a>
          </nav>
        </header>
      )}

      {/* 主要內容 */}
      <main className={isFullscreen ? 'fullscreen-content' : 'main-content'}>
        {renderPage()}
      </main>

      {/* 頁腳 - 僅在非全螢幕模式且非儀表板頁面顯示 */}
      {!isFullscreen && currentPage !== 'dashboard' && (
        <footer>
          <div className="footer-content">
            <div className="footer-section">
              <h3>關於我們</h3>
              <p>Polify 致力於提供優質的政治服務平台，讓政治人物與民眾共同打造更美好的社區環境。</p>
            </div>
            
            <div className="footer-section">
              <h3>聯絡資訊</h3>
              <p>地址：台北市大安區羅斯福路四段1號</p>
              <p>電話：(02) 2345-6789</p>
              <p>Email：polify.tw@gmail.com</p>
            </div>
            
            <div className="footer-section">
              <h3>服務時間</h3>
              <p>週一至週五：9:00 - 18:00</p>
              <p>週六：9:00 - 12:00（僅電話服務）</p>
              <p>Line 機器人：24小時服務</p>
            </div>
          </div>
          
          <div className="copyright">
            © 2025 Polify. All rights reserved.
          </div>
        </footer>
      )}
    </div>
  )
}

export default App