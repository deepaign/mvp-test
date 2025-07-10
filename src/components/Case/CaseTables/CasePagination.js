// src/components/Case/CaseTables/CasePagination.js - 修復版本
import React from 'react'
import '../../../styles/CasePagination.css'

function CasePagination({ 
  totalItems = 0, 
  currentPage = 0, 
  pageSize = 20,
  viewMode = 'card', 
  onPageChange, 
  onPageSizeChange 
}) {
  // 計算總頁數
  const totalPages = Math.ceil(totalItems / pageSize) || 1
  
  // 計算顯示範圍
  const startItem = totalItems > 0 ? currentPage * pageSize + 1 : 0
  const endItem = Math.min((currentPage + 1) * pageSize, totalItems)

  console.log('分頁組件參數:', {
    totalItems,
    currentPage,
    pageSize,
    totalPages,
    startItem,
    endItem,
    viewMode
  })

  // 如果沒有資料，不顯示分頁
  if (totalItems === 0) {
    console.log('沒有資料，不顯示分頁')
    return null
  }

  // 如果只有一頁且資料量小於等於 pageSize，不顯示分頁
  if (totalPages <= 1 && totalItems <= pageSize) {
    console.log('只有一頁且資料量少，不顯示分頁')
    return null
  }

  const handlePageChange = (newPage) => {
    if (newPage >= 0 && newPage < totalPages && newPage !== currentPage) {
      console.log(`分頁變更: ${currentPage} -> ${newPage}`)
      if (onPageChange) {
        onPageChange(newPage)
      }
    }
  }

  const handlePageSelect = (e) => {
    const selectedPage = parseInt(e.target.value)
    console.log(`下拉選單選擇頁面: ${selectedPage}`)
    handlePageChange(selectedPage)
  }

  // 生成頁數選項
  const generatePageOptions = () => {
    const options = []
    for (let i = 0; i < totalPages; i++) {
      options.push(
        <option key={i} value={i}>
          第 {i + 1} 頁
        </option>
      )
    }
    return options
  }

  return (
    <div className="case-pagination-container">
      {/* 左側資訊 */}
      <div className="pagination-info">
        顯示 {startItem}-{endItem} 項，共 {totalItems} 項
      </div>
      
      {/* 中央控制項 */}
      <div className="pagination-controls">
        {/* 上一頁按鈕 */}
        <button
          className={`pagination-btn prev-btn ${currentPage === 0 ? 'disabled' : ''}`}
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 0}
          title="上一頁"
        >
          <span className="pagination-icon">‹</span>
          <span className="pagination-text">上一頁</span>
        </button>

        {/* 頁數下拉選單 */}
        <div className="page-selector">
          <select
            className="page-select"
            value={currentPage}
            onChange={handlePageSelect}
          >
            {generatePageOptions()}
          </select>
        </div>

        {/* 下一頁按鈕 */}
        <button
          className={`pagination-btn next-btn ${currentPage >= totalPages - 1 ? 'disabled' : ''}`}
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage >= totalPages - 1}
          title="下一頁"
        >
          <span className="pagination-text">下一頁</span>
          <span className="pagination-icon">›</span>
        </button>
      </div>

      {/* 右側摘要 */}
      <div className="pagination-summary">
        共 {totalPages} 頁
      </div>
    </div>
  )
}

export default CasePagination