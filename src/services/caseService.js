// src/services/caseService.js
import { supabase } from '../supabase'

export class CaseService {
  
  // 獲取團隊案件列表
  static async getTeamCases(groupId, userId, filters = {}) {
    try {
      console.log('=== 獲取團隊案件 ===')
      console.log('團隊ID:', groupId)
      console.log('用戶ID:', userId)
      console.log('篩選條件:', filters)
      
      // 驗證用戶是否為團隊成員
      const { data: member } = await supabase
        .from('Member')
        .select('id, role, is_leader')
        .eq('auth_user_id', userId)
        .eq('group_id', groupId)
        .eq('status', 'active')
        .single()

      if (!member) {
        return { success: false, message: '您不是該團隊的成員' }
      }

      // 建構查詢
      let query = supabase
        .from('Case')
        .select(`
          *,
          Voter (
            name,
            phone,
            email
          )
        `)
        .eq('group_id', groupId)
        .order('created_at', { ascending: false })

      // 應用篩選條件
      if (filters.status && filters.status !== '全部') {
        query = query.eq('status', filters.status)
      }
      
      if (filters.category && filters.category !== '全部') {
        // 需要透過 CategoryCase 關聯表查詢
        const { data: categoryData } = await supabase
          .from('Category')
          .select('id')
          .eq('name', filters.category)
          .single()
        
        if (categoryData) {
          const { data: caseCategoryData } = await supabase
            .from('CategoryCase')
            .select('case_id')
            .eq('category_id', categoryData.id)
          
          const caseIds = caseCategoryData.map(cc => cc.case_id)
          if (caseIds.length > 0) {
            query = query.in('id', caseIds)
          }
        }
      }
      
      if (filters.priority && filters.priority !== '全部') {
        query = query.eq('priority', filters.priority)
      }
      
      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
      }

      // 分頁
      if (filters.page && filters.pageSize) {
        const from = (filters.page - 1) * filters.pageSize
        const to = from + filters.pageSize - 1
        query = query.range(from, to)
      }

      const { data: cases, error } = await query

      if (error) throw error

      // 統計數據
      const stats = {
        total: cases.length,
        pending: cases.filter(c => c.status === '待處理').length,
        processing: cases.filter(c => c.status === '處理中').length,
        completed: cases.filter(c => c.status === '已完成').length
      }

      return { 
        success: true, 
        cases: cases || [], 
        stats,
        member 
      }
    } catch (error) {
      console.error('獲取案件失敗:', error)
      return { success: false, message: '獲取案件失敗，請稍後重試' }
    }
  }

  // 新增案件
  static async createCase(caseData, userId, groupId) {
    try {
      console.log('=== 新增案件 ===')
      console.log('案件資料:', caseData)
      console.log('用戶ID:', userId)
      console.log('團隊ID:', groupId)
      
      // 驗證用戶權限
      const { data: member } = await supabase
        .from('Member')
        .select('id, role, is_leader')
        .eq('auth_user_id', userId)
        .eq('group_id', groupId)
        .eq('status', 'active')
        .single()

      if (!member) {
        return { success: false, message: '您沒有權限新增案件' }
      }

      // 準備案件資料
      const newCaseData = {
        group_id: groupId,
        title: caseData.title,
        description: caseData.description,
        status: caseData.status || '待處理',
        priority: caseData.priority || '一般',
        contact_type: caseData.contactType,
        start_date: caseData.startDate || new Date().toISOString(),
        end_date: caseData.endDate
      }

      // 插入案件
      const { data: newCase, error: caseError } = await supabase
        .from('Case')
        .insert(newCaseData)
        .select()
        .single()

      if (caseError) throw caseError

      // 如果有選民資料，建立關聯
      if (caseData.voterData && caseData.voterData.name) {
        const voterResult = await this.createOrUpdateVoter(caseData.voterData)
        if (voterResult.success) {
          // 建立案件與選民的關聯
          await supabase
            .from('VoterCase')
            .insert({
              case_id: newCase.id,
              voter_id: voterResult.voter.id
            })
        }
      }

      // 如果有類別，建立關聯
      if (caseData.categories && caseData.categories.length > 0) {
        const categoryInserts = caseData.categories.map(categoryName => ({
          case_id: newCase.id,
          category_id: categoryName // 這裡可能需要先查詢 category ID
        }))
        
        await supabase
          .from('CategoryCase')
          .insert(categoryInserts)
      }

      // 指派負責人
      if (caseData.assigneeId) {
        await supabase
          .from('InChargeCase')
          .insert({
            case_id: newCase.id,
            member_id: caseData.assigneeId
          })
      }

      return { 
        success: true, 
        case: newCase,
        message: '案件新增成功' 
      }
    } catch (error) {
      console.error('新增案件失敗:', error)
      return { success: false, message: '新增案件失敗，請稍後重試' }
    }
  }

  // 更新案件
  static async updateCase(caseId, updateData, userId, groupId) {
    try {
      console.log('=== 更新案件 ===')
      console.log('案件ID:', caseId)
      console.log('更新資料:', updateData)
      
      // 驗證用戶權限
      const { data: member } = await supabase
        .from('Member')
        .select('id, role, is_leader')
        .eq('auth_user_id', userId)
        .eq('group_id', groupId)
        .eq('status', 'active')
        .single()

      if (!member) {
        return { success: false, message: '您沒有權限更新案件' }
      }

      // 驗證案件是否屬於該團隊
      const { data: existingCase } = await supabase
        .from('Case')
        .select('id, group_id')
        .eq('id', caseId)
        .eq('group_id', groupId)
        .single()

      if (!existingCase) {
        return { success: false, message: '找不到該案件或權限不足' }
      }

      // 更新案件
      const { data: updatedCase, error } = await supabase
        .from('Case')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', caseId)
        .select()
        .single()

      if (error) throw error

      return { 
        success: true, 
        case: updatedCase,
        message: '案件更新成功' 
      }
    } catch (error) {
      console.error('更新案件失敗:', error)
      return { success: false, message: '更新案件失敗，請稍後重試' }
    }
  }

  // 獲取案件詳情
  static async getCaseDetail(caseId, userId, groupId) {
    try {
      console.log('=== 獲取案件詳情 ===')
      console.log('案件ID:', caseId)
      
      // 驗證用戶權限
      const { data: member } = await supabase
        .from('Member')
        .select('id, role, is_leader')
        .eq('auth_user_id', userId)
        .eq('group_id', groupId)
        .eq('status', 'active')
        .single()

      if (!member) {
        return { success: false, message: '您沒有權限查看案件詳情' }
      }

      // 獲取案件詳情
      const { data: caseDetail, error } = await supabase
        .from('Case')
        .select(`
          *,
          VoterCase (
            Voter (
              id, name, phone, email, address, job, education
            )
          ),
          CategoryCase (
            Category (
              id, name, description
            )
          ),
          InChargeCase (
            Member (
              id, name, email, role
            )
          ),
          Record (
            id, title, content, created_at,
            MemberRecord (
              Member (
                id, name
              )
            )
          )
        `)
        .eq('id', caseId)
        .eq('group_id', groupId)
        .single()

      if (error) throw error

      if (!caseDetail) {
        return { success: false, message: '找不到該案件' }
      }

      return { 
        success: true, 
        case: caseDetail,
        member 
      }
    } catch (error) {
      console.error('獲取案件詳情失敗:', error)
      return { success: false, message: '獲取案件詳情失敗，請稍後重試' }
    }
  }

  // 新增處理記錄
  static async addCaseRecord(caseId, recordData, userId, groupId) {
    try {
      console.log('=== 新增處理記錄 ===')
      console.log('案件ID:', caseId)
      console.log('記錄內容:', recordData)
      
      // 驗證用戶權限
      const { data: member } = await supabase
        .from('Member')
        .select('id, role, is_leader')
        .eq('auth_user_id', userId)
        .eq('group_id', groupId)
        .eq('status', 'active')
        .single()

      if (!member) {
        return { success: false, message: '您沒有權限新增記錄' }
      }

      // 驗證案件是否存在且屬於該團隊
      const { data: existingCase } = await supabase
        .from('Case')
        .select('id, group_id')
        .eq('id', caseId)
        .eq('group_id', groupId)
        .single()

      if (!existingCase) {
        return { success: false, message: '找不到該案件或權限不足' }
      }

      // 新增記錄
      const { data: newRecord, error: recordError } = await supabase
        .from('Record')
        .insert({
          case_id: caseId,
          title: recordData.title || '處理記錄',
          content: recordData.content
        })
        .select()
        .single()

      if (recordError) throw recordError

      // 建立成員與記錄的關聯
      await supabase
        .from('MemberRecord')
        .insert({
          record_id: newRecord.id,
          member_id: member.id
        })

      return { 
        success: true, 
        record: newRecord,
        message: '處理記錄新增成功' 
      }
    } catch (error) {
      console.error('新增處理記錄失敗:', error)
      return { success: false, message: '新增處理記錄失敗，請稍後重試' }
    }
  }

  // 創建或更新選民資料
  static async createOrUpdateVoter(voterData) {
    try {
      // 先檢查是否已存在該選民（以電話或 email 為準）
      let existingVoter = null
      
      if (voterData.phone) {
        const { data } = await supabase
          .from('Voter')
          .select('*')
          .eq('phone', voterData.phone)
          .maybeSingle()
        existingVoter = data
      }

      if (!existingVoter && voterData.email) {
        const { data } = await supabase
          .from('Voter')
          .select('*')
          .eq('email', voterData.email)
          .maybeSingle()
        existingVoter = data
      }

      if (existingVoter) {
        // 更新現有選民資料
        const { data: updatedVoter, error } = await supabase
          .from('Voter')
          .update({
            ...voterData,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingVoter.id)
          .select()
          .single()

        if (error) throw error
        return { success: true, voter: updatedVoter }
      } else {
        // 新增選民資料
        const { data: newVoter, error } = await supabase
          .from('Voter')
          .insert(voterData)
          .select()
          .single()

        if (error) throw error
        return { success: true, voter: newVoter }
      }
    } catch (error) {
      console.error('創建或更新選民資料失敗:', error)
      return { success: false, message: '處理選民資料失敗' }
    }
  }

  // 獲取類別列表
  static async getCategories() {
    try {
      const { data: categories, error } = await supabase
        .from('Category')
        .select('*')
        .order('name')

      if (error) throw error

      return { success: true, categories: categories || [] }
    } catch (error) {
      console.error('獲取類別列表失敗:', error)
      return { success: false, message: '獲取類別列表失敗' }
    }
  }

  // 生成案件編號
  static generateCaseNumber(category = 'GEN') {
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    
    // 根據類別生成前綴
    const prefixMap = {
      '交通問題': 'TRA',
      '環境問題': 'ENV',
      '治安問題': 'SEC',
      '民生服務': 'LIV',
      '法律諮詢': 'LAW'
    }
    
    const prefix = prefixMap[category] || 'GEN'
    return `${prefix}-${year}${month}${day}-${randomNum}`
  }
}