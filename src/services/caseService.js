// services/caseService.js
import { supabase } from '../supabase'

export class CaseService {
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

      // 目前返回預設類別，未來可以從資料庫載入
      const defaultCategories = [
        { id: 'traffic', name: '交通問題' },
        { id: 'environment', name: '環境問題' },
        { id: 'security', name: '治安問題' },
        { id: 'public_service', name: '民生服務' }
      ]

      // TODO: 從資料庫載入動態類別
      /*
      const { data: dbCategories, error } = await supabase
        .from('Category')
        .select('id, name, description')
        .order('name')

      if (error) {
        console.error('載入類別失敗:', error)
        return {
          success: false,
          error: error.message,
          data: defaultCategories // 失敗時返回預設類別
        }
      }

      const allCategories = [...defaultCategories, ...(dbCategories || [])]
      */

      return {
        success: true,
        data: defaultCategories,
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
          CaseMember (
            Member (
              id,
              name,
              role
            ),
            role
          ),
          CaseVoter (
            participation_type,
            feedback,
            created_at
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
   * 創建新案件
   * @param {Object} caseData - 案件資料
   * @returns {Promise<Object>} 創建結果
   */
  static async createCase(caseData) {
    try {
      console.log('=== CaseService.createCase ===')
      console.log('案件資料:', caseData)

      const {
        group_id,
        title,
        description,
        priority = 'normal',
        status = 'pending',
        contact_type,
        categories = [],
        assignees = []
      } = caseData

      if (!group_id || !title) {
        return {
          success: false,
          error: '團隊 ID 和標題必填',
          data: null
        }
      }

      // 創建案件
      const { data: newCase, error: caseError } = await supabase
        .from('Case')
        .insert([{
          group_id,
          title,
          description,
          priority,
          status,
          contact_type,
          start_date: new Date().toISOString()
        }])
        .select()
        .single()

      if (caseError) {
        console.error('創建案件失敗:', caseError)
        return {
          success: false,
          error: caseError.message,
          data: null
        }
      }

      // 關聯類別
      if (categories.length > 0) {
        const categoryRelations = categories.map(categoryId => ({
          case_id: newCase.id,
          category_id: categoryId
        }))

        const { error: categoryError } = await supabase
          .from('CategoryCase')
          .insert(categoryRelations)

        if (categoryError) {
          console.error('關聯類別失敗:', categoryError)
        }
      }

      // 指派負責人
      if (assignees.length > 0) {
        const assigneeRelations = assignees.map(memberId => ({
          case_id: newCase.id,
          member_id: memberId
        }))

        const { error: assigneeError } = await supabase
          .from('InChargeCase')
          .insert(assigneeRelations)

        if (assigneeError) {
          console.error('指派負責人失敗:', assigneeError)
        }
      }

      console.log('案件創建成功:', newCase.id)

      return {
        success: true,
        data: newCase,
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
}