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
      
      // 🔍 新增：詳細參數檢查
      console.log('🔍 參數詳細檢查:')
      console.log('  - groupId 類型:', typeof groupId, '值:', groupId)
      console.log('  - groupId 是否為空:', !groupId)
      console.log('  - filters 內容:', JSON.stringify(filters, null, 2))

      if (!groupId) {
        console.error('❌ 團隊 ID 為空，無法查詢')
        return {
          success: false,
          error: '團隊 ID 必填',
          data: []
        }
      }

      // 🔍 新增：先測試基本連線和基礎查詢
      console.log('🔍 步驟 1: 測試基本查詢...')
      const { data: basicTest, error: basicError, count: basicCount } = await supabase
        .from('Case')
        .select('id, title, group_id', { count: 'exact' })
        .eq('group_id', groupId)
        .limit(3)

      console.log('基本查詢結果:', {
        成功: !basicError,
        錯誤: basicError?.message,
        找到筆數: basicTest?.length || 0,
        總計筆數: basicCount,
        範例資料: basicTest?.slice(0, 2)
      })

      if (basicError) {
        console.error('❌ 基本查詢失敗:', basicError)
        return {
          success: false,
          error: `基本查詢失敗: ${basicError.message}`,
          data: []
        }
      }

      if (!basicTest || basicTest.length === 0) {
        console.warn('⚠️ 基本查詢成功但沒有找到任何案件')
        console.log('  - 請檢查 group_id 是否正確')
        console.log('  - 請檢查資料庫中是否有該團隊的案件')
        return {
          success: true,
          data: [],
          count: 0,
          page,
          limit,
          error: null
        }
      }

      console.log('✅ 基本查詢成功，開始完整查詢...')

      // 建立基礎查詢 - 修正查詢以包含 Voter.address
      console.log('🔍 步驟 2: 建立完整查詢...')
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

      console.log('查詢建立完成，group_id:', groupId)

      // 狀態篩選 - 在資料庫層級處理
      if (status !== 'all') {
        console.log('🔍 應用狀態篩選:', status)
        query = query.eq('status', status)
      }

      // 搜尋篩選 - 在資料庫層級處理
      if (searchTerm && searchTerm.trim()) {
        console.log('🔍 應用搜尋篩選:', searchTerm)
        query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
      }

      // 日期篩選 - 在資料庫層級處理（根據 created_at）
      if (filters.dateRange && filters.dateRange !== 'all') {
        console.log('🔍 處理日期篩選:', filters.dateRange)
        const dateFilter = this.buildDateFilter(filters.dateRange, filters.startDate, filters.endDate)
        console.log('日期篩選結果:', dateFilter)
        if (dateFilter.startDate && dateFilter.endDate) {
          console.log('應用日期篩選:', dateFilter)
          query = query
            .gte('created_at', dateFilter.startDate)
            .lte('created_at', dateFilter.endDate)
        }
      }

      // 排序（預設由新到舊）
      console.log('🔍 應用排序: created_at desc')
      query = query.order('created_at', { ascending: false })

      // 分頁
      if (page >= 0 && limit > 0) {
        const start = page * limit
        const end = start + limit - 1
        console.log('🔍 應用分頁:', { page, limit, start, end })
        query = query.range(start, end)
      }

      console.log('🔍 步驟 3: 執行完整查詢...')
      const queryStartTime = Date.now()
      const { data, error } = await query
      const queryDuration = Date.now() - queryStartTime

      console.log('完整查詢執行結果:', {
        成功: !error,
        執行時間: `${queryDuration}ms`,
        錯誤: error?.message,
        回傳筆數: data?.length || 0
      })

      if (error) {
        console.error('❌ 查詢案件失敗:', error)
        console.error('錯誤詳細資訊:', {
          code: error.code,
          details: error.details,
          hint: error.hint,
          message: error.message
        })
        return {
          success: false,
          error: error.message,
          data: []
        }
      }

      console.log(`✅ 查詢成功，共 ${data?.length || 0} 筆案件`)
      
      // 🔍 新增：資料結構驗證
      if (data && data.length > 0) {
        console.log('🔍 步驟 4: 驗證資料結構...')
        const firstCase = data[0]
        
        console.log('第一筆案件基本資訊:', {
          id: firstCase.id,
          title: firstCase.title,
          group_id: firstCase.group_id,
          status: firstCase.status,
          created_at: firstCase.created_at
        })
        
        console.log('關聯資料檢查:', {
          CategoryCase: Array.isArray(firstCase.CategoryCase) ? firstCase.CategoryCase.length : 'null',
          VoterCase: Array.isArray(firstCase.VoterCase) ? firstCase.VoterCase.length : 'null',
          InChargeCase: Array.isArray(firstCase.InChargeCase) ? firstCase.InChargeCase.length : 'null',
          AcceptanceCase: Array.isArray(firstCase.AcceptanceCase) ? firstCase.AcceptanceCase.length : 'null'
        })
        
        // 驗證是否成功取得 address 資料
        if (firstCase.VoterCase && firstCase.VoterCase[0] && firstCase.VoterCase[0].Voter) {
          console.log('✅ 成功取得 Voter 資料，包含 address:', {
            name: firstCase.VoterCase[0].Voter.name,
            phone: firstCase.VoterCase[0].Voter.phone,
            address: firstCase.VoterCase[0].Voter.address
          })
        } else {
          console.log('⚠️ 第一筆案件沒有 Voter 資料')
        }
      } else {
        console.log('⚠️ 查詢成功但沒有回傳任何資料')
      }
      
      console.log('🔍 步驟 5: 開始前端篩選...')
      
      // 在前端進行多重篩選（交集邏輯）
      let filteredData = data || []
      const originalCount = filteredData.length
      console.log(`開始前端篩選，原始筆數: ${originalCount}`)
      
      // 案件類型篩選
      if (filters.category && filters.category !== 'all') {
        console.log('🔍 應用案件類型篩選:', filters.category)
        const beforeFilter = filteredData.length
        filteredData = filteredData.filter(caseItem => {
          const categories = caseItem.CategoryCase || []
          
          // 檢查預設類型
          if (['traffic', 'environment', 'security', 'public_service', 'legal_consultation'].includes(filters.category)) {
            const targetCategoryName = this.getCategoryName(filters.category)
            const result = categories.some(cat => cat.Category && cat.Category.name === targetCategoryName)
            return result
          } else {
            // 檢查自定義類型
            const result = categories.some(cat => cat.Category && cat.Category.id === filters.category)
            return result
          }
        })
        console.log(`案件類型篩選: ${beforeFilter} -> ${filteredData.length} 筆案件`)
      }

      // 優先順序篩選
      if (filters.priority && filters.priority !== 'all') {
        console.log('🔍 應用優先順序篩選:', filters.priority)
        const beforeFilter = filteredData.length
        filteredData = filteredData.filter(caseItem => caseItem.priority === filters.priority)
        console.log(`優先順序篩選: ${beforeFilter} -> ${filteredData.length} 筆案件`)
      }

      // 承辦人員篩選
      if (filters.assignee && filters.assignee !== 'all') {
        console.log('🔍 應用承辦人員篩選:', filters.assignee)
        const beforeFilter = filteredData.length
        
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
        console.log(`承辦人員篩選: ${beforeFilter} -> ${filteredData.length} 筆案件`)
      }

      console.log('🔍 步驟 6: 篩選完成')
      console.log(`篩選摘要: 原始 ${originalCount} -> 最終 ${filteredData.length} 筆案件`)
      console.log(`最終篩選結果：${filteredData.length} 筆案件`)

      const finalResult = {
        success: true,
        data: filteredData,
        count: filteredData.length,
        page,
        limit,
        error: null
      }

      console.log('🔍 最終回傳結果:', {
        success: finalResult.success,
        count: finalResult.count,
        page: finalResult.page,
        limit: finalResult.limit,
        hasData: Array.isArray(finalResult.data) && finalResult.data.length > 0
      })
      
      return finalResult

    } catch (error) {
      console.error('❌ CaseService.getCases 發生錯誤:', error)
      console.error('錯誤堆疊:', error.stack)
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
  static async createCase(formData, dropdownOptions = {}) {
    try {
      console.log('=== CaseService.createCase (修復版本) ===')

      // 準備案件基本資料 - 只使用存在的欄位
      const caseData = {
        title: formData.title,
        description: formData.description, // 只保留用戶輸入的描述
        priority: formData.priority || 'normal',
        status: formData.status || 'pending', 
        contact_type: formData.contactMethod || 'phone',
        group_id: formData.teamId, // ✅ 使用 group_id
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      // ✅ 修復：使用正確的欄位對應
      if (formData.receivedDate && formData.receivedTime) {
        caseData.start_date = this.formatToTimetz(formData.receivedDate, formData.receivedTime)
      }
      
      if (formData.closedDate && formData.closedTime) {
        caseData.end_date = this.formatToTimetz(formData.closedDate, formData.closedTime)
      }

      console.log('準備建立的案件資料:', caseData)

      // 建立案件
      const { data: newCase, error: caseError } = await supabase
        .from('Case')
        .insert([caseData])
        .select()
        .single()

      if (caseError) {
        console.error('建立案件失敗:', caseError)
        return {
          success: false,
          error: caseError.message,
          data: null
        }
      }

      console.log('案件建立成功:', newCase)

      return {
        success: true,
        data: newCase,
        error: null
      }

    } catch (error) {
      console.error('createCase 發生錯誤:', error)
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
  static formatToTimetz(date, time) {
    // 保留最完整的版本，移除其他重複定義
    if (!date) return null
    
    try {
      const timeStr = time || '00:00'
      const dateTimeStr = `${date}T${timeStr}:00`
      const dateObj = new Date(dateTimeStr)
      
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

    // ✅ 修復：加上 return statement
    return description.trim()
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

  /**
   * 根據 ID 獲取單一案件的詳細資料
   * @param {string} caseId - 案件 ID
   * @param {string} teamId - 團隊 ID
   * @returns {Promise<Object>} 案件詳細資料
   */
  static async getCaseById(caseId, teamId) {
    try {
      console.log('=== CaseService.getCaseById (完全修復版本) ===')
      console.log('查詢案件 ID:', caseId, '團隊 ID:', teamId)

      if (!caseId) {
        return {
          success: false,
          error: '案件 ID 必填',
          data: null
        }
      }

      // ✅ 修復：查詢案件及其所有關聯資料，使用正確的查詢條件
      const { data: caseData, error } = await supabase
        .from('Case')
        .select(`
          *,
          CategoryCase (
            Category (
              id,
              name
            )
          ),
          VoterCase (
            Voter (
              id,
              name,
              phone,
              address
            )
          ),
          AcceptanceCase (
            Member (
              id,
              name
            )
          ),
          InChargeCase (
            Member (
              id,
              name
            )
          )
        `)
        .eq('id', caseId)
        .eq('group_id', teamId) // ✅ 使用 group_id 而不是 team_id
        .single()

      if (error) {
        console.error('查詢案件失敗:', error)
        return {
          success: false,
          error: error.message,
          data: null
        }
      }

      if (!caseData) {
        return {
          success: false,
          error: '找不到指定的案件',
          data: null
        }
      }

      console.log('查詢案件成功:', caseData)

      // 轉換為表單格式
      const formData = await this.convertCaseToFormData(caseData)

      return {
        success: true,
        data: formData,
        error: null
      }

    } catch (error) {
      console.error('CaseService.getCaseById 發生錯誤:', error)
      return {
        success: false,
        error: error.message,
        data: null
      }
    }
  }

  

  /**
   * 將資料庫案件資料轉換為表單格式
   * @param {Object} caseData - 資料庫案件資料
   * @returns {Object} 表單格式資料
   */
  static async convertCaseToFormData(caseData) {
    try {
      console.log('=== convertCaseToFormData (完全修復版本) ===')
      console.log('原始案件資料:', caseData)

      // 使用 extractPureDescription 確保只顯示純描述內容
      const pureDescription = this.extractPureDescription(caseData.description || '')

      // 從描述中提取其他資訊（但不在描述中顯示）
      const caseNumber = this.extractCaseNumber(caseData.description || '') || ''
      const incidentLocation = this.extractIncidentLocation(caseData.description || '') || ''

      // 獲取案件類別名稱
      let category = ''
      if (caseData.CategoryCase && caseData.CategoryCase.length > 0) {
        const categoryData = caseData.CategoryCase[0].Category
        if (categoryData) {
          category = categoryData.name
        }
      }

      // 獲取聯絡人資訊
      let contact1Name = '', contact1Phone = '', contact2Name = '', contact2Phone = ''
      if (caseData.VoterCase && caseData.VoterCase.length > 0) {
        const voters = caseData.VoterCase
        if (voters[0] && voters[0].Voter) {
          contact1Name = voters[0].Voter.name || ''
          contact1Phone = voters[0].Voter.phone || ''
        }
        if (voters[1] && voters[1].Voter) {
          contact2Name = voters[1].Voter.name || ''
          contact2Phone = voters[1].Voter.phone || ''
        }
      }

      // 獲取受理人員 ID
      let receiver = ''
      if (caseData.AcceptanceCase && caseData.AcceptanceCase.length > 0) {
        const acceptanceMember = caseData.AcceptanceCase[0].Member
        if (acceptanceMember) {
          receiver = acceptanceMember.id
        }
      }

      // 獲取承辦人員 ID
      let handler = ''
      if (caseData.InChargeCase && caseData.InChargeCase.length > 0) {
        const inChargeMember = caseData.InChargeCase[0].Member
        if (inChargeMember) {
          handler = inChargeMember.id
        }
      }

      // ✅ 修復：正確處理時間欄位對應
      let receivedDate = '', receivedTime = '', closedDate = '', closedTime = ''
      
      // start_date -> receivedDate/receivedTime
      if (caseData.start_date) {
        try {
          const startDateTime = new Date(caseData.start_date)
          if (!isNaN(startDateTime.getTime())) {
            receivedDate = startDateTime.toISOString().split('T')[0] // YYYY-MM-DD
            receivedTime = startDateTime.toTimeString().split(' ')[0].substring(0, 5) // HH:MM
            console.log('解析受理時間:', { 
              original: caseData.start_date, 
              date: receivedDate, 
              time: receivedTime 
            })
          }
        } catch (error) {
          console.warn('解析受理時間失敗:', error)
        }
      }
      
      // end_date -> closedDate/closedTime
      if (caseData.end_date) {
        try {
          const endDateTime = new Date(caseData.end_date)
          if (!isNaN(endDateTime.getTime())) {
            closedDate = endDateTime.toISOString().split('T')[0] // YYYY-MM-DD
            closedTime = endDateTime.toTimeString().split(' ')[0].substring(0, 5) // HH:MM
            console.log('解析結案時間:', { 
              original: caseData.end_date, 
              date: closedDate, 
              time: closedTime 
            })
          }
        } catch (error) {
          console.warn('解析結案時間失敗:', error)
        }
      }

      // 組裝表單資料 - 確保所有欄位都正確對應
      const formData = {
        id: caseData.id,
        caseNumber: caseNumber,
        title: caseData.title || '',
        description: pureDescription, // ✅ 只顯示純描述，不包含系統生成內容
        category: category,
        priority: caseData.priority || 'normal',
        status: caseData.status || 'pending',
        contactMethod: caseData.contact_type || 'phone',
        
        // ✅ 修復：使用正確的時間欄位對應
        receivedDate: receivedDate,
        receivedTime: receivedTime,
        closedDate: closedDate,
        closedTime: closedTime,
        
        // 人員資訊
        receiver: receiver,
        handler: handler,
        
        // 聯絡人資訊
        contact1Name: contact1Name,
        contact1Phone: contact1Phone,
        contact2Name: contact2Name,
        contact2Phone: contact2Phone,
        
        // 地點資訊
        incidentLocation: incidentLocation,
        
        // ❌ 移除不存在的欄位
        // processingStatus: 資料庫沒有此欄位
        // hasAttachment: 資料庫沒有此欄位
      }

      console.log('轉換後的表單資料:', formData)
      return formData

    } catch (error) {
      console.error('convertCaseToFormData 轉換失敗:', error)
      
      // 錯誤處理：返回基本的表單結構，確保不包含不存在的欄位
      return {
        id: caseData.id,
        title: caseData.title || '',
        description: this.extractPureDescription(caseData.description || ''),
        priority: caseData.priority || 'normal',
        status: caseData.status || 'pending',
        contactMethod: caseData.contact_type || 'phone',
        receivedDate: '',
        receivedTime: '',
        closedDate: '',
        closedTime: '',
        contact1Name: '',
        contact1Phone: '',
        contact2Name: '',
        contact2Phone: '',
        caseNumber: '',
        category: '',
        receiver: '',
        handler: '',
        incidentLocation: '',
      }
    }
  }

  /**
   * 根據地址查找縣市 ID
   * @param {string} address - 地址字串
   * @returns {string|null} 縣市 ID
   */
  static async findCountyByAddress(address) {
    try {
      if (!address) return null

      const { data: counties } = await supabase
        .from('County')
        .select('id, name')

      if (!counties) return null

      // 尋找地址中包含的縣市名稱
      for (const county of counties) {
        if (address.includes(county.name)) {
          return county.id
        }
      }

      return null
    } catch (error) {
      console.warn('findCountyByAddress 失敗:', error)
      return null
    }
  }

  /**
   * 根據地址和縣市查找行政區 ID
   * @param {string} address - 地址字串
   * @param {string} countyId - 縣市 ID
   * @returns {string|null} 行政區 ID
   */
  static async findDistrictByAddress(address, countyId) {
    try {
      if (!address || !countyId) return null

      const { data: districts } = await supabase
        .from('District')
        .select('id, name')
        .eq('county_id', countyId)

      if (!districts) return null

      // 尋找地址中包含的行政區名稱
      for (const district of districts) {
        if (address.includes(district.name)) {
          return district.id
        }
      }

      return null
    } catch (error) {
      console.warn('findDistrictByAddress 失敗:', error)
      return null
    }
  }

  // ==================== 輔助方法 ====================
  /**
 * 將日期和時間合併為 timestamptz 格式
 * @param {string} date - 日期字串 (YYYY-MM-DD)
 * @param {string} time - 時間字串 (HH:MM)
 * @param {string} defaultTime - 預設時間 (如果沒有提供時間)
 * @returns {string} ISO 格式的 timestamptz 字串
 */
  static combineDateTimeToTimestamptz(date, time = null, defaultTime = '00:00') {
    if (!date) return null
    
    try {
      const timeToUse = time || defaultTime
      const dateTimeString = `${date}T${timeToUse}:00`
      const dateTime = new Date(dateTimeString)
      
      if (isNaN(dateTime.getTime())) {
        console.warn('無效的日期時間格式:', { date, time })
        return null
      }
      
      return dateTime.toISOString()
    } catch (error) {
      console.error('合併日期時間失敗:', error)
      return null
    }
  }

  /**
 * 將 timestamptz 分離為日期和時間
 * @param {string} timestamptz - timestamptz 字串
 * @returns {Object} { date: string, time: string }
 */
  static parseTimestamptzToDateTime(timestamptz) {
    if (!timestamptz) {
      return { date: '', time: '' }
    }
    
    try {
      const dateTime = new Date(timestamptz)
      
      if (isNaN(dateTime.getTime())) {
        console.warn('無效的 timestamptz 格式:', timestamptz)
        return { date: '', time: '' }
      }
      
      // 轉換為本地時間
      const date = dateTime.toISOString().split('T')[0] // YYYY-MM-DD
      const time = dateTime.toTimeString().split(' ')[0].substring(0, 5) // HH:MM
      
      return { date, time }
    } catch (error) {
      console.error('解析 timestamptz 失敗:', error)
      return { date: '', time: '' }
    }
  }

/**
 * 準備案件資料用於建立或更新（處理 timestamptz 欄位）
 * @param {Object} formData - 表單資料
 * @returns {Object} 處理後的資料
 */
  static prepareCaseDataForSubmit(caseData) {
      const preparedData = { ...caseData }
      
      // 只保留用戶實際輸入的描述
      if (preparedData.description) {
        preparedData.description = this.extractPureDescription(preparedData.description)
      }
    
    // ✅ 修復：移除處理不存在欄位的邏輯
    // 不需要處理 received_date, closed_date, hasAttachment 等
    // 因為這些欄位在資料庫中不存在
    
    return preparedData
  }

  /**
   * 建立案件描述
   * @param {Object} formData - 表單資料
   * @param {Object} dropdownOptions - 下拉選單選項
   * @returns {string} 格式化的案件描述
   */
  static buildCaseDescription(formData, dropdownOptions = {}) {
    return formData.description || '' // 只返回用戶輸入的內容
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
    // 保留最完整的版本，移除其他重複定義
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
      console.log('=== CaseService.updateCaseWithRelations (完整修復版本) ===')
      console.log('更新資料:', caseData)
      console.log('原始資料:', originalData)
      console.log('團隊 ID:', teamId)

      // 基本驗證
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

      // 準備更新結果記錄
      const updateResults = []

      // 1. 更新基本案件資料
      const updateData = {
        title: caseData.title,
        description: this.extractPureDescription(caseData.description), // 只保留純描述
        priority: caseData.priority || 'normal',
        status: caseData.status || 'pending',
        contact_type: caseData.contactMethod || 'phone',
        updated_at: new Date().toISOString()
      }

      // 處理時間欄位 - 使用正確的欄位名稱
      if (caseData.receivedDate && caseData.receivedTime) {
        updateData.start_date = this.formatToTimetz(caseData.receivedDate, caseData.receivedTime)
      } else if (caseData.receivedDate) {
        updateData.start_date = this.formatToTimetz(caseData.receivedDate, '00:00')
      }
      
      if (caseData.closedDate && caseData.closedTime) {
        updateData.end_date = this.formatToTimetz(caseData.closedDate, caseData.closedTime)
      } else if (caseData.closedDate) {
        updateData.end_date = this.formatToTimetz(caseData.closedDate, '00:00')
      }

      console.log('準備更新的基本案件資料:', updateData)

      // 更新基本案件資料
      const { error: updateError } = await supabase
        .from('Case')
        .update(updateData)
        .eq('id', caseData.id)
        .eq('group_id', teamId) // 使用正確的欄位名稱

      if (updateError) {
        console.error('更新案件基本資料失敗:', updateError)
        return {
          success: false,
          error: `更新案件失敗: ${updateError.message}`,
          data: null
        }
      }

      console.log('案件基本資料更新成功')
      updateResults.push({ type: 'Case', success: true })

      // 2. 更新受理人員
      await this.updateAcceptanceMemberSafely(caseData, originalData, updateResults)

      // 3. 更新承辦人員  
      await this.updateInChargeMemberSafely(caseData, originalData, updateResults)

      // 4. 更新聯絡人資訊
      await this.updateContactsSafely(caseData, originalData, updateResults, dropdownOptions)

      // 5. 更新案件類別
      await this.updateCaseCategorySafely(caseData, originalData, updateResults)

      // 6. 更新事發地點
      await this.updateIncidentLocationSafely(caseData, originalData, updateResults)

      // 7. 更新住家里別
      await this.updateHomeDistrictSafely(caseData, originalData, updateResults, dropdownOptions)

      // 檢查所有更新結果
      const failedUpdates = updateResults.filter(result => !result.success)
      if (failedUpdates.length > 0) {
        console.warn('部分更新失敗:', failedUpdates)
        // 仍然返回成功，但記錄警告
      }

      console.log('所有更新結果:', updateResults)

      return {
        success: true,
        data: caseData,
        updateResults: updateResults,
        error: null
      }

    } catch (error) {
      console.error('updateCaseWithRelations 發生錯誤:', error)
      return {
        success: false,
        error: error.message,
        data: null
      }
    }
  }

  /**
 * 更新 VoterCase 關聯
 */
  static async updateVoterCaseRelation(caseId, voterId, contactOrder) {
    try {
      // 檢查是否已存在關聯
      const { data: existingRelation } = await supabase
        .from('VoterCase')
        .select('id')
        .eq('case_id', caseId)
        .eq('voter_id', voterId)
        .single()

      if (!existingRelation) {
        // 建立新關聯
        const { error } = await supabase
          .from('VoterCase')
          .insert([{
            case_id: caseId,
            voter_id: voterId,
            created_at: new Date().toISOString()
          }])

        if (error) {
          console.error('建立 VoterCase 關聯失敗:', error)
        } else {
          console.log(`聯絡人${contactOrder} VoterCase 關聯建立成功`)
        }
      }
    } catch (error) {
      console.error('更新 VoterCase 關聯失敗:', error)
    }
  }

  /**
   * 安全的聯絡人更新方法
   */
  static async updateContactsSafely(caseData, originalData, updateResults, dropdownOptions) {
    try {
      // 檢查聯絡人1是否有變更
      const contact1Changed = 
        caseData.contact1Name !== originalData.contact1Name || 
        caseData.contact1Phone !== originalData.contact1Phone

      if (contact1Changed) {
        console.log('聯絡人1有變更，執行更新')
        
        if (caseData.contact1Name?.trim() && caseData.contact1Phone?.trim()) {
          const contact1Result = await this.handleContact({
            name: caseData.contact1Name.trim(),
            phone: caseData.contact1Phone.trim()
          }, {
            ...dropdownOptions,
            selectedCountyId: caseData.homeCounty
          }, caseData.homeDistrict)

          if (contact1Result.success) {
            // 更新 VoterCase 關聯
            await this.updateVoterCaseRelation(caseData.id, contact1Result.data.id, 1)
            updateResults.push({ type: 'Contact1', success: true, data: contact1Result.data })
          } else {
            console.warn('聯絡人1更新失敗:', contact1Result.error)
            updateResults.push({ type: 'Contact1', success: false, error: contact1Result.error })
          }
        }
      }

      // 檢查聯絡人2是否有變更
      const contact2Changed = 
        caseData.contact2Name !== originalData.contact2Name || 
        caseData.contact2Phone !== originalData.contact2Phone

      if (contact2Changed) {
        console.log('聯絡人2有變更，執行更新')
        
        if (caseData.contact2Name?.trim() && caseData.contact2Phone?.trim()) {
          const contact2Result = await this.handleContact({
            name: caseData.contact2Name.trim(),
            phone: caseData.contact2Phone.trim()
          }, dropdownOptions, null)

          if (contact2Result.success) {
            // 更新 VoterCase 關聯
            await this.updateVoterCaseRelation(caseData.id, contact2Result.data.id, 2)
            updateResults.push({ type: 'Contact2', success: true, data: contact2Result.data })
          } else {
            console.warn('聯絡人2更新失敗:', contact2Result.error)
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
   * 安全的案件類別更新方法
   */
  static async updateCaseCategorySafely(caseData, originalData, updateResults) {
    try {
      if (caseData.category !== originalData.category) {
        console.log('案件類別有變更，執行更新:', caseData.category)
        
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
        } else {
          updateResults.push({ type: 'CategoryCase', success: true, message: '已清除類別關聯' })
        }
      }
    } catch (error) {
      console.error('更新案件類別失敗:', error)
      updateResults.push({ type: 'CategoryCase', success: false, error: error.message })
    }
  }


  /**
   * 安全的受理人員更新方法
   */
  static async updateAcceptanceMemberSafely(caseData, originalData, updateResults) {
    try {
      if (caseData.receiver !== originalData.receiver) {
        console.log('受理人員有變更，執行更新:', caseData.receiver)
        
        const now = new Date().toISOString()

        // 檢查是否已存在 AcceptanceCase 記錄
        const { data: existingAcceptance } = await supabase
          .from('AcceptanceCase')
          .select('id')
          .eq('case_id', caseData.id)
          .single()

        if (existingAcceptance) {
          // 更新現有記錄
          const { error: acceptanceError } = await supabase
            .from('AcceptanceCase')
            .update({ 
              member_id: caseData.receiver || null,
              updated_at: now
            })
            .eq('case_id', caseData.id)

          if (acceptanceError) {
            console.error('AcceptanceCase 更新失敗:', acceptanceError)
            updateResults.push({ type: 'AcceptanceCase', success: false, error: acceptanceError.message })
          } else {
            console.log('AcceptanceCase 更新成功')
            updateResults.push({ type: 'AcceptanceCase', success: true })
          }
        } else if (caseData.receiver) {
          // 建立新記錄
          const { error: acceptanceError } = await supabase
            .from('AcceptanceCase')
            .insert([{
              case_id: caseData.id,
              member_id: caseData.receiver,
              created_at: now,
              updated_at: now
            }])

          if (acceptanceError) {
            console.error('AcceptanceCase 建立失敗:', acceptanceError)
            updateResults.push({ type: 'AcceptanceCase', success: false, error: acceptanceError.message })
          } else {
            console.log('AcceptanceCase 建立成功')
            updateResults.push({ type: 'AcceptanceCase', success: true })
          }
        }
      }
    } catch (error) {
      console.error('更新受理人員失敗:', error)
      updateResults.push({ type: 'AcceptanceCase', success: false, error: error.message })
    }
  }

  /**
   * 安全的承辦人員更新方法
   */
  static async updateInChargeMemberSafely(caseData, originalData, updateResults) {
    try {
      if (caseData.handler !== originalData.handler) {
        console.log('承辦人員有變更，執行更新:', caseData.handler)
        
        const now = new Date().toISOString()

        // 檢查是否已存在 InChargeCase 記錄
        const { data: existingInCharge } = await supabase
          .from('InChargeCase')
          .select('id')
          .eq('case_id', caseData.id)
          .single()

        if (existingInCharge) {
          // 更新現有記錄
          const { error: inChargeError } = await supabase
            .from('InChargeCase')
            .update({ 
              member_id: caseData.handler || null,
              updated_at: now
            })
            .eq('case_id', caseData.id)

          if (inChargeError) {
            console.error('InChargeCase 更新失敗:', inChargeError)
            updateResults.push({ type: 'InChargeCase', success: false, error: inChargeError.message })
          } else {
            console.log('InChargeCase 更新成功')
            updateResults.push({ type: 'InChargeCase', success: true })
          }
        } else if (caseData.handler) {
          // 建立新記錄
          const { error: inChargeError } = await supabase
            .from('InChargeCase')
            .insert([{
              case_id: caseData.id,
              member_id: caseData.handler,
              created_at: now,
              updated_at: now
            }])

          if (inChargeError) {
            console.error('InChargeCase 建立失敗:', inChargeError)
            updateResults.push({ type: 'InChargeCase', success: false, error: inChargeError.message })
          } else {
            console.log('InChargeCase 建立成功')
            updateResults.push({ type: 'InChargeCase', success: true })
          }
        }
      }
    } catch (error) {
      console.error('更新承辦人員失敗:', error)
      updateResults.push({ type: 'InChargeCase', success: false, error: error.message })
    }
  }

  /**
   * 安全的事發地點更新方法
   */
  static async updateIncidentLocationSafely(caseData, originalData, updateResults) {
    try {
      if (caseData.incidentDistrict !== originalData.incidentDistrict) {
        console.log('事發地點有變更，執行更新:', caseData.incidentDistrict)
        
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
            console.error('DistrictCase 建立失敗:', districtError)
            updateResults.push({ type: 'DistrictCase', success: false, error: districtError.message })
          } else {
            console.log('DistrictCase 建立成功')
            updateResults.push({ type: 'DistrictCase', success: true })
          }
        } else {
          updateResults.push({ type: 'DistrictCase', success: true, message: '已清除地點關聯' })
        }
      }
    } catch (error) {
      console.error('更新事發地點失敗:', error)
      updateResults.push({ type: 'DistrictCase', success: false, error: error.message })
    }
  }


  /**
   * 安全的住家里別更新方法
   */
  static async updateHomeDistrictSafely(caseData, originalData, updateResults, dropdownOptions) {
    try {
      if (caseData.homeDistrict !== originalData.homeDistrict) {
        console.log('住家里別有變更，執行更新:', caseData.homeDistrict)
        
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
              console.error('VoterDistrict 建立失敗:', voterDistrictError)
              updateResults.push({ type: 'VoterDistrict', success: false, error: voterDistrictError.message })
            } else {
              console.log('VoterDistrict 建立成功')
              updateResults.push({ type: 'VoterDistrict', success: true })
            }
          } else {
            updateResults.push({ type: 'VoterDistrict', success: true, message: '已清除住家里別關聯' })
          }
        } else {
          console.warn('找不到聯絡人資料，無法更新住家里別')
          updateResults.push({ type: 'VoterDistrict', success: false, error: '找不到聯絡人資料' })
        }
      }
    } catch (error) {
      console.error('更新住家里別失敗:', error)
      updateResults.push({ type: 'VoterDistrict', success: false, error: error.message })
    }
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
        }, caseData.homeDistrict) // ✅ 修正：改為 caseData.homeDistrict

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

  /**
 * 建立或更新 VoterDistrict 關聯
 * @param {string} voterId - 聯絡人 ID
 * @param {string} districtId - 行政區 ID
 * @returns {Promise<Object>} 處理結果
 */
static async createVoterDistrictRelation(voterId, districtId) {
  try {
    console.log('=== CaseService.createVoterDistrictRelation ===')
    console.log('聯絡人 ID:', voterId, '行政區 ID:', districtId)

    if (!voterId || !districtId) {
      return {
        success: false,
        error: '聯絡人 ID 和行政區 ID 必填',
        data: null
      }
    }

    // 檢查是否已存在關聯
    const { data: existingRelation, error: searchError } = await supabase
      .from('VoterDistrict')
      .select('*')
      .eq('voter_id', voterId)
      .single()

    if (searchError && searchError.code !== 'PGRST116') {
      console.error('搜尋 VoterDistrict 關聯失敗:', searchError)
      return {
        success: false,
        error: searchError.message,
        data: null
      }
    }

    if (existingRelation) {
      // 更新現有關聯
      if (existingRelation.district_id !== districtId) {
        const { data: updatedRelation, error: updateError } = await supabase
          .from('VoterDistrict')
          .update({
            district_id: districtId,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingRelation.id)
          .select()
          .single()

        if (updateError) {
          console.error('更新 VoterDistrict 關聯失敗:', updateError)
          return {
            success: false,
            error: updateError.message,
            data: null
          }
        }

        console.log('VoterDistrict 關聯更新成功')
        return {
          success: true,
          data: updatedRelation,
          error: null
        }
      } else {
        console.log('VoterDistrict 關聯已存在且相同，無需更新')
        return {
          success: true,
          data: existingRelation,
          error: null
        }
      }
    } else {
      // 建立新關聯
      const relationData = {
        voter_id: voterId,
        district_id: districtId,
        created_at: new Date().toISOString()
      }

      const { data: newRelation, error: createError } = await supabase
        .from('VoterDistrict')
        .insert([relationData])
        .select()
        .single()

      if (createError) {
        console.error('建立 VoterDistrict 關聯失敗:', createError)
        return {
          success: false,
          error: createError.message,
          data: null
        }
      }

      console.log('VoterDistrict 關聯建立成功')
      return {
        success: true,
        data: newRelation,
        error: null
      }
    }

  } catch (error) {
    console.error('CaseService.createVoterDistrictRelation 發生錯誤:', error)
    return {
      success: false,
      error: error.message,
      data: null
    }
  }
}

/**
 * 處理聯絡人資料（修正版）
 * @param {Object} contactData - 聯絡人資料
 * @param {Object} dropdownOptions - 下拉選單選項
 * @param {string} districtId - 行政區 ID
 * @returns {Promise<Object>} 處理結果
 */
  static async handleContact(contactData, dropdownOptions = {}, districtId = null) {
    try {
      console.log('=== CaseService.handleContact ===')
      console.log('聯絡人資料:', contactData)
      console.log('行政區 ID:', districtId)

      if (!contactData.name || !contactData.phone) {
        return {
          success: false,
          error: '聯絡人姓名和電話必填',
          data: null
        }
      }

      // 檢查是否已存在相同電話的聯絡人
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

      let voter = null

      if (existingVoter) {
        console.log('找到現有聯絡人:', existingVoter)
        voter = existingVoter
        
        // 更新現有聯絡人的姓名（以防姓名有變更）
        if (existingVoter.name !== contactData.name) {
          const { data: updatedVoter, error: updateError } = await supabase
            .from('Voter')
            .update({
              name: contactData.name,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingVoter.id)
            .select()
            .single()

          if (updateError) {
            console.warn('更新聯絡人姓名失敗:', updateError)
          } else {
            voter = updatedVoter
            console.log('聯絡人姓名已更新:', updatedVoter)
          }
        }
      } else {
        // 建立新聯絡人 - 修正：移除 district_id 欄位
        const newVoterData = {
          name: contactData.name,
          phone: contactData.phone,
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
        voter = newVoter
      }

      // 處理 VoterDistrict 關聯（如果有提供 districtId）
      if (districtId && voter) {
        const voterDistrictResult = await this.createVoterDistrictRelation(voter.id, districtId)
        if (!voterDistrictResult.success) {
          console.warn('建立 VoterDistrict 關聯失敗:', voterDistrictResult.error)
          // 不要因為這個失敗就整個失敗，因為聯絡人已經建立成功
        }
      }

      return {
        success: true,
        data: voter,
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
}