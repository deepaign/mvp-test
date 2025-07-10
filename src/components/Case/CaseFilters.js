// src/components/Case/CaseFilters.js - 修復篩選摘要顯示版本
import React, { useState, useEffect, useCallback } from 'react'
import { CaseService } from '../../services/caseService'
import '../../styles/CaseFilters.css'

function CaseFilters({ team, onFiltersChange, onSearch, onReset }) {
  const [filters, setFilters] = useState({
    category: 'all',
    dateRange: 'all',
    priority: 'all',
    assignee: 'all'
  })

  const [filterOptions, setFilterOptions] = useState({
    categories: [],
    members: []
  })

  const [customDateRange, setCustomDateRange] = useState({
    startDate: '',
    endDate: ''
  })

  const [showDatePicker, setShowDatePicker] = useState(false)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // 使用 useCallback 包裝 loadFilterOptions
  const loadFilterOptions = useCallback(async () => {
    if (!team?.id) return
    
    setLoading(true)
    try {
      const [categoriesResult, membersResult] = await Promise.all([
        CaseService.getCategories(team.id),
        CaseService.getTeamMembers(team.id)
      ])

      console.log('載入篩選選項結果:', { categoriesResult, membersResult })

      setFilterOptions({
        categories: categoriesResult.success ? categoriesResult.data : [],
        members: membersResult.success ? membersResult.data : []
      })

      if (!categoriesResult.success) {
        console.error('載入案件類別失敗:', categoriesResult.error)
      }

      if (!membersResult.success) {
        console.error('載入團隊成員失敗:', membersResult.error)
      }

    } catch (error) {
      console.error('載入篩選選項失敗:', error)
      setFilterOptions({
        categories: [],
        members: []
      })
    } finally {
      setLoading(false)
    }
  }, [team?.id])

  // 使用 useCallback 包裝 buildFilterParams
  const buildFilterParams = useCallback(() => {
    const params = {
      category: filters.category,
      priority: filters.priority,
      assignee: filters.assignee,
      dateRange: filters.dateRange,
      startDate: customDateRange.startDate,
      endDate: customDateRange.endDate
    }

    // 處理日期篩選
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    switch (filters.dateRange) {
      case 'today':
        params.startDate = today.toISOString()
        params.endDate = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1).toISOString()
        break
      case 'week':
        const weekStart = new Date(today)
        weekStart.setDate(today.getDate() - today.getDay())
        params.startDate = weekStart.toISOString()
        params.endDate = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000 - 1).toISOString()
        break
      case 'month':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59)
        params.startDate = monthStart.toISOString()
        params.endDate = monthEnd.toISOString()
        break
      case 'custom':
        // 使用自定義日期範圍
        break
      default:
        // 'all' - 不設定日期範圍
        params.startDate = ''
        params.endDate = ''
    }

    return params
  }, [filters, customDateRange])

  // 載入篩選選項
  useEffect(() => {
    loadFilterOptions()
  }, [loadFilterOptions])

  // 當篩選條件變更時通知父組件
  useEffect(() => {
    const filterParams = buildFilterParams()
    if (onFiltersChange) {
      onFiltersChange(filterParams)
    }
  }, [buildFilterParams, onFiltersChange])

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }))

    // 如果選擇自定義日期範圍，顯示日期選擇器
    if (filterType === 'dateRange' && value === 'custom') {
      setShowDatePicker(true)
    } else if (filterType === 'dateRange' && value !== 'custom') {
      setShowDatePicker(false)
      setCustomDateRange({ startDate: '', endDate: '' })
    }
  }

  const handleCustomDateChange = (dateType, value) => {
    setCustomDateRange(prev => ({
      ...prev,
      [dateType]: value
    }))
  }

  const resetFilters = () => {
    setFilters({
      category: 'all',
      dateRange: 'all',
      priority: 'all',
      assignee: 'all'
    })
    setCustomDateRange({
      startDate: '',
      endDate: ''
    })
    setShowDatePicker(false)
    setSearchTerm('')
    
    // 通知父組件重置
    if (onReset) {
      onReset()
    }
  }

  const handleSearchChange = (value) => {
    setSearchTerm(value)
    if (onSearch) {
      onSearch(value)
    }
  }

  // 取得承辦人員名稱的函數 - 修復版本
  const getAssigneeName = useCallback((assigneeId) => {
    if (assigneeId === 'all') return '全部'
    if (assigneeId === 'unassigned') return '尚未指派'
    
    // 從 members 陣列中找到對應的成員
    const member = filterOptions.members.find(m => m.id === assigneeId)
    return member ? member.name : `ID:${assigneeId}` // 如果找不到名稱，顯示 ID
  }, [filterOptions.members])

  // 取得案件類別名稱的函數
  const getCategoryDisplayName = useCallback((categoryId) => {
    if (categoryId === 'all') return '全部'
    
    // 先檢查是否為預設類型
    const categoryName = CaseService.getCategoryName(categoryId)
    if (categoryName !== categoryId) {
      return categoryName // 是預設類型，返回轉換後的名稱
    }
    
    // 不是預設類型，查找自定義類型
    const category = filterOptions.categories.find(c => c.id === categoryId)
    return category ? category.name : categoryId
  }, [filterOptions.categories])

  // 篩選摘要顯示函數 - 修復版本
  const getFilterSummary = () => {
    const activeFilters = []
    
    if (filters.category && filters.category !== 'all') {
      const categoryName = getCategoryDisplayName(filters.category)
      activeFilters.push(`類型: ${categoryName}`)
    }
    if (filters.dateRange && filters.dateRange !== 'all') {
      let dateLabel = filters.dateRange
      if (dateLabel === 'today') dateLabel = '本日'
      else if (dateLabel === 'week') dateLabel = '本週'
      else if (dateLabel === 'month') dateLabel = '本月'
      else if (dateLabel === 'custom') dateLabel = '自定義範圍'
      activeFilters.push(`日期: ${dateLabel}`)
    }
    if (filters.priority && filters.priority !== 'all') {
      const priorityLabel = CaseService.getPriorityLabel(filters.priority)
      activeFilters.push(`優先順序: ${priorityLabel}`)
    }
    if (filters.assignee && filters.assignee !== 'all') {
      const assigneeName = getAssigneeName(filters.assignee)
      activeFilters.push(`承辦人員: ${assigneeName}`)
    }
    if (searchTerm.trim()) {
      activeFilters.push(`搜尋: "${searchTerm}"`)
    }

    return activeFilters.length > 0 ? (
      <div className="filter-summary">
        目前篩選: {activeFilters.join(' | ')}
      </div>
    ) : null
  }

  return (
    <div className="case-filters-container">
      {/* 主要篩選控制列 */}
      <div className="case-filters-main-row">
        <div className="case-filters-left">
          {/* 篩選條件 */}
          <div className="filter-group">
            <label className="filter-label">案件類型</label>
            <select 
              className="filter-select"
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
            >
              <option value="all">全部</option>
              {filterOptions.categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">日期</label>
            <select 
              className="filter-select"
              value={filters.dateRange}
              onChange={(e) => handleFilterChange('dateRange', e.target.value)}
            >
              <option value="all">全部</option>
              <option value="today">本日</option>
              <option value="week">本週</option>
              <option value="month">本月</option>
              <option value="custom">自定義範圍</option>
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">優先程度</label>
            <select 
              className="filter-select"
              value={filters.priority}
              onChange={(e) => handleFilterChange('priority', e.target.value)}
            >
              <option value="all">全部</option>
              <option value="urgent">緊急</option>
              <option value="normal">一般</option>
              <option value="low">低</option>
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">承辦人員</label>
            <select 
              className="filter-select"
              value={filters.assignee}
              onChange={(e) => handleFilterChange('assignee', e.target.value)}
            >
              <option value="all">全部</option>
              <option value="unassigned">尚未指派</option>
              {filterOptions.members.map(member => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </div>

          {/* 搜尋框 */}
          <div className="filter-group search-group">
            <label className="filter-label">搜尋</label>
            <div className="search-wrapper">
              <input
                type="text"
                className="search-input"
                placeholder="搜尋案件標題或內容..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
              <div className="search-icon">🔍</div>
            </div>
          </div>

          {/* 重置按鈕 */}
          <div className="filter-group">
            <button 
              className="reset-filters-btn"
              onClick={resetFilters}
              title="重置所有篩選條件"
              disabled={loading}
            >
              重新篩選
            </button>
          </div>
        </div>
      </div>

      {/* 自定義日期範圍選擇器 */}
      {showDatePicker && (
        <div className="custom-date-picker">
          <div className="date-picker-group">
            <label className="date-label">開始日期</label>
            <input
              type="date"
              className="date-input"
              value={customDateRange.startDate ? customDateRange.startDate.split('T')[0] : ''}
              onChange={(e) => handleCustomDateChange('startDate', e.target.value ? new Date(e.target.value).toISOString() : '')}
            />
          </div>
          <div className="date-picker-group">
            <label className="date-label">結束日期</label>
            <input
              type="date"
              className="date-input"
              value={customDateRange.endDate ? customDateRange.endDate.split('T')[0] : ''}
              onChange={(e) => handleCustomDateChange('endDate', e.target.value ? new Date(e.target.value + 'T23:59:59').toISOString() : '')}
            />
          </div>
        </div>
      )}

      {/* 篩選摘要顯示 */}
      {getFilterSummary()}
    </div>
  )
}

export default CaseFilters