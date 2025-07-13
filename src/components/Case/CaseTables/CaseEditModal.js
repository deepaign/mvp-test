// src/components/Case/CaseTables/CaseEditModal.js - 完整修正版
// 修正：案件編號顯示、時間顯示、案件類別顯示、事發地點記錄
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

// 編輯專用的表單組件
const EditableCaseForm = ({ team, initialData, onDataChange, onSubmit, onCancel, isSubmitting, hasChanges, dataLoadingState }) => {
  const [formData, setFormData] = useState(initialData || {})
  const [dropdownOptions, setDropdownOptions] = useState({
    members: [],
    categories: [],
    counties: [],
    homeDistricts: [],
    incidentDistricts: []
  })
  const [loading, setLoading] = useState(true)

  // 載入住家行政區列表
  const loadHomeDistricts = useCallback(async (countyId) => {
    try {
      console.log('載入住家行政區列表，縣市 ID:', countyId)
      const districtsResult = await CaseService.getDistricts(countyId)
      if (districtsResult.success) {
        console.log('住家行政區載入成功:', districtsResult.data.length, '筆')
        setDropdownOptions(prev => ({
          ...prev,
          homeDistricts: districtsResult.data
        }))
      } else {
        console.warn('載入住家行政區失敗:', districtsResult.error)
        setDropdownOptions(prev => ({ ...prev, homeDistricts: [] }))
      }
    } catch (error) {
      console.warn('載入住家行政區異常:', error)
      setDropdownOptions(prev => ({ ...prev, homeDistricts: [] }))
    }
  }, [])

  // 載入事發地點行政區列表
  const loadIncidentDistricts = useCallback(async (countyId) => {
    try {
      console.log('載入事發地點行政區列表，縣市 ID:', countyId)
      const districtsResult = await CaseService.getDistricts(countyId)
      if (districtsResult.success) {
        console.log('事發地點行政區載入成功:', districtsResult.data.length, '筆')
        setDropdownOptions(prev => ({
          ...prev,
          incidentDistricts: districtsResult.data
        }))
      } else {
        console.warn('載入事發地點行政區失敗:', districtsResult.error)
        setDropdownOptions(prev => ({ ...prev, incidentDistricts: [] }))
      }
    } catch (error) {
      console.warn('載入事發地點行政區異常:', error)
      setDropdownOptions(prev => ({ ...prev, incidentDistricts: [] }))
    }
  }, [])

  // 載入下拉選單資料
  const loadDropdownData = useCallback(async () => {
    if (!team?.id) {
      console.warn('無效的 team ID，無法載入下拉選單選項')
      setLoading(false)
      return
    }

    try {
      console.log('載入編輯表單的下拉選單選項...')
      
      const [membersResult, categoriesResult, countiesResult] = await Promise.allSettled([
        CaseService.getTeamMembers(team.id),
        CaseService.getCategories(team.id),
        CaseService.getCounties()
      ])

      const members = getValidArray(membersResult, '團隊成員')
      const categories = getValidArray(categoriesResult, '案件類別')
      const counties = getValidArray(countiesResult, '縣市資料')

      console.log('載入的下拉選單選項:', { members, categories, counties })

      setDropdownOptions({
        members,
        categories,
        counties,
        homeDistricts: [],
        incidentDistricts: []
      })

    } catch (error) {
      console.error('載入下拉選單選項失敗:', error)
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
  }, [team?.id])

  // 當初始資料變更時更新表單資料並載入對應的行政區
  useEffect(() => {
    if (initialData) {
      console.log('EditableCaseForm 接收到初始資料:', initialData)
      setFormData(initialData)
      
      // 如果有住家縣市，載入對應的行政區列表
      if (initialData.homeCounty) {
        loadHomeDistricts(initialData.homeCounty)
      }
      
      // 如果有事發地點縣市，載入對應的行政區列表
      if (initialData.incidentCounty) {
        loadIncidentDistricts(initialData.incidentCounty)
      }
    }
  }, [initialData, loadHomeDistricts, loadIncidentDistricts])

  // 處理表單輸入變更（包含動態載入行政區）
  const handleInputChange = (field, value) => {
    console.log(`表單欄位變更: ${field} = ${value}`)
    
    const newFormData = {
      ...formData,
      [field]: value
    }

    // 特殊處理：住家縣市改變時清空住家行政區並載入新的行政區列表
    if (field === 'homeCounty') {
      newFormData.homeDistrict = ''
      
      if (value) {
        // 非同步載入行政區
        loadHomeDistricts(value)
      } else {
        setDropdownOptions(prev => ({ ...prev, homeDistricts: [] }))
      }
    }

    // 特殊處理：事發地點縣市改變時清空事發地點行政區並載入新的行政區列表
    if (field === 'incidentCounty') {
      newFormData.incidentDistrict = ''
      
      if (value) {
        // 非同步載入行政區
        loadIncidentDistricts(value)
      } else {
        setDropdownOptions(prev => ({ ...prev, incidentDistricts: [] }))
      }
    }

    // 特殊處理：結案日期清空時，同時清空結案時間
    if (field === 'closedDate' && !value) {
      newFormData.closedTime = ''
    }

    // 特殊處理：如果設定了結案日期但沒有時間，預設為現在時間
    if (field === 'closedDate' && value && !formData.closedTime) {
      const now = new Date()
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
      newFormData.closedTime = currentTime
    }

    setFormData(newFormData)
    stableOnDataChange(newFormData)
  }, [formData, stableOnDataChange])

  // 處理表單提交
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault()
    onSubmit(formData)
  }

  // 取得按鈕狀態和文字
  const getButtonState = () => {
    if (isSubmitting) return { disabled: true, text: '儲存中...' }
    if (dataLoadingState === 'loading') return { disabled: true, text: '載入中...' }
    if (dataLoadingState === 'error') return { disabled: true, text: '載入失敗' }
    if (!hasChanges) return { disabled: true, text: '無變更' }
    return { disabled: false, text: '儲存修改' }
  }

  const buttonState = getButtonState()

  if (loading) {
    return (
      <div className="loading-container" style={{ 
        padding: '40px', 
        textAlign: 'center',
        fontSize: '0.9rem',
        color: '#666'
      }}>
        <div className="loading-spinner"></div>
        <p>載入編輯表單中...</p>
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
          <button
            type="button"
            onClick={onCancel}
            className="cancel-btn"
            disabled={isSubmitting}
          >
            取消
          </button>
          <button
            type="submit"
            className="submit-btn"
            disabled={buttonState.disabled}
          >
            {buttonState.text}
          </button>
        </div>
      </form>
    </div>
  )
}

// 表單欄位驗證函數
const validateFormFields = (formData) => {
  // === 必填欄位檢查 ===
  const requiredFields = [
    { field: 'title', name: '案件標題' },
    { field: 'contact1Name', name: '聯絡人姓名' },
    { field: 'contact1Phone', name: '聯絡人電話' }
  ]

  for (const { field, name } of requiredFields) {
    if (!formData[field] || !formData[field].toString().trim()) {
      return { valid: false, message: `請填寫${name}` }
    }
  }

  // === 格式驗證 ===
  const phoneRegex = /^[0-9+\-\s()]{8,15}$/
  if (!phoneRegex.test(formData.contact1Phone)) {
    return { valid: false, message: '聯絡人電話格式不正確' }
  }

  // 聯絡人2電話格式檢查（如果有填寫）
  if (formData.contact2Phone && !phoneRegex.test(formData.contact2Phone)) {
    return { valid: false, message: '聯絡人2電話格式不正確' }
  }

  // === 邏輯一致性檢查 ===
  if (formData.closedDate && !formData.closedTime) {
    return { valid: false, message: '請設定結案時間' }
  }

  if (formData.contact2Phone && !formData.contact2Name) {
    return { valid: false, message: '請填寫聯絡人2姓名' }
  }

  return { valid: true }
}

// 錯誤訊息分級函數
const getErrorSeverity = (error) => {
  if (error.includes('系統錯誤') || error.includes('載入異常')) {
    return 'critical'  // 需要重新載入頁面
  }
  if (error.includes('載入') || error.includes('資料')) {
    return 'warning'   // 可以重試
  }
  return 'normal'      // 一般驗證錯誤
}

function CaseEditModal({ isOpen, onClose, caseData, team, onCaseUpdated }) {
  const [formData, setFormData] = useState({})
  const [originalData, setOriginalData] = useState({})
  const [hasChanges, setHasChanges] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showUnsavedModal, setShowUnsavedModal] = useState(false)
  const [error, setError] = useState('')
  const [counties, setCounties] = useState([])
  const [dataLoadingState, setDataLoadingState] = useState('idle') // 'idle', 'loading', 'success', 'error'

  /**
   * 解析住家地址（從 Voter.address 格式：臺北市信義區）
   */
  const parseVoterAddress = useCallback((address) => {
    if (!address || !address.trim()) {
      return { countyName: '', districtName: '' }
    }

    console.log('解析住家地址:', address)
    
    // 常見的縣市後綴
    const countySuffixes = ['市', '縣']
    let countyName = ''
    let districtName = ''
    
    // 找到縣市部分
    for (const suffix of countySuffixes) {
      const countyMatch = address.match(new RegExp(`^([^${suffix}]+${suffix})`))
      if (countyMatch) {
        countyName = countyMatch[1]
        districtName = address.substring(countyName.length) // 剩餘部分就是行政區
        break
      }
    }
    
    const result = {
      countyName: countyName.trim(),
      districtName: districtName.trim()
    }
    
    console.log('住家地址解析結果:', result)
    return result
  }, [])

  /**
   * 解析事發地點資訊（從 description 格式：事發地點：臺北市信義區信義路五段7號）
   */
  const parseIncidentLocation = useCallback((incidentLocationString) => {
    if (!incidentLocationString || !incidentLocationString.trim()) {
      return {
        countyName: '',
        districtName: '',
        detailAddress: ''
      }
    }

    console.log('解析事發地點:', incidentLocationString)

    // 常見的縣市後綴
    const countySuffixes = ['市', '縣']
    // 常見的行政區後綴  
    const districtSuffixes = ['區', '鄉', '鎮', '市']
    
    let countyName = ''
    let districtName = ''
    let detailAddress = incidentLocationString
    
    // 嘗試找到縣市
    for (const suffix of countySuffixes) {
      const countyMatch = incidentLocationString.match(new RegExp(`^([^${suffix}]+${suffix})`))
      if (countyMatch) {
        countyName = countyMatch[1]
        detailAddress = incidentLocationString.substring(countyName.length)
        break
      }
    }
    
    // 如果找到縣市，嘗試在剩餘部分找行政區
    if (countyName && detailAddress) {
      for (const suffix of districtSuffixes) {
        const districtMatch = detailAddress.match(new RegExp(`^([^${suffix}]+${suffix})`))
        if (districtMatch) {
          districtName = districtMatch[1]
          detailAddress = detailAddress.substring(districtName.length).trim()
          break
        }
      }
    }
    
    const result = {
      countyName: countyName.trim(),
      districtName: districtName.trim(), 
      detailAddress: detailAddress.trim()
    }
    
    console.log('事發地點解析結果:', result)
    return result
  }, [])

  /**
   * 從縣市名稱找到對應的 County ID
   */
  const findCountyIdByName = useCallback((countyName, countiesList) => {
    if (!countyName || !countiesList || countiesList.length === 0) {
      return ''
    }

    console.log('尋找縣市 ID:', { countyName, availableCounties: countiesList.map(c => c.name) })
    
    // 直接比對名稱
    const county = countiesList.find(c => c.name === countyName)
    if (county) {
      console.log(`找到縣市: ${countyName} -> ID: ${county.id}`)
      return county.id
    }

    // 如果直接比對失敗，嘗試一些常見的變體
    const variations = [
      countyName.replace('台', '臺'), // 台 -> 臺
      countyName.replace('臺', '台'), // 臺 -> 台
    ]

    for (const variation of variations) {
      const county = countiesList.find(c => c.name === variation)
      if (county) {
        console.log(`透過變體找到縣市: ${countyName} (${variation}) -> ID: ${county.id}`)
        return county.id
      }
    }

    console.log(`找不到對應的縣市: ${countyName}`)
    return ''
  }, [])

  /**
   * 從行政區名稱找到對應的 District ID
   */
  const findDistrictIdByName = useCallback((districtName, countyId, districts) => {
    if (!districtName || !countyId || !districts || districts.length === 0) {
      return ''
    }

    console.log('尋找行政區 ID:', { districtName, countyId, availableDistricts: districts.map(d => d.name) })
    
    // 找到對應的行政區
    const district = districts.find(d => d.name === districtName)
    if (district) {
      console.log(`找到行政區: ${districtName} -> ID: ${district.id}`)
      return district.id
    }

    console.log(`找不到對應的行政區: ${districtName}`)
    return ''
  }, [])

  /**
   * 改善的 prepareEditData 函數（修正所有問題）
   */
  const prepareEditData = useCallback((caseData) => {
    console.log('=== 開始準備編輯資料 ===')
    console.log('原始案件資料:', caseData)

    try {
      // === 檢查關聯資料完整性 ===
      const voterCases = caseData.VoterCase || []
      const categories = caseData.CategoryCase || []
      const acceptance = caseData.AcceptanceCase || []
      const inCharge = caseData.InChargeCase || []

      console.log('關聯資料檢查:', {
        voterCases: voterCases.length,
        categories: categories.length,
        acceptance: acceptance.length,
        inCharge: inCharge.length
      })

      // === 安全地提取聯絡人資料和解析住家地址 ===
      let contact1Data = { name: '', phone: '' }
      let contact2Data = { name: '', phone: '' }
      let homeCountyName = ''
      let homeDistrictName = ''
      
      if (voterCases.length > 0 && voterCases[0].Voter) {
        contact1Data = {
          name: voterCases[0].Voter.name || '',
          phone: voterCases[0].Voter.phone || ''
        }
        
        // 解析住家地址
        if (voterCases[0].Voter.address) {
          const homeAddressInfo = parseVoterAddress(voterCases[0].Voter.address)
          homeCountyName = homeAddressInfo.countyName
          homeDistrictName = homeAddressInfo.districtName
          console.log('住家地址解析:', { 
            原始地址: voterCases[0].Voter.address,
            解析結果: { homeCountyName, homeDistrictName }
          })
        }
        
        console.log('✅ 找到聯絡人1:', contact1Data.name)
      } else {
        console.warn('⚠️ 聯絡人1資料缺失')
      }

      if (voterCases.length > 1 && voterCases[1].Voter) {
        contact2Data = {
          name: voterCases[1].Voter.name || '',
          phone: voterCases[1].Voter.phone || ''
        }
        console.log('✅ 找到聯絡人2:', contact2Data.name)
      }

      // === 安全地提取其他資料 ===
      // 修正：提取案件類別名稱而非 ID
      let categoryDisplayValue = ''
      if (categories.length > 0 && categories[0].Category) {
        categoryDisplayValue = categories[0].Category.name  // 使用名稱而非 ID
      }
      
      const receiverId = acceptance.length > 0 && acceptance[0].Member ? 
        acceptance[0].Member.id : ''
      
      const handlerId = inCharge.length > 0 && inCharge[0].Member ? 
        inCharge[0].Member.id : ''

      // === 提取和解析事發地點資訊 ===
      const pureDescription = CaseService.extractPureDescription(caseData.description) || ''
      const incidentLocationString = CaseService.extractIncidentLocation(caseData.description) || ''
      const incidentLocationInfo = parseIncidentLocation(incidentLocationString)

      // === 提取時間資訊（修正：優先從 description 提取） ===
      const receivedDateTime = CaseService.extractReceivedDateTime(caseData.description)
      const closedDateTime = CaseService.extractClosedDateTime(caseData.description)
      
      // 如果 description 中沒有時間，則從 start_date/end_date 提取
      let receivedDate = receivedDateTime.date
      let receivedTime = receivedDateTime.time
      let closedDate = closedDateTime.date
      let closedTime = closedDateTime.time
      
      if (!receivedDate && caseData.start_date) {
        const startDate = new Date(caseData.start_date)
        receivedDate = startDate.toISOString().split('T')[0]
        receivedTime = startDate.toTimeString().split(' ')[0].substring(0, 5)
      }
      
      if (!closedDate && caseData.end_date) {
        const endDate = new Date(caseData.end_date)
        closedDate = endDate.toISOString().split('T')[0]
        closedTime = endDate.toTimeString().split(' ')[0].substring(0, 5)
      }

      // === 提取案件編號（修正：從 description 提取） ===
      const caseNumber = CaseService.extractCaseNumber(caseData.description) || ''

      // === 構建完整的表單資料 ===
      const formData = {
        // 基本資訊
        caseNumber: caseNumber,  // 修正：顯示案件編號
        title: caseData.title || '',
        description: pureDescription,
        priority: caseData.priority || 'normal',
        contactMethod: caseData.contact_type || 'phone',
        processingStatus: caseData.status || 'pending',

        // 聯絡人資訊
        contact1Name: contact1Data.name,
        contact1Phone: contact1Data.phone,
        contact2Name: contact2Data.name,
        contact2Phone: contact2Data.phone,

        // 案件分工
        receiver: receiverId,
        handler: handlerId,
        category: categoryDisplayValue,  // 修正：使用類別名稱

        // 地點資訊（初始為空，稍後由 useEffect 處理）
        homeCounty: '',      
        homeDistrict: '',    
        incidentCounty: '',      
        incidentDistrict: '',    
        incidentLocation: incidentLocationInfo.detailAddress,

        // 時間資訊（修正：正確提取和顯示）
        receivedDate: receivedDate,
        receivedTime: receivedTime,
        closedDate: closedDate,
        closedTime: closedTime,

        // 通知設定
        notificationMethod: caseData.contact_type || 'phone',
        googleCalendarSync: false,
        sendNotification: false,

        // === 內部使用的輔助欄位（用於後續的 ID 轉換）===
        _homeCountyName: homeCountyName,
        _homeDistrictName: homeDistrictName,
        _incidentCountyName: incidentLocationInfo.countyName,
        _incidentDistrictName: incidentLocationInfo.districtName
      }

      console.log('✅ 表單資料準備完成，欄位數量:', Object.keys(formData).length)
      console.log('地址相關資訊:', {
        homeCountyName,
        homeDistrictName,
        incidentCountyName: incidentLocationInfo.countyName,
        incidentDistrictName: incidentLocationInfo.districtName,
        incidentLocation: incidentLocationInfo.detailAddress
      })
      
      console.log('時間資訊:', {
        receivedDate,
        receivedTime,
        closedDate,
        closedTime,
        caseNumber
      })
      
      return formData

    } catch (error) {
      console.error('❌ 準備編輯資料時發生錯誤:', error)
      
      // 回傳最基本的可用表單結構
      return {
        caseNumber: '',
        title: caseData?.title || '',
        description: '',
        contact1Name: '',
        contact1Phone: '',
        contact2Name: '',
        contact2Phone: '',
        priority: 'normal',
        contactMethod: 'phone',
        processingStatus: 'pending',
        receiver: '',
        handler: '',
        category: '',
        homeCounty: '',
        homeDistrict: '',
        incidentCounty: '',
        incidentDistrict: '',
        incidentLocation: '',
        receivedDate: '',
        receivedTime: '',
        closedDate: '',
        closedTime: '',
        notificationMethod: 'phone',
        googleCalendarSync: false,
        sendNotification: false,
        _homeCountyName: '',
        _homeDistrictName: '',
        _incidentCountyName: '',
        _incidentDistrictName: ''
      }
    }
  }, [parseVoterAddress, parseIncidentLocation])

  // 載入縣市資料
  useEffect(() => {
    const loadCounties = async () => {
      try {
        const countiesResult = await CaseService.getCounties()
        if (countiesResult.success) {
          setCounties(countiesResult.data || [])
        }
      } catch (error) {
        console.error('載入縣市資料失敗:', error)
      }
    }
    
    loadCounties()
  }, [])

  // 當彈窗開啟時，準備編輯資料
  useEffect(() => {
    if (isOpen && caseData) {
      setDataLoadingState('loading')
      setError('')
      
      try {
        console.log('=== CaseEditModal 準備編輯資料 ===')
        console.log('原始案件資料:', caseData)
        
        const editData = prepareEditData(caseData)
        console.log('處理後的編輯資料:', editData)
        
        // 檢查基本資料是否成功載入
        if (!editData.title && !caseData.title) {
          throw new Error('案件基本資料異常')
        }
        
        setOriginalData(editData)
        setCurrentFormData(editData)
        setDataLoadingState('success')
        setHasChanges(false)
        
      } catch (error) {
        console.error('載入編輯資料失敗:', error)
        setDataLoadingState('error')
        setError('載入編輯資料失敗，請重新開啟編輯視窗')
      }
    } else {
      setDataLoadingState('idle')
      // 重置所有狀態
      setOriginalData(null)
      setCurrentFormData(null)
      setHasChanges(false)
      setError('')
    }
  }, [isOpen, caseData, prepareEditData])

  // 當表單資料和縣市資料都準備好時，處理縣市和行政區的 ID 轉換
  useEffect(() => {
    const loadDistrictsAndSetValues = async () => {
      if (currentFormData && counties && counties.length > 0 && dataLoadingState === 'success') {
        console.log('=== 開始處理縣市和行政區的 ID 轉換 ===')
        
        let needsUpdate = false
        const updatedFormData = { ...currentFormData }
        const updatedOriginalData = { ...originalData }
        
        // === 處理住家縣市和行政區 ===
        if (currentFormData._homeCountyName && !currentFormData.homeCounty) {
          console.log('=== 處理住家縣市和行政區 ===')
          console.log('要查找的住家縣市名稱:', currentFormData._homeCountyName)
          
          const homeCountyId = findCountyIdByName(currentFormData._homeCountyName, counties)
          
          if (homeCountyId) {
            console.log('更新 homeCounty:', homeCountyId)
            updatedFormData.homeCounty = homeCountyId
            updatedOriginalData.homeCounty = homeCountyId
            needsUpdate = true
            
            // 如果也有住家行政區名稱，載入行政區列表並設定值
            if (currentFormData._homeDistrictName) {
              try {
                console.log('載入住家行政區列表...')
                const homeDistrictsResult = await CaseService.getDistricts(homeCountyId)
                
                if (homeDistrictsResult.success && homeDistrictsResult.data.length > 0) {
                  console.log('住家行政區載入成功:', homeDistrictsResult.data.length, '筆')
                  
                  // 查找對應的行政區 ID
                  const homeDistrictId = findDistrictIdByName(
                    currentFormData._homeDistrictName, 
                    homeCountyId, 
                    homeDistrictsResult.data
                  )
                  
                  if (homeDistrictId) {
                    console.log('更新 homeDistrict:', homeDistrictId)
                    updatedFormData.homeDistrict = homeDistrictId
                    updatedOriginalData.homeDistrict = homeDistrictId
                  }
                } else {
                  console.warn('住家行政區載入失敗或無資料:', homeDistrictsResult.error)
                }
              } catch (error) {
                console.warn('載入住家行政區異常:', error)
              }
            }
          }
        }
        
        // === 處理事發縣市和行政區 ===
        if (currentFormData._incidentCountyName && !currentFormData.incidentCounty) {
          console.log('=== 處理事發縣市和行政區 ===')
          console.log('要查找的事發縣市名稱:', currentFormData._incidentCountyName)
          
          const incidentCountyId = findCountyIdByName(currentFormData._incidentCountyName, counties)
          
          if (incidentCountyId) {
            console.log('更新 incidentCounty:', incidentCountyId)
            updatedFormData.incidentCounty = incidentCountyId
            updatedOriginalData.incidentCounty = incidentCountyId
            needsUpdate = true
            
            // 如果也有事發地點行政區名稱，載入行政區列表並設定值
            if (currentFormData._incidentDistrictName) {
              try {
                console.log('載入事發地點行政區列表...')
                const incidentDistrictsResult = await CaseService.getDistricts(incidentCountyId)
                
                if (incidentDistrictsResult.success && incidentDistrictsResult.data.length > 0) {
                  console.log('事發地點行政區載入成功:', incidentDistrictsResult.data.length, '筆')
                  
                  // 查找對應的行政區 ID
                  const incidentDistrictId = findDistrictIdByName(
                    currentFormData._incidentDistrictName,
                    incidentCountyId,
                    incidentDistrictsResult.data
                  )
                  
                  if (incidentDistrictId) {
                    console.log('更新 incidentDistrict:', incidentDistrictId)
                    updatedFormData.incidentDistrict = incidentDistrictId
                    updatedOriginalData.incidentDistrict = incidentDistrictId
                  }
                } else {
                  console.warn('事發地點行政區載入失敗或無資料:', incidentDistrictsResult.error)
                }
              } catch (error) {
                console.warn('載入事發地點行政區異常:', error)
              }
            }
          }
        }
        
        // 一次性更新所有變更
        if (needsUpdate) {
          console.log('更新表單資料和原始資料')
          setCurrentFormData(updatedFormData)
          setOriginalData(updatedOriginalData)
        }
        
        console.log('=== 縣市和行政區 ID 轉換完成 ===')
      }
    }
    
    loadDistrictsAndSetValues()
  }, [currentFormData, counties, originalData, dataLoadingState, findCountyIdByName, findDistrictIdByName])

  /**
   * 檢查資料是否有變更
   */
  const checkForChanges = useCallback((formData) => {
    if (!originalData || !formData) return false
    
    // 深度比較重要欄位
    const importantFields = [
      'title', 'description', 'category', 'priority', 'status', 'processingStatus',
      'contact1Name', 'contact1Phone', 'contact2Name', 'contact2Phone',
      'receivedDate', 'receivedTime', 'closedDate', 'closedTime',
      'receiver', 'assignee', 'incidentLocation', 'contactMethod'
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
  }, [originalData])

  /**
   * 表單資料變更處理
   */
  const handleFormDataChange = useCallback((formData) => {
    console.log('表單資料變更:', formData)
    setCurrentFormData(formData)
    
    const hasDataChanged = checkForChanges(formData)
    setHasChanges(hasDataChanged)
    console.log('是否有變更:', hasDataChanged)
  }, [checkForChanges])

  /**
   * 實際關閉彈窗
   */
  const closeModal = useCallback(() => {
    setShowUnsavedModal(false)
    setHasChanges(false)
    setOriginalData(null)
    setCurrentFormData(null)
    setError('')
    onClose()
  }, [onClose])

  /**
   * 改善的儲存案件修改函數
   */
  const handleSave = useCallback(async (formData) => {
    // === 第一層：系統環境檢查 ===
    if (!team?.id || !caseData?.id) {
      setError('系統錯誤，請重新載入頁面')
      return
    }

    // === 第二層：資料載入狀態檢查 ===  
    if (!originalData) {
      setError('資料尚未載入完成，請稍候再試')
      return
    }
    
    if (Object.keys(originalData).length === 0) {
      setError('資料載入異常，請關閉編輯視窗重新開啟')
      return
    }

    // === 第三層：表單內容驗證 ===
    const validation = validateFormFields(formData)
    if (!validation.valid) {
      setError(validation.message)
      return
    }

    // === 執行提交 ===
    setSaving(true)
    setError('')

    try {
      console.log('提交編輯表單:', submitData)

      const validation = CaseService.validateRequiredFields(submitData)
      if (!validation.isValid) {
        alert('表單驗證失敗：\n' + validation.errors.join('\n'))
        return
      }

      // 修正：需要確保正確的下拉選單選項傳遞，特別是行政區資料
      const extendedDropdownOptions = {
        counties,
        homeDistricts: [], // 將由後端重新查詢
        incidentDistricts: [] // 將由後端重新查詢
      }

      const result = await CaseService.updateCaseWithRelations({
        caseData: { ...formData, id: caseData.id },
        originalData,
        teamId: team.id,
        dropdownOptions: extendedDropdownOptions
      })

      console.log('更新結果:', result)

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
  }, [originalData, team?.id, caseData?.id, counties, onCaseUpdated, closeModal])

  /**
   * 關閉彈窗處理
   */
  const handleCloseModal = useCallback(() => {
    if (hasChanges) {
      // 有未儲存的變更，顯示確認彈窗
      setShowUnsavedModal(true)
    } else {
      // 沒有變更，直接關閉
      closeModal()
    }
  }, [hasChanges, closeModal])

  /**
   * 放棄修改
   */
  const handleDiscardChanges = useCallback(() => {
    console.log('使用者選擇放棄修改')
    closeModal()
  }, [closeModal])

  /**
   * 返回表單
   */
  const handleReturnToForm = useCallback(() => {
    console.log('使用者選擇返回表單')
    setShowUnsavedModal(false)
  }, [])

  if (!isOpen) return null

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

          {/* 錯誤訊息 */}
          {error && (
            <div className={`case-edit-modal-error ${getErrorSeverity(error)}`}>
              {getErrorSeverity(error) === 'critical' && '🚨 '}
              {getErrorSeverity(error) === 'warning' && '⚠️ '}
              {getErrorSeverity(error) === 'normal' && '❌ '}
              {error}
            </div>
          )}

          {/* 表單內容 */}
          <div className="case-edit-modal-content">
            {dataLoadingState === 'loading' && (
              <div className="case-edit-modal-loading">
                <div style={{ fontSize: '1.2rem', marginBottom: '8px' }}>⏳</div>
                載入中...
              </div>
            )}

            {dataLoadingState === 'error' && (
              <div className="case-edit-modal-error-state">
                <div style={{ fontSize: '1.2rem', marginBottom: '8px' }}>❌</div>
                <p>資料載入失敗</p>
                <button 
                  onClick={() => window.location.reload()} 
                  className="retry-btn"
                >
                  重新載入頁面
                </button>
              </div>
            )}

            {dataLoadingState === 'success' && currentFormData && (
              <EditableCaseForm
                team={team}
                initialData={currentFormData}
                onDataChange={handleFormDataChange}
                onSubmit={handleSave}
                onCancel={handleCloseModal}
                isSubmitting={saving}
                hasChanges={hasChanges}
                dataLoadingState={dataLoadingState}
              />
            )}
          </div>
        </div>
      </div>

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