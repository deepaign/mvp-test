import React, { useState, useEffect } from 'react'
import { TeamService } from '../../services/teamService'

function StaffDashboard({ member, team, onLogout }) {
  const [teamMembers, setTeamMembers] = useState([])
  const [loading, setLoading] = useState(true)

  // 載入團隊成員
  useEffect(() => {
    loadTeamMembers()
  }, [])

  const loadTeamMembers = async () => {
    try {
      setLoading(true)
      const result = await TeamService.getTeamMembers(team.id, member.auth_user_id)
      
      if (result.success) {
        setTeamMembers(result.members)
      }
    } catch (error) {
      console.error('載入團隊成員失敗:', error)
    } finally {
      setLoading(false)
    }
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
              <div style={{ color: '#666', fontSize: '0.9rem' }}>幕僚助理</div>
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

        {/* 功能預告 */}
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
      </div>
    </div>
  )
}
export default StaffDashboard