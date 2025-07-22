// 創建新檔案: scripts/debugInviteCodes.js

// #!/usr/bin/env node
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import readlineSync from 'readline-sync'

dotenv.config({ path: '../.env' })

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function debugInviteCodes() {
  console.log('🔍 調試團隊邀請碼使用情況')
  console.log('====================================')
  
  try {
    // 查詢所有邀請碼
    const { data: invitations, error } = await supabase
      .from('TeamInvitation')
      .select(`
        id, 
        invite_code, 
        expires_at, 
        used_at,
        max_uses,
        current_uses,
        status,
        invited_by,
        used_by,
        group_id,
        created_at
      `)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('❌ 查詢邀請碼失敗:', error)
      return
    }
    
    if (!invitations || invitations.length === 0) {
      console.log('📭 目前沒有任何邀請碼記錄')
      return
    }
    
    console.log(`\n找到 ${invitations.length} 個邀請碼記錄：\n`)
    
    // 統計信息
    const activeCount = invitations.filter(i => i.status === 'active').length
    const exhaustedCount = invitations.filter(i => i.status === 'exhausted').length
    const expiredCount = invitations.filter(i => new Date() > new Date(i.expires_at)).length
    const usedCount = invitations.filter(i => i.used_by).length
    const buggyCount = invitations.filter(i => i.used_by && i.current_uses === 0).length
    
    console.log('📊 統計資訊：')
    console.log(`活躍邀請碼: ${activeCount}`)
    console.log(`已用完邀請碼: ${exhaustedCount}`)
    console.log(`已過期邀請碼: ${expiredCount}`)
    console.log(`已使用過的邀請碼: ${usedCount}`)
    console.log(`問題邀請碼 (已使用但 current_uses=0): ${buggyCount}`)
    console.log('------------------------------------')
    
    // 顯示邀請碼列表
    invitations.forEach((invitation, index) => {
      const isExpired = new Date() > new Date(invitation.expires_at)
      const status = invitation.status === 'active' 
        ? (isExpired ? '🟠 過期' : '🟢 活躍') 
        : '🔴 已耗盡'
      
      const buggyFlag = invitation.used_by && invitation.current_uses === 0 
        ? '⚠️ 異常' 
        : ''
      
      console.log(`\n${index + 1}. 邀請碼: ${invitation.invite_code} ${status} ${buggyFlag}`)
      console.log(`   ID: ${invitation.id}`)
      console.log(`   團隊ID: ${invitation.group_id}`)
      console.log(`   狀態: ${invitation.status}`)
      console.log(`   最大使用次數: ${invitation.max_uses}`)
      console.log(`   當前使用次數: ${invitation.current_uses}`)
      console.log(`   創建時間: ${new Date(invitation.created_at).toLocaleString()}`)
      console.log(`   過期時間: ${new Date(invitation.expires_at).toLocaleString()}`)
      
      if (invitation.used_at) {
        console.log(`   使用時間: ${new Date(invitation.used_at).toLocaleString()}`)
      }
      
      if (invitation.used_by) {
        console.log(`   使用者ID: ${invitation.used_by}`)
      }
      
      if (invitation.invited_by) {
        console.log(`   邀請人ID: ${invitation.invited_by}`)
      }
    })
    
    // 提供修復選項
    if (buggyCount > 0) {
      console.log('\n\n發現問題邀請碼，是否要修復？')
      const shouldFix = readlineSync.keyInYNStrict('修復邀請碼使用次數？')
      
      if (shouldFix) {
        await fixBuggyInvitations(invitations.filter(i => i.used_by && i.current_uses === 0))
      }
    }
    
  } catch (error) {
    console.error('❌ 調試過程發生錯誤:', error)
  }
}

async function fixBuggyInvitations(buggyInvitations) {
  console.log('\n🔧 開始修復問題邀請碼...')
  
  for (const invitation of buggyInvitations) {
    console.log(`\n修復邀請碼: ${invitation.invite_code}`)
    
    try {
      // 更新邀請碼使用次數
      const { data, error } = await supabase
        .from('TeamInvitation')
        .update({
          current_uses: 1,
          status: invitation.max_uses <= 1 ? 'exhausted' : 'active'
        })
        .eq('id', invitation.id)
        .select()
      
      if (error) {
        console.error(`❌ 修復失敗:`, error)
      } else {
        console.log(`✅ 修復成功:`, data)
      }
    } catch (err) {
      console.error(`❌ 修復異常:`, err)
    }
  }
}

// 執行主程式
debugInviteCodes()