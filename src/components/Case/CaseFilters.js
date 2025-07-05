import React, { useState, useEffect } from 'react'
import { CaseService } from '../../services/caseService'
import CaseSearch from './CaseSearch'
import '../../styles/CaseFilters.css'

function CaseFilters({ team, onFiltersChange, onSearch }) {
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

  // 載入篩選選項
  useEffect(() => {
    loadFilterOptions()
  }, [team.id])

  // 當篩選條件變更時通知父組件
  useEffect(() => {
    const filterParams = buildFilterParams()
    onFiltersChange(filterParams)
  }, [filters, customDateRange])

  const loadFilterOptions = async () => {
    setLoading(true)
    try {
      // 同時載入類別和成員
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
      // 設定預設值以防止錯誤
      setFilterOptions({
        categories: [],
        members: []
      })
    } finally {
      setLoading(false)
    }
  }

  const buildFilterParams = () => {
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
  }

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
  }

  const handleSearch = (searchTerm) => {
    console.log('搜尋案件:', searchTerm)
    if (onSearch) {
      onSearch(searchTerm)
    }
  }

  return (
    <div className="case-filters-container">
      <div className="case-filters-wrapper">
        <div className="case-filters">
          {/* 案件類型篩選 */}
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

          {/* 日期篩選 */}
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

          {/* 優先程度篩選 */}
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

          {/* 負責人篩選 */}
          <div className="filter-group">
            <label className="filter-label">負責人</label>
            <select 
              className="filter-select"
              value={filters.assignee}
              onChange={(e) => handleFilterChange('assignee', e.target.value)}
            >
              <option value="all">全部</option>
              {filterOptions.members.map(member => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </div>

          {/* 重置按鈕 */}
          <div className="filter-group">
            <button 
              className="reset-filters-btn"
              onClick={resetFilters}
              title="重置所有篩選條件"
            >
              重新篩選
            </button>
          </div>
        </div>

        {/* 搜尋框 */}
        <CaseSearch 
          onSearchChange={handleSearch}
          placeholder="搜尋案件標題或內容..."
        />
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
    </div>
  )
}

export default CaseFilters