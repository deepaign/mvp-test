// src/components/Case/CaseTables/CaseEditModal.js - 修正 ESLint 警告的完整版本
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

// 地址解析輔助函數
function parseAddress(address) {
  if (!address || typeof address !== 'string') {
    return { county: '', district: '' }
  }

  // 簡單的地址解析邏輯
  const parts = address.split(/[市縣區鄉鎮]/)
  if (parts.length >= 2) {
    return {
      county: parts[0] + (address.includes('市') ? '市' : '縣'),
      district: parts[1] + (address.includes('區') ? '區' : address.includes('鄉') ? '鄉' : '鎮')
    }
  }

  return { county: '', district: '' }
}

// 轉換案件資料為表單格式
function convertCaseDataToFormData(caseData) {
  if (!caseData) return {}

  console.log('轉換案件資料為表單格式:', caseData)

  // 安全的日期轉換函數
  const safeFormatDate = (dateValue) => {
    if (!dateValue) return ''
    
    try {
      const date = new Date(dateValue)
      if (isNaN(date.getTime())) {
        console.warn('無效的日期值:', dateValue)
        return ''
      }
      return date.toISOString().split('T')[0]
    } catch (error) {
      console.error('日期轉換錯誤:', error, dateValue)
      return ''
    }
  }

  // 安全的時間轉換函數
  const safeFormatTime = (dateValue) => {
    if (!dateValue) return ''
    
    try {
      const date = new Date(dateValue)
      if (isNaN(date.getTime())) {
        console.warn('無效的時間值:', dateValue)
        return ''
      }
      return date.toLocaleTimeString('en-GB', { hour12: false }).slice(0, 5)
    } catch (error) {
      console.error('時間轉換錯誤:', error, dateValue)
      return ''
    }
  }

  // 提取關聯資料
  const voterCases = Array.isArray(caseData.VoterCase) ? caseData.VoterCase : []
  const categoryCase = Array.isArray(caseData.CategoryCase) ? caseData.CategoryCase : []
  const acceptanceCase = Array.isArray(caseData.AcceptanceCase) ? caseData.AcceptanceCase : []
  const inChargeCase = Array.isArray(caseData.InChargeCase) ? caseData.InChargeCase : []

  const formData = {
    // 案件 ID（用於更新）
    id: caseData.id,

    // === BasicInfoSection 欄位 ===
    caseNumber: CaseService.extractCaseNumber ? CaseService.extractCaseNumber(caseData.description) : '',
    contactMethod: caseData.contact_type || 'phone',
    receivedDate: safeFormatDate(caseData.start_date),
    receivedTime: safeFormatTime(caseData.start_date),
    closedDate: safeFormatDate(caseData.end_date),
    closedTime: safeFormatTime(caseData.end_date),
    receiver: acceptanceCase.length > 0 ? acceptanceCase[0].Member?.id || '' : '',
    assignee: inChargeCase.length > 0 ? inChargeCase[0].Member?.id || '' : '',
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
    incidentLocation: CaseService.extractIncidentLocation ? 
      CaseService.extractIncidentLocation(caseData.description) : '',
    description: caseData.description || '',
    
    // === NotificationSection 欄位 ===
    enableNotifications: false,
    notificationMethod: 'phone',
    reminderCount: 1,
    enableCalendarSync: false,

    // === 處理狀態 ===
    processingStatus: caseData.status || 'pending'
  }

  console.log('轉換後的表單資料:', formData)
  return formData
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

  // 🔧 穩定的 onDataChange 包裝器
  const stableOnDataChange = useCallback((data) => {
    if (typeof onDataChange === 'function') {
      onDataChange(data)
    }
  }, [onDataChange])

  // 載入行政區資料
  const loadDistricts = useCallback(async (countyId, type) => {
    if (!countyId) {
      console.warn(`${type}縣市ID為空，無法載入行政區`)
      return
    }

    try {
      console.log(`開始載入${type}行政區，縣市ID:`, countyId)
      
      const result = await CaseService.getDistricts(countyId)
      
      if (result.success) {
        const validDistricts = Array.isArray(result.data) ? result.data : []
        
        setDropdownOptions(prev => ({
          ...prev,
          [type === 'home' ? 'homeDistricts' : 'incidentDistricts']: validDistricts
        }))
        
        console.log(`${type}行政區載入成功:`, validDistricts.length, '筆')
      } else {
        console.error(`載入${type}行政區失敗:`, result.error)
        setDropdownOptions(prev => ({
          ...prev,
          [type === 'home' ? 'homeDistricts' : 'incidentDistricts']: []
        }))
      }

    } catch (error) {
      console.error(`載入${type}行政區發生錯誤:`, error)
      setDropdownOptions(prev => ({
        ...prev,
        [type === 'home' ? 'homeDistricts' : 'incidentDistricts']: []
      }))
    }
  }, [])

  // 載入下拉選單資料
  const loadDropdownData = useCallback(async () => {
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
            
            // 載入住家行政區
            await loadDistricts(homeCounty.id, 'home')
          }
        }

        // 設定事發地點縣市 - 加入安全檢查
        if (initialData.incidentCountyName) {
          const incidentCounty = newDropdownOptions.counties.find(c => c.name === initialData.incidentCountyName)
          if (incidentCounty) {
            updatedFormData.incidentCounty = incidentCounty.id
            console.log('設定事發地點縣市:', incidentCounty.name, '→', incidentCounty.id)
            
            // 載入事發地點行政區
            await loadDistricts(incidentCounty.id, 'incident')
          }
        }

        setFormData(updatedFormData)
        stableOnDataChange(updatedFormData)
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
  }, [team?.id, initialData, stableOnDataChange, loadDistricts])

  // 🔧 修正：使用 useCallback 包裝 useEffect 內的邏輯
  const updateFormDataFromInitial = useCallback(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      console.log('EditableCaseForm 接收到初始資料:', initialData)
      setFormData(initialData)
    }
  }, [initialData])

  // 載入下拉選單資料 - 修正依賴問題
  useEffect(() => {
    loadDropdownData()
  }, [loadDropdownData])

  // 當初始資料變更時更新表單資料 - 修正依賴問題
  useEffect(() => {
    updateFormDataFromInitial()
  }, [updateFormDataFromInitial])

  // 監聽縣市變更，載入對應行政區
  useEffect(() => {
    if (formData.homeCounty) {
      console.log('住家縣市變更，載入行政區:', formData.homeCounty)
      loadDistricts(formData.homeCounty, 'home')
    } else {
      // 清空住家行政區
      setDropdownOptions(prev => ({
        ...prev,
        homeDistricts: []
      }))
    }
  }, [formData.homeCounty, loadDistricts])

  useEffect(() => {
    if (formData.incidentCounty) {
      console.log('事發縣市變更，載入行政區:', formData.incidentCounty)
      loadDistricts(formData.incidentCounty, 'incident')
    } else {
      // 清空事發行政區
      setDropdownOptions(prev => ({
        ...prev,
        incidentDistricts: []
      }))
    }
  }, [formData.incidentCounty, loadDistricts])

  // 處理表單輸入變更
  const handleInputChange = useCallback((field, value) => {
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
    stableOnDataChange(newFormData)
  }, [formData, stableOnDataChange])

  // 處理表單提交
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault()
    
    if (typeof onSubmit === 'function') {
      onSubmit(formData)
    }
  }, [formData, onSubmit])

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>載入編輯表單中...</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="case-edit-form">
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

      <div className="form-actions">
        <button
          type="button"
          onClick={onCancel}
          className="btn btn-secondary"
          disabled={isSubmitting}
        >
          取消
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={isSubmitting || !hasChanges}
        >
          {isSubmitting ? '儲存中...' : '儲存變更'}
        </button>
      </div>
    </form>
  )
}

// 主要的編輯模態框組件
function CaseEditModal({ isOpen, onClose, caseData, team, onCaseUpdated }) {
  const [formData, setFormData] = useState({})
  const [originalData, setOriginalData] = useState({})
  const [hasChanges, setHasChanges] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showUnsavedModal, setShowUnsavedModal] = useState(false)

  // 初始化表單資料
  useEffect(() => {
    if (caseData && isOpen) {
      console.log('CaseEditModal 初始化，案件資料:', caseData)
      const initialFormData = convertCaseDataToFormData(caseData)
      setFormData(initialFormData)
      setOriginalData(initialFormData)
      setHasChanges(false)
    }
  }, [caseData, isOpen])

  // 檢查是否有變更
  const checkForChanges = useCallback((currentData, originalData) => {
    const hasChanges = JSON.stringify(currentData) !== JSON.stringify(originalData)
    setHasChanges(hasChanges)
    console.log('檢查變更:', hasChanges)
  }, [])

  // 處理表單資料變更
  const handleDataChange = useCallback((newData) => {
    setFormData(newData)
    checkForChanges(newData, originalData)
  }, [originalData, checkForChanges])

  // 處理關閉
  const handleClose = useCallback(() => {
    if (hasChanges) {
      setShowUnsavedModal(true)
    } else {
      onClose()
    }
  }, [hasChanges, onClose])

  // 處理表單提交
  const handleSubmit = useCallback(async (submitData) => {
    setIsSubmitting(true)

    try {
      console.log('提交編輯表單:', submitData)

      // 驗證必填欄位
      const validation = CaseService.validateRequiredFields(submitData)
      if (!validation.isValid) {
        alert('表單驗證失敗：\n' + validation.errors.join('\n'))
        return
      }

      const result = await CaseService.updateCaseWithRelations({
        caseData: submitData,
        originalData: originalData,
        teamId: team.id,
        dropdownOptions: {} // 可以傳入下拉選單選項
      })

      if (result.success) {
        console.log('案件更新成功')
        alert('案件更新成功！')
        
        if (typeof onCaseUpdated === 'function') {
          onCaseUpdated(submitData)
        }
        
        onClose()
      } else {
        console.error('案件更新失敗:', result.error)
        alert('案件更新失敗：' + result.error)
      }

    } catch (error) {
      console.error('更新案件時發生錯誤:', error)
      alert('更新案件時發生錯誤：' + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }, [originalData, team.id, onCaseUpdated, onClose])

  // 處理取消編輯
  const handleCancel = useCallback(() => {
    handleClose()
  }, [handleClose])

  // 處理確認放棄變更
  const handleDiscardChanges = useCallback(() => {
    setShowUnsavedModal(false)
    onClose()
  }, [onClose])

  // 處理繼續編輯
  const handleContinueEditing = useCallback(() => {
    setShowUnsavedModal(false)
  }, [])

  if (!isOpen) {
    return null
  }

  return (
    <>
      <div className="modal-overlay" onClick={handleClose}>
        <div className="modal-content case-edit-modal-large" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>編輯案件</h2>
            <button 
              className="modal-close-btn"
              onClick={handleClose}
              disabled={isSubmitting}
              type="button"
            >
              ×
            </button>
          </div>

          <div className="modal-body">
            <EditableCaseForm
              team={team}
              initialData={formData}
              onDataChange={handleDataChange}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              isSubmitting={isSubmitting}
              hasChanges={hasChanges}
            />
          </div>
        </div>
      </div>

      {/* 未儲存變更確認模態框 */}
      {showUnsavedModal && (
        <CaseUnsavedChangesModal
          isOpen={showUnsavedModal}
          onDiscard={handleDiscardChanges}
          onReturn={handleContinueEditing}
        />
      )}
    </>
  )
}

export default CaseEditModal