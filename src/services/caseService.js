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

  /**
   * 取得團隊成員列表
   * @param {string} groupId - 團隊 ID
   * @returns {Promise<Object>} 成員列表
   */
  static async getTeamMembers(groupId) {
    try {
      console.log('=== CaseService.getTeamMembers ===')

      if (!groupId) {
        return {
          success: false,
          error: '團隊 ID 必填',
          data: []
        }
      }

      const { data, error } = await supabase
        .from('Member')
        .select('id, name, email, role')
        .eq('group_id', groupId)
        .order('name')

      if (error) {
        console.error('載入團隊成員失敗:', error)
        return {
          success: false,
          error: error.message,
          data: []
        }
      }

      console.log(`載入團隊成員成功，共 ${data?.length || 0} 筆`)
      return {
        success: true,
        data: data || [],
        error: null
      }

    } catch (error) {
      console.error('CaseService.getTeamMembers 發生錯誤:', error)
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
  static async updateCaseStatus(caseId, newStatus, groupId) {
    try {
      console.log('=== CaseService.updateCaseStatus ===')
      console.log('案件 ID:', caseId, '新狀態:', newStatus)

      if (!caseId || !newStatus || !groupId) {
        return {
          success: false,
          error: '案件 ID、狀態和團隊 ID 必填',
          data: null
        }
      }

      const { data, error } = await supabase
        .from('Case')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', caseId)
        .eq('group_id', groupId)
        .select()
        .single()

      if (error) {
        console.error('更新案件狀態失敗:', error)
        return {
          success: false,
          error: error.message,
          data: null
        }
      }

      console.log('案件狀態更新成功')
      return {
        success: true,
        data,
        error: null
      }

    } catch (error) {
      console.error('CaseService.updateCaseStatus 發生錯誤:', error)
      return {
        success: false,
        error: error.message,
        data: null
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

  // ==================== 進階功能方法 ====================

  /**
   * 取得案件詳細資訊（包含所有關聯資料）
   * @param {string} caseId - 案件 ID
   * @param {string} groupId - 團隊 ID
   * @returns {Promise<Object>} 案件詳細資訊
   */
  static async getCaseDetail(caseId, groupId) {
    try {
      console.log('=== CaseService.getCaseDetail ===')
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
        .select(`
          *,
          CategoryCase(
            Category(id, name, description)
          ),
          VoterCase(
            Voter(id, name, phone, district_id,
              District(id, name,
                County(id, name)
              )
            )
          ),
          InChargeCase(
            Member(id, name, email, role)
          ),
          AcceptanceCase(
            Member(id, name, email, role)
          ),
          DistrictCase(
            District(id, name,
              County(id, name)
            )
          )
        `)
        .eq('id', caseId)
        .eq('group_id', groupId)
        .single()

      if (error) {
        console.error('取得案件詳細資訊失敗:', error)
        return {
          success: false,
          error: error.message,
          data: null
        }
      }

      console.log('取得案件詳細資訊成功')
      return {
        success: true,
        data,
        error: null
      }

    } catch (error) {
      console.error('CaseService.getCaseDetail 發生錯誤:', error)
      return {
        success: false,
        error: error.message,
        data: null
      }
    }
  }

  /**
   * 更新案件及其關聯資料
   * @param {Object} options - 更新選項
   * @returns {Promise<Object>} 更新結果
   */
  static async updateCaseWithRelations(options) {
    try {
      console.log('=== CaseService.updateCaseWithRelations ===')
      const { caseData, originalData, teamId, dropdownOptions = {} } = options

      if (!teamId || !caseData || !originalData || !caseData.id) {
        return {
          success: false,
          error: '團隊 ID、案件資料、原始資料和案件 ID 必填',
          data: null
        }
      }

      const updateResults = []
      const now = new Date().toISOString()

      // 檢查並更新主要案件資料
      const caseNeedsUpdate = this.checkCaseDataChanges(caseData, originalData)
      if (caseNeedsUpdate) {
        console.log('案件主要資料有變更，執行更新')
        
        const updatedCaseData = {
          title: caseData.title,
          description: this.buildCaseDescription(caseData, dropdownOptions),
          start_date: this.formatToTimetz(caseData.receivedDate, caseData.receivedTime),
          end_date: caseData.closedDate && caseData.closedTime ? 
            this.formatToTimetz(caseData.closedDate, caseData.closedTime) : null,
          status: caseData.processingStatus || 'pending',
          contact_type: caseData.contactMethod || 'phone',
          priority: caseData.priority || 'normal',
          updated_at: now
        }

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
      }

      console.log('案件更新完成，更新結果:', updateResults)
      return {
        success: true,
        data: updateResults,
        error: null
      }

    } catch (error) {
      console.error('CaseService.updateCaseWithRelations 發生錯誤:', error)
      return {
        success: false,
        error: error.message,
        data: null
      }
    }
  }

  /**
   * 匯出案件資料
   * @param {Object} options - 匯出選項
   * @returns {Promise<Object>} 匯出結果
   */
  static async exportCases(options = {}) {
    try {
      console.log('=== CaseService.exportCases ===')
      const { groupId, filters = {}, format = 'csv' } = options

      if (!groupId) {
        return {
          success: false,
          error: '團隊 ID 必填',
          data: null
        }
      }

      // 取得要匯出的案件資料
      const casesResult = await this.getCases({
        groupId,
        page: 0,
        limit: 10000, // 匯出大量資料
        filters
      })

      if (!casesResult.success) {
        return {
          success: false,
          error: `取得案件資料失敗: ${casesResult.error}`,
          data: null
        }
      }

      const cases = casesResult.data || []
      
      if (format === 'csv') {
        const csvData = this.convertToCsv(cases)
        return {
          success: true,
          data: {
            content: csvData,
            filename: `cases_export_${new Date().toISOString().slice(0, 10)}.csv`,
            type: 'text/csv'
          },
          error: null
        }
      }

      return {
        success: false,
        error: '不支援的匯出格式',
        data: null
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
   * 轉換案件資料為 CSV 格式
   * @param {Array} cases - 案件陣列
   * @returns {string} CSV 字串
   */
  static convertToCsv(cases) {
    if (!Array.isArray(cases) || cases.length === 0) {
      return '沒有案件資料可匯出'
    }

    // CSV 標題行
    const headers = [
      '案件編號', '案件標題', '狀態', '優先等級', '聯絡方式',
      '聯絡人姓名', '聯絡人電話', '案件類別',
      '受理人員', '承辦人員', '受理日期', '結案日期',
      '建立時間', '更新時間'
    ]

    // 轉換資料行
    const rows = cases.map(caseItem => {
      const voterData = caseItem.VoterCase?.[0]?.Voter || {}
      const categoryData = caseItem.CategoryCase?.[0]?.Category || {}
      const acceptanceData = caseItem.AcceptanceCase?.[0]?.Member || {}
      const inChargeData = caseItem.InChargeCase?.[0]?.Member || {}

      return [
        this.extractCaseNumber(caseItem.description) || caseItem.id,
        caseItem.title || '',
        this.getStatusLabel(caseItem.status),
        this.getPriorityLabel(caseItem.priority),
        this.getContactTypeLabel(caseItem.contact_type),
        voterData.name || '',
        voterData.phone || '',
        categoryData.name || '',
        acceptanceData.name || '',
        inChargeData.name || '',
        this.formatDate(caseItem.start_date, true),
        this.formatDate(caseItem.end_date, true),
        this.formatDate(caseItem.created_at, true),
        this.formatDate(caseItem.updated_at, true)
      ].map(field => `"${String(field).replace(/"/g, '""')}"`) // CSV 格式轉義
    })

    // 組合 CSV 內容
    const csvContent = [
      headers.map(h => `"${h}"`).join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    return csvContent
  }

  /**
   * 取得案件統計摘要
   * @param {string} groupId - 團隊 ID
   * @param {Object} dateRange - 日期範圍
   * @returns {Promise<Object>} 統計摘要
   */
  static async getCaseSummaryStats(groupId, dateRange = {}) {
    try {
      console.log('=== CaseService.getCaseSummaryStats ===')

      if (!groupId) {
        return {
          success: false,
          error: '團隊 ID 必填',
          data: null
        }
      }

      let query = supabase
        .from('Case')
        .select('status, priority, created_at, start_date, end_date')
        .eq('group_id', groupId)

      // 套用日期範圍篩選
      if (dateRange.startDate) {
        query = query.gte('created_at', dateRange.startDate)
      }
      if (dateRange.endDate) {
        query = query.lte('created_at', dateRange.endDate)
      }

      const { data, error } = await query

      if (error) {
        console.error('取得統計摘要失敗:', error)
        return {
          success: false,
          error: error.message,
          data: null
        }
      }

      const cases = Array.isArray(data) ? data : []

      // 計算各種統計
      const stats = {
        總案件數: cases.length,
        狀態統計: {
          待處理: cases.filter(c => c.status === 'pending').length,
          處理中: cases.filter(c => c.status === 'processing').length,
          已完成: cases.filter(c => c.status === 'completed').length,
          已解決: cases.filter(c => c.status === 'resolved').length,
          已結案: cases.filter(c => c.status === 'closed').length
        },
        優先等級統計: {
          緊急: cases.filter(c => c.priority === 'urgent').length,
          一般: cases.filter(c => c.priority === 'normal').length,
          低優先級: cases.filter(c => c.priority === 'low').length
        },
        時效統計: this.calculateProcessingTimeStats(cases),
        本週新增: this.getThisWeekCases(cases).length,
        本月新增: this.getThisMonthCases(cases).length
      }

      console.log('統計摘要計算完成:', stats)
      return {
        success: true,
        data: stats,
        error: null
      }

    } catch (error) {
      console.error('CaseService.getCaseSummaryStats 發生錯誤:', error)
      return {
        success: false,
        error: error.message,
        data: null
      }
    }
  }

  /**
   * 計算處理時效統計
   * @param {Array} cases - 案件陣列
   * @returns {Object} 時效統計
   */
  static calculateProcessingTimeStats(cases) {
    const completedCases = cases.filter(c => 
      c.status === 'completed' || c.status === 'resolved' || c.status === 'closed'
    )

    if (completedCases.length === 0) {
      return {
        平均處理天數: 0,
        最快處理天數: 0,
        最慢處理天數: 0,
        已完成案件數: 0
      }
    }

    const processingDays = completedCases.map(c => {
      const startDate = new Date(c.start_date)
      const endDate = new Date(c.end_date || c.updated_at)
      const diffTime = Math.abs(endDate - startDate)
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    }).filter(days => days >= 0)

    if (processingDays.length === 0) {
      return {
        平均處理天數: 0,
        最快處理天數: 0,
        最慢處理天數: 0,
        已完成案件數: completedCases.length
      }
    }

    return {
      平均處理天數: Math.round(processingDays.reduce((a, b) => a + b, 0) / processingDays.length),
      最快處理天數: Math.min(...processingDays),
      最慢處理天數: Math.max(...processingDays),
      已完成案件數: completedCases.length
    }
  }

  /**
   * 取得本週新增案件
   * @param {Array} cases - 案件陣列
   * @returns {Array} 本週案件
   */
  static getThisWeekCases(cases) {
    const now = new Date()
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay()))
    weekStart.setHours(0, 0, 0, 0)

    return cases.filter(c => {
      const createdDate = new Date(c.created_at)
      return createdDate >= weekStart
    })
  }

  /**
   * 取得本月新增案件
   * @param {Array} cases - 案件陣列
   * @returns {Array} 本月案件
   */
  static getThisMonthCases(cases) {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    monthStart.setHours(0, 0, 0, 0)

    return cases.filter(c => {
      const createdDate = new Date(c.created_at)
      return createdDate >= monthStart
    })
  }

  /**
   * 新增案件備註
   * @param {string} caseId - 案件 ID
   * @param {string} note - 備註內容
   * @param {string} memberId - 新增備註的成員 ID
   * @returns {Promise<Object>} 新增結果
   */
  static async addCaseNote(caseId, note, memberId) {
    try {
      console.log('=== CaseService.addCaseNote ===')

      if (!caseId || !note || !memberId) {
        return {
          success: false,
          error: '案件 ID、備註內容和成員 ID 必填',
          data: null
        }
      }

      const noteData = {
        case_id: caseId,
        member_id: memberId,
        content: note,
        created_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('CaseNote')
        .insert([noteData])
        .select(`
          *,
          Member(id, name)
        `)
        .single()

      if (error) {
        console.error('新增案件備註失敗:', error)
        return {
          success: false,
          error: error.message,
          data: null
        }
      }

      console.log('新增案件備註成功')
      return {
        success: true,
        data,
        error: null
      }

    } catch (error) {
      console.error('CaseService.addCaseNote 發生錯誤:', error)
      return {
        success: false,
        error: error.message,
        data: null
      }
    }
  }

  /**
   * 取得案件備註列表
   * @param {string} caseId - 案件 ID
   * @returns {Promise<Object>} 備註列表
   */
  static async getCaseNotes(caseId) {
    try {
      console.log('=== CaseService.getCaseNotes ===')

      if (!caseId) {
        return {
          success: false,
          error: '案件 ID 必填',
          data: []
        }
      }

      const { data, error } = await supabase
        .from('CaseNote')
        .select(`
          *,
          Member(id, name, email)
        `)
        .eq('case_id', caseId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('取得案件備註失敗:', error)
        return {
          success: false,
          error: error.message,
          data: []
        }
      }

      const notes = Array.isArray(data) ? data : []
      console.log(`取得案件備註成功，共 ${notes.length} 筆`)

      return {
        success: true,
        data: notes,
        error: null
      }

    } catch (error) {
      console.error('CaseService.getCaseNotes 發生錯誤:', error)
      return {
        success: false,
        error: error.message,
        data: []
      }
    }
  }

  /**
   * 複製案件
   * @param {string} caseId - 要複製的案件 ID
   * @param {string} groupId - 團隊 ID
   * @param {Object} overrides - 要覆蓋的欄位
   * @returns {Promise<Object>} 複製結果
   */
  static async duplicateCase(caseId, groupId, overrides = {}) {
    try {
      console.log('=== CaseService.duplicateCase ===')

      if (!caseId || !groupId) {
        return {
          success: false,
          error: '案件 ID 和團隊 ID 必填',
          data: null
        }
      }

      // 取得原始案件資料
      const originalResult = await this.getCaseDetail(caseId, groupId)
      if (!originalResult.success) {
        return {
          success: false,
          error: `取得原始案件失敗: ${originalResult.error}`,
          data: null
        }
      }

      const originalCase = originalResult.data
      const now = new Date().toISOString()

      // 準備新案件資料
      const newCaseData = {
        group_id: groupId,
        title: overrides.title || `${originalCase.title} (複製)`,
        description: overrides.description || originalCase.description,
        start_date: overrides.start_date || now,
        end_date: overrides.end_date || null,
        status: overrides.status || 'pending',
        contact_type: overrides.contact_type || originalCase.contact_type,
        priority: overrides.priority || originalCase.priority,
        file: null, // 不複製檔案
        created_at: now,
        updated_at: now
      }

      // 建立新案件
      const { data: newCase, error: createError } = await supabase
        .from('Case')
        .insert([newCaseData])
        .select()
        .single()

      if (createError) {
        console.error('複製案件失敗:', createError)
        return {
          success: false,
          error: `複製案件失敗: ${createError.message}`,
          data: null
        }
      }

      console.log('案件複製成功')
      return {
        success: true,
        data: newCase,
        error: null
      }

    } catch (error) {
      console.error('CaseService.duplicateCase 發生錯誤:', error)
      return {
        success: false,
        error: error.message,
        data: null
      }
    }
  }

  /**
   * 案件歸檔
   * @param {string} caseId - 案件 ID
   * @param {string} groupId - 團隊 ID
   * @returns {Promise<Object>} 歸檔結果
   */
  static async archiveCase(caseId, groupId) {
    try {
      console.log('=== CaseService.archiveCase ===')

      if (!caseId || !groupId) {
        return {
          success: false,
          error: '案件 ID 和團隊 ID 必填',
          data: null
        }
      }

      const { data, error } = await supabase
        .from('Case')
        .update({ 
          status: 'archived',
          updated_at: new Date().toISOString()
        })
        .eq('id', caseId)
        .eq('group_id', groupId)
        .select()
        .single()

      if (error) {
        console.error('案件歸檔失敗:', error)
        return {
          success: false,
          error: error.message,
          data: null
        }
      }

      console.log('案件歸檔成功')
      return {
        success: true,
        data,
        error: null
      }

    } catch (error) {
      console.error('CaseService.archiveCase 發生錯誤:', error)
      return {
        success: false,
        error: error.message,
        data: null
      }
    }
  }

  /**
   * 恢復已歸檔案件
   * @param {string} caseId - 案件 ID
   * @param {string} groupId - 團隊 ID
   * @param {string} newStatus - 新狀態
   * @returns {Promise<Object>} 恢復結果
   */
  static async restoreCase(caseId, groupId, newStatus = 'pending') {
    try {
      console.log('=== CaseService.restoreCase ===')

      if (!caseId || !groupId) {
        return {
          success: false,
          error: '案件 ID 和團隊 ID 必填',
          data: null
        }
      }

      const { data, error } = await supabase
        .from('Case')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', caseId)
        .eq('group_id', groupId)
        .eq('status', 'archived')
        .select()
        .single()

      if (error) {
        console.error('案件恢復失敗:', error)
        return {
          success: false,
          error: error.message,
          data: null
        }
      }

      console.log('案件恢復成功')
      return {
        success: true,
        data,
        error: null
      }

    } catch (error) {
      console.error('CaseService.restoreCase 發生錯誤:', error)
      return {
        success: false,
        error: error.message,
        data: null
      }
    }
  }

  /**
   * 取得案件歷史記錄
   * @param {string} caseId - 案件 ID
   * @returns {Promise<Object>} 歷史記錄
   */
  static async getCaseHistory(caseId) {
    try {
      console.log('=== CaseService.getCaseHistory ===')

      if (!caseId) {
        return {
          success: false,
          error: '案件 ID 必填',
          data: []
        }
      }

      const { data, error } = await supabase
        .from('CaseHistory')
        .select(`
          *,
          Member(id, name)
        `)
        .eq('case_id', caseId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('取得案件歷史失敗:', error)
        return {
          success: false,
          error: error.message,
          data: []
        }
      }

      const history = Array.isArray(data) ? data : []
      console.log(`取得案件歷史成功，共 ${history.length} 筆`)

      return {
        success: true,
        data: history,
        error: null
      }

    } catch (error) {
      console.error('CaseService.getCaseHistory 發生錯誤:', error)
      return {
        success: false,
        error: error.message,
        data: []
      }
    }
  }

  /**
   * 新增案件歷史記錄
   * @param {string} caseId - 案件 ID
   * @param {string} action - 動作描述
   * @param {string} memberId - 操作成員 ID
   * @param {Object} changes - 變更內容
   * @returns {Promise<Object>} 新增結果
   */
  static async addCaseHistory(caseId, action, memberId, changes = {}) {
    try {
      console.log('=== CaseService.addCaseHistory ===')

      if (!caseId || !action || !memberId) {
        return {
          success: false,
          error: '案件 ID、動作和成員 ID 必填',
          data: null
        }
      }

      const historyData = {
        case_id: caseId,
        member_id: memberId,
        action,
        changes: JSON.stringify(changes),
        created_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('CaseHistory')
        .insert([historyData])
        .select(`
          *,
          Member(id, name)
        `)
        .single()

      if (error) {
        console.error('新增案件歷史失敗:', error)
        return {
          success: false,
          error: error.message,
          data: null
        }
      }

      console.log('新增案件歷史成功')
      return {
        success: true,
        data,
        error: null
      }

    } catch (error) {
      console.error('CaseService.addCaseHistory 發生錯誤:', error)
      return {
        success: false,
        error: error.message,
        data: null
      }
    }
  }

  /**
   * 驗證必填欄位
   * @param {Object} formData - 表單資料
   * @returns {Object} 驗證結果
   */
  static validateRequiredFields(formData) {
    const requiredFields = [
      { field: 'title', label: '案件標題' },
      { field: 'contact1Name', label: '聯絡人1姓名' },
      { field: 'contact1Phone', label: '聯絡人1電話' },
      { field: 'receiver', label: '受理人員' },
      { field: 'category', label: '案件類別' },
      { field: 'receivedDate', label: '受理日期' },
      { field: 'receivedTime', label: '受理時間' }
    ]

    const errors = []

    for (const { field, label } of requiredFields) {
      const value = formData[field]
      if (!value || !value.toString().trim()) {
        errors.push(`請填寫 ${label}`)
      }
    }

    // 檢查電話格式
    if (formData.contact1Phone) {
      const phoneRegex = /^[0-9+\-\s()]{8,15}$/
      if (!phoneRegex.test(formData.contact1Phone)) {
        errors.push('聯絡人1電話格式不正確')
      }
    }

    // 檢查結案日期時間的一致性
    if (formData.closedDate && !formData.closedTime) {
      errors.push('請設定結案時間')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }
}