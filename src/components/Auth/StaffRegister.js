import React, { useState } from 'react'
import { supabase } from '../../supabase'
import { validateStaffForm } from '../../services/validation'

function StaffRegister({ user, onRegistrationComplete, onBackToRoleSelection }) {
  const [formData, setFormData] = useState({
    name: user?.user_metadata?.full_name || '',
    email: user?.email || '',
    phone: '',
    position: '',
    politician_name: '',
    office_phone: ''
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  const positions = [
    { value: 'director', label: '主任' },
    { value: 'specialist', label: '專員' },
    { value: 'assistant', label: '助理' },
    { value: 'intern', label: '實習生' },
    { value: 'other', label: '其他' }
  ]

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // 清除該欄位的錯誤訊息
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // 表單驗證
    const validationErrors = validateStaffForm(formData)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setLoading(true)
    try {
      console.log('開始幕僚助理註冊...')
      console.log('用戶 ID:', user.id)
      
      // 使用 Supabase 推薦的插入語法
      const { data: memberData, error: memberError } = await supabase
        .from('Member')
        .insert({
          auth_user_id: user.id,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          role: 'staff',
          status: 'active'
        })
        .select()
        .single()

      console.log('註冊結果:', { memberData, memberError })

      if (memberError) {
        console.error('註冊錯誤:', memberError)
        throw memberError
      }

      console.log('註冊成功:', memberData)
      onRegistrationComplete(memberData)
    } catch (error) {
      console.error('註冊失敗:', error)
      let errorMessage = '註冊失敗，請稍後重試'
      
      // 根據錯誤類型提供更具體的錯誤訊息
      if (error.code === '23505') {
        errorMessage = '此用戶已註冊，請直接登入'
      } else if (error.code === '42501') {
        errorMessage = '權限不足，請聯繫管理員'
      } else if (error.message) {
        errorMessage = `註冊失敗：${error.message}`
      }
      
      setErrors({ submit: errorMessage })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px',
      boxSizing: 'border-box',
      overflow: 'auto' // 允許捲動
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start', // 改為 flex-start 避免垂直置中
        minHeight: '100vh',
        paddingTop: '20px',
        paddingBottom: '20px'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
          padding: '40px',
          width: '100%',
          maxWidth: '600px',
          position: 'relative',
          margin: 'auto' // 自動置中
        }}>
          {/* 上一頁按鈕 */}
          <button
            onClick={onBackToRoleSelection}
            disabled={loading}
            style={{
              position: 'absolute',
              top: '20px',
              left: '20px',
              background: 'transparent',
              border: '2px solid #ddd',
              borderRadius: '8px',
              padding: '8px 12px',
              fontSize: '14px',
              color: '#666',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              opacity: loading ? 0.5 : 1
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.target.style.borderColor = '#667eea'
                e.target.style.color = '#667eea'
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.target.style.borderColor = '#ddd'
                e.target.style.color = '#666'
              }
            }}
          >
            <span style={{ fontSize: '16px' }}>←</span>
            上一頁
          </button>

          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h1 style={{ fontSize: '2rem', color: '#333', marginBottom: '10px' }}>幕僚助理註冊</h1>
            <p style={{ color: '#666' }}>請填寫以下資訊完成註冊</p>
          </div>

          <form onSubmit={handleSubmit}>
            {errors.submit && (
              <div style={{
                background: '#fee',
                border: '1px solid #fcc',
                color: '#e74c3c',
                padding: '12px 16px',
                borderRadius: '6px',
                marginBottom: '20px',
                fontSize: '0.875rem'
              }}>
                {errors.submit}
              </div>
            )}

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#333', fontSize: '0.875rem' }}>
                姓名 *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: `2px solid ${errors.name ? '#e74c3c' : '#e1e5e9'}`,
                  borderRadius: '8px',
                  fontSize: '1rem',
                  opacity: loading ? 0.7 : 1,
                  boxSizing: 'border-box'
                }}
              />
              {errors.name && <span style={{ color: '#e74c3c', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>{errors.name}</span>}
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#333', fontSize: '0.875rem' }}>
                Email *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: `2px solid ${errors.email ? '#e74c3c' : '#e1e5e9'}`,
                  borderRadius: '8px',
                  fontSize: '1rem',
                  opacity: loading ? 0.7 : 1,
                  boxSizing: 'border-box'
                }}
              />
              {errors.email && <span style={{ color: '#e74c3c', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>{errors.email}</span>}
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#333', fontSize: '0.875rem' }}>
                電話號碼 *
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="09xxxxxxxx"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: `2px solid ${errors.phone ? '#e74c3c' : '#e1e5e9'}`,
                  borderRadius: '8px',
                  fontSize: '1rem',
                  opacity: loading ? 0.7 : 1,
                  boxSizing: 'border-box'
                }}
              />
              {errors.phone && <span style={{ color: '#e74c3c', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>{errors.phone}</span>}
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#333', fontSize: '0.875rem' }}>
                職位 *
              </label>
              <select
                name="position"
                value={formData.position}
                onChange={handleInputChange}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: `2px solid ${errors.position ? '#e74c3c' : '#e1e5e9'}`,
                  borderRadius: '8px',
                  fontSize: '1rem',
                  opacity: loading ? 0.7 : 1,
                  boxSizing: 'border-box'
                }}
              >
                <option value="">請選擇職位</option>
                {positions.map(pos => (
                  <option key={pos.value} value={pos.value}>
                    {pos.label}
                  </option>
                ))}
              </select>
              {errors.position && <span style={{ color: '#e74c3c', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>{errors.position}</span>}
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#333', fontSize: '0.875rem' }}>
                服務的政治人物姓名 *
              </label>
              <input
                type="text"
                name="politician_name"
                value={formData.politician_name}
                onChange={handleInputChange}
                placeholder="請輸入政治人物全名"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: `2px solid ${errors.politician_name ? '#e74c3c' : '#e1e5e9'}`,
                  borderRadius: '8px',
                  fontSize: '1rem',
                  opacity: loading ? 0.7 : 1,
                  boxSizing: 'border-box'
                }}
              />
              {errors.politician_name && <span style={{ color: '#e74c3c', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>{errors.politician_name}</span>}
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#333', fontSize: '0.875rem' }}>
                辦公室聯絡電話
              </label>
              <input
                type="tel"
                name="office_phone"
                value={formData.office_phone}
                onChange={handleInputChange}
                placeholder="02-xxxxxxxx"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e1e5e9',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  opacity: loading ? 0.7 : 1,
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '16px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                marginTop: '10px',
                opacity: loading ? 0.6 : 1
              }}
            >
              {loading ? '註冊中...' : '完成註冊'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default StaffRegister