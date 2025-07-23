// src/components/Case/CaseManagement.js - 修正 ESLint 錯誤版本
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
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

  // 🔧 計算分頁相關數據 - 使用 useMemo 避免 useCallback 依賴問題
  const paginatedCases = useMemo(() => {
    return Array.isArray(filteredCases) 
      ? filteredCases.slice(currentPage * pageSize, (currentPage + 1) * pageSize)
      : []
  }, [filteredCases, currentPage, pageSize])

  const totalPages = useMemo(() => {
    return Math.ceil((Array.isArray(filteredCases) ? filteredCases.length : 0) / pageSize)
  }, [filteredCases, pageSize])

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
        const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay
        const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset)
        const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000)
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
        if (filters.startDate) {
          startDate = new Date(filters.startDate)
        }
        if (filters.endDate) {
          endDate = new Date(filters.endDate)
          endDate.setHours(23, 59, 59, 999)
        }
        break
      }
      
      default:
        return data
    }

    if (!startDate && !endDate) {
      return data
    }

    return data.filter(caseItem => {
      if (!caseItem || !caseItem.created_at) return false
      
      const caseDate = new Date(caseItem.created_at)
      
      if (startDate && caseDate < startDate) return false
      if (endDate && caseDate > endDate) return false
      
      return true
    })
  }, [])

  // 🔧 安全的篩選函數
  const applyFilters = useCallback((data, filters, searchTerm, activeTab) => {
    const originalCount = data.length
    let filtered = Array.isArray(data) ? [...data] : []

    // 分頁篩選
    if (activeTab && activeTab !== 'all') {
      console.log('🔍 應用分頁篩選:', activeTab)
      const beforeFilter = filtered.length
      
      filtered = filtered.filter(caseItem => {
        if (activeTab === 'pending') return caseItem.status === 'pending'
        if (activeTab === 'processing') return caseItem.status === 'processing'
        if (activeTab === 'completed') return caseItem.status === 'completed'
        return true
      })
      console.log(`分頁篩選: ${beforeFilter} -> ${filtered.length} 筆案件`)
    }

    // 搜尋關鍵字篩選
    if (searchTerm && searchTerm.trim()) {
      console.log('🔍 應用搜尋篩選:', searchTerm)
      const beforeFilter = filtered.length
      const searchLower = searchTerm.trim().toLowerCase()
      
      filtered = filtered.filter(caseItem => {
        if (!caseItem) return false
        
        try {
          // 搜尋標題
          if (caseItem.title && caseItem.title.toLowerCase().includes(searchLower)) return true
          
          // 搜尋描述
          if (caseItem.description && caseItem.description.toLowerCase().includes(searchLower)) return true
          
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
      console.log(`搜尋篩選: ${beforeFilter} -> ${filtered.length} 筆案件`)
    }

    // ✅ 正確使用 applyDateFilter
    console.log('🔍 應用日期篩選')
    const beforeDateFilter = filtered.length
    filtered = applyDateFilter(filtered, filters)
    console.log(`日期篩選: ${beforeDateFilter} -> ${filtered.length} 筆案件`)

    // 案件類別篩選
    if (filters.category && filters.category !== 'all') {
      console.log('🔍 應用類別篩選:', filters.category)
      const beforeFilter = filtered.length
      filtered = filtered.filter(caseItem => {
        if (!caseItem || !caseItem.CategoryCase) return false
        
        try {
          const categoryCase = Array.isArray(caseItem.CategoryCase) ? caseItem.CategoryCase : []
          return categoryCase.some(cc => cc.Category?.id === filters.category)
        } catch (error) {
          console.warn('類型篩選錯誤:', error, caseItem)
          return false
        }
      })
      console.log(`類別篩選: ${beforeFilter} -> ${filtered.length} 筆案件`)
    }

    // 狀態篩選
    if (filters.status && filters.status !== 'all') {
      console.log('🔍 應用狀態篩選:', filters.status)
      const beforeFilter = filtered.length
      filtered = filtered.filter(caseItem => caseItem && caseItem.status === filters.status)
      console.log(`狀態篩選: ${beforeFilter} -> ${filtered.length} 筆案件`)
    }

    // 優先等級篩選
    if (filters.priority && filters.priority !== 'all') {
      console.log('🔍 應用優先順序篩選:', filters.priority)
      const beforeFilter = filtered.length
      filtered = filtered.filter(caseItem => caseItem && caseItem.priority === filters.priority)
      console.log(`優先順序篩選: ${beforeFilter} -> ${filtered.length} 筆案件`)
    }

    // 🔧 承辦人員篩選 - 使用 CaseMember 表
    if (filters.handler && filters.handler !== 'all') {
      console.log('🔍 應用承辦人員篩選:', filters.handler)
      const beforeFilter = filtered.length
      
      if (filters.handler === 'unassigned') {
        // 篩選尚未指派承辦人員的案件
        filtered = filtered.filter(caseItem => {
          if (!caseItem || !caseItem.CaseMember) return true
          
          try {
            const handlerMembers = caseItem.CaseMember.filter(cm => cm.role === 'handler')
            return handlerMembers.length === 0 || !handlerMembers.some(cm => cm.member_id)
          } catch (error) {
            console.warn('承辦人員篩選錯誤:', error, caseItem)
            return false
          }
        })
      } else {
        // 篩選指定承辦人員的案件
        filtered = filtered.filter(caseItem => {
          if (!caseItem || !caseItem.CaseMember) return false
          
          try {
            const handlerMembers = caseItem.CaseMember.filter(cm => cm.role === 'handler')
            return handlerMembers.some(cm => cm.member_id === filters.handler)
          } catch (error) {
            console.warn('承辦人員篩選錯誤:', error, caseItem)
            return false
          }
        })
      }
      console.log(`承辦人員篩選: ${beforeFilter} -> ${filtered.length} 筆案件`)
    }

    // 受理人員篩選 - 使用 CaseMember 表
    if (filters.receiver && filters.receiver !== 'all') {
      console.log('🔍 應用受理人員篩選:', filters.receiver)
      const beforeFilter = filtered.length
      
      filtered = filtered.filter(caseItem => {
        if (!caseItem || !caseItem.CaseMember) return false
        
        try {
          const receiverMembers = caseItem.CaseMember.filter(cm => cm.role === 'receiver')
          return receiverMembers.some(cm => cm.member_id === filters.receiver)
        } catch (error) {
          console.warn('受理人員篩選錯誤:', error, caseItem)
          return false
        }
      })
      console.log(`受理人員篩選: ${beforeFilter} -> ${filtered.length} 筆案件`)
    }

    console.log(`篩選摘要: 原始 ${originalCount} -> 最終 ${filtered.length} 筆案件`)
    return filtered
  }, [applyDateFilter]) // ✅ 保留在依賴陣列中，因為現在有使用它

  // 預設排序邏輯 - 按照受理日期或案件編號排序（由新到舊）
  // 🔧 修復：預設排序邏輯
  const applySorting = useCallback((data) => {
    return [...data].sort((a, b) => {
      // 1. 優先按照受理時間排序（由新到舊）
      if (a.start_date && b.start_date) {
        const dateA = new Date(a.start_date)
        const dateB = new Date(b.start_date)
        if (dateA.getTime() !== dateB.getTime()) {
          return dateB.getTime() - dateA.getTime() // 由新到舊
        }
      }
      
      // 2. 如果受理時間相同或缺失，則按照建立時間排序
      if (a.created_at && b.created_at) {
        const createdA = new Date(a.created_at)
        const createdB = new Date(b.created_at)
        return createdB.getTime() - createdA.getTime() // 由新到舊
      }
      
      // 3. 最後按照案件編號排序
      const numberA = CaseService.extractCaseNumber(a.description) || ''
      const numberB = CaseService.extractCaseNumber(b.description) || ''
      return numberB.localeCompare(numberA, 'zh-TW', { numeric: true })
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

  // 🔧 修正：使用 window.confirm 替代 confirm
  const handleDeleteCase = useCallback(async (caseData) => {
    if (!canDelete) {
      alert('您沒有刪除案件的權限')
      return
    }

    if (!window.confirm(`確定要刪除案件「${caseData.title}」嗎？此操作無法復原。`)) {
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
    if (selectedCases.length === paginatedCases.length && paginatedCases.length > 0) {
      setSelectedCases([])
    } else {
      setSelectedCases(paginatedCases.map(c => c.id))
    }
  }, [selectedCases.length, paginatedCases])

  // 🔧 修正：使用 window.confirm 替代 confirm
  const handleBulkStatusUpdate = useCallback(async (newStatus) => {
    if (selectedCases.length === 0) {
      alert('請先選擇要更新的案件')
      return
    }

    if (!window.confirm(`確定要將 ${selectedCases.length} 個案件的狀態更新為「${CaseService.getStatusLabel(newStatus)}」嗎？`)) {
      return
    }

    setBulkActionLoading(true)

    try {
      const result = await CaseService.bulkUpdateCaseStatus(selectedCases, newStatus, team.id)
      
      if (result.success) {
        console.log('批量狀態更新成功')
        alert(`成功更新 ${result.data.updatedCount} 個案件的狀態`)
        setSelectedCases([])
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

  // 處理篩選變更
  const handleFiltersChange = useCallback((newFilters) => {
    console.log('篩選條件變更:', newFilters)
    setCurrentFilters(newFilters)
  }, [])

  // 處理搜尋
  const handleSearch = useCallback((newSearchTerm) => {
    console.log('搜尋條件變更:', newSearchTerm)
    setSearchTerm(newSearchTerm)
  }, [])

  // 處理重置篩選
  const handleResetFilters = useCallback(() => {
    console.log('重置篩選條件')
    setCurrentFilters({})
    setSearchTerm('')
    setActiveTab('all')
  }, [])

  return (
    <div className="case-management">
      {/* 🔧 加入 CaseCard 統計卡片顯示 */}
      <CaseCard stats={stats} />

      {/* 狀態標籤 */}
      <CaseTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onViewModeChange={setViewMode}
        onAddCase={() => setShowCaseModal(true)}
        stats={stats}
      />

      {/* 篩選器 */}
      <CaseFilters
        team={team}
        filters={currentFilters}
        searchTerm={searchTerm}
        onFiltersChange={handleFiltersChange}
        onSearch={handleSearch}
        onReset={handleResetFilters}
      />

      {/* 主要內容區域 */}
      <div className="main-content">
        {/* 錯誤顯示 */}
        {error && (
          <div className="error-message">
            <p>⚠️ {error}</p>
            <button onClick={loadCases} className="btn btn-secondary">
              重新載入
            </button>
          </div>
        )}

        {/* 批量操作工具列 - 只在有選擇時顯示 */}
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

        {/* 案件列表或空狀態 */}
        {(!Array.isArray(filteredCases) || filteredCases.length === 0) && !loading && !error ? (
          <div className="empty-state">
            <p>
              {Array.isArray(allCases) && allCases.length === 0
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
                  onCaseEdit={handleEditCase}
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
                  onCaseEdit={handleEditCase}
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
          member={member}  // 添加這一行
          onCaseUpdated={handleCaseUpdated}
        />
      )}
    </div>
  )
}

export default CaseManagement