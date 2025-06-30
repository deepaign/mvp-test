// src/components/Case/CaseDashboard.jsx
import React, { useState, useEffect } from 'react'
import { CaseService } from '../../services/caseService'
import CreateCaseModal from './CreateCaseModal'
import CaseDetailModal from './CaseDetailModal'
import '../../styles/CaseDashboard.css'

function CaseDashboard({ member, team }) {
  // 狀態管理
  const [cases, setCases] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statistics, setStatistics] = useState({
    total: 0,
    pending: 0,
    processing: 0,
    completed: 0
  })
  
  // 篩選和搜尋狀態
  const [activeTab, setActiveTab] = useState('全部案件')
  const [filters, setFilters] = useState({
    category: '全部',
    priority: '全部',
    search: ''
  })
  const [viewMode, setViewMode] = useState('card') // 'card' 或 'list'
  
  // Modal 狀態
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [selectedCase, setSelectedCase] = useState(null)
  
  // 通知狀態
  const [notification, setNotification] = useState(null)

  // 載入案件資料
  const loadCases = async () => {
    try {
      setLoading(true)
      setError('')
      
      const filterParams = {
        status: activeTab === '全部案件' ? '全部' : activeTab,
        category: filters.category,
        priority: filters.priority,
        search: filters.search
      }
      
      const result = await CaseService.getTeamCases(team.id, member.auth_user_id, filterParams)
      
      if (result.success) {
        setCases(result.cases)
        setStatistics(result.stats)
      } else {
        setError(result.message)
      }
    } catch (error) {
      console.error('載入案件失敗:', error)
      setError('載入案件失敗，請稍後重試')
    } finally {
      setLoading(false)
    }
  }

  // 組件載入時獲取案件
  useEffect(() => {
    loadCases()
  }, [activeTab, filters, team.id, member.auth_user_id])

  // 處理篩選變更
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }

  // 處理搜尋
  const handleSearch = (e) => {
    handleFilterChange('search', e.target.value)
  }

  // 切換視圖模式
  const toggleViewMode = () => {
    setViewMode(prev => prev === 'card' ? 'list' : 'card')
  }

  // 打開新增案件 Modal
  const openCreateModal = () => {
    setIsCreateModalOpen(true)
  }

  // 關閉新增案件 Modal
  const closeCreateModal = () => {
    setIsCreateModalOpen(false)
  }

  // 處理案件新增成功
  const handleCaseCreated = (newCase) => {
    setCases(prev => [newCase, ...prev])
    setStatistics(prev => ({
      ...prev,
      total: prev.total + 1,
      pending: newCase.status === '待處理' ? prev.pending + 1 : prev.pending,
      processing: newCase.status === '處理中' ? prev.processing + 1 : prev.processing,
      completed: newCase.status === '已完成' ? prev.completed + 1 : prev.completed
    }))
    
    showNotification(`案件 ${newCase.title} 已成功建立！`, 'success')
    closeCreateModal()
  }

  // 查看案件詳情
  const handleViewCase = (caseItem) => {
    setSelectedCase(caseItem)
    setIsDetailModalOpen(true)
  }

  // 關閉案件詳情 Modal
  const closeDetailModal = () => {
    setIsDetailModalOpen(false)
    setSelectedCase(null)
  }

  // 顯示通知
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3000)
  }

  // 狀態樣式映射
  const getStatusClass = (status) => {
    switch(status) {
      case '處理中': return 'status-processing'
      case '已完成': return 'status-completed'
      case '待處理': return 'status-pending'
      default: return 'status-pending'
    }
  }

  // 優先級樣式映射
  const getPriorityClass = (priority) => {
    switch(priority) {
      case '緊急': return 'priority-high'
      case '一般': return 'priority-medium'
      case '低': return 'priority-low'
      default: return 'priority-medium'
    }
  }

  // 格式化日期
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  }

  return (
    <div className="case-dashboard">
      {/* 統計卡片 */}
      <div className="statistics-cards">
        <div className="stat-card pending">
          <div className="stat-content">
            <div className="stat-title">待處理案件</div>
            <div className="stat-number">{statistics.pending}</div>
          </div>
        </div>
        
        <div className="stat-card processing">
          <div className="stat-content">
            <div className="stat-title">處理中案件</div>
            <div className="stat-number">{statistics.processing}</div>
          </div>
        </div>
        
        <div className="stat-card completed">
          <div className="stat-content">
            <div className="stat-title">已完成案件</div>
            <div className="stat-number">{statistics.completed}</div>
          </div>
        </div>
        
        <div className="stat-card total">
          <div className="stat-content">
            <div className="stat-title">總案件數</div>
            <div className="stat-number">{statistics.total}</div>
          </div>
        </div>
      </div>

      {/* 操作區域 */}
      <div className="dashboard-actions">
        <div className="action-left">
          <button 
            className="view-toggle-btn"
            onClick={toggleViewMode}
            title={viewMode === 'card' ? '切換到列表檢視' : '切換到卡片檢視'}
          >
            <span className={viewMode === 'card' ? 'list-icon' : 'card-icon'}>
              {viewMode === 'card' ? '☰' : '⊞'}
            </span>
            {viewMode === 'card' ? '列表檢視' : '卡片檢視'}
          </button>
        </div>
        
        <div className="action-right">
          <button 
            className="create-case-btn"
            onClick={openCreateModal}
          >
            <span className="plus-icon">+</span>
            新增案件
          </button>
        </div>
      </div>

      {/* 案件頁籤 */}
      <div className="case-tabs">
        {['全部案件', '待處理', '處理中', '已完成'].map(tab => (
          <div
            key={tab}
            className={`tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </div>
        ))}
      </div>

      {/* 篩選器 */}
      <div className="filters">
        <div className="filter-group">
          <label>類別:</label>
          <select 
            value={filters.category}
            onChange={(e) => handleFilterChange('category', e.target.value)}
          >
            <option value="全部">全部</option>
            <option value="交通問題">交通問題</option>
            <option value="環境問題">環境問題</option>
            <option value="治安問題">治安問題</option>
            <option value="民生服務">民生服務</option>
            <option value="法律諮詢">法律諮詢</option>
            <option value="其他問題">其他問題</option>
          </select>
        </div>
        
        <div className="filter-group">
          <label>優先級:</label>
          <select
            value={filters.priority}
            onChange={(e) => handleFilterChange('priority', e.target.value)}
          >
            <option value="全部">全部</option>
            <option value="緊急">緊急</option>
            <option value="一般">一般</option>
            <option value="低">低</option>
          </select>
        </div>
        
        <div className="search-box">
          <input 
            type="text" 
            placeholder="搜尋案件..." 
            value={filters.search}
            onChange={handleSearch}
          />
          <span className="search-icon">🔍</span>
        </div>
      </div>

      {/* 錯誤訊息 */}
      {error && (
        <div className="error-message">
          ❌ {error}
        </div>
      )}

      {/* 案件列表 */}
      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>載入案件中...</p>
        </div>
      ) : (
        <>
          {viewMode === 'card' ? (
            /* 卡片視圖 */
            <div className="case-cards">
              {cases.length > 0 ? (
                cases.map((caseItem) => (
                  <div key={caseItem.id} className="case-card">
                    <div className="card-header">
                      <div className="case-id">{caseItem.id}</div>
                      <div className={`case-priority ${getPriorityClass(caseItem.priority)}`}>
                        {caseItem.priority}
                      </div>
                    </div>
                    
                    <div className="card-body">
                      <h3 className="case-title">{caseItem.title}</h3>
                      
                      <div className="case-meta">
                        <div className="meta-item">
                          <span className="meta-label">類別:</span>
                          <span className="meta-value">{caseItem.category || '未分類'}</span>
                        </div>
                        <div className="meta-item">
                          <span className="meta-label">聯絡方式:</span>
                          <span className="meta-value">{caseItem.contact_type || '未指定'}</span>
                        </div>
                        <div className="meta-item">
                          <span className="meta-label">開始日期:</span>
                          <span className="meta-value">{formatDate(caseItem.start_date)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="card-footer">
                      <div className="case-date">{formatDate(caseItem.created_at)}</div>
                      <div className="case-status">
                        <span className={`status-tag ${getStatusClass(caseItem.status)}`}>
                          {caseItem.status}
                        </span>
                      </div>
                      <div className="case-actions">
                        <button 
                          className="action-btn view-btn" 
                          onClick={() => handleViewCase(caseItem)}
                        >
                          查看詳情
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <div className="empty-icon">📭</div>
                  <p>沒有符合條件的案件</p>
                </div>
              )}
            </div>
          ) : (
            /* 列表視圖 */
            <div className="case-list-container">
              <table className="case-list-table">
                <thead>
                  <tr>
                    <th>案件編號</th>
                    <th>案件標題</th>
                    <th>狀態</th>
                    <th>優先級</th>
                    <th>類別</th>
                    <th>建立日期</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {cases.length > 0 ? (
                    cases.map((caseItem) => (
                      <tr key={caseItem.id}>
                        <td className="case-id-cell">{caseItem.id}</td>
                        <td className="case-title-cell">{caseItem.title}</td>
                        <td>
                          <span className={`status-tag ${getStatusClass(caseItem.status)}`}>
                            {caseItem.status}
                          </span>
                        </td>
                        <td>
                          <span className={`priority-tag ${getPriorityClass(caseItem.priority)}`}>
                            {caseItem.priority}
                          </span>
                        </td>
                        <td>{caseItem.category || '未分類'}</td>
                        <td>{formatDate(caseItem.created_at)}</td>
                        <td>
                          <button 
                            className="list-view-btn" 
                            onClick={() => handleViewCase(caseItem)}
                          >
                            查看
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr className="empty-row">
                      <td colSpan="7">
                        <div className="empty-state">
                          <div className="empty-icon">📭</div>
                          <p>沒有符合條件的案件</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* 新增案件 Modal */}
      <CreateCaseModal 
        isOpen={isCreateModalOpen}
        onClose={closeCreateModal}
        onSave={handleCaseCreated}
        member={member}
        team={team}
      />

      {/* 案件詳情 Modal */}
      <CaseDetailModal 
        isOpen={isDetailModalOpen}
        onClose={closeDetailModal}
        caseData={selectedCase}
        member={member}
        team={team}
        onUpdate={loadCases}
      />

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

export default CaseDashboard