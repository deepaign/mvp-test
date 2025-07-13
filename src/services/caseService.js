// src/services/caseService.js
import { supabase } from '../supabase'

export class CaseService {
  /**
   * 取得縣市列表
   * @returns {Promise<Object>} 縣市列表
   */
  static async getCounties() {
    try {
      console.log('=== CaseService.getCounties ===')

      const { data, error } = await supabase
        .from('County')
        .select('id, name')
        .order('name')

      if (error) {
        console.error('載入縣市失敗:', error)
        return {
          success: false,
          error: error.message,
          data: []
        }
      }

      console.log(`載入縣市成功，共 ${data?.length || 0} 筆`)
      return {
        success: true,
        data: data || [],
        error: null
      }

    } catch (error) {
      console.error('CaseService.getCounties 發生錯誤:', error)
      return {
        success: false,
        error: error.message,
        data: []
      }
    }
  }

  /**
   * 取得指定縣市的行政區列表
   * @param {string} countyId - 縣市 ID
   * @returns {Promise<Object>} 行政區列表
   */
  static async getDistricts(countyId) {
    try {
      console.log('=== CaseService.getDistricts ===')
      console.log('查詢縣市 ID:', countyId)

      if (!countyId) {
        return {
          success: false,
          error: '縣市 ID 必填',
          data: []
        }
      }

      const { data, error } = await supabase
        .from('District')
        .select('id, name')
        .eq('county_id', countyId)
        .order('name')

      if (error) {
        console.error('載入行政區失敗:', error)
        return {
          success: false,
          error: error.message,
          data: []
        }
      }

      console.log(`載入行政區成功，共 ${data?.length || 0} 筆`)
      return {
        success: true,
        data: data || [],
        error: null
      }

    } catch (error) {
      console.error('CaseService.getDistricts 發生錯誤:', error)
      return {
        success: false,
        error: error.message,
        data: []
      }
    }
  }

// 修正 src/services/caseService.js 中的 getCases 方法
// 在 VoterCase -> Voter 查詢中新增 address 欄位

/**
 * 取得案件列表（含分頁和篩選）- 修正版：包含 Voter.address
 * @param {Object} options - 查詢選項
 * @param {string} options.groupId - 團隊 ID
 * @param {string} options.status - 案件狀態 (all, pending, processing, completed)
 * @param {Object} options.filters - 篩選條件
 * @param {string} options.searchTerm - 搜尋關鍵字
 * @param {number} options.page - 頁碼（從 0 開始）
 * @param {number} options.limit - 每頁筆數
 * @returns {Promise<Object>} 查詢結果
 */
static async getCases(options = {}) {
  try {
    const {
      groupId,
      status = 'all',
      filters = {},
      searchTerm = '',
      page = 0,
      limit = 20
    } = options

    console.log('=== CaseService.getCases ===')
    console.log('查詢參數:', { groupId, status, filters, searchTerm, page, limit })

    if (!groupId) {
      return {
        success: false,
        error: '團隊 ID 必填',
        data: []
      }
    }

    // 建立基礎查詢 - 修正查詢以包含 Voter.address
    let query = supabase
      .from('Case')
      .select(`
        *,
        CategoryCase (
          Category (
            id,
            name
          )
        ),
        InChargeCase (
          member_id,
          Member (
            id,
            name
          )
        ),
        AcceptanceCase (
          member_id,
          Member (
            id,
            name
          )
        ),
        CaseMember (
          Member (
            id,
            name
          ),
          role
        ),
        VoterCase (
          Voter (
            id,
            name,
            phone,
            address
          )
        ),
        DistrictCase (
          District (
            id,
            name,
            County (
              id,
              name
            )
          )
        )
      `)
      .eq('group_id', groupId)

    // 狀態篩選 - 在資料庫層級處理
    if (status !== 'all') {
      query = query.eq('status', status)
    }

    // 搜尋篩選 - 在資料庫層級處理
    if (searchTerm && searchTerm.trim()) {
      query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
    }

    // 日期篩選 - 在資料庫層級處理（根據 created_at）
    if (filters.dateRange && filters.dateRange !== 'all') {
      const dateFilter = this.buildDateFilter(filters.dateRange, filters.startDate, filters.endDate)
      if (dateFilter.startDate && dateFilter.endDate) {
        console.log('應用日期篩選:', dateFilter)
        query = query
          .gte('created_at', dateFilter.startDate)
          .lte('created_at', dateFilter.endDate)
      }
    }

    // 排序（預設由新到舊）
    query = query.order('created_at', { ascending: false })

    // 分頁
    if (page >= 0 && limit > 0) {
      const start = page * limit
      const end = start + limit - 1
      query = query.range(start, end)
    }

    const { data, error } = await query

    if (error) {
      console.error('查詢案件失敗:', error)
      return {
        success: false,
        error: error.message,
        data: []
      }
    }

    console.log(`查詢成功，共 ${data?.length || 0} 筆案件`)
    
    // 驗證是否成功取得 address 資料
    if (data && data.length > 0) {
      const firstCase = data[0]
      if (firstCase.VoterCase && firstCase.VoterCase[0] && firstCase.VoterCase[0].Voter) {
        console.log('✅ 成功取得 Voter 資料，包含 address:', {
          name: firstCase.VoterCase[0].Voter.name,
          phone: firstCase.VoterCase[0].Voter.phone,
          address: firstCase.VoterCase[0].Voter.address
        })
      }
    }
    
    // 在前端進行多重篩選（交集邏輯）
    let filteredData = data || []
    
    // 案件類型篩選
    if (filters.category && filters.category !== 'all') {
      console.log('應用案件類型篩選:', filters.category)
      filteredData = filteredData.filter(caseItem => {
        const categories = caseItem.CategoryCase || []
        
        // 檢查預設類型
        if (['traffic', 'environment', 'security', 'public_service', 'legal_consultation'].includes(filters.category)) {
          const targetCategoryName = this.getCategoryName(filters.category)
          return categories.some(cat => cat.Category && cat.Category.name === targetCategoryName)
        } else {
          // 檢查自定義類型
          return categories.some(cat => cat.Category && cat.Category.id === filters.category)
        }
      })
      console.log(`案件類型篩選後，剩餘 ${filteredData.length} 筆案件`)
    }

    // 優先順序篩選
    if (filters.priority && filters.priority !== 'all') {
      console.log('應用優先順序篩選:', filters.priority)
      filteredData = filteredData.filter(caseItem => caseItem.priority === filters.priority)
      console.log(`優先順序篩選後，剩餘 ${filteredData.length} 筆案件`)
    }

    // 承辦人員篩選
    if (filters.assignee && filters.assignee !== 'all') {
      console.log('應用承辦人員篩選:', filters.assignee)
      
      if (filters.assignee === 'unassigned') {
        // 篩選尚未指派承辦人員的案件
        filteredData = filteredData.filter(caseItem => {
          const inCharge = caseItem.InChargeCase || []
          
          if (inCharge.length === 0) {
            return true // 沒有 InChargeCase 記錄
          }
          
          // 檢查是否所有記錄都沒有有效的 member_id
          const hasAssignedMember = inCharge.some(ic => ic.member_id !== null && ic.member_id !== undefined)
          return !hasAssignedMember
        })
      } else {
        // 篩選指定承辦人員的案件
        filteredData = filteredData.filter(caseItem => {
          const inCharge = caseItem.InChargeCase || []
          
          // 檢查是否有符合指定 member_id 的記錄
          return inCharge.some(ic => ic.member_id === filters.assignee)
        })
      }
      console.log(`承辦人員篩選後，剩餘 ${filteredData.length} 筆案件`)
    }

    console.log(`最終篩選結果：${filteredData.length} 筆案件`)
    
    return {
      success: true,
      data: filteredData,
      count: filteredData.length,
      page,
      limit,
      error: null
    }

  } catch (error) {
    console.error('CaseService.getCases 發生錯誤:', error)
    return {
      success: false,
      error: error.message,
      data: []
    }
  }
}

  /**
   * 取得案件類別列表
   * @param {string} teamId - 團隊 ID
   * @returns {Promise<Object>} 類別列表
   */
  static async getCategories(teamId = null) {
    try {
      console.log('=== CaseService.getCategories ===')

      // 預設類別
      const defaultCategories = [
        { id: 'traffic', name: '交通問題', isDefault: true },
        { id: 'environment', name: '環境問題', isDefault: true },
        { id: 'security', name: '治安問題', isDefault: true },
        { id: 'public_service', name: '民生服務', isDefault: true },
        { id: 'legal_consultation', name: '法律諮詢', isDefault: true }
      ]

      // 從資料庫載入自定義類別
      const { data: dbCategories, error } = await supabase
        .from('Category')
        .select('id, name, description')
        .order('name')

      if (error) {
        console.error('載入自定義類別失敗，僅使用預設類別:', error)
        return {
          success: true,
          data: defaultCategories,
          error: null
        }
      }

      // 合併預設類別和自定義類別
      const customCategories = (dbCategories || []).map(cat => ({
        ...cat,
        isDefault: false
      }))

      const filteredCustomCategories = customCategories.filter(custom => 
        !defaultCategories.some(def => def.name === custom.name)
      )

      const allCategories = [...defaultCategories, ...filteredCustomCategories]

      console.log(`載入類別成功，共 ${allCategories.length} 筆`)
      return {
        success: true,
        data: allCategories,
        error: null
      }

    } catch (error) {
      console.error('CaseService.getCategories 發生錯誤:', error)
      return {
        success: true,
        data: [
          { id: 'traffic', name: '交通問題', isDefault: true },
          { id: 'environment', name: '環境問題', isDefault: true },
          { id: 'security', name: '治安問題', isDefault: true },
          { id: 'public_service', name: '民生服務', isDefault: true },
          { id: 'legal_consultation', name: '法律諮詢', isDefault: true }
        ],
        error: error.message
      }
    }
  }

  /**
   * 取得案件列表（支援篩選和分頁）
   * @param {Object} options - 查詢選項
   * @returns {Promise<Object>} 案件列表
   */
  static async getCases(options = {}) {
    try {
      console.log('=== CaseService.getCases ===')
      const { 
        groupId, 
        page = 0, 
        limit = 50, 
        filters = {},
        searchTerm = '',
        sortConfig = { field: 'created_at', direction: 'desc' }
      } = options

      if (!groupId) {
        return {
          success: false,
          error: '團隊 ID 必填',
          data: []
        }
      }

      console.log('查詢參數:', { groupId, page, limit, filters, searchTerm, sortConfig })

      // 建立查詢
      let query = supabase
        .from('Case')
        .select(`
          *,
          CategoryCase!inner(
            Category(id, name)
          ),
          VoterCase!inner(
            Voter(id, name, phone)
          ),
          InChargeCase(
            Member(id, name)
          ),
          AcceptanceCase(
            Member(id, name)
          )
        `)
        .eq('group_id', groupId)

      // 套用篩選條件
      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status)
      }

      if (filters.priority && filters.priority !== 'all') {
        query = query.eq('priority', filters.priority)
      }

      // 套用搜尋條件
      if (searchTerm && searchTerm.trim()) {
        const searchPattern = `%${searchTerm.trim()}%`
        query = query.or(`title.ilike.${searchPattern},description.ilike.${searchPattern}`)
      }

      // 套用排序
      const sortField = sortConfig.field || 'created_at'
      const sortDirection = sortConfig.direction === 'asc'

      query = query.order(sortField, { ascending: sortDirection })

      // 套用分頁
      if (limit > 0) {
        query = query.range(page * limit, (page + 1) * limit - 1)
      }

      const { data, error, count } = await query

      if (error) {
        console.error('載入案件失敗:', error)
        return {
          success: false,
          error: error.message,
          data: []
        }
      }

      const cases = Array.isArray(data) ? data : []
      console.log(`載入案件成功，共 ${cases.length} 筆`)

      return {
        success: true,
        data: cases,
        totalCount: count || cases.length,
        error: null
      }

    } catch (error) {
      console.error('CaseService.getCases 發生錯誤:', error)
      return {
        success: false,
        error: error.message,
        data: []
      }
    }
  }

  /**
   * 取得案件統計數據
   * @param {string} groupId - 團隊 ID
   * @returns {Promise<Object>} 統計數據
   */
  static async getCaseStats(groupId) {
    try {
      console.log('=== CaseService.getCaseStats ===')

      if (!groupId) {
        return {
          success: false,
          error: '團隊 ID 必填',
          data: null
        }
      }

      const { data: statusData, error: statusError } = await supabase
        .from('Case')
        .select('status, priority')
        .eq('group_id', groupId)

      if (statusError) {
        console.error('取得統計失敗:', statusError)
        return {
          success: false,
          error: statusError.message,
          data: null
        }
      }

      const validData = Array.isArray(statusData) ? statusData : []

      const stats = {
        total: validData.length,
        byStatus: {
          pending: validData.filter(c => c.status === 'pending').length,
          processing: validData.filter(c => c.status === 'processing').length,
          completed: validData.filter(c => c.status === 'completed').length,
          resolved: validData.filter(c => c.status === 'resolved').length,
          closed: validData.filter(c => c.status === 'closed').length
        },
        byPriority: {
          urgent: validData.filter(c => c.priority === 'urgent').length,
          normal: validData.filter(c => c.priority === 'normal').length,
          low: validData.filter(c => c.priority === 'low').length
        }
      }

      console.log('案件統計:', stats)
      return {
        success: true,
        data: stats,
        error: null
      }

    } catch (error) {
      console.error('CaseService.getCaseStats 發生錯誤:', error)
      return {
        success: false,
        error: error.message,
        data: null
      }
    }
  }

  /**
   * 建立新案件
   * @param {Object} formData - 表單資料
   * @param {string} teamId - 團隊 ID
   * @param {Object} dropdownOptions - 下拉選單選項
   * @returns {Promise<Object>} 建立結果
   */
  static async createCase(formData, teamId, dropdownOptions = {}) {
    try {
      console.log('=== CaseService.createCase ===')
      console.log('表單資料:', formData)
      console.log('團隊 ID:', teamId)

      if (!teamId) {
        return {
          success: false,
          error: '團隊 ID 必填',
          data: null
        }
      }

      // 1. 處理聯絡人1（必要）
      const contact1Result = await this.handleContact({
        name: formData.contact1Name,
        phone: formData.contact1Phone
      }, {
        ...dropdownOptions,
        selectedCountyId: formData.homeCounty
      }, formData.homeDistrict)

      if (!contact1Result.success) {
        console.error('處理聯絡人1失敗:', contact1Result.error)
        return {
          success: false,
          error: `處理聯絡人1失敗: ${contact1Result.error}`,
          data: null
        }
      }

      // 2. 處理聯絡人2（可選）
      let contact2Result = null
      if (formData.contact2Name && formData.contact2Phone) {
        contact2Result = await this.handleContact({
          name: formData.contact2Name,
          phone: formData.contact2Phone
        }, dropdownOptions)

        if (!contact2Result.success) {
          console.warn('處理聯絡人2失敗:', contact2Result.error)
        }
      }

      // 3. 處理案件類型
      let categoryResult = null
      if (formData.category) {
        categoryResult = await this.handleCategory(formData.category)
        console.log('案件類型處理結果:', categoryResult)
      }

      // 4. 建立案件
      const caseData = {
        group_id: teamId,
        title: formData.title,
        description: this.buildCaseDescription(formData, dropdownOptions),
        start_date: this.formatToTimetz(formData.receivedDate, formData.receivedTime),
        end_date: formData.closedDate && formData.closedTime ? 
          this.formatToTimetz(formData.closedDate, formData.closedTime) : null,
        status: formData.processingStatus || 'pending',
        contact_type: formData.contactMethod || 'phone',
        priority: formData.priority || 'normal',
        file: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      console.log('準備建立的案件資料:', caseData)

      const { data: caseResult, error: caseError } = await supabase
        .from('Case')
        .insert([caseData])
        .select()
        .single()

      if (caseError) {
        console.error('建立案件失敗:', caseError)
        return {
          success: false,
          error: `建立案件失敗: ${caseError.message}`,
          data: null
        }
      }

      const newCase = caseResult
      console.log('案件建立成功:', newCase)

      // 5. 建立關聯資料
      const relationResults = []

      // 建立聯絡人關聯
      if (contact1Result.data) {
        const voterCaseResult = await this.createVoterCaseRelation(newCase.id, contact1Result.data.id)
        relationResults.push({ type: 'VoterCase', result: voterCaseResult })
      }

      if (contact2Result?.data) {
        const voterCase2Result = await this.createVoterCaseRelation(newCase.id, contact2Result.data.id)
        relationResults.push({ type: 'VoterCase2', result: voterCase2Result })
      }

      // 建立案件類別關聯
      if (categoryResult?.data) {
        const categoryCaseResult = await this.createCaseCategoryRelation(newCase.id, categoryResult.data.id)
        relationResults.push({ type: 'CategoryCase', result: categoryCaseResult })
      }

      // 建立受理人員關聯
      if (formData.receiver) {
        const acceptanceResult = await this.createAcceptanceCaseRelation(newCase.id, formData.receiver)
        relationResults.push({ type: 'AcceptanceCase', result: acceptanceResult })
      }

      // 建立承辦人員關聯
      if (formData.assignee) {
        const inChargeResult = await this.createInChargeCaseRelation(newCase.id, formData.assignee)
        relationResults.push({ type: 'InChargeCase', result: inChargeResult })
      }

      // 建立事發地點關聯
      if (formData.incidentCounty) {
        const districtResult = await this.createDistrictCaseRelation(
          newCase.id,
          formData.incidentCounty,
          formData.incidentDistrict
        )
        relationResults.push({ type: 'DistrictCase', result: districtResult })
      }

      console.log('關聯資料建立結果:', relationResults)

      return {
        success: true,
        data: {
          case: newCase,
          relations: relationResults
        },
        error: null
      }

    } catch (error) {
      console.error('CaseService.createCase 發生錯誤:', error)
      return {
        success: false,
        error: error.message,
        data: null
      }
    }
  }

  /**
   * 更新案件狀態
   * @param {string} caseId - 案件 ID
   * @param {string} newStatus - 新狀態
   * @param {string} groupId - 團隊 ID
   * @returns {Promise<Object>} 更新結果
   */
  static formatToTimetz(dateString, timeString) {
    if (!dateString || !timeString) return null
    
    try {
      // 組合日期和時間
      const dateTime = new Date(`${dateString}T${timeString}:00`)
      
      // 提取時間部分並轉換為 timetz 格式
      const hours = dateTime.getHours().toString().padStart(2, '0')
      const minutes = dateTime.getMinutes().toString().padStart(2, '0')
      const seconds = '00'
      
      // 返回 timetz 格式
      return `${hours}:${minutes}:${seconds}+00`
    } catch (error) {
      console.error('日期時間格式化失敗:', error)
      return '08:00:00+00' // 預設值
    }
  }

  // 在原有的 buildDescription 方法中修正事發地點記錄問題
  static buildDescription(formData, dropdownOptions = {}) {
    let description = formData.description || ''
    
    // 修正：添加案件編號（放在最前面）
    if (formData.caseNumber) {
      description = `案件編號：${formData.caseNumber}\n\n` + description
    }
    
    // 修正：添加事發地點資訊（使用行政區名稱而非 ID）
    if (formData.incidentLocation || formData.incidentCounty || formData.incidentDistrict) {
      let locationInfo = '事發地點：'
      
      // 拼接完整地點資訊
      const locationParts = []
      
      // 加入縣市名稱
      if (formData.incidentCounty) {
        const county = (dropdownOptions.counties || []).find(c => c.id === formData.incidentCounty)
        if (county) {
          locationParts.push(county.name)
        }
      }
      
      // 修正：正確加入行政區名稱
      if (formData.incidentDistrict) {
        // 需要重新查詢行政區名稱，因為 dropdownOptions 中的 incidentDistricts 可能不完整
        // 這裡我們需要在後端實作一個函數來根據 district ID 查詢名稱
        // 暫時先處理，如果找不到就跳過
        const district = (dropdownOptions.incidentDistricts || []).find(d => d.id === formData.incidentDistrict)
        if (district) {
          locationParts.push(district.name)
        } else {
          // 如果在 dropdownOptions 中找不到，我們需要查詢
          console.warn('在 dropdownOptions 中找不到行政區資料，ID:', formData.incidentDistrict)
        }
      }
      
      // 加入詳細地點
      if (formData.incidentLocation) {
        locationParts.push(formData.incidentLocation)
      }
      
      // 組合地點資訊
      if (locationParts.length > 0) {
        locationInfo += locationParts.join(' ')
        // 將事發地點放在描述的前面
        description = locationInfo + (description ? '\n\n' + description : '')
      }
    }
    
    // 添加時間資訊
    if (formData.receivedDate && formData.receivedTime) {
      description += `\n\n受理時間：${formData.receivedDate} ${formData.receivedTime}`
    }
    
    if (formData.closedDate && formData.closedTime) {
      description += `\n\n結案時間：${formData.closedDate} ${formData.closedTime}`
    }

    // 添加通知設定（如果有）
    if (formData.notificationMethod || formData.reminderDate) {
      description += '\n\n通知設定：'
      if (formData.notificationMethod) {
        description += `\n- 通知方式：${formData.notificationMethod}`
      }
      if (formData.reminderDate) {
        description += `\n- 提醒日期：${formData.reminderDate}`
      }
      if (formData.multipleReminders) {
        description += '\n- 多次提醒：是'
      }
    }

    return description.trim()
  }

  // 修正：新增根據 District ID 查詢行政區名稱的方法
  static async getDistrictNameById(districtId) {
    try {
      if (!districtId) return ''
      
      const { data, error } = await supabase
        .from('District')
        .select('name')
        .eq('id', districtId)
        .single()
      
      if (error) {
        console.error('查詢行政區名稱失敗:', error)
        return ''
      }
      
      return data?.name || ''
    } catch (error) {
      console.error('getDistrictNameById 發生錯誤:', error)
      return ''
    }
  }

  // 修正：改善 buildDescription 以正確處理行政區名稱
  static async buildDescriptionWithDistrictNames(formData, dropdownOptions = {}) {
    let description = formData.description || ''
    
    // 修正：添加案件編號（放在最前面）
    if (formData.caseNumber) {
      description = `案件編號：${formData.caseNumber}\n\n` + description
    }
    
    // 修正：添加事發地點資訊（確保使用行政區名稱）
    if (formData.incidentLocation || formData.incidentCounty || formData.incidentDistrict) {
      let locationInfo = '事發地點：'
      
      // 拼接完整地點資訊
      const locationParts = []
      
      // 加入縣市名稱
      if (formData.incidentCounty) {
        const county = (dropdownOptions.counties || []).find(c => c.id === formData.incidentCounty)
        if (county) {
          locationParts.push(county.name)
        }
      }
      
      // 修正：正確查詢並加入行政區名稱
      if (formData.incidentDistrict) {
        // 先嘗試從 dropdownOptions 中查找
        let districtName = ''
        const district = (dropdownOptions.incidentDistricts || []).find(d => d.id === formData.incidentDistrict)
        
        if (district) {
          districtName = district.name
        } else {
          // 如果在 dropdownOptions 中找不到，直接查詢資料庫
          districtName = await this.getDistrictNameById(formData.incidentDistrict)
        }
        
        if (districtName) {
          locationParts.push(districtName)
        }
      }
      
      // 加入詳細地點
      if (formData.incidentLocation) {
        locationParts.push(formData.incidentLocation)
      }
      
      // 組合地點資訊
      if (locationParts.length > 0) {
        locationInfo += locationParts.join(' ')
        // 將事發地點放在描述的前面
        description = locationInfo + (description ? '\n\n' + description : '')
      }
    }
    
    // 添加時間資訊
    if (formData.receivedDate && formData.receivedTime) {
      description += `\n\n受理時間：${formData.receivedDate} ${formData.receivedTime}`
    }
    
    if (formData.closedDate && formData.closedTime) {
      description += `\n\n結案時間：${formData.closedDate} ${formData.closedTime}`
    }

    // 添加通知設定（如果有）
    if (formData.notificationMethod || formData.reminderDate) {
      description += '\n\n通知設定：'
      if (formData.notificationMethod) {
        description += `\n- 通知方式：${formData.notificationMethod}`
      }
      if (formData.reminderDate) {
        description += `\n- 提醒日期：${formData.reminderDate}`
      }
      if (formData.multipleReminders) {
        description += '\n- 多次提醒：是'
      }
    }
  }

  /**
   * 刪除案件
   * @param {string} caseId - 案件 ID
   * @param {string} groupId - 團隊 ID
   * @returns {Promise<Object>} 刪除結果
   */
  static async deleteCase(caseId, groupId) {
    try {
      console.log('=== CaseService.deleteCase ===')
      console.log('案件 ID:', caseId)

      if (!caseId || !groupId) {
        return {
          success: false,
          error: '案件 ID 和團隊 ID 必填',
          data: null
        }
      }

      const { data, error } = await supabase
        .from('Case')
        .delete()
        .eq('id', caseId)
        .eq('group_id', groupId)
        .select()
        .single()

      if (error) {
        console.error('刪除案件失敗:', error)
        return {
          success: false,
          error: error.message,
          data: null
        }
      }

      console.log('案件刪除成功')
      return {
        success: true,
        data,
        error: null
      }

    } catch (error) {
      console.error('CaseService.deleteCase 發生錯誤:', error)
      return {
        success: false,
        error: error.message,
        data: null
      }
    }
  }

  /**
   * 批量更新案件狀態
   * @param {Array} caseIds - 案件 ID 陣列
   * @param {string} newStatus - 新狀態
   * @param {string} groupId - 團隊 ID
   * @returns {Promise<Object>} 更新結果
   */
  static async bulkUpdateCaseStatus(caseIds, newStatus, groupId) {
    try {
      console.log('=== CaseService.bulkUpdateCaseStatus ===')
      console.log('案件 ID 列表:', caseIds)
      console.log('新狀態:', newStatus)

      if (!caseIds || caseIds.length === 0 || !newStatus || !groupId) {
        return {
          success: false,
          error: '案件 ID 列表、狀態和團隊 ID 必填',
          data: null
        }
      }

      const { data, error } = await supabase
        .from('Case')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .in('id', caseIds)
        .eq('group_id', groupId)
        .select()

      if (error) {
        console.error('批量更新案件狀態失敗:', error)
        return {
          success: false,
          error: error.message,
          data: null
        }
      }

      console.log(`批量更新完成，共更新 ${data?.length || 0} 筆案件`)
      return {
        success: true,
        data: {
          updatedCount: data?.length || 0,
          cases: data
        },
        error: null
      }

    } catch (error) {
      console.error('CaseService.bulkUpdateCaseStatus 發生錯誤:', error)
      return {
        success: false,
        error: error.message,
        data: null
      }
    }
  }

  /**
   * 搜尋案件
   * @param {string} searchTerm - 搜尋關鍵字
   * @param {string} groupId - 團隊 ID
   * @param {number} limit - 結果限制
   * @returns {Promise<Object>} 搜尋結果
   */
  static async searchCases(searchTerm, groupId, limit = 20) {
    try {
      console.log('=== CaseService.searchCases ===')
      console.log('搜尋關鍵字:', searchTerm)

      if (!searchTerm || !groupId) {
        return {
          success: false,
          error: '搜尋關鍵字和團隊 ID 必填',
          data: []
        }
      }

      const searchPattern = `%${searchTerm.trim()}%`

      const { data, error } = await supabase
        .from('Case')
        .select(`
          *,
          CategoryCase(Category(name)),
          VoterCase(Voter(name, phone)),
          InChargeCase(Member(name)),
          AcceptanceCase(Member(name))
        `)
        .eq('group_id', groupId)
        .or(`title.ilike.${searchPattern},description.ilike.${searchPattern}`)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('搜尋案件失敗:', error)
        return {
          success: false,
          error: error.message,
          data: []
        }
      }

      const results = Array.isArray(data) ? data : []
      console.log(`搜尋完成，找到 ${results.length} 筆案件`)

      return {
        success: true,
        data: results,
        error: null
      }

    } catch (error) {
      console.error('CaseService.searchCases 發生錯誤:', error)
      return {
        success: false,
        error: error.message,
        data: []
      }
    }
  }

  // ==================== 關聯資料處理方法 ====================

  /**
   * 處理聯絡人資料
   * @param {Object} contactData - 聯絡人資料
   * @param {Object} dropdownOptions - 下拉選單選項
   * @param {string} districtId - 行政區 ID
   * @returns {Promise<Object>} 處理結果
   */
  static async handleContact(contactData, dropdownOptions = {}, districtId = null) {
    try {
      console.log('=== CaseService.handleContact ===')
      console.log('聯絡人資料:', contactData)

      if (!contactData.name || !contactData.phone) {
        return {
          success: false,
          error: '聯絡人姓名和電話必填',
          data: null
        }
      }

      // 檢查是否已存在
      const { data: existingVoter, error: searchError } = await supabase
        .from('Voter')
        .select('*')
        .eq('phone', contactData.phone)
        .single()

      if (searchError && searchError.code !== 'PGRST116') {
        console.error('搜尋聯絡人失敗:', searchError)
        return {
          success: false,
          error: `搜尋聯絡人失敗: ${searchError.message}`,
          data: null
        }
      }

      if (existingVoter) {
        console.log('找到現有聯絡人:', existingVoter)
        return {
          success: true,
          data: existingVoter,
          error: null
        }
      }

      // 建立新聯絡人
      const newVoterData = {
        name: contactData.name,
        phone: contactData.phone,
        district_id: districtId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data: newVoter, error: createError } = await supabase
        .from('Voter')
        .insert([newVoterData])
        .select()
        .single()

      if (createError) {
        console.error('建立聯絡人失敗:', createError)
        return {
          success: false,
          error: `建立聯絡人失敗: ${createError.message}`,
          data: null
        }
      }

      console.log('建立聯絡人成功:', newVoter)
      return {
        success: true,
        data: newVoter,
        error: null
      }

    } catch (error) {
      console.error('CaseService.handleContact 發生錯誤:', error)
      return {
        success: false,
        error: error.message,
        data: null
      }
    }
  }

  /**
   * 處理案件類別
   * @param {string} categoryName - 類別名稱
   * @returns {Promise<Object>} 處理結果
   */
  static async handleCategory(categoryName) {
    try {
      console.log('=== CaseService.handleCategory ===')
      console.log('類別名稱:', categoryName)

      if (!categoryName) {
        return {
          success: false,
          error: '類別名稱必填',
          data: null
        }
      }

      // 檢查是否已存在
      const { data: existingCategory, error: searchError } = await supabase
        .from('Category')
        .select('*')
        .eq('name', categoryName)
        .single()

      if (searchError && searchError.code !== 'PGRST116') {
        console.error('搜尋類別失敗:', searchError)
        return {
          success: false,
          error: `搜尋類別失敗: ${searchError.message}`,
          data: null
        }
      }

      if (existingCategory) {
        console.log('找到現有類別:', existingCategory)
        return {
          success: true,
          data: existingCategory,
          error: null
        }
      }

      // 建立新類別
      const newCategoryData = {
        name: categoryName,
        description: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data: newCategory, error: createError } = await supabase
        .from('Category')
        .insert([newCategoryData])
        .select()
        .single()

      if (createError) {
        console.error('建立類別失敗:', createError)
        return {
          success: false,
          error: `建立類別失敗: ${createError.message}`,
          data: null
        }
      }

      console.log('建立類別成功:', newCategory)
      return {
        success: true,
        data: newCategory,
        error: null
      }

    } catch (error) {
      console.error('CaseService.handleCategory 發生錯誤:', error)
      return {
        success: false,
        error: error.message,
        data: null
      }
    }
  }

  /**
   * 建立聯絡人案件關聯
   * @param {string} caseId - 案件 ID
   * @param {string} voterId - 聯絡人 ID
   * @returns {Promise<Object>} 建立結果
   */
  static async createVoterCaseRelation(caseId, voterId) {
    try {
      console.log('=== CaseService.createVoterCaseRelation ===')
      console.log('案件 ID:', caseId, '聯絡人 ID:', voterId)

      if (!caseId || !voterId) {
        return {
          success: false,
          error: '案件 ID 和聯絡人 ID 必填',
          data: null
        }
      }

      const relationData = {
        case_id: caseId,
        voter_id: voterId,
        created_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('VoterCase')
        .insert([relationData])
        .select()
        .single()

      if (error) {
        console.error('建立聯絡人案件關聯失敗:', error)
        return {
          success: false,
          error: error.message,
          data: null
        }
      }

      console.log('建立聯絡人案件關聯成功')
      return {
        success: true,
        data,
        error: null
      }

    } catch (error) {
      console.error('CaseService.createVoterCaseRelation 發生錯誤:', error)
      return {
        success: false,
        error: error.message,
        data: null
      }
    }
  }

  /**
   * 建立案件類別關聯
   * @param {string} caseId - 案件 ID
   * @param {string} categoryId - 類別 ID
   * @returns {Promise<Object>} 建立結果
   */
  static async createCaseCategoryRelation(caseId, categoryId) {
    try {
      console.log('=== CaseService.createCaseCategoryRelation ===')
      console.log('案件 ID:', caseId, '類別 ID:', categoryId)

      if (!caseId || !categoryId) {
        return {
          success: false,
          error: '案件 ID 和類別 ID 必填',
          data: null
        }
      }

      const relationData = {
        case_id: caseId,
        category_id: categoryId,
        created_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('CategoryCase')
        .insert([relationData])
        .select()
        .single()

      if (error) {
        console.error('建立案件類別關聯失敗:', error)
        return {
          success: false,
          error: error.message,
          data: null
        }
      }

      console.log('建立案件類別關聯成功')
      return {
        success: true,
        data,
        error: null
      }

    } catch (error) {
      console.error('CaseService.createCaseCategoryRelation 發生錯誤:', error)
      return {
        success: false,
        error: error.message,
        data: null
      }
    }
  }

  /**
   * 建立承辦人員關聯
   * @param {string} caseId - 案件 ID
   * @param {string} memberId - 成員 ID
   * @returns {Promise<Object>} 建立結果
   */
  static async createInChargeCaseRelation(caseId, memberId) {
    try {
      console.log('=== CaseService.createInChargeCaseRelation ===')
      console.log('案件 ID:', caseId, '成員 ID:', memberId)

      if (!caseId || !memberId) {
        return {
          success: false,
          error: '案件 ID 和成員 ID 必填',
          data: null
        }
      }

      const relationData = {
        case_id: caseId,
        member_id: memberId,
        created_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('InChargeCase')
        .insert([relationData])
        .select()
        .single()

      if (error) {
        console.error('建立承辦人員關聯失敗:', error)
        return {
          success: false,
          error: error.message,
          data: null
        }
      }

      console.log('建立承辦人員關聯成功')
      return {
        success: true,
        data,
        error: null
      }

    } catch (error) {
      console.error('CaseService.createInChargeCaseRelation 發生錯誤:', error)
      return {
        success: false,
        error: error.message,
        data: null
      }
    }
  }

  /**
   * 建立受理人員關聯
   * @param {string} caseId - 案件 ID
   * @param {string} memberId - 成員 ID
   * @returns {Promise<Object>} 建立結果
   */
  static async createAcceptanceCaseRelation(caseId, memberId) {
    try {
      console.log('=== CaseService.createAcceptanceCaseRelation ===')
      console.log('案件 ID:', caseId, '成員 ID:', memberId)

      if (!caseId || !memberId) {
        return {
          success: false,
          error: '案件 ID 和成員 ID 必填',
          data: null
        }
      }

      const relationData = {
        case_id: caseId,
        member_id: memberId,
        created_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('AcceptanceCase')
        .insert([relationData])
        .select()
        .single()

      if (error) {
        console.error('建立受理人員關聯失敗:', error)
        return {
          success: false,
          error: error.message,
          data: null
        }
      }

      console.log('建立受理人員關聯成功')
      return {
        success: true,
        data,
        error: null
      }

    } catch (error) {
      console.error('CaseService.createAcceptanceCaseRelation 發生錯誤:', error)
      return {
        success: false,
        error: error.message,
        data: null
      }
    }
  }

  /**
   * 建立事發地點關聯
   * @param {string} caseId - 案件 ID
   * @param {string} countyId - 縣市 ID
   * @param {string} districtId - 行政區 ID
   * @returns {Promise<Object>} 建立結果
   */
  static async createDistrictCaseRelation(caseId, countyId, districtId) {
    try {
      console.log('=== CaseService.createDistrictCaseRelation ===')
      console.log('案件 ID:', caseId, '縣市 ID:', countyId, '行政區 ID:', districtId)

      if (!caseId || !districtId) {
        return {
          success: false,
          error: '案件 ID 和行政區 ID 必填',
          data: null
        }
      }

      const relationData = {
        case_id: caseId,
        district_id: districtId,
        created_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('DistrictCase')
        .insert([relationData])
        .select()
        .single()

      if (error) {
        console.error('建立事發地點關聯失敗:', error)
        return {
          success: false,
          error: error.message,
          data: null
        }
      }

      console.log('建立事發地點關聯成功')
      return {
        success: true,
        data,
        error: null
      }

    } catch (error) {
      console.error('CaseService.createDistrictCaseRelation 發生錯誤:', error)
      return {
        success: false,
        error: error.message,
        data: null
      }
    }
  }

  // ==================== 輔助方法 ====================

  /**
   * 格式化日期時間為 PostgreSQL timestamptz 格式
   * @param {string} date - 日期字串 (YYYY-MM-DD)
   * @param {string} time - 時間字串 (HH:MM)
   * @returns {string} 格式化後的日期時間字串
   */
  static formatToTimetz(date, time) {
    if (!date) return null
    
    try {
      const timeStr = time || '00:00'
      const dateTimeStr = `${date}T${timeStr}:00`
      const dateObj = new Date(dateTimeStr)
      
      // 確保是有效日期
      if (isNaN(dateObj.getTime())) {
        console.error('無效的日期格式:', date, time)
        return null
      }
      
      return dateObj.toISOString()
    } catch (error) {
      console.error('日期格式化失敗:', error, '輸入:', date, time)
      return null
    }
  }

  /**
   * 建立案件描述
   * @param {Object} formData - 表單資料
   * @param {Object} dropdownOptions - 下拉選單選項
   * @returns {string} 格式化的案件描述
   */
  static buildCaseDescription(formData, dropdownOptions = {}) {
    const sections = []

    // 基本資訊
    sections.push('=== 案件基本資訊 ===')
    sections.push(`案件編號: ${formData.caseNumber || '自動生成'}`)
    sections.push(`案件標題: ${formData.title || ''}`)
    sections.push(`優先等級: ${this.getPriorityLabel(formData.priority)}`)
    sections.push(`聯絡方式: ${this.getContactTypeLabel(formData.contactMethod)}`)
    sections.push(`處理狀態: ${this.getStatusLabel(formData.processingStatus)}`)
    sections.push('')

    // 聯絡人資訊
    sections.push('=== 聯絡人資訊 ===')
    sections.push(`聯絡人1: ${formData.contact1Name || ''} (${formData.contact1Phone || ''})`)
    if (formData.contact2Name) {
      sections.push(`聯絡人2: ${formData.contact2Name} (${formData.contact2Phone || ''})`)
    }
    sections.push('')

    // 地址資訊
    sections.push('=== 地址資訊 ===')
    
    // 住家地址
    const homeCountyName = this.getLocationName(formData.homeCounty, dropdownOptions.counties)
    const homeDistrictName = this.getLocationName(formData.homeDistrict, dropdownOptions.homeDistricts)
    sections.push(`住家地址: ${homeCountyName}${homeDistrictName} ${formData.homeAddress || ''}`)
    
    // 事發地點
    const incidentCountyName = this.getLocationName(formData.incidentCounty, dropdownOptions.counties)
    const incidentDistrictName = this.getLocationName(formData.incidentDistrict, dropdownOptions.incidentDistricts)
    sections.push(`事發地點: ${incidentCountyName}${incidentDistrictName} ${formData.incidentLocation || ''}`)
    sections.push('')

    // 時間資訊
    sections.push('=== 時間資訊 ===')
    sections.push(`受理日期: ${formData.receivedDate || ''} ${formData.receivedTime || ''}`)
    if (formData.closedDate) {
      sections.push(`結案日期: ${formData.closedDate} ${formData.closedTime || ''}`)
    }
    sections.push('')

    // 人員資訊
    sections.push('=== 人員資訊 ===')
    const receiverName = this.getMemberName(formData.receiver, dropdownOptions.members)
    const assigneeName = this.getMemberName(formData.assignee, dropdownOptions.members)
    sections.push(`受理人員: ${receiverName}`)
    sections.push(`承辦人員: ${assigneeName}`)
    sections.push('')

    // 案件類別
    if (formData.category) {
      sections.push('=== 案件類別 ===')
      sections.push(`類別: ${formData.category}`)
      sections.push('')
    }

    // 詳細描述
    if (formData.description) {
      sections.push('=== 詳細描述 ===')
      sections.push(formData.description)
      sections.push('')
    }

    // 通知設定
    if (formData.enableNotifications) {
      sections.push('=== 通知設定 ===')
      sections.push(`啟用通知: 是`)
      if (formData.notificationMethod) {
        sections.push(`通知方式: ${this.getContactTypeLabel(formData.notificationMethod)}`)
      }
      if (formData.reminderCount) {
        sections.push(`提醒次數: ${formData.reminderCount}`)
      }
      if (formData.enableCalendarSync) {
        sections.push(`日曆同步: 是`)
      }
      sections.push('')
    }

    return sections.join('\n')
  }

  /**
   * 從選項中取得地點名稱
   * @param {string} id - 地點 ID
   * @param {Array} options - 選項陣列
   * @returns {string} 地點名稱
   */
  static getLocationName(id, options = []) {
    if (!id || !Array.isArray(options)) return ''
    const option = options.find(opt => opt.id === id)
    return option ? option.name : ''
  }

  /**
   * 從成員選項中取得成員名稱
   * @param {string} id - 成員 ID
   * @param {Array} members - 成員陣列
   * @returns {string} 成員名稱
   */
  static getMemberName(id, members = []) {
    if (!id || !Array.isArray(members)) return ''
    const member = members.find(m => m.id === id)
    return member ? member.name : ''
  }

  /**
   * 取得狀態顯示名稱
   * @param {string} status - 狀態值
   * @returns {string} 顯示名稱
   */
  static getStatusLabel(status) {
    const statusMap = {
      'pending': '待處理',
      'processing': '處理中',
      'completed': '已完成',
      'resolved': '已解決',
      'closed': '已結案'
    }
    return statusMap[status] || status || '待處理'
  }

  /**
   * 取得優先等級顯示名稱
   * @param {string} priority - 優先等級值
   * @returns {string} 顯示名稱
   */
  static getPriorityLabel(priority) {
    const priorityMap = {
      'urgent': '緊急',
      'normal': '一般',
      'low': '低'
    }
    return priorityMap[priority] || priority || '一般'
  }

  /**
   * 取得聯絡方式顯示名稱
   * @param {string} contactType - 聯絡方式值
   * @returns {string} 顯示名稱
   */
  static getContactTypeLabel(contactType) {
    const contactTypeMap = {
      'phone': '電話',
      'email': '電子郵件',
      'sms': '簡訊',
      'line': 'LINE',
      'facebook': 'Facebook',
      'in_person': '親自來訪',
      'letter': '書面陳情'
    }
    return contactTypeMap[contactType] || contactType || '電話'
  }

  /**
   * 格式化日期顯示
   * @param {string} dateString - ISO 日期字串
   * @param {boolean} includeTime - 是否包含時間
   * @returns {string} 格式化後的日期字串
   */
  static formatDate(dateString, includeTime = false) {
    if (!dateString) return '-'
    
    try {
      const date = new Date(dateString)
      
      if (includeTime) {
        return date.toLocaleString('zh-TW', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        })
      } else {
        return date.toLocaleDateString('zh-TW', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        })
      }
    } catch (error) {
      console.error('日期格式化失敗:', error)
      return dateString
    }
  }

  /**
   * 驗證案件資料
   * @param {Object} formData - 表單資料
   * @returns {Object} 驗證結果
   */
  static validateCaseData(formData) {
    const errors = []

    // 必填欄位檢查
    const requiredFields = [
      { field: 'title', label: '案件標題' },
      { field: 'contact1Name', label: '聯絡人1姓名' },
      { field: 'contact1Phone', label: '聯絡人1電話' },
      { field: 'receiver', label: '受理人員' },
      { field: 'category', label: '案件類別' },
      { field: 'receivedDate', label: '受理日期' },
      { field: 'receivedTime', label: '受理時間' }
    ]

    for (const { field, label } of requiredFields) {
      const value = formData[field]
      if (!value || !value.toString().trim()) {
        errors.push(`請填寫 ${label}`)
      }
    }

    // 電話格式檢查
    if (formData.contact1Phone) {
      const phoneRegex = /^[0-9+\-\s()]{8,15}$/
      if (!phoneRegex.test(formData.contact1Phone)) {
        errors.push('聯絡人1電話格式不正確')
      }
    }

    // 結案日期時間檢查
    if (formData.closedDate && !formData.closedTime) {
      errors.push('請設定結案時間')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * 檢查案件資料變更
   * @param {Object} newData - 新資料
   * @param {Object} originalData - 原始資料
   * @returns {boolean} 是否有變更
   */
  static checkCaseDataChanges(newData, originalData) {
    if (!originalData) return true

    const fieldsToCheck = [
      'title', 'description', 'status', 'priority', 'contact_type',
      'receivedDate', 'receivedTime', 'closedDate', 'closedTime'
    ]

    for (const field of fieldsToCheck) {
      if (newData[field] !== originalData[field]) {
        console.log(`欄位 ${field} 有變更:`, newData[field], '!=', originalData[field])
        return true
      }
    }

    return false
  }

  /**
   * 從案件描述中提取案件編號
   * @param {string} description - 案件描述
   * @returns {string} 案件編號
   */
  static extractCaseNumber(description) {
    if (!description) return ''
    
    const match = description.match(/案件編號[：:]\s*([^\n\r]+)/)
    return match ? match[1].trim() : ''
  }

  /**
   * 從案件描述中提取事發地點
   * @param {string} description - 案件描述
   * @returns {string} 事發地點
   */
  static extractIncidentLocation(description) {
    if (!description) return ''
    
    const match = description.match(/事發地點[：:]\s*([^\n\r]+)/)
    return match ? match[1].trim() : ''
  }

  // src/services/caseService.js - 改善 updateCaseWithRelations 方法
  // 簡化驗證邏輯，提高提交成功率

  /**
   * 更新案件及其所有關聯資料 - 改善版
   * @param {Object} options - 更新選項
   * @returns {Promise<Object>} 更新結果
   */
  // 修正：改善 updateCaseWithRelations 方法以解決所有問題
  static async updateCaseWithRelations({ caseData, originalData, teamId, dropdownOptions = {} }) {
    try {
      console.log('=== CaseService.updateCaseWithRelations (修正版) ===')
      console.log('更新資料:', caseData)
      console.log('原始資料:', originalData)
      console.log('團隊 ID:', teamId)

      // === 基本驗證 ===
      if (!caseData?.id) {
        return {
          success: false,
          error: '案件 ID 遺失',
          data: null
        }
      }
      
      if (!teamId) {
        return {
          success: false,
          error: '團隊資訊遺失',
          data: null
        }
      }

      // 檢查必要的表單欄位
      if (!caseData.title?.trim()) {
        return {
          success: false,
          error: '案件標題不能為空',
          data: null
        }
      }

      if (!caseData.contact1Name?.trim() || !caseData.contact1Phone?.trim()) {
        return {
          success: false,
          error: '聯絡人資訊不完整',
          data: null
        }
      }

      const updateResults = []
      const now = new Date().toISOString()

      // === 1. 檢查並更新主要案件資料 ===
      const caseNeedsUpdate = this.checkCaseDataChanges(caseData, originalData)
      if (caseNeedsUpdate) {
        console.log('案件主要資料有變更，執行更新')
        
        // 修正：使用改善的 buildDescription 方法
        const updatedDescription = await this.buildDescriptionWithDistrictNames(caseData, dropdownOptions)
        
        const updatedCaseData = {
          title: caseData.title.trim(),
          description: updatedDescription,
          start_date: this.formatToTimetz(caseData.receivedDate, caseData.receivedTime),
          end_date: caseData.closedDate && caseData.closedTime ? 
            this.formatToTimetz(caseData.closedDate, caseData.closedTime) : null,
          status: caseData.processingStatus || 'pending',
          contact_type: caseData.contactMethod || 'phone',
          priority: caseData.priority || 'normal',
          updated_at: now
        }

        console.log('更新的案件資料:', updatedCaseData)

        const { data: updatedCase, error: caseError } = await supabase
          .from('Case')
          .update(updatedCaseData)
          .eq('id', caseData.id)
          .eq('group_id', teamId)
          .select()
          .single()

        if (caseError) {
          console.error('更新案件失敗:', caseError)
          return {
            success: false,
            error: `更新案件失敗: ${caseError.message}`,
            data: null
          }
        }

        updateResults.push({ type: 'Case', success: true, data: updatedCase })
        console.log('案件主要資料更新成功')
      }

      // === 2. 處理案件類別更新 ===
      if (caseData.category !== originalData.category) {
        console.log('案件類別有變更，從', originalData.category, '改為', caseData.category)
        
        try {
          // 先刪除舊的 CategoryCase 關聯
          const { error: deleteCategoryError } = await supabase
            .from('CategoryCase')
            .delete()
            .eq('case_id', caseData.id)

          if (deleteCategoryError) {
            console.warn('刪除舊的 CategoryCase 關聯失敗:', deleteCategoryError)
          }

          // 如果有新的類別，建立新的關聯
          if (caseData.category && caseData.category.trim()) {
            // 處理案件類別（確保類別存在於 Category 表中）
            const categoryResult = await this.handleCategory(caseData.category)
            
            if (categoryResult.success) {
              // 修正：建立 CategoryCase 關聯並更新 updated_at
              const { data: newCategoryCase, error: createCategoryError } = await supabase
                .from('CategoryCase')
                .insert([{
                  case_id: caseData.id,
                  category_id: categoryResult.data.id,
                  created_at: now,
                  updated_at: now  // 修正：設定 updated_at
                }])
                .select()

              if (createCategoryError) {
                console.error('建立 CategoryCase 關聯失敗:', createCategoryError)
                updateResults.push({ type: 'CategoryCase', success: false, error: createCategoryError.message })
              } else {
                updateResults.push({ type: 'CategoryCase', success: true, data: newCategoryCase })
                console.log('CategoryCase 關聯建立成功')
              }
            } else {
              console.error('處理案件類別失敗:', categoryResult.error)
              updateResults.push({ type: 'Category', success: false, error: categoryResult.error })
            }
          }
        } catch (error) {
          console.error('處理案件類別時發生錯誤:', error)
          updateResults.push({ type: 'CategoryCase', success: false, error: error.message })
        }
      }

      // === 3. 處理聯絡人資料更新 ===
      if (this.checkContactDataChanges(caseData, originalData)) {
        console.log('聯絡人資料有變更，執行更新')
        
        try {
          // 更新聯絡人1
          const contact1Updates = {
            name: caseData.contact1Name.trim(),
            phone: caseData.contact1Phone.trim(),
            updated_at: now
          }

          // 查找聯絡人1的 ID
          const { data: voterCases, error: voterCaseError } = await supabase
            .from('VoterCase')
            .select('voter_id, Voter!inner(*)')
            .eq('case_id', caseData.id)
            .order('created_at')

          if (voterCaseError) {
            console.error('查詢 VoterCase 失敗:', voterCaseError)
          } else if (voterCases && voterCases.length > 0) {
            // 更新聯絡人1
            const contact1Id = voterCases[0].voter_id
            const { error: contact1Error } = await supabase
              .from('Voter')
              .update(contact1Updates)
              .eq('id', contact1Id)

            if (contact1Error) {
              console.error('更新聯絡人1失敗:', contact1Error)
              updateResults.push({ type: 'Contact1', success: false, error: contact1Error.message })
            } else {
              updateResults.push({ type: 'Contact1', success: true })
              console.log('聯絡人1更新成功')
            }

            // 處理聯絡人2（如果有資料）
            if (caseData.contact2Name && caseData.contact2Phone) {
              if (voterCases.length > 1) {
                // 更新現有聯絡人2
                const contact2Id = voterCases[1].voter_id
                const contact2Updates = {
                  name: caseData.contact2Name.trim(),
                  phone: caseData.contact2Phone.trim(),
                  updated_at: now
                }

                const { error: contact2Error } = await supabase
                  .from('Voter')
                  .update(contact2Updates)
                  .eq('id', contact2Id)

                if (contact2Error) {
                  console.error('更新聯絡人2失敗:', contact2Error)
                  updateResults.push({ type: 'Contact2', success: false, error: contact2Error.message })
                } else {
                  updateResults.push({ type: 'Contact2', success: true })
                  console.log('聯絡人2更新成功')
                }
              } else {
                // 建立新的聯絡人2
                const newContact2 = {
                  name: caseData.contact2Name.trim(),
                  phone: caseData.contact2Phone.trim(),
                  created_at: now,
                  updated_at: now
                }

                const { data: newVoter2, error: newContact2Error } = await supabase
                  .from('Voter')
                  .insert([newContact2])
                  .select()
                  .single()

                if (newContact2Error) {
                  console.error('建立聯絡人2失敗:', newContact2Error)
                  updateResults.push({ type: 'Contact2', success: false, error: newContact2Error.message })
                } else {
                  // 建立 VoterCase 關聯
                  const { error: voterCaseError } = await supabase
                    .from('VoterCase')
                    .insert([{
                      case_id: caseData.id,
                      voter_id: newVoter2.id,
                      created_at: now,
                      updated_at: now
                    }])

                  if (voterCaseError) {
                    console.error('建立 VoterCase 關聯失敗:', voterCaseError)
                    updateResults.push({ type: 'VoterCase2', success: false, error: voterCaseError.message })
                  } else {
                    updateResults.push({ type: 'Contact2', success: true, data: newVoter2 })
                    console.log('聯絡人2建立成功')
                  }
                }
              }
            }
          }
        } catch (error) {
          console.error('處理聯絡人資料時發生錯誤:', error)
          updateResults.push({ type: 'Contact', success: false, error: error.message })
        }
      }

      // === 4. 處理受理人員和承辦人員更新 ===
      if (caseData.receiver !== originalData.receiver) {
        console.log('受理人員有變更')
        
        try {
          // 刪除舊的受理人員關聯
          const { error: deleteReceiverError } = await supabase
            .from('AcceptanceCase')
            .delete()
            .eq('case_id', caseData.id)

          if (deleteReceiverError) {
            console.warn('刪除舊的受理人員關聯失敗:', deleteReceiverError)
          }

          // 如果有新的受理人員，建立新的關聯
          if (caseData.receiver) {
            const { data: newAcceptance, error: createReceiverError } = await supabase
              .from('AcceptanceCase')
              .insert([{
                case_id: caseData.id,
                member_id: caseData.receiver,
                created_at: now,
                updated_at: now
              }])
              .select()

            if (createReceiverError) {
              console.error('建立受理人員關聯失敗:', createReceiverError)
              updateResults.push({ type: 'AcceptanceCase', success: false, error: createReceiverError.message })
            } else {
              updateResults.push({ type: 'AcceptanceCase', success: true, data: newAcceptance })
              console.log('受理人員關聯建立成功')
            }
          }
        } catch (error) {
          console.error('處理受理人員時發生錯誤:', error)
          updateResults.push({ type: 'AcceptanceCase', success: false, error: error.message })
        }
      }

      if (caseData.handler !== originalData.handler) {
        console.log('承辦人員有變更')
        
        try {
          // 刪除舊的承辦人員關聯
          const { error: deleteHandlerError } = await supabase
            .from('InChargeCase')
            .delete()
            .eq('case_id', caseData.id)

          if (deleteHandlerError) {
            console.warn('刪除舊的承辦人員關聯失敗:', deleteHandlerError)
          }

          // 如果有新的承辦人員，建立新的關聯
          if (caseData.handler) {
            const { data: newHandler, error: createHandlerError } = await supabase
              .from('InChargeCase')
              .insert([{
                case_id: caseData.id,
                member_id: caseData.handler,
                created_at: now,
                updated_at: now
              }])
              .select()

            if (createHandlerError) {
              console.error('建立承辦人員關聯失敗:', createHandlerError)
              updateResults.push({ type: 'InChargeCase', success: false, error: createHandlerError.message })
            } else {
              updateResults.push({ type: 'InChargeCase', success: true, data: newHandler })
              console.log('承辦人員關聯建立成功')
            }
          }
        } catch (error) {
          console.error('處理承辦人員時發生錯誤:', error)
          updateResults.push({ type: 'InChargeCase', success: false, error: error.message })
        }
      }

      // === 5. 處理地點資訊更新 ===
      if (this.checkLocationDataChanges(caseData, originalData)) {
        console.log('地點資訊有變更')
        
        try {
          // 刪除舊的地點關聯
          const { error: deleteDistrictError } = await supabase
            .from('DistrictCase')
            .delete()
            .eq('case_id', caseData.id)

          if (deleteDistrictError) {
            console.warn('刪除舊的 DistrictCase 關聯失敗:', deleteDistrictError)
          }

          // 如果有新的事發地點行政區，建立新的關聯
          if (caseData.incidentDistrict) {
            const { data: newDistrictCase, error: createDistrictError } = await supabase
              .from('DistrictCase')
              .insert([{
                case_id: caseData.id,
                district_id: caseData.incidentDistrict,
                created_at: now,
                updated_at: now
              }])
              .select()

            if (createDistrictError) {
              console.error('建立 DistrictCase 關聯失敗:', createDistrictError)
              updateResults.push({ type: 'DistrictCase', success: false, error: createDistrictError.message })
            } else {
              updateResults.push({ type: 'DistrictCase', success: true, data: newDistrictCase })
              console.log('DistrictCase 關聯建立成功')
            }
          }

          // 處理住家地址更新
          if (caseData.homeCounty || caseData.homeDistrict) {
            // 查找並更新住家地址
            const { data: voterCases, error: voterCaseError } = await supabase
              .from('VoterCase')
              .select('voter_id')
              .eq('case_id', caseData.id)
              .order('created_at')

            if (!voterCaseError && voterCases && voterCases.length > 0) {
              const contact1Id = voterCases[0].voter_id
              
              // 構建新的地址字串
              let newAddress = ''
              if (caseData.homeCounty && caseData.homeDistrict) {
                const county = (dropdownOptions.counties || []).find(c => c.id === caseData.homeCounty)
                const district = await this.getDistrictNameById(caseData.homeDistrict)
                
                if (county && district) {
                  newAddress = `${county.name}${district}`
                }
              }

              if (newAddress) {
                const { error: addressError } = await supabase
                  .from('Voter')
                  .update({
                    address: newAddress,
                    updated_at: now
                  })
                  .eq('id', contact1Id)

                if (addressError) {
                  console.error('更新住家地址失敗:', addressError)
                  updateResults.push({ type: 'Address', success: false, error: addressError.message })
                } else {
                  updateResults.push({ type: 'Address', success: true })
                  console.log('住家地址更新成功:', newAddress)
                }
              }

              // 處理 VoterDistrict 關聯
              if (caseData.homeDistrict) {
                // 先刪除舊的關聯
                const { error: deleteVoterDistrictError } = await supabase
                  .from('VoterDistrict')
                  .delete()
                  .eq('voter_id', contact1Id)

                if (!deleteVoterDistrictError) {
                  // 建立新的關聯
                  const { error: createVoterDistrictError } = await supabase
                    .from('VoterDistrict')
                    .insert([{
                      voter_id: contact1Id,
                      district_id: caseData.homeDistrict,
                      created_at: now,
                      updated_at: now
                    }])

                  if (createVoterDistrictError) {
                    console.warn('建立 VoterDistrict 關聯失敗:', createVoterDistrictError)
                  } else {
                    console.log('VoterDistrict 關聯建立成功')
                  }
                }
              }
            }
          }
        } catch (error) {
          console.error('處理地點資訊時發生錯誤:', error)
          updateResults.push({ type: 'Location', success: false, error: error.message })
        }
      }

      // === 6. 查詢並回傳更新後的完整案件資料 ===
      console.log('查詢更新後的完整案件資料...')
      
      const { data: updatedCaseData, error: fetchError } = await supabase
        .from('Case')
        .select(`
          *,
          VoterCase(
            Voter(*)
          ),
          CategoryCase(
            Category(*)
          ),
          AcceptanceCase(
            Member(*)
          ),
          InChargeCase(
            Member(*)
          ),
          DistrictCase(
            District(*)
          )
        `)
        .eq('id', caseData.id)
        .single()

      if (fetchError) {
        console.error('查詢更新後的案件資料失敗:', fetchError)
        return {
          success: false,
          error: `查詢更新後的案件資料失敗: ${fetchError.message}`,
          data: null
        }
      }

      // === 7. 返回成功結果 ===
      const successCount = updateResults.filter(r => r.success).length
      const failCount = updateResults.filter(r => !r.success).length

      console.log('=== 案件更新完成 ===')
      console.log('更新結果摘要:', {
        total: updateResults.length,
        success: successCount,
        failed: failCount,
        details: updateResults
      })

      return {
        success: true,
        data: updatedCaseData,
        updateResults: {
          summary: {
            total: updateResults.length,
            success: successCount,
            failed: failCount
          },
          details: updateResults
        },
        error: null
      }

    } catch (error) {
      console.error('CaseService.exportCases 發生錯誤:', error)
      return {
        success: false,
        error: error.message,
        data: null
      }
    }
  }

  /**
   * 安全的聯絡人更新方法
   */
  static async updateContactsSafely(caseData, originalData, updateResults, dropdownOptions) {
    // 檢查聯絡人1是否有變更
    if (this.contactNeedsUpdate(caseData, originalData, 1)) {
      console.log('聯絡人1有變更，執行更新')
      
      const contact1Result = await this.handleContact({
        name: caseData.contact1Name.trim(),
        phone: caseData.contact1Phone.trim()
      }, {
        ...dropdownOptions,
        selectedCountyId: caseData.homeCounty
      }, caseData.homeDistrict)

      if (contact1Result.success) {
        updateResults.push({ type: 'Contact1', success: true, data: contact1Result.data })
      } else {
        console.warn('聯絡人1更新失敗:', contact1Result.error)
        updateResults.push({ type: 'Contact1', success: false, error: contact1Result.error })
      }
    }

    // 檢查聯絡人2是否有變更
    if (this.contactNeedsUpdate(caseData, originalData, 2)) {
      console.log('聯絡人2有變更，執行更新')
      
      if (caseData.contact2Name?.trim() && caseData.contact2Phone?.trim()) {
        const contact2Result = await this.handleContact({
          name: caseData.contact2Name.trim(),
          phone: caseData.contact2Phone.trim()
        }, dropdownOptions, null)

        if (contact2Result.success) {
          updateResults.push({ type: 'Contact2', success: true, data: contact2Result.data })
        } else {
          console.warn('聯絡人2更新失敗:', contact2Result.error)
          updateResults.push({ type: 'Contact2', success: false, error: contact2Result.error })
        }
      } else {
        console.log('聯絡人2資料為空，跳過更新（注意：暫不清理舊資料）')
      }
    }
  }

  /**
   * 安全的案件類別更新方法
   */
  static async updateCaseCategorySafely(caseData, originalData, updateResults) {
    if (caseData.category !== originalData.category) {
      console.log('案件類別有變更，執行更新')
      
      // 先刪除舊的類別關聯
      await supabase
        .from('CategoryCase')
        .delete()
        .eq('case_id', caseData.id)

      // 如果有新類別，建立新關聯
      if (caseData.category) {
        const categoryResult = await this.handleCategory(caseData.category)
        
        if (categoryResult.success) {
          await this.createCategoryCaseRelation(caseData.id, categoryResult.data.id)
          updateResults.push({ type: 'CategoryCase', success: true, data: categoryResult.data })
        } else {
          console.warn('案件類別處理失敗:', categoryResult.error)
          updateResults.push({ type: 'CategoryCase', success: false, error: categoryResult.error })
        }
      }
    }
  }

  /**
   * 安全的受理人員更新方法
   */
  static async updateAcceptanceMemberSafely(caseData, originalData, updateResults) {
    if (caseData.receiver !== originalData.receiver) {
      console.log('受理人員有變更，執行更新')
      
      const now = new Date().toISOString()

      // 更新 AcceptanceCase
      const { error: acceptanceError } = await supabase
        .from('AcceptanceCase')
        .update({ 
          member_id: caseData.receiver || null,
          updated_at: now
        })
        .eq('case_id', caseData.id)

      if (acceptanceError) {
        console.warn('AcceptanceCase 更新失敗:', acceptanceError)
        updateResults.push({ type: 'AcceptanceCase', success: false, error: acceptanceError.message })
      } else {
        updateResults.push({ type: 'AcceptanceCase', success: true })
      }

      // 同時更新 CaseMember（如果存在的話）
      const { error: caseMemberError } = await supabase
        .from('CaseMember')
        .update({ 
          member_id: caseData.receiver || null,
          updated_at: now
        })
        .eq('case_id', caseData.id)
        .eq('role', 'receiver')

      if (caseMemberError) {
        console.warn('CaseMember-Receiver 更新失敗:', caseMemberError)
        updateResults.push({ type: 'CaseMember-Receiver', success: false, error: caseMemberError.message })
      } else {
        updateResults.push({ type: 'CaseMember-Receiver', success: true })
      }
    }
  }

  /**
   * 安全的承辦人員更新方法
   */
  static async updateInChargeMemberSafely(caseData, originalData, updateResults) {
    if (caseData.handler !== originalData.handler) {
      console.log('承辦人員有變更，執行更新')
      
      const now = new Date().toISOString()

      // 更新 InChargeCase
      const { error: inChargeError } = await supabase
        .from('InChargeCase')
        .update({ 
          member_id: caseData.handler || null,
          updated_at: now
        })
        .eq('case_id', caseData.id)

      if (inChargeError) {
        console.warn('InChargeCase 更新失敗:', inChargeError)
        updateResults.push({ type: 'InChargeCase', success: false, error: inChargeError.message })
      } else {
        updateResults.push({ type: 'InChargeCase', success: true })
      }

      // 同時更新 CaseMember（如果存在的話）
      if (caseData.handler) {
        // 先刪除舊的承辦人員記錄
        await supabase
          .from('CaseMember')
          .delete()
          .eq('case_id', caseData.id)
          .eq('role', 'handler')

        // 建立新的承辦人員記錄
        const { error: caseMemberError } = await supabase
          .from('CaseMember')
          .insert([{
            case_id: caseData.id,
            member_id: caseData.handler,
            role: 'handler',
            created_at: now
          }])

        if (caseMemberError) {
          console.warn('CaseMember-Handler 更新失敗:', caseMemberError)
          updateResults.push({ type: 'CaseMember-Handler', success: false, error: caseMemberError.message })
        } else {
          updateResults.push({ type: 'CaseMember-Handler', success: true })
        }
      }
    }
  }

  /**
   * 安全的事發地點更新方法
   */
  static async updateIncidentLocationSafely(caseData, originalData, updateResults) {
    if (caseData.incidentDistrict !== originalData.incidentDistrict) {
      console.log('事發地點有變更，執行更新')
      
      // 先刪除舊的地點關聯
      await supabase
        .from('DistrictCase')
        .delete()
        .eq('case_id', caseData.id)

      // 如果有新地點，建立新關聯
      if (caseData.incidentDistrict) {
        const { error: districtError } = await supabase
          .from('DistrictCase')
          .insert([{
            case_id: caseData.id,
            district_id: caseData.incidentDistrict,
            created_at: new Date().toISOString()
          }])

        if (districtError) {
          console.warn('DistrictCase 更新失敗:', districtError)
          updateResults.push({ type: 'DistrictCase', success: false, error: districtError.message })
        } else {
          updateResults.push({ type: 'DistrictCase', success: true })
        }
      }
    }
  }

  /**
   * 安全的住家里別更新方法
   */
  static async updateHomeDistrictSafely(caseData, originalData, updateResults, dropdownOptions) {
    if (caseData.homeDistrict !== originalData.homeDistrict) {
      console.log('住家里別有變更，執行更新')
      
      // 需要先找到聯絡人1的 voter_id
      const { data: voterCases } = await supabase
        .from('VoterCase')
        .select('voter_id')
        .eq('case_id', caseData.id)
        .limit(1)

      if (voterCases && voterCases.length > 0) {
        const voterId = voterCases[0].voter_id

        // 先刪除舊的住家里別關聯
        await supabase
          .from('VoterDistrict')
          .delete()
          .eq('voter_id', voterId)

        // 如果有新的住家里別，建立新關聯
        if (caseData.homeDistrict) {
          const { error: voterDistrictError } = await supabase
            .from('VoterDistrict')
            .insert([{
              voter_id: voterId,
              district_id: caseData.homeDistrict,
              created_at: new Date().toISOString()
            }])

          if (voterDistrictError) {
            console.warn('VoterDistrict 更新失敗:', voterDistrictError)
            updateResults.push({ type: 'VoterDistrict', success: false, error: voterDistrictError.message })
          } else {
            updateResults.push({ type: 'VoterDistrict', success: true })
          }
        }
      }
    }
  }

  /**
   * 檢查案件主要資料是否有變更
   * @param {Object} newData - 新資料
   * @param {Object} originalData - 原始資料
   * @returns {boolean} 是否有變更
   */
  // 修正：新增檢查案件資料變更的輔助方法
  static checkCaseDataChanges(caseData, originalData) {
    const caseFields = ['title', 'description', 'priority', 'contactMethod', 'processingStatus', 'receivedDate', 'receivedTime', 'closedDate', 'closedTime']
    
    for (const field of caseFields) {
      const newValue = caseData[field] || ''
      const originalValue = originalData[field] || ''
      
      if (newValue !== originalValue) {
        console.log(`案件欄位 ${field} 有變更:`, { 原始: originalValue, 新值: newValue })
        return true
      }
    }
    
    return false
  }

  // 修正：新增檢查聯絡人資料變更的輔助方法
  static checkContactDataChanges(caseData, originalData) {
    const contactFields = ['contact1Name', 'contact1Phone', 'contact2Name', 'contact2Phone']
    
    for (const field of contactFields) {
      const newValue = caseData[field] || ''
      const originalValue = originalData[field] || ''
      
      if (newValue !== originalValue) {
        console.log(`聯絡人欄位 ${field} 有變更:`, { 原始: originalValue, 新值: newValue })
        return true
      }
    }
    
    return false
  }

  // 修正：新增檢查地點資料變更的輔助方法
  static checkLocationDataChanges(caseData, originalData) {
    const locationFields = ['homeCounty', 'homeDistrict', 'incidentCounty', 'incidentDistrict', 'incidentLocation']
    
    for (const field of locationFields) {
      const newValue = caseData[field] || ''
      const originalValue = originalData[field] || ''
      
      if (newValue !== originalValue) {
        console.log(`地點欄位 ${field} 有變更:`, { 原始: originalValue, 新值: newValue })
        return true
      }
    }
    
    return false
  }

  /**
   * 更新聯絡人資訊
   */
  static async updateContacts(caseData, originalData, updateResults, dropdownOptions) {
    try {
      // 檢查聯絡人1是否有變更
      if (this.contactNeedsUpdate(caseData, originalData, 1)) {
        console.log('聯絡人1有變更，執行更新')
        
        const contact1Result = await this.handleContact({
          name: caseData.contact1Name,
          phone: caseData.contact1Phone
        }, {
          ...dropdownOptions,
          selectedCountyId: caseData.homeCounty
        }, caseData.homeDistrict)

        if (contact1Result.success) {
          updateResults.push({ type: 'Contact1', success: true, data: contact1Result.data })
        } else {
          updateResults.push({ type: 'Contact1', success: false, error: contact1Result.error })
        }
      }

      // 檢查聯絡人2是否有變更
      if (this.contactNeedsUpdate(caseData, originalData, 2)) {
        console.log('聯絡人2有變更，執行更新')
        
        if (caseData.contact2Name && caseData.contact2Phone) {
          const contact2Result = await this.handleContact({
            name: caseData.contact2Name,
            phone: caseData.contact2Phone
          }, dropdownOptions, null)

          if (contact2Result.success) {
            updateResults.push({ type: 'Contact2', success: true, data: contact2Result.data })
          } else {
            updateResults.push({ type: 'Contact2', success: false, error: contact2Result.error })
          }
        }
      }

    } catch (error) {
      console.error('更新聯絡人失敗:', error)
      updateResults.push({ type: 'Contacts', success: false, error: error.message })
    }
  }

  /**
   * 檢查聯絡人是否需要更新
   */
  static contactNeedsUpdate(newData, originalData, contactNumber) {
    const nameField = `contact${contactNumber}Name`
    const phoneField = `contact${contactNumber}Phone`
    
    return newData[nameField] !== originalData[nameField] || 
           newData[phoneField] !== originalData[phoneField]
  }

  /**
   * 更新案件類別
   */
  static async updateCaseCategory(caseData, originalData, updateResults) {
    try {
      if (caseData.category !== originalData.category) {
        console.log('案件類別有變更，執行更新')
        
        // 先刪除舊的類別關聯
        await supabase
          .from('CategoryCase')
          .delete()
          .eq('case_id', caseData.id)

        // 如果有新類別，建立新關聯
        if (caseData.category) {
          const categoryResult = await this.handleCategory(caseData.category)
          
          if (categoryResult.success) {
            await this.createCategoryCaseRelation(caseData.id, categoryResult.data.id)
            updateResults.push({ type: 'CategoryCase', success: true, data: categoryResult.data })
          } else {
            updateResults.push({ type: 'CategoryCase', success: false, error: categoryResult.error })
          }
        }
      }
    } catch (error) {
      console.error('更新案件類別失敗:', error)
      updateResults.push({ type: 'CategoryCase', success: false, error: error.message })
    }
  }

  /**
   * 更新受理人員
   */
  static async updateAcceptanceMember(caseData, originalData, updateResults) {
    try {
      if (caseData.receiver !== originalData.receiver) {
        console.log('受理人員有變更，執行更新')
        
        const now = new Date().toISOString()

        // 更新 AcceptanceCase
        const { error: acceptanceError } = await supabase
          .from('AcceptanceCase')
          .update({ 
            member_id: caseData.receiver,
            updated_at: now
          })
          .eq('case_id', caseData.id)

        if (acceptanceError) {
          updateResults.push({ type: 'AcceptanceCase', success: false, error: acceptanceError.message })
        } else {
          updateResults.push({ type: 'AcceptanceCase', success: true })
        }

        // 同時更新 CaseMember
        const { error: caseMemberError } = await supabase
          .from('CaseMember')
          .update({ 
            member_id: caseData.receiver,
            updated_at: now
          })
          .eq('case_id', caseData.id)
          .eq('role', 'receiver')

        if (caseMemberError) {
          updateResults.push({ type: 'CaseMember-Receiver', success: false, error: caseMemberError.message })
        } else {
          updateResults.push({ type: 'CaseMember-Receiver', success: true })
        }
      }
    } catch (error) {
      console.error('更新受理人員失敗:', error)
      updateResults.push({ type: 'AcceptanceCase', success: false, error: error.message })
    }
  }

  /**
   * 更新承辦人員
   */
  static async updateInChargeMember(caseData, originalData, updateResults) {
    try {
      if (caseData.handler !== originalData.handler) {
        console.log('承辦人員有變更，執行更新')
        
        const now = new Date().toISOString()

        // 更新 InChargeCase
        const { error: inChargeError } = await supabase
          .from('InChargeCase')
          .update({ 
            member_id: caseData.handler || null,
            updated_at: now
          })
          .eq('case_id', caseData.id)

        if (inChargeError) {
          updateResults.push({ type: 'InChargeCase', success: false, error: inChargeError.message })
        } else {
          updateResults.push({ type: 'InChargeCase', success: true })
        }

        // 同時更新 CaseMember（如果有承辦人員）
        if (caseData.handler) {
          // 先刪除舊的承辦人員記錄
          await supabase
            .from('CaseMember')
            .delete()
            .eq('case_id', caseData.id)
            .eq('role', 'handler')

          // 建立新的承辦人員記錄
          const { error: caseMemberError } = await supabase
            .from('CaseMember')
            .insert([{
              case_id: caseData.id,
              member_id: caseData.handler,
              role: 'handler',
              created_at: now
            }])

          if (caseMemberError) {
            updateResults.push({ type: 'CaseMember-Handler', success: false, error: caseMemberError.message })
          } else {
            updateResults.push({ type: 'CaseMember-Handler', success: true })
          }
        }
      }
    } catch (error) {
      console.error('更新承辦人員失敗:', error)
      updateResults.push({ type: 'InChargeCase', success: false, error: error.message })
    }
  }

  /**
   * 更新事發地點關聯
   */
  static async updateIncidentLocation(caseData, originalData, updateResults) {
    try {
      if (caseData.incidentDistrict !== originalData.incidentDistrict) {
        console.log('事發地點有變更，執行更新')
        
        // 先刪除舊的地點關聯
        await supabase
          .from('DistrictCase')
          .delete()
          .eq('case_id', caseData.id)

        // 如果有新地點，建立新關聯
        if (caseData.incidentDistrict) {
          const { error: districtError } = await supabase
            .from('DistrictCase')
            .insert([{
              case_id: caseData.id,
              district_id: caseData.incidentDistrict,
              created_at: new Date().toISOString()
            }])

          if (districtError) {
            updateResults.push({ type: 'DistrictCase', success: false, error: districtError.message })
          } else {
            updateResults.push({ type: 'DistrictCase', success: true })
          }
        }
      }
    } catch (error) {
      console.error('更新事發地點失敗:', error)
      updateResults.push({ type: 'DistrictCase', success: false, error: error.message })
    }
  }

  /**
   * 更新住家里別關聯
   */
  static async updateHomeDistrict(caseData, originalData, updateResults, dropdownOptions) {
    try {
      if (caseData.homeDistrict !== originalData.homeDistrict) {
        console.log('住家里別有變更，執行更新')
        
        // 需要先找到聯絡人1的 voter_id
        const { data: voterCases } = await supabase
          .from('VoterCase')
          .select('voter_id')
          .eq('case_id', caseData.id)
          .limit(1)

        if (voterCases && voterCases.length > 0) {
          const voterId = voterCases[0].voter_id

          // 先刪除舊的住家里別關聯
          await supabase
            .from('VoterDistrict')
            .delete()
            .eq('voter_id', voterId)

          // 如果有新的住家里別，建立新關聯
          if (caseData.homeDistrict) {
            const { error: voterDistrictError } = await supabase
              .from('VoterDistrict')
              .insert([{
                voter_id: voterId,
                district_id: caseData.homeDistrict,
                created_at: new Date().toISOString()
              }])

            if (voterDistrictError) {
              updateResults.push({ type: 'VoterDistrict', success: false, error: voterDistrictError.message })
            } else {
              updateResults.push({ type: 'VoterDistrict', success: true })
            }
          }
        }
      }
    } catch (error) {
      console.error('更新住家里別失敗:', error)
      updateResults.push({ type: 'VoterDistrict', success: false, error: error.message })
    }
  }

  // 在 src/services/caseService.js 中新增以下方法

  /**
   * 從完整的 description 中提取純描述內容（移除系統自動生成的元數據）
   * @param {string} description - 完整的案件描述
   * @returns {string} 純描述內容
   */
  static extractPureDescription(description) {
    if (!description) return ''
  
    let pureDescription = description
  
    // 移除事發地點行
    pureDescription = pureDescription.replace(/事發地點[：:]\s*[^\n\r]+[\n\r]*/g, '')
  
    // 移除受理時間行
    pureDescription = pureDescription.replace(/受理時間[：:]\s*[^\n\r]+[\n\r]*/g, '')
  
    // 移除結案時間行
    pureDescription = pureDescription.replace(/結案時間[：:]\s*[^\n\r]+[\n\r]*/g, '')
  
    // 移除案件編號行
    pureDescription = pureDescription.replace(/案件編號[：:]\s*[^\n\r]+[\n\r]*/g, '')
  
    // 移除通知設定區塊（包含多行）
    pureDescription = pureDescription.replace(/通知設定[：:]\s*[\n\r]*(?:- [^\n\r]+[\n\r]*)+/g, '')
  
    // 清理多餘的空行（連續的換行符號）
    pureDescription = pureDescription.replace(/\n\s*\n+/g, '\n').trim()
  
    return pureDescription
  }

  /**
   * 從完整的 description 中提取受理時間
   * @param {string} description - 完整的案件描述
   * @returns {Object} 包含 date 和 time 的對象
   */
  static extractReceivedDateTime(description) {
    if (!description) return { date: '', time: '' }
  
    const match = description.match(/受理時間[：:]\s*(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})/)
    if (match) {
      return {
        date: match[1],
        time: match[2]
      }
    }
  
    return { date: '', time: '' }
  }

  /**
   * 從完整的 description 中提取結案時間
   * @param {string} description - 完整的案件描述
   * @returns {Object} 包含 date 和 time 的對象
   */
  static extractClosedDateTime(description) {
    if (!description) return { date: '', time: '' }
  
    const match = description.match(/結案時間[：:]\s*(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})/)
    if (match) {
      return {
        date: match[1],
        time: match[2]
      }
    }
  
    return { date: '', time: '' }
  }

  /**
   * 從完整的 description 中提取通知設定
   * @param {string} description - 完整的案件描述
   * @returns {Object} 通知設定對象
   */
  static extractNotificationSettings(description) {
    if (!description) return { method: '', reminderDate: '', multipleReminders: false }
  
    const result = { method: '', reminderDate: '', multipleReminders: false }
  
    // 提取通知方式
    const methodMatch = description.match(/- 通知方式[：:]\s*([^\n\r]+)/)
    if (methodMatch) {
      result.method = methodMatch[1].trim()
    }
  
    // 提取提醒日期
    const reminderMatch = description.match(/- 提醒日期[：:]\s*([^\n\r]+)/)
    if (reminderMatch) {
      result.reminderDate = reminderMatch[1].trim()
    }
  
    // 檢查多次提醒
    if (description.includes('- 多次提醒：是')) {
      result.multipleReminders = true
    }
  
    return result
  }
}