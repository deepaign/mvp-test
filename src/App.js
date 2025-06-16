import React, { useState, useEffect } from 'react'
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
  const [currentStep, setCurrentStep] = useState('homepage') // 預設顯示首頁
  const [debugInfo, setDebugInfo] = useState([])

  const addDebugInfo = (message) => {
    console.log(message)
    setDebugInfo(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  useEffect(() => {
    addDebugInfo('App useEffect 開始')

    const checkAuthState = async () => {
      try {
        addDebugInfo('測試 Supabase 連接...')
        
        const { data, error } = await supabase.auth.getSession()
        addDebugInfo(`getSession 結果: ${error ? `錯誤: ${error.message}` : '成功'}`)
        
        if (error) {
          addDebugInfo(`Supabase 錯誤: ${error.message}`)
          setLoading(false)
          return
        }

        if (data?.session?.user) {
          addDebugInfo(`發現用戶: ${data.session.user.email}`)
          setUser(data.session.user)
          
          // 先測試資料庫基本連接
          await testDatabaseConnection()
          
          // 然後檢查用戶註冊狀態
          await checkUserRegistration(data.session.user)
        } else {
          addDebugInfo('沒有現有 session，顯示首頁')
          setCurrentStep('homepage')
        }
        
      } catch (error) {
        addDebugInfo(`檢查認證狀態錯誤: ${error.message}`)
      } finally {
        setLoading(false)
      }
    }

    checkAuthState()

    // 設定認證狀態監聽器
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        addDebugInfo(`Auth 狀態變化: ${event} ${session?.user?.email || 'no user'}`)
        
        if (session?.user) {
          setUser(session.user)
          await testDatabaseConnection()
          await checkUserRegistration(session.user)
        } else {
          setUser(null)
          setMember(null)
          setCurrentStep('homepage') // 登出後回到首頁
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // 測試資料庫基本連接
  const testDatabaseConnection = async () => {
    try {
      addDebugInfo('測試資料庫連接...')
      
      // 先測試最基本的查詢
      const { data, error, count } = await supabase
        .from('Member')
        .select('*', { count: 'exact', head: true })
      
      if (error) {
        addDebugInfo(`資料庫錯誤: ${error.message}`)
        addDebugInfo(`錯誤代碼: ${error.code}`)
        addDebugInfo(`錯誤詳情: ${error.details}`)
        
        // 檢查是否是表格不存在的問題
        if (error.code === '42P01') {
          addDebugInfo('❌ Member 表格不存在！')
        } else if (error.code === '42501') {
          addDebugInfo('❌ 權限不足，可能是 RLS 政策問題')
        }
      } else {
        addDebugInfo(`✅ 資料庫連接成功，Member 表有 ${count || 0} 筆記錄`)
      }
    } catch (error) {
      addDebugInfo(`資料庫測試異常: ${error.message}`)
    }
  }

  const checkUserRegistration = async (authUser) => {
    try {
      addDebugInfo(`檢查用戶註冊狀態: ${authUser.id}`)
      
      // 使用 Supabase 推薦的查詢方式
      const { data, error } = await supabase
        .from('Member')
        .select('*')
        .eq('auth_user_id', authUser.id)
        .maybeSingle() // 使用 maybeSingle 而不是 single，避免 "multiple rows" 錯誤

      addDebugInfo(`查詢結果: ${error ? `錯誤: ${error.message}` : `找到數據: ${!!data}`}`)

      if (error) {
        addDebugInfo(`查詢 Member 表錯誤: ${error.message}`)
        // 如果資料庫有問題，仍然讓用戶進行註冊流程
        setCurrentStep('roleSelection')
        return
      }

      if (data) {
        addDebugInfo(`找到現有用戶: ${data.name}`)
        setMember(data)
        setCurrentStep('dashboard')
      } else {
        addDebugInfo('新用戶，導向註冊流程')
        setCurrentStep('roleSelection')
      }
    } catch (error) {
      addDebugInfo(`檢查註冊狀態異常: ${error.message}`)
      setCurrentStep('roleSelection')
    }
  }

  const handleLoginClick = () => {
    addDebugInfo('用戶點擊後台管理按鈕')
    setCurrentStep('login')
  }

  const handleRoleSelection = (role) => {
    addDebugInfo(`選擇身份: ${role}`)
    setCurrentStep(`${role}Register`)
  }

  const handleRegistrationComplete = async (memberData) => {
    addDebugInfo(`註冊完成: ${memberData.name}`)
    setMember(memberData)
    setCurrentStep('dashboard')
  }

  const handleLogout = async () => {
    try {
      addDebugInfo('執行登出')
      await supabase.auth.signOut()
    } catch (error) {
      addDebugInfo(`登出失敗: ${error.message}`)
    }
  }

  const handleBackToHome = () => {
    setCurrentStep('homepage')
  }

  // 如果在載入中且有除錯資訊，顯示除錯介面
  if (loading && debugInfo.length > 0) {
    return (
      <div style={{
        padding: '20px',
        fontFamily: 'monospace',
        background: '#1a1a1a',
        color: '#00ff00',
        minHeight: '100vh'
      }}>
        <h2 style={{ color: '#fff', marginBottom: '20px' }}>🔍 Polify 除錯模式</h2>
        <div style={{ 
          background: '#2a2a2a', 
          padding: '15px', 
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          {debugInfo.map((info, index) => (
            <div key={index} style={{ marginBottom: '8px', fontSize: '14px' }}>
              {info}
            </div>
          ))}
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          color: '#fff'
        }}>
          <div style={{
            width: '20px',
            height: '20px',
            border: '2px solid #00ff00',
            borderTop: '2px solid transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <span>載入中...</span>
        </div>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  if (loading) {
    return <Loading />
  }

  const renderCurrentStep = () => {
    // 需要顯示導航欄的頁面
    const pagesWithNavbar = ['homepage', 'login', 'roleSelection', 'politicianRegister', 'staffRegister'];
    const showNavbar = pagesWithNavbar.includes(currentStep);

    // 導航欄組件
    const renderNavbar = () => (
      <header className="navbar">
        <div className="logo" onClick={handleBackToHome}>
          <span>Polify</span>
        </div>
        <nav className="nav-links">
          <a 
            href="#" 
            className={currentStep === 'homepage' ? 'active' : ''}
            onClick={(e) => { e.preventDefault(); handleBackToHome(); }}
          >
            首頁
          </a>
          <a href="#" onClick={(e) => { e.preventDefault(); }}>
            政績展示
          </a>
          <a href="#" onClick={(e) => { e.preventDefault(); }}>
            選民資料分析
          </a>
          <a 
            href="#" 
            className={['login', 'roleSelection', 'politicianRegister', 'staffRegister'].includes(currentStep) ? 'active' : ''}
            onClick={(e) => { e.preventDefault(); handleLoginClick(); }}
          >
            後台管理
          </a>
        </nav>
      </header>
    );

    switch (currentStep) {
      case 'homepage':
        return (
          <div className="app-container">
            {renderNavbar()}
            <Homepage onLoginClick={handleLoginClick} />
            
            {/* 頁腳 */}
            <footer>
              <div className="footer-content">
                <div className="footer-section">
                  <h3>關於我們</h3>
                  <p>Polify 力求提供優質的交流平台，讓政治人物與民眾共同打造更美好的社區環境。</p>
                </div>
                
                <div className="footer-section">
                  <h3>聯絡資訊</h3>
                  <p>地址：台北市大安區羅斯福路四段1號</p>
                  <p>電話：(02) 2345-6789</p>
                  <p>Email：deepaign.tw@gmail.com</p>
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
          </div>
        )
      
      case 'login':
        return (
          <div className="app-container">
            {renderNavbar()}
            <div className="auth-page-container">
              <LoginPage />
            </div>
          </div>
        )
      
      case 'roleSelection':
        return (
          <div className="app-container">
            {renderNavbar()}
            <div className="auth-page-container">
              <RoleSelection 
                user={user}
                onRoleSelect={handleRoleSelection}
              />
            </div>
          </div>
        )
      
      case 'politicianRegister':
        return (
          <div className="app-container">
            {renderNavbar()}
            <div className="auth-page-container">
              <PoliticianRegister
                user={user}
                onRegistrationComplete={handleRegistrationComplete}
              />
            </div>
          </div>
        )
      
      case 'staffRegister':
        return (
          <div className="app-container">
            {renderNavbar()}
            <div className="auth-page-container">
              <StaffRegister
                user={user}
                onRegistrationComplete={handleRegistrationComplete}
              />
            </div>
          </div>
        )
      
      case 'dashboard':
        if (!member) return <Loading />
        
        return member.role === 'politician' ? (
          <PoliticianDashboard 
            member={member} 
            onLogout={handleLogout}
          />
        ) : (
          <StaffDashboard 
            member={member} 
            onLogout={handleLogout}
          />
        )
      
      default:
        return (
          <div className="app-container">
            {renderNavbar()}
            <Homepage onLoginClick={handleLoginClick} />
          </div>
        )
    }
  }

  return (
    <div className="app">
      {renderCurrentStep()}
    </div>
  )
}

export default App