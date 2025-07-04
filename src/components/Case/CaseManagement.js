import React, { useState, useEffect, useCallback } from 'react'
import CaseTabs from './CaseTabs'
import CaseFilters from './CaseFilters'
import CaseModal from './CaseModal/CaseModal'
import { CaseService } from '../../services/caseService'
import { PermissionService } from '../../services/permissionService'


function CaseManagement({ member, team }) {
  const canViewAll = PermissionService.hasPermission(member, 'case_view_all')
  const canCreate = PermissionService.hasPermission(member, 'case_create')
  const canAssign = PermissionService.hasPermission(member, 'case_assign')

  const [activeTab, setActiveTab] = useState('all')
  const [currentFilters, setCurrentFilters] = useState({})
  const [viewMode, setViewMode] = useState('card') // 'card' 或 'list'
  const [showCaseModal, setShowCaseModal] = useState(false)
  const [cases, setCases] = useState([])
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState({
    total: 0,
    byStatus: { pending: 0, processing: 0, completed: 0 },
    byPriority: { urgent: 0, normal: 0, low: 0 }
  })

  const loadCases = useCallback(async () => {
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
  }, [team.id, activeTab, currentFilters])

  const loadStats = useCallback(async () => {
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
  }, [team.id])

  // 載入案件資料
  useEffect(() => {
    if (team?.id) {
      loadCases()
      loadStats()
    }
  }, [team?.id, loadCases, loadStats])

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
    if (!canCreate) {
      alert('您沒有建立案件的權限')
      return
    }
    console.log('點擊新增案件')
    setShowCaseModal(true)
  }

  const handleCaseCreated = async (caseData) => {
    console.log('=== CaseManagement.handleCaseCreated ===')
    console.log('收到新建立的案件:', caseData)
    
    try {
      // 重新載入案件列表和統計
      console.log('重新載入案件列表和統計資料...')
      await Promise.all([loadCases(), loadStats()])
      
      console.log('✅ 案件列表和統計資料已更新')
      
      // 案件建立成功的額外處理
      // 可以在這裡添加成功通知或其他邏輯
      
    } catch (error) {
      console.error('❌ 重新載入資料失敗:', error)
      // 即使重新載入失敗，也不影響案件建立成功的事實
    }
  }

  const handleCloseModal = () => {
    console.log('關閉案件建立視窗')
    setShowCaseModal(false)
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
        default:
          statusCount = stats.total
          statusIcon = '📋'
          statusTitle = '全部案件'
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
            
            {/* 案件列表 */}
            <div style={{ 
              marginTop: '24px', 
              padding: '20px', 
              background: '#f8f9fa', 
              borderRadius: '8px',
              textAlign: 'left'
            }}>
              <h4 style={{ marginBottom: '16px', color: '#333' }}>案件列表</h4>
              <div style={{ 
                display: 'grid', 
                gap: '12px',
                gridTemplateColumns: viewMode === 'card' ? 'repeat(auto-fill, minmax(300px, 1fr))' : '1fr'
              }}>
                {cases.map((caseItem, index) => (
                  <div key={caseItem.id || index} style={{
                    background: 'white',
                    padding: '16px',
                    borderRadius: '6px',
                    border: '1px solid #e0e0e0',
                    cursor: 'pointer',
                    transition: 'box-shadow 0.2s ease',
                    ':hover': {
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }
                  }}>
                    <h5 style={{ margin: '0 0 8px 0', color: '#333' }}>
                      {caseItem.title || '未命名案件'}
                    </h5>
                    <p style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: '#666' }}>
                      {caseItem.description ? 
                        (caseItem.description.length > 100 ? 
                          `${caseItem.description.substring(0, 100)}...` : 
                          caseItem.description
                        ) : 
                        '無描述'
                      }
                    </p>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      fontSize: '0.8rem',
                      color: '#888'
                    }}>
                      <span>
                        狀態: {CaseService.getStatusLabel(caseItem.status)}
                      </span>
                      <span>
                        優先順序: {CaseService.getPriorityLabel(caseItem.priority)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div>
            <p style={{ color: '#666', marginBottom: '20px' }}>
              目前沒有案件
            </p>
            {getFilterSummary()}
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

      {/* 新增案件彈窗 */}
      <CaseModal
        isOpen={showCaseModal}
        onClose={handleCloseModal}
        team={team}
        onCaseCreated={handleCaseCreated}
      />
    </div>
  )
}

export default CaseManagement