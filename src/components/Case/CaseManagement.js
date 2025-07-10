// src/components/Case/CaseManagement.js - 修正日期篩選功能
import React, { useState, useEffect, useCallback, useRef } from 'react'
import CaseTabs from './CaseTabs'
import CaseFilters from './CaseFilters'
import CaseCard from './CaseCard'
import CaseModal from './CaseModal/CaseModal'
import CaseListView from './CaseTables/CaseListView'
import CaseCardView from './CaseTables/CaseCardView'
import CasePagination from './CaseTables/CasePagination'
import { CaseService } from '../../services/caseService'
import { PermissionService } from '../../services/permissionService'

function CaseManagement({ member, team }) {
  // 權限檢查 - 只保留實際使用的權限
  const canCreate = PermissionService.hasPermission(member, 'case_create') || 
                   member?.is_leader === true || 
                   member?.role === 'staff'

  // 狀態管理
  const [activeTab, setActiveTab] = useState('all')
  const [currentFilters, setCurrentFilters] = useState({})
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState('card')
  const [showCaseModal, setShowCaseModal] = useState(false)
  
  // 案件資料狀態
  const [allCases, setAllCases] = useState([])
  const [filteredCases, setFilteredCases] = useState([])
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState({
    total: 0,
    byStatus: { pending: 0, processing: 0, completed: 0 },
    byPriority: { urgent: 0, normal: 0, low: 0 }
  })

  // 分頁狀態 (移除排序狀態)
  const [currentPage, setCurrentPage] = useState(0)
  const [pageSize, setPageSize] = useState(20)

  // 防止重複載入的 ref
  const loadingRef = useRef(false)
  const initialLoadRef = useRef(false)

  // 載入案件資料 - 只依賴 team.id
  const loadCases = useCallback(async () => {
    if (!team?.id || loadingRef.current) {
      return
    }

    loadingRef.current = true
    setLoading(true)

    try {
      console.log('載入案件資料，團隊:', team.id)
      
      const result = await CaseService.getCases({
        groupId: team.id,
        status: 'all', // 載入所有狀態
        filters: {}, // 不在後端篩選
        searchTerm: '', // 不在後端搜尋
        page: 0,
        limit: 1000 // 載入足夠多的資料
      })

      if (result.success) {
        setAllCases(result.data)
        console.log(`載入成功，共 ${result.data.length} 筆案件`)
      } else {
        console.error('載入案件失敗:', result.error)
        setAllCases([])
      }

    } catch (error) {
      console.error('載入案件發生錯誤:', error)
      setAllCases([])
    } finally {
      setLoading(false)
      loadingRef.current = false
    }
  }, [team?.id]) // 只依賴 team.id

  // 載入統計資料
  const loadStats = useCallback(async () => {
    if (!team?.id) return

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
  }, [team?.id])

  // 日期篩選邏輯 - 修正版本
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
      
      if (result) {
        console.log('符合日期條件的案件:', {
          title: caseItem.title,
          created_at: caseItem.created_at,
          caseDate: caseDate.toISOString()
        })
      }
      
      return result
    })

    console.log(`日期篩選: ${data.length} -> ${filtered.length}`)
    return filtered
  }, [])

  // 應用篩選邏輯 - 修正版本，加入日期篩選
  const applyFilters = useCallback((data, filters, search, status) => {
    let filtered = [...data]

    // 狀態篩選
    if (status !== 'all') {
      filtered = filtered.filter(caseItem => caseItem.status === status)
    }

    // 搜尋篩選
    if (search && search.trim()) {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter(caseItem => {
        const title = (caseItem.title || '').toLowerCase()
        const description = (caseItem.description || '').toLowerCase()
        return title.includes(searchLower) || description.includes(searchLower)
      })
    }

    // 日期篩選 - 修正：在前端進行日期篩選
    filtered = applyDateFilter(filtered, filters)

    // 案件類型篩選
    if (filters.category && filters.category !== 'all') {
      filtered = filtered.filter(caseItem => {
        const categories = caseItem.CategoryCase || []
        
        if (['traffic', 'environment', 'security', 'public_service', 'legal_consultation'].includes(filters.category)) {
          const targetCategoryName = CaseService.getCategoryName(filters.category)
          return categories.some(cat => cat.Category && cat.Category.name === targetCategoryName)
        } else {
          return categories.some(cat => cat.Category && cat.Category.id === filters.category)
        }
      })
    }

    // 優先順序篩選
    if (filters.priority && filters.priority !== 'all') {
      filtered = filtered.filter(caseItem => caseItem.priority === filters.priority)
    }

    // 承辦人員篩選
    if (filters.assignee && filters.assignee !== 'all') {
      if (filters.assignee === 'unassigned') {
        filtered = filtered.filter(caseItem => {
          const inCharge = caseItem.InChargeCase || []
          if (inCharge.length === 0) return true
          const hasAssignedMember = inCharge.some(ic => ic.member_id !== null && ic.member_id !== undefined)
          return !hasAssignedMember
        })
      } else {
        filtered = filtered.filter(caseItem => {
          const inCharge = caseItem.InChargeCase || []
          return inCharge.some(ic => ic.member_id === filters.assignee)
        })
      }
    }

    return filtered
  }, [applyDateFilter])

  // 預設排序邏輯 - 按照受理日期或案件編號排序（由新到舊）
  const applySorting = useCallback((data) => {
    return [...data].sort((a, b) => {
      // 首先嘗試按照 created_at 排序
      const dateA = new Date(a.created_at || 0)
      const dateB = new Date(b.created_at || 0)
      
      if (dateA.getTime() !== dateB.getTime()) {
        return dateB.getTime() - dateA.getTime() // 新到舊
      }
      
      // 如果日期相同，則按照案件編號排序
      const caseNumberA = CaseService.extractCaseNumber(a.description) || ''
      const caseNumberB = CaseService.extractCaseNumber(b.description) || ''
      
      // 案件編號通常包含日期信息，按字串排序（降序 = 新到舊）
      return caseNumberB.localeCompare(caseNumberA)
    })
  }, [])

  // 計算篩選和排序後的案件
  useEffect(() => {
    console.log('重新計算篩選結果')
    console.log('當前篩選條件:', currentFilters)
    
    // 應用篩選
    let filtered = applyFilters(allCases, currentFilters, searchTerm, activeTab)
    
    // 應用預設排序（按日期/案件編號由新到舊）
    filtered = applySorting(filtered)
    
    setFilteredCases(filtered)
    setCurrentPage(0) // 重置到第一頁
    
    console.log(`篩選後案件數量: ${filtered.length}`)
  }, [allCases, currentFilters, searchTerm, activeTab, applyFilters, applySorting])

  // 初始載入 - 只在團隊 ID 變化時執行
  useEffect(() => {
    if (team?.id && !initialLoadRef.current) {
      console.log('初始載入案件和統計資料')
      initialLoadRef.current = true
      Promise.all([loadCases(), loadStats()])
    }
  }, [team?.id, loadCases, loadStats])

  // 計算響應式分頁大小
  const calculatePageSize = useCallback(() => {
    const width = window.innerWidth
    const height = window.innerHeight
    
    let screenType = 'desktop'
    if (width <= 576) {
      screenType = 'mobile'
    } else if (width <= 992) {
      screenType = 'tablet'
    }

    const heightModifier = height < 600 ? 0.8 : 1

    const pageSizeMap = {
      desktop: {
        list: Math.floor(20 * heightModifier),
        card: Math.floor(15 * heightModifier) // 調整為15個，因為一列3個
      },
      tablet: {
        list: Math.floor(15 * heightModifier),
        card: Math.floor(12 * heightModifier)
      },
      mobile: {
        list: Math.floor(10 * heightModifier),
        card: Math.floor(8 * heightModifier)
      }
    }

    return pageSizeMap[screenType][viewMode] || 20
  }, [viewMode])

  // 更新分頁大小
  useEffect(() => {
    const newPageSize = calculatePageSize()
    if (newPageSize !== pageSize) {
      setPageSize(newPageSize)
      setCurrentPage(0)
    }
  }, [viewMode, calculatePageSize, pageSize])

  // 監聽窗口大小變化
  useEffect(() => {
    const handleResize = () => {
      const newPageSize = calculatePageSize()
      if (newPageSize !== pageSize) {
        setPageSize(newPageSize)
        setCurrentPage(0)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [calculatePageSize, pageSize])

  // 取得當前頁面的案件資料
  const getCurrentPageCases = () => {
    const startIndex = currentPage * pageSize
    const endIndex = startIndex + pageSize
    return filteredCases.slice(startIndex, endIndex)
  }

  // 事件處理函數
  const handleTabChange = (tabId) => {
    console.log('切換到案件狀態:', tabId)
    setActiveTab(tabId)
  }

  const handleSearch = (term) => {
    console.log('搜尋條件變更:', term)
    setSearchTerm(term)
  }

  const handleFiltersChange = (filters) => {
    console.log('篩選條件變更:', filters)
    setCurrentFilters(filters)
  }

  const handleFiltersReset = () => {
    console.log('重置篩選條件')
    setSearchTerm('')
    setCurrentFilters({})
  }

  const handleViewModeChange = (mode) => {
    console.log('檢視模式變更:', mode)
    setViewMode(mode)
  }

  const handlePageChange = (newPage) => {
    console.log('分頁變更:', newPage)
    setCurrentPage(newPage)
  }

  const handlePageSizeChange = (newPageSize) => {
    console.log('每頁數量變更:', newPageSize)
    setPageSize(newPageSize)
    setCurrentPage(0)
  }

  const handleAddCase = () => {
    if (!canCreate) {
      alert('您沒有建立案件的權限')
      return
    }
    setShowCaseModal(true)
  }

  const handleCaseEdit = (caseItem) => {
    console.log('編輯案件:', caseItem)
    alert('案件編輯功能開發中...')
  }

  const handleCaseCreated = async () => {
    console.log('案件建立成功，重新載入資料')
    initialLoadRef.current = false // 允許重新載入
    await Promise.all([loadCases(), loadStats()])
  }

  const handleCloseModal = () => {
    setShowCaseModal(false)
  }

  // 渲染主要內容
  const renderMainContent = () => {
    if (loading) {
      return (
        <div style={{ 
          padding: '40px', 
          textAlign: 'center',
          minHeight: '400px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '16px' }}>⏳</div>
          <h3 style={{ color: '#333', marginBottom: '12px' }}>載入中...</h3>
          <p style={{ color: '#666' }}>正在載入案件資料</p>
        </div>
      )
    }

    const currentPageCases = getCurrentPageCases()

    return (
      <>
        {/* 案件檢視區域 */}
        <div style={{ 
          flex: 1,
          padding: '20px',
          minHeight: '400px'
        }}>
          {viewMode === 'list' ? (
            <CaseListView
              cases={currentPageCases}
              onCaseEdit={handleCaseEdit}
              loading={loading}
            />
          ) : (
            <CaseCardView
              cases={currentPageCases}
              onCaseEdit={handleCaseEdit}
              loading={loading}
            />
          )}
        </div>

        {/* 分頁控制 */}
        {filteredCases.length > 0 && (
          <CasePagination
            totalItems={filteredCases.length}
            currentPage={currentPage}
            pageSize={pageSize}
            viewMode={viewMode}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          />
        )}
      </>
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
        minHeight: '600px',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* 標籤和操作按鈕 */}
        <CaseTabs 
          activeTab={activeTab} 
          onTabChange={handleTabChange}
          onViewModeChange={handleViewModeChange}
          onAddCase={handleAddCase}
        />
        
        {/* 篩選條件 */}
        <CaseFilters 
          team={team}
          onFiltersChange={handleFiltersChange}
          onSearch={handleSearch}
          onReset={handleFiltersReset}
        />
        
        {/* 主要內容區域 */}
        {renderMainContent()}

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