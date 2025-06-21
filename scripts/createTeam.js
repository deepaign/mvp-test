#!/usr/bin/env node
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import readlineSync from 'readline-sync'

// 設定編碼
process.stdout.setDefaultEncoding('utf8')
process.stdin.setDefaultEncoding('utf8')

// 如果是 Windows，設定控制台編碼
if (process.platform === 'win32') {
  try {
    const { execSync } = await import('child_process')
    execSync('chcp 65001', { stdio: 'ignore' })
  } catch (err) {
    // 忽略錯誤
  }
}

// 載入專案根目錄的 .env 檔案
dotenv.config({ path: '../.env' })

// 從環境變數讀取 Supabase 配置
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 錯誤：請確認環境變數設定')
  console.error('需要設定：')
  console.error('- REACT_APP_SUPABASE_URL 或 SUPABASE_URL')
  console.error('- SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// 生成註冊碼
function generateRegistrationCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let result = ''
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// 職位選項
const positionOptions = [
  { key: 'city_councilor', label: '市議員' },
  { key: 'county_councilor', label: '縣議員' }, 
  { key: 'legislator', label: '立法委員' },
  { key: 'mayor', label: '市長' },
  { key: 'county_magistrate', label: '縣長' },
  { key: 'village_chief', label: '里長' },
  { key: 'other', label: '其他' }
]

// 從資料庫動態獲取縣市列表
async function getCountyOptions() {
  try {
    const { data: counties, error } = await supabase
      .from('County')
      .select('id, name')
      .order('name')

    if (error) {
      console.error('❌ 獲取縣市列表失敗:', error.message)
      return null
    }

    return counties
  } catch (error) {
    console.error('❌ 查詢縣市失敗:', error.message)
    return null
  }
}

async function createTeam() {
  console.log('\n🏛️  Polify 團隊建立工具')
  console.log('=====================================')
  
  try {
    // 收集團隊資訊
    console.log('\n📝 請輸入團隊資訊：')
    
    const politicianName = readlineSync.question('政治人物姓名: ').trim()
    if (!politicianName) {
      console.error('❌ 政治人物姓名不能為空')
      return
    }

    // 選擇職位
    console.log('\n請選擇職位：')
    positionOptions.forEach((option, index) => {
      console.log(`${index + 1}. ${option.label}`)
    })
    const positionIndex = readlineSync.questionInt('\n請輸入數字 (1-' + positionOptions.length + '): ') - 1
    
    if (positionIndex < 0 || positionIndex >= positionOptions.length) {
      console.error('❌ 無效的職位選擇')
      return
    }
    const position = positionOptions[positionIndex]

    // 動態獲取並選擇縣市
    console.log('\n⏳ 正在載入縣市列表...')
    const countyOptions = await getCountyOptions()
    
    if (!countyOptions) {
      console.error('❌ 無法載入縣市列表')
      return
    }

    console.log('\n請選擇服務縣市：')
    countyOptions.forEach((county, index) => {
      console.log(`${index + 1}. ${county.name}`)
    })
    
    const countyIndex = readlineSync.questionInt('\n請輸入數字 (1-' + countyOptions.length + '): ') - 1
    
    if (countyIndex < 0 || countyIndex >= countyOptions.length) {
      console.error('❌ 無效的縣市選擇')
      return
    }
    const selectedCounty = countyOptions[countyIndex]

    // 其他資訊
    const district = readlineSync.question('服務選區/地區 (選填): ').trim()
    const phone = readlineSync.question('辦公室電話 (選填): ').trim()
    const email = readlineSync.question('辦公室Email (選填): ').trim()
    const address = readlineSync.question('辦公室地址 (選填): ').trim()

    // 自動生成團隊名稱和註冊碼
    const teamName = `${politicianName}${position.label}服務處`
    const registrationCode = generateRegistrationCode()

    console.log('\n📋 團隊資訊確認：')
    console.log('=====================================')
    console.log(`團隊名稱: ${teamName}`)
    console.log(`政治人物: ${politicianName}`)
    console.log(`職位: ${position.label}`)
    console.log(`服務縣市: ${selectedCounty.name}`)
    console.log(`服務地區: ${district || '未指定'}`)
    console.log(`辦公室電話: ${phone || '未提供'}`)
    console.log(`辦公室Email: ${email || '未提供'}`)
    console.log(`辦公室地址: ${address || '未提供'}`)
    console.log(`註冊碼: ${registrationCode}`)
    console.log('=====================================')

    const confirm = readlineSync.keyInYNStrict('\n確認建立這個團隊嗎？')
    
    if (!confirm) {
      console.log('❌ 取消建立團隊')
      return
    }

    // 建立團隊
    console.log('\n⏳ 正在建立團隊...')
    
    // 處理 district 資訊 - 如果有輸入地區名稱，嘗試查詢對應的 District ID
    let districtId = null
    if (district) {
      const { data: districtData, error: districtError } = await supabase
        .from('District')
        .select('id')
        .eq('name', district)
        .eq('county_id', selectedCounty.id)
        .single()

      if (!districtError && districtData) {
        districtId = districtData.id
      }
      // 如果找不到對應的區域，保持 districtId 為 null（不影響建立流程）
    }

    const teamData = {
      name: teamName,
      politician_name: politicianName,
      position: position.key,
      county: selectedCounty.id,  // 使用縣市的 UUID
      district: districtId,       // 使用區域的 UUID 或 null
      phone: phone || null,
      email: email || null,
      address: address || null,
      registration_code: registrationCode,
      status: 'pending',
      code_used: false
    }

    const { data, error } = await supabase
      .from('Group')
      .insert(teamData)
      .select(`
        *,
        county_info:County(name),
        district_info:District(name)
      `)
      .single()

    if (error) {
      console.error('❌ 建立團隊失敗:', error.message)
      console.error('錯誤詳情:', error)
      return
    }

    console.log('\n✅ 團隊建立成功！')
    console.log('=====================================')
    console.log(`🆔 團隊ID: ${data.id}`)
    console.log(`🏷️  團隊名稱: ${data.name}`)
    console.log(`👤 政治人物: ${data.politician_name}`)
    console.log(`📍 服務縣市: ${data.county_info?.name || '未知'}`)
    if (data.district_info?.name) {
      console.log(`📍 服務地區: ${data.district_info.name}`)
    }
    console.log(`🔑 註冊碼: ${data.registration_code}`)
    console.log('=====================================')
    console.log('\n📋 請將註冊碼提供給政治人物：')
    console.log(`\n🎯 ${politicianName} 的註冊碼是：${data.registration_code}`)
    console.log('\n💡 政治人物可以在 Polify 登入後使用此註冊碼加入團隊')

    // 詢問是否要繼續建立其他團隊
    const continueCreate = readlineSync.keyInYNStrict('\n要繼續建立其他團隊嗎？')
    if (continueCreate) {
      await createTeam()
    }

  } catch (error) {
    console.error('❌ 發生錯誤:', error.message)
    console.error('完整錯誤:', error)
  }
}

// 主程式
async function main() {
  try {
    // 測試 Supabase 連接
    console.log('🔍 除錯資訊：')
    console.log('REACT_APP_SUPABASE_URL:', process.env.REACT_APP_SUPABASE_URL ? '✅ 已載入' : '❌ 未載入')
    console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ 已載入' : '❌ 未載入')
    console.log('dotenv 路徑:', '../.env')
    console.log('當前工作目錄:', process.cwd())
    console.log('最終 URL:', supabaseUrl ? '✅ 有值' : '❌ 無值')
    console.log('最終 Service Key:', supabaseServiceKey ? '✅ 有值' : '❌ 無值')

    const { data, error } = await supabase
      .from('Group')
      .select('*')

    if (error) {
      console.error('❌ Supabase 連接失敗:', error.message)
      console.log('\n請檢查：')
      console.log('1. 環境變數是否正確設定')
      console.log('2. Service Role Key 是否正確')
      console.log('3. 資料庫表格是否已建立')
      return
    }

    console.log('✅ Supabase 連接成功')
    console.log(`📊 Group 表格目前有 ${data?.length || 0} 筆記錄`)
    
    await createTeam()

  } catch (error) {
    console.error('❌ 程式執行錯誤:', error.message)
  }
}

// 執行主程式
main()