// src/components/Case/CaseModal/CaseForm/useCaseForm.js - 完整修正版
import { useState, useCallback, useEffect, useMemo } from 'react'
import { CaseService } from '../../../../services/caseService'
import { TeamService } from '../../../../services/teamService'

export function useCaseForm({ team, member, onSubmit }) {
  const [formData, setFormData] = useState({
    caseNumber: '',
    contactMethod: 'phone',
    receivedDate: new Date().toISOString().split('T')[0],
    receivedTime: '08:00',
    closedDate: '',
    closedTime: '',
    receiver: '',
    assignee: '', // 修正：使用 assignee 而不是 handler
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
  })

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

  // 生成案件編號
  const generateCaseNumber = useCallback(() => {
    const now = new Date()
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
    const timeStr = now.getTime().toString().slice(-3)
    const caseNumber = `CASE-${dateStr}-${timeStr}`
    
    setFormData(prev => ({
      ...prev,
      caseNumber
    }))
    
    console.log('生成案件編號:', caseNumber)
  }, [])

  // 載入下拉選單資料
  const loadDropdownData = useCallback(async () => {
    if (!team?.id) {
      console.error('團隊 ID 缺失，無法載入下拉選單資料')
      setLoading(false)
      return
    }

    // 檢查 member 參數
    if (!member?.auth_user_id) {
      console.error('成員驗證資訊缺失，無法載入下拉選單資料')
      setLoading(false)
      return
    }

    setLoading(true)
    
    try {
      console.log('開始載入下拉選單資料，團隊ID:', team.id, '成員ID:', member.auth_user_id)

      // 🔧 使用 Promise.allSettled 來處理多個 API 調用
      const promises = [
        // 修正：使用 TeamService.getTeamMembers 並傳入正確參數
        TeamService.getTeamMembers(team.id, member.auth_user_id).catch(err => {
          console.error('載入團隊成員失敗:', err)
          return { success: false, members: [], error: err.message }
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

      const results = await Promise.allSettled(promises)
      
      // 🔧 安全處理每個結果
      const [membersResult, categoriesResult, countiesResult] = results.map(result => {
        if (result.status === 'rejected') {
          console.error('Promise 被拒絕:', result.reason)
          return { success: false, data: [], members: [], error: result.reason.message || '未知錯誤' }
        }
        return result.value
      })

      // 🔧 確保所有資料都是陣列，特別處理 TeamService 的回傳格式
      const safeDropdownOptions = {
        // 修正：TeamService.getTeamMembers 回傳格式是 { success, members, isLeader }
        members: ensureArray(
          membersResult.success ? membersResult.members : [], 
          '團隊成員'
        ),
        categories: ensureArray(
          categoriesResult.success ? categoriesResult.data : [], 
          '案件類別'
        ),
        counties: ensureArray(
          countiesResult.success ? countiesResult.data : [], 
          '縣市'
        ),
        homeDistricts: [],
        incidentDistricts: []
      }

      console.log('下拉選單資料載入結果:', {
        members: safeDropdownOptions.members.length,
        categories: safeDropdownOptions.categories.length,
        counties: safeDropdownOptions.counties.length
      })

      // 除錯：顯示載入的成員資料
      console.log('載入的成員清單:', safeDropdownOptions.members)

      setDropdownOptions(safeDropdownOptions)

    } catch (error) {
      console.error('載入下拉選單發生嚴重錯誤:', error)
      // 🔧 確保在錯誤情況下設定安全的預設值
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
  }, [team?.id, member?.auth_user_id, ensureArray])

  // 處理輸入變更
  const handleInputChange = useCallback((field, value) => {
    console.log(`欄位變更: ${field} = ${value}`)
    
    setFormData(prev => {
      const newData = {
        ...prev,
        [field]: value
      }

      // 特殊處理邏輯
      if (field === 'homeCounty') {
        newData.homeDistrict = '' // 清空行政區選擇
      }
      
      if (field === 'incidentCounty') {
        newData.incidentDistrict = '' // 清空行政區選擇
      }
      
      if (field === 'closedDate' && !value) {
        newData.closedTime = '' // 清空結案時間
      }

      return newData
    })
  }, [])

  // 表單驗證
  const validateForm = useCallback((data) => {
    const errors = []

    // 必填欄位檢查
    if (!data.title || data.title.trim() === '') {
      errors.push('案件標題為必填欄位')
    }

    if (!data.contact1Name || data.contact1Name.trim() === '') {
      errors.push('聯絡人1姓名為必填欄位')
    }

    if (!data.contact1Phone || data.contact1Phone.trim() === '') {
      errors.push('聯絡人1電話為必填欄位')
    }

    if (!data.receivedDate) {
      errors.push('收件日期為必填欄位')
    }

    if (!data.category || data.category.trim() === '') {
      errors.push('案件類別為必填欄位')
    }

    // 電話格式檢查
    if (data.contact1Phone) {
      const phoneRegex = /^[\d\-()+ \s]+$/
      if (!phoneRegex.test(data.contact1Phone)) {
        errors.push('聯絡人1電話格式不正確')
      }
    }

    if (data.contact2Phone && data.contact2Phone.trim() !== '') {
      const phoneRegex = /^[\d\-()+ \s]+$/
      if (!phoneRegex.test(data.contact2Phone)) {
        errors.push('聯絡人2電話格式不正確')
      }
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    }
  }, [])

  // 處理表單提交
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault()
    
    if (isSubmitting) {
      console.log('正在提交中，忽略重複提交')
      return
    }

    console.log('開始提交表單:', formData)

    // 驗證表單
    const validation = validateForm(formData)
    if (!validation.isValid) {
      const errorMessage = '表單驗證失敗：\n' + validation.errors.join('\n')
      alert(errorMessage)
      return
    }

    setIsSubmitting(true)

    try {
      console.log('=== 開始建立案件 ===')
      console.log('團隊資訊:', team)
      console.log('成員資訊:', member)
      console.log('表單資料:', formData)
      console.log('下拉選單選項:', dropdownOptions)

      // 🔧 確保 CaseService.createCase 方法存在
      if (!CaseService.createCase || typeof CaseService.createCase !== 'function') {
        throw new Error('CaseService.createCase 方法不存在')
      }

      const result = await CaseService.createCase(formData, team.id, dropdownOptions)

      console.log('案件建立結果:', result)

      if (result.success) {
        console.log('✅ 案件建立成功')
        
        if (typeof onSubmit === 'function') {
          onSubmit(result.data)
        }
        
        // 重置表單
        setFormData({
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
        })

        // 重新生成案件編號
        generateCaseNumber()
        
        alert('案件建立成功！')
      } else {
        console.error('❌ 案件建立失敗:', result.error)
        alert('案件建立失敗：' + result.error)
      }

    } catch (error) {
      console.error('❌ 提交表單發生錯誤:', error)
      
      let errorMessage = '提交表單時發生錯誤：\n'
      if (error.message) {
        errorMessage += error.message
      } else if (error.code === 'NETWORK_ERROR') {
        errorMessage += '網路請求失敗，請檢查網路連線'
      } else {
        errorMessage += '系統錯誤，請稍後再試'
      }
      
      alert(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }, [formData, team, member, onSubmit, validateForm, dropdownOptions, isSubmitting, generateCaseNumber])

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

  useEffect(() => {
    // 初始化時生成案件編號
    generateCaseNumber()
  }, [generateCaseNumber])

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