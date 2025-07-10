// src/services/caseService.js - 完整版本
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
      console.log('縣市資料:', data)

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
      console.log('行政區資料:', data)

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
   * 取得案件列表（支援篩選和分頁）
   * @param {Object} options - 查詢選項
   * @param {string} options.groupId - 團隊 ID
   * @param {number} options.page - 頁碼
   * @param {number} options.pageSize - 每頁筆數
   * @param {Object} options.filters - 篩選條件
   * @param {string} options.searchTerm - 搜尋關鍵字
   * @param {Object} options.sortConfig - 排序設定
   * @returns {Promise<Object>} 案件列表和分頁資訊
   */
  static async getCases({ 
    groupId, 
    page = 1, 
    pageSize = 20, 
    filters = {}, 
    searchTerm = '',
    sortConfig = { field: 'created_at', direction: 'desc' }
  }) {
    try {
      console.log('=== CaseService.getCases ===')
      console.log('查詢參數:', { groupId, page, pageSize, filters, searchTerm, sortConfig })

      if (!groupId) {
        return {
          success: false,
          error: '團隊 ID 必填',
          data: { cases: [], totalCount: 0, currentPage: page, totalPages: 0 }
        }
      }

      // 建構基本查詢
      let query = supabase
        .from('Case')
        .select(`
          *,
          CategoryCase(
            Category(id, name)
          ),
          VoterCase(
            Voter(id, name, phone, address)
          ),
          InChargeCase(
            Member(id, name)
          ),
          AcceptanceCase(
            Member(id, name)
          ),
          DistrictCase(
            District(id, name, County(name))
          )
        `)
        .eq('group_id', groupId)

      // 處理篩選條件
      if (filters.status && filters.status.length > 0) {
        query = query.in('status', filters.status)
      }

      if (filters.priority && filters.priority.length > 0) {
        query = query.in('priority', filters.priority)
      }

      if (filters.category && filters.category.length > 0) {
        // 類別篩選需要通過 CategoryCase 關聯表
        const { data: categoryIds } = await supabase
          .from('Category')
          .select('id')
          .in('name', filters.category)

        if (categoryIds && categoryIds.length > 0) {
          const { data: casesWithCategory } = await supabase
            .from('CategoryCase')
            .select('case_id')
            .in('category_id', categoryIds.map(c => c.id))

          if (casesWithCategory && casesWithCategory.length > 0) {
            query = query.in('id', casesWithCategory.map(c => c.case_id))
          } else {
            // 如果沒有符合的案件，返回空結果
            return {
              success: true,
              data: { cases: [], totalCount: 0, currentPage: page, totalPages: 0 }
            }
          }
        }
      }

      if (filters.assignee && filters.assignee.length > 0) {
        // 承辦人員篩選需要通過 InChargeCase 關聯表
        const { data: casesWithAssignee } = await supabase
          .from('InChargeCase')
          .select('case_id')
          .in('member_id', filters.assignee)

        if (casesWithAssignee && casesWithAssignee.length > 0) {
          query = query.in('id', casesWithAssignee.map(c => c.case_id))
        } else {
          return {
            success: true,
            data: { cases: [], totalCount: 0, currentPage: page, totalPages: 0 }
          }
        }
      }

      if (filters.dateRange && filters.dateRange.start && filters.dateRange.end) {
        query = query
          .gte('created_at', filters.dateRange.start)
          .lte('created_at', filters.dateRange.end)
      }

      // 處理搜尋關鍵字
      if (searchTerm && searchTerm.trim()) {
        query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
      }

      // 先取得總數（用於分頁）
      const { count, error: countError } = await supabase
        .from('Case')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', groupId)

      if (countError) {
        console.error('取得案件總數失敗:', countError)
        return {
          success: false,
          error: countError.message,
          data: { cases: [], totalCount: 0, currentPage: page, totalPages: 0 }
        }
      }

      // 處理排序
      const { field, direction } = sortConfig
      query = query.order(field, { ascending: direction === 'asc' })

      // 處理分頁
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1
      query = query.range(from, to)

      const { data, error } = await query

      if (error) {
        console.error('查詢案件失敗:', error)
        return {
          success: false,
          error: error.message,
          data: { cases: [], totalCount: 0, currentPage: page, totalPages: 0 }
        }
      }

      const totalCount = count || 0
      const totalPages = Math.ceil(totalCount / pageSize)

      console.log(`查詢成功，共 ${totalCount} 筆案件，第 ${page}/${totalPages} 頁`)

      return {
        success: true,
        data: {
          cases: data || [],
          totalCount,
          currentPage: page,
          totalPages
        },
        error: null
      }

    } catch (error) {
      console.error('CaseService.getCases 發生錯誤:', error)
      return {
        success: false,
        error: error.message,
        data: { cases: [], totalCount: 0, currentPage: page, totalPages: 0 }
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

      // 取得各狀態的案件數量
      const { data: statusData, error: statusError } = await supabase
        .from('Case')
        .select('status')
        .eq('group_id', groupId)

      if (statusError) {
        console.error('取得狀態統計失敗:', statusError)
        return {
          success: false,
          error: statusError.message,
          data: null
        }
      }

      // 計算統計數據
      const stats = {
        total: statusData.length,
        pending: statusData.filter(c => c.status === 'pending').length,
        processing: statusData.filter(c => c.status === 'processing').length,
        resolved: statusData.filter(c => c.status === 'resolved').length,
        closed: statusData.filter(c => c.status === 'closed').length
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
   * 更新案件狀態
   * @param {string} caseId - 案件 ID
   * @param {string} newStatus - 新狀態
   * @param {string} groupId - 團隊 ID（權限驗證）
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
   * 取得案件類別列表
   * @param {string} teamId - 團隊 ID（保留參數以備未來使用）
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

      // 移除可能重複的預設類別名稱
      const filteredCustomCategories = customCategories.filter(custom => 
        !defaultCategories.some(def => def.name === custom.name)
      )

      const allCategories = [...defaultCategories, ...filteredCustomCategories]

      console.log(`載入類別成功，共 ${allCategories.length} 筆（預設: ${defaultCategories.length}, 自定義: ${filteredCustomCategories.length}）`)

      return {
        success: true,
        data: allCategories,
        error: null
      }

    } catch (error) {
      console.error('CaseService.getCategories 發生錯誤:', error)
      // 發生錯誤時至少返回預設類別
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
   * 取得團隊成員列表（用於負責人篩選）
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
   * 建立新案件
   * @param {Object} formData - 表單資料
   * @param {string} teamId - 團隊 ID
   * @param {Object} dropdownOptions - 下拉選單選項（包含縣市行政區資料）
   * @returns {Promise<Object>} 建立結果
   */
  static async createCase(formData, teamId, dropdownOptions = {}) {
    try {
      console.log('=== CaseService.createCase ===')
      console.log('表單資料:', formData)
      console.log('團隊 ID:', teamId)
      console.log('下拉選單選項:', dropdownOptions)

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

      // 3. 處理案件類型（如果有的話）
      let categoryResult = null
      if (formData.category) {
        categoryResult = await this.handleCategory(formData.category)
        console.log('案件類型處理結果:', categoryResult)
      }

      // 4. 建立案件（包含事發地點在 description 中）
      const caseData = {
        group_id: teamId,
        title: formData.title,
        description: this.buildDescription(formData, dropdownOptions),
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

      // 5. 建立關聯
      const relationResults = []

      // 5.1 聯絡人關聯
      if (contact1Result?.success) {
        try {
          const voterCaseResult = await this.createVoterCaseRelation(newCase.id, contact1Result.data.id)
          relationResults.push({ type: 'VoterCase', success: true, data: voterCaseResult })
        } catch (error) {
          console.warn('建立聯絡人1關聯失敗:', error)
          relationResults.push({ type: 'VoterCase', success: false, error: error.message })
        }
      }

      if (contact2Result?.success) {
        try {
          const voterCaseResult = await this.createVoterCaseRelation(newCase.id, contact2Result.data.id)
          relationResults.push({ type: 'VoterCase2', success: true, data: voterCaseResult })
        } catch (error) {
          console.warn('建立聯絡人2關聯失敗:', error)
          relationResults.push({ type: 'VoterCase2', success: false, error: error.message })
        }
      }

      // 5.2 案件類別關聯
      if (categoryResult?.success) {
        try {
          const categoryResult2 = await this.createCategoryCaseRelation(
            newCase.id, 
            categoryResult.data.id
          )
          relationResults.push({ type: 'CategoryCase', success: true, data: categoryResult2 })
          
          console.log('✅ CategoryCase 關聯建立成功，Category ID:', categoryResult.data.id)
        } catch (error) {
          console.warn('建立類別關聯失敗:', error)
          relationResults.push({ type: 'CategoryCase', success: false, error: error.message })
        }
      } else if (formData.category) {
        console.warn('案件類型處理失敗，無法建立 CategoryCase 關聯')
        relationResults.push({ 
          type: 'CategoryCase', 
          success: false, 
          error: categoryResult?.error || '案件類型處理失敗' 
        })
      }

      // 5.3 受理人員關聯
      if (formData.receiver) {
        try {
          const acceptanceResult = await this.createAcceptanceCaseRelation(newCase.id, formData.receiver)
          relationResults.push({ type: 'AcceptanceCase', success: true, data: acceptanceResult })
          
          // 同時建立 CaseMember 記錄
          const caseMemberResult = await this.createCaseMemberRelation(newCase.id, formData.receiver, 'receiver')
          relationResults.push({ type: 'CaseMember-Receiver', success: true, data: caseMemberResult })
          
        } catch (error) {
          console.warn('建立受理人員關聯失敗:', error)
          relationResults.push({ type: 'AcceptanceCase', success: false, error: error.message })
        }
      }

      // 5.4 承辦人員關聯
      if (formData.handler) {
        try {
          const inChargeResult = await this.createInChargeCaseRelation(newCase.id, formData.handler)
          relationResults.push({ type: 'InChargeCase', success: true, data: inChargeResult })
          
          // 同時建立 CaseMember 記錄
          const caseMemberResult = await this.createCaseMemberRelation(newCase.id, formData.handler, 'handler')
          relationResults.push({ type: 'CaseMember-Handler', success: true, data: caseMemberResult })
          
        } catch (error) {
          console.warn('建立承辦人員關聯失敗:', error)
          relationResults.push({ type: 'InChargeCase', success: false, error: error.message })
        }
      }

      // 5.5 事發地點關聯
      if (formData.incidentDistrict) {
        try {
          const districtResult = await this.createDistrictCaseRelation(newCase.id, formData.incidentDistrict)
          relationResults.push({ type: 'DistrictCase', success: true, data: districtResult })
        } catch (error) {
          console.warn('建立事發地點關聯失敗:', error)
          relationResults.push({ type: 'DistrictCase', success: false, error: error.message })
        }
      }

      console.log('所有關聯建立完成:', relationResults)

      return {
        success: true,
        data: {
          case: newCase,
          contact1: contact1Result.data,
          contact2: contact2Result?.data || null,
          category: categoryResult?.data || null,
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
   * 處理聯絡人資料
   * @param {Object} contactInfo - 聯絡人資訊
   * @param {Object} locationOptions - 地點選項
   * @param {string} selectedDistrictId - 選擇的行政區 ID
   * @returns {Promise<Object>} 處理結果
   */
  static async handleContact(contactInfo, locationOptions = {}, selectedDistrictId = null) {
    try {
      console.log('=== 處理聯絡人資料 ===')
      console.log('聯絡人資訊:', contactInfo)
      console.log('地點選項:', locationOptions)
      console.log('選擇的行政區 ID:', selectedDistrictId)

      if (!contactInfo.name || !contactInfo.phone) {
        return { success: false, error: '聯絡人姓名和電話必填' }
      }

      // 檢查是否已存在相同的聯絡人
      const { data: existingVoter, error: searchError } = await supabase
        .from('Voter')
        .select('*')
        .eq('name', contactInfo.name)
        .eq('phone', contactInfo.phone)
        .single()

      if (searchError && searchError.code !== 'PGRST116') {
        console.error('搜尋現有聯絡人失敗:', searchError)
        return { success: false, error: searchError.message }
      }

      let voterResult = null

      if (existingVoter) {
        console.log('找到現有聯絡人:', existingVoter)
        voterResult = existingVoter

        // 如果有住家里別且與現有不同，建立住家里別關聯
        if (selectedDistrictId) {
          try {
            await this.createVoterDistrictRelation(existingVoter.id, selectedDistrictId)
            console.log('住家里別關聯建立成功')
          } catch (error) {
            console.warn('建立住家里別關聯失敗:', error)
          }
        }
      } else {
        console.log('建立新聯絡人')

        // 建構地址字串
        let addressString = ''
        if (locationOptions.selectedCountyId && locationOptions.counties) {
          const selectedCounty = locationOptions.counties.find(c => c.id === locationOptions.selectedCountyId)
          if (selectedCounty) {
            addressString += selectedCounty.name
          }
        }

        if (selectedDistrictId && locationOptions.districts) {
          const selectedDistrict = locationOptions.districts.find(d => d.id === selectedDistrictId)
          if (selectedDistrict) {
            addressString += selectedDistrict.name
          }
        }

        const newVoterData = {
          name: contactInfo.name,
          phone: contactInfo.phone,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        if (addressString) {
          newVoterData.address = addressString
        }

        console.log('新選民資料:', newVoterData)

        const { data: newVoter, error: createError } = await supabase
          .from('Voter')
          .insert([newVoterData])
          .select()
          .single()

        if (createError) {
          console.error('建立選民失敗:', createError)
          return { success: false, error: createError.message }
        }

        console.log('建立新選民成功:', newVoter)
        voterResult = newVoter

        // 建立住家里別關聯
        if (selectedDistrictId) {
          try {
            await this.createVoterDistrictRelation(newVoter.id, selectedDistrictId)
            console.log('住家里別關聯建立成功')
          } catch (error) {
            console.warn('建立住家里別關聯失敗:', error)
          }
        }
      }

      return { success: true, data: voterResult }

    } catch (error) {
      console.error('處理聯絡人發生錯誤:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 處理案件類別
   * @param {string} categoryName - 類別名稱
   * @returns {Promise<Object>} 處理結果
   */
  static async handleCategory(categoryName) {
    try {
      console.log('=== 處理案件類別 ===')
      console.log('類別名稱:', categoryName)

      if (!categoryName) {
        return { success: false, error: '類別名稱必填' }
      }

      // 先檢查是否為預設類別
      const defaultCategories = {
        'traffic': '交通問題',
        'environment': '環境問題',
        'security': '治安問題',
        'public_service': '民生服務',
        'legal_consultation': '法律諮詢'
      }

      // 如果是預設類別 ID，轉換為名稱
      const actualCategoryName = defaultCategories[categoryName] || categoryName

      // 檢查資料庫中是否已存在此類別
      const { data: existingCategory, error: searchError } = await supabase
        .from('Category')
        .select('*')
        .eq('name', actualCategoryName)
        .single()

      if (searchError && searchError.code !== 'PGRST116') {
        console.error('搜尋現有類別失敗:', searchError)
        return { success: false, error: searchError.message }
      }

      if (existingCategory) {
        console.log('找到現有類別:', existingCategory)
        return { success: true, data: existingCategory }
      }

      // 建立新類別
      console.log('建立新類別:', actualCategoryName)

      const newCategoryData = {
        name: actualCategoryName,
        description: `自動建立的類別: ${actualCategoryName}`,
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
        return { success: false, error: createError.message }
      }

      console.log('建立新類別成功:', newCategory)
      return { success: true, data: newCategory }

    } catch (error) {
      console.error('處理案件類別發生錯誤:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 建立 VoterCase 關聯
   * @param {string} caseId - 案件 ID
   * @param {string} voterId - 選民 ID
   * @returns {Promise<Object>} 建立結果
   */
  static async createVoterCaseRelation(caseId, voterId) {
    const { data, error } = await supabase
      .from('VoterCase')
      .insert([{ 
        case_id: caseId, 
        voter_id: voterId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()

    if (error) {
      console.error('建立 VoterCase 關聯失敗:', error)
      throw error
    }

    return data
  }

  /**
   * 建立 CategoryCase 關聯
   * @param {string} caseId - 案件 ID
   * @param {string} categoryId - 類別 ID（來自 Category 表的真實 ID）
   * @returns {Promise<Object>} 建立結果
   */
  static async createCategoryCaseRelation(caseId, categoryId) {
    console.log('建立 CategoryCase 關聯:', { caseId, categoryId })
    
    const { data, error } = await supabase
      .from('CategoryCase')
      .insert([{ 
        case_id: caseId, 
        category_id: categoryId,
        created_at: new Date().toISOString()
      }])
      .select()

    if (error) {
      console.error('建立 CategoryCase 關聯失敗:', error)
      throw error
    }

    console.log('CategoryCase 關聯建立成功:', data)
    return data
  }

  /**
   * 建立 AcceptanceCase 關聯（受理人員專用）
   * @param {string} caseId - 案件 ID
   * @param {string} memberId - 成員 ID
   * @returns {Promise<Object>} 建立結果
   */
  static async createAcceptanceCaseRelation(caseId, memberId) {
    console.log('建立 AcceptanceCase 關聯:', { caseId, memberId })
    
    const { data, error } = await supabase
      .from('AcceptanceCase')
      .insert([{ 
        case_id: caseId, 
        member_id: memberId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()

    if (error) {
      console.error('建立 AcceptanceCase 關聯失敗:', error)
      throw error
    }

    console.log('AcceptanceCase 關聯建立成功:', data)
    return data
  }

  /**
   * 建立 InChargeCase 關聯（承辦人員專用）
   * @param {string} caseId - 案件 ID
   * @param {string} memberId - 成員 ID
   * @returns {Promise<Object>} 建立結果
   */
  static async createInChargeCaseRelation(caseId, memberId) {
    console.log('建立 InChargeCase 關聯:', { caseId, memberId })
    
    const { data, error } = await supabase
      .from('InChargeCase')
      .insert([{ 
        case_id: caseId, 
        member_id: memberId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()

    if (error) {
      console.error('建立 InChargeCase 關聯失敗:', error)
      throw error
    }

    console.log('InChargeCase 關聯建立成功:', data)
    return data
  }

  /**
   * 建立 DistrictCase 關聯
   * @param {string} caseId - 案件 ID
   * @param {string} districtId - 行政區 ID
   * @returns {Promise<Object>} 建立結果
   */
  static async createDistrictCaseRelation(caseId, districtId) {
    const { data, error } = await supabase
      .from('DistrictCase')
      .insert([{ 
        case_id: caseId, 
        district_id: districtId,
        created_at: new Date().toISOString()
      }])
      .select()

    if (error) {
      console.error('建立 DistrictCase 關聯失敗:', error)
      throw error
    }

    return data
  }

  /**
   * 建立 VoterDistrict 關聯（住家里別）
   * @param {string} voterId - 選民 ID
   * @param {string} districtId - 行政區 ID
   * @returns {Promise<Object>} 建立結果
   */
  static async createVoterDistrictRelation(voterId, districtId) {
    // 先檢查是否已存在相同關聯
    const { data: existing, error: checkError } = await supabase
      .from('VoterDistrict')
      .select('id')
      .eq('voter_id', voterId)
      .eq('district_id', districtId)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('檢查 VoterDistrict 關聯失敗:', checkError)
      throw checkError
    }

    if (existing) {
      console.log('VoterDistrict 關聯已存在，跳過建立')
      return existing
    }

    const { data, error } = await supabase
      .from('VoterDistrict')
      .insert([{ 
        voter_id: voterId, 
        district_id: districtId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()

    if (error) {
      console.error('建立 VoterDistrict 關聯失敗:', error)
      throw error
    }

    return data
  }

  /**
   * 建立 CaseMember 關聯（受理人員或承辦人員）
   * @param {string} caseId - 案件 ID
   * @param {string} memberId - 成員 ID
   * @param {string} role - 角色 (receiver, handler 等)
   * @returns {Promise<Object>} 建立結果
   */
  static async createCaseMemberRelation(caseId, memberId, role = 'receiver') {
    const { data, error } = await supabase
      .from('CaseMember')
      .insert([{ 
        case_id: caseId, 
        member_id: memberId, 
        role: role,
        created_at: new Date().toISOString()
      }])
      .select()

    if (error) {
      console.error('建立 CaseMember 關聯失敗:', error)
      throw error
    }

    return data
  }

  /**
   * 建構案件描述（整合各種資訊）
   * @param {Object} formData - 表單資料
   * @param {Object} dropdownOptions - 下拉選單選項
   * @returns {string} 完整的案件描述
   */
  static buildDescription(formData, dropdownOptions = {}) {
    let description = formData.description || ''

    // 添加案件編號（如果有）
    if (formData.caseNumber) {
      description = `案件編號：${formData.caseNumber}\n\n` + description
    }

    // 添加受理時間（如果有）
    if (formData.receivedDate && formData.receivedTime) {
      description = `受理時間：${formData.receivedDate} ${formData.receivedTime}\n\n` + description
    }

    // 添加事發地點（如果有）
    if (formData.incidentLocation || formData.incidentCounty || formData.incidentDistrict) {
      let locationString = '事發地點：'
      
      // 組合完整地址
      if (formData.incidentCounty && dropdownOptions.counties) {
        const county = dropdownOptions.counties.find(c => c.id === formData.incidentCounty)
        if (county) locationString += county.name
      }
      
      if (formData.incidentDistrict && dropdownOptions.districts) {
        const district = dropdownOptions.districts.find(d => d.id === formData.incidentDistrict)
        if (district) locationString += district.name
      }
      
      if (formData.incidentLocation) {
        locationString += formData.incidentLocation
      }
      
      description = locationString + '\n\n' + description
    }

    // 添加通知設定（如果有）
    if (formData.notificationMethod || formData.reminderDate) {
      let notificationString = '通知設定：\n'
      
      if (formData.notificationMethod) {
        const methodMap = {
          'phone': '電話通知',
          'email': '電子郵件',
          'sms': '簡訊',
          'line': 'LINE'
        }
        notificationString += `- 通知方式：${methodMap[formData.notificationMethod] || formData.notificationMethod}\n`
      }
      
      if (formData.reminderDate) {
        notificationString += `- 提醒日期：${formData.reminderDate}\n`
      }
      
      if (formData.googleCalendarSync) {
        notificationString += '- Google 日曆同步：已啟用\n'
      }
      
      if (formData.sendNotification) {
        notificationString += '- 發送通知：已啟用\n'
      }
      
      if (formData.multipleReminders) {
        notificationString += '- 多次提醒：已啟用\n'
      }
      
      description = description + '\n\n' + notificationString
    }

    return description.trim()
  }

  /**
   * 格式化日期時間為 PostgreSQL timestamptz 格式
   * @param {string} date - 日期字串 (YYYY-MM-DD)
   * @param {string} time - 時間字串 (HH:MM)
   * @returns {string} ISO 格式的日期時間字串
   */
  static formatToTimetz(date, time) {
    if (!date || !time) return null
    
    try {
      // 組合日期和時間，假設為台灣時區 (UTC+8)
      const datetime = new Date(`${date}T${time}:00+08:00`)
      return datetime.toISOString()
    } catch (error) {
      console.error('日期時間格式化失敗:', error)
      return null
    }
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

  /**
   * 更新案件及其所有關聯資料
   * @param {Object} options - 更新選項
   * @param {Object} options.caseData - 案件資料
   * @param {Object} options.originalData - 原始資料（用於比較變更）
   * @param {string} options.teamId - 團隊 ID
   * @param {Object} options.dropdownOptions - 下拉選單選項（用於地點名稱轉換）
   * @returns {Promise<Object>} 更新結果
   */
  static async updateCaseWithRelations({ caseData, originalData, teamId, dropdownOptions = {} }) {
    try {
      console.log('=== CaseService.updateCaseWithRelations ===')
      console.log('更新資料:', caseData)
      console.log('原始資料:', originalData)
      console.log('團隊 ID:', teamId)

      if (!teamId || !caseData || !originalData || !caseData.id) {
        return {
          success: false,
          error: '團隊 ID、案件資料、原始資料和案件 ID 必填',
          data: null
        }
      }

      const updateResults = []
      const now = new Date().toISOString()

      // 1. 檢查並更新主要案件資料
      const caseNeedsUpdate = this.checkCaseDataChanges(caseData, originalData)
      if (caseNeedsUpdate) {
        console.log('案件主要資料有變更，執行更新')
        
        const updatedCaseData = {
          title: caseData.title,
          description: this.buildDescription(caseData, dropdownOptions),
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

      // 2. 處理聯絡人更新
      await this.updateContacts(caseData, originalData, updateResults, dropdownOptions)

      // 3. 處理案件類別更新
      await this.updateCaseCategory(caseData, originalData, updateResults)

      // 4. 處理受理人員更新
      await this.updateAcceptanceMember(caseData, originalData, updateResults)

      // 5. 處理承辦人員更新
      await this.updateInChargeMember(caseData, originalData, updateResults)

      // 6. 處理事發地點更新
      await this.updateIncidentLocation(caseData, originalData, updateResults)

      // 7. 處理住家里別更新
      await this.updateHomeDistrict(caseData, originalData, updateResults, dropdownOptions)

      console.log('所有更新完成:', updateResults)

      const successCount = updateResults.filter(r => r.success).length
      const failCount = updateResults.filter(r => !r.success).length

      return {
        success: true,
        data: {
          caseId: caseData.id,
          updateResults,
          summary: {
            updated: successCount,
            failed: failCount,
            total: updateResults.length
          }
        },
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
   * 檢查案件主要資料是否有變更
   * @param {Object} newData - 新資料
   * @param {Object} originalData - 原始資料
   * @returns {boolean} 是否有變更
   */
  static checkCaseDataChanges(newData, originalData) {
    const fieldsToCheck = [
      'title', 'description', 'receivedDate', 'receivedTime',
      'closedDate', 'closedTime', 'processingStatus', 'contactMethod', 'priority'
    ]

    return fieldsToCheck.some(field => {
      const newValue = newData[field] || ''
      const originalValue = originalData[field] || ''
      return newValue !== originalValue
    })
  }

  /**
   * 更新聯絡人資訊 - 修正版：包含 Voter 表的 updated_at 更新
   */
  static async updateContacts(caseData, originalData, updateResults, dropdownOptions) {
    try {
      // 檢查聯絡人1是否有變更
      if (this.contactNeedsUpdate(caseData, originalData, 1)) {
        console.log('聯絡人1有變更，執行更新')
        
        // 先找到現有的聯絡人 Voter ID
        const { data: existingVoterCases } = await supabase
          .from('VoterCase')
          .select('voter_id')
          .eq('case_id', caseData.id)
          .order('created_at', { ascending: true })
          .limit(1)

        if (existingVoterCases && existingVoterCases.length > 0) {
          const existingVoterId = existingVoterCases[0].voter_id
          
          // 直接更新現有的 Voter 記錄，包含 updated_at
          const { error: updateVoterError } = await supabase
            .from('Voter')
            .update({
              name: caseData.contact1Name,
              phone: caseData.contact1Phone,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingVoterId)

          if (updateVoterError) {
            console.error('更新聯絡人1失敗:', updateVoterError)
            updateResults.push({ type: 'Contact1', success: false, error: updateVoterError.message })
          } else {
            console.log('聯絡人1更新成功')
            updateResults.push({ type: 'Contact1', success: true, action: 'updated', voterId: existingVoterId })
            
            // 同時更新 VoterCase 的 updated_at
            await supabase
              .from('VoterCase')
              .update({ updated_at: new Date().toISOString() })
              .eq('case_id', caseData.id)
              .eq('voter_id', existingVoterId)
          }
        } else {
          // 如果沒有現有聯絡人，建立新的
          const contact1Result = await this.handleContact({
            name: caseData.contact1Name,
            phone: caseData.contact1Phone
          }, {
            ...dropdownOptions,
            selectedCountyId: caseData.homeCounty
          }, caseData.homeDistrict)

          if (contact1Result.success) {
            updateResults.push({ type: 'Contact1', success: true, action: 'created', data: contact1Result.data })
          } else {
            updateResults.push({ type: 'Contact1', success: false, error: contact1Result.error })
          }
        }
      }

      // 處理聯絡人2的更新邏輯（如果有的話）
      if (this.contactNeedsUpdate(caseData, originalData, 2)) {
        console.log('聯絡人2有變更，執行更新')
        
        // 找到第二個聯絡人
        const { data: existingVoterCases2 } = await supabase
          .from('VoterCase')
          .select('voter_id')
          .eq('case_id', caseData.id)
          .order('created_at', { ascending: true })
          .limit(2)

        if (existingVoterCases2 && existingVoterCases2.length > 1) {
          const existingVoterId2 = existingVoterCases2[1].voter_id
          
          // 更新第二個聯絡人
          const { error: updateVoter2Error } = await supabase
            .from('Voter')
            .update({
              name: caseData.contact2Name,
              phone: caseData.contact2Phone,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingVoterId2)

          if (updateVoter2Error) {
            updateResults.push({ type: 'Contact2', success: false, error: updateVoter2Error.message })
          } else {
            updateResults.push({ type: 'Contact2', success: true, action: 'updated', voterId: existingVoterId2 })
            
            // 同時更新 VoterCase 的 updated_at
            await supabase
              .from('VoterCase')
              .update({ updated_at: new Date().toISOString() })
              .eq('case_id', caseData.id)
              .eq('voter_id', existingVoterId2)
          }
        }
      }

    } catch (error) {
      console.error('更新聯絡人失敗:', error)
      updateResults.push({ type: 'Contact1', success: false, error: error.message })
    }
  }

  /**
   * 更新案件類別 - 修正版：處理 CategoryCase 關聯
   */
  static async updateCaseCategory(caseData, originalData, updateResults) {
    try {
      if (caseData.category !== originalData.category) {
        console.log('案件類別有變更，執行更新')
        
        // 先刪除舊的 CategoryCase 關聯
        const { error: deleteError } = await supabase
          .from('CategoryCase')
          .delete()
          .eq('case_id', caseData.id)

        if (deleteError) {
          console.error('刪除舊類別關聯失敗:', deleteError)
          updateResults.push({ type: 'CategoryCase', success: false, error: deleteError.message })
          return
        }

        // 如果有新的類別，建立新的關聯
        if (caseData.category) {
          // 先找到類別 ID
          const { data: categories, error: categoryError } = await supabase
            .from('Category')
            .select('id')
            .eq('name', caseData.category)
            .limit(1)

          if (categoryError || !categories || categories.length === 0) {
            console.error('找不到類別:', caseData.category)
            updateResults.push({ type: 'CategoryCase', success: false, error: '找不到指定的類別' })
            return
          }

          const categoryId = categories[0].id

          // 建立新的 CategoryCase 關聯
          const { error: insertError } = await supabase
            .from('CategoryCase')
            .insert([{
              case_id: caseData.id,
              category_id: categoryId,
              created_at: new Date().toISOString()
            }])

          if (insertError) {
            console.error('建立新類別關聯失敗:', insertError)
            updateResults.push({ type: 'CategoryCase', success: false, error: insertError.message })
          } else {
            console.log('類別關聯更新成功')
            updateResults.push({ type: 'CategoryCase', success: true, action: 'recreated', categoryId })
          }
        } else {
          // 如果新類別為空，只刪除關聯即可
          updateResults.push({ type: 'CategoryCase', success: true, action: 'deleted' })
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
            member_id: caseData.receiver || null,
            updated_at: now
          })
          .eq('case_id', caseData.id)

        if (acceptanceError) {
          updateResults.push({ type: 'AcceptanceCase', success: false, error: acceptanceError.message })
        } else {
          updateResults.push({ type: 'AcceptanceCase', success: true })
        }

        // 同時更新 CaseMember（如果有受理人員）
        if (caseData.receiver) {
          // 先刪除舊的受理人員記錄
          await supabase
            .from('CaseMember')
            .delete()
            .eq('case_id', caseData.id)
            .eq('role', 'receiver')

          // 建立新的受理人員記錄
          const { error: caseMemberError } = await supabase
            .from('CaseMember')
            .insert([{
              case_id: caseData.id,
              member_id: caseData.receiver,
              role: 'receiver',
              created_at: now
            }])

          if (caseMemberError) {
            updateResults.push({ type: 'CaseMember-Receiver', success: false, error: caseMemberError.message })
          } else {
            updateResults.push({ type: 'CaseMember-Receiver', success: true })
          }
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
   * 更新住家里別關聯 - 確保 VoterDistrict 正確更新
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
          .order('created_at', { ascending: true })
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
              updateResults.push({ type: 'VoterDistrict', success: true, action: 'recreated' })
            }
          } else {
            // 如果新住家里別為空，只刪除關聯即可
            updateResults.push({ type: 'VoterDistrict', success: true, action: 'deleted' })
          }

          // 同時更新對應的 VoterCase 記錄的 updated_at
          await supabase
            .from('VoterCase')
            .update({ updated_at: new Date().toISOString() })
            .eq('case_id', caseData.id)
            .eq('voter_id', voterId)
        }
      }
    } catch (error) {
      console.error('更新住家里別失敗:', error)
      updateResults.push({ type: 'VoterDistrict', success: false, error: error.message })
    }
  }

  /**
   * 輔助方法：檢查聯絡人是否需要更新
   */
  static contactNeedsUpdate(caseData, originalData, contactNumber) {
    const nameField = `contact${contactNumber}Name`
    const phoneField = `contact${contactNumber}Phone`
    
    const nameChanged = (caseData[nameField] || '') !== (originalData[nameField] || '')
    const phoneChanged = (caseData[phoneField] || '') !== (originalData[phoneField] || '')
    
    return nameChanged || phoneChanged
  }

  /**
   * 輔助方法：將類別 ID 轉換為類別名稱
   * @param {string} categoryId - 類別 ID
   * @returns {string} 類別名稱
   */
  static getCategoryName(categoryId) {
    const categoryMap = {
      'traffic': '交通問題',
      'environment': '環境問題',
      'security': '治安問題',
      'public_service': '民生服務',
      'legal_consultation': '法律諮詢'
    }
    return categoryMap[categoryId] || categoryId
  }

  /**
   * 輔助方法：將優先順序代碼轉換為顯示名稱
   * @param {string} priority - 優先順序代碼
   * @returns {string} 顯示名稱
   */
  static getPriorityLabel(priority) {
    const priorityMap = {
      'low': '低',
      'normal': '一般',
      'high': '高',
      'urgent': '緊急'
    }
    return priorityMap[priority] || priority
  }

  /**
   * 輔助方法：將狀態代碼轉換為顯示名稱
   * @param {string} status - 狀態代碼
   * @returns {string} 顯示名稱
   */
  static getStatusLabel(status) {
    const statusMap = {
      'pending': '待處理',
      'processing': '處理中',
      'resolved': '已解決',
      'closed': '已結案'
    }
    return statusMap[status] || status
  }

  /**
   * 輔助方法：將聯絡方式代碼轉換為顯示名稱
   * @param {string} contactType - 聯絡方式代碼
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
    return contactTypeMap[contactType] || contactType
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

  /**
   * 搜尋案件（全文搜尋）
   * @param {string} searchTerm - 搜尋關鍵字
   * @param {string} groupId - 團隊 ID
   * @param {number} limit - 結果數量限制
   * @returns {Promise<Object>} 搜尋結果
   */
  static async searchCases(searchTerm, groupId, limit = 10) {
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
        .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
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

      console.log(`搜尋完成，找到 ${data?.length || 0} 筆結果`)

      return {
        success: true,
        data: data || [],
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

  /**
   * 取得單一案件詳細資料
   * @param {string} caseId - 案件 ID
   * @param {string} groupId - 團隊 ID（權限驗證）
   * @returns {Promise<Object>} 案件詳細資料
   */
  static async getCaseById(caseId, groupId) {
    try {
      console.log('=== CaseService.getCaseById ===')
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
            Category(id, name)
          ),
          VoterCase(
            Voter(id, name, phone, address)
          ),
          InChargeCase(
            Member(id, name)
          ),
          AcceptanceCase(
            Member(id, name)
          ),
          DistrictCase(
            District(id, name, County(name))
          )
        `)
        .eq('id', caseId)
        .eq('group_id', groupId)
        .single()

      if (error) {
        console.error('取得案件詳細資料失敗:', error)
        return {
          success: false,
          error: error.message,
          data: null
        }
      }

      console.log('取得案件詳細資料成功')

      return {
        success: true,
        data,
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
   * 刪除案件及所有相關資料
   * @param {string} caseId - 案件 ID
   * @param {string} groupId - 團隊 ID（權限驗證）
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

      // 由於外鍵約束，相關資料會自動刪除（CASCADE）
      // 或者可以手動刪除各個關聯表的資料
      
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
   * @param {string} groupId - 團隊 ID（權限驗證）
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
}