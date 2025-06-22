// 創建 src/components/Debug/MemberStatusDebug.js

import React, { useState } from 'react'
import { supabase } from '../../supabase'

function MemberStatusDebug({ team, member }) {
  const [debugInfo, setDebugInfo] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showDebug, setShowDebug] = useState(false)

  const checkAllMembersStatus = async () => {
    try {
      setLoading(true)
      
      console.log('=== 調試：檢查所有成員狀態 ===')
      console.log('團隊ID:', team.id)
      console.log('當前成員ID:', member.id)
      
      // 查詢所有成員（包括非活躍的）
      const { data: allMembers, error } = await supabase
        .from('Member')
        .select('*')
        .eq('group_id', team.id)
        .order('created_at', { ascending: true })

      if (error) throw error

      console.log('=== 資料庫中所有成員狀態 ===')
      allMembers.forEach(m => {
        console.log(`${m.name}: status=${m.status}, is_leader=${m.is_leader}, role=${m.role}, auth_user_id=${m.auth_user_id}`)
      })

      const activeMembers = allMembers.filter(m => m.status === 'active')
      const inactiveMembers = allMembers.filter(m => m.status === 'inactive')

      setDebugInfo({
        allMembers,
        activeMembers,
        inactiveMembers,
        timestamp: new Date().toLocaleString(),
        currentMember: member,
        currentTeam: team
      })

    } catch (error) {
      console.error('調試檢查失敗:', error)
      setDebugInfo({ error: error.message })
    } finally {
      setLoading(false)
    }
  }

  const forceReactivateMember = async (memberId, memberName) => {
    if (!window.confirm(`確定要重新激活 ${memberName} 嗎？`)) return

    try {
      console.log('重新激活成員:', { memberId, memberName })
      
      const { error } = await supabase
        .from('Member')
        .update({ 
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', memberId)

      if (error) throw error

      alert(`✅ 已重新激活 ${memberName}`)
      await checkAllMembersStatus()

    } catch (error) {
      console.error('重新激活失敗:', error)
      alert(`❌ 重新激活失敗: ${error.message}`)
    }
  }

  const forceMemberInactive = async (memberId, memberName) => {
    if (!window.confirm(`確定要強制設為非活躍 ${memberName} 嗎？\n\n這是調試功能，請謹慎使用。`)) return

    try {
      console.log('強制設為非活躍:', { memberId, memberName })
      
      const { error } = await supabase
        .from('Member')
        .update({ 
          status: 'inactive',
          updated_at: new Date().toISOString()
        })
        .eq('id', memberId)

      if (error) throw error

      alert(`✅ 已將 ${memberName} 設為非活躍`)
      await checkAllMembersStatus()

    } catch (error) {
      console.error('設為非活躍失敗:', error)
      alert(`❌ 操作失敗: ${error.message}`)
    }
  }

  const testTeamCheck = async () => {
    try {
      console.log('=== 測試團隊檢查 ===')
      
      // 動態導入 TeamService
      const { TeamService } = await import('../../services/teamService')
      
      console.log('測試當前用戶的團隊檢查...')
      const result = await TeamService.checkUserTeam(member.auth_user_id)
      
      console.log('團隊檢查結果:', result)
      
      alert(`團隊檢查結果:\n\nhasTeam: ${result.hasTeam}\nmember: ${result.member ? result.member.name : 'null'}\nteam: ${result.team ? result.team.name : 'null'}\n\n詳細信息請查看 Console`)
      
    } catch (error) {
      console.error('測試團隊檢查失敗:', error)
      alert(`測試失敗: ${error.message}`)
    }
  }

  if (!member.is_leader) {
    return null // 只有負責人可以看到調試工具
  }

  return (
    <div style={{ marginTop: '20px' }}>
      <button
        onClick={() => setShowDebug(!showDebug)}
        style={{
          background: '#17a2b8',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          padding: '8px 16px',
          fontSize: '0.8rem',
          cursor: 'pointer'
        }}
      >
        {showDebug ? '隱藏' : '顯示'} 調試工具 🔧
      </button>

      {showDebug && (
        <div style={{
          background: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: '8px',
          padding: '20px',
          marginTop: '10px'
        }}>
          <h4 style={{ marginBottom: '16px', color: '#495057' }}>
            🔍 成員狀態調試工具
          </h4>
          
          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <button
              onClick={checkAllMembersStatus}
              disabled={loading}
              style={{
                background: loading ? '#6c757d' : '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 16px',
                fontSize: '0.9rem',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? '檢查中...' : '🔄 檢查所有成員狀態'}
            </button>
            
            <button
              onClick={testTeamCheck}
              style={{
                background: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 16px',
                fontSize: '0.9rem',
                cursor: 'pointer'
              }}
            >
              🧪 測試團隊檢查
            </button>
          </div>

          {debugInfo && (
            <div style={{
              background: 'white',
              border: '1px solid #dee2e6',
              borderRadius: '6px',
              padding: '16px'
            }}>
              <p style={{ margin: '0 0 12px 0', fontSize: '0.8rem', color: '#6c757d' }}>
                最後更新: {debugInfo.timestamp}
              </p>

              {debugInfo.error ? (
                <div style={{ color: '#dc3545' }}>
                  錯誤: {debugInfo.error}
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: '16px' }}>
                    <strong>📊 統計:</strong>
                    <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                      <li>總成員數: {debugInfo.allMembers.length}</li>
                      <li>活躍成員: {debugInfo.activeMembers.length}</li>
                      <li>非活躍成員: {debugInfo.inactiveMembers.length}</li>
                    </ul>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <strong>👤 當前操作者:</strong>
                    <div style={{ margin: '8px 0', padding: '8px', background: '#e3f2fd', borderRadius: '4px' }}>
                      {debugInfo.currentMember.name} (ID: {debugInfo.currentMember.id}, auth_user_id: {debugInfo.currentMember.auth_user_id})
                    </div>
                  </div>

                  {debugInfo.activeMembers.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                      <strong>✅ 活躍成員:</strong>
                      <div style={{ margin: '8px 0' }}>
                        {debugInfo.activeMembers.map(m => (
                          <div key={m.id} style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            padding: '8px',
                            background: '#d4edda',
                            border: '1px solid #c3e6cb',
                            borderRadius: '4px',
                            marginBottom: '4px'
                          }}>
                            <span>
                              {m.name} ({m.role})
                              {m.is_leader && <span style={{ color: '#007bff' }}> 👑</span>}
                              <small style={{ color: '#6c757d', marginLeft: '8px' }}>
                                ID: {m.id} | auth_user_id: {m.auth_user_id}
                              </small>
                            </span>
                            {!m.is_leader && (
                              <button
                                onClick={() => forceMemberInactive(m.id, m.name)}
                                style={{
                                  background: '#dc3545',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  padding: '4px 8px',
                                  fontSize: '0.7rem',
                                  cursor: 'pointer'
                                }}
                              >
                                強制非活躍
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {debugInfo.inactiveMembers.length > 0 && (
                    <div>
                      <strong>❌ 非活躍成員:</strong>
                      <div style={{ margin: '8px 0' }}>
                        {debugInfo.inactiveMembers.map(m => (
                          <div key={m.id} style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            padding: '8px',
                            background: '#fff3cd',
                            border: '1px solid #ffeaa7',
                            borderRadius: '4px',
                            marginBottom: '8px'
                          }}>
                            <span>
                              {m.name} ({m.role})
                              <small style={{ color: '#6c757d', marginLeft: '8px' }}>
                                移除時間: {new Date(m.updated_at).toLocaleString()}
                                <br />
                                ID: {m.id} | auth_user_id: {m.auth_user_id}
                              </small>
                            </span>
                            <button
                              onClick={() => forceReactivateMember(m.id, m.name)}
                              style={{
                                background: '#ffc107',
                                color: '#212529',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '4px 8px',
                                fontSize: '0.7rem',
                                cursor: 'pointer'
                              }}
                            >
                              重新激活
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default MemberStatusDebug