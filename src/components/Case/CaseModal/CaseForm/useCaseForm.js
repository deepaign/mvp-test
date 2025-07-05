// src/components/Case/CaseModal/CaseForm/useCaseForm.js
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

  // 載入行政區資料
  const loadDistricts = async (countyId, type) => {
    try {
      if (!countyId) {
        setDropdownOptions(prev => ({
          ...prev,
          [type === 'home' ? 'homeDistricts' : 'incidentDistricts']: []
        }))
        return
      }

      const result = await CaseService.getDistricts(countyId)
      
      if (result.success) {
        setDropdownOptions(prev => ({
          ...prev,
          [type === 'home' ? 'homeDistricts' : 'incidentDistricts']: result.data || []
        }))
      } else {
        setDropdownOptions(prev => ({
          ...prev,
          [type === 'home' ? 'homeDistricts' : 'incidentDistricts']: []
        }))
      }

    } catch (error) {
      console.error('載入行政區發生錯誤:', error)
    }
  }

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
  }, [])

  // 載入下拉選單資料
  const loadDropdownData = useCallback(async () => {
    setLoading(true)
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
  }, [team.id])

  // 處理表單輸入變更
  const handleInputChange = useCallback((field, value) => {
    setFormData(prev => {
      const newData = {
        ...prev,
        [field]: value
      }

      // 特殊處理：住家縣市改變時清空住家行政區
      if (field === 'homeCounty') {
        newData.homeDistrict = ''
      }

      // 特殊處理：事發地點縣市改變時清空事發地點行政區
      if (field === 'incidentCounty') {
        newData.incidentDistrict = ''
      }

      // 特殊處理：結案日期清空時，同時清空結案時間
      if (field === 'closedDate' && !value) {
        newData.closedTime = ''
      }

      // 特殊處理：如果設定了結案日期但沒有時間，預設為現在時間
      if (field === 'closedDate' && value && !prev.closedTime) {
        const now = new Date()
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
        newData.closedTime = currentTime
      }

      return newData
    })
  }, [])

  // 表單驗證
  const validateForm = useCallback(() => {
    const requiredFields = [
      'title',
      'contact1Name',
      'contact1Phone',
      'receiver',
      'category',
      'receivedDate',
      'receivedTime'
    ]

    for (const field of requiredFields) {
      const value = formData[field]
      
      if (!value || !value.toString().trim()) {
        const fieldNames = {
          title: '案件標題',
          contact1Name: '聯絡人1姓名',
          contact1Phone: '聯絡人1電話',
          receiver: '受理人員',
          category: '案件類別',
          receivedDate: '受理日期',
          receivedTime: '受理時間'
        }
        
        const errorMsg = `請填寫 ${fieldNames[field]}`
        alert(errorMsg)
        return false
      }
    }
    
    // 檢查團隊資料
    if (!team || !team.id) {
      alert('團隊資料不完整，無法建立案件')
      return false
    }
    
    // 檢查電話格式
    const phoneRegex = /^[0-9+\-\s()]{8,15}$/
    if (!phoneRegex.test(formData.contact1Phone)) {
      alert('聯絡人1電話格式不正確，請輸入有效的電話號碼')
      return false
    }
    
    // 檢查結案日期時間的一致性
    if (formData.closedDate && !formData.closedTime) {
      alert('請設定結案時間')
      return false
    }
    
    return true
  }, [formData, team])

  // 提交表單
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      const result = await CaseService.createCaseWithRelations({
        formData,
        teamId: team.id
      })

      if (result.success) {
        // 直接調用 onSubmit，不顯示成功訊息
        if (onSubmit) {
          await onSubmit(result.data)
        }
      } else {
        // 只在真正失敗時顯示錯誤訊息
        let errorMessage = '建立案件失敗：'
        
        if (result.error.includes('time with time zone')) {
          errorMessage += '日期時間格式問題，請聯繫系統管理員'
        } else if (result.error.includes('foreign key')) {
          errorMessage += '資料關聯問題，請檢查選擇的選項是否正確'
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
  }, [formData, team, onSubmit, validateForm])

  // useEffect hooks
  useEffect(() => {
    loadDropdownData()
  }, [loadDropdownData])

  useEffect(() => {
    if (formData.homeCounty) {
      loadDistricts(formData.homeCounty, 'home')
    }
  }, [formData.homeCounty])

  useEffect(() => {
    if (formData.incidentCounty) {
      loadDistricts(formData.incidentCounty, 'incident')
    }
  }, [formData.incidentCounty])

  useEffect(() => {
    generateCaseNumber()
  }, [generateCaseNumber])

  return {
    formData,
    dropdownOptions,
    loading,
    isSubmitting,
    handleInputChange,
    handleSubmit
  }
}