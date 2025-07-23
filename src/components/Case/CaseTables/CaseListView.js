// src/components/Case/CaseTables/CaseListView.js - 修正受理日期顯示問題
import React from 'react'
import { CaseService } from '../../../services/caseService'
import '../../../styles/CaseListView.css'

function CaseListView({ 
  cases, 
  onCaseEdit, 
  loading = false 
}) {
  
  // 提取案件編號
  const getCaseNumber = (caseItem) => {
    return CaseService.extractCaseNumber(caseItem.description) || '-'
  }

  // 提取事發地點
  const getIncidentLocation = (caseItem) => {
    const fullLocation = CaseService.extractIncidentLocation(caseItem.description) || ''
    const locationParts = fullLocation.split(' ')
    if (locationParts.length >= 2) {
      return {
        district: locationParts[0],
        address: locationParts.slice(1).join(' ')
      }
    }
    return {
      district: fullLocation,
      address: ''
    }
  }

  // 🔧 修復：案件類別名稱對應
  const getCategoryDisplayName = (categoryId, categoryName) => {
    // 預設類別的中英文對應
    const defaultCategoryMap = {
      'traffic': '交通問題',
      'environment': '環境問題', 
      'security': '治安問題',
      'public_service': '民生服務',
      'legal_consultation': '法律諮詢'
    }
    
    // 如果有中文名稱，直接使用
    if (categoryName && categoryName !== categoryId) {
      return categoryName
    }
    
    // 如果是預設類別代碼，返回中文名稱
    if (defaultCategoryMap[categoryId]) {
      return defaultCategoryMap[categoryId]
    }
    
    // 其他情況返回原值
    return categoryId || categoryName || '-'
  }

  // 🔧 修復：取得案件類別（處理顯示問題）
  const getCategoryName = (caseItem) => {
    const categories = caseItem.CategoryCase || []
    if (categories.length > 0 && categories[0].Category) {
      const category = categories[0].Category
      return getCategoryDisplayName(category.id, category.name)
    }
    return '-'
  }

  // 取得陳情民眾
  const getContactName = (caseItem) => {
    const contacts = caseItem.VoterCase || []
    if (contacts.length > 0 && contacts[0].Voter) {
      return contacts[0].Voter.name
    }
    return '-'
  }

  // 取得聯絡電話
  const getContactPhone = (caseItem) => {
    const contacts = caseItem.VoterCase || []
    if (contacts.length > 0 && contacts[0].Voter) {
      return contacts[0].Voter.phone
    }
    return '-'
  }

  // 🔧 修復：取得承辦人員（確保正確從 CaseMember 取得）
  const getHandlerName = (caseItem) => {
    console.log('🔍 檢查承辦人員 - 案件ID:', caseItem.id)
    
    if (!caseItem.CaseMember || !Array.isArray(caseItem.CaseMember)) {
      console.log('⚠️ 沒有 CaseMember 資料或不是陣列:', caseItem.CaseMember)
      return '-'
    }
    
    console.log('CaseMember 資料:', caseItem.CaseMember)
    
    const handlerRecord = caseItem.CaseMember.find(cm => cm.role === 'handler')
    console.log('找到的承辦人員記錄:', handlerRecord)
    
    if (handlerRecord && handlerRecord.Member && handlerRecord.Member.name) {
      console.log('✅ 承辦人員:', handlerRecord.Member.name)
      return handlerRecord.Member.name
    }
    
    console.log('⚠️ 沒有找到有效的承辦人員')
    return '-'
  }

  // 🔧 修復：取得受理人員
  const getReceiverName = (caseItem) => {
    if (!caseItem.CaseMember || !Array.isArray(caseItem.CaseMember)) {
      return '-'
    }
    
    const receiverRecord = caseItem.CaseMember.find(cm => cm.role === 'receiver')
    if (receiverRecord && receiverRecord.Member && receiverRecord.Member.name) {
      return receiverRecord.Member.name
    }
    
    return '-'
  }

  // 修正：格式化受理日期 - 從 description 中提取受理時間的日期部分
  const formatReceivedDate = (caseItem) => {
    // 優先使用 start_date（受理日期）
    if (caseItem.start_date) {
      try {
        const date = new Date(caseItem.start_date)
        if (!isNaN(date.getTime())) {
          // 使用台灣時區格式 YYYY-MM-DD
          const year = date.getFullYear()
          const month = String(date.getMonth() + 1).padStart(2, '0')
          const day = String(date.getDate()).padStart(2, '0')
          return `${year}-${month}-${day}`
        }
      } catch (error) {
        console.warn('解析受理日期失敗:', error)
      }
    }
    
    // 備用：使用建立日期
    if (caseItem.created_at) {
      try {
        const date = new Date(caseItem.created_at)
        if (!isNaN(date.getTime())) {
          const year = date.getFullYear()
          const month = String(date.getMonth() + 1).padStart(2, '0')
          const day = String(date.getDate()).padStart(2, '0')
          return `${year}-${month}-${day}`
        }
      } catch (error) {
        console.warn('解析建立日期失敗:', error)
      }
    }
    
    return '-'
  }

  // 取得優先順序顯示
  const getPriorityDisplay = (priority) => {
    const priorityMap = {
      'urgent': { text: '緊急', class: 'priority-urgent' },
      'normal': { text: '一般', class: 'priority-normal' },
      'low': { text: '低', class: 'priority-low' }
    }
    return priorityMap[priority] || { text: '一般', class: 'priority-normal' }
  }

  // 取得狀態顯示
  const getStatusDisplay = (status) => {
    const statusMap = {
      'pending': { text: '待處理', class: 'status-pending' },
      'processing': { text: '處理中', class: 'status-processing' },
      'completed': { text: '已完成', class: 'status-completed' }
    }
    return statusMap[status] || { text: '待處理', class: 'status-pending' }
  }

  

  // 取得狀態顯示文字
  const getStatusText = (status) => {
    const statusMap = {
      'new': '新進案件',
      'in_progress': '處理中',
      'transferred': '轉介中',
      'closed': '已結案'
    }
    return statusMap[status] || status
  }

  if (loading) {
    return (
      <div className="case-list-loading">
        <div className="loading-spinner"></div>
        <p>載入中...</p>
      </div>
    )
  }

  if (cases.length === 0) {
    return (
      <div className="case-list-empty">
        <div className="empty-icon">📋</div>
        <h3>沒有案件資料</h3>
        <p>目前沒有符合篩選條件的案件</p>
      </div>
    )
  }

  return (
    <div className="case-list-container">
      <div className="case-list-wrapper">
        <table className="case-list-table">
          <thead className="case-list-header">
            <tr>
              <th className="header-case-number">案件編號</th>
              <th className="header-title">案件標題</th>
              <th className="header-category">案件類別</th>
              <th className="header-location">事發地點</th>
              <th className="header-contact">陳情民眾</th>
              <th className="header-phone">聯絡電話</th>
              <th className="header-handler">承辦人員</th>
              <th className="header-received-date">受理日期</th>
              <th className="header-priority">優先順序</th>
              <th className="header-status">處理狀態</th>
              <th className="header-action">案件操作</th>
            </tr>
          </thead>
          <tbody className="case-list-body">
            {cases.map((caseItem, index) => {
              const priorityDisplay = getPriorityDisplay(caseItem.priority)
              const statusDisplay = getStatusDisplay(caseItem.status)
              const location = getIncidentLocation(caseItem)
              
              return (
                <tr key={caseItem.id || index} className="case-list-row">
                  <td className="case-number-cell">
                    {getCaseNumber(caseItem)}
                  </td>
                  <td className="case-title-cell" title={caseItem.title}>
                    <div className="case-title-content">
                      {caseItem.title || '未命名案件'}
                    </div>
                  </td>
                  <td className="case-category-cell">
                    {getCategoryName(caseItem)}
                  </td>
                  <td className="case-location-cell">
                    <div className="location-district">{location.district}</div>
                    {location.address && (
                      <div className="location-address">{location.address}</div>
                    )}
                  </td>
                  <td className="case-contact-cell">
                    {getContactName(caseItem)}
                  </td>
                  <td className="case-phone-cell">
                    {getContactPhone(caseItem)}
                  </td>
                  <td className="case-handler-cell">
                    {getHandlerName(caseItem)}
                  </td>
                  <td className="case-date-cell">
                    {formatReceivedDate(caseItem)}
                  </td>
                  <td className="case-priority-cell">
                    <span className={`priority-badge ${priorityDisplay.class}`}>
                      {priorityDisplay.text}
                    </span>
                  </td>
                  <td className="case-status-cell">
                    <span className={`status-badge ${statusDisplay.class}`}>
                      {statusDisplay.text}
                    </span>
                  </td>
                  <td className="case-action-cell">
                    <button
                      className="action-btn view-edit-btn"
                      onClick={() => onCaseEdit(caseItem)}
                      title="查看/修改案件"
                    >
                      查看/修改
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default CaseListView