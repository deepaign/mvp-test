// src/components/Case/CaseTables/CaseEditModal.js - 修改版：使用與新增案件相同的視窗格式
import React, { useState, useEffect, useCallback } from 'react'
import { 
  BasicInfoSection, 
  ContactInfoSection, 
  CaseContentSection, 
  NotificationSection 
} from '../CaseModal/CaseForm/FormSections'
import CaseUnsavedChangesModal from './CaseUnsavedChangesModal'
import { CaseService } from '../../../services/caseService'
import { TeamService } from '../../../services/teamService'
import '../../../styles/CaseModal.css' // 使用與新增案件相同的 CSS

// 輔助函數：安全地獲取 Promise 結果中的陣列
const getValidArray = (promiseResult, name) => {
  if (promiseResult.status === 'fulfilled' && promiseResult.value.success) {
    let data = promiseResult.value.data
    
    // 處理 TeamService.getTeamMembers 的特殊格式
    if (name === '團隊成員' && promiseResult.value.members) {
      data = promiseResult.value.members
    }
    
    if (Array.isArray(data)) {
      console.log(`${name}載入成功:`, data.length, '筆')
      return data
    }
  }
  console.warn(`${name}載入失敗或無資料:`, promiseResult.reason || promiseResult.value?.error)
  return []
}

const CaseEditModal = ({ isOpen, onClose, caseData, team, member, onCaseUpdated }) => {
  const [formData, setFormData] = useState({})
  const [originalData, setOriginalData] = useState(null)
  const [dropdownOptions, setDropdownOptions] = useState({
    members: [],
    categories: [],
    counties: [],
    homeDistricts: [],
    incidentDistricts: []
  })
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [hasChanges, setHasChanges] = useState(false)
  const [showUnsavedModal, setShowUnsavedModal] = useState(false)

  // 載入下拉選單資料和轉換案件資料
  useEffect(() => {
    if (!isOpen || !caseData || !team?.id || !member?.auth_user_id) return

    const loadData = async () => {
      setLoading(true)
      setError('')

      try {
        console.log('載入編輯案件資料:', caseData)

        // 並行載入下拉選單資料
        const [membersResult, categoriesResult, countiesResult] = await Promise.allSettled([
          TeamService.getTeamMembers(team.id, member.auth_user_id),
          CaseService.getCategories(),
          CaseService.getCounties()
        ])

        // 設定下拉選單選項
        const newDropdownOptions = {
          members: getValidArray(membersResult, '團隊成員'),
          categories: getValidArray(categoriesResult, '案件類別'),
          counties: getValidArray(countiesResult, '縣市'),
          homeDistricts: [],
          incidentDistricts: []
        }

        setDropdownOptions(newDropdownOptions)

        // 直接使用傳入的案件資料並轉換為表單格式
        const convertedFormData = convertCaseToFormData(caseData)
        console.log('轉換後的表單資料:', convertedFormData)
        
        setFormData(convertedFormData)
        setOriginalData(convertedFormData)

        // 如果有住家縣市資料，載入對應的行政區
        if (convertedFormData.homeCounty) {
          try {
            const homeDistrictsResult = await CaseService.getDistricts(convertedFormData.homeCounty)
            if (homeDistrictsResult.success) {
              setDropdownOptions(prev => ({
                ...prev,
                homeDistricts: homeDistrictsResult.data
              }))
            }
          } catch (error) {
            console.warn('載入住家行政區失敗:', error)
          }
        }

        // 如果有事發地點縣市資料，載入對應的行政區
        if (convertedFormData.incidentCounty) {
          try {
            const incidentDistrictsResult = await CaseService.getDistricts(convertedFormData.incidentCounty)
            if (incidentDistrictsResult.success) {
              setDropdownOptions(prev => ({
                ...prev,
                incidentDistricts: incidentDistrictsResult.data
              }))
            }
          } catch (error) {
            console.warn('載入事發地點行政區失敗:', error)
          }
        }

      } catch (error) {
        console.error('載入編輯資料時發生錯誤:', error)
        setError('載入資料時發生錯誤：' + error.message)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [isOpen, caseData, team?.id, member?.auth_user_id])

  // 將案件資料轉換為表單格式的函數（修正 timestamptz 處理）
  const convertCaseToFormData = (caseData) => {
    try {
      console.log('=== convertCaseToFormData ===')
      console.log('原始案件資料:', caseData)

      // 從描述中提取案件編號和事發地點
      const caseNumber = CaseService.extractCaseNumber(caseData.description) || ''
      const incidentLocation = CaseService.extractIncidentLocation(caseData.description) || ''

      // 獲取案件類別名稱
      let category = ''
      if (caseData.CategoryCase && caseData.CategoryCase.length > 0) {
        const categoryData = caseData.CategoryCase[0].Category
        if (categoryData) {
          category = categoryData.name
        }
      }

      // 獲取聯絡人資訊
      let contact1Name = '', contact1Phone = '', contact2Name = '', contact2Phone = ''
      if (caseData.VoterCase && caseData.VoterCase.length > 0) {
        const voters = caseData.VoterCase
        if (voters[0] && voters[0].Voter) {
          contact1Name = voters[0].Voter.name || ''
          contact1Phone = voters[0].Voter.phone || ''
        }
        if (voters[1] && voters[1].Voter) {
          contact2Name = voters[1].Voter.name || ''
          contact2Phone = voters[1].Voter.phone || ''
        }
      }

      // 獲取受理人員 ID
      let receiver = ''
      if (caseData.AcceptanceCase && caseData.AcceptanceCase.length > 0) {
        const acceptanceMember = caseData.AcceptanceCase[0].Member
        if (acceptanceMember) {
          receiver = acceptanceMember.id
        }
      }

      // 獲取承辦人員 ID
      let handler = ''
      if (caseData.InChargeCase && caseData.InChargeCase.length > 0) {
        const inChargeMember = caseData.InChargeCase[0].Member
        if (inChargeMember) {
          handler = inChargeMember.id
        }
      }

      // 處理 timestamptz 欄位 - 起始時間和結案時間
      let receivedDate = '', receivedTime = '', closedDate = '', closedTime = ''
      
      // 處理起始時間 (received_date 現在是 timestamptz)
      if (caseData.received_date) {
        try {
          const receivedDateTime = new Date(caseData.received_date)
          if (!isNaN(receivedDateTime.getTime())) {
            // 轉換為本地時間的日期和時間
            receivedDate = receivedDateTime.toISOString().split('T')[0] // YYYY-MM-DD
            receivedTime = receivedDateTime.toTimeString().split(' ')[0].substring(0, 5) // HH:MM
            console.log('解析起始時間:', { original: caseData.received_date, date: receivedDate, time: receivedTime })
          }
        } catch (error) {
          console.warn('解析起始時間失敗:', error)
        }
      }
      
      // 處理結案時間 (closed_date 現在是 timestamptz)
      if (caseData.closed_date) {
        try {
          const closedDateTime = new Date(caseData.closed_date)
          if (!isNaN(closedDateTime.getTime())) {
            // 轉換為本地時間的日期和時間
            closedDate = closedDateTime.toISOString().split('T')[0] // YYYY-MM-DD
            closedTime = closedDateTime.toTimeString().split(' ')[0].substring(0, 5) // HH:MM
            console.log('解析結案時間:', { original: caseData.closed_date, date: closedDate, time: closedTime })
          }
        } catch (error) {
          console.warn('解析結案時間失敗:', error)
        }
      }

      const formData = {
        id: caseData.id,
        caseNumber: caseNumber,
        title: caseData.title || '',
        description: caseData.description || '',
        category: category,
        priority: caseData.priority || 'normal',
        status: caseData.status || 'pending',
        processingStatus: caseData.processing_status || '',
        contactMethod: caseData.contact_type || 'phone',
        receivedDate: receivedDate,
        receivedTime: receivedTime,
        closedDate: closedDate,
        closedTime: closedTime,
        receiver: receiver,
        handler: handler,
        contact1Name: contact1Name,
        contact1Phone: contact1Phone,
        contact2Name: contact2Name,
        contact2Phone: contact2Phone,
        incidentLocation: incidentLocation,
        hasAttachment: caseData.has_attachment || 'none'
      }

      console.log('轉換後的表單資料:', formData)
      return formData

    } catch (error) {
      console.error('convertCaseToFormData 轉換失敗:', error)
      // 如果轉換失敗，返回基本的表單結構
      return {
        id: caseData.id,
        title: caseData.title || '',
        description: caseData.description || '',
        priority: caseData.priority || 'normal',
        status: caseData.status || 'pending',
        contact1Name: '',
        contact1Phone: '',
        caseNumber: '',
        category: '',
        receiver: '',
        handler: '',
        contactMethod: 'phone',
        receivedDate: '',
        receivedTime: '',
        closedDate: '',
        closedTime: '',
        incidentLocation: '',
        hasAttachment: 'none'
      }
    }
  }

  // 處理表單資料變更
  const handleInputChange = useCallback((field, value) => {
    console.log(`表單欄位變更: ${field} = ${value}`)
    
    setFormData(prev => {
      const newFormData = { ...prev, [field]: value }
      
      // 檢查是否有變更
      const hasDataChanged = JSON.stringify(newFormData) !== JSON.stringify(originalData)
      setHasChanges(hasDataChanged)
      
      return newFormData
    })

    // 處理縣市變更時載入對應行政區
    if (field === 'homeCounty' && value) {
      loadHomeDistricts(value)
    } else if (field === 'incidentCounty' && value) {
      loadIncidentDistricts(value)
    }
  }, [originalData])

  // 載入住家行政區
  const loadHomeDistricts = useCallback(async (countyId) => {
    try {
      const districtsResult = await CaseService.getDistricts(countyId)
      if (districtsResult.success) {
        setDropdownOptions(prev => ({
          ...prev,
          homeDistricts: districtsResult.data
        }))
      }
    } catch (error) {
      console.warn('載入住家行政區失敗:', error)
    }
  }, [])

  // 載入事發地點行政區
  const loadIncidentDistricts = useCallback(async (countyId) => {
    try {
      const districtsResult = await CaseService.getDistricts(countyId)
      if (districtsResult.success) {
        setDropdownOptions(prev => ({
          ...prev,
          incidentDistricts: districtsResult.data
        }))
      }
    } catch (error) {
      console.warn('載入事發地點行政區失敗:', error)
    }
  }, [])

  // 表單驗證
  const validateForm = (data) => {
    const requiredFields = [
      { field: 'title', name: '案件標題' },
      { field: 'contact1Name', name: '聯絡人姓名' },
      { field: 'contact1Phone', name: '聯絡人電話' }
    ]

    for (const { field, name } of requiredFields) {
      if (!data[field] || !data[field].toString().trim()) {
        return { valid: false, message: `請填寫${name}` }
      }
    }

    // 電話格式驗證
    const phoneRegex = /^[0-9+\-\s()]{8,15}$/
    if (!phoneRegex.test(data.contact1Phone)) {
      return { valid: false, message: '聯絡人電話格式不正確' }
    }

    return { valid: true }
  }

  // 處理表單提交
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault()

    if (isSubmitting) return

    // 表單驗證
    const validation = validateForm(formData)
    if (!validation.valid) {
      setError(validation.message)
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      console.log('提交案件更新:', formData)

      // 將日期和時間合併為 timestamptz 格式
      const updatedFormData = { ...formData }
      
      // 處理起始時間 - 合併日期和時間為 timestamptz
      if (updatedFormData.receivedDate) {
        if (updatedFormData.receivedTime) {
          // 合併日期和時間
          updatedFormData.received_date = `${updatedFormData.receivedDate}T${updatedFormData.receivedTime}:00.000Z`
        } else {
          // 只有日期，設定為當天的 00:00
          updatedFormData.received_date = `${updatedFormData.receivedDate}T00:00:00.000Z`
        }
        console.log('合併後的起始時間:', updatedFormData.received_date)
      }
      
      // 處理結案時間 - 合併日期和時間為 timestamptz
      if (updatedFormData.closedDate) {
        if (updatedFormData.closedTime) {
          // 合併日期和時間
          updatedFormData.closed_date = `${updatedFormData.closedDate}T${updatedFormData.closedTime}:00.000Z`
        } else {
          // 只有日期，設定為當天的 23:59
          updatedFormData.closed_date = `${updatedFormData.closedDate}T23:59:59.000Z`
        }
        console.log('合併後的結案時間:', updatedFormData.closed_date)
      }

      // 移除分離的日期和時間欄位，因為已經合併到 received_date 和 closed_date
      delete updatedFormData.receivedDate
      delete updatedFormData.receivedTime
      delete updatedFormData.closedDate
      delete updatedFormData.closedTime

      const result = await CaseService.updateCaseWithRelations({
        caseData: { ...updatedFormData, id: caseData.id },
        originalData,
        teamId: team.id,
        dropdownOptions
      })

      if (result.success) {
        console.log('案件更新成功')
        alert('案件更新成功！')
        
        if (onCaseUpdated) {
          onCaseUpdated(updatedFormData)
        }
        
        handleClose()
      } else {
        console.error('案件更新失敗:', result.error)
        setError('案件更新失敗：' + result.error)
      }

    } catch (error) {
      console.error('更新案件時發生錯誤:', error)
      setError('更新案件時發生錯誤：' + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }, [formData, originalData, team.id, caseData.id, dropdownOptions, onCaseUpdated, isSubmitting])

  // 處理取消
  const handleCancel = useCallback(() => {
    if (hasChanges) {
      setShowUnsavedModal(true)
    } else {
      handleClose()
    }
  }, [hasChanges])

  // 關閉模態框
  const handleClose = useCallback(() => {
    setShowUnsavedModal(false)
    setHasChanges(false)
    setFormData({})
    setOriginalData(null)
    setError('')
    onClose()
  }, [onClose])

  // 處理背景點擊
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleCancel()
    }
  }

  // 放棄修改
  const handleDiscardChanges = useCallback(() => {
    handleClose()
  }, [handleClose])

  // 返回編輯
  const handleContinueEditing = useCallback(() => {
    setShowUnsavedModal(false)
  }, [])

  if (!isOpen) return null

  return (
    <>
      {/* 使用與新增案件相同的模態框結構 */}
      <div className="case-modal-backdrop" onClick={handleBackdropClick}>
        <div className="case-modal">
          {/* Header - 與新增案件相同的設計 */}
          <div className="case-modal-header">
            <div className="case-modal-title">
              <h2>編輯案件</h2>
              {formData.caseNumber && (
                <span className="case-number-badge">案件編號：{formData.caseNumber}</span>
              )}
            </div>
            
            <button 
              className="case-modal-close" 
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              ✕
            </button>
          </div>

          {/* 錯誤訊息 */}
          {error && (
            <div className="case-modal-error">
              {error}
            </div>
          )}

          {/* Body - 與新增案件相同的結構 */}
          <div className="case-modal-body">
            {loading ? (
              <div className="case-modal-loading">
                <div className="loading-spinner"></div>
                <p>載入案件資料中...</p>
              </div>
            ) : (
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
                  
                  {/* 表單底部按鈕 - 與新增案件相同的樣式 */}
                  <div className="case-form-footer">
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="case-form-cancel-btn"
                      disabled={isSubmitting}
                    >
                      取消
                    </button>
                    <button
                      type="submit"
                      className="case-form-submit-btn"
                      disabled={isSubmitting || !hasChanges}
                    >
                      {isSubmitting ? '更新中...' : hasChanges ? '更新案件' : '無變更'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 未儲存變更確認彈窗 */}
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