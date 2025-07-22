// src/services/teamService.js
import { supabase } from '../supabase'

export class TeamService {
  
  // 檢查用戶是否已有團隊
  static async checkUserTeam(userId) {
    console.log('=== checkUserTeam 開始檢查 ===')
    console.log('用戶 ID:', userId)

    try {
      // 首先檢查是否有團隊成員身份
      const { data: hasTeam, error: hasTeamError } = await supabase.rpc('has_team_membership')

      if (hasTeamError) {
        console.log('檢查成員身份失敗:', hasTeamError)
        return { hasTeam: false, error: hasTeamError.message }
      }

      console.log('是否有團隊成員身份:', hasTeam)

      if (!hasTeam) {
        console.log('ℹ️  用戶尚未加入任何團隊')
        return { hasTeam: false }
      }

      // 獲取詳細的成員資訊
      const { data: memberInfo, error: memberError } = await supabase.rpc('get_user_membership_info')

      if (memberError) {
        console.log('獲取成員詳細資訊失敗:', memberError)
        return { hasTeam: false, error: memberError.message }
      }

      console.log('成員詳細資訊:', memberInfo)

      if (memberInfo && Object.keys(memberInfo).length > 0) {
        console.log('✅ 用戶已加入團隊:', memberInfo.group_name)
        
        return {
          hasTeam: true,
          member: {
            id: memberInfo.member_id,
            group_id: memberInfo.group_id,
            is_leader: memberInfo.is_leader,
            status: memberInfo.status,
            role: memberInfo.role,
            name: memberInfo.member_name
          },
          team: {  // 改為 team，匹配 App.js 的期望
            id: memberInfo.group_id,
            name: memberInfo.group_name,
            politician_name: memberInfo.politician_name
          }
        }
      } else {
        console.log('ℹ️  用戶尚未加入任何團隊')
        return { hasTeam: false }
      }

    } catch (error) {
      console.error('💥 檢查團隊異常:', error)
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
      console.log('🔍 驗證邀請碼:', inviteCode.toUpperCase())
      
      const { data, error } = await supabase
        .from('TeamInvitation')
        .select(`
          id,
          group_id,
          expires_at,
          status,
          max_uses,
          current_uses,
          Group:group_id (
            id,
            name,
            politician_name,
            status
          )
        `)
        .eq('invite_code', inviteCode.toUpperCase())
        .eq('status', 'active')
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return { valid: false, message: '邀請碼不存在或已失效' }
        }
        console.error('❌ 查詢邀請碼失敗:', error)
        return { valid: false, message: '驗證邀請碼時發生錯誤' }
      }

      // 檢查邀請碼是否過期
      const now = new Date()
      const expiresAt = new Date(data.expires_at)
      
      if (expiresAt < now) {
        return { valid: false, message: '邀請碼已過期' }
      }

      // 檢查使用次數
      if (data.current_uses >= data.max_uses) {
        return { valid: false, message: '邀請碼已達使用上限' }
      }

      // 檢查團隊狀態
      if (data.Group.status !== 'active') {
        return { valid: false, message: '該團隊目前無法接受新成員' }
      }

      return { 
        valid: true, 
        invitation: data,
        team: data.Group
      }

    } catch (error) {
      console.error('💥 驗證邀請碼異常:', error)
      return { valid: false, message: '驗證邀請碼時發生異常' }
    }
  }

  // 幕僚使用邀請碼加入團隊
  static async joinTeamWithInviteCode(inviteCode, userId, userName, userEmail) {
    try {
      console.log('🚀 開始加入團隊流程')
      console.log('邀請碼:', inviteCode.toUpperCase())
      console.log('用戶:', { userId, userName, userEmail })

      // 步驟1: 驗證邀請碼
      const validation = await this.validateInviteCode(inviteCode)
      
      if (!validation.valid) {
        return { success: false, message: validation.message }
      }

      const { invitation, team } = validation

      // 步驟2: 檢查用戶是否已經是該團隊成員
      const existingCheck = await this.checkUserTeam(userId)
      
      if (existingCheck.hasTeam && existingCheck.group.id === invitation.group_id) {
        console.log('❌ 用戶已經是該團隊的活躍成員')
        return { success: false, message: '您已經是該團隊的成員' }
      }

      // 步驟3: 使用 RPC 調用加入團隊
      const { data: rpcResult, error: rpcError } = await supabase.rpc('join_team_with_invite', {
        p_invite_code: inviteCode.toUpperCase(),
        p_user_id: userId,
        p_user_name: userName,
        p_user_email: userEmail,
        p_invitation_id: invitation.id,
        p_group_id: invitation.group_id
      })

      if (rpcError) {
        console.error('❌ 加入團隊失敗:', rpcError)
        return { success: false, message: `加入團隊失敗：${rpcError.message}` }
      }

      console.log('✅ 成功加入團隊:', rpcResult)
      
      return { 
        success: true, 
        team: team,
        message: `歡迎加入 ${team.name}！` 
      }

    } catch (error) {
      console.error('❌ 加入團隊過程發生異常:', error)
      return { 
        success: false, 
        message: `加入團隊失敗：${error.message}` 
      }
    }
  }

  // 生成幕僚邀請碼
  static async createStaffInvitation(groupId, createdBy, hoursValid = 72) {
    try {
      // 驗證創建者是否為團隊負責人，同時獲取 member.id
      const { data: member } = await supabase
        .from('Member')
        .select('id, is_leader')
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
          invited_by: member.id,
          max_uses: 1,  // 🔧 修改：設為一次性使用
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
        message: `邀請碼生成成功，${hoursValid}小時內有效，僅可使用一次` // 更新訊息
      }
    } catch (error) {
      console.error('生成邀請碼失敗:', error)
      return { success: false, error: error.message }
    }
  }

  // 獲取團隊成員列表
  static async getTeamMembers() {
    try {
      console.log('=== 獲取團隊成員列表 ===')
      
      const { data, error } = await supabase.rpc('get_team_members_list')
      
      if (error) {
        console.error('❌ 獲取團隊成員失敗:', error)
        return { success: false, data: [], error: error.message }
      }

      // data 是 JSON 陣列，需要解析
      const members = Array.isArray(data) ? data : []
      console.log('✅ 獲取團隊成員成功:', members)
      return { success: true, data: members, error: null }
      
    } catch (err) {
      console.error('💥 獲取團隊成員異常:', err)
      return { success: false, data: [], error: err.message }
    }
  }

  // 移除團隊成員
  static async removeMember(groupId, memberId, operatorAuthUserId) {
    try {
      console.log('=== 使用 RPC 函數移除成員（詳細版本）===');
      console.log('📋 參數檢查:');
      console.log('  團隊ID:', groupId);
      console.log('  成員ID:', memberId);
      console.log('  操作者ID:', operatorAuthUserId);
      
      // 驗證參數
      if (!memberId) {
        const error = '成員ID不能為空';
        console.error('❌', error);
        return { success: false, message: error };
      }
      
      console.log('📋 開始調用 RPC 函數...');
      
      // 調用 RPC 函數
      const { data, error } = await supabase.rpc('test_remove_with_rls_disabled', {
        target_member_id: memberId
      });
      
      console.log('📋 RPC 調用完成:');
      console.log('  數據:', data);
      console.log('  錯誤:', error);
      
      if (error) {
        console.error('❌ RPC 調用失敗:', error);
        return { 
          success: false, 
          message: `RPC 調用失敗: ${error.message}` 
        };
      }
      
      // 檢查 RPC 函數的返回結果
      if (!data) {
        console.error('❌ RPC 函數沒有返回數據');
        return {
          success: false,
          message: 'RPC 函數沒有返回數據'
        };
      }
      
      console.log('📋 RPC 函數返回結果:', data);
      
      if (data.success) {
        console.log('✅ 成員移除成功:', data.message);
        return {
          success: true,
          message: data.message || '成員已成功移除'
        };
      } else {
        console.log('❌ 成員移除失敗:', data.message);
        return {
          success: false,
          message: data.message || '移除失敗'
        };
      }
      
    } catch (error) {
      console.error('❌ 移除成員異常:', error);
      console.error('❌ 異常詳情:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      
      return { 
        success: false, 
        message: `移除成員失敗：${error.message}` 
      };
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