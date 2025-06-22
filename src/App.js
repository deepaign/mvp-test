// App.js - 簡化邏輯，修復載入問題

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from './supabase'
import Homepage from './components/Homepage/Homepage'
import LoginPage from './components/Auth/LoginPage'

// 新增團隊相關組件
import JoinTeamSelection from './components/Team/JoinTeamSelection'
import RegistrationCodeInput from './components/Team/RegistrationCodeInput'
import StaffInviteInput from './components/Team/StaffInviteInput'
import TeamManagement from './components/Team/TeamManagement'
import StaffDashboard from './components/Dashboard/StaffDashboard'
import Loading from './components/Common/Loading'
import { TeamService } from './services/teamService'
import './App.css'
import './components/Homepage/Homepage.css'

function App() {
  const [user, setUser] = useState(null)
  const [member, setMember] = useState(null)
  const [team, setTeam] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentStep, setCurrentStep] = useState(null)
  
  // 使用 useRef 來追蹤狀態
  const hasInitialized = useRef(false)
  const isProcessingAuth = useRef(false)

  // 定義哪些頁面需要全螢幕模式（無捲動）
  const fullscreenPages = ['homepage', 'login', 'joinTeamSelection', 'registrationCode', 'inviteCode']
  const isFullscreenPage = fullscreenPages.includes(currentStep)

  // 根據當前頁面動態控制 body 的捲動
  useEffect(() => {
    if (isFullscreenPage) {
      document.body.style.overflow = 'hidden'
      document.documentElement.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'auto'
      document.documentElement.style.overflow = 'auto'
    }

    return () => {
      document.body.style.overflow = 'auto'
      document.documentElement.style.overflow = 'auto'
    }
  }, [isFullscreenPage])

  // 檢查用戶是否已有團隊
  const checkUserTeam = useCallback(async (authUser) => {
    try {
      console.log(`檢查用戶團隊狀態: ${authUser.id}`)
      
      // 直接調用 TeamService，移除超時保護
      const teamCheck = await TeamService.checkUserTeam(authUser.id)
      console.log('TeamService.checkUserTeam 返回結果:', teamCheck)
      
      if (teamCheck.hasTeam) {
        console.log(`找到現有團隊: ${teamCheck.team.name}`)
        return { 
          hasTeam: true, 
          member: teamCheck.member,
          team: teamCheck.team 
        }
      } else {
        console.log('用戶尚未加入任何團隊')
        return { hasTeam: false, member: null, team: null }
      }
    } catch (error) {
      console.error(`檢查團隊狀態異常: ${error.message}`)
      console.error('完整錯誤:', error)
      return { hasTeam: false, member: null, team: null }
    }
  }, [])

  // 處理用戶登入後的邏輯
  const handleUserSignedIn = useCallback(async (authUser) => {
    if (isProcessingAuth.current) {
      console.log('正在處理用戶登入，跳過重複處理')
      return
    }

    isProcessingAuth.current = true
    setLoading(true)

    try {
      console.log('處理用戶登入:', authUser.email)
      
      // 清理 OAuth URL 參數
      const url = new URL(window.location)
      let needsCleanup = false
      
      if (url.searchParams.has('code')) {
        url.searchParams.delete('code')
        needsCleanup = true
      }
      if (url.searchParams.has('state')) {
        url.searchParams.delete('state')
        needsCleanup = true
      }
      if (url.hash.includes('access_token') || url.hash.includes('refresh_token')) {
        url.hash = ''
        needsCleanup = true
      }
      
      if (needsCleanup) {
        window.history.replaceState({}, document.title, url.toString())
        console.log('已清理 OAuth URL 參數')
      }

      setUser(authUser)

      // 檢查團隊狀態
      console.log('開始檢查團隊狀態...')
      const teamResult = await checkUserTeam(authUser)
      console.log('團隊檢查結果:', teamResult)
      
      if (teamResult.hasTeam && teamResult.member && teamResult.team) {
        console.log('用戶已有團隊，導向儀表板')
        setMember(teamResult.member)
        setTeam(teamResult.team)
        setCurrentStep('dashboard')
      } else {
        console.log('用戶沒有團隊，導向加入選擇頁面')
        setCurrentStep('joinTeamSelection')
      }

    } catch (error) {
      console.error('處理用戶登入失敗:', error)
      // 確保即使出錯也能導向某個頁面
      setCurrentStep('joinTeamSelection')
    } finally {
      console.log('完成用戶登入處理，設定 loading = false')
      setLoading(false)
      isProcessingAuth.current = false
    }
  }, [checkUserTeam])

  // 初始化應用程式
  useEffect(() => {
    if (hasInitialized.current) {
      return
    }

    const initializeApp = async () => {
      try {
        console.log('初始化應用程式...')
        hasInitialized.current = true

        // 檢查是否為 OAuth 重定向
        const urlParams = new URLSearchParams(window.location.search)
        const isOAuthRedirect = urlParams.has('code') || window.location.hash.includes('access_token')
        
        if (isOAuthRedirect) {
          console.log('檢測到 OAuth 重定向，等待認證狀態更新...')
          // 不設定任何狀態，讓 onAuthStateChange 處理
          return
        }

        // 檢查現有 session
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error(`Supabase 錯誤: ${error.message}`)
          setCurrentStep('homepage')
          setLoading(false)
          return
        }

        if (data?.session?.user) {
          console.log(`發現已登入用戶: ${data.session.user.email}`)
          await handleUserSignedIn(data.session.user)
        } else {
          console.log('沒有現有 session，顯示首頁')
          setCurrentStep('homepage')
          setLoading(false)
        }

      } catch (error) {
        console.error(`初始化錯誤: ${error.message}`)
        setCurrentStep('homepage')
        setLoading(false)
      }
    }

    initializeApp()
  }, [handleUserSignedIn])

  // 認證狀態監聽器
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(`Auth 狀態變化: ${event}`, session?.user?.email || 'no user')
        
        if (event === 'SIGNED_IN' && session?.user) {
          await handleUserSignedIn(session.user)
        } else if (event === 'SIGNED_OUT') {
          console.log('處理登出事件')
          setUser(null)
          setMember(null)
          setTeam(null)
          setCurrentStep('homepage')
          setLoading(false)
          isProcessingAuth.current = false
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [handleUserSignedIn])

  const handleLoginClick = async () => {
    console.log('用戶點擊登入按鈕')
    
    if (user) {
      console.log('用戶已登入，檢查當前狀態...')
      if (member && team) {
        setCurrentStep('dashboard')
      } else {
        setCurrentStep('joinTeamSelection')
      }
    } else {
      setCurrentStep('login')
    }
  }

  const handleSelectJoinMethod = (method) => {
    console.log(`選擇加入方式: ${method}`)
    if (method === 'registrationCode') {
      setCurrentStep('registrationCode')
    } else if (method === 'inviteCode') {
      setCurrentStep('inviteCode')
    }
  }

  const handleTeamJoined = (memberData, teamData) => {
    console.log(`團隊加入成功: ${teamData.name}`)
    setMember(memberData)
    setTeam(teamData)
    setCurrentStep('dashboard')
  }

  const handleLogout = async () => {
    try {
      console.log('執行完整登出（包括撤銷 Google 授權）')
      hasInitialized.current = false
      isProcessingAuth.current = false
      
      // 使用新的 AuthService 進行完整登出
      const { AuthService } = await import('./services/authService')
      const result = await AuthService.completeLogout()
      
      if (!result.success) {
        console.error('登出失敗:', result.error)
      }
    } catch (error) {
      console.error(`登出失敗: ${error.message}`)
    }
  }

  const handleBackToHome = () => {
    console.log('返回首頁')
    setCurrentStep('homepage')
  }

  const handleBackToJoinSelection = () => {
    console.log('返回加入方式選擇頁面')
    setCurrentStep('joinTeamSelection')
  }

  // 如果在載入中，顯示載入畫面
  if (loading) {
    return <Loading />
  }

  // 如果 currentStep 還沒設定，顯示載入畫面
  if (!currentStep) {
    return <Loading />
  }

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'homepage':
        return (
          <div className="auth-page">
            <Homepage 
              onLoginClick={handleLoginClick} 
              user={user}
              onLogout={handleLogout}
            />
          </div>
        )
      
      case 'login':
        return (
          <div className="auth-page">
            <LoginPage onBackToHome={handleBackToHome} />
          </div>
        )
      
      case 'joinTeamSelection':
        return (
          <div className="auth-page">
            <JoinTeamSelection 
              user={user}
              onSelectJoinMethod={handleSelectJoinMethod}
              onLogout={handleLogout}
            />
          </div>
        )
      
      case 'registrationCode':
        return (
          <div className="auth-page">
            <RegistrationCodeInput 
              user={user}
              onTeamJoined={handleTeamJoined}
              onBack={handleBackToJoinSelection}
              onLogout={handleLogout}
            />
          </div>
        )
      
      case 'inviteCode':
        return (
          <div className="auth-page">
            <StaffInviteInput 
              user={user}
              onTeamJoined={handleTeamJoined}
              onBack={handleBackToJoinSelection}
              onLogout={handleLogout}
            />
          </div>
        )
      
      case 'dashboard':
        if (!member || !team) return <Loading />
        
        return (
          <div className="content-page">
            {member.role === 'politician' && member.is_leader ? (
              <TeamManagement 
                member={member} 
                team={team}
                onLogout={handleLogout}
              />
            ) : (
              <StaffDashboard 
                member={member} 
                team={team}
                onLogout={handleLogout}
              />
            )}
          </div>
        )
      
      default:
        return (
          <div className="auth-page">
            <Homepage 
              onLoginClick={handleLoginClick}
              user={user}
              onLogout={handleLogout}
            />
          </div>
        )
    }
  }

  return (
    <div className={`app ${isFullscreenPage ? 'fullscreen-mode' : ''}`}>
      {renderCurrentStep()}
    </div>
  )
}

export default App