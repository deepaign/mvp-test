import React, { useState, useEffect } from 'react'
import { TeamService } from '../../services/teamService'
import DashboardNavBar from './DashboardNavBar'
import CaseManagement from '../Case/CaseManagement'
import { PermissionService } from '../../services/permissionService'

function StaffDashboard({ member, team, onLogout }) {
  const [teamMembers, setTeamMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('team') // 預設顯示團隊成員
  
  // 新增：邀請碼相關狀態
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteCode, setInviteCode] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)

  // 檢查成員狀態是否仍然有效
  const checkMemberStatus = async () => {
    try {
      console.log('=== StaffDashboard 檢查成員狀態 ===')
      console.log('成員ID:', member.id)
      console.log('團隊ID:', team.id)
      
      const result = await TeamService.checkUserTeam(member.auth_user_id)
      console.log('成員狀態檢查結果:', result)
      
      if (!result.hasTeam) {
        console.log('❌ 成員已被移除，執行登出')
        alert('您已被移出團隊，請重新加入。')
        onLogout()
        return false
      }
      
      if (result.member.status !== 'active') {
        console.log('❌ 成員狀態非活躍，執行登出')
        alert('您的帳號狀態已變更，請重新登入。')
        onLogout()
        return false
      }
      
      console.log('✅ 成員狀態有效')
      return true
    } catch (error) {
      console.error('檢查成員狀態失敗:', error)
      return true // 如果檢查失敗，暫時允許繼續使用
    }
  }

  // 載入團隊成員
  const loadTeamMembers = async () => {
    try {
      console.log('=== StaffDashboard 載入團隊成員 ===')
      
      // 先檢查成員狀態
      const statusValid = await checkMemberStatus()
      if (!statusValid) return
      
      setLoading(true)
      setError('')
      
      // 使用新的 RPC 函數獲取團隊成員
      const result = await TeamService.getTeamMembers()
      
      console.log('團隊成員載入結果:', result)
      
      if (result.success) {
        // 確保 data 是陣列
        const members = Array.isArray(result.data) ? result.data : []
        setTeamMembers(members)
        console.log(`✅ 成功載入 ${members.length} 位團隊成員`)
      } else {
        console.error('❌ 載入團隊成員失敗:', result.error)
        setError(result.error || '載入團隊成員失敗')
        setTeamMembers([]) // 設置為空陣列
      }
    } catch (error) {
      console.error('💥 載入團隊成員異常:', error)
      setError('載入團隊成員時發生異常')
      setTeamMembers([]) // 設置為空陣列
    } finally {
      setLoading(false)
    }
  }

  // 新增：生成邀請碼功能
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

  // 新增：移除成員功能
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
        setTeamMembers(prevMembers => {
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

  // 新增：複製邀請碼
  const copyInviteCode = () => {
    navigator.clipboard.writeText(inviteCode)
    alert('邀請碼已複製到剪貼板')
  }

  // 組件載入時檢查狀態
  useEffect(() => {
    loadTeamMembers()
    
    // 設定定期檢查（每30秒檢查一次狀態）
    const interval = setInterval(async () => {
      console.log('定期檢查成員狀態...')
      await checkMemberStatus()
    }, 30000)
    
    return () => clearInterval(interval)
  }, [])

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
    if (isLeader) return '負責人'
    
    switch (role) {
      case 'politician':
        return '政治人物'
      case 'staff':
        return '幕僚助理'
      case 'volunteer':
        return '志工'
      default:
        return '成員'
    }
  }

  // 處理 tab 切換
  const handleTabChange = (tabId) => {
    setActiveTab(tabId)
  }

  // 檢查是否為團隊管理員（政治人物）
  const isTeamManager = member.is_leader || member.role === 'politician'

  // 渲染不同 tab 的內容
  const renderTabContent = () => {
    switch (activeTab) {
      case 'achievements':
        return (
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '40px',
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '20px' }}>🏆</div>
            <h2 style={{ color: '#667eea', marginBottom: '16px' }}>政績展示</h2>
            <p style={{ color: '#666', fontSize: '1.1rem' }}>
              政績展示功能開發中，敬請期待！
            </p>
          </div>
        )
      
      case 'analytics':
        return (
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '40px',
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '20px' }}>📊</div>
            <h2 style={{ color: '#667eea', marginBottom: '16px' }}>資料分析</h2>
            <p style={{ color: '#666', fontSize: '1.1rem' }}>
              資料分析功能開發中，敬請期待！
            </p>
          </div>
        )
      
      case 'cases':
        // 檢查案件管理權限
        const hasCasePermission = PermissionService.hasPermission(member, 'case_view_all') || 
                                    PermissionService.hasPermission(member, 'case_view_assigned')
        
        if (!hasCasePermission) {
          return (
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '40px',
              textAlign: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '20px' }}>🔒</div>
              <h2 style={{ color: '#e74c3c', marginBottom: '16px' }}>權限不足</h2>
              <p style={{ color: '#666', fontSize: '1.1rem' }}>
                您沒有權限查看案件管理功能
              </p>
            </div>
          )
        }
        
        return <CaseManagement member={member} team={team} />
      
      case 'team':
      default:
        return (
          <>
            {/* 團隊基本資訊 */}
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '24px',
              marginBottom: '30px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ fontSize: '1.3rem', marginBottom: '20px', color: '#333' }}>
                🏛️ 團隊資訊
              </h3>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                gap: '16px' 
              }}>
                <div style={{
                  background: '#f8f9fa',
                  borderRadius: '8px',
                  padding: '16px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '1.5rem', color: '#667eea', marginBottom: '8px' }}>🤝</div>
                  <div style={{ color: '#333', fontWeight: '600' }}>我的身份</div>
                  <div style={{ color: '#666', fontSize: '0.9rem' }}>
                    {getRoleDisplayName(member.role, member.is_leader)}
                  </div>
                </div>
                
                <div style={{
                  background: '#f8f9fa',
                  borderRadius: '8px',
                  padding: '16px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '1.5rem', color: '#667eea', marginBottom: '8px' }}>👑</div>
                  <div style={{ color: '#333', fontWeight: '600' }}>負責人</div>
                  <div style={{ color: '#666', fontSize: '0.9rem' }}>{team.politician_name}</div>
                </div>
                
                <div style={{
                  background: '#f8f9fa',
                  borderRadius: '8px',
                  padding: '16px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '1.5rem', color: '#28a745', marginBottom: '8px' }}>📍</div>
                  <div style={{ color: '#333', fontWeight: '600' }}>服務地區</div>
                  <div style={{ color: '#666', fontSize: '0.9rem' }}>{team.county}</div>
                </div>
              </div>
            </div>

            {/* 團隊成員管理 */}
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
                <h3 style={{ fontSize: '1.3rem', color: '#333', margin: 0 }}>
                  👥 團隊成員 ({teamMembers.length})
                </h3>
                
                {/* 只有團隊管理員才能看到生成邀請碼按鈕 */}
                {isTeamManager && (
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
                      opacity: inviteLoading ? 0.7 : 1,
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {inviteLoading ? '生成中...' : '📋 生成邀請碼'}
                  </button>
                )}
              </div>
              
              {loading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                  載入中...
                </div>
              ) : teamMembers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                  尚無團隊成員
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ 
                    width: '100%', 
                    borderCollapse: 'collapse',
                    fontSize: '0.95rem'
                  }}>
                    <thead>
                      <tr style={{ background: '#f8f9fa' }}>
                        <th style={{ 
                          padding: '12px', 
                          textAlign: 'left', 
                          borderBottom: '2px solid #e9ecef',
                          fontWeight: '600',
                          color: '#495057'
                        }}>
                          成員姓名
                        </th>
                        <th style={{ 
                          padding: '12px', 
                          textAlign: 'left', 
                          borderBottom: '2px solid #e9ecef',
                          fontWeight: '600',
                          color: '#495057'
                        }}>
                          電子信箱
                        </th>
                        <th style={{ 
                          padding: '12px', 
                          textAlign: 'center', 
                          borderBottom: '2px solid #e9ecef',
                          fontWeight: '600',
                          color: '#495057'
                        }}>
                          角色
                        </th>
                        <th style={{ 
                          padding: '12px', 
                          textAlign: 'center', 
                          borderBottom: '2px solid #e9ecef',
                          fontWeight: '600',
                          color: '#495057'
                        }}>
                          加入時間
                        </th>
                        {/* 只有團隊管理員才能看到操作欄 */}
                        {isTeamManager && (
                          <th style={{ 
                            padding: '12px', 
                            textAlign: 'center', 
                            borderBottom: '2px solid #e9ecef',
                            fontWeight: '600',
                            color: '#495057'
                          }}>
                            操作
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {teamMembers.map((m, index) => (
                        <tr key={m.id} style={{ 
                          borderBottom: '1px solid #f1f3f4',
                          background: index % 2 === 0 ? 'white' : '#fafbfc'
                        }}>
                          <td style={{ padding: '12px', fontWeight: '500', color: '#333' }}>
                            {m.name}
                            {m.is_leader && (
                              <span style={{ 
                                marginLeft: '8px', 
                                fontSize: '1rem' 
                              }}>👑</span>
                            )}
                          </td>
                          <td style={{ padding: '12px', color: '#666' }}>
                            {m.email}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>
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
                          <td style={{ padding: '12px', color: '#666', textAlign: 'center' }}>
                            {new Date(m.created_at).toLocaleDateString('zh-TW')}
                          </td>
                          {/* 只有團隊管理員才能看到移除按鈕 */}
                          {isTeamManager && (
                            <td style={{ padding: '12px', textAlign: 'center' }}>
                              {/* 不能移除自己，也不能移除其他負責人 */}
                              {m.id !== member.id && !m.is_leader ? (
                                <button
                                  onClick={() => removeMember(m.id, m.name)}
                                  style={{
                                    background: '#dc3545',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    padding: '6px 12px',
                                    fontSize: '0.8rem',
                                    cursor: 'pointer',
                                    transition: 'background-color 0.2s'
                                  }}
                                  onMouseOver={(e) => e.target.style.background = '#c82333'}
                                  onMouseOut={(e) => e.target.style.background = '#dc3545'}
                                >
                                  移除
                                </button>
                              ) : (
                                <span style={{ color: '#ccc', fontSize: '0.8rem' }}>
                                  {m.id === member.id ? '本人' : '負責人'}
                                </span>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )
    }
  }

  // 在渲染邏輯中添加更安全的檢查
  const renderTeamMembersTable = () => {
    // 確保 teamMembers 是陣列
    const members = Array.isArray(teamMembers) ? teamMembers : []
    
    if (loading) {
      return (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          載入中...
        </div>
      )
    }
    
    if (members.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          尚無團隊成員
        </div>
      )
    }
    
    return (
      <div style={{ overflowX: 'auto' }}>
        <table style={{ 
          width: '100%', 
          borderCollapse: 'collapse',
          fontSize: '0.95rem'
        }}>
          {/* 表格頭部 */}
          <thead>
            <tr style={{ background: '#f8f9fa' }}>
              <th style={{ 
                padding: '12px', 
                textAlign: 'left', 
                borderBottom: '2px solid #e9ecef',
                fontWeight: '600',
                color: '#495057'
              }}>
                成員姓名
              </th>
              <th style={{ 
                padding: '12px', 
                textAlign: 'left', 
                borderBottom: '2px solid #e9ecef',
                fontWeight: '600',
                color: '#495057'
              }}>
                電子信箱
              </th>
              <th style={{ 
                padding: '12px', 
                textAlign: 'center', 
                borderBottom: '2px solid #e9ecef',
                fontWeight: '600',
                color: '#495057'
              }}>
                角色
              </th>
              <th style={{ 
                padding: '12px', 
                textAlign: 'center', 
                borderBottom: '2px solid #e9ecef',
                fontWeight: '600',
                color: '#495057'
              }}>
                加入時間
              </th>
            </tr>
          </thead>
          
          {/* 表格內容 */}
          <tbody>
            {members.map((m, index) => (
              <tr key={m.id || index} style={{ 
                borderBottom: '1px solid #f1f3f4',
                background: index % 2 === 0 ? '#ffffff' : '#f8f9fa'
              }}>
                <td style={{ padding: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: '500', color: '#333' }}>
                        {m.name || '未設定姓名'}
                      </div>
                      {m.is_leader && (
                        <span style={{
                          fontSize: '0.7rem',
                          background: '#667eea',
                          color: 'white',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          marginTop: '4px',
                          display: 'inline-block'
                        }}>
                          負責人
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                
                <td style={{ padding: '12px', color: '#666' }}>
                  {m.email || '未設定信箱'}
                </td>
                
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    fontWeight: '500',
                    background: m.is_leader ? '#e3f2fd' : '#f3e5f5',
                    color: m.is_leader ? '#1976d2' : '#7b1fa2'
                  }}>
                    {getRoleDisplayName(m.role, m.is_leader)}
                  </span>
                </td>
                
                <td style={{ padding: '12px', textAlign: 'center', color: '#666', fontSize: '0.85rem' }}>
                  {m.created_at ? new Date(m.created_at).toLocaleDateString('zh-TW') : '未知'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  // 角色顯示名稱函數（如果還沒有的話）
  

  // 如果有錯誤且是權限相關，顯示錯誤頁面
  if (error && (error.includes('不是該團隊') || error.includes('活躍成員'))) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: '#f8f9fa',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '40px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
          maxWidth: '400px'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '20px' }}>⚠️</div>
          <h2 style={{ color: '#e74c3c', marginBottom: '16px' }}>存取受限</h2>
          <p style={{ color: '#666', marginBottom: '24px' }}>
            您可能已被移出團隊或帳號狀態已變更
          </p>
          <button
            onClick={onLogout}
            style={{
              background: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 24px',
              fontSize: '1rem',
              cursor: 'pointer'
            }}
          >
            重新登入
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa' }}>
      {/* 導航列 */}
      <DashboardNavBar
        team={team}
        member={member}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onLogout={onLogout}
      />

      {/* 錯誤訊息 */}
      {error && !error.includes('不是該團隊') && !error.includes('活躍成員') && (
        <div style={{ padding: '20px 40px 0' }}>
          <div style={{
            background: '#fee',
            border: '1px solid #fcc',
            color: '#e74c3c',
            padding: '12px 16px',
            borderRadius: '8px'
          }}>
            {error}
          </div>
        </div>
      )}

      {/* 主要內容 */}
      <div style={{ padding: '40px' }}>
        {renderTabContent()}

        {/* 功能預告（只在團隊成員 tab 顯示） */}
        {activeTab === 'team' && (
          <div style={{
            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 20%)',
            borderRadius: '12px',
            padding: '24px',
            marginTop: '30px',
            color: 'white',
            textAlign: 'center'
          }}>
            <h3 style={{ fontSize: '1.3rem', marginBottom: '12px', margin: '0 0 12px 0' }}>
              🚀 更多功能即將推出
            </h3>
            <p style={{ fontSize: '1rem', margin: '0 0 16px 0', opacity: 0.9 }}>
              案件管理、選民服務、團隊協作等功能正在開發中
            </p>
            <p style={{ fontSize: '0.9rem', margin: 0, opacity: 0.8 }}>
              敬請期待！
            </p>
          </div>
        )}
      </div>

      {/* 邀請碼彈出視窗 */}
      {showInviteModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '480px',
            width: '90%',
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🎉</div>
              <h2 style={{ color: '#333', marginBottom: '8px' }}>邀請碼已生成</h2>
              <p style={{ color: '#666', fontSize: '0.95rem' }}>
                請將此邀請碼分享給想要加入團隊的幕僚成員
              </p>
            </div>
            
            <div style={{
              background: '#f8f9fa',
              border: '2px dashed #dee2e6',
              borderRadius: '12px',
              padding: '20px',
              textAlign: 'center',
              marginBottom: '24px'
            }}>
              <div style={{ 
                fontSize: '1.8rem', 
                fontWeight: 'bold', 
                color: '#667eea',
                fontFamily: 'monospace',
                letterSpacing: '2px'
              }}>
                {inviteCode}
              </div>
            </div>
            
            <div style={{ 
              display: 'flex', 
              gap: '12px',
              justifyContent: 'center'
            }}>
              <button
                onClick={copyInviteCode}
                style={{
                  background: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  fontSize: '0.95rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  flex: 1,
                  maxWidth: '150px'
                }}
              >
                📋 複製邀請碼
              </button>
              
              <button
                onClick={() => setShowInviteModal(false)}
                style={{
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  fontSize: '0.95rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  flex: 1,
                  maxWidth: '150px'
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

export default StaffDashboard