// 簡化的 App.js - 修復團隊檢查邏輯

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

  // 決定用戶應該導向哪個頁面
  const determineUserDestination = useCallback(async (authUser) => {
    console.log('=== 決定用戶導向 ===')
    console.log('用戶:', authUser.email, 'ID:', authUser.id)
    
    try {
      // 檢查用戶是否有活躍團隊
      const teamResult = await TeamService.checkUserTeam(authUser.id)
      console.log('團隊檢查結果:', teamResult)
      
      if (teamResult.hasTeam && teamResult.member && teamResult.team) {
        console.log('✅ 用戶有活躍團隊')
        console.log('成員角色:', teamResult.member.role)
        console.log('是否為負責人:', teamResult.member.is_leader)
        console.log('團隊名稱:', teamResult.team.name)
        
        // 設置狀態並導向儀表板
        setMember(teamResult.member)
        setTeam(teamResult.team)
        setCurrentStep('dashboard')
        
        return { destination: 'dashboard', teamResult }
      } else {
        console.log('❌ 用戶沒有活躍團隊，導向加入選擇頁面')
        console.log('錯誤信息:', teamResult.error)
        
        // 清理狀態並導向加入選擇
        setMember(null)
        setTeam(null)
        setCurrentStep('joinTeamSelection')
        
        return { destination: 'joinTeamSelection', teamResult }
      }
    } catch (error) {
      console.error('決定用戶導向時發生錯誤:', error)
      setMember(null)
      setTeam(null)
      setCurrentStep('joinTeamSelection')
      return { destination: 'joinTeamSelection', error: error.message }
    }
  }, [])

  // 處理用戶登入
  const handleUserSignedIn = useCallback(async (authUser) => {
    if (isProcessingAuth.current) {
      console.log('正在處理用戶登入，跳過重複處理')
      return
    }

    isProcessingAuth.current = true
    setLoading(true)

    try {
      console.log('=== 處理用戶登入 ===')
      console.log('用戶:', authUser.email)
      
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

      // 設置用戶狀態
      setUser(authUser)

      // 決定用戶應該導向哪裡
      const result = await determineUserDestination(authUser)
      console.log('用戶導向結果:', result.destination)

    } catch (error) {
      console.error('處理用戶登入失敗:', error)
      setCurrentStep('joinTeamSelection')
    } finally {
      console.log('完成用戶登入處理')
      setLoading(false)
      isProcessingAuth.current = false
    }
  }, [determineUserDestination])

  // 初始化應用程式
  useEffect(() => {
    if (hasInitialized.current) {
      return
    }

    const initializeApp = async () => {
      try {
        console.log('=== 初始化應用程式 ===')
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
        console.log(`=== Auth 狀態變化: ${event} ===`, session?.user?.email || 'no user')
        
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
          hasInitialized.current = false
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [handleUserSignedIn])

  // 處理登入按鈕點擊
  const handleLoginClick = async () => {
    console.log('=== 用戶點擊登入按鈕 ===')
    
    if (user) {
      console.log('用戶已登入，重新檢查狀態...')
      setLoading(true)
      
      try {
        const result = await determineUserDestination(user)
        console.log('重新檢查結果:', result.destination)
      } catch (error) {
        console.error('重新檢查狀態失敗:', error)
        setCurrentStep('joinTeamSelection')
      } finally {
        setLoading(false)
      }
    } else {
      console.log('用戶未登入，導向登入頁面')
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

  const handleTeamJoined = async (memberData, teamData) => {
    console.log(`=== 團隊加入成功 ===`)
    console.log('團隊:', teamData.name)
    console.log('成員角色:', memberData.role)
    console.log('是否為負責人:', memberData.is_leader)
    
    setMember(memberData)
    setTeam(teamData)
    setCurrentStep('dashboard')
  }

  const handleLogout = async () => {
    try {
      console.log('=== 執行登出 ===')
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
        if (!member || !team) {
          console.log('Dashboard 渲染時缺少資料:', { member: !!member, team: !!team })
          return <Loading />
        }
        
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
        console.log('未知的 currentStep:', currentStep)
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