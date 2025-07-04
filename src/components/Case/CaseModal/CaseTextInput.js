import React, { useState } from 'react'
import '../../../styles/CaseTextInput.css'

function CaseTextInput({ team, onSubmit, onCancel }) {
  const [textContent, setTextContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // 新增通知和行事曆設定狀態
  const [notificationSettings, setNotificationSettings] = useState({
    notificationMethod: 'phone',
    reminderDate: '',
    googleCalendarSync: false,
    sendNotification: false,
    multipleReminders: false
  })

  const handleNotificationChange = (field, value) => {
    setNotificationSettings(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!textContent.trim()) {
      alert('請輸入案件內容')
      return
    }

    setIsSubmitting(true)

    try {
      // 將全文輸入和通知設定轉換為案件資料格式
      const caseData = {
        title: '全文輸入案件',
        description: textContent.trim(),
        inputMode: 'text',
        // 包含通知設定
        notificationSettings
      }

      await onSubmit(caseData)
    } catch (error) {
      console.error('提交失敗:', error)
      alert('提交失敗，請稍後再試')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="case-text-input-container">
      <form onSubmit={handleSubmit} className="case-text-form">
        {/* 全文輸入區域 */}
        <div className="text-input-section">
          <label className="text-input-label">
            陳情內容全文 <span className="required">*</span>
          </label>
          <textarea
            value={textContent}
            onChange={(e) => setTextContent(e.target.value)}
            placeholder="請輸入陳情內容全文，系統將自動萃取關鍵資訊..."
            rows={12}
            className="text-input-textarea"
            required
          />
        </div>

        {/* AI 萃取提示 */}
        <div className="ai-extract-notice">
          <div className="ai-extract-header">
            <span className="ai-icon">🤖</span>
            <strong>AI 萃取資訊</strong>
          </div>
          <p className="ai-extract-description">
            系統將自動分析文本並萃取案件標題、聯絡人、地點等關鍵資訊
          </p>
        </div>

        {/* 通知與行事曆設定 */}
        <div className="form-section">
          <h3 className="section-title">通知與行事曆設定</h3>
          <div className="calendar-notification-container">
            {/* 通知設定行 */}
            <div className="notification-row">
              <div className="notification-field">
                <label>通知方式</label>
                <select
                  value={notificationSettings.notificationMethod}
                  onChange={(e) => handleNotificationChange('notificationMethod', e.target.value)}
                  className="notification-select"
                >
                  <option value="phone">電話</option>
                  <option value="sms">簡訊</option>
                  <option value="email">Email</option>
                  <option value="line">Line</option>
                  <option value="other">其他</option>
                </select>
              </div>

              <div className="notification-field">
                <label>提醒日期時間</label>
                <input
                  type="datetime-local"
                  value={notificationSettings.reminderDate}
                  onChange={(e) => handleNotificationChange('reminderDate', e.target.value)}
                  className="datetime-input"
                />
              </div>

              <div className="notification-actions">
                <button
                  type="button"
                  className={`action-btn calendar-btn ${notificationSettings.googleCalendarSync ? 'active' : ''}`}
                  onClick={() => handleNotificationChange('googleCalendarSync', !notificationSettings.googleCalendarSync)}
                >
                  <span className="btn-icon">📅</span>
                  同步至 Google 行事曆
                </button>
                
                <button
                  type="button"
                  className={`action-btn notification-btn ${notificationSettings.sendNotification ? 'active' : ''}`}
                  onClick={() => handleNotificationChange('sendNotification', !notificationSettings.sendNotification)}
                >
                  <span className="btn-icon">🔔</span>
                  發送通知
                </button>
              </div>
            </div>

            {/* 多次提醒設定 */}
            <div className="multiple-reminder-row">
              <div className="checkbox-container">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={notificationSettings.multipleReminders}
                    onChange={(e) => handleNotificationChange('multipleReminders', e.target.checked)}
                    className="checkbox-input"
                  />
                  <span className="checkbox-text">
                    設定多次提醒（會在設定時間前1天、當天和逾期時自動發送通知）
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="form-footer">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="cancel-btn"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !textContent.trim()}
            className="submit-btn"
          >
            {isSubmitting ? '建立中...' : '建立案件'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default CaseTextInput