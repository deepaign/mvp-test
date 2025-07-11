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

// 輔助函數：確保回傳有效陣列
function getValidArray(promiseResult, dataType) {
  if (promiseResult.status === 'rejected') {
    console.error(`${dataType} Promise 被拒絕:`, promiseResult.reason)
    return []
  }

  const result = promiseResult.value
  if (!result || typeof result !== 'object') {
    console.error(`${dataType} 回應格式錯誤:`, result)
    return []
  }

  if (result.success && Array.isArray(result.data)) {
    return result.data
  }

  console.warn(`${dataType} 資料無效，使用空陣列:`, result)
  return []
}

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
        console.warn('團隊 ID 不存在，無法載入下拉選單資料')
        setLoading(false)
        return
      }

      try {
        console.log('開始載入下拉選單資料，團隊ID:', team.id)

        // 🔧 使用 Promise.allSettled 替代 Promise.all 來防止單一失敗影響全部
        const promises = [
          CaseService.getTeamMembers(team.id).catch(err => {
            console.error('載入團隊成員失敗:', err)
            return { success: false, data: [], error: err.message }
          }),
          CaseService.getCategories(team.id).catch(err => {
            console.error('載入類別失敗:', err)
            return { success: false, data: [], error: err.message }
          }),
          CaseService.getCounties().catch(err => {
            console.error('載入縣市失敗:', err)
            return { success: false, data: [], error: err.message }
          })
        ]

        const [membersResult, categoriesResult, countiesResult] = await Promise.allSettled(promises)

        // 🔧 關鍵修正：確保所有資料都是陣列，防止 iterable 錯誤
        const newDropdownOptions = {
          members: getValidArray(membersResult, 'members'),
          categories: getValidArray(categoriesResult, 'categories'),
          counties: getValidArray(countiesResult, 'counties'),
          homeDistricts: [],
          incidentDistricts: []
        }

        console.log('下拉選單資料載入結果:', {
          members: newDropdownOptions.members.length,
          categories: newDropdownOptions.categories.length,
          counties: newDropdownOptions.counties.length
        })

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
          if (typeof onDataChange === 'function') {
            onDataChange(updatedFormData)
          }
        }

      } catch (error) {
        console.error('載入下拉選單發生嚴重錯誤:', error)
        // 🔧 發生錯誤時設定空陣列，避免後續 iterable 錯誤
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
  }, [team?.id, initialData?.id]) // 移除 onDataChange 依賴以避免無限循環

  // 當初始資料變更時更新表單資料
  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
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
    if (typeof onDataChange === 'function') {
      onDataChange(newFormData)
    }
  }

  // 處理表單提交
  const handleSubmit = (e) => {
    e.preventDefault()
    if (typeof onSubmit === 'function') {
      onSubmit(formData)
    }
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

        // 🔧 修正：確保 caseService 方法存在，使用安全檢查
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
        const categoryCase = Array.isArray(caseData.CategoryCase) ? caseData.CategoryCase : []
        const inChargeCase = Array.isArray(caseData.InChargeCase) ? caseData.InChargeCase : []
        const acceptanceCase = Array.isArray(caseData.AcceptanceCase) ? caseData.AcceptanceCase : []

        // 🔧 修正：格式化編輯資料，確保所有必要欄位都存在
        const editData = {
          // === BasicInfoSection 欄位 ===
          caseNumber: caseNumber,
          contactMethod: caseData.contact_type || 'phone',
          receivedDate: caseData.received_at ? new Date(caseData.received_at).toISOString().split('T')[0] : '',
          receivedTime: caseData.received_at ? new Date(caseData.received_at).toLocaleTimeString('en-GB', { hour12: false }).slice(0, 5) : '',
          closedDate: caseData.closed_at ? new Date(caseData.closed_at).toISOString().split('T')[0] : '',
          closedTime: caseData.closed_at ? new Date(caseData.closed_at).toLocaleTimeString('en-GB', { hour12: false }).slice(0, 5) : '',
          receiver: acceptanceCase.length > 0 ? acceptanceCase[0].Member?.id || '' : '',
          handler: inChargeCase.length > 0 ? inChargeCase[0].Member?.id || '' : '',
          category: categoryCase.length > 0 ? categoryCase[0].Category?.name || '' : '',
          homeCounty: '',
          homeDistrict: '',
          homeCountyName: voterCases.length > 0 ? parseAddress(voterCases[0].Voter?.address || '').county : '',
          homeDistrictName: voterCases.length > 0 ? parseAddress(voterCases[0].Voter?.address || '').district : '',
          priority: caseData.priority || 'normal',
          hasAttachment: 'none',
          
          // === ContactInfoSection 欄位 ===
          contact1Name: voterCases.length > 0 ? voterCases[0].Voter?.name || '' : '',
          contact1Phone: voterCases.length > 0 ? voterCases[0].Voter?.phone || '' : '',
          contact2Name: voterCases.length > 1 ? voterCases[1].Voter?.name || '' : '',
          contact2Phone: voterCases.length > 1 ? voterCases[1].Voter?.phone || '' : '',
          
          // === CaseContentSection 欄位 ===
          title: caseData.title || '',
          description: caseData.description || '',
          incidentCounty: '',
          incidentDistrict: '',
          incidentCountyName: incidentAddressParsed.county,
          incidentDistrictName: incidentAddressParsed.district,
          incidentLocation: incidentAddressParsed.detailAddress,
          processingStatus: caseData.status || 'pending',
          
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
   */
  const checkForChanges = (formData) => {
    if (!originalData || !formData) return false
    
    const importantFields = [
      'title', 'description', 'priority', 'contactMethod',
      'receivedDate', 'receivedTime', 'closedDate', 'closedTime',
      'contact1Name', 'contact1Phone', 'contact2Name', 'contact2Phone',
      'handler', 'receiver', 'category',
      'incidentLocation', 'homeCounty', 'homeDistrict',
      'incidentCounty', 'incidentDistrict', 'notificationMethod'
    ]
    
    for (const field of importantFields) {
      const originalValue = originalData[field] || ''
      const currentValue = formData[field] || ''
      
      if (originalValue !== currentValue) {
        console.log(`欄位 ${field} 有變更: "${originalValue}" → "${currentValue}"`)
        return true
      }
    }
    
    return false
  }

  /**
   * 表單驗證
   */
  const validateForm = (formData) => {
    if (!formData.title || formData.title.trim() === '') {
      setError('案件標題為必填欄位')
      return false
    }

    if (!formData.contact1Name || formData.contact1Name.trim() === '') {
      setError('聯絡人1為必填欄位')
      return false
    }

    return true
  }

  /**
   * 儲存案件修改
   */
  const handleSave = async (formData) => {
    setError('')
    
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

      const updateData = {
        ...formData,
        id: caseData.id,
        processingStatus: formData.processingStatus || caseData.status || 'pending',
        priority: formData.priority || 'normal',
        contactMethod: formData.contactMethod || 'phone',
      }

      console.log('📋 準備發送的更新資料:', updateData)

      if (!CaseService.updateCaseWithRelations || typeof CaseService.updateCaseWithRelations !== 'function') {
        throw new Error('CaseService.updateCaseWithRelations 方法不存在')
      }

      const result = await CaseService.updateCaseWithRelations({
        caseData: updateData,
        originalData: originalData,
        teamId: team?.id || '',
        dropdownOptions: {}
      })

      console.log('📤 API 呼叫完成')
      console.log('📊 更新結果:', result)

      if (result.success) {
        console.log('✅ 案件更新成功')
        
        if (onCaseUpdated) {
          console.log('🔄 呼叫 onCaseUpdated 回調')
          onCaseUpdated(result.data)
        }
        
        onClose()
      } else {
        console.error('❌ 案件更新失敗:', result.error)
        setError(result.error || '更新失敗')
      }

    } catch (error) {
      console.error('❌ 儲存案件時發生錯誤:', error)
      setError('儲存失敗：' + error.message)
    } finally {
      setSaving(false)
    }
  }

  /**
   * 處理表單資料變更
   */
  const handleFormDataChange = (newFormData) => {
    setCurrentFormData(newFormData)
    setHasChanges(checkForChanges(newFormData))
  }

  /**
   * 處理關閉
   */
  const handleClose = () => {
    if (hasChanges) {
      setShowUnsavedModal(true)
    } else {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <>
      <div className="case-edit-modal-overlay" onClick={handleClose}>
        <div className="case-edit-modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="case-edit-modal-header">
            <h2>編輯案件</h2>
            <button
              onClick={handleClose}
              className="close-btn"
              disabled={saving}
            >
              ×
            </button>
          </div>

          <div className="case-edit-modal-body">
            {error && (
              <div className="error-message" style={{ 
                background: '#ffebee', 
                color: '#c62828', 
                padding: '10px', 
                borderRadius: '4px', 
                marginBottom: '15px' 
              }}>
                {error}
              </div>
            )}

            {currentFormData ? (
              <EditableCaseForm
                team={team}
                initialData={currentFormData}
                onDataChange={handleFormDataChange}
                onSubmit={handleSave}
                onCancel={handleClose}
                isSubmitting={saving}
                hasChanges={hasChanges}
              />
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                準備編輯資料中...
              </div>
            )}
          </div>
        </div>
      </div>

      {showUnsavedModal && (
        <CaseUnsavedChangesModal
          isOpen={showUnsavedModal}
          onClose={() => setShowUnsavedModal(false)}
          onDiscard={() => {
            setShowUnsavedModal(false)
            onClose()
          }}
          onKeepEditing={() => setShowUnsavedModal(false)}
        />
      )}
    </>
  )
}

export default CaseEditModal