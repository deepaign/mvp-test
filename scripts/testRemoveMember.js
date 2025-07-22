#!/usr/bin/env node
// scripts/testRemoveMember.js
// 完整測試移除成員操作

import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import readlineSync from 'readline-sync'

dotenv.config({ path: '../.env' })

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// 完整的移除成員函數 - 用於測試
async function testRemoveMember(groupId, targetMemberId, operatorUserId) {
  try {
    console.log('\n🧪 === 開始完整測試移除成員 ===')
    console.log('參數:', { groupId, targetMemberId, operatorUserId })
    
    // === 步驟1：驗證操作者權限 ===
    console.log('\n📋 步驟1: 驗證操作者權限...')
    
    const { data: operatorRecords, error: operatorError } = await supabase
      .from('Member')
      .select('id, is_leader, name, status')
      .eq('auth_user_id', operatorUserId)
      .eq('group_id', groupId)
      .eq('status', 'active')

    console.log('操作者查詢結果:', { 
      count: operatorRecords?.length, 
      data: operatorRecords, 
      error: operatorError 
    })

    if (operatorError) {
      console.error('❌ 查詢操作者失敗:', operatorError.message)
      return { success: false, message: '無法驗證操作權限' }
    }

    if (!operatorRecords || operatorRecords.length === 0) {
      console.log('❌ 操作者沒有權限或不是活躍成員')
      return { success: false, message: '您不是該團隊的活躍成員' }
    }

    if (operatorRecords.length > 1) {
      console.warn('⚠️ 發現多筆操作者記錄，使用第一筆:', operatorRecords)
    }

    const operator = operatorRecords[0]

    if (!operator.is_leader) {
      console.log('❌ 操作者不是負責人:', operator)
      return { success: false, message: '只有團隊負責人可以移除成員' }
    }

    console.log('✅ 操作者驗證通過:', operator.name)

    // === 步驟2：獲取目標成員資訊 ===
    console.log('\n📋 步驟2: 獲取目標成員資訊...')
    
    const { data: targetMember, error: targetError } = await supabase
      .from('Member')
      .select('id, auth_user_id, is_leader, name, status, group_id')
      .eq('id', targetMemberId)
      .maybeSingle()

    console.log('目標成員查詢結果:', { data: targetMember, error: targetError })

    if (targetError) {
      console.error('❌ 查詢目標成員失敗:', targetError.message)
      return { success: false, message: '找不到要移除的成員' }
    }

    if (!targetMember) {
      console.log('❌ 目標成員不存在')
      return { success: false, message: '找不到要移除的成員' }
    }

    console.log('✅ 目標成員:', targetMember.name)

    // === 步驟3：驗證目標成員 ===
    console.log('\n📋 步驟3: 驗證目標成員...')
    
    if (targetMember.group_id !== groupId) {
      console.log('❌ 該成員不屬於此團隊')
      return { success: false, message: '該成員不屬於此團隊' }
    }

    if (targetMember.auth_user_id === operatorUserId) {
      console.log('❌ 不能移除自己')
      return { success: false, message: '不能移除自己' }
    }

    if (targetMember.is_leader) {
      console.log('❌ 不能移除其他團隊負責人')
      return { success: false, message: '不能移除其他團隊負責人' }
    }

    if (targetMember.status === 'inactive') {
      console.log('❌ 該成員已被移除')
      return { success: false, message: '該成員已被移除' }
    }

    console.log('✅ 目標成員驗證通過')

    // === 步驟4：執行軟刪除 - 分成兩個步驟 ===
    console.log('\n📋 步驟4: 執行軟刪除...')
    
    // 先嘗試不使用 .single() 的更新
    console.log('🔧 嘗試更新操作 (不使用 .single())...')
    const { data: updateResult, error: updateError } = await supabase
      .from('Member')
      .update({ 
        status: 'inactive',
        updated_at: new Date().toISOString()
      })
      .eq('id', targetMemberId)
      .select('id, name, status, updated_at')

    console.log('更新操作結果:', { 
      count: updateResult?.length, 
      data: updateResult, 
      error: updateError 
    })

    if (updateError) {
      console.error('❌ 更新操作失敗:', updateError.message)
      console.error('完整錯誤:', updateError)
      return { success: false, message: `更新失敗：${updateError.message}` }
    }

    if (!updateResult || updateResult.length === 0) {
      console.error('❌ 更新操作沒有影響任何記錄')
      return { success: false, message: '更新操作失敗，沒有找到要更新的記錄' }
    }

    if (updateResult.length > 1) {
      console.warn('⚠️ 更新操作影響了多筆記錄:', updateResult)
    }

    const updatedMember = updateResult[0]
    console.log('✅ 更新成功:', updatedMember)

    // === 步驟5：驗證更新結果 ===
    console.log('\n📋 步驟5: 驗證更新結果...')
    
    const { data: verifyMember, error: verifyError } = await supabase
      .from('Member')
      .select('id, name, status, updated_at')
      .eq('id', targetMemberId)
      .maybeSingle()

    console.log('驗證查詢結果:', { data: verifyMember, error: verifyError })

    if (verifyError) {
      console.error('❌ 驗證查詢失敗:', verifyError.message)
    } else if (verifyMember && verifyMember.status !== 'inactive') {
      console.error('❌ 成員狀態沒有正確更新!')
      return { success: false, message: '移除操作可能失敗，請重試' }
    } else {
      console.log('✅ 驗證通過，成員已成功設為非活躍')
    }

    return { 
      success: true, 
      message: `已移除成員 ${targetMember.name}`,
      removedMember: updatedMember
    }

  } catch (error) {
    console.error('❌ 測試過程發生異常:', error)
    console.error('異常詳情:', error.message)
    console.error('異常堆疊:', error.stack)
    return { success: false, message: `移除成員失敗：${error.message}` }
  }
}

async function main() {
  console.log('🧪 完整測試移除成員操作')
  console.log('====================================')
  
  // 根據之前的調試結果，使用已知的數據
  const teamCode = '773VB39N'
  const groupId = '934f3376-0729-4b2e-9ccc-5a58965e41cd'
  const operatorUserId = '19ccbd9e-f988-4d1c-842a-aef73ce10e0b' // 負責人的 auth_user_id
  const targetMemberId = '47003360-f0dd-4975-8b89-6b1c32cfcbca' // 要移除的幕僚成員 ID

  console.log('使用測試數據:')
  console.log(`團隊註冊碼: ${teamCode}`)
  console.log(`團隊ID: ${groupId}`)
  console.log(`操作者 auth_user_id: ${operatorUserId}`)
  console.log(`目標成員 ID: ${targetMemberId}`)

  const confirm = readlineSync.keyInYNStrict('\n確定要執行測試移除操作嗎？')
  
  if (!confirm) {
    console.log('❌ 取消測試')
    return
  }

  // 執行測試
  const result = await testRemoveMember(groupId, targetMemberId, operatorUserId)
  
  console.log('\n🏁 === 測試結果 ===')
  console.log('成功:', result.success)
  console.log('訊息:', result.message)
  if (result.removedMember) {
    console.log('移除的成員:', result.removedMember)
  }

  // 如果成功，查詢最新的成員列表
  if (result.success) {
    console.log('\n📋 查詢更新後的成員列表...')
    
    const { data: members, error } = await supabase
      .from('Member')
      .select('id, name, email, role, is_leader, status')
      .eq('group_id', groupId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('❌ 查詢成員列表失敗:', error.message)
    } else {
      console.log('📊 當前成員列表:')
      members.forEach((member, index) => {
        console.log(`${index + 1}. ${member.name} (${member.status})`)
        console.log(`   Email: ${member.email}`)
        console.log(`   Role: ${member.role}`)
        console.log(`   Is Leader: ${member.is_leader}`)
      })

      const activeMembers = members.filter(m => m.status === 'active')
      const inactiveMembers = members.filter(m => m.status === 'inactive')
      
      console.log(`\n統計: 活躍 ${activeMembers.length} 人，非活躍 ${inactiveMembers.length} 人`)
    }
  }
}

main()