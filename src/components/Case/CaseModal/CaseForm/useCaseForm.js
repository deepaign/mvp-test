// src/components/Case/CaseModal/CaseForm/useCaseForm.js - 修正版本
import { useState, useEffect, useCallback } from 'react'
import { CaseService } from '../../../../services/caseService'

export const useCaseForm = (team, onSubmit) => {
  // 所有原本的 state
  const [formData, setFormData] = useState({
    // 基本資訊
    caseNumber: '',
    contactMethod: 'phone',
    receivedDate: new Date().toISOString().split('T')[0],
    receivedTime: '08:00',
    closedDate: '',
    closedTime: '',
    receiver: '',
    handler: '',
    category: '',
    homeCounty: '',
    homeDistrict: '',
    priority: 'normal',
    hasAttachment: 'none',
    
    // 聯絡資訊
    contact1Name: '',
    contact1Phone: '',
    contact2Name: '',
    contact2Phone: '',
    
    // 陳情內容
    title: '',
    description: '',
    incidentLocation: '',
    incidentCounty: '',
    incidentDistrict: '',
    processingStatus: 'pending',
    
    // 行事曆與通知
    notificationMethod: 'phone',
    reminderDate: '',
    googleCalendarSync: false,
    sendNotification: false,
    multipleReminders: false
  })

  const [dropdownOptions, setDropdownOptions] = useState({
    members: [],
    categories: [],
    counties: [],
    homeDistricts: [],
    incidentDistricts: []
  })

  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 🔧 輔助函數：確保陣列安全
  const ensureArray = useCallback((data, errorContext = '資料') => {
    if (Array.isArray(data)) {
      return data
    }
    
    if (data === null || data === undefined) {
      console.warn(`${errorContext}: 值為 null 或 undefined`)
      return []
    }
    
    console.warn(`${errorContext}: 值不是陣列`, typeof data, data)
    return []
  }, [])

  // 載入行政區資料
  const loadDistricts = useCallback(async (countyId, type) => {
    try {
      if (!countyId) {
        setDropdownOptions(prev => ({
          ...prev,
          [type === 'home' ? 'homeDistricts' : 'incidentDistricts']: []
        }))
        return
      }

      console.log(`載入 ${type} 行政區，縣市ID:`, countyId)

      const result = await CaseService.getDistricts(countyId)
      
      if (result.success) {
        // 🔧 確保資料是陣列
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

    setLoading(true)
    
    try {
      console.log('開始載入下拉選單資料，團隊ID:', team.id)

      // 🔧 使用 Promise.allSettled 來處理多個 API 調用
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

      const results = await Promise.allSettled(promises)
      
      // 🔧 安全處理每個結果
      const [membersResult, categoriesResult, countiesResult] = results.map(result => {
        if (result.status === 'rejected') {
          console.error('Promise 被拒絕:', result.reason)
          return { success: false, data: [], error: result.reason.message || '未知錯誤' }
        }
        return result.value
      })

      // 🔧 確保所有資料都是陣列
      const safeDropdownOptions = {
        members: ensureArray(membersResult.success ? membersResult.data : [], '團隊成員'),
        categories: ensureArray(categoriesResult.success ? categoriesResult.data : [], '案件類別'),
        counties: ensureArray(countiesResult.success ? countiesResult.data : [], '縣市'),
        homeDistricts: [],
        incidentDistricts: []
      }

      console.log('下拉選單資料載入結果:', {
        members: safeDropdownOptions.members.length,
        categories: safeDropdownOptions.categories.length,
        counties: safeDropdownOptions.counties.length
      })

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
  }, [team?.id, ensureArray])

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
      const phoneRegex = /^[\d\-\(\)\+\s]+$/
      if (!phoneRegex.test(data.contact1Phone)) {
        errors.push('聯絡人1電話格式不正確')
      }
    }

    if (data.contact2Phone && data.contact2Phone.trim() !== '') {
      const phoneRegex = /^[\d\-\(\)\+\s]+$/
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
          handler: '',
          category: '',
          homeCounty: '',
          homeDistrict: '',
          priority: 'normal',
          hasAttachment: 'none',
          contact1Name: '',
          contact1Phone: '',
          contact2Name: '',
          contact2Phone: '',
          title: '',
          description: '',
          incidentLocation: '',
          incidentCounty: '',
          incidentDistrict: '',
          processingStatus: 'pending',
          notificationMethod: 'phone',
          reminderDate: '',
          googleCalendarSync: false,
          sendNotification: false,
          multipleReminders: false
        })

        // 重新生成案件編號
        generateCaseNumber()

      } else {
        console.error('❌ 案件建立失敗:', result.error)
        
        let errorMessage = '建立案件失敗：'
        
        if (result.error.includes('duplicate') || result.error.includes('unique')) {
          errorMessage += '資料重複，請檢查是否已存在相同案件'
        } else if (result.error.includes('foreign key') || result.error.includes('constraint')) {
          errorMessage += '資料關聯錯誤，請檢查選擇的選項是否正確'
        } else if (result.error.includes('permission')) {
          errorMessage += '權限不足，請聯繫系統管理員'
        } else if (result.error.includes('RLS')) {
          errorMessage += '資料庫權限問題，請聯繫系統管理員'
        } else {
          errorMessage += result.error
        }
        
        alert(errorMessage)
      }

    } catch (error) {
      console.error('❌ 建立案件時發生錯誤:', error)
      
      let errorMessage = '建立案件時發生錯誤：'
      
      if (error.message.includes('network')) {
        errorMessage += '網路連線問題，請檢查網路連線後再試'
      } else if (error.message.includes('timeout')) {
        errorMessage += '請求超時，請稍後再試'
      } else if (error.message.includes('fetch')) {
        errorMessage += '網路請求失敗，請檢查網路連線'
      } else {
        errorMessage += '系統錯誤，請稍後再試'
      }
      
      alert(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }, [formData, team, onSubmit, validateForm, dropdownOptions, isSubmitting, generateCaseNumber])

  // useEffect hooks
  useEffect(() => {
    if (team?.id) {
      console.log('團隊變更，載入下拉選單資料')
      loadDropdownData()
    }
  }, [loadDropdownData, team?.id])

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
  const safeDropdownOptions = React.useMemo(() => ({
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