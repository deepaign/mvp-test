// src/components/Case/CaseTables/CaseListView.js - 修正欄位順序對應問題
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

  // 提取事發地點 - 分割為縣市行政區和詳細地址
  const getIncidentLocation = (caseItem) => {
    const fullLocation = CaseService.extractIncidentLocation(caseItem.description) || ''
    
    // 嘗試分離縣市行政區和詳細地址
    const locationParts = fullLocation.split(' ')
    if (locationParts.length >= 2) {
      // 第一部分通常是縣市+行政區
      const districtPart = locationParts[0]
      // 剩下的是詳細地址
      const addressPart = locationParts.slice(1).join(' ')
      return {
        district: districtPart,
        address: addressPart
      }
    }
    
    return {
      district: fullLocation,
      address: ''
    }
  }

  // 取得案件類別
  const getCategoryName = (caseItem) => {
    const categories = caseItem.CategoryCase || []
    if (categories.length > 0 && categories[0].Category) {
      return categories[0].Category.name
    }
    return '-'
  }

  // 取得陳情民眾（聯絡人1）
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

  // 取得承辦人員
  const getHandlerName = (caseItem) => {
    const inCharge = caseItem.InChargeCase || []
    const validRecord = inCharge.find(record => 
      record.member_id && record.Member
    )
    
    if (validRecord) {
      return validRecord.Member.name
    }
    return '尚未指派'
  }

  // 格式化受理日期
  const formatCreatedDate = (dateString) => {
    if (!dateString) return '-'
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).replace(/\//g, '-')
    } catch (error) {
      console.error('日期格式化失敗:', error)
      return '-'
    }
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
                    {formatCreatedDate(caseItem.created_at)}
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