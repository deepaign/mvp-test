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
      console.log('🔍 驗證邀請碼:', inviteCode)
      
      // 步驟1: 先查詢邀請碼記錄（不使用 JOIN 避免 406 錯誤）
      const { data: invitationRecords, error: inviteError } = await supabase
        .from('TeamInvitation')
        .select('*')
        .eq('invite_code', inviteCode.toUpperCase())
        .eq('status', 'active')
        
      console.log('邀請碼查詢結果:', { 
        count: invitationRecords?.length, 
        records: invitationRecords, 
        error: inviteError 
      })

      if (inviteError) {
        console.error('❌ 查詢邀請碼失敗:', inviteError)
        return { valid: false, message: '邀請碼驗證失敗，請稍後重試' }
      }

      if (!invitationRecords || invitationRecords.length === 0) {
        console.log('❌ 找不到有效邀請碼')
        return { valid: false, message: '邀請碼不存在或已失效' }
      }

      const invitation = invitationRecords[0]
      console.log('✅ 找到邀請碼記錄:', invitation)

      // 步驟2: 檢查邀請碼是否過期
      const now = new Date()
      const expiresAt = new Date(invitation.expires_at)
      
      if (expiresAt < now) {
        console.log('❌ 邀請碼已過期')
        return { valid: false, message: '邀請碼已過期' }
      }

      // 步驟3: 檢查使用次數
      if (invitation.current_uses >= invitation.max_uses) {
        console.log('❌ 邀請碼已達使用上限')
        return { valid: false, message: '邀請碼已達使用上限' }
      }

      // 步驟4: 單獨查詢團隊資訊
      const { data: teamRecords, error: teamError } = await supabase
        .from('Group')
        .select('*')
        .eq('id', invitation.group_id)
        .single()

      if (teamError || !teamRecords) {
        console.error('❌ 查詢團隊資訊失敗:', teamError)
        return { valid: false, message: '團隊資訊異常' }
      }

      const team = teamRecords
      console.log('✅ 團隊資訊:', team.name)

      // 步驟5: 檢查團隊狀態
      if (team.status !== 'active') {
        console.log('❌ 團隊狀態不是 active:', team.status)
        return { valid: false, message: '該團隊目前無法接受新成員' }
      }

      console.log('✅ 驗證完成，邀請碼有效')

      return { 
        valid: true, 
        invitation: invitation,
        team: team
      }
      
    } catch (error) {
      console.error('💥 驗證邀請碼異常:', error)
      return { valid: false, message: '驗證失敗，請稍後重試' }
    }
  }

  // 幕僚使用邀請碼加入團隊
  static async joinTeamWithInviteCode(inviteCode, userId, userName, userEmail) {
    try {
      console.log('🚀 開始加入團隊流程')
      console.log('邀請碼:', inviteCode)
      console.log('用戶:', { userId, userName, userEmail })

      // 步驟1: 驗證邀請碼
      const validation = await this.validateInviteCode(inviteCode)
      if (!validation.valid) {
        console.log('❌ 邀請碼驗證失敗:', validation.message)
        return { success: false, message: validation.message }
      }

      const invitation = validation.invitation
      const team = validation.team
      console.log('✅ 邀請碼驗證成功，團隊:', team.name)

      // 步驟2: 檢查用戶是否已經是該團隊成員
      const { data: existingMember, error: checkError } = await supabase
        .from('Member')
        .select('id, status, group_id, name')
        .eq('auth_user_id', userId)
        .eq('group_id', invitation.group_id)
        .maybeSingle()

      if (checkError) {
        console.error('❌ 檢查現有成員失敗:', checkError)
        return { success: false, message: '檢查成員狀態失敗，請稍後重試' }
      }

      if (existingMember && existingMember.status === 'active') {
        console.log('❌ 用戶已經是該團隊的活躍成員')
        return { success: false, message: '您已經是該團隊的成員' }
      }

      // 步驟3: 創建或更新成員記錄
      let memberData
      
      if (existingMember) {
        // 重新啟用現有成員
        const { data: updatedMember, error: updateError } = await supabase
          .from('Member')
          .update({
            status: 'active',
            name: userName,
            email: userEmail,
            role: 'staff',  // 幕僚角色
            is_leader: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingMember.id)
          .select()
          .single()

        if (updateError) {
          console.error('❌ 更新成員記錄失敗:', updateError)
          return { success: false, message: '加入團隊失敗，請稍後重試' }
        }
        
        memberData = updatedMember
        console.log('✅ 重新啟用現有成員:', memberData.id)
        
      } else {
        // 創建新成員記錄
        const { data: newMember, error: createError } = await supabase
          .from('Member')
          .insert({
            auth_user_id: userId,
            group_id: invitation.group_id,
            name: userName,
            email: userEmail,
            role: 'staff',  // 幕僚角色
            is_leader: false,
            status: 'active'
          })
          .select()
          .single()

        if (createError) {
          console.error('❌ 創建成員記錄失敗:', createError)
          return { success: false, message: '加入團隊失敗，請稍後重試' }
        }
        
        memberData = newMember
        console.log('✅ 創建新成員記錄:', memberData.id)
      }

      // 步驟4: 更新邀請碼使用狀態
      const { error: inviteUpdateError } = await supabase
        .from('TeamInvitation')
        .update({
          current_uses: invitation.current_uses + 1,
          used_at: new Date().toISOString(),
          used_by: memberData.id
        })
        .eq('id', invitation.id)

      if (inviteUpdateError) {
        console.error('❌ 更新邀請碼狀態失敗:', inviteUpdateError)
        // 但不要因此失敗，因為成員已經創建成功
      } else {
        console.log('✅ 邀請碼使用狀態已更新')
      }

      console.log('🎉 加入團隊成功!')
      
      return { 
        success: true, 
        member: memberData,  // 確保返回完整的成員資訊
        team: team,
        message: `歡迎加入 ${team.name}！` 
      }

    } catch (error) {
      console.error('💥 加入團隊過程發生異常:', error)
      return { 
        success: false, 
        message: `加入團隊失敗：${error.message}` 
      }
    }
  }

  // 生成幕僚邀請碼
  static async createStaffInvitation(groupId, authUserId, hoursValid = 72) {
    try {
      console.log('=== createStaffInvitation 開始 ===')
      console.log('團隊ID:', groupId)
      console.log('用戶ID:', authUserId)
      console.log('有效時數:', hoursValid)
      
      // 步驟1: 驗證用戶權限（使用我們的 RPC 函數）
      const { data: membershipInfo, error: membershipError } = await supabase
        .rpc('get_user_membership_info')

      if (membershipError) {
        console.error('❌ 檢查用戶權限失敗:', membershipError)
        return { success: false, message: '檢查權限失敗' }
      }

      console.log('用戶成員資訊:', membershipInfo)

      // 檢查是否有權限
      if (!membershipInfo || Object.keys(membershipInfo).length === 0) {
        return { success: false, message: '您不是任何團隊的成員' }
      }

      if (!membershipInfo.is_leader) {
        return { success: false, message: '只有團隊負責人可以生成邀請碼' }
      }

      if (membershipInfo.group_id !== groupId) {
        return { success: false, message: '您不能為其他團隊生成邀請碼' }
      }

      console.log('✅ 權限驗證通過，開始生成邀請碼')

      // 步驟2: 生成邀請碼
      const inviteCode = this.generateInviteCode()
      const expiresAt = new Date(Date.now() + hoursValid * 60 * 60 * 1000)
      
      console.log('邀請碼:', inviteCode)
      console.log('過期時間:', expiresAt.toISOString())

      // 步驟3: 創建邀請記錄
      const { data, error } = await supabase
        .from('TeamInvitation')
        .insert({
          group_id: groupId,
          invite_code: inviteCode,
          expires_at: expiresAt.toISOString(),
          invited_by: membershipInfo.member_id, // 使用從 RPC 獲取的 member_id
          max_uses: 1,
          current_uses: 0,
          status: 'active'
        })
        .select()
        .single()

      if (error) {
        console.error('❌ 插入邀請記錄失敗:', error)
        
        // 處理特定錯誤
        if (error.code === '23505') { // 唯一約束違反
          return { success: false, message: '邀請碼生成衝突，請重試' }
        }
        
        return { success: false, message: `生成邀請碼失敗：${error.message}` }
      }

      console.log('✅ 邀請碼生成成功:', data)

      return { 
        success: true, 
        inviteCode,
        expiresAt: expiresAt.toISOString(),
        message: `邀請碼生成成功，${hoursValid}小時內有效`
      }

    } catch (error) {
      console.error('💥 生成邀請碼異常:', error)
      return { 
        success: false, 
        message: `生成邀請碼失敗：${error.message}` 
      }
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