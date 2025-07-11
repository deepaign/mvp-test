// src/components/Case/CaseModal/CaseForm/FormSections.js - 修正版：解決案件內容顯示問題
import React, { useState, useEffect, useCallback } from 'react'
import CategoryAutoComplete from './CategoryAutoComplete'

// 輔助函數：確保選項安全
const ensureSafeOptions = (options) => {
  if (!options || typeof options !== 'object') {
    return {
      members: [],
      categories: [],
      counties: [],
      homeDistricts: [],
      incidentDistricts: []
    }
  }

  return {
    members: Array.isArray(options.members) ? options.members : [],
    categories: Array.isArray(options.categories) ? options.categories : [],
    counties: Array.isArray(options.counties) ? options.counties : [],
    homeDistricts: Array.isArray(options.homeDistricts) ? options.homeDistricts : [],
    incidentDistricts: Array.isArray(options.incidentDistricts) ? options.incidentDistricts : []
  }
}

// 基本資訊區段
export const BasicInfoSection = ({ formData, dropdownOptions, onChange }) => {
  const safeOptions = ensureSafeOptions(dropdownOptions)

  return (
    <div className="form-section">
      <h3 className="section-title">基本資訊</h3>
      <div className="form-grid">
        <div className="form-field">
          <label htmlFor="caseNumber">案件編號</label>
          <input
            id="caseNumber"
            type="text"
            value={formData.caseNumber || ''}
            onChange={(e) => onChange('caseNumber', e.target.value)}
            placeholder="系統自動產生或手動輸入"
          />
        </div>

        <div className="form-field">
          <label htmlFor="contactMethod">聯絡方式 <span className="required">*</span></label>
          <select
            id="contactMethod"
            value={formData.contactMethod || 'phone'}
            onChange={(e) => onChange('contactMethod', e.target.value)}
            required
          >
            <option value="phone">電話</option>
            <option value="email">電子郵件</option>
            <option value="line">LINE</option>
            <option value="facebook">Facebook</option>
            <option value="visit">現場拜訪</option>
            <option value="other">其他</option>
          </select>
        </div>

        <div className="form-field">
          <label htmlFor="receivedDate">受理日期 <span className="required">*</span></label>
          <div className="datetime-group">
            <input
              id="receivedDate"
              type="date"
              className="date-input"
              value={formData.receivedDate || ''}
              onChange={(e) => onChange('receivedDate', e.target.value)}
              required
            />
            <input
              id="receivedTime"
              type="time"
              className="time-input"
              value={formData.receivedTime || ''}
              onChange={(e) => onChange('receivedTime', e.target.value)}
            />
          </div>
        </div>

        <div className="form-field">
          <label htmlFor="closedDate">結案日期</label>
          <div className="datetime-group">
            <input
              id="closedDate"
              type="date"
              className="date-input"
              value={formData.closedDate || ''}
              onChange={(e) => onChange('closedDate', e.target.value)}
            />
            <input
              id="closedTime"
              type="time"
              className="time-input"
              value={formData.closedTime || ''}
              onChange={(e) => onChange('closedTime', e.target.value)}
              disabled={!formData.closedDate}
            />
          </div>
        </div>

        <div className="form-field">
          <label htmlFor="receiver">受理人員</label>
          <select
            id="receiver"
            value={formData.receiver || ''}
            onChange={(e) => onChange('receiver', e.target.value)}
          >
            <option value="">請選擇受理人員</option>
            {safeOptions.members.map(member => (
              <option key={member.id || Math.random()} value={member.id}>
                {member.name || '未命名成員'}
              </option>
            ))}
          </select>
        </div>

        <div className="form-field">
          <label htmlFor="assignee">承辦人員</label>
          <select
            id="assignee"
            value={formData.assignee || ''}
            onChange={(e) => onChange('assignee', e.target.value)}
          >
            <option value="">請選擇承辦人員</option>
            {safeOptions.members.map(member => (
              <option key={member.id || Math.random()} value={member.id}>
                {member.name || '未命名成員'}
              </option>
            ))}
          </select>
        </div>

        <div className="form-field">
          <label htmlFor="category">案件類別</label>
          <CategoryAutoComplete
            value={formData.category || ''}
            onChange={(value) => onChange('category', value)}
            categories={safeOptions.categories}
            placeholder="請選擇或輸入案件類別"
          />
        </div>

        <div className="form-field">
          <label htmlFor="priority">優先順序</label>
          <select
            id="priority"
            value={formData.priority || 'normal'}
            onChange={(e) => onChange('priority', e.target.value)}
          >
            <option value="low">低</option>
            <option value="normal">一般</option>
            <option value="urgent">緊急</option>
          </select>
        </div>

        <div className="form-field full-width">
          <label>戶籍地址</label>
          <div className="address-group">
            <select
              id="homeCounty"
              value={formData.homeCounty || ''}
              onChange={(e) => onChange('homeCounty', e.target.value)}
              className="county-select"
            >
              <option value="">請選擇縣市</option>
              {safeOptions.counties.map(county => (
                <option key={county.id || county.name || Math.random()} value={county.id}>
                  {county.name || '未命名縣市'}
                </option>
              ))}
            </select>
            <select
              id="homeDistrict"
              value={formData.homeDistrict || ''}
              onChange={(e) => onChange('homeDistrict', e.target.value)}
              disabled={!formData.homeCounty}
              className="district-select"
            >
              <option value="">
                {!formData.homeCounty 
                  ? '請先選擇縣市' 
                  : safeOptions.homeDistricts.length === 0 
                    ? '無可用行政區' 
                    : '請選擇行政區'
                }
              </option>
              {safeOptions.homeDistricts.map(district => (
                <option key={district.id || district.name || Math.random()} value={district.id}>
                  {district.name || '未命名行政區'}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-field">
          <label htmlFor="hasAttachment">檔案附件</label>
          <select
            id="hasAttachment"
            value={formData.hasAttachment || 'none'}
            onChange={(e) => onChange('hasAttachment', e.target.value)}
          >
            <option value="none">無附件</option>
            <option value="image">圖片</option>
            <option value="document">文件</option>
            <option value="both">圖片+文件</option>
          </select>
        </div>
      </div>
    </div>
  )
}

// 聯絡資訊區段
export const ContactInfoSection = ({ formData, onChange }) => (
  <div className="form-section">
    <h3 className="section-title">聯絡資訊</h3>
    <div className="form-grid">
      <div className="form-field">
        <label htmlFor="contact1Name">聯絡人1 <span className="required">*</span></label>
        <input
          id="contact1Name"
          type="text"
          value={formData.contact1Name || ''}
          onChange={(e) => onChange('contact1Name', e.target.value)}
          placeholder="請輸入聯絡人姓名"
          required
        />
      </div>

      <div className="form-field">
        <label htmlFor="contact1Phone">聯絡人1電話 <span className="required">*</span></label>
        <input
          id="contact1Phone"
          type="tel"
          value={formData.contact1Phone || ''}
          onChange={(e) => onChange('contact1Phone', e.target.value)}
          placeholder="請輸入電話號碼"
          required
        />
      </div>

      <div className="form-field">
        <label htmlFor="contact2Name">聯絡人2</label>
        <input
          id="contact2Name"
          type="text"
          value={formData.contact2Name || ''}
          onChange={(e) => onChange('contact2Name', e.target.value)}
          placeholder="請輸入聯絡人姓名"
        />
      </div>

      <div className="form-field">
        <label htmlFor="contact2Phone">聯絡人2電話</label>
        <input
          id="contact2Phone"
          type="tel"
          value={formData.contact2Phone || ''}
          onChange={(e) => onChange('contact2Phone', e.target.value)}
          placeholder="請輸入電話號碼"
        />
      </div>
    </div>
  </div>
)

// 案件內容區段 - 修正版
export const CaseContentSection = ({ formData, dropdownOptions, onChange }) => {
  const safeOptions = ensureSafeOptions(dropdownOptions)

  // 🔧 處理 textarea 值變更，確保正確處理換行和特殊字符
  const handleDescriptionChange = useCallback((e) => {
    const value = e.target.value
    console.log('案件描述變更:', value)
    onChange('description', value)
  }, [onChange])

  // 🔧 處理 textarea 的 blur 事件，確保內容保存
  const handleDescriptionBlur = useCallback((e) => {
    const value = e.target.value
    console.log('案件描述失去焦點，確保保存:', value)
    onChange('description', value)
  }, [onChange])

  return (
    <div className="form-section">
      <h3 className="section-title">陳情內容</h3>
      <div className="form-grid">
        <div className="form-field full-width">
          <label htmlFor="title">案件標題 <span className="required">*</span></label>
          <input
            id="title"
            type="text"
            value={formData.title || ''}
            onChange={(e) => onChange('title', e.target.value)}
            placeholder="請輸入案件標題"
            required
          />
        </div>

        <div className="form-field full-width">
          <label htmlFor="description">詳細描述</label>
          <textarea
            id="description"
            value={formData.description || ''}
            onChange={handleDescriptionChange}
            onBlur={handleDescriptionBlur}
            placeholder="請詳細描述陳情內容"
            rows={4}
            style={{
              minHeight: '120px',
              resize: 'vertical',
              lineHeight: '1.5',
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word'
            }}
          />
        </div>

        <div className="form-field full-width">
          <label>事發地點</label>
          <div className="incident-location-group">
            <div className="district-selector">
              <select
                id="incidentCounty"
                value={formData.incidentCounty || ''}
                onChange={(e) => onChange('incidentCounty', e.target.value)}
                className="county-select"
                aria-label="事發縣市"
              >
                <option value="">請選擇事發縣市</option>
                {safeOptions.counties.map(county => (
                  <option key={county.id || county.name || Math.random()} value={county.id}>
                    {county.name || '未命名縣市'}
                  </option>
                ))}
              </select>
              <select
                id="incidentDistrict"
                value={formData.incidentDistrict || ''}
                onChange={(e) => onChange('incidentDistrict', e.target.value)}
                disabled={!formData.incidentCounty}
                className="district-select"
                aria-label="事發行政區"
              >
                <option value="">
                  {!formData.incidentCounty 
                    ? '請先選擇縣市' 
                    : safeOptions.incidentDistricts.length === 0 
                      ? '無可用行政區' 
                      : '請選擇行政區'
                  }
                </option>
                {safeOptions.incidentDistricts.map(district => (
                  <option key={district.id || district.name || Math.random()} value={district.id}>
                    {district.name || '未命名行政區'}
                  </option>
                ))}
              </select>
            </div>
            <input
              id="incidentLocation"
              type="text"
              value={formData.incidentLocation || ''}
              onChange={(e) => onChange('incidentLocation', e.target.value)}
              placeholder="請輸入詳細地址"
              className="address-input"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// 通知設定區段
export const NotificationSection = ({ formData, onChange }) => {
  const [localNotificationDate, setLocalNotificationDate] = useState('')
  const [localNotificationTime, setLocalNotificationTime] = useState('')
  const [localCalendarDate, setLocalCalendarDate] = useState('')
  const [localCalendarTime, setLocalCalendarTime] = useState('')

  // 同步外部資料到本地狀態
  useEffect(() => {
    setLocalNotificationDate(formData.notificationDate || '')
    setLocalNotificationTime(formData.notificationTime || '')
    setLocalCalendarDate(formData.calendarDate || '')
    setLocalCalendarTime(formData.calendarTime || '')
  }, [formData.notificationDate, formData.notificationTime, formData.calendarDate, formData.calendarTime])

  const handleNotificationToggle = (checked) => {
    onChange('shouldNotify', checked)
    if (!checked) {
      onChange('notificationDate', '')
      onChange('notificationTime', '')
      setLocalNotificationDate('')
      setLocalNotificationTime('')
    }
  }

  const handleCalendarToggle = (checked) => {
    onChange('shouldAddToCalendar', checked)
    if (!checked) {
      onChange('calendarDate', '')
      onChange('calendarTime', '')
      setLocalCalendarDate('')
      setLocalCalendarTime('')
    }
  }

  const handleNotificationDateChange = (value) => {
    setLocalNotificationDate(value)
    onChange('notificationDate', value)
  }

  const handleNotificationTimeChange = (value) => {
    setLocalNotificationTime(value)
    onChange('notificationTime', value)
  }

  const handleCalendarDateChange = (value) => {
    setLocalCalendarDate(value)
    onChange('calendarDate', value)
  }

  const handleCalendarTimeChange = (value) => {
    setLocalCalendarTime(value)
    onChange('calendarTime', value)
  }

  return (
    <div className="form-section">
      <h3 className="section-title">通知設定</h3>
      
      {/* 通知提醒 */}
      <div className="notification-row">
        <div className="notification-toggle">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={formData.shouldNotify || false}
              onChange={(e) => handleNotificationToggle(e.target.checked)}
              className="toggle-checkbox"
            />
            <span className="toggle-text">設定通知提醒</span>
          </label>
        </div>
        
        {formData.shouldNotify && (
          <div className="notification-datetime">
            <input
              type="date"
              value={localNotificationDate}
              onChange={(e) => handleNotificationDateChange(e.target.value)}
              className="datetime-input"
            />
            <input
              type="time"
              value={localNotificationTime}
              onChange={(e) => handleNotificationTimeChange(e.target.value)}
              className="datetime-input"
            />
          </div>
        )}

        <div className="notification-actions">
          <button
            type="button"
            className="action-btn notification-btn"
            disabled={!formData.shouldNotify}
          >
            📱 建立通知
          </button>
        </div>
      </div>

      {/* 行事曆提醒 */}
      <div className="notification-row">
        <div className="notification-toggle">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={formData.shouldAddToCalendar || false}
              onChange={(e) => handleCalendarToggle(e.target.checked)}
              className="toggle-checkbox"
            />
            <span className="toggle-text">加入行事曆</span>
          </label>
        </div>
        
        {formData.shouldAddToCalendar && (
          <div className="notification-datetime">
            <input
              type="date"
              value={localCalendarDate}
              onChange={(e) => handleCalendarDateChange(e.target.value)}
              className="datetime-input"
            />
            <input
              type="time"
              value={localCalendarTime}
              onChange={(e) => handleCalendarTimeChange(e.target.value)}
              className="datetime-input"
            />
          </div>
        )}

        <div className="notification-actions">
          <button
            type="button"
            className="action-btn calendar-btn"
            disabled={!formData.shouldAddToCalendar}
          >
            📅 加入行事曆
          </button>
        </div>
      </div>
    </div>
  )
}