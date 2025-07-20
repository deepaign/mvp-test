// 更新後的 Google Calendar 前端服務層
// 檔案位置: src/services/googleCalendarService.js

import { supabase } from '../supabase';

export class GoogleCalendarService {
  static baseUrl = process.env.REACT_APP_GOOGLE_CALENDAR_API || 
                  `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/google-calendar`;

  // ============================================================================
  // 取得授權標頭和 provider_token
  // ============================================================================
  static async getAuthAndProviderToken() {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('使用者未登入');
    }

    if (!session?.provider_token) {
      throw new Error('沒有找到 Google provider token，請重新登入');
    }

    return {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      },
      providerToken: session.provider_token
    };
  }

  // ============================================================================
  // 檢查 Google 授權狀態 - 更新版
  // ============================================================================
  static async checkGoogleAuth() {
    try {
      const { headers, providerToken } = await this.getAuthAndProviderToken();
      
      const params = new URLSearchParams({
        provider_token: providerToken
      });

      const response = await fetch(`${this.baseUrl}/check-auth?${params}`, {
        method: 'GET',
        headers
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || '檢查授權狀態失敗');
      }

      return {
        hasValidToken: result.hasValidToken,
        needsReauth: result.needsReauth,
        error: result.error
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
  // 建立 Google Calendar 事件 - 更新版
  // ============================================================================
  static async createCalendarEvent(eventData) {
    try {
      const { headers, providerToken } = await this.getAuthAndProviderToken();
      
      // 前端驗證必要欄位
      if (!eventData.summary || !eventData.start?.dateTime || !eventData.end?.dateTime) {
        throw new Error('缺少必要欄位：標題、開始時間、結束時間');
      }

      // 確保時間格式正確
      const formattedEventData = {
        ...eventData,
        start: {
          dateTime: eventData.start.dateTime,
          timeZone: eventData.start.timeZone || 'Asia/Taipei'
        },
        end: {
          dateTime: eventData.end.dateTime,
          timeZone: eventData.end.timeZone || 'Asia/Taipei'
        }
      };

      const requestBody = {
        eventData: formattedEventData,
        providerToken: providerToken
      };

      console.log('發送請求到 Edge Function:', {
        url: `${this.baseUrl}/create-event`,
        body: { ...requestBody, providerToken: 'hidden' }
      });

      const response = await fetch(`${this.baseUrl}/create-event`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      });

      const result = await response.json();
      
      if (!response.ok) {
        // 處理需要重新授權的情況
        if (result.code === 'REAUTH_REQUIRED') {
          return {
            success: false,
            needsReauth: true,
            message: '需要重新授權 Google 帳號才能建立行事曆事件'
          };
        }
        
        throw new Error(result.message || '建立事件失敗');
      }

      return {
        success: true,
        event: result.event,
        message: '事件建立成功'
      };

    } catch (error) {
      console.error('建立 Google Calendar 事件失敗:', error);
      return {
        success: false,
        error: error.message,
        needsReauth: error.message?.includes('授權') || error.message?.includes('token')
      };
    }
  }

  // ============================================================================
  // 一鍵建立事件的便利方法 - 更新版
  // ============================================================================
  static async quickCreateEvent({
    title,
    description = '',
    startTime,
    endTime,
    location = '',
    caseId = null,
    reminderMinutes = 30
  }) {
    try {
      // 先驗證時間格式
      this.validateEventTime(startTime, endTime);
      
      // 檢查授權狀態
      const authStatus = await this.checkGoogleAuth();
      
      if (!authStatus.hasValidToken) {
        if (authStatus.needsReauth) {
          return {
            success: false,
            needsReauth: true,
            message: '請先重新授權 Google 帳號'
          };
        }
        
        throw new Error('無法取得 Google 授權');
      }

      // 建立事件資料
      const eventData = {
        summary: title,
        description,
        start: {
          dateTime: this.formatDateTimeForCalendar(startTime),
          timeZone: 'Asia/Taipei'
        },
        end: {
          dateTime: this.formatDateTimeForCalendar(endTime),
          timeZone: 'Asia/Taipei'
        },
        location,
        caseId,
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: reminderMinutes }
          ]
        }
      };

      return await this.createCalendarEvent(eventData);

    } catch (error) {
      console.error('快速建立事件失敗:', error);
      return {
        success: false,
        error: error.message,
        needsReauth: true
      };
    }
  }

  // ============================================================================
  // 輔助方法：格式化時間為 ISO 字串
  // ============================================================================
  static formatDateTimeForCalendar(dateTime) {
    try {
      // 如果已經是 ISO 字串，直接返回
      if (typeof dateTime === 'string' && dateTime.includes('T')) {
        return dateTime;
      }
      
      // 處理 Date 物件
      if (dateTime instanceof Date) {
        return dateTime.toISOString();
      }
      
      // 處理字串格式
      const parsed = new Date(dateTime);
      
      // 確保時間是有效的
      if (isNaN(parsed.getTime())) {
        throw new Error('無效的日期時間格式');
      }
      
      return parsed.toISOString();
    } catch (error) {
      console.error('格式化日期時間失敗:', error);
      throw new Error('日期時間格式錯誤');
    }
  }

  // ============================================================================
  // 輔助方法：檢查事件時間是否合理
  // ============================================================================
  static validateEventTime(startTime, endTime) {
    try {
      const start = new Date(startTime);
      const end = new Date(endTime);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new Error('無效的時間格式');
      }
      
      if (start >= end) {
        throw new Error('開始時間必須早於結束時間');
      }
      
      // 檢查是否是過去的時間（允許今天的事件）
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (start < today) {
        throw new Error('不能建立過去日期的事件');
      }
      
      // 檢查時間跨度是否合理（最長 24 小時）
      const duration = end.getTime() - start.getTime();
      const maxDuration = 24 * 60 * 60 * 1000; // 24 小時
      
      if (duration > maxDuration) {
        throw new Error('事件持續時間不能超過 24 小時');
      }
      
      return true;
    } catch (error) {
      throw error;
    }
  }

  // ============================================================================
  // 輔助方法：重新授權 Google 帳號
  // ============================================================================
  static async reauthorizeGoogle() {
    try {
      console.log('開始重新授權 Google 帳號...');
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          scopes: 'openid email profile https://www.googleapis.com/auth/calendar',
          queryParams: {
            prompt: 'consent', // 強制顯示同意畫面
            access_type: 'offline' // 取得 refresh_token
          }
        }
      });

      if (error) {
        console.error('重新授權失敗:', error);
        throw error;
      }

      console.log('重新授權成功，等待重定向...');
      return { success: true };

    } catch (error) {
      console.error('重新授權 Google 帳號失敗:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}