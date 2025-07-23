// src/components/Case/CaseModal/CaseForm/useCaseForm.js - 支援 initialData
import { useState, useCallback, useEffect, useMemo } from 'react'
import { CaseService } from '../../../../services/caseService'
import { TeamService } from '../../../../services/teamService'

export function useCaseForm({ team, member, onSubmit, initialData }) {
  // 預設表單資料
  const getDefaultFormData = useCallback(() => ({
    caseNumber: '',
    contactMethod: 'phone',
    receivedDate: new Date().toISOString().split('T')[0],
    receivedTime: '08:00',
    closedDate: '',
    closedTime: '',
    receiver: '',
    assignee: '',
    title: '',
    category: '',
    homeCounty: '',
    homeDistrict: '',
    homeAddress: '',
    incidentCounty: '',
    incidentDistrict: '',
    incidentLocation: '',
    priority: 'normal',
    hasAttachment: 'none',
    contact1Name: '',
    contact1Phone: '',
    contact2Name: '',
    contact2Phone: '',
    description: '',
    enableNotifications: false,
    notificationMethod: 'phone',
    reminderCount: 1,
    enableCalendarSync: false
  }), [])

  // 🆕 將 AI 提取的資料轉換為表單格式
  const convertAIDataToFormData = useCallback((aiData) => {
    if (!aiData) return getDefaultFormData()

    console.log('🤖 轉換 AI 資料到表單格式:', aiData)

    const converted = {
      ...getDefaultFormData(),
      // 基本資訊
      title: aiData.title || '',
      description: aiData.description || '',
      
      // 聯絡人資訊
      contact1Name: aiData.petitionerName || '',
      contact1Phone: aiData.contactPhone || '',
      contact2Name: aiData.secondPetitionerName || '',
      contact2Phone: aiData.secondContactPhone || '',
      
      // 地址資訊
      homeAddress: aiData.petitionerAddress || '',
      incidentLocation: aiData.incidentLocation || '',
      
      // 案件分類和優先級
      category: aiData.caseCategory || '',
      priority: aiData.priority || 'normal',
      
      // 陳情方式
      contactMethod: mapPetitionMethod(aiData.petitionMethod) || 'phone',
      
      // 特殊標記
      createdByAI: aiData.createdByAI || false,
      originalTranscript: aiData.originalTranscript || '',
      aiExtractedData: aiData.aiExtractedData || null
    }

    console.log('✅ AI 資料轉換完成:', converted)
    return converted
  }, [getDefaultFormData])

  // 映射陳情方式
  const mapPetitionMethod = useCallback((aiMethod) => {
    const mapping = {
      'Line': 'line',
      '電話': 'phone',
      '現場': 'in_person',
      'FB': 'facebook',
      'Email': 'email',
      '其他': 'other'
    }
    return mapping[aiMethod] || 'phone'
  }, [])

  // 初始化表單資料（支援 AI 資料）
  const [formData, setFormData] = useState(() => {
    if (initialData) {
      return convertAIDataToFormData(initialData)
    }
    return getDefaultFormData()
  })

  // 當 initialData 變化時更新表單
  useEffect(() => {
    if (initialData) {
      console.log('🔄 收到新的 initialData，更新表單')
      const convertedData = convertAIDataToFormData(initialData)
      setFormData(convertedData)
    }
  }, [initialData, convertAIDataToFormData])

  const [dropdownOptions, setDropdownOptions] = useState({
    members: [],
    categories: [],
    counties: [],
    homeDistricts: [],
    incidentDistricts: []
  })

  const [loading, setLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 🔧 輔助函數：確保陣列是安全的
  const ensureArray = useCallback((data, dataType) => {
    if (Array.isArray(data)) {
      console.log(`✅ ${dataType}是有效陣列，包含 ${data.length} 筆資料`)
      return data
    }
    
    console.warn(`⚠️ ${dataType}不是陣列，實際類型:`, typeof data, '，內容:', data)
    return []
  }, [])

  // 載入下拉選單資料
  const loadDropdownData = useCallback(async () => {
    // 🔧 修復：移除不必要的參數檢查，因為 getTeamMembers() 不需要參數
    console.log('載入下拉選單資料...')
    console.log('團隊資訊:', { teamId: team?.id, teamName: team?.name })
    console.log('成員資訊:', { memberId: member?.id, authUserId: member?.auth_user_id, memberName: member?.name })

    setLoading(true)

    try {
      const [membersResult, categoriesResult, countiesResult] = await Promise.allSettled([
        // 🔧 修復：不傳遞任何參數，因為 getTeamMembers() 是無參數的
        TeamService.getTeamMembers(),
        CaseService.getCategories(),
        CaseService.getCounties()
      ])

      console.log('=== 載入結果分析 ===')
      console.log('團隊成員載入結果:', membersResult)
      console.log('案件類別載入結果:', categoriesResult)
      console.log('縣市載入結果:', countiesResult)

      // 🔧 修復：正確處理團隊成員結果
      let teamMembers = []
      if (membersResult.status === 'fulfilled') {
        const memberData = membersResult.value
        console.log('團隊成員 API 回應詳細資訊:', memberData)
        
        if (memberData && memberData.success) {
          // 🔧 根據實際的 API 回應格式處理
          if (Array.isArray(memberData.data)) {
            teamMembers = memberData.data
            console.log('✅ 從 data 欄位取得團隊成員:', teamMembers.length, '筆')
          } else if (Array.isArray(memberData.members)) {
            teamMembers = memberData.members
            console.log('✅ 從 members 欄位取得團隊成員:', teamMembers.length, '筆')
          } else {
            console.warn('⚠️ 團隊成員資料格式異常:', memberData)
          }
          
          // 顯示成員詳細資訊
          if (teamMembers.length > 0) {
            console.log('團隊成員列表:')
            teamMembers.forEach((member, index) => {
              console.log(`  ${index + 1}. ${member.name || member.member_name} (ID: ${member.id || member.member_id})`)
            })
          }
        } else {
          console.error('❌ 團隊成員 API 回應失敗:', memberData?.error || memberData?.message || '未知錯誤')
        }
      } else {
        console.error('❌ 團隊成員 API 調用失敗:', membersResult.reason)
      }

      // 🔧 處理案件類別
      let categories = []
      if (categoriesResult.status === 'fulfilled' && categoriesResult.value.success) {
        categories = categoriesResult.value.data || []
      }

      // 🔧 處理縣市資料
      let counties = []
      if (countiesResult.status === 'fulfilled' && countiesResult.value.success) {
        counties = countiesResult.value.data || []
      }

      const newOptions = {
        members: ensureArray(teamMembers, '團隊成員'),
        categories: ensureArray(categories, '案件類別'),
        counties: ensureArray(counties, '縣市'),
        homeDistricts: [],
        incidentDistricts: []
      }

      setDropdownOptions(newOptions)
      
      console.log('✅ 下拉選單資料載入完成:', {
        members: newOptions.members.length,
        categories: newOptions.categories.length,
        counties: newOptions.counties.length
      })

      // 🔧 如果團隊成員為空，顯示警告
      if (newOptions.members.length === 0) {
        console.warn('⚠️ 沒有載入到任何團隊成員，請檢查：')
        console.warn('  1. 用戶是否已正確加入團隊')
        console.warn('  2. 團隊中是否有其他活躍成員')
        console.warn('  3. 資料庫連接是否正常')
      }

    } catch (error) {
      console.error('💥 載入下拉選單資料發生異常:', error)
    } finally {
      setLoading(false)
    }
  }, [ensureArray])

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
        const validDistricts = ensureArray(result.data, `${type}行政區`)
        
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
  }, [ensureArray])

  // 處理輸入變更
  const handleInputChange = useCallback((field, value) => {
    console.log(`表單欄位變更: ${field} = ${value}`)
    
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))

    // 處理縣市變更時載入對應行政區
    if (field === 'homeCounty' && value) {
      loadDistricts(value, 'home')
    } else if (field === 'incidentCounty' && value) {
      loadDistricts(value, 'incident')
    }
  }, [loadDistricts])

  // 生成案件編號
  const generateCaseNumber = useCallback(() => {
    if (!team?.id) return

    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hour = String(now.getHours()).padStart(2, '0')
    const minute = String(now.getMinutes()).padStart(2, '0')
    
    const caseNumber = `CASE-${year}${month}${day}-${hour}${minute}-${team.id.slice(-4)}`
    
    setFormData(prev => ({
      ...prev,
      caseNumber
    }))
    
    console.log('生成案件編號:', caseNumber)
  }, [team?.id])

  // 表單驗證
  const validateForm = useCallback(() => {
    const errors = []
    
    if (!formData.title?.trim()) {
      errors.push('案件標題不能為空')
    }
    
    if (!formData.description?.trim()) {
      errors.push('案件描述不能為空')
    }
    
    if (!formData.contact1Name?.trim()) {
      errors.push('聯絡人姓名不能為空')
    }
    
    return errors
  }, [formData])

  // 處理表單提交
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault()
    
    console.log('=== useCaseForm.handleSubmit ===')
    console.log('提交的表單資料:', formData)
    
    // 表單驗證
    const validationErrors = validateForm()
    if (validationErrors.length > 0) {
      alert('表單驗證失敗：\n' + validationErrors.join('\n'))
      return
    }
    
    setIsSubmitting(true)
    
    try {
      // 準備案件資料
      const caseData = {
        ...formData,
        teamId: team?.id,
        createdBy: member?.auth_user_id,
        // 🆕 保留 AI 相關資訊
        createdByAI: formData.createdByAI || false,
        originalTranscript: formData.originalTranscript || '',
        aiExtractedData: formData.aiExtractedData || null
      }
      
      console.log('準備提交的案件資料:', caseData)
      
      await onSubmit(caseData)
      
    } catch (error) {
      console.error('表單提交失敗:', error)
      alert('案件建立失敗：' + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }, [formData, team, member, onSubmit, validateForm])

  // useEffect hooks
  useEffect(() => {
    // 🔧 修復：只要組件載入就執行，不依賴 team 和 member 的特定屬性
    console.log('開始載入下拉選單資料')
    loadDropdownData()
  }, [loadDropdownData])

  useEffect(() => {
    if (formData.homeCounty) {
      console.log('住家縣市變更，載入行政區:', formData.homeCounty)
      loadDistricts(formData.homeCounty, 'home')
    } else {
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
      setDropdownOptions(prev => ({
        ...prev,
        incidentDistricts: []
      }))
    }
  }, [formData.incidentCounty, loadDistricts])

  useEffect(() => {
    // 只有在沒有初始資料時才生成新的案件編號
    if (!initialData) {
      generateCaseNumber()
    }
  }, [generateCaseNumber, initialData])

  // 🔧 確保 dropdownOptions 中的所有陣列都是安全的
  const safeDropdownOptions = useMemo(() => ({
    members: ensureArray(dropdownOptions.members, '成員列表'),
    categories: ensureArray(dropdownOptions.categories, '類別列表'),
    counties: ensureArray(dropdownOptions.counties, '縣市列表'),
    homeDistricts: ensureArray(dropdownOptions.homeDistricts, '住家行政區列表'),
    incidentDistricts: ensureArray(dropdownOptions.incidentDistricts, '事發行政區列表')
  }), [dropdownOptions, ensureArray])

  return {
    formData,
    dropdownOptions: safeDropdownOptions,
    loading,
    isSubmitting,
    handleInputChange,
    handleSubmit
  }
}