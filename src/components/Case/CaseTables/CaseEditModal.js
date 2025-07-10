// src/components/Case/CaseTables/CaseEditModal.js
import React, { useState, useEffect } from 'react'
import { 
  BasicInfoSection, 
  ContactInfoSection, 
  CaseContentSection, 
  NotificationSection 
} from '../CaseModal/CaseForm/FormSections'
import CaseUnsavedChangesModal from './CaseUnsavedChangesModal'
import { CaseService } from '../../../services/caseService'
import '../../../styles/CaseEditModal.css'

// 編輯專用的表單組件
const EditableCaseForm = ({ team, initialData, onDataChange, onSubmit, onCancel, isSubmitting, hasChanges }) => {
  const [formData, setFormData] = useState(initialData || {})
  const [dropdownOptions, setDropdownOptions] = useState({
    members: [],
    categories: [],
    counties: [],
    homeDistricts: [],
    incidentDistricts: []
  })
  const [loading, setLoading] = useState(true)

  // 載入下拉選單資料
  useEffect(() => {
    const loadDropdownData = async () => {
      if (!team?.id) {
        setLoading(false)
        return
      }

      try {
        const [membersResult, categoriesResult, countiesResult] = await Promise.all([
          CaseService.getTeamMembers(team.id),
          CaseService.getCategories(team.id),
          CaseService.getCounties()
        ])

        // 🔧 修正：確保所有資料都是陣列，防止 iterable 錯誤
        const newDropdownOptions = {
          members: (membersResult.success && Array.isArray(membersResult.data)) ? membersResult.data : [],
          categories: (categoriesResult.success && Array.isArray(categoriesResult.data)) ? categoriesResult.data : [],
          counties: (countiesResult.success && Array.isArray(countiesResult.data)) ? countiesResult.data : [],
          homeDistricts: [],
          incidentDistricts: []
        }

        setDropdownOptions(newDropdownOptions)

        // 🔧 修正：確保初始資料存在且 counties 資料可用
        if (initialData && newDropdownOptions.counties.length > 0) {
          let updatedFormData = { ...initialData }

          // 設定住家縣市 - 加入安全檢查
          if (initialData.homeCountyName) {
            const homeCounty = newDropdownOptions.counties.find(c => c.name === initialData.homeCountyName)
            if (homeCounty) {
              updatedFormData.homeCounty = homeCounty.id
              console.log('設定住家縣市:', homeCounty.name, '→', homeCounty.id)
            }
          }

          // 設定事發地點縣市 - 加入安全檢查
          if (initialData.incidentCountyName) {
            const incidentCounty = newDropdownOptions.counties.find(c => c.name === initialData.incidentCountyName)
            if (incidentCounty) {
              updatedFormData.incidentCounty = incidentCounty.id
              console.log('設定事發地點縣市:', incidentCounty.name, '→', incidentCounty.id)
            }
          }

          setFormData(updatedFormData)
          onDataChange(updatedFormData)
        }
      } catch (error) {
        console.error('載入下拉選單失敗:', error)
        // 🔧 修正：發生錯誤時設定空陣列，避免後續 iterable 錯誤
        setDropdownOptions({
          members: [],
          categories: [],
          counties: [],
          homeDistricts: [],
          incidentDistricts: []
        })
      } finally {
        setLoading(false)
      }
    }

    loadDropdownData()
  }, [team?.id, initialData, onDataChange])

  // 當初始資料變更時更新表單資料
  useEffect(() => {
    // 🔧 修正：更安全的條件檢查
    if (initialData && (!dropdownOptions.counties || dropdownOptions.counties.length === 0)) {
      console.log('EditableCaseForm 接收到初始資料:', initialData)
      setFormData(initialData)
    }
  }, [initialData, dropdownOptions.counties])

  // 處理表單輸入變更
  const handleInputChange = (field, value) => {
    console.log(`表單欄位變更: ${field} = ${value}`)
    
    const newFormData = {
      ...formData,
      [field]: value
    }

    // 特殊處理邏輯
    if (field === 'homeCounty') {
      newFormData.homeDistrict = ''
    }
    if (field === 'incidentCounty') {
      newFormData.incidentDistrict = ''
    }
    if (field === 'closedDate' && !value) {
      newFormData.closedTime = ''
    }

    setFormData(newFormData)
    onDataChange(newFormData)
  }

  // 處理表單提交
  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(formData)
  }

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
        載入中...
      </div>
    )
  }

  return (
    <div className="case-form-container">
      <form onSubmit={handleSubmit} className="case-form">
        <BasicInfoSection 
          formData={formData}
          dropdownOptions={dropdownOptions}
          onChange={handleInputChange}
        />
        
        <ContactInfoSection 
          formData={formData}
          onChange={handleInputChange}
        />
        
        <CaseContentSection 
          formData={formData}
          dropdownOptions={dropdownOptions}
          onChange={handleInputChange}
        />
        
        <NotificationSection 
          formData={formData}
          onChange={handleInputChange}
        />
        
        {/* 使用與新增案件相同的表單底部樣式 */}
        <div className="form-footer">
          <button
            type="button"
            onClick={onCancel}
            className="cancel-btn"
            disabled={isSubmitting}
          >
            取消
          </button>
          <button
            type="submit"
            className="submit-btn"
            disabled={isSubmitting || !hasChanges}
          >
            {isSubmitting ? '儲存中...' : '修改內容'}
          </button>
        </div>
      </form>
    </div>
  )
}

function CaseEditModal({ isOpen, onClose, caseData, team, onCaseUpdated }) {
  const [originalData, setOriginalData] = useState(null)
  const [currentFormData, setCurrentFormData] = useState(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showUnsavedModal, setShowUnsavedModal] = useState(false)
  const [error, setError] = useState('')

  /**
   * 解析地址為縣市和行政區
   */
  const parseAddress = (address) => {
    if (!address) return { county: '', district: '', detailAddress: '' }
    
    // 台灣縣市的匹配模式
    const taiwanCitiesPattern = /(臺北市|台北市|新北市|桃園市|臺中市|台中市|臺南市|台南市|高雄市|基隆市|新竹市|嘉義市|新竹縣|苗栗縣|彰化縣|南投縣|雲林縣|嘉義縣|屏東縣|宜蘭縣|花蓮縣|臺東縣|台東縣|澎湖縣|金門縣|連江縣)/
    
    // 行政區的匹配模式（區、鄉、鎮、市）
    const districtPattern = /([^市縣]*?(?:區|鄉|鎮|市))/
    
    const cityMatch = address.match(taiwanCitiesPattern)
    const city = cityMatch ? cityMatch[1] : ''
    
    // 移除縣市後尋找行政區
    const remainingAddress = city ? address.replace(city, '').trim() : address
    const districtMatch = remainingAddress.match(districtPattern)
    const district = districtMatch ? districtMatch[1] : ''
    
    // 剩餘地址
    const detailAddress = district ? 
      remainingAddress.replace(district, '').trim() : 
      remainingAddress
    
    console.log('地址解析結果:', { 
      原始地址: address, 
      縣市: city, 
      行政區: district, 
      詳細地址: detailAddress 
    })
    
    return { county: city, district: district, detailAddress: detailAddress }
  }

  // 當彈窗開啟時，準備編輯資料
  useEffect(() => {
    if (isOpen && caseData) {
      console.log('=== CaseEditModal 準備編輯資料 ===')
      console.log('原始案件資料:', caseData)
      
      try {
        console.log('=== 開始準備編輯資料 ===')

        // 🔧 修正：確保 caseService 方法存在
        const rawIncidentLocation = (CaseService.extractIncidentLocation && typeof CaseService.extractIncidentLocation === 'function') 
          ? CaseService.extractIncidentLocation(caseData.description) || ''
          : ''
        console.log('原始事發地點:', rawIncidentLocation)
        
        // 解析事發地點的縣市和行政區
        const incidentAddressParsed = parseAddress(rawIncidentLocation)
        
        const caseNumber = (CaseService.extractCaseNumber && typeof CaseService.extractCaseNumber === 'function')
          ? CaseService.extractCaseNumber(caseData.description) || ''
          : ''
        console.log('提取的案件編號:', caseNumber)

        // 🔧 修正：安全的陣列處理
        const voterCases = Array.isArray(caseData.VoterCase) ? caseData.VoterCase : []
        console.log('VoterCase 資料:', voterCases)
        
        let contactPerson = {}
        if (voterCases.length > 0 && voterCases[0]?.Voter) {
          contactPerson = voterCases[0].Voter
        }
        console.log('聯絡人資料:', contactPerson)
        
        // 解析聯絡人住家地址
        const homeAddressParsed = parseAddress(contactPerson.address || '')

        // 🔧 修正：安全的陣列處理
        const inChargeCases = Array.isArray(caseData.InChargeCase) ? caseData.InChargeCase : []
        console.log('InChargeCase 資料:', inChargeCases)
        
        let handler = ''
        if (inChargeCases.length > 0 && inChargeCases[0]) {
          handler = inChargeCases[0].member_id || ''
        }
        console.log('承辦人員 member_id:', handler)

        // 🔧 修正：安全的陣列處理
        const acceptanceCases = Array.isArray(caseData.AcceptanceCase) ? caseData.AcceptanceCase : []
        console.log('AcceptanceCase 資料:', acceptanceCases)
        
        let receiver = ''
        if (acceptanceCases.length > 0 && acceptanceCases[0]) {
          receiver = acceptanceCases[0].member_id || ''
        }
        console.log('受理人員 member_id:', receiver)

        // 🔧 修正：安全的陣列處理
        const categoryCases = Array.isArray(caseData.CategoryCase) ? caseData.CategoryCase : []
        console.log('CategoryCase 資料:', categoryCases)
        
        let category = ''
        if (categoryCases.length > 0 && categoryCases[0]?.Category) {
          category = categoryCases[0].Category.name || ''
        }
        console.log('案件類別名稱 (category):', category)

        // 提取受理時間
        const receivedDateTimeMatch = caseData.description?.match(/受理時間：(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})/)
        let receivedDate = ''
        let receivedTime = ''
        
        if (receivedDateTimeMatch) {
          receivedDate = receivedDateTimeMatch[1]
          receivedTime = receivedDateTimeMatch[2]
          console.log('從 description 提取的時間:', { receivedDate, receivedTime })
        } else if (caseData.created_at) {
          const createdAt = new Date(caseData.created_at)
          receivedDate = createdAt.toISOString().split('T')[0]
          receivedTime = createdAt.toTimeString().split(' ')[0].substring(0, 5)
          console.log('從 created_at 轉換的時間:', { receivedDate, receivedTime })
        }

        // 處理結束時間
        let closedDate = ''
        let closedTime = ''
        
        if (caseData.end_date) {
          const endDate = new Date(caseData.end_date)
          closedDate = endDate.toISOString().split('T')[0]
          closedTime = endDate.toTimeString().split(' ')[0].substring(0, 5)
          console.log('結束時間:', { closedDate, closedTime })
        }

        // 🔧 修正：清理 description，移除已經提取到專用欄位的內容
        let cleanDescription = caseData.description || ''
        
        // 移除事發地點
        cleanDescription = cleanDescription.replace(/事發地點：[^\n\r]+/g, '')
        
        // 移除受理時間
        cleanDescription = cleanDescription.replace(/受理時間：[^\n\r]+/g, '')
        
        // 移除案件編號
        cleanDescription = cleanDescription.replace(/案件編號：[^\n\r]+/g, '')
        
        // 移除通知設定
        cleanDescription = cleanDescription.replace(/通知設定：[\s\S]*?(?=\n\n|\n[^\-\s]|$)/g, '')
        
        // 清理多餘的換行和空白
        cleanDescription = cleanDescription
          .replace(/\n{3,}/g, '\n\n')  // 多個換行變成兩個
          .replace(/^\s+|\s+$/g, '')   // 移除前後空白
        
        console.log('清理後的描述:', cleanDescription)

        // 格式化為表單資料
        const editData = {
          // === BasicInfoSection 欄位 ===
          caseNumber: caseNumber,
          contactMethod: caseData.contact_type || 'phone',
          receivedDate: receivedDate,
          receivedTime: receivedTime,
          closedDate: closedDate,
          closedTime: closedTime,
          receiver: receiver,                                      // member_id
          handler: handler,                                        // member_id
          category: category,                                      // 🔧 使用類別名稱
          
          // 🔧 解析住家地址的縣市和行政區
          homeCounty: '',                                          // 暫時留空，等下拉選單載入後再設定
          homeDistrict: '',                                        // 暫時留空
          homeCountyName: homeAddressParsed.county,                // 儲存縣市名稱用於後續匹配
          homeDistrictName: homeAddressParsed.district,            // 儲存行政區名稱
          
          priority: caseData.priority || 'normal',
          hasAttachment: 'none',
          
          // === ContactInfoSection 欄位 ===
          contact1Name: contactPerson.name || '',
          contact1Phone: contactPerson.phone || '',
          contact2Name: '',
          contact2Phone: '',
          
          // === CaseContentSection 欄位 ===
          title: caseData.title || '',
          description: cleanDescription,                           // 🔧 使用清理後的描述
          
          // 🔧 解析事發地點的縣市和行政區
          incidentCounty: '',                                      // 暫時留空，等下拉選單載入後再設定
          incidentDistrict: '',                                    // 暫時留空
          incidentCountyName: incidentAddressParsed.county,        // 儲存縣市名稱用於後續匹配
          incidentDistrictName: incidentAddressParsed.district,    // 儲存行政區名稱
          incidentLocation: incidentAddressParsed.detailAddress,   // 🔧 只保留詳細地址部分
          
          // === NotificationSection 欄位 ===
          notificationMethod: caseData.contact_type || 'phone',
          googleCalendarSync: false,
          sendNotification: false,
          multipleReminders: false,
          reminderDate: ''
        }

        console.log('=== 最終格式化的表單資料 ===')
        console.log(editData)
        
        setOriginalData(editData)
        setCurrentFormData(editData)
        setHasChanges(false)
        setError('')
      } catch (error) {
        console.error('準備編輯資料時發生錯誤:', error)
        console.error('錯誤堆疊:', error.stack)
        setError('載入案件資料失敗')
      }
    }
  }, [isOpen, caseData])

  /**
   * 檢查資料是否有變更
   * 🔧 修正：確保欄位名稱與 updateCaseWithRelations 一致
   */
  const checkForChanges = (formData) => {
    if (!originalData || !formData) return false
    
    // 🔧 修正：使用與 CaseService 中 checkCaseDataChanges 一致的欄位名稱
    const importantFields = [
      // 主要案件資料欄位
      'title', 'description', 'priority', 'contactMethod',
      'receivedDate', 'receivedTime', 'closedDate', 'closedTime',
      
      // 聯絡人欄位
      'contact1Name', 'contact1Phone', 'contact2Name', 'contact2Phone',
      
      // 人員指派欄位（重要！）
      'handler', 'receiver',
      
      // 案件類別欄位
      'category',
      
      // 地點欄位
      'incidentLocation', 'homeCounty', 'homeDistrict',
      'incidentCounty', 'incidentDistrict',
      
      // 通知欄位
      'notificationMethod'
    ]
    
    for (const field of importantFields) {
      const originalValue = originalData[field] || ''
      const currentValue = formData[field] || ''
      
      if (originalValue !== currentValue) {
        console.log(`🔄 欄位 ${field} 有變更:`, {
          原始: originalValue,
          現在: currentValue
        })
        return true
      }
    }
    
    return false
  }

  /**
   * 表單資料變更處理
   * 🔧 新增：詳細日誌輸出，便於除錯
   */
  const handleFormDataChange = (formData) => {
    console.log('📝 表單資料變更:', formData)
    setCurrentFormData(formData)
    
    const hasDataChanged = checkForChanges(formData)
    setHasChanges(hasDataChanged)
    console.log('✅ 是否有變更:', hasDataChanged)
    
    // 🔧 新增：輸出關鍵欄位的值，便於除錯
    console.log('🔍 關鍵欄位值:', {
      handler: formData.handler,
      receiver: formData.receiver,
      category: formData.category,
      title: formData.title
    })
  }

  /**
   * 驗證必填欄位（與新增案件相同的驗證邏輯）
   */
  const validateForm = (formData) => {
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
        
        setError(`請填寫 ${fieldNames[field]}`)
        return false
      }
    }
    
    // 檢查電話格式
    const phoneRegex = /^[0-9+\-\s()]{8,15}$/
    if (!phoneRegex.test(formData.contact1Phone)) {
      setError('聯絡人1電話格式不正確，請輸入有效的電話號碼')
      return false
    }
    
    // 檢查結案日期時間的一致性
    if (formData.closedDate && !formData.closedTime) {
      setError('請設定結案時間')
      return false
    }
    
    return true
  }

  /**
   * 儲存案件修改
   * 🔧 修正：確保資料格式與 CaseService 期望一致，加強除錯
   */
  const handleSave = async (formData) => {
    setError('') // 清除之前的錯誤訊息
    
    // 🔧 修正：先驗證必填欄位
    if (!validateForm(formData)) {
      return
    }

    if (!caseData?.id) {
      setError('缺少案件資料，無法儲存')
      return
    }

    setSaving(true)

    try {
      console.log('=== 🚀 開始儲存案件修改 ===')
      console.log('📄 案件 ID:', caseData.id)
      console.log('📊 原始資料:', originalData)
      console.log('📝 新資料:', formData)

      // 🔧 修正：準備正確的更新資料格式，確保包含處理狀態
      const updateData = {
        ...formData,
        id: caseData.id,  // 確保包含案件 ID
        
        // 🔧 重要：確保狀態欄位名稱正確
        processingStatus: formData.processingStatus || caseData.status || 'pending',
        
        // 🔧 確保這些欄位有值
        priority: formData.priority || 'normal',
        contactMethod: formData.contactMethod || 'phone',
      }

      console.log('📋 準備發送的更新資料:', updateData)

      // 🔧 修正：檢查 CaseService 方法是否存在
      if (!CaseService.updateCaseWithRelations || typeof CaseService.updateCaseWithRelations !== 'function') {
        throw new Error('CaseService.updateCaseWithRelations 方法不存在')
      }

      // 🔧 修正：使用正確的參數格式調用 updateCaseWithRelations
      const result = await CaseService.updateCaseWithRelations({
        caseData: updateData,
        originalData: originalData,
        teamId: team?.id || '',
        dropdownOptions: {} // 如果需要縣市行政區轉換，這裡可以傳入
      })

      console.log('📤 API 呼叫完成')
      console.log('📊 更新結果:', result)

      if (result.success) {
        console.log('✅ 案件更新成功')
        console.log('📈 更新摘要:', result.data?.summary)
        console.log('🔄 更新詳情:', result.data?.updateResults)
        
        // 呼叫父組件的回調函數
        if (onCaseUpdated) {
          console.log('🔄 呼叫 onCaseUpdated 回調')
          onCaseUpdated(result.data)
        }
        
        // 關閉彈窗
        closeModal()
        
      } else {
        console.error('❌ 案件更新失敗:', result.error)
        setError(result.error || '更新案件失敗')
      }

    } catch (error) {
      console.error('💥 儲存案件時發生錯誤:', error)
      setError(error.message || '儲存時發生未知錯誤')
    } finally {
      setSaving(false)
    }
  }

  /**
   * 關閉彈窗處理
   * 🔧 修正：確保彈窗關閉後清理所有狀態
   */
  const handleCloseModal = () => {
    if (hasChanges) {
      // 有未儲存的變更，顯示確認彈窗
      setShowUnsavedModal(true)
    } else {
      // 沒有變更，直接關閉
      closeModal()
    }
  }

  /**
   * 實際關閉彈窗
   * 🔧 修正：確保所有狀態都被正確重置
   */
  const closeModal = () => {
    console.log('🔒 關閉編輯彈窗')
    setShowUnsavedModal(false)
    setHasChanges(false)
    setOriginalData(null)
    setCurrentFormData(null)
    setError('')
    setSaving(false)  // 🔧 新增：確保儲存狀態被重置
    onClose()
  }

  /**
   * 放棄修改
   */
  const handleDiscardChanges = () => {
    console.log('使用者選擇放棄修改')
    closeModal()
  }

  /**
   * 返回表單
   */
  const handleReturnToForm = () => {
    console.log('使用者選擇返回表單')
    setShowUnsavedModal(false)
  }

  if (!isOpen) return null

  return (
    <>
      {/* 主編輯彈窗 */}
      <div className="case-edit-modal-overlay">
        <div className="case-edit-modal">
          {/* 標題列 */}
          <div className="case-edit-modal-header">
            <h2>修改案件</h2>
            <button 
              className="case-edit-modal-close"
              onClick={handleCloseModal}
              disabled={saving}
            >
              ✕
            </button>
          </div>

          {/* 錯誤訊息 */}
          {error && (
            <div className="case-edit-modal-error">
              ❌ {error}
            </div>
          )}

          {/* 表單內容 */}
          <div className="case-edit-modal-content">
            {currentFormData ? (
              <EditableCaseForm
                team={team}
                initialData={currentFormData}
                onDataChange={handleFormDataChange}
                onSubmit={handleSave}
                onCancel={handleCloseModal}
                isSubmitting={saving}
                hasChanges={hasChanges}
              />
            ) : (
              <div className="case-edit-modal-loading">
                載入中...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 未儲存變更確認彈窗 */}
      <CaseUnsavedChangesModal
        isOpen={showUnsavedModal}
        onDiscard={handleDiscardChanges}
        onReturn={handleReturnToForm}
      />
    </>
  )
}

export default CaseEditModal