// src/components/Case/CaseModal/CaseForm/FormSections.js
import React from 'react'

export const BasicInfoSection = ({ formData, dropdownOptions, onChange }) => (
  <div className="form-section">
    <h3 className="section-title">基本資訊</h3>
    <div className="form-grid">
      <div className="form-field">
        <label>案件編號</label>
        <input
          type="text"
          value={formData.caseNumber}
          readOnly
          className="readonly-input"
        />
      </div>

      <div className="form-field">
        <label>陳情方式 <span className="required">*</span></label>
        <select
          value={formData.contactMethod}
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
            type="date"
            value={formData.receivedDate}
            onChange={(e) => onChange('receivedDate', e.target.value)}
            required
            className="date-input"
          />
          <input
            type="time"
            value={formData.receivedTime}
            onChange={(e) => onChange('receivedTime', e.target.value)}
            required
            className="time-input"
          />
        </div>
      </div>

      <div className="form-field">
        <label>結案日期時間</label>
        <div className="datetime-group">
          <input
            type="date"
            value={formData.closedDate}
            onChange={(e) => onChange('closedDate', e.target.value)}
            className="date-input"
          />
          <input
            type="time"
            value={formData.closedTime}
            onChange={(e) => onChange('closedTime', e.target.value)}
            disabled={!formData.closedDate}
            className="time-input"
          />
        </div>
      </div>

      <div className="form-field">
        <label>受理人員 <span className="required">*</span></label>
        <select
          value={formData.receiver}
          onChange={(e) => onChange('receiver', e.target.value)}
          required
        >
          <option value="">請選擇受理人員</option>
          {dropdownOptions.members.map(member => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </select>
      </div>

      <div className="form-field">
        <label>承辦人員</label>
        <select
          value={formData.handler}
          onChange={(e) => onChange('handler', e.target.value)}
        >
          <option value="">請選擇承辦人員</option>
          {dropdownOptions.members.map(member => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </select>
      </div>

      <div className="form-field">
        <label>案件類別 <span className="required">*</span></label>
        <select
          value={formData.category}
          onChange={(e) => onChange('category', e.target.value)}
          required
        >
          <option value="">請選擇案件類別</option>
          {dropdownOptions.categories.map(category => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <div className="form-field">
        <label>住家里別</label>
        <div className="district-selector">
          <select
            value={formData.homeCounty}
            onChange={(e) => onChange('homeCounty', e.target.value)}
            className="county-select"
          >
            <option value="">請選擇縣市</option>
            {dropdownOptions.counties.map(county => (
              <option key={county.id} value={county.id}>
                {county.name}
              </option>
            ))}
          </select>
          <select
            value={formData.homeDistrict}
            onChange={(e) => onChange('homeDistrict', e.target.value)}
            disabled={!formData.homeCounty}
            className="district-select"
          >
            <option value="">
              {!formData.homeCounty 
                ? '請先選擇縣市' 
                : dropdownOptions.homeDistricts.length === 0 
                  ? '該縣市暫無行政區資料' 
                  : '請選擇行政區'
              }
            </option>
            {dropdownOptions.homeDistricts.map(district => (
              <option key={district.id} value={district.id}>
                {district.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-field">
        <label>優先等級 <span className="required">*</span></label>
        <select
          value={formData.priority}
          onChange={(e) => onChange('priority', e.target.value)}
          required
        >
          <option value="urgent">緊急</option>
          <option value="normal">一般</option>
          <option value="low">低</option>
        </select>
      </div>

      <div className="form-field">
        <label>是否有附件</label>
        <select
          value={formData.hasAttachment}
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
        <label>聯絡人1 <span className="required">*</span></label>
        <input
          type="text"
          value={formData.contact1Name}
          onChange={(e) => onChange('contact1Name', e.target.value)}
          placeholder="請輸入聯絡人姓名"
          required
        />
      </div>

      <div className="form-field">
        <label>聯絡人1電話 <span className="required">*</span></label>
        <input
          type="tel"
          value={formData.contact1Phone}
          onChange={(e) => onChange('contact1Phone', e.target.value)}
          placeholder="請輸入電話號碼"
          required
        />
      </div>

      <div className="form-field">
        <label>聯絡人2</label>
        <input
          type="text"
          value={formData.contact2Name}
          onChange={(e) => onChange('contact2Name', e.target.value)}
          placeholder="請輸入聯絡人姓名"
        />
      </div>

      <div className="form-field">
        <label>聯絡人2電話</label>
        <input
          type="tel"
          value={formData.contact2Phone}
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
        <label>案件標題 <span className="required">*</span></label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => onChange('title', e.target.value)}
          placeholder="請輸入案件標題"
          required
        />
      </div>

      <div className="form-field full-width">
        <label>詳細描述</label>
        <textarea
          value={formData.description}
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
              value={formData.incidentCounty}
              onChange={(e) => onChange('incidentCounty', e.target.value)}
              className="county-select"
            >
              <option value="">請選擇事發縣市</option>
              {dropdownOptions.counties.map(county => (
                <option key={county.id} value={county.id}>
                  {county.name}
                </option>
              ))}
            </select>
            <select
              value={formData.incidentDistrict}
              onChange={(e) => onChange('incidentDistrict', e.target.value)}
              disabled={!formData.incidentCounty}
              className="district-select"
            >
              <option value="">
                {!formData.incidentCounty 
                  ? '請先選擇縣市' 
                  : dropdownOptions.incidentDistricts.length === 0 
                    ? '該縣市暫無行政區資料' 
                    : '請選擇事發行政區'
                }
              </option>
              {dropdownOptions.incidentDistricts.map(district => (
                <option key={district.id} value={district.id}>
                  {district.name}
                </option>
              ))}
            </select>
          </div>
          <input
            type="text"
            value={formData.incidentLocation}
            onChange={(e) => onChange('incidentLocation', e.target.value)}
            placeholder="請輸入詳細地點描述"
            style={{ marginTop: '8px' }}
          />
        </div>
      </div>

      <div className="form-field">
        <label>處理狀態</label>
        <select
          value={formData.processingStatus}
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
          <label>通知方式</label>
          <select
            value={formData.notificationMethod}
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
          <label>提醒日期時間</label>
          <input
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
          >
            <span className="btn-icon">📅</span>
            同步至 Google 行事曆
          </button>
          
          <button
            type="button"
            className={`action-btn notification-btn ${formData.sendNotification ? 'active' : ''}`}
            onClick={() => onChange('sendNotification', !formData.sendNotification)}
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
              checked={formData.multipleReminders}
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