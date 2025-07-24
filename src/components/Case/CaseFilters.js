// src/components/Case/CaseFilters.js - 修正版：使用固定類別選項和正確的團隊成員 API
import React, { useState, useEffect, useCallback } from 'react'
import { TeamService } from '../../services/teamService' // 🔧 使用 TeamService
import '../../styles/CaseFilters.css'

// 🔧 修正：直接定義固定類別選項，不依賴動態載入
const FIXED_CATEGORIES = {
  '3c39816e-31e7-440a-85e7-bf047e752907': '治安問題',
  '78b565b8-4ee9-4292-96d6-18b09405a036': '民生服務',
  '84b61b1f-2823-4ad8-9af2-e7ed3fd122ab': '環境問題',
  'c274835f-29ec-4d75-b1ae-1fc941c829b1': '交通問題',
  'c603a9fd-f508-4d45-87db-cac78ace9a68': '法律諮詢'
};

// 🔧 將固定類別轉換為選項格式
const getFixedCategoryOptions = () => {
  return Object.entries(FIXED_CATEGORIES).map(([id, name]) => ({
    id,
    name,
    displayName: name,
    isFixed: true
  }));
};

function CaseFilters({ team, onFiltersChange, onSearch, onReset }) {
  const [filters, setFilters] = useState({
    category: 'all',
    dateRange: 'all',
    priority: 'all',
    assignee: 'all'
  })

  const [filterOptions, setFilterOptions] = useState({
    categories: getFixedCategoryOptions(), // 🔧 直接使用固定類別
    members: []
  })

  const [customDateRange, setCustomDateRange] = useState({
    startDate: '',
    endDate: ''
  })

  const [showDatePicker, setShowDatePicker] = useState(false)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // 🔧 修正：只載入團隊成員，類別直接使用固定選項
  const loadFilterOptions = useCallback(async () => {
    if (!team?.id) return
    
    setLoading(true)
    try {
      // 🔧 使用正確的 TeamService.getTeamMembers() 函數（無參數）
      const membersResult = await TeamService.getTeamMembers()
      
      console.log('載入團隊成員結果:', membersResult)

      setFilterOptions(prev => ({
        categories: getFixedCategoryOptions(), // 保持固定類別
        members: membersResult.success ? membersResult.data : []
      }))

      if (!membersResult.success) {
        console.error('載入團隊成員失敗:', membersResult.error)
      }

    } catch (error) {
      console.error('載入篩選選項失敗:', error)
      setFilterOptions({
        categories: getFixedCategoryOptions(), // 即使出錯也保持固定類別
        members: []
      })
    } finally {
      setLoading(false)
    }
  }, [team?.id])

  // 載入篩選選項
  useEffect(() => {
    loadFilterOptions()
  }, [loadFilterOptions])

  // 篩選條件變更時通知父組件
  useEffect(() => {
    const filterParams = buildFilterParams()
    console.log('篩選參數變更:', filterParams)
    
    if (onFiltersChange) {
      onFiltersChange(filterParams)
    }
  }, [filters, customDateRange])

  // 處理篩選條件變更
  const handleFilterChange = (key, value) => {
    console.log(`篩選條件變更: ${key} = ${value}`)
    
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))

    // 如果是日期範圍變更，處理日期選擇器顯示
    if (key === 'dateRange') {
      setShowDatePicker(value === 'custom')
      
      // 如果不是自定義範圍，清空自定義日期
      if (value !== 'custom') {
        setCustomDateRange({
          startDate: '',
          endDate: ''
        })
      }
    }
  }

  // 建構篩選參數
  const buildFilterParams = useCallback(() => {
    const params = {
      category: filters.category,
      priority: filters.priority,
      assignee: filters.assignee,
      dateRange: filters.dateRange,
      startDate: customDateRange.startDate,
      endDate: customDateRange.endDate
    }

    // 🔧 修正：日期範圍計算邏輯
    const now = new Date()
    
    switch (filters.dateRange) {
      case 'today': {
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
        params.startDate = todayStart.toISOString()
        params.endDate = todayEnd.toISOString()
        break
      }
      
      case 'week': {
        const currentDay = now.getDay()
        const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay
        const weekStart = new Date(now.getTime() + mondayOffset * 24 * 60 * 60 * 1000)
        weekStart.setHours(0, 0, 0, 0)
        
        const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000)
        weekEnd.setHours(23, 59, 59, 999)
        
        params.startDate = weekStart.toISOString()
        params.endDate = weekEnd.toISOString()
        break
      }
      
      case 'month': {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
        params.startDate = monthStart.toISOString()
        params.endDate = monthEnd.toISOString()
        break
      }
    }

    console.log('建構篩選參數:', params)
    return params
  }, [filters, customDateRange])

  // 處理自定義日期範圍變更
  const handleCustomDateChange = (dateType, value) => {
    console.log(`自定義日期變更: ${dateType} = ${value}`)
    
    let processedValue = value
    if (value) {
      if (dateType === 'startDate') {
        const startDate = new Date(value + 'T00:00:00')
        processedValue = startDate.toISOString()
      } else if (dateType === 'endDate') {
        const endDate = new Date(value + 'T23:59:59')
        processedValue = endDate.toISOString()
      }
    }
    
    setCustomDateRange(prev => ({
      ...prev,
      [dateType]: processedValue
    }))
  }

  // 重置所有篩選條件
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
    
    if (onReset) {
      onReset()
    }
  }

  // 處理搜尋變更
  const handleSearchChange = (value) => {
    setSearchTerm(value)
    if (onSearch) {
      onSearch(value)
    }
  }

  // 🔧 修正：取得類別顯示名稱
  const getCategoryDisplayName = useCallback((categoryId) => {
    if (categoryId === 'all') return '全部'
    
    // 從固定類別中查找
    return FIXED_CATEGORIES[categoryId] || categoryId
  }, [])

  // 取得承辦人員名稱
  const getAssigneeName = useCallback((assigneeId) => {
    if (assigneeId === 'all') return '全部'
    if (assigneeId === 'unassigned') return '尚未指派'
    
    const member = filterOptions.members.find(m => m.id === assigneeId)
    return member ? member.name : `ID:${assigneeId}`
  }, [filterOptions.members])

  // 取得日期範圍顯示名稱
  const getDateRangeDisplayName = (dateRange) => {
    const dateRangeMap = {
      'all': '全部',
      'today': '本日',
      'week': '本週',
      'month': '本月',
      'custom': '自定義範圍'
    }
    return dateRangeMap[dateRange] || dateRange
  }

  // 篩選摘要顯示
  const getFilterSummary = () => {
    const activeFilters = []
    
    if (filters.category && filters.category !== 'all') {
      const categoryName = getCategoryDisplayName(filters.category)
      activeFilters.push(`類型: ${categoryName}`)
    }
    if (filters.dateRange && filters.dateRange !== 'all') {
      const dateLabel = getDateRangeDisplayName(filters.dateRange)
      activeFilters.push(`日期: ${dateLabel}`)
    }
    if (filters.priority && filters.priority !== 'all') {
      const priorityMap = {
        'urgent': '緊急',
        'normal': '一般', 
        'low': '低'
      }
      activeFilters.push(`優先順序: ${priorityMap[filters.priority] || filters.priority}`)
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
        <span className="filter-summary-icon">📋</span>
        目前篩選: {activeFilters.join(' | ')}
        <span className="filter-note">（日期篩選以受理時間為準）</span>
      </div>
    ) : null
  }

  return (
    <div className="case-filters-container">
      {/* 主要篩選控制列 */}
      <div className="case-filters-main-row">
        <div className="case-filters-left">
          {/* 🔧 修正：案件類型篩選 - 使用固定選項 */}
          <div className="filter-group">
            <label className="filter-label">案件類型</label>
            <select 
              className="filter-select"
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              disabled={loading}
            >
              <option value="all">全部</option>
              {filterOptions.categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.displayName}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">受理日期</label>
            <select 
              className="filter-select"
              value={filters.dateRange}
              onChange={(e) => handleFilterChange('dateRange', e.target.value)}
              disabled={loading}
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
              disabled={loading}
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
              disabled={loading}
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
                placeholder="搜尋案件標題、內容、編號..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                disabled={loading}
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
              {loading ? '載入中...' : '重新篩選'}
            </button>
          </div>
        </div>
      </div>

      {/* 自定義日期範圍選擇器 */}
      {showDatePicker && (
        <div className="custom-date-picker">
          <div className="date-picker-header">
            <span className="date-picker-title">📅 自定義受理日期範圍</span>
            <span className="date-picker-note">（以案件描述中的受理時間為準）</span>
          </div>
          <div className="date-picker-controls">
            <div className="date-picker-group">
              <label className="date-label">開始日期</label>
              <input
                type="date"
                className="date-input"
                value={customDateRange.startDate ? customDateRange.startDate.split('T')[0] : ''}
                onChange={(e) => handleCustomDateChange('startDate', e.target.value)}
              />
            </div>
            <div className="date-picker-group">
              <label className="date-label">結束日期</label>
              <input
                type="date"
                className="date-input"
                value={customDateRange.endDate ? customDateRange.endDate.split('T')[0] : ''}
                onChange={(e) => handleCustomDateChange('endDate', e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {/* 篩選摘要顯示 */}
      {getFilterSummary()}
    </div>
  )
}

export default CaseFilters