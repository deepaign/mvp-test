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
    if (caseItem.DistrictCase && caseItem.DistrictCase.length > 0) {
      const districtData = caseItem.DistrictCase[0].District
      if (districtData) {
        const districtName = districtData.name || ''
        const countyName = districtData.County?.name || ''
        
        let locationParts = []
        if (countyName) locationParts.push(countyName)
        if (districtName) locationParts.push(districtName)
        
        const descriptionLocation = CaseService.extractIncidentLocation(caseItem.description) || ''
        
        return {
          district: locationParts.join(''),
          address: descriptionLocation.replace(locationParts.join(''), '').trim()
        }
      }
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

  // 修正：格式化受理日期 - 直接使用資料庫的 start_date
  const formatReceivedDate = (caseItem) => {
  // 優先使用 start_date（受理日期）
    if (caseItem.start_date) {
      try {
        // 🔧 修正：直接從 ISO 字串中提取日期部分，避免時區轉換
        const dateStr = caseItem.start_date.split('T')[0] // 直接取 YYYY-MM-DD 部分
        return dateStr
      } catch (error) {
        console.warn('解析受理日期失敗:', error)
      }
    }
    
    // 備用：使用建立日期
    if (caseItem.created_at) {
      try {
        const dateStr = caseItem.created_at.split('T')[0]
        return dateStr
      } catch (error) {
        console.warn('解析建立日期失敗:', error)
      }
    }
    
    return '-'
  }

  // ✅ 新增：格式化受理時間函數
  const formatReceivedTime = (caseItem) => {
    // 優先使用 start_date（受理時間）
    if (caseItem.start_date) {
      try {
        const datetime = new Date(caseItem.start_date)
        if (!isNaN(datetime.getTime())) {
          // 格式化為 HH:MM
          return datetime.toTimeString().split(' ')[0].substring(0, 5)
        }
      } catch (error) {
        console.warn('解析受理時間失敗:', error)
      }
    }
    
    return '-'
  }

  // ✅ 新增：格式化完整受理時間（日期 + 時間）
  const formatReceivedDateTime = (caseItem) => {
    const date = formatReceivedDate(caseItem)
    const time = formatReceivedTime(caseItem)
    
    if (date === '-') return '-'
    if (time === '-') return date
    
    return `${date} ${time}`
  }

  // ✅ 新增：取得受理人員姓名函數
  const getReceiverName = (caseItem) => {
    console.log('🔍 檢查受理人員 - 案件ID:', caseItem.id)
    
    if (!caseItem.CaseMember || !Array.isArray(caseItem.CaseMember)) {
      console.log('⚠️ 沒有 CaseMember 資料或不是陣列:', caseItem.CaseMember)
      return '-'
    }
    
    console.log('CaseMember 資料:', caseItem.CaseMember)
    
    const receiverRecord = caseItem.CaseMember.find(cm => cm.role === 'receiver')
    console.log('找到的受理人員記錄:', receiverRecord)
    
    if (receiverRecord && receiverRecord.Member && receiverRecord.Member.name) {
      console.log('✅ 受理人員:', receiverRecord.Member.name)
      return receiverRecord.Member.name
    }
    
    console.log('⚠️ 沒有找到有效的受理人員')
    return '-'
  }

  // 在表格標題行中新增受理人員和受理時間欄位
  const tableHeaders = [
    { key: 'caseNumber', label: '案件編號', width: '120px' },
    { key: 'title', label: '案件標題', width: '200px' },
    { key: 'contact', label: '聯絡人', width: '120px' },
    { key: 'phone', label: '電話', width: '120px' },
    { key: 'status', label: '狀態', width: '80px' },
    { key: 'priority', label: '優先順序', width: '80px' },
    { key: 'receiver', label: '受理人員', width: '100px' }, // ✅ 新增
    { key: 'handler', label: '承辦人員', width: '100px' },
    { key: 'receivedTime', label: '受理時間', width: '140px' }, // ✅ 新增
    { key: 'actions', label: '操作', width: '120px' }
  ]

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

  // 在表格行渲染中使用這些函數
  const renderTableRow = (caseItem, index) => {
    return (
      <tr key={caseItem.id || index} className="case-row">
        <td className="case-number">{CaseService.extractCaseNumber(caseItem.description) || '-'}</td>
        <td className="case-title" title={caseItem.title}>{caseItem.title || '-'}</td>
        <td className="contact-name">{getContactName(caseItem)}</td>
        <td className="contact-phone">{getContactPhone(caseItem)}</td>
        <td className="case-status">
          <span className={`status-badge ${getStatusDisplay(caseItem.status).class}`}>
            {getStatusDisplay(caseItem.status).text}
          </span>
        </td>
        <td className="case-priority">
          <span className={`priority-badge ${getPriorityDisplay(caseItem.priority).class}`}>
            {getPriorityDisplay(caseItem.priority).text}
          </span>
        </td>
        <td className="receiver-name">{getReceiverName(caseItem)}</td> {/* ✅ 新增 */}
        <td className="handler-name">{getHandlerName(caseItem)}</td>
        <td className="received-time">{formatReceivedDateTime(caseItem)}</td> {/* ✅ 新增 */}
        <td className="case-actions">
          <div className="action-buttons">
            {canEdit && (
              <button 
                className="edit-btn action-btn"
                onClick={() => onEdit(caseItem)}
                title="編輯案件"
              >
                編輯
              </button>
            )}
            {canDelete && (
              <button 
                className="delete-btn action-btn"
                onClick={() => onDelete(caseItem.id)}
                title="刪除案件"
              >
                刪除
              </button>
            )}
          </div>
        </td>
      </tr>
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