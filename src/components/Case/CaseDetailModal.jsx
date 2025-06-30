// src/components/Case/CaseDetailModal.jsx
import React, { useState, useEffect } from 'react'
import { CaseService } from '../../services/caseService'
import '../../styles/CaseDetailModal.css';

function CaseDetailModal({ isOpen, onClose, caseData, member, team, onUpdate }) {
  // 狀態管理
  const [caseDetail, setCaseDetail] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [statusValue, setStatusValue] = useState('')
  const [updateNote, setUpdateNote] = useState('')
  const [notifyUser, setNotifyUser] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  
  // 處理記錄
  const [processLogs, setProcessLogs] = useState([])
  
  // 通知設定
  const [notificationSettings, setNotificationSettings] = useState({
    method: '電話',
    reminderDate: '',
    reminderMessage: '',
    sendMultipleNotices: false
  })

  // 通知狀態
  const [notification, setNotification] = useState(null)

  // 載入案件詳情
  const loadCaseDetail = async () => {
    if (!caseData?.id) return

    try {
      setLoading(true)
      setError('')
      
      const result = await CaseService.getCaseDetail(caseData.id, member.auth_user_id, team.id)
      
      if (result.success) {
        setCaseDetail(result.case)
        setStatusValue(result.case.status)
        setProcessLogs(result.case.Record || [])
      } else {
        setError(result.message)
      }
    } catch (error) {
      console.error('載入案件詳情失敗:', error)
      setError('載入案件詳情失敗，請稍後重試')
    } finally {
      setLoading(false)
    }
  }

  // 當 Modal 開啟且有案件資料時載入詳情
  useEffect(() => {
    if (isOpen && caseData) {
      loadCaseDetail()
      // 重置狀態
      setUpdateNote('')
      setNotifyUser(false)
      setError('')
      setNotification(null)
    }
  }, [isOpen, caseData])

  // 處理通知設定變更
  const handleNotificationChange = (e) => {
    const { name, value, type, checked } = e.target
    setNotificationSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  // 顯示通知
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3000)
  }

  // 儲存處理記錄
  const handleSaveLog = async () => {
    if (!updateNote.trim()) {
      setError('請輸入處理記錄內容')
      return
    }

    setSaveLoading(true)
    setError('')
    
    try {
      const result = await CaseService.addCaseRecord(
        caseDetail.id,
        {
          title: '處理記錄',
          content: updateNote
        },
        member.auth_user_id,
        team.id
      )

      if (result.success) {
        // 添加新記錄到本地狀態
        const newLog = {
          id: result.record.id,
          title: result.record.title,
          content: result.record.content,
          created_at: result.record.created_at,
          MemberRecord: [{
            Member: {
              id: member.id,
              name: member.name
            }
          }]
        }
        
        setProcessLogs(prev => [newLog, ...prev])
        setUpdateNote('')
        
        if (notifyUser) {
          showNotification('已通知民眾最新處理進度', 'success')
        } else {
          showNotification('處理記錄已儲存', 'success')
        }
      } else {
        setError(result.message)
      }
    } catch (error) {
      console.error('儲存處理記錄失敗:', error)
      setError('儲存處理記錄失敗，請稍後重試')
    } finally {
      setSaveLoading(false)
    }
  }

  // 更新案件狀態
  const handleStatusUpdate = async () => {
    if (statusValue === caseDetail?.status) return

    try {
      const result = await CaseService.updateCase(
        caseDetail.id,
        { status: statusValue },
        member.auth_user_id,
        team.id
      )

      if (result.success) {
        setCaseDetail(prev => ({ ...prev, status: statusValue }))
        showNotification('案件狀態已更新', 'success')
        
        // 通知父組件更新
        if (onUpdate) {
          onUpdate()
        }
      } else {
        setError(result.message)
        setStatusValue(caseDetail.status) // 回復原狀態
      }
    } catch (error) {
      console.error('更新案件狀態失敗:', error)
      setError('更新案件狀態失敗')
      setStatusValue(caseDetail.status)
    }
  }

  // 處理行事曆同步
  const handleSyncCalendar = () => {
    if (!notificationSettings.reminderDate) {
      setError('請先設定提醒日期')
      return
    }
    
    // 模擬同步過程
    showNotification('已成功同步至 Google 行事曆', 'success')
  }

  // 處理發送通知
  const handleSendNotification = () => {
    if (!notificationSettings.reminderDate) {
      setError('請先設定提醒日期')
      return
    }
    
    if (notificationSettings.method !== '電話' && !notificationSettings.reminderMessage) {
      setError('請輸入通知訊息內容')
      return
    }
    
    showNotification(notificationSettings.sendMultipleNotices ? 
      '已安排多次通知提醒' : '已安排通知提醒', 'success')
  }

  // 格式化日期
  const formatDate = (dateString) => {
    if (!dateString) return '未設定'
    return new Date(dateString).toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // 狀態樣式
  const getStatusClass = (status) => {
    switch(status) {
      case '處理中': return 'status-processing'
      case '已完成': return 'status-completed'
      case '待處理': return 'status-pending'
      default: return 'status-pending'
    }
  }

  // 優先級樣式
  const getPriorityClass = (priority) => {
    switch(priority) {
      case '緊急': return 'priority-high'
      case '一般': return 'priority-medium'
      case '低': return 'priority-low'
      default: return 'priority-medium'
    }
  }

  if (!isOpen || !caseData) return null

  return (
    <div className="modal-overlay">
      <div className="case-detail-modal">
        <div className="modal-header">
          <h2>案件詳情</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-content">
          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>載入案件詳情中...</p>
            </div>
          ) : error ? (
            <div className="error-message">
              ❌ {error}
            </div>
          ) : caseDetail ? (
            <>
              {/* 案件基本資訊 */}
              <div className="case-info-section">
                <h3>📋 案件資訊</h3>
                <div className="case-info-grid">
                  <div className="info-row">
                    <div className="info-group">
                      <label>案件編號</label>
                      <div className="info-value case-id">{caseDetail.id}</div>
                    </div>
                    <div className="info-group">
                      <label>建立日期</label>
                      <div className="info-value">{formatDate(caseDetail.created_at)}</div>
                    </div>
                  </div>
                  
                  <div className="info-row">
                    <div className="info-group">
                      <label>優先級</label>
                      <div className={`info-value priority-badge ${getPriorityClass(caseDetail.priority)}`}>
                        {caseDetail.priority}
                      </div>
                    </div>
                    <div className="info-group">
                      <label>狀態</label>
                      <div className="status-select">
                        <select 
                          value={statusValue} 
                          onChange={(e) => setStatusValue(e.target.value)}
                          onBlur={handleStatusUpdate}
                          className={`status-dropdown ${getStatusClass(statusValue)}`}
                        >
                          <option value="待處理">待處理</option>
                          <option value="處理中">處理中</option>
                          <option value="已完成">已完成</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  
                  <div className="info-full-width">
                    <label>案件標題</label>
                    <div className="info-value case-title">{caseDetail.title}</div>
                  </div>
                  
                  <div className="info-full-width">
                    <label>案件描述</label>
                    <div className="info-value case-description">{caseDetail.description}</div>
                  </div>
                  
                  <div className="info-row">
                    <div className="info-group">
                      <label>聯絡方式</label>
                      <div className="info-value">{caseDetail.contact_type || '未指定'}</div>
                    </div>
                    <div className="info-group">
                      <label>開始日期</label>
                      <div className="info-value">
                        {formatDate(caseDetail.start_date)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 陳情人資訊 */}
              {caseDetail.VoterCase && caseDetail.VoterCase.length > 0 && (
                <div className="voter-info-section">
                  <h3>👤 陳情人資訊</h3>
                  <div className="voter-info-grid">
                    {caseDetail.VoterCase.map((vc, index) => (
                      <div key={index} className="voter-card">
                        <div className="voter-detail">
                          <span className="voter-label">姓名:</span>
                          <span className="voter-value">{vc.Voter?.name || '未提供'}</span>
                        </div>
                        <div className="voter-detail">
                          <span className="voter-label">電話:</span>
                          <span className="voter-value">{vc.Voter?.phone || '未提供'}</span>
                        </div>
                        <div className="voter-detail">
                          <span className="voter-label">Email:</span>
                          <span className="voter-value">{vc.Voter?.email || '未提供'}</span>
                        </div>
                        {vc.Voter?.address && (
                          <div className="voter-detail">
                            <span className="voter-label">地址:</span>
                            <span className="voter-value">{vc.Voter.address}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 處理流程時間軸 */}
              <div className="timeline-section">
                <h3>⏱️ 處理流程</h3>
                <div className="timeline">
                  <div className="timeline-item completed">
                    <div className="timeline-icon">✓</div>
                    <div className="timeline-content">
                      <div className="timeline-title">案件建立</div>
                      <div className="timeline-time">{formatDate(caseDetail.created_at)}</div>
                    </div>
                  </div>
                  
                  {caseDetail.status !== '待處理' && (
                    <div className="timeline-item completed">
                      <div className="timeline-icon">✓</div>
                      <div className="timeline-content">
                        <div className="timeline-title">開始處理</div>
                        <div className="timeline-time">案件已開始處理</div>
                      </div>
                    </div>
                  )}
                  
                  <div className={`timeline-item ${caseDetail.status === '處理中' ? 'active' : caseDetail.status === '已完成' ? 'completed' : ''}`}>
                    <div className="timeline-icon">{caseDetail.status === '已完成' ? '✓' : '●'}</div>
                    <div className="timeline-content">
                      <div className="timeline-title">
                        {caseDetail.status === '已完成' ? '案件完成' : '處理中'}
                      </div>
                      <div className="timeline-time">
                        {caseDetail.status === '已完成' ? '案件已順利完成' : '正在處理中'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 處理記錄 */}
              <div className="records-section">
                <h3>📝 處理記錄</h3>
                
                {processLogs.length > 0 ? (
                  <div className="records-list">
                    {processLogs.map((log) => (
                      <div key={log.id} className="record-entry">
                        <div className="record-header">
                          <span className="record-author">
                            {log.MemberRecord?.[0]?.Member?.name || '系統'}
                          </span>
                          <span className="record-time">{formatDate(log.created_at)}</span>
                        </div>
                        <div className="record-content">{log.content}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-records">
                    <p>尚無處理記錄</p>
                  </div>
                )}
              </div>

              {/* 新增處理記錄 */}
              <div className="add-record-section">
                <h3>➕ 新增處理記錄</h3>
                <textarea 
                  placeholder="輸入處理進度或備註..." 
                  value={updateNote}
                  onChange={(e) => setUpdateNote(e.target.value)}
                  rows="4"
                  className="record-textarea"
                />
                
                <div className="record-actions">
                  <div className="notify-option">
                    <input 
                      type="checkbox" 
                      id="notify-user" 
                      checked={notifyUser}
                      onChange={(e) => setNotifyUser(e.target.checked)}
                    />
                    <label htmlFor="notify-user">通知陳情人此更新</label>
                  </div>
                  
                  <button 
                    className="save-record-btn" 
                    onClick={handleSaveLog}
                    disabled={saveLoading || !updateNote.trim()}
                  >
                    {saveLoading ? (
                      <>
                        <div className="loading-spinner"></div>
                        儲存中...
                      </>
                    ) : (
                      '儲存記錄'
                    )}
                  </button>
                </div>
              </div>

              {/* 通知設定 */}
              <div className="notification-section">
                <h3>🔔 通知設定</h3>
                <div className="notification-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="notificationMethod">通知方式</label>
                      <select
                        id="notificationMethod"
                        name="method"
                        value={notificationSettings.method}
                        onChange={handleNotificationChange}
                      >
                        <option value="電話">電話</option>
                        <option value="簡訊">簡訊</option>
                        <option value="電子郵件">電子郵件</option>
                        <option value="Line">Line</option>
                      </select>
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="reminderDate">提醒日期時間</label>
                      <input
                        type="datetime-local"
                        id="reminderDate"
                        name="reminderDate"
                        value={notificationSettings.reminderDate}
                        onChange={handleNotificationChange}
                      />
                    </div>
                  </div>
                  
                  {notificationSettings.method !== '電話' && (
                    <div className="form-group">
                      <label htmlFor="reminderMessage">通知訊息</label>
                      <textarea
                        id="reminderMessage"
                        name="reminderMessage"
                        rows="3"
                        value={notificationSettings.reminderMessage}
                        onChange={handleNotificationChange}
                        placeholder={`請輸入通知訊息內容，將透過${notificationSettings.method}發送...`}
                      />
                    </div>
                  )}
                  
                  <div className="multi-notification-option">
                    <input 
                      type="checkbox" 
                      id="sendMultipleNotices" 
                      name="sendMultipleNotices"
                      checked={notificationSettings.sendMultipleNotices}
                      onChange={handleNotificationChange}
                    />
                    <label htmlFor="sendMultipleNotices">
                      設定多次提醒（會在設定時間前1天、當天和逾期時自動發送通知）
                    </label>
                  </div>
                  
                  <div className="notification-actions">
                    <button 
                      className="calendar-btn"
                      onClick={handleSyncCalendar}
                    >
                      📅 同步至 Google 行事曆
                    </button>
                    <button 
                      className="notification-btn"
                      onClick={handleSendNotification}
                    >
                      🔔 發送通知
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="no-data">
              <p>無法載入案件詳情</p>
            </div>
          )}
        </div>
      </div>

      {/* 通知提示 */}
      {notification && (
        <div className={`notification-toast ${notification.type}`}>
          <div className="notification-content">
            <span className="notification-icon">
              {notification.type === 'success' ? '✓' : '❌'}
            </span>
            <span className="notification-message">{notification.message}</span>
          </div>
          <button 
            className="notification-close" 
            onClick={() => setNotification(null)}
          >
            ×
          </button>
        </div>
      )}
    </div>
  )
}

export default CaseDetailModal