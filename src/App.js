// App.js 主要修改點

import React, { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase'
import Homepage from './components/Homepage/Homepage'
import LoginPage from './components/Auth/LoginPage'
// 移除不需要的舊組件
// import RoleSelection from './components/Auth/RoleSelection'
// import PoliticianRegister from './components/Auth/PoliticianRegister'
// import StaffRegister from './components/Auth/StaffRegister'
// import PoliticianDashboard from './components/Dashboard/PoliticianDashboard'

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
  const [team, setTeam] = useState(null) // 新增：團隊資料
  const [loading, setLoading] = useState(true)
  const [currentStep, setCurrentStep] = useState(null)
  const [debugInfo, setDebugInfo] = useState([])
  
  // 使用 useRef 來追蹤狀態，避免重複檢查
  const hasInitialized = useRef(false)
  const hasCheckedRegistration = useRef(false)
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

  const addDebugInfo = (message) => {
    console.log(message)
    setDebugInfo(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  // 修改：檢查用戶是否已有團隊（而不是檢查註冊狀態）
  const checkUserTeam = async (authUser) => {
    try {
      addDebugInfo(`檢查用戶團隊狀態: ${authUser.id}`)
      
      const teamCheck = await TeamService.checkUserTeam(authUser.id)
      
      if (teamCheck.hasTeam) {
        addDebugInfo(`找到現有團隊: ${teamCheck.team.name}`)
        return { 
          hasTeam: true, 
          member: teamCheck.member,
          team: teamCheck.team 
        }
      } else {
        addDebugInfo('用戶尚未加入任何團隊')
        return { hasTeam: false, member: null, team: null }
      }
    } catch (error) {
      addDebugInfo(`檢查團隊狀態異常: ${error.message}`)
      return { hasTeam: false, member: null, team: null }
    }
  }

  useEffect(() => {
    // 防止重複初始化
    if (hasInitialized.current) {
      addDebugInfo('已初始化，跳過重複檢查')
      return
    }

    addDebugInfo('App useEffect 開始')

    const initializeApp = async () => {
      try {
        addDebugInfo('初始化應用程式...')
        hasInitialized.current = true
        
        // 檢查 URL 參數以判斷是否為 OAuth 重定向
        const urlParams = new URLSearchParams(window.location.search)
        const isOAuthRedirect = urlParams.has('code') || window.location.hash.includes('access_token')
        
        if (isOAuthRedirect) {
          addDebugInfo('檢測到 OAuth 重定向，保持載入狀態')
          return
        }

        // 檢查現有 session
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          addDebugInfo(`Supabase 錯誤: ${error.message}`)
          setCurrentStep('homepage')
          setLoading(false)
          return
        }

        if (data?.session?.user) {
          addDebugInfo(`發現已登入用戶: ${data.session.user.email}`)
          setUser(data.session.user)
          setCurrentStep('homepage')
        } else {
          addDebugInfo('沒有現有 session，顯示首頁')
          setCurrentStep('homepage')
        }
        
        setLoading(false)
        
      } catch (error) {
        addDebugInfo(`初始化錯誤: ${error.message}`)
        setCurrentStep('homepage')
        setLoading(false)
      }
    }

    initializeApp()
  }, [])

  useEffect(() => {
    // 設定認證狀態監聽器
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        addDebugInfo(`Auth 狀態變化: ${event} ${session?.user?.email || 'no user'}`)
        
        // 防止重複處理相同事件
        if (isProcessingAuth.current) {
          addDebugInfo('正在處理認證事件，跳過')
          return
        }
        
        if (event === 'SIGNED_IN' && session?.user) {
          isProcessingAuth.current = true
          addDebugInfo('處理登入事件...')
          setUser(session.user)
          
          if (!hasCheckedRegistration.current) {
            setLoading(true)
            
            try {
              const { hasTeam, member: memberData, team: teamData } = await checkUserTeam(session.user)
              
              if (hasTeam && memberData && teamData) {
                setMember(memberData)
                setTeam(teamData)
                setCurrentStep('dashboard')
              } else {
                setCurrentStep('joinTeamSelection') // 新的步驟
              }
              hasCheckedRegistration.current = true
            } catch (error) {
              addDebugInfo(`登入處理錯誤: ${error.message}`)
              setCurrentStep('joinTeamSelection')
            } finally {
              setLoading(false)
              isProcessingAuth.current = false
            }
          } else {
            isProcessingAuth.current = false
          }
          
        } else if (event === 'SIGNED_OUT') {
          addDebugInfo('處理登出事件')
          setUser(null)
          setMember(null)
          setTeam(null) // 清空團隊資料
          setCurrentStep('homepage')
          setLoading(false)
          hasCheckedRegistration.current = false
          isProcessingAuth.current = false
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const handleLoginClick = async () => {
    addDebugInfo('用戶點擊登入按鈕')
    
    if (user) {
      addDebugInfo('用戶已登入 Google，檢查團隊狀態...')
      
      if (hasCheckedRegistration.current) {
        if (member && team) {
          setCurrentStep('dashboard')
        } else {
          setCurrentStep('joinTeamSelection')
        }
        return
      }
      
      setLoading(true)
      
      try {
        const { hasTeam, member: memberData, team: teamData } = await checkUserTeam(user)
        
        if (hasTeam && memberData && teamData) {
          setMember(memberData)
          setTeam(teamData)
          setCurrentStep('dashboard')
        } else {
          setCurrentStep('joinTeamSelection')
        }
        hasCheckedRegistration.current = true
      } catch (error) {
        addDebugInfo(`團隊查詢失敗，導向選擇頁面: ${error.message}`)
        setCurrentStep('joinTeamSelection')
      } finally {
        setLoading(false)
      }
    } else {
      setCurrentStep('login')
    }
  }

  // 新增：處理加入方式選擇
  const handleSelectJoinMethod = (method) => {
    addDebugInfo(`選擇加入方式: ${method}`)
    if (method === 'registrationCode') {
      setCurrentStep('registrationCode')
    } else if (method === 'inviteCode') {
      setCurrentStep('inviteCode')
    }
  }

  // 新增：處理團隊加入成功
  const handleTeamJoined = async (memberData, teamData) => {
    addDebugInfo(`團隊加入成功: ${teamData.name}`)
    setMember(memberData)
    setTeam(teamData)
    hasCheckedRegistration.current = true
    setCurrentStep('dashboard')
  }

  const handleLogout = async () => {
    try {
      addDebugInfo('執行登出')
      hasCheckedRegistration.current = false
      hasInitialized.current = false
      setTeam(null) // 清空團隊資料
      await supabase.auth.signOut()
    } catch (error) {
      addDebugInfo(`登出失敗: ${error.message}`)
    }
  }

  const handleBackToHome = () => {
    addDebugInfo('返回首頁')
    setCurrentStep('homepage')
  }

  const handleBackToLogin = () => {
    addDebugInfo('返回登入頁面')
    setCurrentStep('login')
  }

  // 新增：返回加入方式選擇
  const handleBackToJoinSelection = () => {
    addDebugInfo('返回加入方式選擇頁面')
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
            <Homepage onLoginClick={handleLoginClick} />
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
            <Homepage onLoginClick={handleLoginClick} />
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