import React, { useState, useEffect, useCallback } from 'react'
import CaseTabs from './CaseTabs'
import CaseFilters from './CaseFilters'
import CaseCard from './CaseCard'
import CaseModal from './CaseModal/CaseModal'
import { CaseService } from '../../services/caseService'
import { PermissionService } from '../../services/permissionService'

function CaseManagement({ member, team }) {
  // 修改權限檢查邏輯：允許負責人和幕僚都能新增案件
  const canViewAll = PermissionService.hasPermission(member, 'case_view_all') || 
                     member?.is_leader === true || 
                     member?.role === 'staff'
                     
  const canCreate = PermissionService.hasPermission(member, 'case_create') || 
                   member?.is_leader === true || 
                   member?.role === 'staff'
                   
  const canAssign = PermissionService.hasPermission(member, 'case_assign') || 
                   member?.is_leader === true

  // 除錯資訊
  console.log('=== CaseManagement 權限檢查 ===')
  console.log('member:', member)
  console.log('member.role:', member?.role)
  console.log('member.is_leader:', member?.is_leader)
  console.log('原始權限檢查結果:')
  console.log('- PermissionService.hasPermission(member, "case_view_all"):', 
              PermissionService.hasPermission(member, 'case_view_all'))
  console.log('- PermissionService.hasPermission(member, "case_create"):', 
              PermissionService.hasPermission(member, 'case_create'))
  console.log('- PermissionService.hasPermission(member, "case_assign"):', 
              PermissionService.hasPermission(member, 'case_assign'))
  console.log('修正後權限結果:')
  console.log('- canViewAll:', canViewAll)
  console.log('- canCreate:', canCreate)
  console.log('- canAssign:', canAssign)

  const [activeTab, setActiveTab] = useState('all')
  const [currentFilters, setCurrentFilters] = useState({})
  const [searchTerm, setSearchTerm] = useState('')
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
      console.log('載入案件，團隊:', team.id, '狀態:', activeTab, '篩選:', currentFilters, '搜尋:', searchTerm)
      
      const result = await CaseService.getCases({
        groupId: team.id,
        status: activeTab,
        filters: currentFilters,
        searchTerm: searchTerm,
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
  }, [team.id, activeTab, currentFilters, searchTerm])

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

  const handleSearch = (term) => {
    setSearchTerm(term)
    console.log('搜尋條件變更:', term)
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
    console.log('=== handleAddCase 權限檢查 ===')
    console.log('canCreate:', canCreate)
    console.log('member.role:', member?.role)
    console.log('member.is_leader:', member?.is_leader)
    
    if (!canCreate) {
      // 提供更詳細的錯誤訊息
      let errorMessage = '您沒有建立案件的權限。'
      
      if (!member) {
        errorMessage += ' 無法取得成員資訊。'
      } else if (!member.role && !member.is_leader) {
        errorMessage += ' 您的角色資訊不完整。'
      } else {
        errorMessage += ` 您的角色：${member.role}，是否為負責人：${member.is_leader}。只有負責人和幕僚可以建立案件。`
      }
      
      alert(errorMessage)
      return
    }
    
    console.log('權限檢查通過，開啟新增案件視窗')
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

  // 修正承辦人員名稱顯示邏輯
  const getHandlerName = (caseItem) => {
    console.log('=== getHandlerName ===')
    console.log('案件資料:', caseItem)
    
    // 從 InChargeCase 中取得承辦人員資訊
    const inCharge = caseItem.InChargeCase || []
    console.log('InChargeCase 資料:', inCharge)
    
    if (inCharge.length > 0) {
      // 如果有多筆記錄，我們需要決定要顯示哪一筆
      // 方案1: 顯示最後一筆（最新的）
      // 方案2: 顯示第一筆有 member_id 的記錄
      // 方案3: 顯示所有有效的承辦人員
      
      // 採用方案2: 找第一筆有 member_id 且有 Member 資料的記錄
      const validRecord = inCharge.find(record => 
        record.member_id && record.Member
      )
      
      if (validRecord) {
        console.log('找到有效的承辦人員記錄:', validRecord)
        return validRecord.Member.name
      }
      
      // 如果沒有找到有效記錄，檢查是否都是 null（未指派）
      const allNull = inCharge.every(record => !record.member_id)
      if (allNull) {
        console.log('所有記錄的 member_id 都是 null，尚未指派')
        return '尚未指派'
      }
      
      // 如果有 member_id 但沒有 Member 資料，可能是資料不一致
      console.log('有 member_id 但無 Member 資料，資料可能不一致')
      return '資料異常'
    }
    
    console.log('無 InChargeCase 記錄')
    return '尚未指派'
  }

  const getReceiverName = (caseItem) => {
    // 從 CaseMember 中取得受理人員資訊
    const caseMembers = caseItem.CaseMember || []
    const receiver = caseMembers.find(cm => cm.role === 'receiver')
    if (receiver && receiver.Member) {
      return receiver.Member.name
    }
    return '未知'
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
        if (currentFilters.assignee === 'unassigned') {
          activeFilters.push(`承辦人員: 尚未指派`)
        } else {
          activeFilters.push(`承辦人員: ${currentFilters.assignee}`)
        }
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

    if (loading) {
      return (
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '16px' }}>⏳</div>
          <h3 style={{ color: '#333', marginBottom: '12px' }}>載入中...</h3>
          <p style={{ color: '#666' }}>正在載入案件資料</p>
        </div>
      )
    }

    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
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
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '8px',
                      fontSize: '0.75rem',
                      color: '#888',
                      marginTop: '12px'
                    }}>
                      <span>
                        狀態: {CaseService.getStatusLabel(caseItem.status)}
                      </span>
                      <span>
                        優先順序: {CaseService.getPriorityLabel(caseItem.priority)}
                      </span>
                      <span>
                        受理人員: {getReceiverName(caseItem)}
                      </span>
                      <span>
                        承辦人員: {getHandlerName(caseItem)}
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
    <div>
      {/* 案件統計卡片 */}
      <CaseCard stats={stats} />
      
      {/* 案件管理主要區域 */}
      <div style={{ 
        background: 'white', 
        borderRadius: '12px', 
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        minHeight: '600px'
      }}>
        {/* 將 CaseActionButton 的 props 傳遞給 CaseTabs */}
        <CaseTabs 
          activeTab={activeTab} 
          onTabChange={handleTabChange}
          onViewModeChange={handleViewModeChange}
          onAddCase={handleAddCase}
        />
        
        {/* CaseFilters 現在包含搜尋功能 */}
        <CaseFilters 
          team={team}
          onFiltersChange={handleFiltersChange}
          onSearch={handleSearch}
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
    </div>
  )
}

export default CaseManagement