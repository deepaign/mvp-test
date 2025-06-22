#!/usr/bin/env node
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import readlineSync from 'readline-sync'

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

console.log('🔍 原始環境變數:')
console.log('REACT_APP_SUPABASE_URL:', process.env.REACT_APP_SUPABASE_URL)
console.log('SUPABASE_URL:', process.env.SUPABASE_URL)
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '已設定' : '未設定')
console.log('🔗 最終 URL:', supabaseUrl)
console.log('🔗 URL 長度:', supabaseUrl?.length)
console.log('🔗 URL 是否以 https 開頭:', supabaseUrl?.startsWith('https://'))


const supabase = createClient(supabaseUrl, supabaseServiceKey)

// 職位對照表
const positionLabels = {
  'city_councilor': '市議員',
  'county_councilor': '縣議員',
  'legislator': '立法委員',
  'mayor': '市長',
  'county_magistrate': '縣長',
  'village_chief': '里長',
  'other': '其他'
}

// 狀態對照表
const statusLabels = {
  'pending': '等待加入',
  'active': '已啟用',
  'inactive': '已停用'
}

// 格式化日期
function formatDate(dateString) {
  if (!dateString) return '未設定'
  return new Date(dateString).toLocaleString('zh-TW')
}

// 獲取狀態顯示
function getStatusDisplay(status, codeUsed) {
  if (status === 'pending' && !codeUsed) {
    return '🟡 等待加入'
  } else if (status === 'active' && codeUsed) {
    return '🟢 已啟用'
  } else if (status === 'inactive') {
    return '🔴 已停用'
  } else {
    return '❓ 未知狀態'
  }
}

async function listAllTeams() {
  try {
    console.log('\n📋 Polify 團隊列表')
    console.log('=====================================')

    const { data: teams, error } = await supabase
      .from('Group')
      .select('*')  // 暫時移除 leader JOIN
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ 獲取團隊列表失敗:', error.message)
      return
    }

    if (!teams || teams.length === 0) {
      console.log('📭 目前沒有任何團隊')
      return
    }

    console.log(`\n找到 ${teams.length} 個團隊：\n`)

    teams.forEach((team, index) => {
      console.log(`${index + 1}. ${team.name}`)
      console.log(`   👤 政治人物: ${team.politician_name}`)
      console.log(`   🏷️  職位: ${positionLabels[team.position] || team.position}`)
      console.log(`   📍 地區: ${team.county} ${team.district || ''}`)
      console.log(`   🔑 註冊碼: ${team.registration_code}`)
      console.log(`   📊 狀態: ${getStatusDisplay(team.status, team.code_used)}`)
      console.log(`   📅 建立時間: ${formatDate(team.created_at)}`)
      
      if (team.code_used && team.code_used_at) {
        console.log(`   ✅ 加入時間: ${formatDate(team.code_used_at)}`)
      }
      
      // 只有當 leader_id 存在時才顯示
      if (team.leader_id) {
        console.log(`   👑 負責人ID: ${team.leader_id}`)
      }
      
      if (team.phone) {
        console.log(`   📞 電話: ${team.phone}`)
      }
      
      if (team.email) {
        console.log(`   📧 Email: ${team.email}`)
      }
      
      if (team.address) {
        console.log(`   🏢 地址: ${team.address}`)
      }
      
      console.log('   ─────────────────────────────────────')
    })

    // 統計資訊
    const pendingCount = teams.filter(t => t.status === 'pending' && !t.code_used).length
    const activeCount = teams.filter(t => t.status === 'active' && t.code_used).length
    const inactiveCount = teams.filter(t => t.status === 'inactive').length

    console.log('\n📊 統計資訊：')
    console.log('=====================================')
    console.log(`總團隊數: ${teams.length}`)
    console.log(`🟡 等待加入: ${pendingCount}`)
    console.log(`🟢 已啟用: ${activeCount}`)
    console.log(`🔴 已停用: ${inactiveCount}`)

  } catch (error) {
    console.error('❌ 發生錯誤:', error.message)
  }
}

async function searchTeam() {
  try {
    const searchTerm = readlineSync.question('\n🔍 請輸入搜尋關鍵字 (政治人物姓名或團隊名稱): ').trim()
    
    if (!searchTerm) {
      console.log('❌ 搜尋關鍵字不能為空')
      return
    }

    const { data: teams, error } = await supabase
      .from('Group')
      .select('*')  // 暫時移除 leader JOIN
      .or(`name.ilike.%${searchTerm}%,politician_name.ilike.%${searchTerm}%`)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ 搜尋失敗:', error.message)
      return
    }

    if (!teams || teams.length === 0) {
      console.log(`📭 找不到包含 "${searchTerm}" 的團隊`)
      return
    }

    console.log(`\n🎯 找到 ${teams.length} 個相關團隊：\n`)

    teams.forEach((team, index) => {
      console.log(`${index + 1}. ${team.name}`)
      console.log(`   👤 政治人物: ${team.politician_name}`)
      console.log(`   🔑 註冊碼: ${team.registration_code}`)
      console.log(`   📊 狀態: ${getStatusDisplay(team.status, team.code_used)}`)
      console.log('   ─────────────────────────────────────')
    })

  } catch (error) {
    console.error('❌ 搜尋錯誤:', error.message)
  }
}

async function showTeamDetails() {
  try {
    const registrationCode = readlineSync.question('\n🔍 請輸入註冊碼查看詳細資訊: ').trim().toUpperCase()
    
    if (!registrationCode) {
      console.log('❌ 註冊碼不能為空')
      return
    }

    const { data: team, error } = await supabase
      .from('Group')
      .select('*')  // 暫時移除所有 JOIN
      .eq('registration_code', registrationCode)
      .single()

    if (error) {
      console.log(`❌ 找不到註冊碼 "${registrationCode}" 的團隊`)
      return
    }

    console.log('\n📋 團隊詳細資訊')
    console.log('=====================================')
    console.log(`🏷️  團隊名稱: ${team.name}`)
    console.log(`👤 政治人物: ${team.politician_name}`)
    console.log(`🏷️  職位: ${positionLabels[team.position] || team.position}`)
    console.log(`📍 服務地區: ${team.county} ${team.district || ''}`)
    console.log(`🔑 註冊碼: ${team.registration_code}`)
    console.log(`📊 狀態: ${getStatusDisplay(team.status, team.code_used)}`)
    console.log(`📅 建立時間: ${formatDate(team.created_at)}`)
    
    if (team.code_used && team.code_used_at) {
      console.log(`✅ 啟用時間: ${formatDate(team.code_used_at)}`)
    }
    
    if (team.phone) {
      console.log(`📞 電話: ${team.phone}`)
    }
    
    if (team.email) {
      console.log(`📧 Email: ${team.email}`)
    }
    
    if (team.address) {
      console.log(`🏢 地址: ${team.address}`)
    }

    // 如果有 leader_id，單獨查詢成員資訊
    if (team.leader_id) {
      const { data: members } = await supabase
        .from('Member')
        .select('id, name, email, role, is_leader, created_at')
        .eq('group_id', team.id)
        .eq('status', 'active')
        .order('is_leader', { ascending: false })

      if (members && members.length > 0) {
        console.log(`\n👥 團隊成員 (${members.length} 人):`)
        console.log('-------------------------------------')
        members.forEach((member, index) => {
          const roleLabel = member.is_leader ? '👑 負責人' : (member.role === 'staff' ? '🤝 幕僚' : '👤 成員')
          console.log(`${index + 1}. ${member.name} (${roleLabel})`)
          console.log(`   📧 Email: ${member.email}`)
          console.log(`   📅 加入時間: ${formatDate(member.created_at)}`)
        })
      }
    } else {
      console.log('\n👥 團隊成員: 尚無成員加入')
    }

  } catch (error) {
    console.error('❌ 查看詳細資訊錯誤:', error.message)
  }
}

async function main() {
  try {
    // 測試 Supabase 連接
    const { data, error } = await supabase
      .from('Group')
      .select('*')

    if (error) {
      console.error('❌ Supabase 連接失敗:', error.message)
      console.error('完整錯誤物件:', error)
      console.log('\n請檢查：')
      console.log('1. 環境變數是否正確設定')
      console.log('2. Service Role Key 是否正確')
      console.log('3. 資料庫表格是否已建立')
      return
    }

    console.log('✅ Supabase 連接成功')

    while (true) {
      console.log('\n🏛️  Polify 團隊管理工具')
      console.log('=====================================')
      console.log('1. 查看所有團隊')
      console.log('2. 搜尋團隊')
      console.log('3. 查看團隊詳細資訊')
      console.log('4. 退出')
      console.log('=====================================')

      const choice = readlineSync.questionInt('請選擇功能 (1-4): ')

      switch (choice) {
        case 1:
          await listAllTeams()
          break
        case 2:
          await searchTeam()
          break
        case 3:
          await showTeamDetails()
          break
        case 4:
          console.log('👋 再見！')
          return
        default:
          console.log('❌ 無效的選擇，請重新輸入')
      }

      console.log('\n按 Enter 繼續...')
      readlineSync.question('')
    }

  } catch (error) {
    console.error('❌ 程式執行錯誤:', error.message)
  }
}

// 執行主程式
main()