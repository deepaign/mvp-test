// src/components/Case/CaseManagement.js - 完整修正版本 (610+ 行)
import React, { useState, useEffect, useCallback, useRef } from 'react'
import CaseTabs from './CaseTabs'
import CaseFilters from './CaseFilters'
import CaseCard from './CaseCard'
import CaseModal from './CaseModal/CaseModal'
import CaseListView from './CaseTables/CaseListView'
import CaseCardView from './CaseTables/CaseCardView'
import CasePagination from './CaseTables/CasePagination'
import CaseEditModal from './CaseTables/CaseEditModal'
import { CaseService } from '../../services/caseService'
import { PermissionService } from '../../services/permissionService'

function CaseManagement({ member, team }) {
  // 權限檢查 - 只保留實際使用的權限
  const canCreate = PermissionService.hasPermission(member, 'case_create') || 
                   member?.is_leader === true || 
                   member?.role === 'staff'

  const canEdit = PermissionService.hasPermission(member, 'case_edit') || 
                  member?.is_leader === true || 
                  member?.role === 'staff'

  const canDelete = PermissionService.hasPermission(member, 'case_delete') || 
                    member?.is_leader === true

  const canViewAll = PermissionService.hasPermission(member, 'case_view_all') || 
                     member?.is_leader === true

  // 狀態管理
  const [activeTab, setActiveTab] = useState('all')
  const [currentFilters, setCurrentFilters] = useState({})
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState('card')
  const [showCaseModal, setShowCaseModal] = useState(false)
  const [sortConfig, setSortConfig] = useState({ field: 'created_at', direction: 'desc' })
  
  // 編輯案件相關狀態
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingCase, setEditingCase] = useState(null)
  
  // 批量操作狀態
  const [selectedCases, setSelectedCases] = useState([])
  const [showBulkActions, setShowBulkActions] = useState(false)
  const [bulkActionLoading, setBulkActionLoading] = useState(false)
  
  // 案件資料狀態
  const [allCases, setAllCases] = useState([])
  const [filteredCases, setFilteredCases] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [stats, setStats] = useState({
    total: 0,
    byStatus: { pending: 0, processing: 0, completed: 0, resolved: 0, closed: 0 },
    byPriority: { urgent: 0, normal: 0, low: 0 }
  })

  // 分頁狀態
  const [currentPage, setCurrentPage] = useState(0)
  const [pageSize, setPageSize] = useState(20)

  // 防止重複載入的 ref
  const loadingRef = useRef(false)
  const initialLoadRef = useRef(false)

  // 🔧 安全的統計資料更新函數
  const updateStats = useCallback((casesData) => {
    // 確保輸入是陣列
    const validCases = Array.isArray(casesData) ? casesData : []
    
    const newStats = {
      total: validCases.length,
      byStatus: {
        pending: validCases.filter(c => c.status === 'pending').length,
        processing: validCases.filter(c => c.status === 'processing').length,
        completed: validCases.filter(c => c.status === 'completed').length,
        resolved: validCases.filter(c => c.status === 'resolved').length,
        closed: validCases.filter(c => c.status === 'closed').length
      },
      byPriority: {
        urgent: validCases.filter(c => c.priority === 'urgent').length,
        normal: validCases.filter(c => c.priority === 'normal').length,
        low: validCases.filter(c => c.priority === 'low').length
      }
    }
    
    setStats(newStats)
  }, [])

  // 載入案件資料 - 只依賴 team.id
  const loadCases = useCallback(async () => {
    if (!team?.id || loadingRef.current) {
      console.warn('無法載入案件：', !team?.id ? '缺少團隊ID' : '正在載入中')
      return
    }

    loadingRef.current = true
    setLoading(true)
    setError('')

    try {
      console.log('載入案件資料，團隊:', team.id)
      
      const result = await CaseService.getCases({
        groupId: team.id,
        status: 'all', // 載入所有狀態
        filters: {}, // 不在後端篩選
        searchTerm: '', // 不在後端搜尋
        page: 0,
        limit: 1000, // 載入足夠多的資料
        sortConfig: sortConfig
      })

      if (result.success) {
        // 🔧 確保資料是陣列
        const casesData = Array.isArray(result.data) ? result.data : []
        setAllCases(casesData)
        console.log(`載入成功，共 ${casesData.length} 筆案件`)
        
        // 更新統計資料
        updateStats(casesData)
      } else {
        console.error('載入案件失敗:', result.error)
        setAllCases([]) // 🔧 設定空陣列而不是 undefined
        updateStats([])
        setError(result.error || '載入案件失敗')
      }

    } catch (error) {
      console.error('載入案件發生錯誤:', error)
      setAllCases([]) // 🔧 設定空陣列而不是 undefined
      updateStats([])
      setError('載入案件時發生錯誤：' + error.message)
    } finally {
      setLoading(false)
      loadingRef.current = false
    }
  }, [team?.id, sortConfig, updateStats])

  // 載入統計資料
  const loadStats = useCallback(async () => {
    if (!team?.id) return

    try {
      const result = await CaseService.getCaseStats(team.id)
      
      if (result.success) {
        setStats(result.data || {
          total: 0,
          byStatus: { pending: 0, processing: 0, completed: 0, resolved: 0, closed: 0 },
          byPriority: { urgent: 0, normal: 0, low: 0 }
        })
      } else {
        console.error('載入統計失敗:', result.error)
      }
    } catch (error) {
      console.error('載入統計發生錯誤:', error)
    }
  }, [team?.id])

  // 🔧 安全的日期篩選函數
  const applyDateFilter = useCallback((data, filters) => {
    if (!filters.dateRange || filters.dateRange === 'all') {
      return data
    }

    const now = new Date()
    let startDate, endDate

    switch (filters.dateRange) {
      case 'today': {
        // 今天 00:00:00 到 23:59:59
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
        startDate = todayStart
        endDate = todayEnd
        break
      }
      
      case 'week': {
        // 本週：從週一 00:00:00 到週日 23:59:59
        const currentDay = now.getDay() // 0=週日, 1=週一, ..., 6=週六
        const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay // 計算到週一的偏移
        
        const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset)
        const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000) // 週一 + 6天 = 週日
        weekEnd.setHours(23, 59, 59, 999)
        
        startDate = weekStart
        endDate = weekEnd
        break
      }
      
      case 'month': {
        // 本月：從月初 00:00:00 到月底 23:59:59
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
        
        startDate = monthStart
        endDate = monthEnd
        break
      }
      
      case 'custom': {
        // 自定義範圍
        if (filters.startDate && filters.endDate) {
          startDate = new Date(filters.startDate)
          endDate = new Date(filters.endDate)
          endDate.setHours(23, 59, 59, 999) // 結束日期設為當天的最後一刻
        } else {
          return data // 如果自定義範圍不完整，不進行篩選
        }
        break
      }
      
      default:
        return data
    }

    console.log('日期篩選範圍:', {
      dateRange: filters.dateRange,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    })

    // 篩選資料
    const filtered = data.filter(caseItem => {
      if (!caseItem.created_at) return false
      
      const caseDate = new Date(caseItem.created_at)
      const result = caseDate >= startDate && caseDate <= endDate
      
      return result
    })

    console.log(`日期篩選: ${data.length} -> ${filtered.length}`)
    return filtered
  }, [])

  // 應用篩選邏輯 - 修正版本，加入日期篩選
  const applyFilters = useCallback((data, filters, search, status) => {
    // 確保 data 是陣列
    let filtered = Array.isArray(data) ? [...data] : []

    // 狀態篩選
    if (status !== 'all') {
      filtered = filtered.filter(caseItem => caseItem && caseItem.status === status)
    }

    // 搜尋篩選
    if (search && search.trim()) {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter(caseItem => {
        if (!caseItem) return false
        
        try {
          // 搜尋標題
          if ((caseItem.title || '').toLowerCase().includes(searchLower)) return true
          
          // 搜尋描述
          if ((caseItem.description || '').toLowerCase().includes(searchLower)) return true
          
          // 搜尋案件編號
          const caseNumber = CaseService.extractCaseNumber && typeof CaseService.extractCaseNumber === 'function' 
            ? CaseService.extractCaseNumber(caseItem.description) 
            : ''
          if (caseNumber && caseNumber.toLowerCase().includes(searchLower)) return true
          
          // 搜尋事發地點
          const location = CaseService.extractIncidentLocation && typeof CaseService.extractIncidentLocation === 'function'
            ? CaseService.extractIncidentLocation(caseItem.description)
            : ''
          if (location && location.toLowerCase().includes(searchLower)) return true
          
          // 搜尋聯絡人姓名
          const voterCases = Array.isArray(caseItem.VoterCase) ? caseItem.VoterCase : []
          if (voterCases.some(vc => vc.Voter?.name?.toLowerCase().includes(searchLower))) return true
          
          return false
        } catch (error) {
          console.warn('搜尋篩選錯誤:', error, caseItem)
          return false
        }
      })
    }

    // 日期篩選
    filtered = applyDateFilter(filtered, filters)

    // 案件類型篩選
    if (filters.category && filters.category !== 'all') {
      filtered = filtered.filter(caseItem => {
        if (!caseItem) return false
        
        try {
          const categoryCase = Array.isArray(caseItem.CategoryCase) ? caseItem.CategoryCase : []
          return categoryCase.some(cc => cc.Category?.name === filters.category)
        } catch (error) {
          console.warn('類型篩選錯誤:', error, caseItem)
          return false
        }
      })
    }

    // 優先等級篩選
    if (filters.priority && filters.priority !== 'all') {
      filtered = filtered.filter(caseItem => caseItem && caseItem.priority === filters.priority)
    }

    // 承辦人員篩選
    if (filters.handler && filters.handler !== 'all') {
      filtered = filtered.filter(caseItem => {
        if (!caseItem) return false
        
        try {
          const inChargeCase = Array.isArray(caseItem.InChargeCase) ? caseItem.InChargeCase : []
          return inChargeCase.some(ic => ic.Member?.id === filters.handler)
        } catch (error) {
          console.warn('承辦人員篩選錯誤:', error, caseItem)
          return false
        }
      })
    }

    // 受理人員篩選
    if (filters.receiver && filters.receiver !== 'all') {
      filtered = filtered.filter(caseItem => {
        if (!caseItem) return false
        
        try {
          const acceptanceCase = Array.isArray(caseItem.AcceptanceCase) ? caseItem.AcceptanceCase : []
          return acceptanceCase.some(ac => ac.Member?.id === filters.receiver)
        } catch (error) {
          console.warn('受理人員篩選錯誤:', error, caseItem)
          return false
        }
      })
    }

    // 聯絡方式篩選
    if (filters.contactMethod && filters.contactMethod !== 'all') {
      filtered = filtered.filter(caseItem => caseItem && caseItem.contact_type === filters.contactMethod)
    }

    return filtered
  }, [applyDateFilter])

  // 排序函數
  const applySorting = useCallback((data, sortConfig) => {
    if (!sortConfig.field) return data

    return [...data].sort((a, b) => {
      let aValue = a[sortConfig.field]
      let bValue = b[sortConfig.field]

      // 特殊處理日期欄位
      if (['created_at', 'received_at', 'closed_at', 'updated_at'].includes(sortConfig.field)) {
        aValue = aValue ? new Date(aValue) : new Date(0)
        bValue = bValue ? new Date(bValue) : new Date(0)
      }

      // 特殊處理聯絡人姓名
      if (sortConfig.field === 'contact_name') {
        aValue = a.VoterCase?.[0]?.Voter?.name || ''
        bValue = b.VoterCase?.[0]?.Voter?.name || ''
      }

      // 特殊處理承辦人員
      if (sortConfig.field === 'handler_name') {
        aValue = a.InChargeCase?.[0]?.Member?.name || ''
        bValue = b.InChargeCase?.[0]?.Member?.name || ''
      }

      // 處理 null 或 undefined 值
      if (aValue == null && bValue == null) return 0
      if (aValue == null) return sortConfig.direction === 'asc' ? -1 : 1
      if (bValue == null) return sortConfig.direction === 'asc' ? 1 : -1

      // 字串比較
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase()
        bValue = bValue.toLowerCase()
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1
      }
      return 0
    })
  }, [])

  // 更新篩選後的案件列表
  useEffect(() => {
    try {
      let filtered = applyFilters(allCases, currentFilters, searchTerm, activeTab)
      filtered = applySorting(filtered, sortConfig)
      setFilteredCases(filtered)
      setCurrentPage(0) // 重置頁碼
    } catch (error) {
      console.error('篩選案件時發生錯誤:', error)
      setFilteredCases([])
    }
  }, [allCases, currentFilters, searchTerm, activeTab, sortConfig, applyFilters, applySorting])

  // 初始載入
  useEffect(() => {
    if (team?.id && !initialLoadRef.current) {
      console.log('初始載入案件資料')
      initialLoadRef.current = true
      loadCases()
    }
  }, [team?.id, loadCases])

  // 處理案件更新
  const handleCaseUpdated = useCallback((updatedCaseData) => {
    console.log('案件已更新:', updatedCaseData)
    
    // 重新載入案件列表以確保資料一致性
    loadCases()
    
    // 關閉編輯模態框
    setShowEditModal(false)
    setEditingCase(null)
  }, [loadCases])

  // 處理案件建立
  const handleCaseCreated = useCallback((newCaseData) => {
    console.log('新案件已建立:', newCaseData)
    
    // 重新載入案件列表
    loadCases()
    
    // 關閉建立模態框
    setShowCaseModal(false)
  }, [loadCases])

  // 處理編輯案件
  const handleEditCase = useCallback((caseData) => {
    if (!canEdit) {
      alert('您沒有編輯案件的權限')
      return
    }
    
    console.log('開始編輯案件:', caseData)
    setEditingCase(caseData)
    setShowEditModal(true)
  }, [canEdit])

  // 處理刪除案件
  const handleDeleteCase = useCallback(async (caseData) => {
    if (!canDelete) {
      alert('您沒有刪除案件的權限')
      return
    }

    if (!confirm(`確定要刪除案件「${caseData.title}」嗎？此操作無法復原。`)) {
      return
    }

    try {
      const result = await CaseService.deleteCase(caseData.id, team.id)
      
      if (result.success) {
        console.log('案件刪除成功')
        loadCases() // 重新載入案件列表
        alert('案件刪除成功')
      } else {
        console.error('案件刪除失敗:', result.error)
        alert('案件刪除失敗：' + result.error)
      }
    } catch (error) {
      console.error('刪除案件時發生錯誤:', error)
      alert('刪除案件時發生錯誤：' + error.message)
    }
  }, [canDelete, team.id, loadCases])

  // 處理狀態變更
  const handleStatusChange = useCallback(async (caseId, newStatus) => {
    if (!canEdit) {
      alert('您沒有修改案件狀態的權限')
      return
    }

    try {
      console.log('更新案件狀態:', caseId, newStatus)
      
      const result = await CaseService.updateCaseStatus(caseId, newStatus, team.id)
      
      if (result.success) {
        console.log('狀態更新成功')
        // 重新載入案件列表
        loadCases()
      } else {
        console.error('狀態更新失敗:', result.error)
        alert('狀態更新失敗：' + result.error)
      }
    } catch (error) {
      console.error('更新狀態時發生錯誤:', error)
      alert('更新狀態時發生錯誤：' + error.message)
    }
  }, [canEdit, team.id, loadCases])

  // 處理批量選擇
  const handleSelectCase = useCallback((caseId) => {
    setSelectedCases(prev => {
      if (prev.includes(caseId)) {
        return prev.filter(id => id !== caseId)
      } else {
        return [...prev, caseId]
      }
    })
  }, [])

  // 處理全選/取消全選
  const handleSelectAll = useCallback(() => {
    if (selectedCases.length === paginatedCases.length) {
      setSelectedCases([])
    } else {
      setSelectedCases(paginatedCases.map(c => c.id))
    }
  }, [selectedCases.length, paginatedCases])

  // 處理批量狀態更新
  const handleBulkStatusUpdate = useCallback(async (newStatus) => {
    if (selectedCases.length === 0) {
      alert('請先選擇要更新的案件')
      return
    }

    if (!confirm(`確定要將 ${selectedCases.length} 個案件的狀態更新為「${CaseService.getStatusLabel(newStatus)}」嗎？`)) {
      return
    }

    setBulkActionLoading(true)

    try {
      const result = await CaseService.bulkUpdateCaseStatus(selectedCases, newStatus, team.id)
      
      if (result.success) {
        console.log('批量狀態更新成功')
        alert(`成功更新 ${result.data.updatedCount} 個案件的狀態`)
        setSelectedCases([])
        setShowBulkActions(false)
        loadCases()
      } else {
        console.error('批量狀態更新失敗:', result.error)
        alert('批量狀態更新失敗：' + result.error)
      }
    } catch (error) {
      console.error('批量狀態更新時發生錯誤:', error)
      alert('批量狀態更新時發生錯誤：' + error.message)
    } finally {
      setBulkActionLoading(false)
    }
  }, [selectedCases, team.id, loadCases])

  // 處理排序變更
  const handleSortChange = useCallback((field) => {
    setSortConfig(prev => ({
      field: field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
  }, [])

  // 處理分頁變更
  const handlePageChange = useCallback((newPage) => {
    setCurrentPage(newPage)
  }, [])

  // 處理每頁筆數變更
  const handlePageSizeChange = useCallback((newPageSize) => {
    setPageSize(newPageSize)
    setCurrentPage(0) // 重置到第一頁
  }, [])

  // 處理匯出
  const handleExport = useCallback(async (format = 'csv') => {
    try {
      console.log('開始匯出案件，格式:', format)
      
      const result = await CaseService.exportCases(team.id, currentFilters, format)
      
      if (result.success) {
        // 這裡可以實作實際的檔案下載邏輯
        console.log('匯出成功:', result.data)
        alert(`成功匯出 ${result.data.total} 筆案件`)
      } else {
        console.error('匯出失敗:', result.error)
        alert('匯出失敗：' + result.error)
      }
    } catch (error) {
      console.error('匯出時發生錯誤:', error)
      alert('匯出時發生錯誤：' + error.message)
    }
  }, [team.id, currentFilters])

  // 計算分頁資料
  const paginatedCases = React.useMemo(() => {
    // 確保 filteredCases 是陣列
    const validCases = Array.isArray(filteredCases) ? filteredCases : []
    const startIndex = currentPage * pageSize
    const endIndex = startIndex + pageSize
    return validCases.slice(startIndex, endIndex)
  }, [filteredCases, currentPage, pageSize])

  // 計算總頁數
  const totalPages = React.useMemo(() => {
    const validCases = Array.isArray(filteredCases) ? filteredCases : []
    return Math.ceil(validCases.length / pageSize)
  }, [filteredCases, pageSize])

  // 🔧 安全檢查：確保必要的 props 存在
  if (!team) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>請先選擇團隊</p>
      </div>
    )
  }

  return (
    <div className="case-management">
      {/* 錯誤提示 */}
      {error && (
        <div className="error-banner">
          <span>⚠️ {error}</span>
          <button onClick={() => setError('')}>✕</button>
        </div>
      )}

      {/* 案件統計和操作列 */}
      <div className="case-header">
        <div className="case-stats">
          <div className="stat-item">
            <span className="stat-label">總案件數</span>
            <span className="stat-value">{stats.total}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">待處理</span>
            <span className="stat-value pending">{stats.byStatus.pending}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">處理中</span>
            <span className="stat-value processing">{stats.byStatus.processing}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">已完成</span>
            <span className="stat-value completed">{stats.byStatus.completed}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">已結案</span>
            <span className="stat-value closed">{stats.byStatus.closed}</span>
          </div>
        </div>

        <div className="case-actions">
          {canCreate && (
            <button
              onClick={() => setShowCaseModal(true)}
              className="btn btn-primary"
              disabled={loading}
            >
              + 新增案件
            </button>
          )}

          <button
            onClick={() => handleExport('csv')}
            className="btn btn-secondary"
            disabled={loading || filteredCases.length === 0}
            title="匯出為 CSV"
          >
            📊 匯出
          </button>

          <button
            onClick={() => loadCases()}
            className="btn btn-secondary"
            disabled={loading}
            title="重新載入"
          >
            🔄 重新載入
          </button>
          
          <div className="view-toggle">
            <button
              onClick={() => setViewMode('card')}
              className={`view-btn ${viewMode === 'card' ? 'active' : ''}`}
              title="卡片檢視"
            >
              ⊞
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
              title="列表檢視"
            >
              ☰
            </button>
          </div>
        </div>
      </div>

      {/* 批量操作工具列 */}
      {selectedCases.length > 0 && (
        <div className="bulk-actions-bar">
          <div className="bulk-info">
            <span>已選擇 {selectedCases.length} 個案件</span>
            <button 
              onClick={() => setSelectedCases([])}
              className="btn-clear-selection"
            >
              清除選擇
            </button>
          </div>
          <div className="bulk-actions">
            <button
              onClick={() => handleBulkStatusUpdate('processing')}
              className="btn btn-sm"
              disabled={bulkActionLoading}
            >
              標記為處理中
            </button>
            <button
              onClick={() => handleBulkStatusUpdate('completed')}
              className="btn btn-sm"
              disabled={bulkActionLoading}
            >
              標記為已完成
            </button>
            <button
              onClick={() => handleBulkStatusUpdate('closed')}
              className="btn btn-sm"
              disabled={bulkActionLoading}
            >
              標記為已結案
            </button>
          </div>
        </div>
      )}

      {/* 案件分頁籤 */}
      <CaseTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        stats={stats.byStatus}
      />

      {/* 篩選器 */}
      <CaseFilters
        filters={currentFilters}
        onFiltersChange={setCurrentFilters}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        teamId={team.id}
        sortConfig={sortConfig}
        onSortChange={handleSortChange}
      />

      {/* 案件列表 */}
      <div className="case-content">
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner">載入中...</div>
          </div>
        ) : paginatedCases.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <h3>沒有找到案件</h3>
            <p>
              {filteredCases.length === 0 && allCases.length === 0
                ? '目前沒有任何案件，點擊「新增案件」開始建立第一個案件'
                : '沒有符合篩選條件的案件，請調整篩選條件或搜尋關鍵字'
              }
            </p>
            {canCreate && filteredCases.length === 0 && allCases.length === 0 && (
              <button
                onClick={() => setShowCaseModal(true)}
                className="btn btn-primary"
                style={{ marginTop: '16px' }}
              >
                + 新增第一個案件
              </button>
            )}
          </div>
        ) : (
          <>
            {/* 案件檢視區域 */}
            <div className="cases-container">
              {viewMode === 'card' ? (
                <CaseCardView
                  cases={paginatedCases}
                  onEdit={handleEditCase}
                  onDelete={handleDeleteCase}
                  onStatusChange={handleStatusChange}
                  onSelect={handleSelectCase}
                  selectedCases={selectedCases}
                  member={member}
                  team={team}
                  canEdit={canEdit}
                  canDelete={canDelete}
                />
              ) : (
                <CaseListView
                  cases={paginatedCases}
                  onEdit={handleEditCase}
                  onDelete={handleDeleteCase}
                  onStatusChange={handleStatusChange}
                  onSelect={handleSelectCase}
                  onSelectAll={handleSelectAll}
                  selectedCases={selectedCases}
                  sortConfig={sortConfig}
                  onSortChange={handleSortChange}
                  member={member}
                  team={team}
                  canEdit={canEdit}
                  canDelete={canDelete}
                />
              )}
            </div>

            {/* 分頁控制 */}
            {totalPages > 1 && (
              <CasePagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={Array.isArray(filteredCases) ? filteredCases.length : 0}
                pageSize={pageSize}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
              />
            )}
          </>
        )}
      </div>

      {/* 新增案件模態框 */}
      {showCaseModal && (
        <CaseModal
          isOpen={showCaseModal}
          onClose={() => setShowCaseModal(false)}
          onSubmit={handleCaseCreated}
          team={team}
          member={member}
        />
      )}

      {/* 編輯案件模態框 */}
      {showEditModal && editingCase && (
        <CaseEditModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false)
            setEditingCase(null)
          }}
          caseData={editingCase}
          team={team}
          onCaseUpdated={handleCaseUpdated}
        />
      )}
    </div>
  )
}

export default CaseManagement