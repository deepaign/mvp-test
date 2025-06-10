import React, { useState, useEffect } from 'react'
import { supabase } from './supabase'
import './App.css'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 檢查現有登入狀態
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // 監聽登入狀態變化
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // Google 登入
  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    })
    if (error) alert('登入失敗: ' + error.message)
  }

  // 登出
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) alert('登出失敗: ' + error.message)
  }

  if (loading) {
    return <div className="container">載入中...</div>
  }

  return (
    <div className="container">
      <h1>Polify Google 登入測試</h1>
      
      {user ? (
        // 已登入狀態
        <div className="user-info">
          <h2>歡迎！</h2>
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>姓名:</strong> {user.user_metadata?.full_name}</p>
          <img 
            src={user.user_metadata?.avatar_url} 
            alt="頭像" 
            className="avatar"
          />
          <br />
          <button onClick={handleLogout} className="logout-btn">
            登出
          </button>
        </div>
      ) : (
        // 未登入狀態
        <div className="login-section">
          <p>請使用 Google 帳號登入</p>
          <button onClick={handleGoogleLogin} className="google-btn">
            🔐 使用 Google 登入
          </button>
        </div>
      )}
    </div>
  )
}

export default App
