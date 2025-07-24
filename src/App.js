// src/App.js - 緊急修復版本
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from './supabase'
import Homepage from './components/Homepage/Homepage'
import LoginPage from './components/Auth/LoginPage'
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
  
  // 簡化狀態管理
  const isInitialized = useRef(false)

  // 定義哪些頁面需要全螢幕模式
  const fullscreenPages = ['homepage', 'login', 'joinTeamSelection', 'registrationCode']
  const isFullscreenPage = fullscreenPages.includes(currentStep)

  // 根據當前頁面動態控制 body 的捲動
  useEffect(() => {
    if (currentStep === 'inviteCode') {
      document.body.style.overflow = 'auto'
      document.documentElement.style.overflow = 'auto'
    } else if (isFullscreenPage) {
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
  }, [currentStep, isFullscreenPage])

  // 決定用戶應該導向哪個頁面
  const determineUserDestination = useCallback(async (authUser) => {
    if (!authUser) {
      console.log('無用戶資料，導向首頁')
      setCurrentStep('homepage')
      setLoading(false)
      return
    }

    console.log('=== 決定用戶導向 ===')
    console.log('用戶:', authUser.email, 'ID:', authUser.id)

    try {
      const teamInfo = await TeamService.checkUserTeam(authUser.id)
      
      if (teamInfo.hasTeam && teamInfo.member && teamInfo.team) {
        console.log('發現用戶團隊資訊:', teamInfo.team.name)
        setMember(teamInfo.member)
        setTeam(teamInfo.team)
        setCurrentStep('dashboard')
      } else {
        console.log('用戶尚未加入團隊，導向團隊選擇頁面')
        setCurrentStep('joinTeamSelection')
      }
    } catch (error) {
      console.error('檢查團隊資訊時發生錯誤:', error)
      setCurrentStep('joinTeamSelection')
    } finally {
      setLoading(false)
    }
  }, [])

  // 處理用戶登入
  const handleUserSignedIn = useCallback(async (authUser) => {
    console.log('=== 處理用戶登入 ===', authUser.email)
    setUser(authUser)
    await determineUserDestination(authUser)
  }, [determineUserDestination])

  // 簡化的初始化 - 避免 React 嚴格模式問題
  useEffect(() => {
    // 嚴格防止重複執行
    if (isInitialized.current) return
    isInitialized.current = true

    console.log('=== 初始化應用程式 ===')

    // 直接檢查當前會話
    const checkSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('取得會話錯誤:', error)
          setCurrentStep('homepage')
          setLoading(false)
          return
        }

        if (data?.session?.user) {
          console.log('找到現有會話:', data.session.user.email)
          await handleUserSignedIn(data.session.user)
        } else {
          console.log('沒有現有會話，顯示首頁')
          setCurrentStep('homepage')
          setLoading(false)
        }
      } catch (err) {
        console.error('檢查會話失敗:', err)
        setCurrentStep('homepage')
        setLoading(false)
      }
    }

    checkSession()

    // 設定認證監聽器
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(`Auth 事件: ${event}`, session?.user?.email || 'no user')

        if (event === 'SIGNED_IN' && session?.user) {
          await handleUserSignedIn(session.user)
        } else if (event === 'SIGNED_OUT') {
          console.log('🚪 收到登出事件，清理所有狀態')
          setUser(null)
          setMember(null)
          setTeam(null)
          setCurrentStep('homepage')
          setLoading(false)
          
          // 重置初始化狀態，允許重新登入
          isInitialized.current = false
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          setUser(session.user)
        }
      }
    )

    // 清理函數
    return () => {
      subscription.unsubscribe()
    }
  }, [handleUserSignedIn])

  // 處理函數
  const handleTeamJoined = useCallback((memberData, teamData) => {
    console.log('團隊加入完成:', teamData.name)
    setMember(memberData)
    setTeam(teamData)
    setCurrentStep('dashboard')
  }, [])

  const handleSelectJoinMethod = useCallback((method) => {
    console.log('選擇加入方式:', method)
    setCurrentStep(method === 'register' ? 'registrationCode' : 'inviteCode')
  }, [])

  const handleLogout = useCallback(async () => {
    try {
      console.log('=== 執行登出 ===')
      setLoading(true)
      
      // 方法1: 使用 AuthService 的完整登出
      try {
        const { AuthService } = await import('./services/authService')
        const result = await AuthService.completeLogout()
        
        if (result.success) {
          console.log('✅ AuthService 登出成功')
        } else {
          console.warn('⚠️ AuthService 登出失敗，嘗試直接登出:', result.error)
          throw new Error(result.error)
        }
      } catch (authServiceError) {
        console.warn('AuthService 不可用，使用直接登出:', authServiceError)
        
        // 方法2: 直接使用 Supabase 登出
        const { error } = await supabase.auth.signOut()
        if (error) {
          console.error('❌ 直接登出也失敗:', error)
          throw error
        }
        console.log('✅ 直接登出成功')
      }
      
      // 強制清理本地狀態
      console.log('🧹 清理本地狀態...')
      setUser(null)
      setMember(null)
      setTeam(null)
      setCurrentStep('homepage')
      
      // 清理 localStorage
      try {
        const keys = Object.keys(localStorage)
        const supabaseKeys = keys.filter(key => key.startsWith('sb-'))
        supabaseKeys.forEach(key => {
          localStorage.removeItem(key)
          console.log(`清除 localStorage: ${key}`)
        })
      } catch (storageError) {
        console.warn('清理 localStorage 失敗:', storageError)
      }
      
      console.log('✅ 登出流程完成')
      
    } catch (error) {
      console.error('❌ 登出失敗:', error)
      alert('登出失敗，請刷新頁面後重試')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleBackToHome = useCallback(() => setCurrentStep('homepage'), [])
  const handleBackToJoinSelection = useCallback(() => setCurrentStep('joinTeamSelection'), [])
  const handleLoginClick = useCallback(() => setCurrentStep('login'), [])

  // 渲染載入畫面
  if (loading || !currentStep) {
    return <Loading />
  }

  // 渲染當前步驟
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
          console.log('Dashboard 資料不完整，重新檢查')
          if (user) {
            determineUserDestination(user)
          }
          return <Loading />
        }

        console.log('渲染 Dashboard，角色:', member.role)

        if (member.role === 'admin') {
          return (
            <TeamManagement 
              user={user}
              member={member}
              team={team}
              onLogout={handleLogout}
            />
          )
        } else {
          return (
            <StaffDashboard 
              user={user}
              member={member}
              team={team}
              onLogout={handleLogout}
            />
          )
        }

      default:
        console.error('未知的 currentStep:', currentStep)
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
    <div className="App">
      {renderCurrentStep()}
    </div>
  )
}

export default App