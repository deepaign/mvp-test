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
      return data
    }
    
    console.warn(`${dataType} 不是陣列，使用空陣列:`, data)
    return []
  }, [])

  // 載入下拉選單資料
  const loadDropdownData = useCallback(async () => {
    if (!team?.id || !member?.auth_user_id) {
      console.warn('團隊ID或成員ID為空，無法載入下拉選單資料')
      return
    }

    setLoading(true)
    console.log('載入下拉選單資料...')

    try {
      const [membersResult, categoriesResult, countiesResult] = await Promise.allSettled([
        TeamService.getTeamMembers(team.id, member.auth_user_id),
        CaseService.getCategories(),
        CaseService.getCounties()
      ])

      const newOptions = {
        members: ensureArray(
          membersResult.status === 'fulfilled' && membersResult.value.success 
            ? (membersResult.value.members || membersResult.value.data)
            : [], 
          '團隊成員'
        ),
        categories: ensureArray(
          categoriesResult.status === 'fulfilled' && categoriesResult.value.success 
            ? categoriesResult.value.data 
            : [], 
          '案件類別'
        ),
        counties: ensureArray(
          countiesResult.status === 'fulfilled' && countiesResult.value.success 
            ? countiesResult.value.data 
            : [], 
          '縣市'
        ),
        homeDistricts: [],
        incidentDistricts: []
      }

      setDropdownOptions(newOptions)
      console.log('下拉選單資料載入完成')

    } catch (error) {
      console.error('載入下拉選單資料失敗:', error)
    } finally {
      setLoading(false)
    }
  }, [team?.id, member?.auth_user_id, ensureArray])

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
    if (team?.id && member?.auth_user_id) {
      console.log('團隊或成員變更，載入下拉選單資料')
      loadDropdownData()
    }
  }, [loadDropdownData, team?.id, member?.auth_user_id])

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