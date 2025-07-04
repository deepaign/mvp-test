// services/caseService.js
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
   * @param {string} options.status - 案件狀態 (all, pending, processing, completed)
   * @param {Object} options.filters - 篩選條件
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
        page = 0,
        limit = 20
      } = options

      console.log('=== CaseService.getCases ===')
      console.log('查詢參數:', { groupId, status, filters, page, limit })

      if (!groupId) {
        return {
          success: false,
          error: '團隊 ID 必填',
          data: null
        }
      }

      // 建立基礎查詢
      let query = supabase
        .from('Case')
        .select(`
          *,
          CategoryCase!inner (
            Category (
              id,
              name
            )
          ),
          InChargeCase (
            Member (
              id,
              name
            )
          ),
          VoterCase (
            Voter (
              id,
              name,
              phone
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

      // 狀態篩選
      if (status !== 'all') {
        query = query.eq('status', status)
      }

      // 案件類型篩選
      if (filters.category && filters.category !== 'all') {
        // 如果是預設類型，需要特殊處理
        if (['traffic', 'environment', 'security', 'public_service'].includes(filters.category)) {
          // TODO: 這裡需要根據實際的類別資料結構調整
          query = query.eq('CategoryCase.Category.name', this.getCategoryName(filters.category))
        } else {
          query = query.eq('CategoryCase.category_id', filters.category)
        }
      }

      // 優先順序篩選
      if (filters.priority && filters.priority !== 'all') {
        query = query.eq('priority', filters.priority)
      }

      // 負責人篩選
      if (filters.assignee && filters.assignee !== 'all') {
        query = query.eq('InChargeCase.member_id', filters.assignee)
      }

      // 日期篩選
      if (filters.startDate && filters.endDate) {
        query = query
          .gte('created_at', filters.startDate)
          .lte('created_at', filters.endDate)
      }

      // 排序（預設由新到舊）
      query = query.order('created_at', { ascending: false })

      // 分頁
      if (page >= 0 && limit > 0) {
        const start = page * limit
        const end = start + limit - 1
        query = query.range(start, end)
      }

      const { data, error, count } = await query

      if (error) {
        console.error('查詢案件失敗:', error)
        return {
          success: false,
          error: error.message,
          data: null
        }
      }

      console.log(`查詢成功，共 ${data?.length || 0} 筆案件`)
      
      return {
        success: true,
        data: data || [],
        count,
        page,
        limit,
        error: null
      }

    } catch (error) {
      console.error('CaseService.getCases 發生錯誤:', error)
      return {
        success: false,
        error: error.message,
        data: null
      }
    }
  }

  /**
   * 取得案件類別列表
   * @param {string} groupId - 團隊 ID（未來可能需要）
   * @returns {Promise<Object>} 類別列表
   */
  static async getCategories(groupId) {
    try {
      console.log('=== CaseService.getCategories ===')

      // 嘗試從資料庫載入類別
      const { data: dbCategories, error } = await supabase
        .from('Category')
        .select('id, name, description')
        .order('name')

      if (error) {
        console.error('載入類別失敗，使用預設類別:', error)
        // 如果資料庫載入失敗，返回預設類別
        const defaultCategories = [
          { id: 'traffic', name: '交通問題' },
          { id: 'environment', name: '環境問題' },
          { id: 'security', name: '治安問題' },
          { id: 'public_service', name: '民生服務' }
        ]

        return {
          success: true,
          data: defaultCategories,
          error: null
        }
      }

      // 如果資料庫有類別資料，使用資料庫的；否則使用預設的
      const categories = dbCategories && dbCategories.length > 0 
        ? dbCategories 
        : [
            { id: 'traffic', name: '交通問題' },
            { id: 'environment', name: '環境問題' },
            { id: 'security', name: '治安問題' },
            { id: 'public_service', name: '民生服務' }
          ]

      console.log(`載入類別成功，共 ${categories.length} 筆`)

      return {
        success: true,
        data: categories,
        error: null
      }

    } catch (error) {
      console.error('CaseService.getCategories 發生錯誤:', error)
      return {
        success: false,
        error: error.message,
        data: []
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
        .eq('status', 'active')
        .order('name')

      if (error) {
        console.error('載入團隊成員失敗:', error)
        return {
          success: false,
          error: error.message,
          data: []
        }
      }

      console.log(`載入成功，共 ${data?.length || 0} 位成員`)

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
   * 取得案件詳細資訊
   * @param {string} caseId - 案件 ID
   * @param {string} groupId - 團隊 ID（用於權限驗證）
   * @returns {Promise<Object>} 案件詳細資訊
   */
  static async getCaseById(caseId, groupId) {
    try {
      console.log('=== CaseService.getCaseById ===')
      console.log('案件 ID:', caseId, '團隊 ID:', groupId)

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
          CategoryCase (
            Category (
              id,
              name,
              description
            )
          ),
          InChargeCase (
            Member (
              id,
              name,
              email
            )
          ),
          VoterCase (
            Voter (
              id,
              name,
              phone
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
        .eq('id', caseId)
        .eq('group_id', groupId)
        .single()

      if (error) {
        console.error('查詢案件詳情失敗:', error)
        return {
          success: false,
          error: error.message,
          data: null
        }
      }

      if (!data) {
        return {
          success: false,
          error: '找不到指定案件或無權限存取',
          data: null
        }
      }

      console.log('案件詳情載入成功')

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
   * 刪除案件及其所有關聯資料
   * @param {string} caseId - 案件 ID
   * @param {string} groupId - 團隊 ID（用於權限驗證）
   * @returns {Promise<Object>} 刪除結果
   */
  static async deleteCase(caseId, groupId) {
    try {
      console.log('=== CaseService.deleteCase ===')
      console.log('案件 ID:', caseId, '團隊 ID:', groupId)

      if (!caseId || !groupId) {
        return {
          success: false,
          error: '案件 ID 和團隊 ID 必填',
          data: null
        }
      }

      // 先驗證案件是否存在且屬於該團隊
      const { data: caseData, error: checkError } = await supabase
        .from('Case')
        .select('id, title')
        .eq('id', caseId)
        .eq('group_id', groupId)
        .single()

      if (checkError) {
        console.error('驗證案件失敗:', checkError)
        return {
          success: false,
          error: '找不到指定案件或無權限刪除',
          data: null
        }
      }

      if (!caseData) {
        return {
          success: false,
          error: '找不到指定案件或無權限刪除',
          data: null
        }
      }

      // 依序刪除關聯資料（由於外鍵約束，需要先刪除關聯表）
      const deletionResults = []

      // 1. 刪除 VoterCase 關聯
      try {
        const { error: voterCaseError } = await supabase
          .from('VoterCase')
          .delete()
          .eq('case_id', caseId)

        if (voterCaseError) {
          console.warn('刪除 VoterCase 關聯失敗:', voterCaseError)
          deletionResults.push({ type: 'VoterCase', success: false, error: voterCaseError.message })
        } else {
          deletionResults.push({ type: 'VoterCase', success: true })
        }
      } catch (error) {
        console.warn('刪除 VoterCase 關聯異常:', error)
        deletionResults.push({ type: 'VoterCase', success: false, error: error.message })
      }

      // 2. 刪除 CategoryCase 關聯
      try {
        const { error: categoryCaseError } = await supabase
          .from('CategoryCase')
          .delete()
          .eq('case_id', caseId)

        if (categoryCaseError) {
          console.warn('刪除 CategoryCase 關聯失敗:', categoryCaseError)
          deletionResults.push({ type: 'CategoryCase', success: false, error: categoryCaseError.message })
        } else {
          deletionResults.push({ type: 'CategoryCase', success: true })
        }
      } catch (error) {
        console.warn('刪除 CategoryCase 關聯異常:', error)
        deletionResults.push({ type: 'CategoryCase', success: false, error: error.message })
      }

      // 3. 刪除 InChargeCase 關聯
      try {
        const { error: inChargeCaseError } = await supabase
          .from('InChargeCase')
          .delete()
          .eq('case_id', caseId)

        if (inChargeCaseError) {
          console.warn('刪除 InChargeCase 關聯失敗:', inChargeCaseError)
          deletionResults.push({ type: 'InChargeCase', success: false, error: inChargeCaseError.message })
        } else {
          deletionResults.push({ type: 'InChargeCase', success: true })
        }
      } catch (error) {
        console.warn('刪除 InChargeCase 關聯異常:', error)
        deletionResults.push({ type: 'InChargeCase', success: false, error: error.message })
      }

      // 4. 刪除 DistrictCase 關聯
      try {
        const { error: districtCaseError } = await supabase
          .from('DistrictCase')
          .delete()
          .eq('case_id', caseId)

        if (districtCaseError) {
          console.warn('刪除 DistrictCase 關聯失敗:', districtCaseError)
          deletionResults.push({ type: 'DistrictCase', success: false, error: districtCaseError.message })
        } else {
          deletionResults.push({ type: 'DistrictCase', success: true })
        }
      } catch (error) {
        console.warn('刪除 DistrictCase 關聯異常:', error)
        deletionResults.push({ type: 'DistrictCase', success: false, error: error.message })
      }

      // 5. 最後刪除案件本身
      const { error: caseDeleteError } = await supabase
        .from('Case')
        .delete()
        .eq('id', caseId)
        .eq('group_id', groupId)

      if (caseDeleteError) {
        console.error('刪除案件失敗:', caseDeleteError)
        return {
          success: false,
          error: `刪除案件失敗: ${caseDeleteError.message}`,
          data: null
        }
      }

      console.log('案件刪除成功')
      console.log('關聯資料刪除結果:', deletionResults)

      const successCount = deletionResults.filter(r => r.success).length
      const failCount = deletionResults.filter(r => !r.success).length

      return {
        success: true,
        data: {
          deletedCase: caseData,
          deletionResults,
          summary: {
            relationDeleted: successCount,
            relationFailed: failCount,
            total: deletionResults.length
          }
        },
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
   * 格式化日期時間為 timetz 格式
   * @param {string} dateString - 日期字串 (YYYY-MM-DD)
   * @param {string} timeString - 時間字串 (HH:MM)
   * @returns {string} timetz 格式字串 (HH:MM:SS+00)
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

  /**
   * 構建案件描述（包含所有詳細資訊）
   */
  static buildDescription(formData) {
    let description = formData.description || ''
    
    // 添加時間資訊
    if (formData.receivedDate && formData.receivedTime) {
      description += `\n\n受理時間：${formData.receivedDate} ${formData.receivedTime}`
    }
    
    if (formData.closedDate && formData.closedTime) {
      description += `\n結案時間：${formData.closedDate} ${formData.closedTime}`
    }
    
    // 添加事發地點
    if (formData.incidentLocation) {
      description += `\n\n事發地點：${formData.incidentLocation}`
    }

    // 添加案件編號
    if (formData.caseNumber) {
      description += `\n\n案件編號：${formData.caseNumber}`
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

  /**
   * 建立案件及相關關聯（完整流程）
   * @param {Object} options - 建立選項
   * @param {Object} options.formData - 表單資料
   * @param {string} options.teamId - 團隊 ID
   * @returns {Promise<Object>} 建立結果
   */
  static async createCaseWithRelations({ formData, teamId }) {
    try {
      console.log('=== CaseService.createCaseWithRelations ===')
      console.log('表單資料:', formData)
      console.log('團隊 ID:', teamId)

      if (!teamId || !formData) {
        return {
          success: false,
          error: '團隊 ID 和表單資料必填',
          data: null
        }
      }

      // 1. 處理聯絡人（建立或查找 Voter）
      const contact1Result = await this.handleContact({
        name: formData.contact1Name,
        phone: formData.contact1Phone
      })

      let contact2Result = null
      if (formData.contact2Name && formData.contact2Phone) {
        contact2Result = await this.handleContact({
          name: formData.contact2Name,
          phone: formData.contact2Phone
        })
      }

      console.log('聯絡人處理結果:', { contact1Result, contact2Result })

      // 2. 建立案件
      const caseData = {
        group_id: teamId,
        title: formData.title,
        description: this.buildDescription(formData),
        // start_date 和 end_date 是 "time with time zone" 格式
        start_date: this.formatToTimetz(formData.receivedDate, formData.receivedTime),
        end_date: formData.closedDate && formData.closedTime ? 
          this.formatToTimetz(formData.closedDate, formData.closedTime) : null,
        status: formData.processingStatus || 'pending',
        contact_type: formData.contactMethod || 'phone',
        priority: formData.priority || 'normal',
        file: null,
        // created_at 和 updated_at 是 "timestamp with time zone" 格式
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

      // 3. 建立關聯
      const relationResults = []

      // 3.1 聯絡人關聯
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

      // 3.2 案件類別關聯
      if (formData.category) {
        try {
          const categoryResult = await this.createCategoryCaseRelation(newCase.id, formData.category)
          relationResults.push({ type: 'CategoryCase', success: true, data: categoryResult })
        } catch (error) {
          console.warn('建立類別關聯失敗:', error)
          relationResults.push({ type: 'CategoryCase', success: false, error: error.message })
        }
      }

      // 3.3 負責人關聯
      if (formData.receiver) {
        try {
          const receiverResult = await this.createInChargeCaseRelation(newCase.id, formData.receiver, 'receiver')
          relationResults.push({ type: 'InChargeCase', success: true, data: receiverResult })
        } catch (error) {
          console.warn('建立受理人關聯失敗:', error)
          relationResults.push({ type: 'InChargeCase', success: false, error: error.message })
        }
      }

      // 3.4 承辦人關聯（如果與受理人不同）
      if (formData.handler && formData.handler !== formData.receiver) {
        try {
          const handlerResult = await this.createInChargeCaseRelation(newCase.id, formData.handler, 'handler')
          relationResults.push({ type: 'InChargeCaseHandler', success: true, data: handlerResult })
        } catch (error) {
          console.warn('建立承辦人關聯失敗:', error)
          relationResults.push({ type: 'InChargeCaseHandler', success: false, error: error.message })
        }
      }

      // 3.5 事發地點關聯（只有在有選擇行政區時才建立）
      if (formData.incidentDistrict) {
        try {
          const districtResult = await this.createDistrictCaseRelation(newCase.id, formData.incidentDistrict)
          relationResults.push({ type: 'DistrictCase', success: true, data: districtResult })
        } catch (error) {
          console.warn('建立事發地點關聯失敗:', error)
          relationResults.push({ type: 'DistrictCase', success: false, error: error.message })
        }
      }

      // 3.6 住家里別關聯（只有在有選擇行政區時才建立）
      if (formData.homeDistrict && contact1Result?.success) {
        try {
          const voterDistrictResult = await this.createVoterDistrictRelation(contact1Result.data.id, formData.homeDistrict)
          relationResults.push({ type: 'VoterDistrict', success: true, data: voterDistrictResult })
        } catch (error) {
          console.warn('建立住家里別關聯失敗:', error)
          relationResults.push({ type: 'VoterDistrict', success: false, error: error.message })
        }
      }

      console.log('所有關聯建立結果:', relationResults)

      // 計算成功和失敗的關聯數量
      const successCount = relationResults.filter(r => r.success).length
      const failCount = relationResults.filter(r => !r.success).length

      console.log(`關聯建立完成: ${successCount} 成功, ${failCount} 失敗`)

      // 即使部分關聯失敗，只要案件本身建立成功就回傳成功
      return {
        success: true,
        data: {
          case: newCase,
          contacts: { contact1: contact1Result?.data, contact2: contact2Result?.data },
          caseNumber: formData.caseNumber,
          relationResults: relationResults,
          relationSummary: {
            success: successCount,
            failed: failCount,
            total: relationResults.length
          }
        },
        error: null
      }

    } catch (error) {
      console.error('CaseService.createCaseWithRelations 發生錯誤:', error)
      return {
        success: false,
        error: error.message,
        data: null
      }
    }
  }

  /**
   * 處理聯絡人（建立或查找 Voter）
   * @param {Object} contact - 聯絡人資料
   * @returns {Promise<Object>} 處理結果
   */
  static async handleContact(contact) {
    try {
      if (!contact.name || !contact.phone) {
        return { success: false, error: '聯絡人姓名和電話必填' }
      }

      console.log('處理聯絡人:', contact)

      // 先檢查是否已存在
      const { data: existingVoters, error: searchError } = await supabase
        .from('Voter')
        .select('*')
        .eq('phone', contact.phone)
        .limit(1)

      if (searchError) {
        console.error('查找選民失敗:', searchError)
      } else if (existingVoters && existingVoters.length > 0) {
        const existingVoter = existingVoters[0]
        console.log('找到已存在的選民:', existingVoter)
        
        // 更新姓名和 updated_at（如果不同）
        if (existingVoter.name !== contact.name) {
          try {
            const { data: updatedVoter, error: updateError } = await supabase
              .from('Voter')
              .update({ 
                name: contact.name,
                updated_at: new Date().toISOString()
              })
              .eq('id', existingVoter.id)
              .select()
              .single()

            if (updateError) {
              console.error('更新選民資料失敗:', updateError)
              return { success: true, data: existingVoter }
            }

            return { success: true, data: updatedVoter }
          } catch (updateError) {
            console.error('更新選民資料異常:', updateError)
            return { success: true, data: existingVoter }
          }
        }

        return { success: true, data: existingVoter }
      }

      // 建立新選民
      console.log('建立新選民:', contact)
      const { data: newVoter, error: createError } = await supabase
        .from('Voter')
        .insert([{
          name: contact.name,
          phone: contact.phone,
          created_at: new Date().toISOString()
        }])
        .select()
        .single()

      if (createError) {
        console.error('建立選民失敗:', createError)
        return { success: false, error: createError.message }
      }

      console.log('建立新選民成功:', newVoter)
      return { success: true, data: newVoter }

    } catch (error) {
      console.error('處理聯絡人發生錯誤:', error)
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
      .insert([{ case_id: caseId, voter_id: voterId }])
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
   * @param {string} categoryId - 類別 ID
   * @returns {Promise<Object>} 建立結果
   */
  static async createCategoryCaseRelation(caseId, categoryId) {
    const { data, error } = await supabase
      .from('CategoryCase')
      .insert([{ case_id: caseId, category_id: categoryId }])
      .select()

    if (error) {
      console.error('建立 CategoryCase 關聯失敗:', error)
      throw error
    }

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
      .insert([{ case_id: caseId, district_id: districtId }])
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
      .insert([{ voter_id: voterId, district_id: districtId }])
      .select()

    if (error) {
      console.error('建立 VoterDistrict 關聯失敗:', error)
      throw error
    }

    return data
  }

  /**
   * 建立 InChargeCase 關聯
   * @param {string} caseId - 案件 ID
   * @param {string} memberId - 成員 ID
   * @param {string} role - 角色 (receiver, handler)
   * @returns {Promise<Object>} 建立結果
   */
  static async createInChargeCaseRelation(caseId, memberId, role = 'handler') {
    const { data, error } = await supabase
      .from('InChargeCase')
      .insert([{ case_id: caseId, member_id: memberId }])
      .select()

    if (error) {
      console.error('建立 InChargeCase 關聯失敗:', error)
      throw error
    }

    return data
  }

  /**
   * 取得案件統計資訊
   * @param {string} groupId - 團隊 ID
   * @returns {Promise<Object>} 統計資訊
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

      const { data, error } = await supabase
        .from('Case')
        .select('status, priority')
        .eq('group_id', groupId)

      if (error) {
        console.error('查詢案件統計失敗:', error)
        return {
          success: false,
          error: error.message,
          data: null
        }
      }

      // 計算統計
      const stats = {
        total: data.length,
        byStatus: {
          pending: data.filter(c => c.status === 'pending').length,
          processing: data.filter(c => c.status === 'processing').length,
          completed: data.filter(c => c.status === 'completed').length
        },
        byPriority: {
          urgent: data.filter(c => c.priority === 'urgent').length,
          normal: data.filter(c => c.priority === 'normal').length,
          low: data.filter(c => c.priority === 'low').length
        }
      }

      console.log('統計資料:', stats)

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
   * 輔助方法：將類別 ID 轉換為類別名稱
   * @param {string} categoryId - 類別 ID
   * @returns {string} 類別名稱
   */
  static getCategoryName(categoryId) {
    const categoryMap = {
      'traffic': '交通問題',
      'environment': '環境問題',
      'security': '治安問題',
      'public_service': '民生服務'
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
      'urgent': '緊急',
      'normal': '一般',
      'low': '低'
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
      'completed': '已完成'
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
      'line': 'Line',
      'facebook': 'Facebook',
      'email': 'Email',
      'in_person': '現場',
      'other': '其他'
    }
    return contactTypeMap[contactType] || contactType
  }

  /**
   * 輔助方法：格式化時間戳記為可讀格式
   * @param {string} timestamp - 時間戳記字串
   * @returns {string} 格式化後的時間
   */
  static formatTimestamp(timestamp) {
    if (!timestamp) return ''
    
    try {
      const date = new Date(timestamp)
      return date.toLocaleString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    } catch (error) {
      console.error('時間格式化失敗:', error)
      return timestamp
    }
  }

  /**
   * 輔助方法：格式化 timetz 為可讀格式
   * @param {string} timetz - timetz 格式字串
   * @returns {string} 格式化後的時間
   */
  static formatTimetz(timetz) {
    if (!timetz) return ''
    
    try {
      // timetz 格式: HH:MM:SS+00
      const timePart = timetz.split('+')[0] || timetz.split('-')[0]
      const [hours, minutes] = timePart.split(':')
      return `${hours}:${minutes}`
    } catch (error) {
      console.error('timetz 格式化失敗:', error)
      return timetz
    }
  }

  /**
   * 輔助方法：從案件資料中提取關鍵資訊
   * @param {Object} caseData - 案件資料
   * @returns {Object} 提取的關鍵資訊
   */
  static extractCaseInfo(caseData) {
    if (!caseData) return {}

    // 提取聯絡人資訊
    const contacts = caseData.VoterCase || []
    const primaryContact = contacts.length > 0 ? contacts[0].Voter : null

    // 提取類別資訊
    const categories = caseData.CategoryCase || []
    const primaryCategory = categories.length > 0 ? categories[0].Category : null

    // 提取負責人資訊
    const inCharge = caseData.InChargeCase || []
    const primaryHandler = inCharge.length > 0 ? inCharge[0].Member : null

    // 提取地點資訊
    const districts = caseData.DistrictCase || []
    const primaryDistrict = districts.length > 0 ? districts[0].District : null

    return {
      id: caseData.id,
      caseNumber: this.extractCaseNumber(caseData.description),
      title: caseData.title,
      description: caseData.description,
      status: caseData.status,
      priority: caseData.priority,
      contactType: caseData.contact_type,
      startDate: caseData.start_date,
      endDate: caseData.end_date,
      createdAt: caseData.created_at,
      updatedAt: caseData.updated_at,
      // 關聯資訊
      primaryContact: primaryContact ? {
        name: primaryContact.name,
        phone: primaryContact.phone
      } : null,
      category: primaryCategory ? {
        id: primaryCategory.id,
        name: primaryCategory.name
      } : null,
      handler: primaryHandler ? {
        id: primaryHandler.id,
        name: primaryHandler.name
      } : null,
      district: primaryDistrict ? {
        id: primaryDistrict.id,
        name: primaryDistrict.name,
        county: primaryDistrict.County ? primaryDistrict.County.name : null
      } : null
    }
  }

  /**
   * 輔助方法：從描述中提取案件編號
   * @param {string} description - 案件描述
   * @returns {string} 案件編號
   */
  static extractCaseNumber(description) {
    if (!description) return ''
    
    const match = description.match(/案件編號[：:]\s*([^\n]+)/)
    return match ? match[1].trim() : ''
  }
}