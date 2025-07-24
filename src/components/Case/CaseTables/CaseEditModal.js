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
    
    // 🔧 修復：處理團隊成員的特殊格式，但不假設有 members 欄位
    if (name === '團隊成員') {
      // 優先使用 data 欄位，這是 getTeamMembers() 實際返回的
      if (Array.isArray(promiseResult.value.data)) {
        data = promiseResult.value.data
      } else if (Array.isArray(promiseResult.value.members)) {
        data = promiseResult.value.members
      } else {
        console.warn('團隊成員資料格式異常:', promiseResult.value)
        data = []
      }
    }
    
    if (Array.isArray(data)) {
      console.log(`${name}載入成功:`, data.length, '筆')
      return data
    }
  }
  
  console.warn(`${name}載入失敗或無資料:`, {
    status: promiseResult.status,
    reason: promiseResult.reason,
    value: promiseResult.value
  })
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
          // 🔧 修復：移除參數，使用無參數的 getTeamMembers()
          TeamService.getTeamMembers(),
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
  }, [isOpen, caseData, team?.id, member, team]) // 改為監聽整個 member 物件

  // 將案件資料轉換為表單格式的函數（修正 timestamptz 處理）
  const convertCaseToFormData = (caseData) => {
    try {
      console.log('🔍 === convertCaseToFormData 開始 (CaseMember版本) ===')
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

      console.log('關聯資料檢查 (CaseMember版本):', {
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
        CaseMember: {
          exists: !!caseData.CaseMember,
          isArray: Array.isArray(caseData.CaseMember),
          length: caseData.CaseMember?.length || 0,
          members: caseData.CaseMember?.map((cm, index) => ({
            index,
            role: cm.role,
            member_id: cm.member_id,
            hasMember: !!cm.Member,
            memberName: cm.Member?.name
          })) || []
        },
        DistrictCase: {
          exists: !!caseData.DistrictCase,
          isArray: Array.isArray(caseData.DistrictCase),
          length: caseData.DistrictCase?.length || 0
        }
      })

      // 🔧 修正：一次性處理所有變數，避免作用域問題
      console.log('🔍 步驟 1: 處理所有基本資料...')
      
      // 基本資料
      const caseNumber = CaseService.extractCaseNumber(caseData.description) || ''
      const descriptionLocation = CaseService.extractIncidentLocation(caseData.description) || ''
      
      console.log('提取結果:', {
        caseNumber,
        descriptionLocation,
        descriptionLength: caseData.description?.length || 0
      })

      // 案件類別
      let category = ''
      if (caseData.CategoryCase && caseData.CategoryCase.length > 0) {
        const categoryData = caseData.CategoryCase[0].Category
        if (categoryData) {
          category = categoryData.id
          console.log('找到類別:', {
            id: categoryData.id,
            name: categoryData.name,
            isValidUUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(categoryData.id)
          })
        }
      }

      // 聯絡人資訊
      let contact1Name = '', contact1Phone = '', contact2Name = '', contact2Phone = ''
      if (caseData.VoterCase && caseData.VoterCase.length > 0) {
        const voters = caseData.VoterCase
        console.log(`找到 ${voters.length} 筆聯絡人資料`)
        
        if (voters[0] && voters[0].Voter) {
          contact1Name = voters[0].Voter.name || ''
          contact1Phone = voters[0].Voter.phone || ''
          console.log('聯絡人1:', { name: contact1Name, phone: contact1Phone })
        }
        
        if (voters[1] && voters[1].Voter) {
          contact2Name = voters[1].Voter.name || ''
          contact2Phone = voters[1].Voter.phone || ''
          console.log('聯絡人2:', { name: contact2Name, phone: contact2Phone })
        }
      } else {
        console.log('⚠️ 沒有找到 VoterCase 資料')
      }

      // 人員指派
      let receiver = '', handler = ''
      if (caseData.CaseMember && caseData.CaseMember.length > 0) {
        console.log(`找到 ${caseData.CaseMember.length} 筆 CaseMember 資料`)
        
        const receiverRecord = caseData.CaseMember.find(cm => cm.role === 'receiver')
        const handlerRecord = caseData.CaseMember.find(cm => cm.role === 'handler')
        
        if (receiverRecord && receiverRecord.Member) {
          receiver = receiverRecord.member_id
          console.log('找到受理人員:', receiverRecord.Member.name)
        }
        
        if (handlerRecord && handlerRecord.Member) {
          handler = handlerRecord.member_id
          console.log('找到承辦人員:', handlerRecord.Member.name)
        }
      } else {
        console.log('⚠️ 沒有找到 CaseMember 資料')
      }

      // 時間資訊
      let receivedDate = '', receivedTime = '', closedDate = '', closedTime = ''
      
      if (caseData.start_date) {
        try {
          const isoString = caseData.start_date
          receivedDate = isoString.split('T')[0]
          const timePart = isoString.split('T')[1]
          if (timePart) {
            receivedTime = timePart.substring(0, 5)
          }
          console.log('✅ 解析開始時間成功:', { date: receivedDate, time: receivedTime })
        } catch (error) {
          console.warn('❌ 解析開始時間失敗:', error)
        }
      }

      if (caseData.end_date) {
        try {
          const isoString = caseData.end_date
          closedDate = isoString.split('T')[0]
          const timePart = isoString.split('T')[1]
          if (timePart) {
            closedTime = timePart.substring(0, 5)
          }
          console.log('✅ 解析結束時間成功:', { date: closedDate, time: closedTime })
        } catch (error) {
          console.warn('❌ 解析結束時間失敗:', error)
        }
      }

      // 🔧 修正：統一處理地點資訊，避免變數重複或作用域問題
      console.log('🔍 步驟 2: 處理事發地點...')
      let incidentCounty = ''
      let incidentDistrict = ''
      let incidentLocationFinal = descriptionLocation // 使用新的變數名稱
      
      if (caseData.DistrictCase && caseData.DistrictCase.length > 0) {
        const districtData = caseData.DistrictCase[0].District
        if (districtData) {
          incidentDistrict = districtData.id
          if (districtData.County) {
            incidentCounty = districtData.County.id
          }
          
          console.log('事發地點:', {
            district: districtData.name,
            districtId: districtData.id,
            county: districtData.County?.name,
            countyId: districtData.County?.id
          })
          
          // 如果從資料庫有更完整的地點資料，用來補充
          if (districtData.name && (!incidentLocationFinal || incidentLocationFinal.length < 3)) {
            const countyName = districtData.County?.name || ''
            const districtName = districtData.name
            incidentLocationFinal = (countyName + districtName).trim()
            console.log('使用資料庫地點資料:', incidentLocationFinal)
          }
        } else {
          console.warn('⚠️ DistrictCase 存在但 District 資料為空')
        }
      } else {
        console.log('ℹ️ 無 DistrictCase 資料')
      }

      console.log('🔍 步驟 3: 組合最終表單資料...')
      const formData = {
        // 基本資訊
        id: caseData.id,
        caseNumber: caseNumber,
        title: caseData.title || '',
        description: caseData.description || '',
        category: category,
        priority: caseData.priority || 'normal',
        status: caseData.status || 'pending',
        contactType: caseData.contact_type || 'phone',
        incidentLocation: incidentLocationFinal, // 使用最終處理的地點變數
        
        // 聯絡人資訊
        contact1Name: contact1Name,
        contact1Phone: contact1Phone,
        contact2Name: contact2Name,
        contact2Phone: contact2Phone,
        
        // 人員指派 (使用 CaseMember)
        receiver: receiver,
        handler: handler,
        
        // 時間資訊
        receivedDate: receivedDate,
        receivedTime: receivedTime,
        closedDate: closedDate,
        closedTime: closedTime,
        
        // 地址資訊
        incidentCounty: incidentCounty,
        incidentDistrict: incidentDistrict,
        
        // 其他
        file: caseData.file || null
      }

      console.log('✅ convertCaseToFormData 完成，最終表單資料:', {
        基本資訊: {
          id: formData.id,
          caseNumber: formData.caseNumber,
          title: formData.title,
          category: formData.category,
          priority: formData.priority,
          status: formData.status
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
        },
        地址: {
          incidentCounty: formData.incidentCounty,
          incidentDistrict: formData.incidentDistrict,
          incidentLocation: formData.incidentLocation
        }
      })

      return formData

    } catch (error) {
      console.error('❌ convertCaseToFormData 發生錯誤:', error)
      console.error('錯誤堆疊:', error.stack)
      throw error
    }
  }

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
  }, [originalData, loadHomeDistricts, loadIncidentDistricts])

    // 關閉模態框
  const handleClose = useCallback(() => {
    setShowUnsavedModal(false)
    setHasChanges(false)
    setFormData({})
    setOriginalData(null)
    setError('')
    onClose()
  }, [onClose])

  // 處理表單提交
  // 修正為（移除 handleClose 依賴）：
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      console.log('🔍 開始提交案件更新...')

      const updatedFormData = { ...formData }

      // ✅ 修復：正確處理時間欄位，直接對應到資料庫欄位
      
      // 處理開始時間 - 合併日期和時間為 start_date
      if (updatedFormData.receivedDate) {
        if (updatedFormData.receivedTime) {
          // 合併日期和時間
          updatedFormData.start_date = `${updatedFormData.receivedDate}T${updatedFormData.receivedTime}:00.000Z`
        } else {
          // 只有日期，設定為當天的 00:00
          updatedFormData.start_date = `${updatedFormData.receivedDate}T00:00:00.000Z`
        }
        console.log('合併後的開始時間 (start_date):', updatedFormData.start_date)
      }
      
      // 處理結束時間 - 合併日期和時間為 end_date
      if (updatedFormData.closedDate) {
        if (updatedFormData.closedTime) {
          // 合併日期和時間
          updatedFormData.end_date = `${updatedFormData.closedDate}T${updatedFormData.closedTime}:00.000Z`
        } else {
          // 只有日期，設定為當天的 23:59
          updatedFormData.end_date = `${updatedFormData.closedDate}T23:59:59.000Z`
        }
        console.log('合併後的結束時間 (end_date):', updatedFormData.end_date)
      }

      // 移除分離的日期和時間欄位，因為已經合併
      delete updatedFormData.receivedDate
      delete updatedFormData.receivedTime
      delete updatedFormData.closedDate
      delete updatedFormData.closedTime
      
      // 表單驗證
      const requiredFields = [
        { field: 'title', name: '案件標題' },
        { field: 'contact1Name', name: '聯絡人姓名' },
        { field: 'contact1Phone', name: '聯絡人電話' }
      ]

      // 執行驗證
      for (const { field, name } of requiredFields) {
        if (!updatedFormData[field] || !updatedFormData[field].toString().trim()) {
          setError(`請填寫${name}`)
          setIsSubmitting(false)
          return
        }
      }

      // 電話格式驗證
      const phoneRegex = /^[0-9+\-\s()]{8,15}$/
      if (!phoneRegex.test(updatedFormData.contact1Phone)) {
        setError('聯絡人電話格式不正確')
        setIsSubmitting(false)
        return
      }

      const result = await CaseService.updateCaseWithRelations({
        caseData: { ...updatedFormData, id: caseData.id },
        originalData,
        teamId: team.id,
        dropdownOptions
      })

      if (result.success) {
        console.log('✅ 案件更新成功')
        alert('案件更新成功！')
        
        if (onCaseUpdated) {
          console.log('🔄 呼叫 onCaseUpdated 回調...')
          
          try {
            // 傳遞更新後的資料給父組件
            await onCaseUpdated({
              ...updatedFormData,
              id: caseData.id,
              updated_at: new Date().toISOString()
            })
            
            console.log('✅ onCaseUpdated 回調執行完成')
            
          } catch (callbackError) {
            console.error('❌ onCaseUpdated 回調執行失敗:', callbackError)
            // 即使回調失敗，也不應該阻止關閉模態框
          }
        } else {
          console.warn('⚠️ onCaseUpdated 回調函數未定義')
          // 如果沒有回調函數，手動關閉模態框
          onClose()
        }
        
      } else {
        console.error('❌ 案件更新失敗:', result.error)
        setError('案件更新失敗：' + result.error)
      }

    } catch (error) {
      console.error('更新案件時發生錯誤:', error)
      setError('更新案件時發生錯誤：' + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }, [formData, originalData, team.id, caseData.id, dropdownOptions, onCaseUpdated, onClose])

  // 處理取消
  const handleCancel = useCallback(() => {
    if (hasChanges) {
      setShowUnsavedModal(true)
    } else {
      handleClose()
    }
  }, [hasChanges, handleClose])

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