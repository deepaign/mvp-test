import React, { useState, useEffect } from 'react'
import { TeamService } from '../../services/teamService'
import MemberStatusDebug from '../Debug/MemberStatusDebug'

function TeamManagement({ member, team, onLogout }) {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteCode, setInviteCode] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [error, setError] = useState('')

  // 載入團隊成員 - 添加更詳細的調試
  const loadTeamMembers = React.useCallback(async () => {
    try {
      console.log('=== 載入團隊成員 ===')
      console.log('團隊ID:', team.id)
      console.log('用戶ID:', member.auth_user_id)
      
      setLoading(true)
      setError('')
      
      const result = await TeamService.getTeamMembers(team.id, member.auth_user_id)
      
      console.log('=== 載入成員結果 ===', result)
      
      if (result.success) {
        console.log(`✅ 成功載入 ${result.members.length} 位活躍成員:`)
        result.members.forEach(m => {
          console.log(`  - ${m.name} (${m.role}, status: ${m.status || '未知'})`)
        })
        setMembers(result.members)
      } else {
        console.error('❌ 載入成員失敗:', result.message)
        setError(result.message)
      }
    } catch (error) {
      console.error('❌ 載入團隊成員異常:', error)
      setError(`載入團隊成員失敗：${error.message}`)
    } finally {
      setLoading(false)
    }
  }, [team.id, member.auth_user_id])

  useEffect(() => {
    loadTeamMembers()
  }, [loadTeamMembers])

  // 生成邀請碼
  const generateInviteCode = async () => {
    try {
      setInviteLoading(true)
      setError('')
      
      console.log('開始生成邀請碼...')
      console.log('團隊 ID:', team.id)
      console.log('用戶 ID:', member.auth_user_id)
      console.log('是否為負責人:', member.is_leader)
      
      const result = await TeamService.createStaffInvitation(
        team.id,
        member.auth_user_id
      )

      console.log('邀請碼生成結果:', result)

      if (result.success) {
        setInviteCode(result.inviteCode)
        setShowInviteModal(true)
      } else {
        console.error('生成失敗:', result.message)
        setError(result.message)
      }
    } catch (error) {
      console.error('生成邀請碼失敗:', error)
      setError('生成邀請碼失敗')
    } finally {
      setInviteLoading(false)
    }
  }

  // 移除成員 - 添加完整的調試和驗證
  const removeMember = async (memberId, memberName) => {
    // 確認對話框
    const confirmed = window.confirm(
      `確定要移除 ${memberName} 嗎？\n\n移除後該成員將無法訪問團隊系統。`
    )
    
    if (!confirmed) return

    try {
      console.log('=== 開始移除成員 ===')
      console.log('成員ID:', memberId)
      console.log('成員姓名:', memberName)
      console.log('團隊ID:', team.id)
      console.log('操作者ID:', member.auth_user_id)
      console.log('操作者是否為負責人:', member.is_leader)
      
      // 清除之前的錯誤
      setError('')
      
      const result = await TeamService.removeMember(
        team.id,
        memberId,
        member.auth_user_id
      )

      console.log('=== 移除成員結果 ===', result)

      if (result.success) {
        console.log('✅ 移除成功，更新本地狀態')
        
        // 立即更新本地成員列表
        setMembers(prevMembers => {
          const newMembers = prevMembers.filter(m => m.id !== memberId)
          console.log('本地成員列表已更新:', newMembers.map(m => m.name))
          return newMembers
        })
        
        // 顯示成功訊息
        alert(`✅ ${result.message}`)
        
        // 重新載入成員列表以確保同步
        console.log('重新載入成員列表以確保同步...')
        await loadTeamMembers()
        
      } else {
        console.error('❌ 移除失敗:', result.message)
        setError(result.message || '移除成員失敗')
        alert(`❌ 移除失敗：${result.message}`)
      }
    } catch (error) {
      console.error('❌ 移除成員異常:', error)
      const errorMessage = `移除成員時發生錯誤：${error.message}`
      setError(errorMessage)
      alert(`❌ ${errorMessage}`)
    }
  }

  // 複製邀請碼
  const copyInviteCode = () => {
    navigator.clipboard.writeText(inviteCode)
    alert('邀請碼已複製到剪貼板')
  }

  const getPositionLabel = (position) => {
    const labels = {
      'city_councilor': '市議員',
      'county_councilor': '縣議員',
      'legislator': '立法委員',
      'mayor': '市長',
      'county_magistrate': '縣長',
      'village_chief': '里長',
      'other': '其他'
    }
    return labels[position] || position
  }

  const getRoleDisplayName = (role, isLeader) => {
    if (isLeader) return '團隊負責人'
    return role === 'politician' ? '政治人物' : '幕僚助理'
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa' }}>
      {/* 頂部導航 */}
      <div style={{
        background: 'white',
        borderBottom: '1px solid #e9ecef',
        padding: '20px 40px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
      }}>
        <div>
          <h1 style={{ color: '#333', fontSize: '1.5rem', fontWeight: '600', margin: 0 }}>
            {team.name}
          </h1>
          <p style={{ color: '#666', fontSize: '0.9rem', margin: '4px 0 0 0' }}>
            {team.politician_name} • {getPositionLabel(team.position)} • {team.county}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ color: '#666', fontWeight: '500' }}>
            歡迎，{member.name}
          </span>
          <button 
            onClick={onLogout}
            style={{
              background: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 16px',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            登出
          </button>
        </div>
      </div>

      {/* 主要內容 */}
      <div style={{ padding: '40px' }}>
        {error && (
          <div style={{
            background: '#fee',
            border: '1px solid #fcc',
            color: '#e74c3c',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '20px'
          }}>
            {error}
          </div>
        )}

        {/* 團隊概覽卡片 */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '30px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ fontSize: '1.3rem', marginBottom: '16px', color: '#333' }}>
            📊 團隊概覽
          </h2>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '20px' 
          }}>
            <div style={{ textAlign: 'center', padding: '16px' }}>
              <div style={{ fontSize: '2rem', color: '#667eea', fontWeight: 'bold' }}>
                {members.length}
              </div>
              <div style={{ color: '#666', fontSize: '0.9rem' }}>團隊成員</div>
            </div>
            <div style={{ textAlign: 'center', padding: '16px' }}>
              <div style={{ fontSize: '2rem', color: '#28a745', fontWeight: 'bold' }}>
                {members.filter(m => m.role === 'staff').length}
              </div>
              <div style={{ color: '#666', fontSize: '0.9rem' }}>幕僚助理</div>
            </div>
            <div style={{ textAlign: 'center', padding: '16px' }}>
              <div style={{ fontSize: '2rem', color: '#ffc107', fontWeight: 'bold' }}>
                {team.county}
              </div>
              <div style={{ color: '#666', fontSize: '0.9rem' }}>服務地區</div>
            </div>
          </div>
        </div>

        {/* 成員管理區塊 */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '20px' 
          }}>
            <h2 style={{ fontSize: '1.3rem', color: '#333', margin: 0 }}>
              👥 團隊成員管理
            </h2>
            <button
              onClick={generateInviteCode}
              disabled={inviteLoading}
              style={{
                background: inviteLoading ? '#ccc' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 20px',
                fontSize: '0.9rem',
                fontWeight: '500',
                cursor: inviteLoading ? 'not-allowed' : 'pointer',
                opacity: inviteLoading ? 0.7 : 1
              }}
            >
              {inviteLoading ? '生成中...' : '+ 邀請新成員'}
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              載入中...
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8f9fa' }}>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e9ecef' }}>
                      姓名
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e9ecef' }}>
                      Email
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e9ecef' }}>
                      身份
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e9ecef' }}>
                      加入時間
                    </th>
                    <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #e9ecef' }}>
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m, index) => (
                    <tr key={m.id} style={{ 
                      background: index % 2 === 0 ? 'white' : '#f8f9fa',
                      borderBottom: '1px solid #e9ecef'
                    }}>
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {m.is_leader && <span style={{ fontSize: '1.2rem' }}>👑</span>}
                          <strong>{m.name}</strong>
                        </div>
                      </td>
                      <td style={{ padding: '12px', color: '#666' }}>{m.email}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          background: m.is_leader ? '#e3f2fd' : '#f3e5f5',
                          color: m.is_leader ? '#1976d2' : '#7b1fa2',
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '0.8rem',
                          fontWeight: '500'
                        }}>
                          {getRoleDisplayName(m.role, m.is_leader)}
                        </span>
                      </td>
                      <td style={{ padding: '12px', color: '#666' }}>
                        {new Date(m.created_at).toLocaleDateString('zh-TW')}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        {!m.is_leader && (
                          <button
                            onClick={() => removeMember(m.id, m.name)}
                            style={{
                              background: '#dc3545',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '6px 12px',
                              fontSize: '0.8rem',
                              cursor: 'pointer'
                            }}
                          >
                            移除
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 調試工具 */}
        {(process.env.NODE_ENV === 'development' || member.is_leader) && (
          <MemberStatusDebug team={team} member={member} />
        )}
      </div>

      {/* 邀請碼彈窗 */}
      {showInviteModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '30px',
            width: '90%',
            maxWidth: '400px',
            textAlign: 'center'
          }}>
            <h3 style={{ color: '#333', marginBottom: '20px' }}>
              🎉 邀請碼生成成功
            </h3>
            <div style={{
              background: '#f8f9fa',
              border: '2px dashed #667eea',
              borderRadius: '8px',
              padding: '20px',
              marginBottom: '20px'
            }}>
              <div style={{
                fontSize: '2rem',
                fontFamily: 'monospace',
                letterSpacing: '4px',
                color: '#667eea',
                fontWeight: 'bold',
                marginBottom: '8px'
              }}>
                {inviteCode}
              </div>
              <p style={{ color: '#666', fontSize: '0.9rem', margin: 0 }}>
                有效期：72小時 | 一次性使用  {/* 🔧 修改：改為一次性使用 */}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={copyInviteCode}
                style={{
                  flex: 1,
                  background: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '12px',
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                📋 複製邀請碼
              </button>
              <button
                onClick={() => setShowInviteModal(false)}
                style={{
                  flex: 1,
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '12px',
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TeamManagement