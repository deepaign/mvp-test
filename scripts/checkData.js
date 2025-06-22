#!/usr/bin/env node
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '../.env' })

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkData() {
  console.log('🔍 檢查基本資料表...')
  
  // 檢查 County 表
  console.log('\n📍 County 表:')
  try {
    const { data: counties, error } = await supabase
      .from('County')
      .select('*')
    
    if (error) {
      console.log('❌ County 表錯誤:', error.message)
    } else {
      console.log(`✅ County 表有 ${counties.length} 筆資料`)
      counties.forEach(county => {
        console.log(`  - ${county.id}: ${county.name}`)
      })
      
      // 檢查特定的 UUID
      const targetUuid = '3171db34-acaa-4ebe-a253-a6a72fa56655'
      const found = counties.find(c => c.id === targetUuid)
      console.log(`\n🎯 UUID ${targetUuid}:`, found ? `${found.name}` : '未找到')
    }
  } catch (err) {
    console.log('💥 County 查詢異常:', err.message)
  }

  // 檢查 Member 表
  console.log('\n👥 Member 表:')
  try {
    const { data: members, error } = await supabase
      .from('Member')
      .select('*')
    
    if (error) {
      console.log('❌ Member 表錯誤:', error.message)
    } else {
      console.log(`✅ Member 表有 ${members.length} 筆資料`)
      if (members.length > 0) {
        members.forEach(member => {
          console.log(`  - ${member.name} (${member.email}) - 團隊:${member.group_id}`)
        })
      } else {
        console.log('  📭 Member 表是空的')
      }
    }
  } catch (err) {
    console.log('💥 Member 查詢異常:', err.message)
  }

  // 檢查 Group 表
  console.log('\n🏛️ Group 表:')
  try {
    const { data: groups, error } = await supabase
      .from('Group')
      .select('id, name, politician_name, registration_code, status, code_used, leader_id')
    
    if (error) {
      console.log('❌ Group 表錯誤:', error.message)
    } else {
      console.log(`✅ Group 表有 ${groups.length} 筆資料`)
      groups.forEach(group => {
        console.log(`  - ${group.registration_code}: ${group.name} (${group.politician_name})`)
        console.log(`    狀態: ${group.status}, 已使用: ${group.code_used}, leader_id: ${group.leader_id || 'null'}`)
      })
    }
  } catch (err) {
    console.log('💥 Group 查詢異常:', err.message)
  }
}

checkData()