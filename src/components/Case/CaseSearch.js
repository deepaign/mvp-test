import React, { useState, useEffect } from 'react'
import '../../styles/CaseSearch.css'

function CaseSearch({ onSearchChange, placeholder = "搜尋案件..." }) {
  const [searchTerm, setSearchTerm] = useState('')

  // 使用 debounce 避免過於頻繁的搜尋請求
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      onSearchChange(searchTerm)
    }, 300) // 300ms 延遲

    return () => clearTimeout(debounceTimer)
  }, [searchTerm, onSearchChange])

  const handleInputChange = (e) => {
    setSearchTerm(e.target.value)
  }

  const handleClearSearch = () => {
    setSearchTerm('')
    onSearchChange('')
  }

  return (
    <div className="case-search-container">
      <div className="case-search-wrapper">
        {/* 搜尋圖標 */}
        <div className="search-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.5 14h-.79l-.28-.27a6.518 6.518 0 0 0 1.48-5.34c-.47-2.78-2.79-5-5.59-5.34a6.505 6.505 0 0 0-7.27 7.27c.34 2.8 2.56 5.12 5.34 5.59a6.518 6.518 0 0 0 5.34-1.48l.27.28v.79l4.25 4.25c.41.41 1.08.41 1.49 0 .41-.41.41-1.08 0-1.49L15.5 14zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
        </div>

        {/* 搜尋輸入框 */}
        <input
          type="text"
          className="case-search-input"
          placeholder={placeholder}
          value={searchTerm}
          onChange={handleInputChange}
        />

        {/* 清除按鈕 */}
        {searchTerm && (
          <button
            type="button"
            className="search-clear-btn"
            onClick={handleClearSearch}
            title="清除搜尋"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}

export default CaseSearch