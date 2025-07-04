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
      
      const result = await TeamService.getTeamMembers(team.id, member.auth_user_id)
      console.log('載入團隊成員結果:', result)
      
      if (result.success) {
        setTeamMembers(result.members)
      } else {
        setError(result.message)
        
        // 如果是權限問題，可能成員已被移除
        if (result.message.includes('不是該團隊') || result.message.includes('活躍成員')) {
          console.log('權限錯誤，可能已被移除，執行登出')
          alert('您可能已被移出團隊，請重新登入。')
          onLogout()
        }
      }
    } catch (error) {
      console.error('載入團隊成員失敗:', error)
      setError('載入團隊成員失敗')
    } finally {
      setLoading(false)
    }
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
    if (isLeader) return '團隊負責人'
    return role === 'politician' ? '政治人物' : '幕僚助理'
  }

  // 處理 tab 切換
  const handleTabChange = (tabId) => {
    setActiveTab(tabId)
  }

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
              <div style={{ fontSize: '3rem', marginBottom: '20px' }}>🚫</div>
              <h2 style={{ color: '#e74c3c', marginBottom: '16px' }}>權限不足</h2>
              <p style={{ color: '#666', fontSize: '1.1rem' }}>
                您沒有權限存取案件管理功能
              </p>
            </div>
          )
        }
        
        return <CaseManagement member={member} team={team} />
      
      case 'team':
      default:
        return (
          <>
            {/* 歡迎卡片 */}
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '30px',
              marginBottom: '30px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🎉</div>
              <h2 style={{ color: '#28a745', fontSize: '1.8rem', marginBottom: '16px', fontWeight: '600' }}>
                歡迎加入團隊！
              </h2>
              <p style={{ color: '#666', fontSize: '1.1rem', marginBottom: '20px', lineHeight: '1.5' }}>
                您已成功加入 <strong>{team.name}</strong>
              </p>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '20px',
                marginTop: '24px'
              }}>
                <div style={{
                  background: '#f8f9fa',
                  borderRadius: '8px',
                  padding: '16px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '1.5rem', color: '#f093fb', marginBottom: '8px' }}>🤝</div>
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

            {/* 團隊成員 */}
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ fontSize: '1.3rem', marginBottom: '20px', color: '#333' }}>
                👥 團隊成員
              </h3>
              
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
                      </tr>
                    </thead>
                    <tbody>
                      {teamMembers.map((m, index) => (
                        <tr key={m.id} style={{ 
                          background: index % 2 === 0 ? 'white' : '#f8f9fa',
                          borderBottom: '1px solid #e9ecef'
                        }}>
                          <td style={{ padding: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {m.is_leader && <span style={{ fontSize: '1.2rem' }}>👑</span>}
                              <strong>{m.name}</strong>
                              {m.id === member.id && (
                                <span style={{
                                  background: '#e3f2fd',
                                  color: '#1976d2',
                                  padding: '2px 6px',
                                  borderRadius: '8px',
                                  fontSize: '0.7rem',
                                  fontWeight: '500'
                                }}>
                                  我
                                </span>
                              )}
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
    </div>
  )
}

export default StaffDashboard