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
    closedDate: '',
    receiver: '',
    handler: '',
    category: '',
    homeCounty: '', // 新增：住家縣市
    homeDistrict: '', // 住家里別 -> VoterDistrict
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
    incidentLocation: '', // 事發地點文字描述
    incidentCounty: '', // 新增：事發地點縣市
    incidentDistrict: '', // 事發地點行政區 -> DistrictCase
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
    homeDistricts: [], // 住家里別的行政區選項
    incidentDistricts: [] // 事發地點的行政區選項
  })

  const [loading, setLoading] = useState(true)

  // 載入行政區資料
  const loadDistricts = async (countyId, type) => {
    try {
      console.log(`載入行政區: countyId=${countyId}, type=${type}`) // 除錯用
      
      if (!countyId) {
        // 如果沒有縣市ID，清空對應的行政區選項
        setDropdownOptions(prev => ({
          ...prev,
          [type === 'home' ? 'homeDistricts' : 'incidentDistricts']: []
        }))
        return
      }

      // 使用 CaseService 載入行政區
      const result = await CaseService.getDistricts(countyId)
      
      if (result.success) {
        console.log(`載入到的行政區資料:`, result.data) // 除錯用
        setDropdownOptions(prev => ({
          ...prev,
          [type === 'home' ? 'homeDistricts' : 'incidentDistricts']: result.data || []
        }))
      } else {
        console.error('載入行政區失敗:', result.error)
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
        CaseService.getCounties() // 使用新的 CaseService 方法
      ])

      setDropdownOptions({
        members: membersResult.success ? membersResult.data : [],
        categories: categoriesResult.success ? categoriesResult.data : [],
        counties: countiesResult.success ? countiesResult.data : [],
        homeDistricts: [],
        incidentDistricts: []
      })

      console.log('載入下拉選單資料:', { membersResult, categoriesResult, countiesResult })

    } catch (error) {
      console.error('載入下拉選單失敗:', error)
    } finally {
      setLoading(false)
    }
  }, [team.id])

  // 處理表單輸入變更
  const handleInputChange = (field, value) => {
    console.log(`表單變更: ${field} = ${value}`) // 除錯用
    
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))

    // 特殊處理：住家縣市改變時清空住家行政區
    if (field === 'homeCounty') {
      setFormData(prev => ({
        ...prev,
        homeDistrict: '' // 清空住家行政區
      }))
    }

    // 特殊處理：事發地點縣市改變時清空事發地點行政區
    if (field === 'incidentCounty') {
      setFormData(prev => ({
        ...prev,
        incidentDistrict: '' // 清空事發地點行政區
      }))
    }
  }

  // 表單驗證
  const validateForm = () => {
    console.log('=== 開始表單驗證 ===')
    
    const requiredFields = [
      'title',
      'contact1Name',
      'contact1Phone',
      'receiver',
      'category'
    ]

    for (const field of requiredFields) {
      const value = formData[field]
      console.log(`檢查欄位 ${field}:`, value)
      
      if (!value || !value.toString().trim()) {
        const fieldNames = {
          title: '案件標題',
          contact1Name: '聯絡人1姓名',
          contact1Phone: '聯絡人1電話',
          receiver: '受理人員',
          category: '案件類別'
        }
        
        const errorMsg = `請填寫 ${fieldNames[field]}`
        console.error(`❌ 驗證失敗: ${errorMsg}`)
        alert(errorMsg)
        return false
      }
    }
    
    // 檢查團隊資料
    if (!team || !team.id) {
      console.error('❌ 團隊資料不完整')
      alert('團隊資料不完整，無法建立案件')
      return false
    }
    
    // 檢查電話格式（基本檢查）
    const phoneRegex = /^[0-9+\-\s()]{8,15}$/
    if (!phoneRegex.test(formData.contact1Phone)) {
      console.error('❌ 聯絡人1電話格式不正確')
      alert('聯絡人1電話格式不正確，請輸入有效的電話號碼')
      return false
    }
    
    // 警告：如果選擇了縣市但沒有選擇行政區
    if (formData.homeCounty && !formData.homeDistrict) {
      console.warn('⚠️ 選擇了住家縣市但沒有選擇行政區')
      const confirmMsg = '您選擇了住家縣市但沒有選擇行政區，是否繼續？'
      if (!window.confirm(confirmMsg)) {
        return false
      }
    }
    
    if (formData.incidentCounty && !formData.incidentDistrict) {
      console.warn('⚠️ 選擇了事發縣市但沒有選擇行政區')
      const confirmMsg = '您選擇了事發縣市但沒有選擇行政區，是否繼續？'
      if (!window.confirm(confirmMsg)) {
        return false
      }
    }
    
    console.log('✅ 表單驗證通過')
    return true
  }

  // 提交表單
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    console.log('=== CaseForm.handleSubmit 開始 ===')
    console.log('表單資料:', formData)
    console.log('團隊資料:', team)
    
    if (!validateForm()) {
      console.log('表單驗證失敗')
      return
    }

    console.log('表單驗證通過，開始建立案件')
    
    setIsSubmitting(true) // 設定提交中狀態

    try {
      // 詳細檢查必要資料
      console.log('檢查必要資料:')
      console.log('- Team ID:', team?.id)
      console.log('- 案件標題:', formData.title)
      console.log('- 聯絡人1:', formData.contact1Name)
      console.log('- 聯絡人1電話:', formData.contact1Phone)
      console.log('- 受理人員:', formData.receiver)
      console.log('- 案件類別:', formData.category)
      console.log('- 住家行政區:', formData.homeDistrict || '未選擇')
      console.log('- 事發行政區:', formData.incidentDistrict || '未選擇')
      
      // 檢查 team 物件
      if (!team || !team.id) {
        console.error('❌ 團隊資料不完整:', team)
        alert('團隊資料不完整，無法建立案件')
        return
      }
      
      console.log('✅ 開始呼叫 CaseService.createCaseWithRelations')
      
      // 建立案件
      const result = await CaseService.createCaseWithRelations({
        formData,
        teamId: team.id
      })

      console.log('CaseService.createCaseWithRelations 回傳結果:', result)

      if (result.success) {
        console.log('✅ 案件建立成功!')
        console.log('建立的案件資料:', result.data)
        
        // 顯示更詳細的成功訊息
        const relationSummary = result.data.relationSummary
        if (relationSummary) {
          const successMsg = `案件建立成功！\n\n案件資訊：\n- 案件ID: ${result.data.case.id}\n- 案件標題: ${result.data.case.title}\n- 案件編號: ${result.data.caseNumber}\n\n關聯建立狀況：\n- 成功: ${relationSummary.success} 個\n- 失敗: ${relationSummary.failed} 個\n- 總計: ${relationSummary.total} 個`
          console.log(successMsg)
          alert(successMsg)
        } else {
          alert('案件建立成功！')
        }
        
        // 呼叫父組件的 onSubmit 函數
        console.log('呼叫父組件的 onSubmit 函數')
        if (onSubmit) {
          await onSubmit(result.data)
        }
        
      } else {
        console.error('❌ 案件建立失敗:', result.error)
        
        // 提供更友善的錯誤訊息
        let errorMessage = '建立案件失敗：'
        
        if (result.error.includes('time with time zone')) {
          errorMessage += '日期格式問題，請聯繫系統管理員'
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
      console.error('❌ 提交表單時發生異常:', error)
      console.error('錯誤詳細:', error.message)
      console.error('錯誤堆疊:', error.stack)
      
      // 提供更友善的錯誤訊息
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
      setIsSubmitting(false) // 重置提交中狀態
    }
    
    console.log('=== CaseForm.handleSubmit 結束 ===')
  }

  // useEffect hooks
  useEffect(() => {
    loadDropdownData()
  }, [loadDropdownData])

  // 監聽住家縣市變更，載入對應行政區
  useEffect(() => {
    if (formData.homeCounty) {
      loadDistricts(formData.homeCounty, 'home')
    }
  }, [formData.homeCounty])

  // 監聽事發地點縣市變更，載入對應行政區
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
              <label>受理日期 <span className="required">*</span></label>
              <input
                type="date"
                value={formData.receivedDate}
                onChange={(e) => handleInputChange('receivedDate', e.target.value)}
                required
              />
            </div>

            <div className="form-field">
              <label>結案日期</label>
              <input
                type="date"
                value={formData.closedDate}
                onChange={(e) => handleInputChange('closedDate', e.target.value)}
              />
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
                <input
                  type="text"
                  value={formData.incidentLocation}
                  onChange={(e) => handleInputChange('incidentLocation', e.target.value)}
                  placeholder="請輸入詳細地點描述"
                  style={{ marginBottom: '8px' }}
                />
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

        {/* 行事曆與通知設定 */}
        <div className="form-section">
          <h3 className="section-title">行事曆與通知設定</h3>
          <div className="form-grid">
            <div className="form-field">
              <label>通知方式</label>
              <select
                value={formData.notificationMethod}
                onChange={(e) => handleInputChange('notificationMethod', e.target.value)}
              >
                <option value="phone">電話</option>
                <option value="sms">簡訊</option>
                <option value="email">Email</option>
                <option value="line">Line</option>
                <option value="other">其他</option>
              </select>
            </div>

            <div className="form-field">
              <label>提醒日期</label>
              <input
                type="date"
                value={formData.reminderDate}
                onChange={(e) => handleInputChange('reminderDate', e.target.value)}
              />
            </div>

            <div className="form-field">
              <div className="checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.googleCalendarSync}
                    onChange={(e) => handleInputChange('googleCalendarSync', e.target.checked)}
                  />
                  同步至 Google 行事曆
                </label>
              </div>
            </div>

            <div className="form-field">
              <div className="checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.sendNotification}
                    onChange={(e) => handleInputChange('sendNotification', e.target.checked)}
                  />
                  發送通知
                </label>
              </div>
            </div>

            <div className="form-field full-width">
              <div className="checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.multipleReminders}
                    onChange={(e) => handleInputChange('multipleReminders', e.target.checked)}
                  />
                  設定多次提醒（設定時間前1天、當天和逾期時自動發送通知）
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* 系統提示 */}
        <div className="form-section">
          <div className="form-notice">
            <h4>🔔 系統提示</h4>
            <ul>
              <li>標有 <span className="required">*</span> 的欄位為必填項目</li>
              <li>即使無法選擇行政區，仍可正常建立案件</li>
              <li>系統會自動建立或更新聯絡人資料</li>
              <li>如果部分關聯建立失敗，案件本身仍會建立成功</li>
            </ul>
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