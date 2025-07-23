// src/components/Case/CaseModal/CaseForm/FormSections.js - 修正版：解決案件內容顯示問題
import React, { useState, useEffect, useCallback } from 'react'
import CategoryAutoComplete from './CategoryAutoComplete'
import { GoogleCalendarService } from '../../../../services/googleCalendarService';

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

// 基本資訊區段 - 完整版
export const BasicInfoSection = ({ formData, dropdownOptions, onChange }) => {
  const safeOptions = ensureSafeOptions(dropdownOptions)

  return (
    <div className="form-section">
      <h3 className="section-title">基本資訊</h3>
      <div className="form-grid">
        
        {/* 第一行：案件編號 + 案件標題 */}
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

        {/* <div className="form-field">
          <label htmlFor="title">案件標題 <span className="required">*</span></label>
          <input
            id="title"
            type="text"
            value={formData.title || ''}
            onChange={(e) => onChange('title', e.target.value)}
            placeholder="請輸入案件標題"
            required
          />
        </div> */}

        {/* 第二行：案件類別 + 優先順序 */}
        {/* <div className="form-field">
          <label htmlFor="category">案件類別 <span className="required">*</span></label>
          <select
            id="category"
            value={formData.category || ''}
            onChange={(e) => onChange('category', e.target.value)}
            required
          >
            <option value="">請選擇案件類別</option>
            {safeOptions.categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div> */}

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

        {/* 第三行：處理狀態 + 聯絡方式 */}
        <div className="form-field">
          <label htmlFor="status">處理狀態 <span className="required">*</span></label>
          <select
            id="status"
            value={formData.status || 'pending'}
            onChange={(e) => onChange('status', e.target.value)}
            required
          >
            <option value="pending">待處理</option>
            <option value="processing">處理中</option>
            <option value="completed">已完成</option>
            {/* 🔧 移除以下兩個選項：
            <option value="resolved">已解決</option>
            <option value="closed">已結案</option>
            */}
          </select>
        </div>

        <div className="form-field">
          <label htmlFor="contactType">聯絡方式 <span className="required">*</span></label>
          <select
            id="contactType"
            value={formData.contactType || 'phone'}
            onChange={(e) => onChange('contactType', e.target.value)}
            required
          >
            <option value="phone">電話</option>
            <option value="email">電子郵件</option>
            <option value="line">LINE</option>
            <option value="facebook">Facebook</option>
            <option value="in_person">親自來訪</option>
            <option value="letter">書面陳情</option>
            <option value="other">其他</option>
          </select>
        </div>

        {/* 第四行：受理人員 + 承辦人員 */}
        <div className="form-field">
          <label htmlFor="receiver">受理人員 <span className="required">*</span></label>
          <select
            id="receiver"
            value={formData.receiver || ''}
            onChange={(e) => onChange('receiver', e.target.value)}
            required
          >
            <option value="">請選擇受理人員</option>
            {safeOptions.members.map((member) => (
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
            {safeOptions.members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </div>

        {/* 第五行：受理日期 + 受理時間 */}
        <div className="form-field">
          <label htmlFor="receivedDate">受理日期 <span className="required">*</span></label>
          <input
            id="receivedDate"
            type="date"
            value={formData.receivedDate || ''}
            onChange={(e) => onChange('receivedDate', e.target.value)}
            required
          />
        </div>

        <div className="form-field">
          <label htmlFor="receivedTime">受理時間 <span className="required">*</span></label>
          <input
            id="receivedTime"
            type="time"
            value={formData.receivedTime || ''}
            onChange={(e) => onChange('receivedTime', e.target.value)}
            required
          />
        </div>

        {/* 第六行：結案日期 + 結案時間 */}
        <div className="form-field">
          <label htmlFor="closedDate">結案日期</label>
          <input
            id="closedDate"
            type="date"
            value={formData.closedDate || ''}
            onChange={(e) => onChange('closedDate', e.target.value)}
          />
        </div>

        <div className="form-field">
          <label htmlFor="closedTime">結案時間</label>
          <input
            id="closedTime"
            type="time"
            value={formData.closedTime || ''}
            onChange={(e) => onChange('closedTime', e.target.value)}
          />
        </div>

        {/* 第七行：居住縣市 + 居住行政區 */}
        {/* <div className="form-field">
          <label htmlFor="homeCounty">居住縣市</label>
          <select
            id="homeCounty"
            value={formData.homeCounty || ''}
            onChange={(e) => onChange('homeCounty', e.target.value)}
          >
            <option value="">請選擇縣市</option>
            {safeOptions.counties.map((county) => (
              <option key={county.id} value={county.id}>
                {county.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-field">
          <label htmlFor="homeDistrict">居住行政區</label>
          <select
            id="homeDistrict"
            value={formData.homeDistrict || ''}
            onChange={(e) => onChange('homeDistrict', e.target.value)}
            disabled={!formData.homeCounty}
          >
            <option value="">請選擇行政區</option>
            {safeOptions.homeDistricts.map((district) => (
              <option key={district.id} value={district.id}>
                {district.name}
              </option>
            ))}
          </select>
        </div> */}

        {/* 第八行：居住地址（跨兩欄） */}
        {/* <div className="form-field full-width">
          <label htmlFor="homeAddress">居住地址</label>
          <input
            id="homeAddress"
            type="text"
            value={formData.homeAddress || ''}
            onChange={(e) => onChange('homeAddress', e.target.value)}
            placeholder="請輸入詳細地址"
          />
        </div> */}

        {/* 第九行：事發縣市 + 事發行政區 */}
        {/* <div className="form-field">
          <label htmlFor="incidentCounty">事發縣市</label>
          <select
            id="incidentCounty"
            value={formData.incidentCounty || ''}
            onChange={(e) => onChange('incidentCounty', e.target.value)}
          >
            <option value="">請選擇縣市</option>
            {safeOptions.counties.map((county) => (
              <option key={county.id} value={county.id}>
                {county.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-field">
          <label htmlFor="incidentDistrict">事發行政區</label>
          <select
            id="incidentDistrict"
            value={formData.incidentDistrict || ''}
            onChange={(e) => onChange('incidentDistrict', e.target.value)}
            disabled={!formData.incidentCounty}
          >
            <option value="">請選擇行政區</option>
            {safeOptions.incidentDistricts.map((district) => (
              <option key={district.id} value={district.id}>
                {district.name}
              </option>
            ))}
          </select>
        </div> */}

        {/* 第十行：事發地點（跨兩欄） */}
        {/* <div className="form-field full-width">
          <label htmlFor="incidentLocation">事發地點</label>
          <input
            id="incidentLocation"
            type="text"
            value={formData.incidentLocation || ''}
            onChange={(e) => onChange('incidentLocation', e.target.value)}
            placeholder="請輸入詳細事發地點"
          />
        </div> */}

      </div>
    </div>
  )
}

// 聯絡資訊區段
export const ContactInfoSection = ({ formData, onChange }) => (
  <div className="form-section">
    <h3 className="section-title">聯絡人資訊</h3>
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

  const handleDescriptionChange = useCallback((e) => {
    const value = e.target.value
    console.log('案件描述變更:', value)
    onChange('description', value)
  }, [onChange])

  const handleDescriptionBlur = useCallback((e) => {
    const value = e.target.value
    console.log('案件描述失去焦點，確保保存:', value)
    onChange('description', value)
  }, [onChange])

  // 處理案件類別變更 - 修正版
  const handleCategoryChange = useCallback((categoryValue) => {
    console.log('案件類別變更:', categoryValue)
    // 統一處理：直接傳遞類別值，讓後端統一處理
    onChange('category', categoryValue)
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

        {/* 修正：提供兩種類別選擇方式，確保至少有一種能正常工作 */}
        <div className="form-field full-width">
          <label htmlFor="category">案件分類 <span className="required">*</span></label>
          
          {/* 優先使用自動完成組件 */}
          {safeOptions.categories && safeOptions.categories.length > 0 ? (
            <CategoryAutoComplete
              formData={formData}
              categories={safeOptions.categories}
              onChange={handleCategoryChange}
              placeholder="請選擇或輸入案件分類"
              required
            />
          ) : (
            /* 備用：傳統下拉選單 */
            <select
              id="category"
              value={formData.category || ''}
              onChange={(e) => onChange('category', e.target.value)}
              required
            >
              <option value="">請選擇案件類別</option>
              <option value="traffic">交通問題</option>
              <option value="environment">環境問題</option>
              <option value="security">治安問題</option>
              <option value="public_service">民生服務</option>
              <option value="legal_consultation">法律諮詢</option>
            </select>
          )}
        </div>

        <div className="form-field full-width">
          <label htmlFor="description">案件描述 <span className="required">*</span></label>
          <textarea
            id="description"
            value={formData.description || ''}
            onChange={handleDescriptionChange}
            onBlur={handleDescriptionBlur}
            placeholder="請詳細描述案件內容、發生時間、地點等資訊"
            rows="6"
            required
          />
        </div>

        <div className="form-field full-width">
          <label htmlFor="incidentLocation">事發地點</label>
          <div className="location-group">
            <div className="location-selects">
              <select
                id="incidentCounty"
                value={formData.incidentCounty || ''}
                onChange={(e) => onChange('incidentCounty', e.target.value)}
              >
                <option value="">請選擇縣市</option>
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
              >
                <option value="">
                  {!formData.incidentCounty 
                    ? '請先選擇縣市' 
                    : safeOptions.incidentDistricts.length === 0 
                      ? '該縣市無可用區域'
                      : '請選擇區域'
                  }
                </option>
                {safeOptions.incidentDistricts.map(district => (
                  <option key={district.id || district.name || Math.random()} value={district.id}>
                    {district.name || '未命名區域'}
                  </option>
                ))}
              </select>
            </div>
            <input
              id="incidentAddress"
              type="text"
              value={formData.incidentAddress || ''}
              onChange={(e) => onChange('incidentAddress', e.target.value)}
              placeholder="請輸入詳細事發地點"
            />
          </div>
        </div>

      </div>
    </div>
  )
}

// 通知設定區段
export const NotificationSection = ({ formData, onChange }) => {
  const [isCreating, setIsCreating] = useState(false)
  const [googleAuthStatus, setGoogleAuthStatus] = useState({
    hasValidToken: false,
    needsReauth: false,
    checked: false
  })

  // 檢查 Google 授權狀態
  useEffect(() => {
    checkGoogleAuthStatus()
  }, [])

  const checkGoogleAuthStatus = async () => {
    try {
      const authStatus = await GoogleCalendarService.checkGoogleAuth()
      setGoogleAuthStatus({
        ...authStatus,
        checked: true
      })
    } catch (error) {
      console.error('檢查 Google 授權狀態失敗:', error)
      setGoogleAuthStatus({
        hasValidToken: false,
        needsReauth: true,
        checked: true
      })
    }
  }

  const handleNotificationToggle = (checked) => {
    onChange('shouldNotify', checked)
    if (!checked) {
      onChange('notificationDate', '')
      onChange('notificationTime', '')
    }
  }

  const handleCalendarToggle = (checked) => {
    onChange('shouldAddToCalendar', checked)
    if (!checked) {
      onChange('calendarDate', '')
      onChange('calendarTime', '')
    }
  }

  const handleCreateCalendarEvent = async () => {
    if (!formData.calendarDate || !formData.calendarTime) {
      alert('請先選擇日期和時間')
      return
    }

    if (!formData.title && !formData.description) {
      alert('請先填入案件標題或描述')
      return
    }

    setIsCreating(true)

    try {
      const result = await GoogleCalendarService.quickCreateCaseEvent(
        formData,
        formData.calendarDate,
        formData.calendarTime
      )

      if (result.success) {
        alert(`✅ 已成功加入 Google 行事曆！\n\n事件標題：${result.event.summary}\n事件時間：${formData.calendarDate} ${formData.calendarTime}`)
        
        if (result.event.htmlLink && window.confirm('是否要開啟 Google 日曆查看事件？')) {
          window.open(result.event.htmlLink, '_blank')
        }
        
      } else if (result.needsReauth) {
        const shouldReauth = window.confirm(
          'Google 日曆授權已過期，需要重新登入。\n\n點擊確定將重新登入以獲取權限。'
        )
        
        if (shouldReauth) {
          await GoogleCalendarService.handleAuthExpired()
        }
        
      } else {
        throw new Error(result.error || '建立日曆事件失敗')
      }

    } catch (error) {
      console.error('建立日曆事件失敗:', error)
      alert(`❌ 建立日曆事件失敗：${error.message}`)
    } finally {
      setIsCreating(false)
    }
  }

  const today = new Date().toISOString().split('T')[0]

  const getButtonState = () => {
    if (!formData.shouldAddToCalendar) return 'disabled'
    if (isCreating) return 'loading'
    if (!googleAuthStatus.checked) return 'checking'
    if (!googleAuthStatus.hasValidToken) return 'needsAuth'
    if (!formData.calendarDate || !formData.calendarTime) return 'disabled'
    return 'ready'
  }

  const buttonState = getButtonState()

  return (
    <div className="form-section">
      <h3 className="section-title">通知與行程</h3>
      
      {/* 一般通知區塊 */}
      <div className="notification-row">
        <div className="notification-toggle">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={formData.shouldNotify || false}
              onChange={(e) => handleNotificationToggle(e.target.checked)}
              className="toggle-checkbox"
            />
            <span className="toggle-text">設定提醒通知</span>
          </label>
        </div>
        
        {formData.shouldNotify && (
          <div className="notification-datetime">
            <input
              type="date"
              value={formData.notificationDate || ''}
              onChange={(e) => onChange('notificationDate', e.target.value)}
              className="datetime-input"
              min={today}
            />
            <input
              type="time"
              value={formData.notificationTime || ''}
              onChange={(e) => onChange('notificationTime', e.target.value)}
              className="datetime-input"
            />
          </div>
        )}

        <div className="notification-actions">
          <button
            type="button"
            className={`action-btn notification-btn ${
              formData.shouldNotify && formData.notificationDate && formData.notificationTime 
                ? 'active' : ''
            }`}
            disabled={!formData.shouldNotify}
          >
            📱 建立通知
          </button>
        </div>
      </div>

      {/* Google 行事曆區塊 */}
      <div className="notification-row">
        <div className="notification-toggle">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={formData.shouldAddToCalendar || false}
              onChange={(e) => handleCalendarToggle(e.target.checked)}
              className="toggle-checkbox"
            />
            <span className="toggle-text">同步至 Google 行事曆</span>
          </label>
        </div>
        
        {formData.shouldAddToCalendar && (
          <div className="notification-datetime">
            <input
              type="date"
              value={formData.calendarDate || ''}
              onChange={(e) => onChange('calendarDate', e.target.value)}
              className="datetime-input"
              min={today}
              required
            />
            <input
              type="time"
              value={formData.calendarTime || ''}
              onChange={(e) => onChange('calendarTime', e.target.value)}
              className="datetime-input"
              required
            />
          </div>
        )}

        <div className="notification-actions">
          {googleAuthStatus.checked && !googleAuthStatus.hasValidToken && (
            <div className="auth-status-indicator warning">
              <span className="status-dot"></span>
              <span className="status-text">需要重新授權</span>
            </div>
          )}

          <button
            type="button"
            className={`action-btn calendar-btn ${
              buttonState === 'ready' ? 'active' : ''
            }`}
            disabled={buttonState === 'disabled' || buttonState === 'loading' || buttonState === 'checking'}
            onClick={handleCreateCalendarEvent}
          >
            {buttonState === 'loading' ? (
              <>
                <span className="loading-spinner"></span>
                建立中...
              </>
            ) : buttonState === 'checking' ? (
              <>
                <span className="loading-spinner"></span>
                檢查授權中...
              </>
            ) : buttonState === 'needsAuth' ? (
              <>
                🔗 需要重新授權
              </>
            ) : (
              <>
                📅 加入 Google 行事曆
              </>
            )}
          </button>
        </div>
      </div>

      {/* 狀態說明 */}
      {formData.shouldAddToCalendar && googleAuthStatus.checked && (
        <div className="calendar-status-info">
          {!googleAuthStatus.hasValidToken ? (
            <p className="status-warning">
              ⚠️ Google 日曆授權可能已過期，點擊按鈕時將引導您重新授權
            </p>
          ) : (
            <p className="status-info">
              💡 填入日期時間後即可建立 Google 行事曆事件
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export const CalendarNotificationSection = ({ formData, onChange }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [googleAuthStatus, setGoogleAuthStatus] = useState({
    hasValidToken: false,
    needsReauth: false,
    checked: false
  });

  // 檢查 Google 授權狀態
  useEffect(() => {
    checkGoogleAuthStatus();
  }, []);

  const checkGoogleAuthStatus = async () => {
    try {
      const authStatus = await GoogleCalendarService.checkGoogleAuth();
      setGoogleAuthStatus({
        ...authStatus,
        checked: true
      });
    } catch (error) {
      console.error('檢查 Google 授權狀態失敗:', error);
      setGoogleAuthStatus({
        hasValidToken: false,
        needsReauth: true,
        checked: true
      });
    }
  };

  const handleCalendarToggle = (checked) => {
    onChange('shouldAddToCalendar', checked);
    if (!checked) {
      onChange('calendarDate', '');
      onChange('calendarTime', '');
    }
  };

  const handleCalendarDateChange = (value) => {
    onChange('calendarDate', value);
  };

  const handleCalendarTimeChange = (value) => {
    onChange('calendarTime', value);
  };

  const handleCreateCalendarEvent = async () => {
    // 驗證必要欄位
    if (!formData.calendarDate || !formData.calendarTime) {
      alert('請先選擇日期和時間');
      return;
    }

    if (!formData.title && !formData.description) {
      alert('請先填入案件標題或描述');
      return;
    }

    setIsCreating(true);

    try {
      // 使用服務層建立事件
      const result = await GoogleCalendarService.quickCreateCaseEvent(
        formData,
        formData.calendarDate,
        formData.calendarTime
      );

      if (result.success) {
        alert(`✅ 已成功加入 Google 行事曆！\n\n事件標題：${result.event.summary}\n事件時間：${formData.calendarDate} ${formData.calendarTime}`);
        
        // 可選：開啟 Google Calendar 查看事件
        if (result.event.htmlLink && window.confirm('是否要開啟 Google 日曆查看事件？')) {
          window.open(result.event.htmlLink, '_blank');
        }
        
      } else if (result.needsReauth) {
        // 處理授權過期
        const shouldReauth = window.confirm(
          'Google 日曆授權已過期，需要重新登入。\n\n點擊確定將重新登入以獲取權限。'
        );
        
        if (shouldReauth) {
          await GoogleCalendarService.handleAuthExpired();
        }
        
      } else {
        throw new Error(result.error || '建立日曆事件失敗');
      }

    } catch (error) {
      console.error('建立日曆事件失敗:', error);
      alert(`❌ 建立日曆事件失敗：${error.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  // 取得今天的日期作為最小值
  const today = new Date().toISOString().split('T')[0];

  // 確定按鈕狀態
  const getButtonState = () => {
    if (!formData.shouldAddToCalendar) return 'disabled';
    if (isCreating) return 'loading';
    if (!googleAuthStatus.checked) return 'checking';
    if (!googleAuthStatus.hasValidToken) return 'needsAuth';
    if (!formData.calendarDate || !formData.calendarTime) return 'disabled';
    return 'ready';
  };

  const buttonState = getButtonState();

  return (
    <div className="notification-section">
      <h4>📅 Google 行事曆整合</h4>
      
      {/* Google 行事曆同步區塊 */}
      <div className="notification-row">
        <div className="notification-toggle">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={formData.shouldAddToCalendar || false}
              onChange={(e) => handleCalendarToggle(e.target.checked)}
              className="toggle-checkbox"
            />
            <span className="toggle-text">同步至 Google 行事曆</span>
          </label>
        </div>
        
        {formData.shouldAddToCalendar && (
          <div className="notification-datetime">
            <input
              type="date"
              value={formData.calendarDate || ''}
              onChange={(e) => handleCalendarDateChange(e.target.value)}
              className="datetime-input"
              min={today}
              required
            />
            <input
              type="time"
              value={formData.calendarTime || ''}
              onChange={(e) => handleCalendarTimeChange(e.target.value)}
              className="datetime-input"
              required
            />
          </div>
        )}

        <div className="notification-actions">
          {/* Google 授權狀態指示器 */}
          {googleAuthStatus.checked && !googleAuthStatus.hasValidToken && (
            <div className="auth-status-indicator warning">
              <span className="status-dot"></span>
              <span className="status-text">需要重新授權</span>
            </div>
          )}

          {/* 主要操作按鈕 */}
          <button
            type="button"
            className={`action-btn calendar-btn ${
              buttonState === 'ready' ? 'active' : ''
            }`}
            disabled={buttonState === 'disabled' || buttonState === 'loading' || buttonState === 'checking'}
            onClick={handleCreateCalendarEvent}
          >
            {buttonState === 'loading' ? (
              <>
                <span className="loading-spinner"></span>
                建立中...
              </>
            ) : buttonState === 'checking' ? (
              <>
                <span className="loading-spinner"></span>
                檢查授權中...
              </>
            ) : buttonState === 'needsAuth' ? (
              <>
                🔗 需要重新授權
              </>
            ) : (
              <>
                📅 加入 Google 行事曆
              </>
            )}
          </button>
        </div>
      </div>

      {/* 狀態說明 */}
      {formData.shouldAddToCalendar && googleAuthStatus.checked && (
        <div className="calendar-status-info">
          {!googleAuthStatus.hasValidToken ? (
            <p className="status-warning">
              ⚠️ Google 日曆授權可能已過期，點擊按鈕時將引導您重新授權
            </p>
          ) : (
            <p className="status-info">
              💡 填入日期時間後即可建立 Google 行事曆事件
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default CalendarNotificationSection;