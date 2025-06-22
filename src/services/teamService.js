// src/services/teamService.js
import { supabase } from '../supabase'

export class TeamService {
  
  // 檢查用戶是否已有團隊
  static async checkUserTeam(userId) {
    try {
      console.log('TeamService: 開始檢查用戶團隊...', userId)
      
      // 先測試最簡單的查詢
      console.log('TeamService: 測試 Member 表連接...')
      const { count, error: countError } = await supabase
        .from('Member')
        .select('*', { count: 'exact', head: true })
      
      console.log('TeamService: Member 表記錄總數:', count, 'countError:', countError)
      
      if (countError) {
        console.error('TeamService: Member 表連接失敗', countError)
        return { hasTeam: false, error: countError.message }
      }
      
      // 先檢查 Member 表，不使用 .single()，也先不加狀態篩選
      console.log('TeamService: 查詢 Member 表（不加狀態篩選）...')
      const { data: allMemberRecords, error: allMemberError } = await supabase
        .from('Member')
        .select('*')
        .eq('auth_user_id', userId)

      console.log('TeamService: 所有 Member 查詢完成', { 
        allMemberRecords, 
        allMemberError,
        recordCount: allMemberRecords?.length || 0
      })

      if (allMemberError) {
        console.error('TeamService: Member 查詢錯誤', allMemberError)
        return { hasTeam: false, error: allMemberError.message }
      }

      // 如果沒有任何記錄，直接返回
      if (!allMemberRecords || allMemberRecords.length === 0) {
        console.log('TeamService: 沒有找到用戶的任何成員記錄')
        return { hasTeam: false }
      }

      // 過濾 active 狀態的記錄
      const activeMemberRecords = allMemberRecords.filter(record => record.status === 'active')
      console.log('TeamService: Active 成員記錄:', activeMemberRecords.length)

      // 檢查是否找到活躍的成員記錄
      if (activeMemberRecords.length === 0) {
        console.log('TeamService: 沒有找到活躍的用戶成員記錄')
        return { hasTeam: false }
      }

      const memberRecords = activeMemberRecords
      const memberError = null

      console.log('TeamService: Member 查詢完成', { memberRecords, memberError })

      if (memberError) {
        console.error('TeamService: Member 查詢錯誤', memberError)
        return { hasTeam: false, error: memberError.message }
      }

      // 檢查是否找到成員記錄
      if (!memberRecords || memberRecords.length === 0) {
        console.log('TeamService: 沒有找到用戶的成員記錄')
        return { hasTeam: false }
      }

      const userMember = memberRecords[0] // 取第一個記錄

      if (userMember && userMember.group_id) {
        console.log('TeamService: 找到成員記錄，查詢團隊資訊...', userMember.group_id)
        
        // 查詢團隊資訊，也不使用 .single()
        const { data: teamRecords, error: teamError } = await supabase
          .from('Group')
          .select('*')
          .eq('id', userMember.group_id)

        console.log('TeamService: 團隊查詢完成', { teamRecords, teamError })

        if (teamError) {
          console.error('TeamService: 團隊查詢錯誤', teamError)
          return { hasTeam: false, error: teamError.message }
        }

        if (teamRecords && teamRecords.length > 0) {
          const userTeam = teamRecords[0]
          console.log('TeamService: 成功找到用戶團隊', userTeam.name)
          
          // 添加縣市名稱
          const enrichedTeam = await this.enrichTeamWithCountyName(userTeam)
          
          return { 
            hasTeam: true, 
            member: userMember, 
            team: enrichedTeam 
          }
        }
      }

      console.log('TeamService: 用戶沒有團隊，返回 false')
      return { hasTeam: false }
    } catch (error) {
      console.error('TeamService: 檢查用戶團隊異常:', error)
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
      console.log('TeamService: 開始加入團隊流程...')
      
      // 先驗證註冊碼
      const validation = await this.validateRegistrationCode(registrationCode)
      if (!validation.valid) {
        return { success: false, message: validation.message }
      }

      const targetTeam = validation.team

      // 檢查用戶是否已經有團隊
      const { data: existingMembers, error: checkError } = await supabase
        .from('Member')
        .select('group_id')
        .eq('auth_user_id', userId)

      if (checkError) {
        console.error('TeamService: 檢查現有成員失敗', checkError)
        return { success: false, message: '檢查現有團隊失敗' }
      }

      if (existingMembers && existingMembers.length > 0) {
        return { success: false, message: '您已經加入其他團隊' }
      }

      console.log('TeamService: 開始建立成員記錄...')

      // 建立成員記錄
      const { data: newMemberRecords, error: memberError } = await supabase
        .from('Member')
        .insert({
          auth_user_id: userId,
          group_id: targetTeam.id,
          name: userName,
          email: userEmail,
          role: 'politician',
          is_leader: true,
          status: 'active'
        })
        .select()

      console.log('TeamService: 成員建立結果', { newMemberRecords, memberError })

      if (memberError || !newMemberRecords || newMemberRecords.length === 0) {
        console.error('TeamService: 建立成員失敗', memberError)
        return { success: false, message: '建立成員記錄失敗' }
      }

      const newMember = newMemberRecords[0]

      console.log('TeamService: 開始更新團隊狀態...')

      // 更新團隊狀態
      const { error: teamUpdateError } = await supabase
        .from('Group')
        .update({
          code_used: true,
          code_used_at: new Date().toISOString(),
          leader_id: newMember.id,
          status: 'active'
        })
        .eq('id', targetTeam.id)

      console.log('TeamService: 團隊更新結果', { teamUpdateError })

      if (teamUpdateError) {
        console.error('TeamService: 更新團隊失敗', teamUpdateError)
        // 嘗試回滾成員記錄
        await supabase.from('Member').delete().eq('id', newMember.id)
        return { success: false, message: '更新團隊狀態失敗' }
      }

      console.log('TeamService: 團隊加入成功')

      return { 
        success: true, 
        member: newMember, 
        team: targetTeam,
        message: `成功加入 ${targetTeam.name}` 
      }
    } catch (error) {
      console.error('TeamService: 加入團隊失敗:', error)
      return { success: false, message: `加入團隊失敗：${error.message}` }
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
      // 驗證邀請碼
      const validation = await this.validateInviteCode(inviteCode)
      if (!validation.valid) {
        return { success: false, message: validation.message }
      }

      const validInvitation = validation.invitation
      const inviteTeam = validation.team

      // 檢查是否已經是團隊成員
      const { data: existingMembers, error: checkError } = await supabase
        .from('Member')
        .select('id')
        .eq('auth_user_id', userId)
        .eq('group_id', validInvitation.group_id)

      if (checkError) {
        return { success: false, message: '檢查成員狀態失敗' }
      }

      if (existingMembers && existingMembers.length > 0) {
        return { success: false, message: '您已經是該團隊成員' }
      }

      // 加入團隊
      const { data: newStaffRecords, error: memberError } = await supabase
        .from('Member')
        .insert({
          auth_user_id: userId,
          group_id: validInvitation.group_id,
          name: userName,
          email: userEmail,
          role: 'staff',
          is_leader: false,
          status: 'active'
        })
        .select()

      if (memberError || !newStaffRecords || newStaffRecords.length === 0) {
        return { success: false, message: '加入團隊失敗' }
      }

      const newStaff = newStaffRecords[0]

      // 更新邀請碼使用次數
      const { error: updateError } = await supabase
        .from('TeamInvitation')
        .update({
          current_uses: validInvitation.current_uses + 1,
          used_at: new Date().toISOString(),
          used_by: newStaff.id
        })
        .eq('id', validInvitation.id)

      if (updateError) {
        console.warn('更新邀請碼使用次數失敗:', updateError)
        // 不回滾，因為成員已經成功加入
      }

      return { 
        success: true, 
        member: newStaff,
        team: inviteTeam,
        message: `成功加入 ${inviteTeam.name}` 
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
      // 驗證用戶是否為團隊成員
      const { data: userCheckRecords, error: userError } = await supabase
        .from('Member')
        .select('is_leader')
        .eq('auth_user_id', userId)
        .eq('group_id', groupId)

      if (userError || !userCheckRecords || userCheckRecords.length === 0) {
        return { success: false, message: '您不是該團隊成員' }
      }

      const requestingUser = userCheckRecords[0]

      const { data: allTeamMembers, error: membersError } = await supabase
        .from('Member')
        .select('id, name, email, role, is_leader, created_at')
        .eq('group_id', groupId)
        .eq('status', 'active')
        .order('is_leader', { ascending: false })
        .order('created_at', { ascending: true })

      if (membersError) {
        console.error('獲取團隊成員失敗:', membersError)
        return { success: false, message: '獲取團隊成員失敗' }
      }

      return { 
        success: true, 
        members: allTeamMembers || [],
        isLeader: requestingUser.is_leader 
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
      const { data: operatorCheckRecords, error: operatorError } = await supabase
        .from('Member')
        .select('is_leader')
        .eq('auth_user_id', operatorUserId)
        .eq('group_id', groupId)

      if (operatorError || !operatorCheckRecords || operatorCheckRecords.length === 0) {
        return { success: false, message: '您不是該團隊成員' }
      }

      const operatorInfo = operatorCheckRecords[0]
      if (!operatorInfo || !operatorInfo.is_leader) {
        return { success: false, message: '只有團隊負責人可以移除成員' }
      }

      // 獲取目標成員資訊
      const { data: targetCheckRecords, error: targetError } = await supabase
        .from('Member')
        .select('auth_user_id, is_leader, name')
        .eq('id', targetMemberId)

      if (targetError || !targetCheckRecords || targetCheckRecords.length === 0) {
        return { success: false, message: '找不到目標成員' }
      }

      const targetInfo = targetCheckRecords[0]

      if (targetInfo.auth_user_id === operatorUserId) {
        return { success: false, message: '不能移除自己' }
      }

      if (targetInfo.is_leader) {
        return { success: false, message: '不能移除其他團隊負責人' }
      }

      // 移除成員
      const { error: deleteError } = await supabase
        .from('Member')
        .delete()
        .eq('id', targetMemberId)

      if (deleteError) {
        console.error('移除成員失敗:', deleteError)
        return { success: false, message: '移除成員失敗' }
      }

      return { 
        success: true, 
        message: `已移除成員 ${targetInfo.name}` 
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