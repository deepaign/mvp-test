// src/components/Case/CaseTables/CaseEditModal.js - 完整修正版
// 包含：案件類別修正 + 住家縣市顯示 + 事發地點顯示 + 純描述內容提取 + ESLint 警告修正
import React, { useState, useEffect, useCallback } from 'react'
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
    }

    loadDropdownData()
  }, [team?.id])

  // 當初始資料變更時更新表單資料
  useEffect(() => {
    if (initialData) {
      console.log('EditableCaseForm 接收到初始資料:', initialData)
      setFormData(initialData)
    }
  }, [initialData])

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
        
        {/* 自定義的表單底部 */}
        <div className="form-footer">
          <div className="footer-buttons">
            <button
              type="button"
              onClick={onCancel}
              className="btn-cancel"
              disabled={isSubmitting}
            >
              取消
            </button>
            <button
              type="submit"
              className="btn-submit"
              disabled={isSubmitting || !hasChanges}
            >
              {isSubmitting ? '儲存中...' : '修改內容'}
            </button>
          </div>
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
  const [counties, setCounties] = useState([])

  /**
   * 解析事發地點資訊
   * @param {string} incidentLocationString - 完整的事發地點字串（如：臺北市信義區信義路五段7號）
   * @returns {Object} 解析結果
   */
  const parseIncidentLocation = useCallback((incidentLocationString) => {
    if (!incidentLocationString || !incidentLocationString.trim()) {
      return {
        countyName: '',
        districtName: '',
        detailAddress: ''
      }
    }

    console.log('解析事發地點:', incidentLocationString)

    // 嘗試解析：縣市 + 行政區 + 詳細地址
    // 假設格式：臺北市信義區信義路五段7號
    
    // 常見的縣市後綴
    const countySuffixes = ['市', '縣']
    // 常見的行政區後綴  
    const districtSuffixes = ['區', '鄉', '鎮', '市']
    
    let countyName = ''
    let districtName = ''
    let detailAddress = incidentLocationString
    
    // 嘗試找到縣市
    for (const suffix of countySuffixes) {
      const countyMatch = incidentLocationString.match(new RegExp(`^([^${suffix}]+${suffix})`))
      if (countyMatch) {
        countyName = countyMatch[1]
        detailAddress = incidentLocationString.substring(countyName.length)
        break
      }
    }
    
    // 如果找到縣市，嘗試在剩餘部分找行政區
    if (countyName && detailAddress) {
      for (const suffix of districtSuffixes) {
        const districtMatch = detailAddress.match(new RegExp(`^([^${suffix}]+${suffix})`))
        if (districtMatch) {
          districtName = districtMatch[1]
          detailAddress = detailAddress.substring(districtName.length)
          break
        }
      }
    }
    
    const result = {
      countyName: countyName.trim(),
      districtName: districtName.trim(), 
      detailAddress: detailAddress.trim()
    }
    
    console.log('解析結果:', result)
    return result
  }, []) // 沒有外部依賴

  /**
   * 輔助函數：從縣市名稱找到對應的 County ID
   * @param {string} countyName - 縣市名稱（如：臺北市）
   * @param {Array} countiesList - 縣市列表
   * @returns {string} County ID 或空字串
   */
  const findCountyIdByName = useCallback((countyName, countiesList) => {
    if (!countyName || !countiesList || countiesList.length === 0) {
      return ''
    }

    console.log('尋找縣市 ID:', { countyName, availableCounties: countiesList.map(c => c.name) })
    
    // 直接比對名稱
    const county = countiesList.find(c => c.name === countyName)
    if (county) {
      console.log(`找到縣市: ${countyName} -> ID: ${county.id}`)
      return county.id
    }

    // 如果直接比對失敗，嘗試一些常見的變體
    const variations = [
      countyName.replace('台', '臺'), // 台 -> 臺
      countyName.replace('臺', '台'), // 臺 -> 台
    ]

    for (const variation of variations) {
      const county = countiesList.find(c => c.name === variation)
      if (county) {
        console.log(`透過變體找到縣市: ${countyName} (${variation}) -> ID: ${county.id}`)
        return county.id
      }
    }

    console.log(`找不到對應的縣市: ${countyName}`)
    return ''
  }, []) // 沒有外部依賴

  /**
   * 將案件資料轉換為表單可用的格式
   * 修正案件類別顯示問題 + 住家縣市顯示問題 + 事發地點顯示問題 + 純描述內容提取
   */
  const prepareEditData = useCallback((caseData) => {
    try {
      console.log('=== 開始準備編輯資料 ===')
      console.log('原始案件資料:', caseData)

      // 提取各種元數據
      const fullIncidentLocation = CaseService.extractIncidentLocation(caseData.description) || ''
      const caseNumber = CaseService.extractCaseNumber(caseData.description) || ''
      
      // **新增：提取純描述內容**
      const pureDescription = CaseService.extractPureDescription(caseData.description) || ''
      
      // **新增：提取時間資訊（優先使用 description 中的資料）**
      const receivedDateTime = CaseService.extractReceivedDateTime(caseData.description)
      const closedDateTime = CaseService.extractClosedDateTime(caseData.description)
      
      // **新增：提取通知設定**
      const notificationSettings = CaseService.extractNotificationSettings(caseData.description)
      
      console.log('提取的特殊欄位:', { 
        fullIncidentLocation, 
        caseNumber, 
        pureDescription,
        receivedDateTime,
        closedDateTime,
        notificationSettings
      })

      // === 解析事發地點 ===
      const incidentLocationInfo = parseIncidentLocation(fullIncidentLocation)
      console.log('事發地點解析結果:', incidentLocationInfo)

      // === 提取聯絡人資料和住家縣市 ===
      const voterCases = caseData.VoterCase || []
      console.log('VoterCase 資料:', voterCases)
      
      let contactPerson = {}
      let voterCountyName = ''
      
      if (voterCases.length > 0 && voterCases[0].Voter) {
        contactPerson = voterCases[0].Voter
        console.log('聯絡人詳細資料:', contactPerson)
        
        // 從 Voter 的 address 欄位提取縣市名稱
        if (contactPerson.address) {
          voterCountyName = contactPerson.address
          console.log('從地址提取的縣市名稱:', voterCountyName)
        }
      }
      
      console.log('聯絡人資料:', contactPerson)

      // 提取承辦人員 (handler)
      const inChargeCases = caseData.InChargeCase || []
      console.log('InChargeCase 資料:', inChargeCases)
      
      let handler = ''
      if (inChargeCases.length > 0) {
        handler = inChargeCases[0].member_id || inChargeCases[0].Member?.id || ''
      }
      
      console.log('承辦人員 ID (handler):', handler)

      // 提取受理人員 (receiver)
      const acceptanceCases = caseData.AcceptanceCase || []
      console.log('AcceptanceCase 資料:', acceptanceCases)
      
      let receiver = ''
      if (acceptanceCases.length > 0) {
        receiver = acceptanceCases[0].member_id || acceptanceCases[0].Member?.id || ''
      }
      
      console.log('受理人員 ID (receiver):', receiver)

      // === 修正案件類別處理邏輯 ===
      const categoryCases = caseData.CategoryCase || []
      console.log('CategoryCase 資料:', categoryCases)
      
      let category = ''
      if (categoryCases.length > 0 && categoryCases[0].Category) {
        const categoryData = categoryCases[0].Category
        console.log('類別詳細資料:', categoryData)
        
        const categoryName = categoryData.name
        console.log('類別名稱:', categoryName)
        
        // 對於 CategoryAutoComplete 組件，我們需要傳遞正確的值
        // 檢查是否為系統預設類別
        const defaultCategoryIds = {
          '交通問題': 'traffic',
          '環境問題': 'environment', 
          '治安問題': 'security',
          '民生服務': 'public_service',
          '法律諮詢': 'legal_consultation'
        }
        
        if (defaultCategoryIds[categoryName]) {
          // 如果是預設類別，使用預設 ID（讓 CategoryAutoComplete 能正確識別和顯示）
          category = defaultCategoryIds[categoryName]
          console.log('識別為預設類別，使用預設 ID:', category)
        } else {
          // 如果是自定義類別，直接使用類別名稱（CategoryAutoComplete 會正確處理）
          category = categoryName
          console.log('識別為自定義類別，使用類別名稱:', category)
        }
      }
      
      console.log('最終案件類別值 (category):', category)

      // **修改：處理受理時間，優先使用從 description 提取的時間**
      let receivedDate = receivedDateTime.date
      let receivedTime = receivedDateTime.time
      
      // 如果 description 中沒有受理時間，則使用 start_date 作為備選
      if (!receivedDate && caseData.start_date) {
        const startDate = new Date(caseData.start_date)
        receivedDate = startDate.toISOString().split('T')[0]
        receivedTime = startDate.toTimeString().split(' ')[0].substring(0, 5)
        console.log('從 start_date 轉換的時間:', { receivedDate, receivedTime })
      } else if (!receivedDate && caseData.created_at) {
        // 如果都沒有，最後使用 created_at
        const createdAt = new Date(caseData.created_at)
        receivedDate = createdAt.toISOString().split('T')[0]
        receivedTime = createdAt.toTimeString().split(' ')[0].substring(0, 5)
        console.log('從 created_at 轉換的時間:', { receivedDate, receivedTime })
      }

      // **新增：處理結案時間，優先使用從 description 提取的時間**
      let closedDate = closedDateTime.date
      let closedTime = closedDateTime.time
      
      // 如果 description 中沒有結案時間，則使用 end_date 作為備選
      if (!closedDate && caseData.end_date) {
        const endDate = new Date(caseData.end_date)
        closedDate = endDate.toISOString().split('T')[0]
        closedTime = endDate.toTimeString().split(' ')[0].substring(0, 5)
        console.log('從 end_date 轉換的時間:', { closedDate, closedTime })
      }

      // 格式化為表單資料 - 確保欄位名稱與 FormSections 組件完全匹配
      const formData = {
        // === BasicInfoSection 欄位 ===
        caseNumber: caseNumber,                                    // 案件編號（只讀）
        contactMethod: caseData.contact_type || 'phone',          // 陳情方式
        receivedDate: receivedDate,                               // 受理日期
        receivedTime: receivedTime,                               // 受理時間
        closedDate: closedDate,                                   // 結案日期
        closedTime: closedTime,                                   // 結案時間
        receiver: receiver,                                       // 受理人員
        handler: handler,                                         // 承辦人員
        category: category,                                       // 案件類別（修正後的邏輯）
        homeCounty: '',                                          // 住家縣市（稍後處理）
        homeDistrict: '',                                        // 住家行政區（暫時不處理）
        priority: caseData.priority || 'normal',                 // 優先等級
        hasAttachment: 'none',                                   // 是否有附件（預設無）
        
        // === ContactInfoSection 欄位 ===
        contact1Name: contactPerson.name || '',                  // 聯絡人1
        contact1Phone: contactPerson.phone || '',                // 電話1
        contact2Name: '',                                        // 聯絡人2（通常為空）
        contact2Phone: '',                                       // 電話2（通常為空）
        
        // === CaseContentSection 欄位 ===
        title: caseData.title || '',                            // 案件標題
        description: pureDescription,                           // **修改：使用純描述內容**
        incidentCounty: '',                                      // 事發縣市（稍後處理）
        incidentDistrict: '',                                    // 事發行政區（暫時空白，因為沒有 District 資料）
        incidentLocation: incidentLocationInfo.detailAddress,    // 事發地點詳細地址（解析後的結果）
        
        // === NotificationSection 欄位 ===
        notificationMethod: notificationSettings.method || caseData.contact_type || 'phone', // **修改：優先使用提取的通知方式**
        googleCalendarSync: false,
        sendNotification: false,
        multipleReminders: notificationSettings.multipleReminders, // **新增：多次提醒設定**
        reminderDate: notificationSettings.reminderDate,       // **新增：提醒日期**
        
        // === 內部使用的輔助欄位 ===
        _voterCountyName: voterCountyName,                       // 暫存住家縣市名稱
        _incidentCountyName: incidentLocationInfo.countyName,    // 暫存事發縣市名稱
        _incidentDistrictName: incidentLocationInfo.districtName // 暫存事發行政區名稱（目前不用）
      }

      console.log('=== 最終格式化的表單資料 ===')
      console.log(formData)

      return formData
    } catch (error) {
      console.error('準備編輯資料時發生錯誤:', error)
      console.error('錯誤堆疊:', error.stack)
      return {}
    }
  }, [parseIncidentLocation]) // parseIncidentLocation 是依賴

  // 載入縣市資料
  useEffect(() => {
    const loadCounties = async () => {
      try {
        const countiesResult = await CaseService.getCounties()
        if (countiesResult.success) {
          setCounties(countiesResult.data || [])
        }
      } catch (error) {
        console.error('載入縣市資料失敗:', error)
      }
    }
    
    loadCounties()
  }, [])

  // 當彈窗開啟時，準備編輯資料
  useEffect(() => {
    if (isOpen && caseData) {
      console.log('=== CaseEditModal 準備編輯資料 ===')
      console.log('原始案件資料:', caseData)
      
      const editData = prepareEditData(caseData)
      console.log('處理後的編輯資料:', editData)
      
      setOriginalData(editData)
      setCurrentFormData(editData)
      setHasChanges(false)
      setError('')
    }
  }, [isOpen, caseData, prepareEditData]) // 加入 prepareEditData 依賴

  // 當表單資料和縣市資料都準備好時，處理住家縣市和事發縣市顯示
  useEffect(() => {
    if (currentFormData && counties && counties.length > 0) {
      let needsUpdate = false
      const updatedFormData = { ...currentFormData }
      const updatedOriginalData = { ...originalData }
      
      // === 處理住家縣市 ===
      if (currentFormData._voterCountyName && !currentFormData.homeCounty) {
        console.log('=== 處理住家縣市顯示 ===')
        console.log('要查找的住家縣市名稱:', currentFormData._voterCountyName)
        
        const homeCountyId = findCountyIdByName(currentFormData._voterCountyName, counties)
        
        if (homeCountyId) {
          console.log('更新 homeCounty:', homeCountyId)
          updatedFormData.homeCounty = homeCountyId
          updatedOriginalData.homeCounty = homeCountyId
          needsUpdate = true
        }
      }
      
      // === 處理事發縣市 ===
      if (currentFormData._incidentCountyName && !currentFormData.incidentCounty) {
        console.log('=== 處理事發縣市顯示 ===')
        console.log('要查找的事發縣市名稱:', currentFormData._incidentCountyName)
        
        const incidentCountyId = findCountyIdByName(currentFormData._incidentCountyName, counties)
        
        if (incidentCountyId) {
          console.log('更新 incidentCounty:', incidentCountyId)
          updatedFormData.incidentCounty = incidentCountyId
          updatedOriginalData.incidentCounty = incidentCountyId
          needsUpdate = true
        }
      }
      
      // 一次性更新所有變更
      if (needsUpdate) {
        console.log('更新表單資料:', updatedFormData)
        setCurrentFormData(updatedFormData)
        setOriginalData(updatedOriginalData)
      }
    }
  }, [currentFormData, counties, originalData, findCountyIdByName]) // 加入 findCountyIdByName 依賴

  /**
   * 檢查資料是否有變更
   */
  const checkForChanges = useCallback((formData) => {
    if (!originalData || !formData) return false
    
    // 深度比較重要欄位
    const importantFields = [
      'title', 'description', 'priority', 'contactMethod',
      'incidentLocation', 'contact1Name', 'contact1Phone', 'contact2Name', 'contact2Phone',
      'handler', 'receiver', 'category', 'receivedDate', 'receivedTime',
      'closedDate', 'closedTime', 'homeCounty', 'homeDistrict',
      'incidentCounty', 'incidentDistrict', 'notificationMethod'
    ]
    
    for (const field of importantFields) {
      const originalValue = originalData[field] || ''
      const currentValue = formData[field] || ''
      
      if (originalValue !== currentValue) {
        console.log(`欄位 ${field} 有變更:`, {
          原始: originalValue,
          現在: currentValue
        })
        return true
      }
    }
    
    return false
  }, [originalData])

  /**
   * 表單資料變更處理
   */
  const handleFormDataChange = useCallback((formData) => {
    console.log('表單資料變更:', formData)
    setCurrentFormData(formData)
    
    const hasDataChanged = checkForChanges(formData)
    setHasChanges(hasDataChanged)
    console.log('是否有變更:', hasDataChanged)
  }, [checkForChanges])

  /**
   * 實際關閉彈窗
   */
  const closeModal = useCallback(() => {
    setShowUnsavedModal(false)
    setHasChanges(false)
    setOriginalData(null)
    setCurrentFormData(null)
    setError('')
    onClose()
  }, [onClose])

  /**
   * 儲存案件修改
   */
  const handleSave = useCallback(async (formData) => {
    if (!originalData || !team?.id) {
      setError('缺少必要資料，無法儲存')
      return
    }

    setSaving(true)
    setError('')

    try {
      console.log('=== 開始儲存案件修改 ===')
      console.log('案件 ID:', caseData.id)
      console.log('原始資料:', originalData)
      console.log('新資料:', formData)

      const result = await CaseService.updateCaseWithRelations({
        caseData: { ...formData, id: caseData.id },
        originalData,
        teamId: team.id,
        dropdownOptions: { counties }
      })

      console.log('更新結果:', result)

      if (result.success) {
        console.log('✅ 案件更新成功')
        
        // 呼叫父組件的回調函數
        if (onCaseUpdated) {
          onCaseUpdated(result.data)
        }
        
        // 關閉彈窗
        closeModal()
        
      } else {
        console.error('❌ 案件更新失敗:', result.error)
        setError(result.error || '更新案件失敗')
      }

    } catch (error) {
      console.error('儲存案件時發生錯誤:', error)
      setError(error.message || '儲存時發生未知錯誤')
    } finally {
      setSaving(false)
    }
  }, [originalData, team?.id, caseData?.id, counties, onCaseUpdated, closeModal])

  /**
   * 關閉彈窗處理
   */
  const handleCloseModal = useCallback(() => {
    if (hasChanges) {
      // 有未儲存的變更，顯示確認彈窗
      setShowUnsavedModal(true)
    } else {
      // 沒有變更，直接關閉
      closeModal()
    }
  }, [hasChanges, closeModal])

  /**
   * 放棄修改
   */
  const handleDiscardChanges = useCallback(() => {
    console.log('使用者選擇放棄修改')
    closeModal()
  }, [closeModal])

  /**
   * 返回表單
   */
  const handleReturnToForm = useCallback(() => {
    console.log('使用者選擇返回表單')
    setShowUnsavedModal(false)
  }, [])

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