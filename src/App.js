import React, { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase'
import Homepage from './components/Homepage/Homepage'
import LoginPage from './components/Auth/LoginPage'
import RoleSelection from './components/Auth/RoleSelection'
import PoliticianRegister from './components/Auth/PoliticianRegister'
import StaffRegister from './components/Auth/StaffRegister'
import PoliticianDashboard from './components/Dashboard/PoliticianDashboard'
import StaffDashboard from './components/Dashboard/StaffDashboard'
import Loading from './components/Common/Loading'
import './App.css'
import './components/Homepage/Homepage.css'

function App() {
  const [user, setUser] = useState(null)
  const [member, setMember] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentStep, setCurrentStep] = useState(null)
  const [debugInfo, setDebugInfo] = useState([])
  
  // 使用 useRef 來追蹤狀態，避免重複檢查
  const hasInitialized = useRef(false)
  const hasCheckedRegistration = useRef(false)
  const isProcessingAuth = useRef(false)

  // 定義哪些頁面需要全螢幕模式（無捲動）
  const fullscreenPages = ['homepage', 'login', 'roleSelection']
  // 註冊頁面改為可捲動，不包含在 fullscreenPages 中
  const isFullscreenPage = fullscreenPages.includes(currentStep)

  // 根據當前頁面動態控制 body 的捲動
  useEffect(() => {
    if (isFullscreenPage) {
      // 全螢幕頁面 - 禁用捲動
      document.body.style.overflow = 'hidden'
      document.documentElement.style.overflow = 'hidden'
    } else {
      // 內容頁面 - 允許捲動
      document.body.style.overflow = 'auto'
      document.documentElement.style.overflow = 'auto'
    }

    // 清理函數在組件卸載時恢復捲動
    return () => {
      document.body.style.overflow = 'auto'
      document.documentElement.style.overflow = 'auto'
    }
  }, [isFullscreenPage])

  const addDebugInfo = (message) => {
    console.log(message)
    setDebugInfo(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  // 測試資料庫基本連接（添加超時機制）
  const testDatabaseConnection = async () => {
    try {
      addDebugInfo('測試資料庫連接...')
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('資料庫連接超時')), 10000)
      )
      
      const queryPromise = supabase
        .from('Member')
        .select('*', { count: 'exact', head: true })
      
      const { data, error, count } = await Promise.race([queryPromise, timeoutPromise])
      
      if (error) {
        addDebugInfo(`資料庫錯誤: ${error.message}`)
        addDebugInfo(`錯誤代碼: ${error.code}`)
        addDebugInfo(`錯誤詳情: ${error.details}`)
        
        if (error.code === '42P01') {
          addDebugInfo('❌ Member 表格不存在！')
        } else if (error.code === '42501') {
          addDebugInfo('❌ 權限不足，可能是 RLS 政策問題')
        }
        throw error
      } else {
        addDebugInfo(`✅ 資料庫連接成功，Member 表有 ${count || 0} 筆記錄`)
      }
    } catch (error) {
      addDebugInfo(`資料庫測試異常: ${error.message}`)
      throw error
    }
  }

  const checkUserRegistration = async (authUser) => {
    try {
      addDebugInfo(`檢查用戶註冊狀態: ${authUser.id}`)
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('用戶查詢超時')), 10000)
      )
      
      const queryPromise = supabase
        .from('Member')
        .select('*')
        .eq('auth_user_id', authUser.id)
        .maybeSingle()

      const { data, error } = await Promise.race([queryPromise, timeoutPromise])

      addDebugInfo(`查詢結果: ${error ? `錯誤: ${error.message}` : `找到數據: ${!!data}`}`)

      if (error) {
        addDebugInfo(`查詢 Member 表錯誤: ${error.message}`)
        return { registered: false, member: null }
      }

      if (data) {
        addDebugInfo(`找到現有用戶: ${data.name}`)
        return { registered: true, member: data }
      } else {
        addDebugInfo('新用戶，需要註冊')
        return { registered: false, member: null }
      }
    } catch (error) {
      addDebugInfo(`檢查註冊狀態異常: ${error.message}`)
      return { registered: false, member: null }
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
          setCurrentStep('homepage') // 先顯示首頁，避免直接跳到註冊流程
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
  }, []) // 移除依賴，確保只執行一次

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
          
          // 只有在用戶主動登入時才進行註冊檢查
          // 不要在每次 session 恢復時都檢查
          if (!hasCheckedRegistration.current) {
            setLoading(true)
            
            try {
              await testDatabaseConnection()
              const { registered, member: memberData } = await checkUserRegistration(session.user)
              
              if (registered && memberData) {
                setMember(memberData)
                setCurrentStep('dashboard')
              } else {
                setCurrentStep('roleSelection')
              }
              hasCheckedRegistration.current = true
            } catch (error) {
              addDebugInfo(`登入處理錯誤: ${error.message}`)
              setCurrentStep('roleSelection')
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
      addDebugInfo('用戶已登入 Google，檢查註冊狀態...')
      
      // 如果已經檢查過註冊狀態，直接導航
      if (hasCheckedRegistration.current) {
        if (member) {
          setCurrentStep('dashboard')
        } else {
          setCurrentStep('roleSelection')
        }
        return
      }
      
      setLoading(true)
      
      try {
        await testDatabaseConnection()
        const { registered, member: memberData } = await checkUserRegistration(user)
        
        if (registered && memberData) {
          setMember(memberData)
          setCurrentStep('dashboard')
        } else {
          setCurrentStep('roleSelection')
        }
        hasCheckedRegistration.current = true
      } catch (error) {
        addDebugInfo(`資料庫查詢失敗，導向註冊流程: ${error.message}`)
        setCurrentStep('roleSelection')
      } finally {
        setLoading(false)
      }
    } else {
      setCurrentStep('login')
    }
  }

  const handleRoleSelection = (role) => {
    addDebugInfo(`選擇身份: ${role}`)
    setCurrentStep(`${role}Register`)
  }

  const handleRegistrationComplete = async (memberData) => {
    addDebugInfo(`註冊完成: ${memberData.name}`)
    setMember(memberData)
    hasCheckedRegistration.current = true
    setCurrentStep('dashboard')
  }

  const handleLogout = async () => {
    try {
      addDebugInfo('執行登出')
      hasCheckedRegistration.current = false
      hasInitialized.current = false
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

  const handleBackToRoleSelection = () => {
    addDebugInfo('返回身份選擇頁面')
    setCurrentStep('roleSelection')
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
      
      case 'roleSelection':
        return (
          <div className="auth-page">
            <RoleSelection 
              user={user}
              onRoleSelect={handleRoleSelection}
              onBackToLogin={handleBackToLogin}
            />
          </div>
        )
      
      case 'politicianRegister':
        return (
          <PoliticianRegister
            user={user}
            onRegistrationComplete={handleRegistrationComplete}
            onBackToRoleSelection={handleBackToRoleSelection}
          />
        )
      
      case 'staffRegister':
        return (
          <StaffRegister
            user={user}
            onRegistrationComplete={handleRegistrationComplete}
            onBackToRoleSelection={handleBackToRoleSelection}
          />
        )
      
      case 'dashboard':
        if (!member) return <Loading />
        
        return (
          <div className="content-page">
            {member.role === 'politician' ? (
              <PoliticianDashboard 
                member={member} 
                onLogout={handleLogout}
              />
            ) : (
              <StaffDashboard 
                member={member} 
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