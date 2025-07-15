// ============================================================================
// Google Calendar 前端服務層
// 檔案位置: src/services/googleCalendarService.js
// ============================================================================

import { supabase } from '../supabase';

export class GoogleCalendarService {
  static baseUrl = `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/google-calendar`;

  // ============================================================================
  // 取得授權標頭
  // ============================================================================
  static async getAuthHeaders() {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('使用者未登入');
    }

    return {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json'
    };
  }

  // ============================================================================
  // 檢查 Google 授權狀態
  // ============================================================================
  static async checkGoogleAuth() {
    try {
      const headers = await this.getAuthHeaders();
      
      const response = await fetch(`${this.baseUrl}/check-auth`, {
        method: 'GET',
        headers
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || '檢查授權狀態失敗');
      }

      return {
        hasValidToken: result.hasValidToken,
        needsReauth: result.needsReauth
      };

    } catch (error) {
      console.error('檢查 Google 授權狀態失敗:', error);
      return {
        hasValidToken: false,
        needsReauth: true,
        error: error.message
      };
    }
  }

  // ============================================================================
  // 建立 Google Calendar 事件
  // ============================================================================
  static async createCalendarEvent(eventData) {
    try {
      const headers = await this.getAuthHeaders();
      
      // 驗證必要欄位
      if (!eventData.summary || !eventData.start?.dateTime || !eventData.end?.dateTime) {
        throw new Error('缺少必要欄位：標題、開始時間、結束時間');
      }

      const response = await fetch(`${this.baseUrl}/create-event`, {
        method: 'POST',
        headers,
        body: JSON.stringify(eventData)
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || '建立日曆事件失敗');
      }

      return {
        success: true,
        event: result.event
      };

    } catch (error) {
      console.error('建立 Google Calendar 事件失敗:', error);
      
      // 特殊處理授權過期的情況
      if (error.message.includes('授權已過期') || error.message.includes('重新登入')) {
        return {
          success: false,
          needsReauth: true,
          error: error.message
        };
      }

      return {
        success: false,
        error: error.message
      };
    }
  }

  // ============================================================================
  // 更新 Google Calendar 事件
  // ============================================================================
  static async updateCalendarEvent(eventId, updateData) {
    try {
      const headers = await this.getAuthHeaders();
      
      if (!eventId) {
        throw new Error('缺少事件 ID');
      }

      const response = await fetch(`${this.baseUrl}/update-event`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          eventId,
          ...updateData
        })
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || '更新日曆事件失敗');
      }

      return {
        success: true,
        event: result.event
      };

    } catch (error) {
      console.error('更新 Google Calendar 事件失敗:', error);
      
      if (error.message.includes('授權已過期') || error.message.includes('重新登入')) {
        return {
          success: false,
          needsReauth: true,
          error: error.message
        };
      }

      return {
        success: false,
        error: error.message
      };
    }
  }

  // ============================================================================
  // 刪除 Google Calendar 事件
  // ============================================================================
  static async deleteCalendarEvent(eventId, caseId = null) {
    try {
      const headers = await this.getAuthHeaders();
      
      if (!eventId) {
        throw new Error('缺少事件 ID');
      }

      const response = await fetch(`${this.baseUrl}/delete-event`, {
        method: 'DELETE',
        headers,
        body: JSON.stringify({
          eventId,
          caseId
        })
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || '刪除日曆事件失敗');
      }

      return {
        success: true,
        message: result.message
      };

    } catch (error) {
      console.error('刪除 Google Calendar 事件失敗:', error);
      
      if (error.message.includes('授權已過期') || error.message.includes('重新登入')) {
        return {
          success: false,
          needsReauth: true,
          error: error.message
        };
      }

      return {
        success: false,
        error: error.message
      };
    }
  }

  // ============================================================================
  // 從案件資料建立事件資料
  // ============================================================================
  static formatCaseToCalendarEvent(caseData, calendarDate, calendarTime, duration = 60) {
    // 建立開始時間
    const startDateTime = new Date(`${calendarDate}T${calendarTime}:00`);
    
    // 建立結束時間（預設 1 小時後）
    const endDateTime = new Date(startDateTime.getTime() + duration * 60 * 1000);

    // 格式化描述
    const description = this.formatEventDescription(caseData);

    return {
      summary: `案件處理 - ${caseData.title || '新案件'}`,
      description,
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: 'Asia/Taipei'
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: 'Asia/Taipei'
      },
      location: caseData.incidentLocation || caseData.contactAddress || '',
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 30 },
          { method: 'email', minutes: 60 }
        ]
      },
      // 加入案件 ID 以便後續關聯
      caseId: caseData.id
    };
  }

  // ============================================================================
  // 格式化事件描述
  // ============================================================================
  static formatEventDescription(caseData) {
    const sections = [];

    // 基本資訊
    sections.push('📋 案件基本資訊');
    sections.push(`案件編號: ${caseData.caseNumber || 'AUTO'}`);
    sections.push(`案件類型: ${caseData.category || '未分類'}`);
    sections.push(`優先順序: ${this.getPriorityText(caseData.priority)}`);
    sections.push(`狀態: ${this.getStatusText(caseData.status)}`);
    sections.push('');

    // 聯絡資訊
    if (caseData.contactName || caseData.contactPhone || caseData.contactEmail) {
      sections.push('👤 聲請人資訊');
      if (caseData.contactName) sections.push(`姓名: ${caseData.contactName}`);
      if (caseData.contactPhone) sections.push(`電話: ${caseData.contactPhone}`);
      if (caseData.contactEmail) sections.push(`信箱: ${caseData.contactEmail}`);
      sections.push('');
    }

    // 案件描述
    if (caseData.description) {
      sections.push('📝 案件描述');
      sections.push(caseData.description);
      sections.push('');
    }

    // 事發地點
    if (caseData.incidentLocation) {
      sections.push('📍 事發地點');
      sections.push(caseData.incidentLocation);
      sections.push('');
    }

    // 系統標記
    sections.push('---');
    sections.push('此事件由 Polify 案件管理系統自動建立');
    
    return sections.join('\n');
  }

  // ============================================================================
  // 輔助函數：取得優先順序文字
  // ============================================================================
  static getPriorityText(priority) {
    const priorityMap = {
      'urgent': '🔴 緊急',
      'normal': '🟡 一般',
      'low': '🟢 低'
    };
    return priorityMap[priority] || '一般';
  }

  // ============================================================================
  // 輔助函數：取得狀態文字
  // ============================================================================
  static getStatusText(status) {
    const statusMap = {
      'pending': '⏳ 待處理',
      'processing': '🔄 處理中',
      'completed': '✅ 已完成',
      'closed': '🔒 已結案'
    };
    return statusMap[status] || '待處理';
  }

  // ============================================================================
  // 處理授權過期，引導重新登入
  // ============================================================================
  static async handleAuthExpired() {
    try {
      // 可以顯示一個確認對話框
      const shouldReauth = window.confirm(
        'Google 日曆授權已過期，需要重新登入以繼續使用此功能。\n\n點擊確定將導向登入頁面。'
      );

      if (shouldReauth) {
        // 清除當前 session 並重新導向登入
        await supabase.auth.signOut();
        // 重新載入頁面會自動導向登入頁面
        window.location.reload();
      }

      return false;
    } catch (error) {
      console.error('處理授權過期失敗:', error);
      return false;
    }
  }

  // ============================================================================
  // 快速建立案件相關的日曆事件（一鍵加入功能）
  // ============================================================================
  static async quickCreateCaseEvent(caseData, calendarDate, calendarTime) {
    try {
      // 首先檢查授權狀態
      const authStatus = await this.checkGoogleAuth();
      
      if (!authStatus.hasValidToken) {
        return {
          success: false,
          needsReauth: true,
          error: 'Google 日曆授權已過期，請重新登入'
        };
      }

      // 建立事件資料
      const eventData = this.formatCaseToCalendarEvent(caseData, calendarDate, calendarTime);
      
      // 建立事件
      const result = await this.createCalendarEvent(eventData);
      
      if (result.success) {
        console.log('Google Calendar 事件建立成功:', result.event);
        
        // 可選：更新本地案件資料
        if (caseData.id && result.event) {
          await this.updateCaseCalendarInfo(caseData.id, result.event);
        }
      }

      return result;

    } catch (error) {
      console.error('快速建立日曆事件失敗:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ============================================================================
  // 更新案件的日曆資訊
  // ============================================================================
  static async updateCaseCalendarInfo(caseId, calendarEvent) {
    try {
      const { error } = await supabase
        .from('cases')
        .update({
          google_calendar_event_id: calendarEvent.id,
          google_calendar_event_link: calendarEvent.htmlLink,
          updated_at: new Date().toISOString()
        })
        .eq('id', caseId);

      if (error) {
        console.error('更新案件日曆資訊失敗:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('更新案件日曆資訊時發生錯誤:', error);
      return false;
    }
  }

  // ============================================================================
  // 批次處理多個事件
  // ============================================================================
  static async batchCreateEvents(eventsData) {
    const results = [];
    
    for (const eventData of eventsData) {
      try {
        const result = await this.createCalendarEvent(eventData);
        results.push({
          ...result,
          originalData: eventData
        });
        
        // 避免 API 頻率限制，每次請求間隔 100ms
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        results.push({
          success: false,
          error: error.message,
          originalData: eventData
        });
      }
    }

    return results;
  }
}