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
  // 在 CaseEditModal.js 中，將 useEffect 的條件檢查修改為：

  useEffect(() => {
    console.log('🔍 CaseEditModal useEffect 觸發 - 詳細檢查:', {
      isOpen,
      hasCaseData: !!caseData,
      hasTeamId: !!team?.id,
      hasMemberId: !!member?.auth_user_id,
      memberData: {
        member_exists: !!member,
        member_id: member?.id,
        auth_user_id: member?.auth_user_id,
        name: member?.name,
        role: member?.role,
        is_leader: member?.is_leader,
        allKeys: member ? Object.keys(member) : []
      },
      teamData: {
        team_exists: !!team,
        team_id: team?.id,
        team_name: team?.name,
        allKeys: team ? Object.keys(team) : []
      }
    })

    // 修改條件：如果 member.auth_user_id 不存在，但 member.id 存在，也允許執行
    const hasMember = member && (member.auth_user_id || member.id)
    
    if (!isOpen || !caseData || !team?.id || !hasMember) {
      console.log('❌ CaseEditModal useEffect 條件不滿足，詳細原因:', {
        isOpen_missing: !isOpen,
        caseData_missing: !caseData,
        teamId_missing: !team?.id,
        member_missing: !hasMember,
        具體缺少: {
          isOpen: isOpen ? '✓' : '❌',
          caseData: caseData ? '✓' : '❌',
          'team.id': team?.id ? '✓' : '❌',
          'member存在': member ? '✓' : '❌',
          'member.auth_user_id': member?.auth_user_id ? '✓' : '❌',
          'member.id': member?.id ? '✓' : '❌'
        }
      })
      return
    }

    const loadData = async () => {
      console.log('🔍 開始載入編輯案件資料...')
      setLoading(true)
      setError('')

      try {
        // 使用 member.auth_user_id 或 member.id，優先使用 auth_user_id
        const memberId = member.auth_user_id || member.id
        console.log('使用成員ID:', memberId)

        console.log('📋 傳入的案件資料:', {
          id: caseData.id,
          title: caseData.title,
          status: caseData.status,
          group_id: caseData.group_id,
          hasDescription: !!caseData.description,
          categoryCount: caseData.CategoryCase?.length || 0,
          voterCount: caseData.VoterCase?.length || 0,
          inChargeCount: caseData.InChargeCase?.length || 0,
          acceptanceCount: caseData.AcceptanceCase?.length || 0
        })

        console.log('🔍 步驟 1: 並行載入下拉選單資料...')
        const loadStartTime = Date.now()
        
        const [membersResult, categoriesResult, countiesResult] = await Promise.allSettled([
          TeamService.getTeamMembers(team.id, memberId), // 使用修正後的 memberId
          CaseService.getCategories(),
          CaseService.getCounties()
        ])

        console.log(`載入下拉選單耗時: ${Date.now() - loadStartTime}ms`)
        
        // ... 其餘程式碼保持不變 ...
        
        // 設定下拉選單選項
        const newDropdownOptions = {
          members: getValidArray(membersResult, '團隊成員'),
          categories: getValidArray(categoriesResult, '案件類別'),
          counties: getValidArray(countiesResult, '縣市'),
          homeDistricts: [],
          incidentDistricts: []
        }

        console.log('🔍 步驟 2: 設定下拉選單選項完成:', {
          members: newDropdownOptions.members.length,
          categories: newDropdownOptions.categories.length,
          counties: newDropdownOptions.counties.length
        })

        setDropdownOptions(newDropdownOptions)

        console.log('🔍 步驟 3: 開始轉換案件資料...')
        const conversionStartTime = Date.now()
        const convertedFormData = convertCaseToFormData(caseData)
        console.log(`案件資料轉換耗時: ${Date.now() - conversionStartTime}ms`)
        
        console.log('轉換後的表單資料預覽:', {
          id: convertedFormData.id,
          caseNumber: convertedFormData.caseNumber,
          title: convertedFormData.title,
          category: convertedFormData.category,
          priority: convertedFormData.priority,
          status: convertedFormData.status,
          contact1Name: convertedFormData.contact1Name,
          contact2Name: convertedFormData.contact2Name,
          receiver: convertedFormData.receiver,
          handler: convertedFormData.handler,
          hasDescription: !!convertedFormData.description,
          homeCounty: convertedFormData.homeCounty,
          incidentCounty: convertedFormData.incidentCounty
        })
        
        setFormData(convertedFormData)
        setOriginalData(convertedFormData)

        // 行政區載入邏輯保持不變...
        console.log('✅ CaseEditModal 資料載入完成')

      } catch (error) {
        console.error('❌ CaseEditModal 載入編輯資料時發生錯誤:', error)
        console.error('錯誤堆疊:', error.stack)
        setError('載入資料時發生錯誤：' + error.message)
      } finally {
        console.log('🔍 CaseEditModal 設定 loading = false')
        setLoading(false)
      }
    }

    loadData()
  }, [isOpen, caseData, team?.id, member]) // 改為監聽整個 member 物件

  // 將案件資料轉換為表單格式的函數（修正 timestamptz 處理）
const convertCaseToFormData = (caseData) => {
  try {
    console.log('🔍 === convertCaseToFormData 開始 ===')
    console.log('原始案件資料結構檢查:', {
      id: caseData.id,
      title: caseData.title,
      description: caseData.description?.substring(0, 100) + '...',
      status: caseData.status,
      priority: caseData.priority,
      created_at: caseData.created_at,
      group_id: caseData.group_id,
      hasFile: !!caseData.file,
      start_date: caseData.start_date,
      end_date: caseData.end_date,
      contact_type: caseData.contact_type
    })

    console.log('關聯資料檢查:', {
      CategoryCase: {
        exists: !!caseData.CategoryCase,
        isArray: Array.isArray(caseData.CategoryCase),
        length: caseData.CategoryCase?.length || 0,
        firstItem: caseData.CategoryCase?.[0] ? {
          hasCategory: !!caseData.CategoryCase[0].Category,
          categoryId: caseData.CategoryCase[0].Category?.id,
          categoryName: caseData.CategoryCase[0].Category?.name
        } : null
      },
      VoterCase: {
        exists: !!caseData.VoterCase,
        isArray: Array.isArray(caseData.VoterCase),
        length: caseData.VoterCase?.length || 0,
        voters: caseData.VoterCase?.map((vc, index) => ({
          index,
          hasVoter: !!vc.Voter,
          voterId: vc.Voter?.id,
          voterName: vc.Voter?.name,
          voterPhone: vc.Voter?.phone,
          voterAddress: vc.Voter?.address
        })) || []
      },
      AcceptanceCase: {
        exists: !!caseData.AcceptanceCase,
        isArray: Array.isArray(caseData.AcceptanceCase),
        length: caseData.AcceptanceCase?.length || 0,
        firstMember: caseData.AcceptanceCase?.[0] ? {
          hasMember: !!caseData.AcceptanceCase[0].Member,
          memberId: caseData.AcceptanceCase[0].Member?.id,
          memberName: caseData.AcceptanceCase[0].Member?.name
        } : null
      },
      InChargeCase: {
        exists: !!caseData.InChargeCase,
        isArray: Array.isArray(caseData.InChargeCase),
        length: caseData.InChargeCase?.length || 0,
        firstMember: caseData.InChargeCase?.[0] ? {
          hasMember: !!caseData.InChargeCase[0].Member,
          memberId: caseData.InChargeCase[0].Member?.id,
          memberName: caseData.InChargeCase[0].Member?.name
        } : null
      }
    })

    console.log('🔍 步驟 1: 提取案件編號和事發地點...')
    // 從描述中提取案件編號和事發地點
    const caseNumber = CaseService.extractCaseNumber(caseData.description) || ''
    const incidentLocation = CaseService.extractIncidentLocation(caseData.description) || ''
    
    console.log('提取結果:', {
      caseNumber,
      incidentLocation,
      descriptionLength: caseData.description?.length || 0
    })

    console.log('🔍 步驟 2: 處理案件類別...')
    // 獲取案件類別名稱
    let category = ''
    if (caseData.CategoryCase && caseData.CategoryCase.length > 0) {
      const categoryData = caseData.CategoryCase[0].Category
      if (categoryData) {
        category = categoryData.name
        console.log('找到類別:', {
          id: categoryData.id,
          name: categoryData.name
        })
      } else {
        console.log('⚠️ CategoryCase[0] 存在但沒有 Category 資料')
      }
    } else {
      console.log('⚠️ 沒有 CategoryCase 資料')
    }

    console.log('🔍 步驟 3: 處理聯絡人資訊...')
    // 獲取聯絡人資訊
    let contact1Name = '', contact1Phone = '', contact2Name = '', contact2Phone = ''
    if (caseData.VoterCase && caseData.VoterCase.length > 0) {
      const voters = caseData.VoterCase
      console.log(`找到 ${voters.length} 筆聯絡人資料`)
      
      if (voters[0] && voters[0].Voter) {
        contact1Name = voters[0].Voter.name || ''
        contact1Phone = voters[0].Voter.phone || ''
        console.log('聯絡人1:', { name: contact1Name, phone: contact1Phone })
      } else {
        console.log('⚠️ 第一個聯絡人資料不完整')
      }
      
      if (voters[1] && voters[1].Voter) {
        contact2Name = voters[1].Voter.name || ''
        contact2Phone = voters[1].Voter.phone || ''
        console.log('聯絡人2:', { name: contact2Name, phone: contact2Phone })
      } else {
        console.log('⚠️ 沒有第二個聯絡人或資料不完整')
      }
    } else {
      console.log('⚠️ 沒有 VoterCase 聯絡人資料')
    }

    console.log('🔍 步驟 4: 處理受理人員...')
    // 獲取受理人員 ID
    let receiver = ''
    if (caseData.AcceptanceCase && caseData.AcceptanceCase.length > 0) {
      const acceptanceMember = caseData.AcceptanceCase[0].Member
      if (acceptanceMember) {
        receiver = acceptanceMember.id
        console.log('受理人員:', { id: receiver, name: acceptanceMember.name })
      } else {
        console.log('⚠️ AcceptanceCase[0] 存在但沒有 Member 資料')
      }
    } else {
      console.log('⚠️ 沒有 AcceptanceCase 受理人員資料')
    }

    console.log('🔍 步驟 5: 處理承辦人員...')
    // 獲取承辦人員 ID
    let handler = ''
    if (caseData.InChargeCase && caseData.InChargeCase.length > 0) {
      const inChargeMember = caseData.InChargeCase[0].Member
      if (inChargeMember) {
        handler = inChargeMember.id
        console.log('承辦人員:', { id: handler, name: inChargeMember.name })
      } else {
        console.log('⚠️ InChargeCase[0] 存在但沒有 Member 資料')
      }
    } else {
      console.log('⚠️ 沒有 InChargeCase 承辦人員資料')
    }

    console.log('🔍 步驟 6: 處理時間資料...')
    // 處理 timestamptz 欄位 - 起始時間和結案時間
    let receivedDate = '', receivedTime = '', closedDate = '', closedTime = ''
    
    console.log('原始時間資料:', {
      received_date: caseData.received_date,
      closed_date: caseData.closed_date,
      start_date: caseData.start_date,
      end_date: caseData.end_date
    })
    
    // 處理起始時間 (received_date 現在是 timestamptz)
    if (caseData.received_date) {
      try {
        const receivedDateTime = new Date(caseData.received_date)
        if (!isNaN(receivedDateTime.getTime())) {
          // 轉換為本地時間的日期和時間
          receivedDate = receivedDateTime.toISOString().split('T')[0] // YYYY-MM-DD
          receivedTime = receivedDateTime.toTimeString().split(' ')[0].substring(0, 5) // HH:MM
          console.log('✅ 解析起始時間成功:', { 
            original: caseData.received_date, 
            date: receivedDate, 
            time: receivedTime 
          })
        } else {
          console.log('❌ 起始時間格式無效')
        }
      } catch (error) {
        console.warn('❌ 解析起始時間失敗:', error)
      }
    } else {
      console.log('⚠️ 沒有 received_date 資料')
    }
    
    // 處理結案時間 (closed_date 現在是 timestamptz)
    if (caseData.closed_date) {
      try {
        const closedDateTime = new Date(caseData.closed_date)
        if (!isNaN(closedDateTime.getTime())) {
          // 轉換為本地時間的日期和時間
          closedDate = closedDateTime.toISOString().split('T')[0] // YYYY-MM-DD
          closedTime = closedDateTime.toTimeString().split(' ')[0].substring(0, 5) // HH:MM
          console.log('✅ 解析結案時間成功:', { 
            original: caseData.closed_date, 
            date: closedDate, 
            time: closedTime 
          })
        } else {
          console.log('❌ 結案時間格式無效')
        }
      } catch (error) {
        console.warn('❌ 解析結案時間失敗:', error)
      }
    } else {
      console.log('⚠️ 沒有 closed_date 資料')
    }

    console.log('🔍 步驟 7: 組合最終表單資料...')
    const formData = {
      id: caseData.id,
      caseNumber: caseNumber,
      title: caseData.title || '',
      description: caseData.description || '',
      category: category,
      priority: caseData.priority || 'normal',
      status: caseData.status || 'pending',
      contactType: caseData.contact_type || 'phone',
      incidentLocation: incidentLocation,
      
      // 聯絡人資訊
      contact1Name: contact1Name,
      contact1Phone: contact1Phone,
      contact2Name: contact2Name,
      contact2Phone: contact2Phone,
      
      // 人員指派
      receiver: receiver,
      handler: handler,
      
      // 時間資訊
      receivedDate: receivedDate,
      receivedTime: receivedTime,
      closedDate: closedDate,
      closedTime: closedTime,
      
      // 其他欄位
      homeCounty: '', // 這些可能需要從其他地方獲取
      homeDistrict: '',
      homeAddress: '',
      incidentCounty: '',
      incidentDistrict: '',
      file: caseData.file || null
    }

    console.log('✅ convertCaseToFormData 完成，最終表單資料:', {
      基本資訊: {
        id: formData.id,
        caseNumber: formData.caseNumber,
        title: formData.title,
        category: formData.category,
        priority: formData.priority,
        status: formData.status,
        hasDescription: !!formData.description
      },
      聯絡人: {
        contact1Name: formData.contact1Name,
        contact1Phone: formData.contact1Phone,
        contact2Name: formData.contact2Name,
        contact2Phone: formData.contact2Phone
      },
      人員指派: {
        receiver: formData.receiver,
        handler: formData.handler
      },
      時間: {
        receivedDate: formData.receivedDate,
        receivedTime: formData.receivedTime,
        closedDate: formData.closedDate,
        closedTime: formData.closedTime
      }
    })

    return formData

  } catch (error) {
    console.error('❌ convertCaseToFormData 發生錯誤:', error)
    console.error('錯誤堆疊:', error.stack)
    throw error
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