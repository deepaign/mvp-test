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
  // 移除未使用的 formRef

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
  }, [isOpen, caseData])

  /**
   * 將案件資料轉換為表單可用的格式
   * 確保欄位名稱與 FormSections 組件完全匹配
   */
  const prepareEditData = (caseData) => {
    try {
      console.log('=== 開始準備編輯資料 ===')
      console.log('原始案件資料:', caseData)

      // 提取事發地點和案件編號
      const incidentLocation = CaseService.extractIncidentLocation(caseData.description) || ''
      const caseNumber = CaseService.extractCaseNumber(caseData.description) || ''
      
      console.log('提取的特殊欄位:', { incidentLocation, caseNumber })

      // 提取聯絡人資料
      const voterCases = caseData.VoterCase || []
      console.log('VoterCase 資料:', voterCases)
      
      let contactPerson = {}
      if (voterCases.length > 0 && voterCases[0].Voter) {
        contactPerson = voterCases[0].Voter
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

      // 提取案件類別
      const categoryCases = caseData.CategoryCase || []
      console.log('CategoryCase 資料:', categoryCases)
      
      let category = ''
      if (categoryCases.length > 0 && categoryCases[0].Category) {
        // 優先使用 category_id，如果沒有則使用 Category.id
        category = categoryCases[0].category_id || categoryCases[0].Category.id || ''
      }
      
      console.log('案件類別 ID (category):', category)

      // 提取受理時間（從 description 或使用 created_at）
      const receivedDateTimeMatch = caseData.description?.match(/受理時間：(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})/)
      let receivedDate = ''
      let receivedTime = ''
      
      if (receivedDateTimeMatch) {
        receivedDate = receivedDateTimeMatch[1]
        receivedTime = receivedDateTimeMatch[2]
        console.log('從 description 提取的時間:', { receivedDate, receivedTime })
      } else if (caseData.created_at) {
        // 如果沒有從 description 提取到，使用 created_at
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
        category: category,                                       // 案件類別
        homeCounty: '',                                          // 住家縣市（需要解析地址）
        homeDistrict: '',                                        // 住家行政區（需要解析地址）
        priority: caseData.priority || 'normal',                 // 優先等級
        hasAttachment: 'none',                                   // 是否有附件（預設無）
        
        // === ContactInfoSection 欄位 ===
        contact1Name: contactPerson.name || '',                  // 聯絡人1
        contact1Phone: contactPerson.phone || '',                // 電話1
        contact2Name: '',                                        // 聯絡人2（通常為空）
        contact2Phone: '',                                       // 電話2（通常為空）
        
        // === CaseContentSection 欄位 ===
        title: caseData.title || '',                            // 案件標題
        description: caseData.description || '',                // 詳細描述
        incidentCounty: '',                                      // 事發縣市（需要解析地點）
        incidentDistrict: '',                                    // 事發行政區（需要解析地點）
        incidentLocation: incidentLocation,                      // 事發地點詳細地址
        
        // === NotificationSection 欄位 ===
        notificationMethod: caseData.contact_type || 'phone',   // 通知方式
        googleCalendarSync: false,                              // Google 日曆同步
        sendNotification: false,                                // 發送通知
        multipleReminders: false,                               // 多次提醒
        reminderDate: ''                                        // 提醒日期
      }

      console.log('=== 最終格式化的表單資料 ===')
      console.log(formData)

      return formData
    } catch (error) {
      console.error('準備編輯資料時發生錯誤:', error)
      console.error('錯誤堆疊:', error.stack)
      return {}
    }
  }

  /**
   * 檢查資料是否有變更
   */
  const checkForChanges = (formData) => {
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
  }

  /**
   * 表單資料變更處理
   */
  const handleFormDataChange = (formData) => {
    console.log('表單資料變更:', formData)
    setCurrentFormData(formData)
    
    const hasDataChanged = checkForChanges(formData)
    setHasChanges(hasDataChanged)
    console.log('是否有變更:', hasDataChanged)
  }

  /**
   * 儲存案件修改
   */
  const handleSave = async (formData) => {
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

      const result = await CaseService.updateCaseWithRelations(
        caseData.id,
        originalData,
        formData,
        team.id
      )

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
  }

  /**
   * 關閉彈窗處理
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
   */
  const closeModal = () => {
    setShowUnsavedModal(false)
    setHasChanges(false)
    setOriginalData(null)
    setCurrentFormData(null)
    setError('')
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