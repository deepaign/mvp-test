#!/usr/bin/env node
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// 載入專案根目錄的 .env 檔案
dotenv.config({ path: '../.env' })

console.log('🔍 診斷 Supabase 連接...')
console.log('=====================================')

// 檢查環境變數
console.log('\n📋 環境變數檢查:')
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('REACT_APP_SUPABASE_URL:', process.env.REACT_APP_SUPABASE_URL ? '✅ 已設定' : '❌ 未設定')
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ 已設定' : '❌ 未設定') 
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ 已設定' : '❌ 未設定')

console.log('\n🔗 最終使用的值:')
console.log('URL:', supabaseUrl)
console.log('URL 長度:', supabaseUrl?.length)
console.log('URL 格式正確:', supabaseUrl?.startsWith('https://') ? '✅' : '❌')
console.log('Service Key 長度:', supabaseServiceKey?.length)
console.log('Service Key 格式:', supabaseServiceKey?.startsWith('eyJ') ? '✅ JWT格式' : '❌ 非JWT格式')

if (!supabaseUrl || !supabaseServiceKey) {
  console.log('\n❌ 環境變數設定不完整')
  process.exit(1)
}

// 創建客戶端
console.log('\n🔧 創建 Supabase 客戶端...')
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// 測試連接
async function testConnection() {
  console.log('\n🧪 測試 1: 基本連接測試')
  try {
    const { data, error } = await supabase
      .from('Group')
      .select('count(*)', { count: 'exact', head: true })

    if (error) {
      console.log('❌ 基本連接失敗')
      console.log('錯誤訊息:', error.message || '無錯誤訊息')
      console.log('錯誤代碼:', error.code || '無錯誤代碼')
      console.log('錯誤詳情:', error.details || '無詳情')
      console.log('HTTP 狀態:', error.status || '無狀態')
      console.log('完整錯誤:', JSON.stringify(error, null, 2))
    } else {
      console.log('✅ 基本連接成功')
      console.log('資料:', data)
    }
  } catch (catchError) {
    console.log('💥 連接時發生例外:')
    console.log('例外訊息:', catchError.message)
    console.log('例外類型:', catchError.name)
    console.log('完整例外:', catchError)
  }

  console.log('\n🧪 測試 2: 簡單查詢測試')
  try {
    const { data, error } = await supabase
      .from('Group')
      .select('id, name')
      .limit(1)

    if (error) {
      console.log('❌ 查詢測試失敗')
      console.log('錯誤:', error)
    } else {
      console.log('✅ 查詢測試成功')
      console.log('返回記錄數:', data?.length || 0)
    }
  } catch (catchError) {
    console.log('💥 查詢時發生例外:', catchError.message)
  }

  console.log('\n🧪 測試 3: 網絡連接測試')
  try {
    const response = await fetch(supabaseUrl + '/rest/v1/', {
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`
      }
    })
    
    console.log('HTTP 狀態碼:', response.status)
    console.log('HTTP 狀態文字:', response.statusText)
    
    if (response.ok) {
      console.log('✅ 網絡連接正常')
    } else {
      console.log('❌ 網絡連接有問題')
      const text = await response.text()
      console.log('回應內容:', text.substring(0, 200))
    }
  } catch (fetchError) {
    console.log('💥 網絡連接失敗:', fetchError.message)
  }
}

testConnection()