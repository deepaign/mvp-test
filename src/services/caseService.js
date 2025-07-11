.select()
        .single()

      if (error) {
        console.error('建立受理人員關聯失敗:', error)
        return { success: false, error: error.message }
      }

      console.log('受理人員關聯建立成功')
      return { success: true, data }

    } catch (error) {
      console.error('建立受理人員關聯發生錯誤:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 建立事發地點關聯
   * @param {string} caseId - 案件 ID
   * @param {string} districtId - 行政區 ID
   * @returns {Promise<Object>} 建立結果
   */
  static async createDistrictCaseRelation(caseId, districtId) {
    try {
      console.log('=== 建立事發地點關聯 ===')

      const { data, error } = await supabase
        .from('DistrictCase')
        .insert({
          case_id: caseId,
          district_id: districtId
        })
        .select()
        .single()

      if (error) {
        console.error('建立事發地點關聯失敗:', error)
        return { success: false, error: error.message }
      }

      console.log('事發地點關聯建立成功')
      return { success: true, data }

    } catch (error) {
      console.error('建立事發地點關聯發生錯誤:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 建立案件成員關聯
   * @param {string} caseId - 案件 ID
   * @param {string} memberId - 成員 ID
   * @param {string} role - 角色 (handler/receiver)
   * @returns {Promise<Object>} 建立結果
   */
  static async createCaseMemberRelation(caseId, memberId, role) {
    try {
      console.log('=== 建立案件成員關聯 ===')

      const { data, error } = await supabase
        .from('CaseMember')
        .insert({
          case_id: caseId,
          member_id: memberId,
          role: role
        })
        .select()
        .single()

      if (error) {
        console.error('建立案件成員關聯失敗:', error)
        return { success: false, error: error.message }
      }

      console.log('案件成員關聯建立成功')
      return { success: true, data }

    } catch (error) {
      console.error('建立案件成員關聯發生錯誤:', error)
      return { success: false, error: error.message }
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

      // 2. 處理聯絡人2（選擇性）
      let contact2Result = null
      if (formData.contact2Name && formData.contact2Phone) {
        contact2Result = await this.handleContact({
          name: formData.contact2Name,
          phone: formData.contact2Phone
        }, dropdownOptions, formData.homeDistrict)

        if (!contact2Result.success) {
          console.warn('處理聯絡人2失敗，繼續建立案件:', contact2Result.error)
        }
      }

      // 3. 建立主案件記錄
      const caseDescription = this.buildCaseDescription(formData, dropdownOptions)
      
      const caseData = {
        title: formData.title,
        description: caseDescription,
        status: formData.processingStatus || 'pending',
        priority: formData.priority || 'normal',
        contact_type: formData.contactMethod || 'phone',
        received_at: this.formatToTimetz(formData.receivedDate, formData.receivedTime),
        closed_at: this.formatToTimetz(formData.closedDate, formData.closedTime),
        group_id: teamId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      // 移除空值
      Object.keys(caseData).forEach(key => {
        if (caseData[key] === null || caseData[key] === undefined) {
          delete caseData[key]
        }
      })

      console.log('準備建立案件:', caseData)

      const { data: newCase, error: caseError } = await supabase
        .from('Case')
        .insert(caseData)
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

      // 4. 建立關聯資料
      const relationResults = []

      // 4.1 聯絡人1關聯（必要）
      const contact1RelationResult = await this.createVoterCaseRelation(newCase.id, contact1Result.data.id)
      relationResults.push({ type: 'VoterCase-Contact1', success: contact1RelationResult.success, data: contact1RelationResult.data, error: contact1RelationResult.error })

      // 4.2 聯絡人2關聯（選擇性）
      if (contact2Result && contact2Result.success) {
        const contact2RelationResult = await this.createVoterCaseRelation(newCase.id, contact2Result.data.id)
        relationResults.push({ type: 'VoterCase-Contact2', success: contact2RelationResult.success, data: contact2RelationResult.data, error: contact2RelationResult.error })
      }

      // 4.3 案件類別關聯
      let categoryResult = null
      if (formData.category) {
        try {
          categoryResult = await this.createCaseCategoryRelation(newCase.id, formData.category, teamId)
          relationResults.push({ type: 'CategoryCase', success: categoryResult.success, data: categoryResult.data, error: categoryResult.error })
        } catch (error) {
          console.warn('建立案件類別關聯失敗:', error)
          relationResults.push({ type: 'CategoryCase', success: false, error: error.message })
        }
      }

      // 4.4 受理人員關聯
      if (formData.receiver) {
        try {
          const receiverResult = await this.createAcceptanceCaseRelation(newCase.id, formData.receiver)
          relationResults.push({ type: 'AcceptanceCase', success: true, data: receiverResult })
          
          // 同時建立 CaseMember 記錄
          const caseMemberResult = await this.createCaseMemberRelation(newCase.id, formData.receiver, 'receiver')
          relationResults.push({ type: 'CaseMember-Receiver', success: true, data: caseMemberResult })
          
        } catch (error) {
          console.warn('建立受理人員關聯失敗:', error)
          relationResults.push({ type: 'AcceptanceCase', success: false, error: error.message })
        }
      }

      // 4.5 承辦人員關聯
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

      // 4.6 事發地點關聯
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
   * 更新聯絡人資料
   * @param {Object} caseData - 案件資料
   * @param {Object} originalData - 原始資料
   * @param {Object} updateResults - 更新結果
   * @param {Object} dropdownOptions - 下拉選單選項
   */
  static async updateContacts(caseData, originalData, updateResults, dropdownOptions) {
    try {
      console.log('=== 更新聯絡人資料 ===')

      // 處理聯絡人1更新
      if (caseData.contact1Name || caseData.contact1Phone) {
        if (originalData?.contact1Name !== caseData.contact1Name || 
            originalData?.contact1Phone !== caseData.contact1Phone) {
          
          const contact1Result = await this.handleContact({
            name: caseData.contact1Name,
            phone: caseData.contact1Phone
          }, {
            ...dropdownOptions,
            selectedCountyId: caseData.homeCounty
          }, caseData.homeDistrict)

          if (contact1Result.success) {
            // 先刪除舊的關聯
            await supabase
              .from('VoterCase')
              .delete()
              .eq('case_id', caseData.id)

            // 建立新的關聯
            const relationResult = await this.createVoterCaseRelation(caseData.id, contact1Result.data.id)
            updateResults.voterCases.push(relationResult.data)
          }
        }
      }

      // 處理聯絡人2更新
      if (caseData.contact2Name && caseData.contact2Phone) {
        if (originalData?.contact2Name !== caseData.contact2Name || 
            originalData?.contact2Phone !== caseData.contact2Phone) {
          
          const contact2Result = await this.handleContact({
            name: caseData.contact2Name,
            phone: caseData.contact2Phone
          }, dropdownOptions, caseData.homeDistrict)

          if (contact2Result.success) {
            const relationResult = await this.createVoterCaseRelation(caseData.id, contact2Result.data.id)
            updateResults.voterCases.push(relationResult.data)
          }
        }
      }

    } catch (error) {
      console.warn('更新聯絡人時發生錯誤:', error)
    }
  }

  /**
   * 更新案件類別
   * @param {Object} caseData - 案件資料
   * @param {Object} originalData - 原始資料
   * @param {Object} updateResults - 更新結果
   * @param {string} teamId - 團隊 ID
   */
  static async updateCaseCategory(caseData, originalData, updateResults, teamId) {
    try {
      console.log('=== 更新案件類別 ===')

      if (caseData.category && originalData?.category !== caseData.category) {
        // 刪除舊的類別關聯
        await supabase
          .from('CategoryCase')
          .delete()
          .eq('case_id', caseData.id)

        // 建立新的類別關聯
        const categoryResult = await this.createCaseCategoryRelation(caseData.id, caseData.category, teamId)
        if (categoryResult.success) {
          updateResults.categoryCase = categoryResult.data
        }
      }

    } catch (error) {
      console.warn('更新案件類別時發生錯誤:', error)
    }
  }

  /**
   * 更新受理人員
   * @param {Object} caseData - 案件資料
   * @param {Object} originalData - 原始資料
   * @param {Object} updateResults - 更新結果
   */
  static async updateAcceptanceMember(caseData, originalData, updateResults) {
    try {
      console.log('=== 更新受理人員 ===')

      if (caseData.receiver && originalData?.receiver !== caseData.receiver) {
        // 刪除舊的受理關係
        await supabase
          .from('AcceptanceCase')
          .delete()
          .eq('case_id', caseData.id)

        // 建立新的受理關係
        if (caseData.receiver) {
          const acceptanceResult = await this.createAcceptanceCaseRelation(caseData.id, caseData.receiver)
          if (acceptanceResult.success) {
            updateResults.acceptanceCase = acceptanceResult.data
          }

          // 更新 CaseMember 記錄
          await supabase
            .from('CaseMember')
            .delete()
            .eq('case_id', caseData.id)
            .eq('role', 'receiver')

          await this.createCaseMemberRelation(caseData.id, caseData.receiver, 'receiver')
        }
      }

    } catch (error) {
      console.warn('更新受理人員時發生錯誤:', error)
    }
  }

  /**
   * 更新承辦人員
   * @param {Object} caseData - 案件資料
   * @param {Object} originalData - 原始資料
   * @param {Object} updateResults - 更新結果
   */
  static async updateInChargeMember(caseData, originalData, updateResults) {
    try {
      console.log('=== 更新承辦人員 ===')

      if (caseData.handler && originalData?.handler !== caseData.handler) {
        // 刪除舊的承辦關係
        await supabase
          .from('InChargeCase')
          .delete()
          .eq('case_id', caseData.id)

        // 建立新的承辦關係
        if (caseData.handler) {
          const inChargeResult = await this.createInChargeCaseRelation(caseData.id, caseData.handler)
          if (inChargeResult.success) {
            updateResults.inChargeCase = inChargeResult.data
          }

          // 更新 CaseMember 記錄
          await supabase
            .from('CaseMember')
            .delete()
            .eq('case_id', caseData.id)
            .eq('role', 'handler')

          await this.createCaseMemberRelation(caseData.id, caseData.handler, 'handler')
        }
      }

    } catch (error) {
      console.warn('更新承辦人員時發生錯誤:', error)
    }
  }

  /**
   * 更新事發地點
   * @param {Object} caseData - 案件資料
   * @param {Object} originalData - 原始資料
   * @param {Object} updateResults - 更新結果
   */
  static async updateIncidentLocation(caseData, originalData, updateResults) {
    try {
      console.log('=== 更新事發地點 ===')

      if (caseData.incidentDistrict && originalData?.incidentDistrict !== caseData.incidentDistrict) {
        // 刪除舊的地點關聯
        await supabase
          .from('DistrictCase')
          .delete()
          .eq('case_id', caseData.id)

        // 建立新的地點關聯
        if (caseData.incidentDistrict) {
          const districtResult = await this.createDistrictCaseRelation(caseData.id, caseData.incidentDistrict)
          if (districtResult.success) {
            updateResults.districtCase = districtResult.data
          }
        }
      }

    } catch (error) {
      console.warn('更新事發地點時發生錯誤:', error)
    }
  }

  /**
   * 更新案件及相關資料
   * @param {Object} options - 更新選項
   * @param {Object} options.caseData - 案件資料
   * @param {Object} options.originalData - 原始資料
   * @param {string} options.teamId - 團隊 ID
   * @param {Object} options.dropdownOptions - 下拉選單選項
   * @returns {Promise<Object>} 更新結果
   */
  static async updateCaseWithRelations({ caseData, originalData, teamId, dropdownOptions = {} }) {
    try {
      console.log('=== CaseService.updateCaseWithRelations ===')

      if (!caseData.id || !teamId) {
        return {
          success: false,
          error: '案件 ID 和團隊 ID 必填',
          data: null
        }
      }

      // 1. 更新主要案件資料
      const updateData = {
        title: caseData.title || '',
        description: this.buildCaseDescription(caseData, dropdownOptions),
        status: caseData.processingStatus || 'pending',
        priority: caseData.priority || 'normal',
        contact_type: caseData.contactMethod || 'phone',
        received_at: this.formatToTimetz(caseData.receivedDate, caseData.receivedTime),
        closed_at: this.formatToTimetz(caseData.closedDate, caseData.closedTime),
        updated_at: new Date().toISOString()
      }

      // 移除空值
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === null || updateData[key] === undefined) {
          delete updateData[key]
        }
      })

      // 更新主要案件資料
      const { data: updatedCase, error: caseError } = await supabase
        .from('Case')
        .update(updateData)
        .eq('id', caseData.id)
        .eq('group_id', teamId)
        .select()

      if (caseError) {
        console.error('更新案件失敗:', caseError)
        return {
          success: false,
          error: caseError.message,
          data: null
        }
      }

      // 2. 初始化更新結果
      const updateResults = {
        case: updatedCase?.[0] || null,
        voterCases: [],
        categoryCase: null,
        inChargeCase: null,
        acceptanceCase: null
      }

      // 3. 處理聯絡人更新
      await this.updateContacts(caseData, originalData, updateResults, dropdownOptions)

      // 4. 處理案件類別更新
      await this.updateCaseCategory(caseData, originalData, updateResults, teamId)

      // 5. 處理受理人員更新
      await this.updateAcceptanceMember(caseData, originalData, updateResults)

      // 6. 處理承辦人員更新
      await this.updateInChargeMember(caseData, originalData, updateResults)

      // 7. 處理事發地點更新
      await this.updateIncidentLocation(caseData, originalData, updateResults)

      return {
        success: true,
        data: {
          case: updateResults.case,
          updateResults: updateResults,
          summary: `案件 "${caseData.title}" 更新成功`
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
   * 刪除案件
   * @param {string} caseId - 案件 ID
   * @param {string} groupId - 團隊 ID（權限驗證）
   * @returns {Promise<Object>} 刪除結果
   */
  static async deleteCase(caseId, groupId) {
    try {
      console.log('=== CaseService.deleteCase ===')

      if (!caseId || !groupId) {
        return {
          success: false,
          error: '案件 ID 和團隊 ID 必填',
          data: null
        }
      }

      // 由於外鍵約束，相關資料會自動刪除（CASCADE）
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
   * 搜尋案件（全文搜尋）
   * @param {string} searchTerm - 搜尋關鍵字
   * @param {string} groupId - 團隊 ID
   * @param {number} limit - 結果數量限制
   * @returns {Promise<Object>} 搜尋結果
   */
  static async searchCases(searchTerm, groupId, limit = 10) {
    try {
      console.log('=== CaseService.searchCases ===')

      if (!searchTerm || !groupId) {
        return {
          success: false,
          error: '搜尋關鍵字和團隊 ID 必填',
          data: []
        }
      }

      // 使用 PostgreSQL 的全文搜尋功能
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
        .or(`title.ilike.%${searchTerm}%, description.ilike.%${searchTerm}%`)
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

      // 🔧 確保資料是陣列
      const validData = Array.isArray(data) ? data : []
      console.log(`搜尋成功，共找到 ${validData.length} 筆案件`)

      return {
        success: true,
        data: validData,
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
   * 驗證案件資料
   * @param {Object} caseData - 案件資料
   * @returns {Object} 驗證結果
   */
  static validateCaseData(caseData) {
    const errors = []

    // 必填欄位檢查
    if (!caseData.title || caseData.title.trim() === '') {
      errors.push('案件標題為必填欄位')
    }

    if (!caseData.contact1Name || caseData.contact1Name.trim() === '') {
      errors.push('聯絡人1姓名為必填欄位')
    }

    if (!caseData.contact1Phone || caseData.contact1Phone.trim() === '') {
      errors.push('聯絡人1電話為必填欄位')
    }

    if (!caseData.receivedDate) {
      errors.push('收件日期為必填欄位')
    }

    if (!caseData.priority || !['urgent', 'normal', 'low'].includes(caseData.priority)) {
      errors.push('優先等級必須為：緊急、一般或低')
    }

    if (!caseData.contactMethod || !['phone', 'email', 'line', 'facebook', 'visit', 'letter'].includes(caseData.contactMethod)) {
      errors.push('聯絡方式格式不正確')
    }

    // 電話格式檢查
    if (caseData.contact1Phone) {
      const phoneRegex = /^[\d\-\(\)\+\s]+$/
      if (!phoneRegex.test(caseData.contact1Phone)) {
        errors.push('聯絡人1電話格式不正確')
      }
    }

    if (caseData.contact2Phone && caseData.contact2Phone.trim() !== '') {
      const phoneRegex = /^[\d\-\(\)\+\s]+$/
      if (!phoneRegex.test(caseData.contact2Phone)) {
        errors.push('聯絡人2電話格式不正確')
      }
    }

    // 日期格式檢查
    if (caseData.receivedDate) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/
      if (!dateRegex.test(caseData.receivedDate)) {
        errors.push('收件日期格式不正確，應為 YYYY-MM-DD')
      }
    }

    if (caseData.closedDate) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/
      if (!dateRegex.test(caseData.closedDate)) {
        errors.push('結案日期格式不正確，應為 YYYY-MM-DD')// src/services/caseService.js - 完整修正版本
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
          data: [] // 🔧 確保返回空陣列
        }
      }

      // 🔧 確保資料是陣列
      const validData = Array.isArray(data) ? data : []
      console.log(`載入縣市成功，共 ${validData.length} 筆`)

      return {
        success: true,
        data: validData,
        error: null
      }

    } catch (error) {
      console.error('CaseService.getCounties 發生錯誤:', error)
      return {
        success: false,
        error: error.message,
        data: [] // 🔧 確保例外時返回空陣列
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
          data: [] // 🔧 確保返回空陣列
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
          data: [] // 🔧 確保錯誤時返回空陣列
        }
      }

      // 🔧 確保資料是陣列
      const validData = Array.isArray(data) ? data : []
      console.log(`載入行政區成功，共 ${validData.length} 筆`)

      return {
        success: true,
        data: validData,
        error: null
      }

    } catch (error) {
      console.error('CaseService.getDistricts 發生錯誤:', error)
      return {
        success: false,
        error: error.message,
        data: [] // 🔧 確保例外時返回空陣列
      }
    }
  }

  /**
   * 取得團隊成員列表
   * @param {string} teamId - 團隊 ID
   * @returns {Promise<Object>} 成員列表
   */
  static async getTeamMembers(teamId) {
    try {
      console.log('=== CaseService.getTeamMembers ===')
      console.log('查詢團隊 ID:', teamId)

      if (!teamId) {
        return {
          success: false,
          error: '團隊 ID 必填',
          data: [] // 🔧 確保返回空陣列
        }
      }

      const { data, error } = await supabase
        .from('Member')
        .select('id, name, email, role')
        .eq('group_id', teamId)
        .order('name')

      if (error) {
        console.error('載入團隊成員失敗:', error)
        return {
          success: false,
          error: error.message,
          data: [] // 🔧 確保錯誤時返回空陣列
        }
      }

      // 🔧 確保資料是陣列
      const validData = Array.isArray(data) ? data : []
      console.log(`載入團隊成員成功，共 ${validData.length} 筆`)

      return {
        success: true,
        data: validData,
        error: null
      }

    } catch (error) {
      console.error('CaseService.getTeamMembers 發生錯誤:', error)
      return {
        success: false,
        error: error.message,
        data: [] // 🔧 確保例外時返回空陣列
      }
    }
  }

  /**
   * 取得案件類別列表
   * @param {string} teamId - 團隊 ID
   * @returns {Promise<Object>} 類別列表
   */
  static async getCategories(teamId) {
    try {
      console.log('=== CaseService.getCategories ===')
      console.log('查詢團隊 ID:', teamId)

      if (!teamId) {
        return {
          success: false,
          error: '團隊 ID 必填',
          data: [] // 🔧 確保返回空陣列
        }
      }

      // 先取得該團隊的自定義類別
      const { data: customCategories, error: customError } = await supabase
        .from('Category')
        .select('id, name, description')
        .eq('group_id', teamId)
        .order('name')

      // 預設類別（當沒有自定義類別時使用）
      const defaultCategories = [
        { id: 'traffic', name: '交通問題', description: '道路、停車、交通號誌等問題', isDefault: true },
        { id: 'environment', name: '環境問題', description: '環境清潔、噪音、空氣品質等問題', isDefault: true },
        { id: 'security', name: '治安問題', description: '安全、犯罪防治等問題', isDefault: true },
        { id: 'public_service', name: '民生服務', description: '政府服務、公共設施等問題', isDefault: true },
        { id: 'legal_consultation', name: '法律諮詢', description: '法律相關問題諮詢', isDefault: true },
        { id: 'social_welfare', name: '社會福利', description: '福利申請、補助等問題', isDefault: true },
        { id: 'education', name: '教育問題', description: '學校、教育相關問題', isDefault: true },
        { id: 'health', name: '醫療衛生', description: '醫療、衛生相關問題', isDefault: true },
        { id: 'housing', name: '居住問題', description: '住房、租賃相關問題', isDefault: true },
        { id: 'other', name: '其他問題', description: '其他未分類問題', isDefault: true }
      ]

      let allCategories = []

      if (customError) {
        console.warn('載入自定義類別失敗，使用預設類別:', customError)
        allCategories = defaultCategories
      } else {
        // 🔧 確保資料是陣列
        const validCustomCategories = Array.isArray(customCategories) ? customCategories : []
        
        // 合併自定義類別和預設類別
        allCategories = [
          ...validCustomCategories,
          ...defaultCategories
        ]
      }

      console.log(`載入案件類別成功，共 ${allCategories.length} 筆`)

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
          data: [] // 🔧 確保返回陣列而不是物件
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
      if (filters.status && Array.isArray(filters.status) && filters.status.length > 0) {
        query = query.in('status', filters.status)
      }

      if (filters.priority && Array.isArray(filters.priority) && filters.priority.length > 0) {
        query = query.in('priority', filters.priority)
      }

      if (filters.category && Array.isArray(filters.category) && filters.category.length > 0) {
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
              data: [] // 🔧 返回空陣列
            }
          }
        }
      }

      // 處理排序
      if (sortConfig.field && sortConfig.direction) {
        query = query.order(sortConfig.field, { ascending: sortConfig.direction === 'asc' })
      }

      // 執行查詢
      const { data, error } = await query

      if (error) {
        console.error('查詢案件失敗:', error)
        return {
          success: false,
          error: error.message,
          data: [] // 🔧 確保錯誤時返回空陣列
        }
      }

      // 🔧 確保資料是陣列
      const validData = Array.isArray(data) ? data : []
      console.log(`查詢成功，共 ${validData.length} 筆案件`)

      return {
        success: true,
        data: validData, // 🔧 直接返回陣列，不是物件
        error: null
      }

    } catch (error) {
      console.error('CaseService.getCases 發生錯誤:', error)
      return {
        success: false,
        error: error.message,
        data: [] // 🔧 確保例外時返回空陣列
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
        .select('status, priority')
        .eq('group_id', groupId)

      if (statusError) {
        console.error('取得狀態統計失敗:', statusError)
        return {
          success: false,
          error: statusError.message,
          data: null
        }
      }

      // 🔧 確保資料是陣列
      const validStatusData = Array.isArray(statusData) ? statusData : []

      // 計算統計數據
      const stats = {
        total: validStatusData.length,
        byStatus: {
          pending: validStatusData.filter(c => c.status === 'pending').length,
          processing: validStatusData.filter(c => c.status === 'processing').length,
          resolved: validStatusData.filter(c => c.status === 'resolved').length,
          completed: validStatusData.filter(c => c.status === 'completed').length,
          closed: validStatusData.filter(c => c.status === 'closed').length
        },
        byPriority: {
          urgent: validStatusData.filter(c => c.priority === 'urgent').length,
          normal: validStatusData.filter(c => c.priority === 'normal').length,
          low: validStatusData.filter(c => c.priority === 'low').length
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
        .eq('group_id', groupId) // 確保只能更新自己團隊的案件
        .select()

      if (error) {
        console.error('更新案件狀態失敗:', error)
        return {
          success: false,
          error: error.message,
          data: null
        }
      }

      console.log('案件狀態更新成功:', data)

      return {
        success: true,
        data: Array.isArray(data) ? data[0] : data,
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
   * 建立案件描述
   * @param {Object} formData - 表單資料
   * @param {Object} dropdownOptions - 下拉選單選項
   * @returns {string} 格式化的描述
   */
  static buildCaseDescription(formData, dropdownOptions = {}) {
    let description = formData.description || ''

    // 添加案件編號（如果有）
    if (formData.caseNumber) {
      description = `案件編號：${formData.caseNumber}\n\n` + description
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

      if (!contactInfo.name || !contactInfo.phone) {
        return { success: false, error: '聯絡人姓名和電話必填' }
      }

      // 檢查是否已存在相同的聯絡人
      const { data: existingVoter, error: searchError } = await supabase
        .from('Voter')
        .select('*')
        .eq('name', contactInfo.name)
        .eq('phone', contactInfo.phone)
        .maybeSingle()

      if (searchError) {
        console.error('搜尋聯絡人失敗:', searchError)
        return { success: false, error: searchError.message }
      }

      let voter = existingVoter

      // 如果聯絡人不存在，建立新的聯絡人
      if (!voter) {
        console.log('建立新聯絡人')

        // 建構地址
        let fullAddress = ''
        if (locationOptions.selectedCountyId && locationOptions.counties) {
          const selectedCounty = locationOptions.counties.find(c => c.id === locationOptions.selectedCountyId)
          if (selectedCounty) {
            fullAddress += selectedCounty.name
          }
        }

        if (selectedDistrictId && locationOptions.homeDistricts) {
          const selectedDistrict = locationOptions.homeDistricts.find(d => d.id === selectedDistrictId)
          if (selectedDistrict) {
            fullAddress += selectedDistrict.name
          }
        }

        const { data: newVoter, error: createError } = await supabase
          .from('Voter')
          .insert({
            name: contactInfo.name,
            phone: contactInfo.phone,
            address: fullAddress
          })
          .select()
          .single()

        if (createError) {
          console.error('建立聯絡人失敗:', createError)
          return { success: false, error: createError.message }
        }

        voter = newVoter
        console.log('聯絡人建立成功:', voter)
      } else {
        console.log('使用現有聯絡人:', voter)
      }

      return { success: true, data: voter }

    } catch (error) {
      console.error('處理聯絡人發生錯誤:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 建立案件聯絡人關聯
   * @param {string} caseId - 案件 ID
   * @param {string} voterId - 聯絡人 ID
   * @returns {Promise<Object>} 建立結果
   */
  static async createVoterCaseRelation(caseId, voterId) {
    try {
      console.log('=== 建立案件聯絡人關聯 ===')

      const { data, error } = await supabase
        .from('VoterCase')
        .insert({
          case_id: caseId,
          voter_id: voterId
        })
        .select()
        .single()

      if (error) {
        console.error('建立案件聯絡人關聯失敗:', error)
        return { success: false, error: error.message }
      }

      console.log('案件聯絡人關聯建立成功')
      return { success: true, data }

    } catch (error) {
      console.error('建立案件聯絡人關聯發生錯誤:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 建立案件類別關聯
   * @param {string} caseId - 案件 ID
   * @param {string} categoryName - 類別名稱
   * @param {string} teamId - 團隊 ID
   * @returns {Promise<Object>} 建立結果
   */
  static async createCaseCategoryRelation(caseId, categoryName, teamId) {
    try {
      console.log('=== 建立案件類別關聯 ===')
      console.log('案件 ID:', caseId, '類別名稱:', categoryName)

      if (!caseId || !categoryName) {
        return { success: false, error: '案件 ID 和類別名稱必填' }
      }

      // 先查找或建立類別
      let { data: category, error: categoryError } = await supabase
        .from('Category')
        .select('*')
        .eq('name', categoryName)
        .eq('group_id', teamId)
        .maybeSingle()

      if (categoryError) {
        console.error('查詢類別失敗:', categoryError)
        return { success: false, error: categoryError.message }
      }

      // 如果類別不存在，建立新類別
      if (!category) {
        const { data: newCategory, error: createCategoryError } = await supabase
          .from('Category')
          .insert({
            name: categoryName,
            group_id: teamId,
            description: `自動建立的類別: ${categoryName}`
          })
          .select()
          .single()

        if (createCategoryError) {
          console.error('建立類別失敗:', createCategoryError)
          return { success: false, error: createCategoryError.message }
        }

        category = newCategory
      }

      // 建立案件類別關聯
      const { data: relation, error: relationError } = await supabase
        .from('CategoryCase')
        .insert({
          case_id: caseId,
          category_id: category.id
        })
        .select()
        .single()

      if (relationError) {
        console.error('建立案件類別關聯失敗:', relationError)
        return { success: false, error: relationError.message }
      }

      console.log('案件類別關聯建立成功')
      return { success: true, data: { category, relation } }

    } catch (error) {
      console.error('建立案件類別關聯發生錯誤:', error)
      return { success: false, error: error.message }
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
      console.log('=== 建立承辦人員關聯 ===')

      const { data, error } = await supabase
        .from('InChargeCase')
        .insert({
          case_id: caseId,
          member_id: memberId
        })
        .select()
        .single()

      if (error) {
        console.error('建立承辦人員關聯失敗:', error)
        return { success: false, error: error.message }
      }

      console.log('承辦人員關聯建立成功')
      return { success: true, data }

    } catch (error) {
      console.error('建立承辦人員關聯發生錯誤:', error)
      return { success: false, error: error.message }
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
      console.log('=== 建立受理人員關聯 ===')

      const { data, error } = await supabase
        .from('AcceptanceCase')
        .insert({
          case_id: caseId,
          member_id: memberId
        })