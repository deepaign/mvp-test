import React, { useState } from 'react'
import { supabase } from '../../supabase'
import { validatePoliticianForm } from '../../services/validation'

function PoliticianRegister({ user, onRegistrationComplete }) {
  const [formData, setFormData] = useState({
    name: user?.user_metadata?.full_name || '',
    email: user?.email || '',
    phone: '',
    position: '',
    county: '',
    district: '',
    office_address: ''
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  const positions = [
    { value: 'city_councilor', label: '市議員' },
    { value: 'county_councilor', label: '縣議員' },
    { value: 'legislator', label: '立法委員' },
    { value: 'mayor', label: '市長' },
    { value: 'county_magistrate', label: '縣長' },
    { value: 'village_chief', label: '里長' },
    { value: 'other', label: '其他' }
  ]

  const counties = [
    '台北市', '新北市', '桃園市', '台中市', '台南市', '高雄市',
    '基隆市', '新竹市', '嘉義市', '新竹縣', '苗栗縣', '彰化縣',
    '南投縣', '雲林縣', '嘉義縣', '屏東縣', '宜蘭縣', '花蓮縣',
    '台東縣', '澎湖縣', '金門縣', '連江縣'
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
    const validationErrors = validatePoliticianForm(formData)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setLoading(true)
    try {
      console.log('開始政治人物註冊...')
      console.log('用戶 ID:', user.id)
      
      // 使用 Supabase 推薦的插入語法
      const { data: memberData, error: memberError } = await supabase
        .from('Member')
        .insert({
          auth_user_id: user.id,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          role: 'politician',
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
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
        padding: '40px',
        width: '100%',
        maxWidth: '600px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ fontSize: '2rem', color: '#333', marginBottom: '10px' }}>政治人物註冊</h1>
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
              style={{
                width: '100%',
                padding: '12px 16px',
                border: `2px solid ${errors.name ? '#e74c3c' : '#e1e5e9'}`,
                borderRadius: '8px',
                fontSize: '1rem'
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
              style={{
                width: '100%',
                padding: '12px 16px',
                border: `2px solid ${errors.email ? '#e74c3c' : '#e1e5e9'}`,
                borderRadius: '8px',
                fontSize: '1rem'
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
              style={{
                width: '100%',
                padding: '12px 16px',
                border: `2px solid ${errors.phone ? '#e74c3c' : '#e1e5e9'}`,
                borderRadius: '8px',
                fontSize: '1rem'
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
              style={{
                width: '100%',
                padding: '12px 16px',
                border: `2px solid ${errors.position ? '#e74c3c' : '#e1e5e9'}`,
                borderRadius: '8px',
                fontSize: '1rem'
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
              服務縣市 *
            </label>
            <select
              name="county"
              value={formData.county}
              onChange={handleInputChange}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: `2px solid ${errors.county ? '#e74c3c' : '#e1e5e9'}`,
                borderRadius: '8px',
                fontSize: '1rem'
              }}
            >
              <option value="">請選擇縣市</option>
              {counties.map(county => (
                <option key={county} value={county}>
                  {county}
                </option>
              ))}
            </select>
            {errors.county && <span style={{ color: '#e74c3c', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>{errors.county}</span>}
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#333', fontSize: '0.875rem' }}>
              服務區域
            </label>
            <input
              type="text"
              name="district"
              value={formData.district}
              onChange={handleInputChange}
              placeholder="如：第一選區、中正區等"
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #e1e5e9',
                borderRadius: '8px',
                fontSize: '1rem'
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#333', fontSize: '0.875rem' }}>
              辦公室地址
            </label>
            <textarea
              name="office_address"
              value={formData.office_address}
              onChange={handleInputChange}
              placeholder="選填"
              rows="2"
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #e1e5e9',
                borderRadius: '8px',
                fontSize: '1rem'
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
  )
}

export default PoliticianRegister