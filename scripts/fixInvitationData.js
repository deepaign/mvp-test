#!/usr/bin/env node
// scripts/fixInvitationData.js

import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import readlineSync from 'readline-sync'

dotenv.config({ path: '../.env' })

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

/**
 * 修復資料庫中的邀請碼數據
 */
async function fixInvitationData() {
  console.log('🔧 邀請碼數據修復工具')
  console.log('=====================================')
  
  try {
    // 步驟1: 查找所有已使用但 current_uses = 0 的邀請碼
    console.log('\n📋 步驟1: 查找問題邀請碼...')
    
    const { data: buggyInvitations, error } = await supabase
      .from('TeamInvitation')
      .select('*')
      .not('used_by', 'is', null)
      .eq('current_uses', 0)
    
    if (error) {
      throw error
    }
    
    if (!buggyInvitations || buggyInvitations.length === 0) {
      console.log('✅ 沒有發現問題邀請碼')
      return
    }
    
    console.log(`⚠️ 發現 ${buggyInvitations.length} 個問題邀請碼:`)
    buggyInvitations.forEach((inv, i) => {
      console.log(`${i+1}. ${inv.invite_code} (used_by: ${inv.used_by}, current_uses: ${inv.current_uses})`)
    })
    
    // 步驟2: 修復這些邀請碼
    console.log('\n📋 步驟2: 修復問題邀請碼...')
    
    const confirm = readlineSync.keyInYNStrict('確認要修復這些邀請碼嗎？')
    if (!confirm) {
      console.log('❌ 取消修復')
      return
    }
    
    let successCount = 0
    let failedCount = 0
    
    for (const invitation of buggyInvitations) {
      try {
        console.log(`正在修復邀請碼 ${invitation.invite_code}...`)
        
        // 更新 current_uses 和 status
        const { error: updateError } = await supabase
          .from('TeamInvitation')
          .update({
            current_uses: 1,
            status: invitation.max_uses <= 1 ? 'exhausted' : 'active'
          })
          .eq('id', invitation.id)
        
        if (updateError) {
          console.error(`  ❌ 修復失敗: ${updateError.message}`)
          failedCount++
        } else {
          console.log(`  ✅ 修復成功`)
          successCount++
        }
      } catch (err) {
        console.error(`  ❌ 修復過程發生錯誤: ${err.message}`)
        failedCount++
      }
    }
    
    console.log('\n📊 修復完成統計:')
    console.log(`成功: ${successCount}`)
    console.log(`失敗: ${failedCount}`)
    
    // 步驟3: 檢查是否有重複使用的邀請碼
    console.log('\n📋 步驟3: 檢查重複使用的邀請碼...')
    
    const { data: usedInvitations, error: usedError } = await supabase
      .from('TeamInvitation')
      .select('invite_code, count(*)')
      .not('used_by', 'is', null)
      .group('invite_code')
      .having('count(*) > 1')
    
    if (usedError) {
      console.error(`❌ 查詢失敗: ${usedError.message}`)
    } else if (usedInvitations && usedInvitations.length > 0) {
      console.log(`⚠️ 發現 ${usedInvitations.length} 個被重複使用的邀請碼:`)
      usedInvitations.forEach((inv, i) => {
        console.log(`${i+1}. ${inv.invite_code} (使用次數: ${inv.count})`)
      })
      
      console.log('\n⚠️ 警告: 發現重複使用的邀請碼，建議手動處理或聯繫開發團隊')
    } else {
      console.log('✅ 沒有發現被重複使用的邀請碼')
    }
    
    // 步驟4: 重置問題邀請碼（讓其可再次使用）
    console.log('\n📋 步驟4: 重置已失效的邀請碼...')
    
    const resetConfirm = readlineSync.keyInYNStrict('是否要重置已失效但未達到使用上限的邀請碼？')
    if (!resetConfirm) {
      console.log('❌ 取消重置')
      return
    }
    
    const { data: expiredInvitations, error: expiredError } = await supabase
      .from('TeamInvitation')
      .select('*')
      .or('status.eq.exhausted,expires_at.lt.now()')
      .lt('current_uses', 'max_uses')
    
    if (expiredError) {
      console.error(`❌ 查詢失敗: ${expiredError.message}`)
      return
    }
    
    if (!expiredInvitations || expiredInvitations.length === 0) {
      console.log('✅ 沒有需要重置的邀請碼')
      return
    }
    
    console.log(`發現 ${expiredInvitations.length} 個可重置的邀請碼:`)
    expiredInvitations.forEach((inv, i) => {
      console.log(`${i+1}. ${inv.invite_code} (status: ${inv.status}, expires: ${new Date(inv.expires_at).toLocaleString()})`)
    })
    
    const selectedIndex = readlineSync.questionInt('請選擇要重置的邀請碼編號 (0 表示取消): ', {
      min: 0,
      max: expiredInvitations.length
    })
    
    if (selectedIndex === 0) {
      console.log('❌ 取消重置')
      return
    }
    
    const invToReset = expiredInvitations[selectedIndex - 1]
    
    try {
      // 生成新的邀請碼
      const newCode = generateInviteCode()
      
      // 更新邀請碼
      const { data: updatedInv, error: resetError } = await supabase
        .from('TeamInvitation')
        .update({
          invite_code: newCode,
          status: 'active',
          current_uses: 0,
          used_by: null,
          used_at: null,
          expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString() // 72小時後過期
        })
        .eq('id', invToReset.id)
        .select()
        .single()
      
      if (resetError) {
        console.error(`❌ 重置失敗: ${resetError.message}`)
      } else {
        console.log(`✅ 重置成功! 新邀請碼: ${updatedInv.invite_code}`)
      }
    } catch (err) {
      console.error(`❌ 重置過程發生錯誤: ${err.message}`)
    }
    
  } catch (error) {
    console.error('❌ 執行過程發生錯誤:', error)
  }
}

/**
 * 生成邀請碼
 */
function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let result = ''
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// 執行主程式
fixInvitationData()