// src/components/Case/CaseModal/CaseForm/FormSections.js
import React from 'react'
import CategoryAutoComplete from './CategoryAutoComplete'

export const BasicInfoSection = ({ formData, dropdownOptions, onChange }) => (
  <div className="form-section">
    <h3 className="section-title">基本資訊</h3>
    <div className="form-grid">
      <div className="form-field">
        <label htmlFor="caseNumber">案件編號</label>
        <input
          id="caseNumber"
          type="text"
          value={formData.caseNumber || ''}
          readOnly
          className="readonly-input"
        />
      </div>

      <div className="form-field">
        <label htmlFor="contactMethod">陳情方式 <span className="required">*</span></label>
        <select
          id="contactMethod"
          value={formData.contactMethod || 'phone'}
          onChange={(e) => onChange('contactMethod', e.target.value)}
          required
        >
          <option value="phone">電話</option>
          <option value="line">Line</option>
          <option value="facebook">Facebook</option>
          <option value="email">Email</option>
          <option value="in_person">現場</option>
          <option value="other">其他</option>
        </select>
      </div>

      <div className="form-field">
        <label>受理日期時間 <span className="required">*</span></label>
        <div className="datetime-group">
          <input
            id="receivedDate"
            type="date"
            value={formData.receivedDate || ''}
            onChange={(e) => onChange('receivedDate', e.target.value)}
            required
            className="date-input"
            aria-label="受理日期"
          />
          <input
            id="receivedTime"
            type="time"
            value={formData.receivedTime || ''}
            onChange={(e) => onChange('receivedTime', e.target.value)}
            required
            className="time-input"
            aria-label="受理時間"
          />
        </div>
      </div>

      <div className="form-field">
        <label>結案日期時間</label>
        <div className="datetime-group">
          <input
            id="closedDate"
            type="date"
            value={formData.closedDate || ''}
            onChange={(e) => onChange('closedDate', e.target.value)}
            className="date-input"
            aria-label="結案日期"
          />
          <input
            id="closedTime"
            type="time"
            value={formData.closedTime || ''}
            onChange={(e) => onChange('closedTime', e.target.value)}
            disabled={!formData.closedDate}
            className="time-input"
            aria-label="結案時間"
          />
        </div>
      </div>

      <div className="form-field">
        <label htmlFor="receiver">受理人員 <span className="required">*</span></label>
        <select
          id="receiver"
          value={formData.receiver || ''}
          onChange={(e) => onChange('receiver', e.target.value)}
          required
        >
          <option value="">請選擇受理人員</option>
          {(dropdownOptions.members || []).map(member => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </select>
      </div>

      <div className="form-field">
        <label htmlFor="handler">承辦人員</label>
        <select
          id="handler"
          value={formData.handler || ''}
          onChange={(e) => onChange('handler', e.target.value)}
        >
          <option value="">請選擇承辦人員</option>
          {(dropdownOptions.members || []).map(member => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </select>
      </div>

      <div className="form-field">
        <label>案件類別 <span className="required">*</span></label>
        <CategoryAutoComplete
          value={formData.category || ''}
          onChange={(value) => onChange('category', value)}
          categories={dropdownOptions.categories || []}
          placeholder="請輸入或選擇案件類型"
          required
        />
      </div>

      <div className="form-field">
        <label>住家里別</label>
        <div className="district-selector">
          <select
            id="homeCounty"
            value={formData.homeCounty || ''}
            onChange={(e) => onChange('homeCounty', e.target.value)}
            className="county-select"
            aria-label="住家縣市"
          >
            <option value="">請選擇縣市</option>
            {(dropdownOptions.counties || []).map(county => (
              <option key={county.id} value={county.id}>
                {county.name}
              </option>
            ))}
          </select>
          <select
            id="homeDistrict"
            value={formData.homeDistrict || ''}
            onChange={(e) => onChange('homeDistrict', e.target.value)}
            disabled={!formData.homeCounty}
            className="district-select"
            aria-label="住家行政區"
          >
            <option value="">
              {!formData.homeCounty 
                ? '請先選擇縣市' 
                : (dropdownOptions.homeDistricts || []).length === 0 
                  ? '該縣市暫無行政區資料' 
                  : '請選擇行政區'
              }
            </option>
            {(dropdownOptions.homeDistricts || []).map(district => (
              <option key={district.id} value={district.id}>
                {district.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-field">
        <label htmlFor="priority">優先等級 <span className="required">*</span></label>
        <select
          id="priority"
          value={formData.priority || 'normal'}
          onChange={(e) => onChange('priority', e.target.value)}
          required
        >
          <option value="urgent">緊急</option>
          <option value="normal">一般</option>
          <option value="low">低</option>
        </select>
      </div>

      <div className="form-field">
        <label htmlFor="hasAttachment">是否有附件</label>
        <select
          id="hasAttachment"
          value={formData.hasAttachment || 'none'}
          onChange={(e) => onChange('hasAttachment', e.target.value)}
        >
          <option value="none">無</option>
          <option value="has">有</option>
          <option value="pending">待補</option>
        </select>
      </div>
    </div>
  </div>
)

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
        <label htmlFor="contact1Phone">電話1<span className="required">*</span></label>
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
        <label htmlFor="contact2Phone">電話2</label>
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

export const CaseContentSection = ({ formData, dropdownOptions, onChange }) => (
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
          onChange={(e) => onChange('description', e.target.value)}
          placeholder="請詳細描述陳情內容"
          rows={4}
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
              {(dropdownOptions.counties || []).map(county => (
                <option key={county.id} value={county.id}>
                  {county.name}
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
                  : (dropdownOptions.incidentDistricts || []).length === 0 
                    ? '該縣市暫無行政區資料' 
                    : '請選擇事發行政區'
                }
              </option>
              {(dropdownOptions.incidentDistricts || []).map(district => (
                <option key={district.id} value={district.id}>
                  {district.name}
                </option>
              ))}
            </select>
          </div>
          <input
            id="incidentLocation"
            type="text"
            value={formData.incidentLocation || ''}
            onChange={(e) => onChange('incidentLocation', e.target.value)}
            placeholder="請輸入詳細地點描述"
            style={{ marginTop: '8px' }}
            aria-label="詳細地點描述"
          />
        </div>
      </div>

      <div className="form-field">
        <label htmlFor="processingStatus">處理狀態</label>
        <select
          id="processingStatus"
          value={formData.processingStatus || 'pending'}
          onChange={(e) => onChange('processingStatus', e.target.value)}
        >
          <option value="pending">待處理</option>
          <option value="processing">處理中</option>
          <option value="completed">已完成</option>
        </select>
      </div>
    </div>
  </div>
)

export const NotificationSection = ({ formData, onChange }) => (
  <div className="form-section">
    <h3 className="section-title">通知與行事曆設定</h3>
    <div className="calendar-notification-container">
      {/* 通知設定行 */}
      <div className="notification-row">
        <div className="notification-field">
          <label htmlFor="notificationMethod">通知方式</label>
          <select
            id="notificationMethod"
            value={formData.notificationMethod || 'phone'}
            onChange={(e) => onChange('notificationMethod', e.target.value)}
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
          <label htmlFor="reminderDate">提醒時間</label>
          <input
            id="reminderDate"
            type="datetime-local"
            value={formData.reminderDate ? 
              new Date(formData.reminderDate).toISOString().slice(0, 16) : 
              ''
            }
            onChange={(e) => onChange('reminderDate', e.target.value)}
            className="datetime-input"
          />
        </div>

        <div className="notification-actions">
          <button
            type="button"
            className={`action-btn calendar-btn ${formData.googleCalendarSync ? 'active' : ''}`}
            onClick={() => onChange('googleCalendarSync', !formData.googleCalendarSync)}
            aria-label="同步至 Google 行事曆"
          >
            <span className="btn-icon" aria-hidden="true">📅</span>
            同步至 Google 行事曆
          </button>
          
          <button
            type="button"
            className={`action-btn notification-btn ${formData.sendNotification ? 'active' : ''}`}
            onClick={() => onChange('sendNotification', !formData.sendNotification)}
            aria-label="發送通知"
          >
            <span className="btn-icon" aria-hidden="true">🔔</span>
            發送通知
          </button>
        </div>
      </div>

      {/* 多次提醒設定 */}
      <div className="multiple-reminder-row">
        <div className="checkbox-container">
          <label className="checkbox-label" htmlFor="multipleReminders">
            <input
              id="multipleReminders"
              type="checkbox"
              checked={formData.multipleReminders || false}
              onChange={(e) => onChange('multipleReminders', e.target.checked)}
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
)