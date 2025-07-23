// src/components/Case/CaseTables/CaseCardView.js - 修正受理日期顯示問題
import React from 'react'
import { CaseService } from '../../../services/caseService'
import '../../../styles/CaseCardView.css'

function CaseCardView({ 
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

  // 修正：格式化受理日期 - 直接使用資料庫的 start_date
  const formatReceivedDate = (caseItem) => {
    // 優先使用 start_date（受理日期）
    if (caseItem.start_date) {
      try {
        // 🔧 修正：直接從 ISO 字串中提取日期部分，避免時區轉換
        return caseItem.start_date.split('T')[0] // 直接取 YYYY-MM-DD 部分
      } catch (error) {
        console.warn('解析受理日期失敗:', error)
      }
    }
    
    // 備用：使用建立日期
    if (caseItem.created_at) {
      try {
        return caseItem.created_at.split('T')[0]
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
      'normal': { text: '一般', class: 'priority-normal' },  // 修正：普通 -> 一般
      'low': { text: '低', class: 'priority-low' }
      // 移除 'high': { text: '高', class: 'priority-high' }
    }
    return priorityMap[priority] || { text: '一般', class: 'priority-normal' }  // 預設改為「一般」
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
      <div className="case-cards-loading">
        <div className="loading-spinner"></div>
        <p>載入中...</p>
      </div>
    )
  }

  if (cases.length === 0) {
    return (
      <div className="case-cards-empty">
        <div className="empty-icon">📋</div>
        <h3>沒有案件資料</h3>
        <p>目前沒有符合篩選條件的案件</p>
      </div>
    )
  }

  return (
    <div className="case-cards-container">
      <div className="case-cards-grid">
        {cases.map((caseItem, index) => {
          const priorityDisplay = getPriorityDisplay(caseItem.priority)
          const statusDisplay = getStatusDisplay(caseItem.status)
          const location = getIncidentLocation(caseItem)
          
          return (
            <div key={caseItem.id || index} className="case-card">
              {/* Header */}
              <div className="case-card-header">
                <div className="card-header-left">
                  <span className="case-number">
                    {getCaseNumber(caseItem)}
                  </span>
                </div>
                <div className="card-header-right">
                  <span className={`priority-badge ${priorityDisplay.class}`}>
                    {priorityDisplay.text}
                  </span>
                  <span className={`status-badge ${statusDisplay.class}`}>
                    {statusDisplay.text}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="case-card-content">
                <h4 className="case-title" title={caseItem.title}>
                  {caseItem.title || '未命名案件'}
                </h4>

                <div className="case-info-list">
                  <div className="info-row">
                    <div className="info-item">
                      <span className="info-label">案件類別</span>
                      <span className="info-value">{getCategoryName(caseItem)}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">陳情民眾</span>
                      <span className="info-value">{getContactName(caseItem)}</span>
                    </div>
                  </div>
                  
                  <div className="info-row">
                    <div className="info-item">
                      <span className="info-label">事發地點</span>
                      <div className="location-container">
                        <div className="location-district">{location.district}</div>
                        {location.address && (
                          <div className="location-address">{location.address}</div>
                        )}
                      </div>
                    </div>
                    <div className="info-item">
                      <span className="info-label">聯絡電話</span>
                      <span className="info-value">{getContactPhone(caseItem)}</span>
                    </div>
                  </div>
                  
                  <div className="info-row">
                    <div className="info-item full-width">
                      <span className="info-label">承辦人員</span>
                      <span className="info-value">{getHandlerName(caseItem)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="case-card-footer">
                <div className="footer-left">
                  <span className="received-date">
                    {formatReceivedDate(caseItem)}
                  </span>
                </div>
                <div className="footer-right">
                  <button
                    className="action-btn view-edit-btn"
                    onClick={() => onCaseEdit(caseItem)}
                    title="查看/修改案件"
                  >
                    查看/修改
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default CaseCardView