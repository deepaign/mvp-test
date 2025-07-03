import React, { useState, useEffect } from 'react'
import CaseTabs from './CaseTabs'
import CaseFilters from './CaseFilters'
import { CaseService } from '../../services/caseService'

function CaseManagement({ member, team }) {
  const [activeTab, setActiveTab] = useState('all')
  const [currentFilters, setCurrentFilters] = useState({})
  const [viewMode, setViewMode] = useState('card') // 'card' 或 'list'
  const [cases, setCases] = useState([])
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState({
    total: 0,
    byStatus: { pending: 0, processing: 0, completed: 0 },
    byPriority: { urgent: 0, normal: 0, low: 0 }
  })

  // 載入案件資料
  useEffect(() => {
    if (team?.id) {
      loadCases()
      loadStats()
    }
  }, [team?.id, activeTab, currentFilters])

  const loadCases = async () => {
    setLoading(true)
    try {
      console.log('載入案件，團隊:', team.id, '狀態:', activeTab, '篩選:', currentFilters)
      
      const result = await CaseService.getCases({
        groupId: team.id,
        status: activeTab,
        filters: currentFilters,
        page: 0,
        limit: 50
      })

      console.log('案件載入結果:', result)

      if (result.success) {
        setCases(result.data)
      } else {
        console.error('載入案件失敗:', result.error)
        setCases([])
      }

    } catch (error) {
      console.error('載入案件發生錯誤:', error)
      setCases([])
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const result = await CaseService.getCaseStats(team.id)
      
      if (result.success) {
        setStats(result.data)
      } else {
        console.error('載入統計失敗:', result.error)
      }

    } catch (error) {
      console.error('載入統計發生錯誤:', error)
    }
  }

  const handleTabChange = (tabId) => {
    setActiveTab(tabId)
    console.log('切換到案件狀態:', tabId)
  }

  const handleFiltersChange = (filters) => {
    setCurrentFilters(filters)
    console.log('篩選條件變更:', filters)
  }

  const handleViewModeChange = (mode) => {
    setViewMode(mode)
    console.log('檢視模式變更:', mode)
  }

  const handleAddCase = () => {
    console.log('點擊新增案件')
    // TODO: 實作新增案件功能
  }

  const renderCaseContent = () => {
    const getFilterSummary = () => {
      const activeFilters = []
      
      if (currentFilters.category && currentFilters.category !== 'all') {
        const categoryName = CaseService.getCategoryName(currentFilters.category)
        activeFilters.push(`類型: ${categoryName}`)
      }
      if (currentFilters.dateRange && currentFilters.dateRange !== 'all') {
        let dateLabel = currentFilters.dateRange
        if (dateLabel === 'today') dateLabel = '本日'
        else if (dateLabel === 'week') dateLabel = '本週'
        else if (dateLabel === 'month') dateLabel = '本月'
        else if (dateLabel === 'custom') dateLabel = '自定義範圍'
        activeFilters.push(`日期: ${dateLabel}`)
      }
      if (currentFilters.priority && currentFilters.priority !== 'all') {
        const priorityLabel = CaseService.getPriorityLabel(currentFilters.priority)
        activeFilters.push(`優先順序: ${priorityLabel}`)
      }
      if (currentFilters.assignee && currentFilters.assignee !== 'all') {
        activeFilters.push(`負責人: ${currentFilters.assignee}`)
      }

      return activeFilters.length > 0 ? (
        <div style={{ 
          margin: '16px 0', 
          padding: '8px 12px', 
          background: '#f8f9fa', 
          borderRadius: '6px',
          fontSize: '0.85rem',
          color: '#666'
        }}>
          目前篩選: {activeFilters.join(' | ')}
        </div>
      ) : null
    }

    const getStatusInfo = () => {
      let statusCount = 0
      let statusIcon = '📋'
      let statusTitle = '全部案件'

      switch (activeTab) {
        case 'all':
          statusCount = stats.total
          statusIcon = '📋'
          statusTitle = '全部案件'
          break
        case 'pending':
          statusCount = stats.byStatus.pending
          statusIcon = '⏳'
          statusTitle = '待處理案件'
          break
        case 'processing':
          statusCount = stats.byStatus.processing
          statusIcon = '🔄'
          statusTitle = '處理中案件'
          break
        case 'completed':
          statusCount = stats.byStatus.completed
          statusIcon = '✅'
          statusTitle = '已完成案件'
          break
      }

      return { statusCount, statusIcon, statusTitle }
    }

    if (loading) {
      return (
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '16px' }}>⏳</div>
          <h3 style={{ color: '#333', marginBottom: '12px' }}>載入中...</h3>
          <p style={{ color: '#666' }}>正在載入案件資料</p>
        </div>
      )
    }

    const { statusCount, statusIcon, statusTitle } = getStatusInfo()

    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', marginBottom: '16px' }}>{statusIcon}</div>
        <h3 style={{ color: '#333', marginBottom: '12px' }}>
          {statusTitle} ({statusCount})
        </h3>
        
        {cases.length > 0 ? (
          <div>
            <p style={{ color: '#666', marginBottom: '20px' }}>
              找到 {cases.length} 筆案件
            </p>
            {getFilterSummary()}
            <div style={{ 
              marginTop: '24px', 
              padding: '16px', 
              background: '#e3f2fd', 
              borderRadius: '8px',
              fontSize: '0.9rem',
              color: '#1976d2'
            }}>
              📊 案件列表組件開發中，目前顯示案件數量統計
              <br />
              <small style={{ opacity: 0.8 }}>
                檢視模式: {viewMode === 'card' ? '卡片檢視' : '逐條檢視'}
              </small>
            </div>
          </div>
        ) : (
          <div>
            <p style={{ color: '#666', marginBottom: '20px' }}>
              目前沒有案件
            </p>
            {getFilterSummary()}
            <div style={{ 
              marginTop: '24px', 
              padding: '16px', 
              background: '#f8f9fa', 
              borderRadius: '8px',
              fontSize: '0.9rem',
              color: '#666'
            }}>
              💡 提示：篩選功能已準備就緒，案件資料載入功能已完成
              <br />
              <small style={{ opacity: 0.8 }}>
                統計資料 - 總計: {stats.total} | 
                待處理: {stats.byStatus.pending} | 
                處理中: {stats.byStatus.processing} | 
                已完成: {stats.byStatus.completed}
              </small>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ 
      background: 'white', 
      borderRadius: '12px', 
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      minHeight: '600px'
    }}>
      <CaseTabs 
        activeTab={activeTab} 
        onTabChange={handleTabChange} 
      />
      
      <CaseFilters 
        team={team}
        onFiltersChange={handleFiltersChange}
        onViewModeChange={handleViewModeChange}
        onAddCase={handleAddCase}
      />
      
      <div style={{ 
        background: 'white',
        borderRadius: '0 0 12px 12px',
        minHeight: '500px'
      }}>
        {renderCaseContent()}
      </div>
    </div>
  )
}

export default CaseManagement