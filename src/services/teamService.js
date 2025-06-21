// src/services/teamService.js
import { supabase } from '../supabase'

export class TeamService {
  
  // 檢查用戶是否已有團隊
  static async checkUserTeam(userId) {
    try {
      const { data: member, error } = await supabase
        .from('Member')
        .select(`
          *,
          group:Group(*)
        `)
        .eq('auth_user_id', userId)
        .eq('status', 'active')
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        throw error
      }

      if (member && member.group) {
        return { 
          hasTeam: true, 
          member, 
          team: member.group 
        }
      } else {
        return { hasTeam: false }
      }
    } catch (error) {
      console.error('檢查用戶團隊失敗:', error)
      return { hasTeam: false, error: error.message }
    }
  }

  // 驗證註冊碼
  static async validateRegistrationCode(registrationCode) {
    try {
      const { data, error } = await supabase
        .from('Group')
        .select('*')
        .eq('registration_code', registrationCode.toUpperCase())
        .eq('code_used', false)
        .eq('status', 'pending')
        .single()

      if (error || !data) {
        return { 
          valid: false, 
          message: '註冊碼不存在或已被使用' 
        }
      }

      return { 
        valid: true, 
        team: data 
      }
    } catch (error) {
      console.error('驗證註冊碼失敗:', error)
      return { valid: false, message: '驗證失敗，請稍後重試' }
    }
  }

  // 政治人物使用註冊碼加入團隊
  static async joinTeamWithRegistrationCode(registrationCode, userId, userName, userEmail) {
    try {
      // 先驗證註冊碼
      const validation = await this.validateRegistrationCode(registrationCode)
      if (!validation.valid) {
        return { success: false, message: validation.message }
      }

      const team = validation.team

      // 檢查用戶是否已經有團隊
      const { data: existingMember } = await supabase
        .from('Member')
        .select('group_id')
        .eq('auth_user_id', userId)
        .single()

      if (existingMember && existingMember.group_id) {
        return { success: false, message: '您已經加入其他團隊' }
      }

      // 建立成員記錄
      const { data: memberData, error: memberError } = await supabase
        .from('Member')
        .upsert({
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
      const { data: invitation, error } = await supabase
        .from('TeamInvitation')
        .select(`
          *,
          group:Group(*)
        `)
        .eq('invite_code', inviteCode.toUpperCase())
        .eq('status', 'active')
        .single()

      if (error || !invitation) {
        return { 
          valid: false, 
          message: '邀請碼不存在或已失效' 
        }
      }

      // 檢查是否過期
      if (new Date() > new Date(invitation.expires_at)) {
        return { valid: false, message: '邀請碼已過期' }
      }

      // 檢查使用次數
      if (invitation.current_uses >= invitation.max_uses) {
        return { valid: false, message: '邀請碼已達使用上限' }
      }

      return { 
        valid: true, 
        invitation,
        team: invitation.group 
      }
    } catch (error) {
      console.error('驗證邀請碼失敗:', error)
      return { valid: false, message: '驗證失敗，請稍後重試' }
    }
  }

  // 幕僚使用邀請碼加入團隊
  static async joinTeamWithInviteCode(inviteCode, userId, userName, userEmail) {
    try {
      // 驗證邀請碼
      const validation = await this.validateInviteCode(inviteCode)
      if (!validation.valid) {
        return { success: false, message: validation.message }
      }

      const invitation = validation.invitation
      const team = validation.team

      // 檢查是否已經是團隊成員
      const { data: existingMember } = await supabase
        .from('Member')
        .select('id')
        .eq('auth_user_id', userId)
        .eq('group_id', invitation.group_id)
        .single()

      if (existingMember) {
        return { success: false, message: '您已經是該團隊成員' }
      }

      // 加入團隊
      const { data: memberData, error: memberError } = await supabase
        .from('Member')
        .upsert({
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
      // 驗證創建者是否為團隊負責人
      const { data: member } = await supabase
        .from('Member')
        .select('is_leader')
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
          invited_by: createdBy,
          max_uses: 5,
          status: 'active'
        })
        .select()
        .single()

      if (error) throw error
      
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
      // 驗證用戶是否為團隊成員
      const { data: member } = await supabase
        .from('Member')
        .select('is_leader')
        .eq('auth_user_id', userId)
        .eq('group_id', groupId)
        .single()

      if (!member) {
        return { success: false, message: '您不是該團隊成員' }
      }

      const { data: members, error } = await supabase
        .from('Member')
        .select('id, name, email, role, is_leader, created_at')
        .eq('group_id', groupId)
        .eq('status', 'active')
        .order('is_leader', { ascending: false })
        .order('created_at', { ascending: true })

      if (error) throw error

      return { 
        success: true, 
        members,
        isLeader: member.is_leader 
      }
    } catch (error) {
      console.error('獲取團隊成員失敗:', error)
      return { success: false, message: '獲取團隊成員失敗' }
    }
  }

  // 移除團隊成員
  static async removeMember(groupId, targetMemberId, operatorUserId) {
    try {
      // 驗證操作者權限
      const { data: operator } = await supabase
        .from('Member')
        .select('is_leader')
        .eq('auth_user_id', operatorUserId)
        .eq('group_id', groupId)
        .single()

      if (!operator || !operator.is_leader) {
        return { success: false, message: '只有團隊負責人可以移除成員' }
      }

      // 獲取目標成員資訊
      const { data: targetMember } = await supabase
        .from('Member')
        .select('auth_user_id, is_leader, name')
        .eq('id', targetMemberId)
        .single()

      if (targetMember.auth_user_id === operatorUserId) {
        return { success: false, message: '不能移除自己' }
      }

      if (targetMember.is_leader) {
        return { success: false, message: '不能移除其他團隊負責人' }
      }

      // 移除成員
      const { error } = await supabase
        .from('Member')
        .delete()
        .eq('id', targetMemberId)

      if (error) throw error

      return { 
        success: true, 
        message: `已移除成員 ${targetMember.name}` 
      }
    } catch (error) {
      console.error('移除成員失敗:', error)
      return { success: false, message: '移除成員失敗，請稍後重試' }
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
}