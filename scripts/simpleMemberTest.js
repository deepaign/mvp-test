#!/usr/bin/env node
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '../.env' })

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testMemberQuery() {
  console.log('🧪 測試 Member 表查詢...')
  
  const testUserId = '19ccbd9e-f988-4d1c-842a-aef73ce10e0b'
  
  console.log('1. 測試基本 Member 表查詢...')
  try {
    const { data, error } = await supabase
      .from('Member')
      .select('*')
      .limit(1)
    
    console.log('基本查詢結果:', { data, error })
  } catch (err) {
    console.log('基本查詢異常:', err)
  }

  console.log('\n2. 測試特定用戶查詢...')
  try {
    const { data, error } = await supabase
      .from('Member')
      .select('*')
      .eq('auth_user_id', testUserId)
      .single()
    
    console.log('特定用戶查詢結果:', { data, error })
  } catch (err) {
    console.log('特定用戶查詢異常:', err)
  }

  console.log('\n3. 測試 Member 表權限...')
  try {
    const { count, error } = await supabase
      .from('Member')
      .select('*', { count: 'exact', head: true })
    
    console.log('計數查詢結果:', { count, error })
  } catch (err) {
    console.log('計數查詢異常:', err)
  }

  console.log('\n4. 檢查 RLS 政策...')
  try {
    const { data, error } = await supabase
      .rpc('check_member_policies')
    
    console.log('RLS 政策檢查:', { data, error })
  } catch (err) {
    console.log('RLS 檢查失敗 (可能沒有這個函數):', err.message)
  }
}

testMemberQuery()