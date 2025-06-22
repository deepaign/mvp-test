// src/services/teamService.js
import { supabase } from '../supabase'

export class TeamService {
  
  // 檢查用戶是否已有團隊
  static async checkUserTeam(userId) {
    try {
      console.log('=== checkUserTeam 開始檢查 ===')
      console.log('用戶 ID:', userId)
      
      // 第一步：查詢用戶的 Member 記錄
      const { data: memberData, error: memberError } = await supabase
        .from('Member')
        .select('*')
        .eq('auth_user_id', userId)
        .eq('status', 'active')
        .maybeSingle() // 使用 maybeSingle 而不是 single

      console.log('Member 查詢結果:', { memberData, memberError })

      if (memberError) {
        console.error('查詢 Member 失敗:', memberError)
        return { hasTeam: false, error: memberError.message }
      }

      if (!memberData) {
        console.log('❌ 沒有找到活躍的 Member 記錄')
        return { hasTeam: false }
      }

      console.log('✅ 找到 Member 記錄:', {
        id: memberData.id,
        name: memberData.name,
        role: memberData.role,
        is_leader: memberData.is_leader,
        group_id: memberData.group_id,
        status: memberData.status
      })

      // 第二步：查詢對應的 Group 記錄
      const { data: groupData, error: groupError } = await supabase
        .from('Group')
        .select('*')
        .eq('id', memberData.group_id)
        .single()

      console.log('Group 查詢結果:', { groupData, groupError })

      if (groupError) {
        console.error('查詢 Group 失敗:', groupError)
        return { hasTeam: false, error: groupError.message }
      }

      if (!groupData) {
        console.log('❌ 沒有找到對應的 Group 記錄')
        return { hasTeam: false }
      }

      console.log('✅ 找到 Group 記錄:', {
        id: groupData.id,
        name: groupData.name,
        politician_name: groupData.politician_name,
        status: groupData.status
      })

      // 第三步：檢查團隊狀態
      if (groupData.status !== 'active') {
        console.log('❌ 團隊狀態不是 active:', groupData.status)
        return { hasTeam: false }
      }

      console.log('🎉 用戶有活躍團隊，返回成功結果')
      
      return { 
        hasTeam: true, 
        member: memberData, 
        team: groupData 
      }
      
    } catch (error) {
      console.error('checkUserTeam 異常:', error)
      return { hasTeam: false, error: error.message }
    }
  }

  // 驗證註冊碼
  static async validateRegistrationCode(registrationCode) {
    try {
      console.log('TeamService: 驗證註冊碼', registrationCode)
      
      // 查詢註冊碼，不使用 .single()
      const { data: groupRecords, error: groupError } = await supabase
        .from('Group')
        .select('*')
        .eq('registration_code', registrationCode.toUpperCase())
        .eq('code_used', false)
        .eq('status', 'pending')

      console.log('TeamService: 註冊碼驗證結果', { groupRecords, groupError })

      if (groupError || !groupRecords || groupRecords.length === 0) {
        return { 
          valid: false, 
          message: '註冊碼不存在或已被使用' 
        }
      }

      const targetGroup = groupRecords[0]

      // 添加縣市名稱
      const enrichedTeam = await this.enrichTeamWithCountyName(targetGroup)

      return { 
        valid: true, 
        team: enrichedTeam 
      }
    } catch (error) {
      console.error('TeamService: 驗證註冊碼失敗:', error)
      return { valid: false, message: '驗證失敗，請稍後重試' }
    }
  }

  // 政治人物使用註冊碼加入團隊
  static async joinTeamWithRegistrationCode(registrationCode, userId, userName, userEmail) {
    try {
      console.log('=== joinTeamWithRegistrationCode 開始 ===')
      console.log('註冊碼:', registrationCode)
      console.log('用戶ID:', userId)
      console.log('用戶名:', userName)
      
      // 先驗證註冊碼
      const validation = await this.validateRegistrationCode(registrationCode)
      if (!validation.valid) {
        console.log('❌ 註冊碼驗證失敗:', validation.message)
        return { success: false, message: validation.message }
      }

      const team = validation.team
      console.log('✅ 註冊碼驗證成功，團隊:', team.name)

      // 檢查用戶是否已經有團隊
      const { data: existingMember } = await supabase
        .from('Member')
        .select('group_id, status')
        .eq('auth_user_id', userId)
        .maybeSingle()

      if (existingMember && existingMember.status === 'active') {
        console.log('❌ 用戶已經有活躍團隊:', existingMember.group_id)
        return { success: false, message: '您已經加入其他團隊' }
      }

      console.log('✅ 用戶可以加入團隊')

      // 建立/更新成員記錄
      let memberData
      if (existingMember && existingMember.status === 'inactive') {
        // 重新激活之前的成員
        console.log('重新激活之前的成員...')
        const { data: updatedMember, error: updateError } = await supabase
          .from('Member')
          .update({
            group_id: team.id,
            name: userName,
            email: userEmail,
            role: 'politician',
            is_leader: true,
            status: 'active',
            updated_at: new Date().toISOString()
          })
          .eq('auth_user_id', userId)
          .select()
          .single()

        if (updateError) throw updateError
        memberData = updatedMember
      } else {
        // 建立新成員記錄
        console.log('建立新成員記錄...')
        const { data: newMember, error: memberError } = await supabase
          .from('Member')
          .insert({
            auth_user_id: userId,
            group_id: team.id,
            name: userName,
            email: userEmail,
            role: 'politician',
            is_leader: true,
            status: 'active'
          })
          .select()
          .single()

        if (memberError) throw memberError
        memberData = newMember
      }

      console.log('✅ 成員記錄已建立/更新:', memberData.id)

      // 更新團隊狀態
      const { error: teamError } = await supabase
        .from('Group')
        .update({
          code_used: true,
          code_used_at: new Date().toISOString(),
          leader_id: memberData.id,
          status: 'active'
        })
        .eq('id', team.id)

      if (teamError) throw teamError

      console.log('✅ 團隊狀態已更新')

      return { 
        success: true, 
        member: memberData, 
        team: team,
        message: `成功加入 ${team.name}` 
      }
    } catch (error) {
      console.error('加入團隊失敗:', error)
      return { success: false, message: '加入團隊失敗，請稍後重試' }
    }
  }

  // 驗證邀請碼
  static async validateInviteCode(inviteCode) {
    try {
      // 查詢邀請碼，不使用 .single()
      const { data: invitationRecords, error: inviteError } = await supabase
        .from('TeamInvitation')
        .select('*')
        .eq('invite_code', inviteCode.toUpperCase())
        .eq('status', 'active')

      if (inviteError || !invitationRecords || invitationRecords.length === 0) {
        return { 
          valid: false, 
          message: '邀請碼不存在或已失效' 
        }
      }

      const targetInvitation = invitationRecords[0]

      // 檢查是否過期
      if (new Date() > new Date(targetInvitation.expires_at)) {
        return { valid: false, message: '邀請碼已過期' }
      }

      // 檢查使用次數
      if (targetInvitation.current_uses >= targetInvitation.max_uses) {
        return { valid: false, message: '邀請碼已達使用上限' }
      }

      // 單獨查詢團隊資訊
      const { data: teamRecords, error: teamError } = await supabase
        .from('Group')
        .select('*')
        .eq('id', targetInvitation.group_id)

      if (teamError || !teamRecords || teamRecords.length === 0) {
        return { valid: false, message: '團隊資訊異常' }
      }

      const inviteTeam = teamRecords[0]
      const enrichedTeam = await this.enrichTeamWithCountyName(inviteTeam)

      return { 
        valid: true, 
        invitation: targetInvitation,
        team: enrichedTeam 
      }
    } catch (error) {
      console.error('驗證邀請碼失敗:', error)
      return { valid: false, message: '驗證失敗，請稍後重試' }
    }
  }

  // 幕僚使用邀請碼加入團隊
  static async joinTeamWithInviteCode(inviteCode, userId, userName, userEmail) {
    try {
      console.log('=== joinTeamWithInviteCode 開始 ===')
      console.log('邀請碼:', inviteCode)
      console.log('用戶ID:', userId)
      console.log('用戶名:', userName)
      
      // 驗證邀請碼
      const validation = await this.validateInviteCode(inviteCode)
      if (!validation.valid) {
        console.log('❌ 邀請碼驗證失敗:', validation.message)
        return { success: false, message: validation.message }
      }

      const invitation = validation.invitation
      const team = validation.team
      console.log('✅ 邀請碼驗證成功，團隊:', team.name)

      // 檢查是否已經是活躍的團隊成員
      const { data: existingMember } = await supabase
        .from('Member')
        .select('id, status, group_id')
        .eq('auth_user_id', userId)
        .eq('group_id', invitation.group_id)
        .maybeSingle()

      if (existingMember && existingMember.status === 'active') {
        console.log('❌ 用戶已經是該團隊的活躍成員')
        return { success: false, message: '您已經是該團隊的活躍成員' }
      }

      let memberData

      if (existingMember && existingMember.status === 'inactive') {
        // 重新激活之前被移除的成員
        console.log('重新激活之前被移除的成員...')
        const { data: reactivatedMember, error: reactivateError } = await supabase
          .from('Member')
          .update({
            name: userName,
            email: userEmail,
            status: 'active',
            updated_at: new Date().toISOString()
          })
          .eq('id', existingMember.id)
          .select()
          .single()

        if (reactivateError) throw reactivateError
        memberData = reactivatedMember

        console.log('✅ 重新激活成員:', memberData.name)
      } else {
        // 創建新成員
        console.log('創建新幕僚成員...')
        const { data: newMember, error: memberError } = await supabase
          .from('Member')
          .insert({
            auth_user_id: userId,
            group_id: invitation.group_id,
            name: userName,
            email: userEmail,
            role: 'staff',
            is_leader: false,
            status: 'active'
          })
          .select()
          .single()

        if (memberError) throw memberError
        memberData = newMember

        console.log('✅ 創建新成員:', memberData.name)
      }

      // 更新邀請碼使用次數
      const { error: updateError } = await supabase
        .from('TeamInvitation')
        .update({
          current_uses: invitation.current_uses + 1,
          used_at: new Date().toISOString(),
          used_by: memberData.id
        })
        .eq('id', invitation.id)

      if (updateError) throw updateError

      console.log('✅ 邀請碼使用次數已更新')

      return { 
        success: true, 
        member: memberData,
        team: team,
        message: `成功加入 ${team.name}` 
      }
    } catch (error) {
      console.error('加入團隊失敗:', error)
      return { success: false, message: '加入團隊失敗，請稍後重試' }
    }
  }

  // 生成幕僚邀請碼
  static async createStaffInvitation(groupId, createdBy, hoursValid = 72) {
    try {
      // 驗證創建者是否為團隊負責人，同時獲取 member.id
      const { data: member } = await supabase
        .from('Member')
        .select('id, is_leader')  // ✅ 添加 id 字段
        .eq('auth_user_id', createdBy)
        .eq('group_id', groupId)
        .single()

      if (!member || !member.is_leader) {
        return { success: false, message: '只有團隊負責人可以邀請成員' }
      }

      const inviteCode = this.generateInviteCode()
      const expiresAt = new Date(Date.now() + hoursValid * 60 * 60 * 1000)
      
      const { data, error } = await supabase
        .from('TeamInvitation')
        .insert({
          group_id: groupId,
          invite_code: inviteCode,
          expires_at: expiresAt,
          invited_by: member.id,  // ✅ 使用 member.id 而不是 auth_user_id
          max_uses: 5,
          status: 'active'
        })
        .select()
        .single()

      if (error) {
        console.error('插入邀請記錄失敗:', error)
        throw error
      }
      
      return { 
        success: true, 
        inviteCode, 
        expiresAt,
        message: `邀請碼生成成功，${hoursValid}小時內有效` 
      }
    } catch (error) {
      console.error('生成邀請碼失敗:', error)
      return { success: false, error: error.message }
    }
  }

  // 獲取團隊成員列表
  static async getTeamMembers(groupId, userId) {
    try {
      console.log('getTeamMembers - 查詢團隊成員:', { groupId, userId })
      
      // 驗證用戶是否為團隊的活躍成員
      const { data: member, error: memberError } = await supabase
        .from('Member')
        .select('id, is_leader, status')
        .eq('auth_user_id', userId)
        .eq('group_id', groupId)
        .eq('status', 'active')
        .single()

      if (memberError) {
        console.error('getTeamMembers - 用戶驗證失敗:', memberError)
        return { success: false, message: '您不是該團隊的活躍成員' }
      }

      if (!member) {
        console.log('getTeamMembers - 用戶不是活躍成員')
        return { success: false, message: '您不是該團隊成員' }
      }

      console.log('getTeamMembers - 用戶驗證通過, is_leader:', member.is_leader)

      // 查詢所有活躍成員
      const { data: members, error } = await supabase
        .from('Member')
        .select('id, name, email, role, is_leader, created_at, status')
        .eq('group_id', groupId)
        .eq('status', 'active')
        .order('is_leader', { ascending: false })
        .order('created_at', { ascending: true })

      if (error) {
        console.error('getTeamMembers - 查詢成員失敗:', error)
        throw error
      }

      console.log(`getTeamMembers - 找到 ${members.length} 位活躍成員`)

      return { 
        success: true, 
        members,
        isLeader: member.is_leader 
      }
    } catch (error) {
      console.error('getTeamMembers - 異常:', error)
      return { success: false, message: '獲取團隊成員失敗' }
    }
  }

  // 移除團隊成員
  static async removeMember(groupId, targetMemberId, operatorUserId) {
    try {
      console.log('removeMember - 開始移除成員:', { groupId, targetMemberId, operatorUserId })
      
      // 驗證操作者權限
      const { data: operator, error: operatorError } = await supabase
        .from('Member')
        .select('id, is_leader, name, status')
        .eq('auth_user_id', operatorUserId)
        .eq('group_id', groupId)
        .eq('status', 'active')
        .single()

      if (operatorError) {
        console.error('removeMember - 查詢操作者失敗:', operatorError)
        return { success: false, message: '無法驗證操作權限' }
      }

      if (!operator || !operator.is_leader) {
        console.log('removeMember - 操作者無權限:', operator)
        return { success: false, message: '只有團隊負責人可以移除成員' }
      }

      console.log('removeMember - 操作者驗證通過:', operator.name)

      // 獲取目標成員資訊
      const { data: targetMember, error: targetError } = await supabase
        .from('Member')
        .select('id, auth_user_id, is_leader, name, status, group_id')
        .eq('id', targetMemberId)
        .single()

      if (targetError) {
        console.error('removeMember - 查詢目標成員失敗:', targetError)
        return { success: false, message: '找不到要移除的成員' }
      }

      console.log('removeMember - 目標成員資訊:', targetMember)

      // 驗證目標成員
      if (!targetMember) {
        return { success: false, message: '找不到要移除的成員' }
      }

      if (targetMember.group_id !== groupId) {
        return { success: false, message: '該成員不屬於此團隊' }
      }

      if (targetMember.auth_user_id === operatorUserId) {
        return { success: false, message: '不能移除自己' }
      }

      if (targetMember.is_leader) {
        return { success: false, message: '不能移除其他團隊負責人' }
      }

      if (targetMember.status === 'inactive') {
        return { success: false, message: '該成員已被移除' }
      }

      console.log('removeMember - 開始執行軟刪除...')

      // 執行軟刪除
      const { data: updatedMember, error: updateError } = await supabase
        .from('Member')
        .update({ 
          status: 'inactive',
          updated_at: new Date().toISOString()
        })
        .eq('id', targetMemberId)
        .select('id, name, status, updated_at')
        .single()

      if (updateError) {
        console.error('removeMember - 軟刪除失敗:', updateError)
        throw updateError
      }

      console.log('removeMember - 軟刪除成功:', updatedMember)

      // 驗證軟刪除是否成功
      const { data: verifyMember, error: verifyError } = await supabase
        .from('Member')
        .select('id, name, status')
        .eq('id', targetMemberId)
        .single()

      if (verifyError) {
        console.error('removeMember - 驗證失敗:', verifyError)
      } else {
        console.log('removeMember - 驗證結果:', verifyMember)
      }

      return { 
        success: true, 
        message: `已移除成員 ${targetMember.name}`,
        removedMember: updatedMember
      }
    } catch (error) {
      console.error('removeMember - 異常:', error)
      return { success: false, message: `移除成員失敗：${error.message}` }
    }
  }

  // 輔助方法：生成邀請碼
  static generateInviteCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let result = ''
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  // 輔助方法：獲取縣市名稱
  static async getCountyName(countyId) {
    if (!countyId) return null
    
    try {
      const { data: countyRecords, error: countyError } = await supabase
        .from('County')
        .select('name')
        .eq('id', countyId)
      
      if (countyError || !countyRecords || countyRecords.length === 0) {
        console.error('獲取縣市名稱失敗:', countyError)
        return null
      }
      
      return countyRecords[0]?.name || null
    } catch (error) {
      console.error('查詢縣市名稱異常:', error)
      return null
    }
  }

  // 輔助方法：為團隊添加縣市名稱
  static async enrichTeamWithCountyName(team) {
    if (!team) return team
    
    const countyName = await this.getCountyName(team.county)
    return {
      ...team,
      county_name: countyName || team.county // 如果查詢失敗，就顯示原 UUID
    }
  }
}