import React, { useState, useEffect, useCallback } from 'react'
import { CaseService } from '../../../services/caseService'
import '../../../styles/CaseForm.css'

function CaseForm({ team, onSubmit, onCancel }) {
  // 內部狀態管理
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    // 基本資訊
    caseNumber: '',
    contactMethod: 'phone',
    receivedDate: new Date().toISOString().split('T')[0],
    receivedTime: '08:00',
    closedDate: '',
    closedTime: '',
    receiver: '',
    handler: '',
    category: '',
    homeCounty: '',
    homeDistrict: '',
    priority: 'normal',
    hasAttachment: 'none',
    
    // 聯絡資訊
    contact1Name: '',
    contact1Phone: '',
    contact2Name: '',
    contact2Phone: '',
    
    // 陳情內容
    title: '',
    description: '',
    incidentLocation: '',
    incidentCounty: '',
    incidentDistrict: '',
    processingStatus: 'pending',
    
    // 行事曆與通知
    notificationMethod: 'phone',
    reminderDate: '',
    googleCalendarSync: false,
    sendNotification: false,
    multipleReminders: false
  })

  const [dropdownOptions, setDropdownOptions] = useState({
    members: [],
    categories: [],
    counties: [],
    homeDistricts: [],
    incidentDistricts: []
  })

  const [loading, setLoading] = useState(true)

  // 載入行政區資料
  const loadDistricts = async (countyId, type) => {
    try {
      if (!countyId) {
        setDropdownOptions(prev => ({
          ...prev,
          [type === 'home' ? 'homeDistricts' : 'incidentDistricts']: []
        }))
        return
      }

      const result = await CaseService.getDistricts(countyId)
      
      if (result.success) {
        setDropdownOptions(prev => ({
          ...prev,
          [type === 'home' ? 'homeDistricts' : 'incidentDistricts']: result.data || []
        }))
      } else {
        setDropdownOptions(prev => ({
          ...prev,
          [type === 'home' ? 'homeDistricts' : 'incidentDistricts']: []
        }))
      }

    } catch (error) {
      console.error('載入行政區發生錯誤:', error)
    }
  }

  // 生成案件編號
  const generateCaseNumber = () => {
    const now = new Date()
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
    const timeStr = now.getTime().toString().slice(-3)
    const caseNumber = `CASE-${dateStr}-${timeStr}`
    
    setFormData(prev => ({
      ...prev,
      caseNumber
    }))
  }

  // 載入下拉選單資料
  const loadDropdownData = useCallback(async () => {
    setLoading(true)
    try {
      const [membersResult, categoriesResult, countiesResult] = await Promise.all([
        CaseService.getTeamMembers(team.id),
        CaseService.getCategories(team.id),
        CaseService.getCounties()
      ])

      setDropdownOptions({
        members: membersResult.success ? membersResult.data : [],
        categories: categoriesResult.success ? categoriesResult.data : [],
        counties: countiesResult.success ? countiesResult.data : [],
        homeDistricts: [],
        incidentDistricts: []
      })

    } catch (error) {
      console.error('載入下拉選單失敗:', error)
    } finally {
      setLoading(false)
    }
  }, [team.id])

  // 處理表單輸入變更
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))

    // 特殊處理：住家縣市改變時清空住家行政區
    if (field === 'homeCounty') {
      setFormData(prev => ({
        ...prev,
        homeDistrict: ''
      }))
    }

    // 特殊處理：事發地點縣市改變時清空事發地點行政區
    if (field === 'incidentCounty') {
      setFormData(prev => ({
        ...prev,
        incidentDistrict: ''
      }))
    }

    // 特殊處理：結案日期清空時，同時清空結案時間
    if (field === 'closedDate' && !value) {
      setFormData(prev => ({
        ...prev,
        closedTime: ''
      }))
    }

    // 特殊處理：如果設定了結案日期但沒有時間，預設為現在時間
    if (field === 'closedDate' && value && !formData.closedTime) {
      const now = new Date()
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
      setFormData(prev => ({
        ...prev,
        closedTime: currentTime
      }))
    }
  }

  // 表單驗證（簡化版）
  const validateForm = () => {
    const requiredFields = [
      'title',
      'contact1Name',
      'contact1Phone',
      'receiver',
      'category',
      'receivedDate',
      'receivedTime'
    ]

    for (const field of requiredFields) {
      const value = formData[field]
      
      if (!value || !value.toString().trim()) {
        const fieldNames = {
          title: '案件標題',
          contact1Name: '聯絡人1姓名',
          contact1Phone: '聯絡人1電話',
          receiver: '受理人員',
          category: '案件類別',
          receivedDate: '受理日期',
          receivedTime: '受理時間'
        }
        
        const errorMsg = `請填寫 ${fieldNames[field]}`
        alert(errorMsg)
        return false
      }
    }
    
    // 檢查團隊資料
    if (!team || !team.id) {
      alert('團隊資料不完整，無法建立案件')
      return false
    }
    
    // 檢查電話格式
    const phoneRegex = /^[0-9+\-\s()]{8,15}$/
    if (!phoneRegex.test(formData.contact1Phone)) {
      alert('聯絡人1電話格式不正確，請輸入有效的電話號碼')
      return false
    }
    
    // 檢查結案日期時間的一致性
    if (formData.closedDate && !formData.closedTime) {
      alert('請設定結案時間')
      return false
    }
    
    return true
  }

  // 提交表單（簡化版）
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      const result = await CaseService.createCaseWithRelations({
        formData,
        teamId: team.id
      })

      if (result.success) {
        // 直接調用 onSubmit，不顯示成功訊息
        if (onSubmit) {
          await onSubmit(result.data)
        }
      } else {
        // 只在真正失敗時顯示錯誤訊息
        let errorMessage = '建立案件失敗：'
        
        if (result.error.includes('time with time zone')) {
          errorMessage += '日期時間格式問題，請聯繫系統管理員'
        } else if (result.error.includes('foreign key')) {
          errorMessage += '資料關聯問題，請檢查選擇的選項是否正確'
        } else if (result.error.includes('permission')) {
          errorMessage += '權限不足，請聯繫系統管理員'
        } else if (result.error.includes('RLS')) {
          errorMessage += '資料庫權限問題，請聯繫系統管理員'
        } else {
          errorMessage += result.error
        }
        
        alert(errorMessage)
      }

    } catch (error) {
      let errorMessage = '建立案件時發生錯誤：'
      
      if (error.message.includes('network')) {
        errorMessage += '網路連線問題，請檢查網路連線後再試'
      } else if (error.message.includes('timeout')) {
        errorMessage += '請求超時，請稍後再試'
      } else if (error.message.includes('fetch')) {
        errorMessage += '網路請求失敗，請檢查網路連線'
      } else {
        errorMessage += '系統錯誤，請稍後再試'
      }
      
      alert(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  // useEffect hooks
  useEffect(() => {
    loadDropdownData()
  }, [loadDropdownData])

  useEffect(() => {
    if (formData.homeCounty) {
      loadDistricts(formData.homeCounty, 'home')
    }
  }, [formData.homeCounty])

  useEffect(() => {
    if (formData.incidentCounty) {
      loadDistricts(formData.incidentCounty, 'incident')
    }
  }, [formData.incidentCounty])

  useEffect(() => {
    generateCaseNumber()
  }, [])

  // 載入中狀態
  if (loading) {
    return (
      <div style={{ 
        padding: '40px', 
        textAlign: 'center',
        fontSize: '0.9rem',
        color: '#666'
      }}>
        載入中...
      </div>
    )
  }

  return (
    <div className="case-form-container">
      <form onSubmit={handleSubmit} className="case-form">
        
        {/* 基本資訊 */}
        <div className="form-section">
          <h3 className="section-title">基本資訊</h3>
          <div className="form-grid">
            <div className="form-field">
              <label>案件編號</label>
              <input
                type="text"
                value={formData.caseNumber}
                readOnly
                className="readonly-input"
              />
            </div>

            <div className="form-field">
              <label>陳情方式 <span className="required">*</span></label>
              <select
                value={formData.contactMethod}
                onChange={(e) => handleInputChange('contactMethod', e.target.value)}
              >
                <option value="phone">電話</option>
                <option value="line">Line</option>
                <option value="facebook">Facebook</option>
                <option value="email">Email</option>
                <option value="in_person">現場</option>
                <option value="other">其他</option>
              </select>
            </div>

            <div className="form-field">
              <label>受理日期時間 <span className="required">*</span></label>
              <div className="datetime-group">
                <input
                  type="date"
                  value={formData.receivedDate}
                  onChange={(e) => handleInputChange('receivedDate', e.target.value)}
                  required
                  className="date-input"
                />
                <input
                  type="time"
                  value={formData.receivedTime}
                  onChange={(e) => handleInputChange('receivedTime', e.target.value)}
                  required
                  className="time-input"
                />
              </div>
            </div>

            <div className="form-field">
              <label>結案日期時間</label>
              <div className="datetime-group">
                <input
                  type="date"
                  value={formData.closedDate}
                  onChange={(e) => handleInputChange('closedDate', e.target.value)}
                  className="date-input"
                />
                <input
                  type="time"
                  value={formData.closedTime}
                  onChange={(e) => handleInputChange('closedTime', e.target.value)}
                  disabled={!formData.closedDate}
                  className="time-input"
                />
              </div>
            </div>

            <div className="form-field">
              <label>受理人員 <span className="required">*</span></label>
              <select
                value={formData.receiver}
                onChange={(e) => handleInputChange('receiver', e.target.value)}
                required
              >
                <option value="">請選擇受理人員</option>
                {dropdownOptions.members.map(member => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label>承辦人員</label>
              <select
                value={formData.handler}
                onChange={(e) => handleInputChange('handler', e.target.value)}
              >
                <option value="">請選擇承辦人員</option>
                {dropdownOptions.members.map(member => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label>案件類別 <span className="required">*</span></label>
              <select
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                required
              >
                <option value="">請選擇案件類別</option>
                {dropdownOptions.categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label>住家里別</label>
              <div className="district-selector">
                <select
                  value={formData.homeCounty}
                  onChange={(e) => handleInputChange('homeCounty', e.target.value)}
                  className="county-select"
                >
                  <option value="">請選擇縣市</option>
                  {dropdownOptions.counties.map(county => (
                    <option key={county.id} value={county.id}>
                      {county.name}
                    </option>
                  ))}
                </select>
                <select
                  value={formData.homeDistrict}
                  onChange={(e) => handleInputChange('homeDistrict', e.target.value)}
                  disabled={!formData.homeCounty}
                  className="district-select"
                >
                  <option value="">
                    {!formData.homeCounty 
                      ? '請先選擇縣市' 
                      : dropdownOptions.homeDistricts.length === 0 
                        ? '該縣市暫無行政區資料' 
                        : '請選擇行政區'
                    }
                  </option>
                  {dropdownOptions.homeDistricts.map(district => (
                    <option key={district.id} value={district.id}>
                      {district.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-field">
              <label>優先等級 <span className="required">*</span></label>
              <select
                value={formData.priority}
                onChange={(e) => handleInputChange('priority', e.target.value)}
                required
              >
                <option value="urgent">緊急</option>
                <option value="normal">一般</option>
                <option value="low">低</option>
              </select>
            </div>

            <div className="form-field">
              <label>是否有附件</label>
              <select
                value={formData.hasAttachment}
                onChange={(e) => handleInputChange('hasAttachment', e.target.value)}
              >
                <option value="none">無</option>
                <option value="has">有</option>
                <option value="pending">待補</option>
              </select>
            </div>
          </div>
        </div>

        {/* 聯絡資訊 */}
        <div className="form-section">
          <h3 className="section-title">聯絡資訊</h3>
          <div className="form-grid">
            <div className="form-field">
              <label>聯絡人1 <span className="required">*</span></label>
              <input
                type="text"
                value={formData.contact1Name}
                onChange={(e) => handleInputChange('contact1Name', e.target.value)}
                placeholder="請輸入聯絡人姓名"
                required
              />
            </div>

            <div className="form-field">
              <label>聯絡人1電話 <span className="required">*</span></label>
              <input
                type="tel"
                value={formData.contact1Phone}
                onChange={(e) => handleInputChange('contact1Phone', e.target.value)}
                placeholder="請輸入電話號碼"
                required
              />
            </div>

            <div className="form-field">
              <label>聯絡人2</label>
              <input
                type="text"
                value={formData.contact2Name}
                onChange={(e) => handleInputChange('contact2Name', e.target.value)}
                placeholder="請輸入聯絡人姓名"
              />
            </div>

            <div className="form-field">
              <label>聯絡人2電話</label>
              <input
                type="tel"
                value={formData.contact2Phone}
                onChange={(e) => handleInputChange('contact2Phone', e.target.value)}
                placeholder="請輸入電話號碼"
              />
            </div>
          </div>
        </div>

        {/* 陳情內容 */}
        <div className="form-section">
          <h3 className="section-title">陳情內容</h3>
          <div className="form-grid">
            <div className="form-field full-width">
              <label>案件標題 <span className="required">*</span></label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="請輸入案件標題"
                required
              />
            </div>

            <div className="form-field full-width">
              <label>詳細描述</label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="請詳細描述陳情內容"
                rows={4}
              />
            </div>

            <div className="form-field full-width">
              <label>事發地點</label>
              <div className="incident-location-group">
                <div className="district-selector">
                  <select
                    value={formData.incidentCounty}
                    onChange={(e) => handleInputChange('incidentCounty', e.target.value)}
                    className="county-select"
                  >
                    <option value="">請選擇事發縣市</option>
                    {dropdownOptions.counties.map(county => (
                      <option key={county.id} value={county.id}>
                        {county.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={formData.incidentDistrict}
                    onChange={(e) => handleInputChange('incidentDistrict', e.target.value)}
                    disabled={!formData.incidentCounty}
                    className="district-select"
                  >
                    <option value="">
                      {!formData.incidentCounty 
                        ? '請先選擇縣市' 
                        : dropdownOptions.incidentDistricts.length === 0 
                          ? '該縣市暫無行政區資料' 
                          : '請選擇事發行政區'
                      }
                    </option>
                    {dropdownOptions.incidentDistricts.map(district => (
                      <option key={district.id} value={district.id}>
                        {district.name}
                      </option>
                    ))}
                  </select>
                </div>
                <input
                  type="text"
                  value={formData.incidentLocation}
                  onChange={(e) => handleInputChange('incidentLocation', e.target.value)}
                  placeholder="請輸入詳細地點描述"
                  style={{ marginTop: '8px' }}
                />
              </div>
            </div>

            <div className="form-field">
              <label>處理狀態</label>
              <select
                value={formData.processingStatus}
                onChange={(e) => handleInputChange('processingStatus', e.target.value)}
              >
                <option value="pending">待處理</option>
                <option value="processing">處理中</option>
                <option value="completed">已完成</option>
              </select>
            </div>
          </div>
        </div>

        {/* 通知與行事曆設定 */}
        <div className="form-section">
          <h3 className="section-title">通知與行事曆設定</h3>
          <div className="calendar-notification-container">
            {/* 通知設定行 */}
            <div className="notification-row">
              <div className="notification-field">
                <label>通知方式</label>
                <select
                  value={formData.notificationMethod}
                  onChange={(e) => handleInputChange('notificationMethod', e.target.value)}
                  className="notification-select"
                >
                  <option value="phone">電話</option>
                  <option value="sms">簡訊</option>
                  <option value="email">Email</option>
                  <option value="line">Line</option>
                  <option value="other">其他</option>
                </select>
              </div>

              <div className="notification-field">
                <label>提醒日期時間</label>
                <input
                  type="datetime-local"
                  value={formData.reminderDate ? 
                    new Date(formData.reminderDate).toISOString().slice(0, 16) : 
                    ''
                  }
                  onChange={(e) => handleInputChange('reminderDate', e.target.value)}
                  className="datetime-input"
                />
              </div>

              <div className="notification-actions">
                <button
                  type="button"
                  className={`action-btn calendar-btn ${formData.googleCalendarSync ? 'active' : ''}`}
                  onClick={() => handleInputChange('googleCalendarSync', !formData.googleCalendarSync)}
                >
                  <span className="btn-icon">📅</span>
                  同步至 Google 行事曆
                </button>
                
                <button
                  type="button"
                  className={`action-btn notification-btn ${formData.sendNotification ? 'active' : ''}`}
                  onClick={() => handleInputChange('sendNotification', !formData.sendNotification)}
                >
                  <span className="btn-icon">🔔</span>
                  發送通知
                </button>
              </div>
            </div>

            {/* 多次提醒設定 */}
            <div className="multiple-reminder-row">
              <div className="checkbox-container">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.multipleReminders}
                    onChange={(e) => handleInputChange('multipleReminders', e.target.checked)}
                    className="checkbox-input"
                  />
                  <span className="checkbox-text">
                    設定多次提醒（會在設定時間前1天、當天和逾期時自動發送通知）
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="form-footer">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="cancel-btn"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="submit-btn"
          >
            {isSubmitting ? '建立中...' : '建立案件'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default CaseForm