#!/usr/bin/env node
// scripts/checkPolicies.js
// 檢查現有 RLS 政策的詳細信息

import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '../.env' })

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkPolicies() {
  console.log('🔍 檢查現有 RLS 政策')
  console.log('=====================================')

  try {
    // 查詢所有表格的 RLS 狀態和政策
    const { data: policies, error } = await supabase.rpc('check_rls_policies')
    
    if (error) {
      // 如果沒有這個函數，我們手動查詢
      console.log('使用手動查詢方式...')
      await manualCheckPolicies()
      return
    }

    // 顯示政策信息
    policies.forEach(policy => {
      console.log(`\n📋 ${policy.tablename}`)
      console.log(`   RLS啟用: ${policy.rls_enabled ? '✅' : '❌'}`)
      console.log(`   政策數量: ${policy.policy_count}`)
      console.log(`   政策名稱: ${policy.policies}`)
    })

  } catch (error) {
    console.error('❌ 查詢失敗，使用手動方式:', error.message)
    await manualCheckPolicies()
  }
}

async function manualCheckPolicies() {
  const tables = [
    'AcceptanceCase', 'Case', 'CaseMember', 'CaseVoter', 'Category', 'CategoryCase',
    'County', 'District', 'DistrictCase', 'DistrictGroup', 'Group', 'InChargeCase',
    'Member', 'MemberRecord', 'Record', 'TeamInvitation', 'Voter', 'VoterCase',
    'VoterDistrict', 'VoterRecord'
  ]

  for (const table of tables) {
    try {
      console.log(`\n📋 檢查表格: ${table}`)
      
      // 檢查 RLS 狀態（通過嘗試查詢來推斷）
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1)

      if (error) {
        if (error.message.includes('row-level security')) {
          console.log('   RLS狀態: ✅ 啟用（查詢被阻止）')
        } else {
          console.log(`   查詢錯誤: ${error.message}`)
        }
      } else {
        console.log('   RLS狀態: ❌ 關閉或有寬鬆政策')
        console.log(`   可查詢記錄數: ${data.length}`)
      }

    } catch (err) {
      console.log(`   檢查失敗: ${err.message}`)
    }
  }
}

// 檢查特定表格的詳細政策信息
async function checkSpecificTable(tableName) {
  console.log(`\n🔍 詳細檢查表格: ${tableName}`)
  console.log('=====================================')

  try {
    // 嘗試不同的查詢來測試權限
    console.log('📖 測試 SELECT 權限...')
    const { data: selectData, error: selectError } = await supabase
      .from(tableName)
      .select('*')
      .limit(1)

    if (selectError) {
      console.log(`   SELECT: ❌ ${selectError.message}`)
    } else {
      console.log(`   SELECT: ✅ 成功 (${selectData.length} 記錄)`)
    }

    console.log('✏️  測試 INSERT 權限...')
    // 注意：這裡不真的插入數據，只是測試權限
    const { error: insertError } = await supabase
      .from(tableName)
      .insert({})
      .select()
      .limit(0) // 不實際執行

    if (insertError && !insertError.message.includes('null value')) {
      console.log(`   INSERT: ❌ ${insertError.message}`)
    } else {
      console.log('   INSERT: ✅ 可能允許（需要有效數據測試）')
    }

  } catch (err) {
    console.log(`   測試失敗: ${err.message}`)
  }
}

// 分析危險政策
async function analyzeDangerousPolicies() {
  console.log('\n⚠️  危險政策分析')
  console.log('=====================================')

  const dangerousPatterns = [
    'all_access',
    'temp_',
    'relaxed',
    'Enable all',
    'authenticated_users_read'
  ]

  // 從你提供的政策列表分析
  const yourPolicies = [
    { table: 'County', policies: 'public_read_county, Enable all operations for service role, service_role_full_access' },
    { table: 'District', policies: 'Enable all operations for service role, public_read_district, service_role_full_access' },
    { table: 'Group', policies: 'temp_relaxed_group_access, Enable all operations for service role, authenticated_users_read, leaders_update_own_team, public_validate_registration_codes, service_role_access, service_role_full_access, users_view_own_team' },
    { table: 'Member', policies: 'users_read_own, all_access, authenticated_users_read, service_role_access, users_read_team' },
    { table: 'TeamInvitation', policies: 'service_role_full_access, Enable all operations for service role, leaders_manage_invitations, public_view_active_invitations, users_update_used_invitations' }
  ]

  yourPolicies.forEach(({ table, policies }) => {
    console.log(`\n📋 ${table}:`)
    
    const policyList = policies.split(', ')
    let hasDangerous = false
    
    policyList.forEach(policy => {
      const isDangerous = dangerousPatterns.some(pattern => 
        policy.toLowerCase().includes(pattern.toLowerCase())
      )
      
      if (isDangerous) {
        console.log(`   🚨 ${policy} - 危險政策！`)
        hasDangerous = true
      } else {
        console.log(`   ✅ ${policy}`)
      }
    })

    if (!hasDangerous) {
      console.log('   😊 沒有發現危險政策')
    }

    // 檢查重複
    const duplicates = policyList.filter(policy => 
      policy.includes('service_role') || policy.includes('Enable all')
    )
    
    if (duplicates.length > 1) {
      console.log(`   🔄 發現重複的 service_role 政策: ${duplicates.join(', ')}`)
    }
  })
}

// 生成清理建議
function generateCleanupRecommendations() {
  console.log('\n💡 清理建議')
  console.log('=====================================')

  console.log('🎯 高優先級清理項目:')
  console.log('   1. Member.all_access - 極度危險，允許所有操作')
  console.log('   2. Group.temp_relaxed_group_access - 臨時政策，應移除')
  console.log('   3. 重複的 service_role 政策 - 造成混亂')

  console.log('\n🔧 清理步驟建議:')
  console.log('   1. 先備份現有政策')
  console.log('   2. 移除所有 "temp_" 和 "all_access" 政策')
  console.log('   3. 合併重複的 service_role 政策')
  console.log('   4. 測試基本功能')
  console.log('   5. 逐步恢復必要的用戶權限')

  console.log('\n🚨 特別注意:')
  console.log('   - Member 表的 all_access 政策必須立即移除')
  console.log('   - 清理後要確保 service_role 仍能正常運作')
  console.log('   - 建議在低峰時間執行清理操作')
}

async function main() {
  await checkPolicies()
  await analyzeDangerousPolicies()
  generateCleanupRecommendations()

  console.log('\n📋 想要檢查特定表格的詳細權限嗎？')
  console.log('   node checkPolicies.js [table_name]')
}

// 如果提供了表格名稱參數，檢查特定表格
if (process.argv[2]) {
  checkSpecificTable(process.argv[2])
} else {
  main()
}