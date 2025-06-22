#!/usr/bin/env node
// scripts/debugMemberIssue.js
// 用於調試成員移除問題的腳本

import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import readlineSync from 'readline-sync'

dotenv.config({ path: '../.env' })

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function debugMemberIssue() {
  console.log('🔍 調試成員移除問題')
  console.log('====================================')
  
  // 請用戶提供團隊信息
  const teamCode = readlineSync.question('請輸入團隊註冊碼: ').trim().toUpperCase()
  
  if (!teamCode) {
    console.log('❌ 註冊碼不能為空')
    return
  }

  try {
    // 1. 查找團隊
    console.log('\n🏛️ 步驟1: 查找團隊...')
    const { data: team, error: teamError } = await supabase
      .from('Group')
      .select('*')
      .eq('registration_code', teamCode)
      .single()

    if (teamError || !team) {
      console.log('❌ 找不到團隊:', teamError?.message)
      return
    }

    console.log(`✅ 找到團隊: ${team.name} (ID: ${team.id})`)
    console.log(`   政治人物: ${team.politician_name}`)
    console.log(`   狀態: ${team.status}`)

    // 2. 查詢所有成員（包括非活躍的）
    console.log('\n👥 步驟2: 查詢所有成員...')
    const { data: allMembers, error: membersError } = await supabase
      .from('Member')
      .select('*')
      .eq('group_id', team.id)
      .order('created_at', { ascending: true })

    if (membersError) {
      console.log('❌ 查詢成員失敗:', membersError.message)
      return
    }

    console.log(`📊 找到 ${allMembers.length} 位成員:`)
    
    const activeMembers = allMembers.filter(m => m.status === 'active')
    const inactiveMembers = allMembers.filter(m => m.status === 'inactive')
    
    console.log(`   - 活躍成員: ${activeMembers.length}`)
    console.log(`   - 非活躍成員: ${inactiveMembers.length}`)

    // 3. 詳細檢查每個成員
    console.log('\n📋 步驟3: 成員詳細信息...')
    allMembers.forEach((member, index) => {
      console.log(`\n${index + 1}. ${member.name}`)
      console.log(`   ID: ${member.id}`)
      console.log(`   auth_user_id: ${member.auth_user_id}`)
      console.log(`   email: ${member.email}`)
      console.log(`   role: ${member.role}`)
      console.log(`   is_leader: ${member.is_leader}`)
      console.log(`   status: ${member.status}`)
      console.log(`   group_id: ${member.group_id}`)
      console.log(`   created_at: ${member.created_at}`)
      console.log(`   updated_at: ${member.updated_at}`)
    })

    // 4. 檢查是否有重複記錄
    console.log('\n🔍 步驟4: 檢查重複記錄...')
    
    // 按 auth_user_id 分組檢查
    const groupedByAuthId = {}
    allMembers.forEach(member => {
      if (!groupedByAuthId[member.auth_user_id]) {
        groupedByAuthId[member.auth_user_id] = []
      }
      groupedByAuthId[member.auth_user_id].push(member)
    })

    let hasDuplicates = false
    Object.keys(groupedByAuthId).forEach(authUserId => {
      const members = groupedByAuthId[authUserId]
      if (members.length > 1) {
        hasDuplicates = true
        console.log(`⚠️  發現重複記錄 - auth_user_id: ${authUserId}`)
        members.forEach((member, index) => {
          console.log(`     ${index + 1}. ${member.name} (status: ${member.status}, id: ${member.id})`)
        })
      }
    })

    if (!hasDuplicates) {
      console.log('✅ 沒有發現重複的 auth_user_id 記錄')
    }

    // 5. 檢查活躍成員中的負責人
    console.log('\n👑 步驟5: 檢查負責人...')
    const leaders = activeMembers.filter(m => m.is_leader)
    console.log(`找到 ${leaders.length} 位活躍負責人:`)
    leaders.forEach(leader => {
      console.log(`   - ${leader.name} (${leader.email})`)
    })

    // 6. 模擬移除操作的查詢
    if (activeMembers.length > 1) {
      console.log('\n🧪 步驟6: 模擬移除操作查詢...')
      
      const leader = leaders[0]
      const staffMembers = activeMembers.filter(m => !m.is_leader)
      
      if (leader && staffMembers.length > 0) {
        const targetStaff = staffMembers[0]
        
        console.log(`模擬: 負責人 ${leader.name} 要移除 ${targetStaff.name}`)
        
        // 測試操作者查詢
        console.log('\n🔍 測試操作者查詢...')
        const { data: operatorTest, error: operatorTestError } = await supabase
          .from('Member')
          .select('id, is_leader, name, status')
          .eq('auth_user_id', leader.auth_user_id)
          .eq('group_id', team.id)
          .eq('status', 'active')

        console.log('操作者查詢結果:', { 
          recordCount: operatorTest?.length || 0, 
          records: operatorTest,
          error: operatorTestError 
        })

        // 測試目標成員查詢
        console.log('\n🔍 測試目標成員查詢...')
        const { data: targetTest, error: targetTestError } = await supabase
          .from('Member')
          .select('id, auth_user_id, is_leader, name, status, group_id')
          .eq('id', targetStaff.id)

        console.log('目標成員查詢結果:', { 
          recordCount: targetTest?.length || 0, 
          records: targetTest,
          error: targetTestError 
        })

        if (operatorTestError || targetTestError) {
          console.log('❌ 發現查詢錯誤!')
          if (operatorTestError) console.log('操作者查詢錯誤:', operatorTestError.message)
          if (targetTestError) console.log('目標成員查詢錯誤:', targetTestError.message)
        } else if (operatorTest?.length !== 1) {
          console.log(`⚠️  操作者查詢返回 ${operatorTest?.length || 0} 筆記錄，期望為 1 筆`)
        } else if (targetTest?.length !== 1) {
          console.log(`⚠️  目標成員查詢返回 ${targetTest?.length || 0} 筆記錄，期望為 1 筆`)
        } else {
          console.log('✅ 模擬查詢通過，問題可能在其他地方')
        }
      } else {
        console.log('⚠️  無法模擬移除操作：沒有足夠的成員')
      }
    } else {
      console.log('⚠️  團隊只有一位成員，無法測試移除操作')
    }

    // 7. 建議修復方案
    console.log('\n💡 步驟7: 建議修復方案...')
    
    if (hasDuplicates) {
      console.log('🔧 發現重複記錄，建議:')
      console.log('   1. 清理重複的 Member 記錄')
      console.log('   2. 確保每個 auth_user_id 在同一個 group_id 中只有一筆活躍記錄')
    } else {
      console.log('🔧 沒有發現明顯的資料問題，建議:')
      console.log('   1. 更新 TeamService.removeMember 方法使用 maybeSingle()')
      console.log('   2. 添加更詳細的錯誤處理')
      console.log('   3. 檢查前端傳遞的參數是否正確')
    }

  } catch (error) {
    console.error('❌ 調試過程發生錯誤:', error)
  }
}

// 清理重複記錄的函數
async function cleanupDuplicates() {
  const confirm = readlineSync.keyInYNStrict('\n⚠️  您要執行重複記錄清理嗎？這個操作不可逆！')
  
  if (!confirm) {
    console.log('取消清理操作')
    return
  }

  console.log('🧹 開始清理重複記錄...')
  
  try {
    // 查找所有重複的記錄
    const { data: allMembers, error } = await supabase
      .from('Member')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) throw error

    const groupedByKey = {}
    allMembers.forEach(member => {
      const key = `${member.auth_user_id}_${member.group_id}`
      if (!groupedByKey[key]) {
        groupedByKey[key] = []
      }
      groupedByKey[key].push(member)
    })

    let cleanupCount = 0
    
    for (const key of Object.keys(groupedByKey)) {
      const members = groupedByKey[key]
      if (members.length > 1) {
        console.log(`處理重複記錄: ${key}`)
        
        // 保留最新的活躍記錄，或者最新的記錄
        const activeMembers = members.filter(m => m.status === 'active')
        let keepMember
        
        if (activeMembers.length > 0) {
          // 如果有活躍記錄，保留最新的活躍記錄
          keepMember = activeMembers.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
        } else {
          // 如果沒有活躍記錄，保留最新的記錄
          keepMember = members.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
        }
        
        const toDelete = members.filter(m => m.id !== keepMember.id)
        
        for (const member of toDelete) {
          console.log(`刪除重複記錄: ${member.name} (${member.id})`)
          const { error: deleteError } = await supabase
            .from('Member')
            .delete()
            .eq('id', member.id)
          
          if (deleteError) {
            console.error(`刪除失敗:`, deleteError.message)
          } else {
            cleanupCount++
          }
        }
      }
    }
    
    console.log(`✅ 清理完成，刪除了 ${cleanupCount} 筆重複記錄`)
    
  } catch (error) {
    console.error('❌ 清理過程發生錯誤:', error)
  }
}

async function main() {
  console.log('🛠️  Polify 成員問題調試工具')
  console.log('====================================')
  console.log('1. 調試成員移除問題')
  console.log('2. 清理重複記錄')
  console.log('3. 退出')
  
  const choice = readlineSync.questionInt('請選擇功能 (1-3): ')
  
  switch (choice) {
    case 1:
      await debugMemberIssue()
      break
    case 2:
      await cleanupDuplicates()
      break
    case 3:
      console.log('👋 再見！')
      return
    default:
      console.log('❌ 無效的選擇')
  }
}

main()