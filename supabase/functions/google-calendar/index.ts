// ============================================================================
// 1. Supabase Edge Function: Google Calendar 事件管理
// 檔案位置: supabase/functions/google-calendar/index.ts
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

serve(async (req) => {
  // 處理 CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 驗證使用者授權
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ message: 'Missing Authorization header' }), { 
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ message: 'Invalid token' }), { 
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 路由處理
    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();

    switch (req.method) {
      case 'POST':
        if (path === 'create-event') {
          return await createCalendarEvent(req, supabase, user);
        }
        break;
      
      case 'PUT':
        if (path === 'update-event') {
          return await updateCalendarEvent(req, supabase, user);
        }
        break;
      
      case 'DELETE':
        if (path === 'delete-event') {
          return await deleteCalendarEvent(req, supabase, user);
        }
        break;
      
      case 'GET':
        if (path === 'check-auth') {
          return await checkGoogleAuth(supabase, user);
        }
        break;
    }

    return new Response(JSON.stringify({ message: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Server error:', error);
    return new Response(JSON.stringify({ 
      message: 'Internal server error',
      error: error.message 
    }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// ============================================================================
// 建立 Google Calendar 事件
// ============================================================================
async function createCalendarEvent(req: Request, supabase: any, user: any) {
  try {
    const eventData = await req.json();
    
    // 驗證必要欄位
    if (!eventData.summary || !eventData.start?.dateTime || !eventData.end?.dateTime) {
      return new Response(JSON.stringify({ 
        message: '缺少必要欄位：summary, start.dateTime, end.dateTime' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 取得使用者的 Google Access Token
    const googleToken = await getGoogleAccessToken(supabase, user.id);
    if (!googleToken) {
      return new Response(JSON.stringify({ 
        message: 'Google 授權已過期，請重新登入' 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 準備 Google Calendar API 請求
    const calendarEvent = {
      summary: eventData.summary,
      description: eventData.description || '',
      start: {
        dateTime: eventData.start.dateTime,
        timeZone: eventData.start.timeZone || 'Asia/Taipei',
      },
      end: {
        dateTime: eventData.end.dateTime,
        timeZone: eventData.end.timeZone || 'Asia/Taipei',
      },
      location: eventData.location || '',
      reminders: eventData.reminders || {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 30 }
        ],
      },
    };

    // 呼叫 Google Calendar API
    const calendarResponse = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${googleToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(calendarEvent),
      }
    );

    if (!calendarResponse.ok) {
      const errorText = await calendarResponse.text();
      console.error('Google Calendar API 錯誤:', errorText);
      
      // 檢查是否是授權問題
      if (calendarResponse.status === 401) {
        // 嘗試刷新 token
        const refreshedToken = await refreshGoogleToken(supabase, user.id);
        if (refreshedToken) {
          // 重試請求
          return await retryCreateEvent(calendarEvent, refreshedToken);
        }
        
        return new Response(JSON.stringify({ 
          message: 'Google 授權已過期，請重新登入' 
        }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      return new Response(JSON.stringify({ 
        message: '建立 Google Calendar 事件失敗',
        error: errorText 
      }), {
        status: calendarResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const createdEvent = await calendarResponse.json();

    // 可選：將事件 ID 儲存到案件資料中
    if (eventData.caseId) {
      await supabase
        .from('cases')
        .update({
          google_calendar_event_id: createdEvent.id,
          google_calendar_event_link: createdEvent.htmlLink,
          updated_at: new Date().toISOString()
        })
        .eq('id', eventData.caseId)
        .eq('user_id', user.id);
    }

    return new Response(JSON.stringify({
      success: true,
      event: {
        id: createdEvent.id,
        htmlLink: createdEvent.htmlLink,
        summary: createdEvent.summary,
        start: createdEvent.start,
        end: createdEvent.end,
        status: createdEvent.status
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('建立事件失敗:', error);
    return new Response(JSON.stringify({ 
      message: '建立事件時發生錯誤',
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// ============================================================================
// 更新 Google Calendar 事件
// ============================================================================
async function updateCalendarEvent(req: Request, supabase: any, user: any) {
  try {
    const { eventId, ...updateData } = await req.json();
    
    if (!eventId) {
      return new Response(JSON.stringify({ 
        message: '缺少事件 ID' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const googleToken = await getGoogleAccessToken(supabase, user.id);
    if (!googleToken) {
      return new Response(JSON.stringify({ 
        message: 'Google 授權已過期，請重新登入' 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const calendarResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${googleToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      }
    );

    if (!calendarResponse.ok) {
      const errorText = await calendarResponse.text();
      console.error('更新 Google Calendar 事件失敗:', errorText);
      
      return new Response(JSON.stringify({ 
        message: '更新事件失敗',
        error: errorText 
      }), {
        status: calendarResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const updatedEvent = await calendarResponse.json();

    return new Response(JSON.stringify({
      success: true,
      event: {
        id: updatedEvent.id,
        htmlLink: updatedEvent.htmlLink,
        summary: updatedEvent.summary,
        start: updatedEvent.start,
        end: updatedEvent.end
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('更新事件失敗:', error);
    return new Response(JSON.stringify({ 
      message: '更新事件時發生錯誤',
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// ============================================================================
// 刪除 Google Calendar 事件
// ============================================================================
async function deleteCalendarEvent(req: Request, supabase: any, user: any) {
  try {
    const { eventId, caseId } = await req.json();
    
    if (!eventId) {
      return new Response(JSON.stringify({ 
        message: '缺少事件 ID' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const googleToken = await getGoogleAccessToken(supabase, user.id);
    if (!googleToken) {
      return new Response(JSON.stringify({ 
        message: 'Google 授權已過期，請重新登入' 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const calendarResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${googleToken}`,
        },
      }
    );

    if (!calendarResponse.ok && calendarResponse.status !== 404) {
      const errorText = await calendarResponse.text();
      console.error('刪除 Google Calendar 事件失敗:', errorText);
      
      return new Response(JSON.stringify({ 
        message: '刪除事件失敗',
        error: errorText 
      }), {
        status: calendarResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 清除案件中的事件 ID
    if (caseId) {
      await supabase
        .from('cases')
        .update({
          google_calendar_event_id: null,
          google_calendar_event_link: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', caseId)
        .eq('user_id', user.id);
    }

    return new Response(JSON.stringify({
      success: true,
      message: '事件已成功刪除'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('刪除事件失敗:', error);
    return new Response(JSON.stringify({ 
      message: '刪除事件時發生錯誤',
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// ============================================================================
// 檢查 Google 授權狀態
// ============================================================================
async function checkGoogleAuth(supabase: any, user: any) {
  try {
    const token = await getGoogleAccessToken(supabase, user.id);
    
    return new Response(JSON.stringify({
      hasValidToken: !!token,
      needsReauth: !token
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('檢查授權狀態失敗:', error);
    return new Response(JSON.stringify({ 
      hasValidToken: false,
      needsReauth: true,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// ============================================================================
// 輔助函數：取得 Google Access Token
// ============================================================================
async function getGoogleAccessToken(supabase: any, userId: string): Promise<string | null> {
  try {
    // 方法1: 從當前 session 取得
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.provider_token) {
      // 驗證 token 是否有效
      const isValid = await validateGoogleToken(session.provider_token);
      if (isValid) {
        return session.provider_token;
      }
    }

    // 方法2: 從 Supabase 的 identities 表中取得 refresh token 並刷新
    const { data: identities } = await supabase
      .from('auth.identities')
      .select('identity_data')
      .eq('user_id', userId)
      .eq('provider', 'google')
      .single();

    if (identities?.identity_data?.refresh_token) {
      return await refreshGoogleToken(supabase, userId, identities.identity_data.refresh_token);
    }

    return null;
  } catch (error) {
    console.error('取得 Google token 失敗:', error);
    return null;
  }
}

// ============================================================================
// 輔助函數：驗證 Google Token
// ============================================================================
async function validateGoogleToken(token: string): Promise<boolean> {
  try {
    const response = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${token}`);
    return response.ok;
  } catch (error) {
    console.error('驗證 Google token 失敗:', error);
    return false;
  }
}

// ============================================================================
// 輔助函數：刷新 Google Token
// ============================================================================
async function refreshGoogleToken(supabase: any, userId: string, refreshToken?: string): Promise<string | null> {
  try {
    if (!refreshToken) {
      // 如果沒有提供 refresh token，嘗試從資料庫取得
      const { data: identities } = await supabase
        .from('auth.identities')
        .select('identity_data')
        .eq('user_id', userId)
        .eq('provider', 'google')
        .single();

      refreshToken = identities?.identity_data?.refresh_token;
    }

    if (!refreshToken) {
      console.log('找不到 refresh token');
      return null;
    }

    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      console.error('缺少 Google OAuth 設定');
      return null;
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('刷新 Google token 失敗:', errorText);
      return null;
    }

    const data = await response.json();
    return data.access_token;

  } catch (error) {
    console.error('刷新 Google token 過程失敗:', error);
    return null;
  }
}

// ============================================================================
// 輔助函數：重試建立事件（當 token 刷新後）
// ============================================================================
async function retryCreateEvent(calendarEvent: any, accessToken: string) {
  try {
    const calendarResponse = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(calendarEvent),
      }
    );

    if (!calendarResponse.ok) {
      throw new Error('重試建立事件失敗');
    }

    const createdEvent = await calendarResponse.json();

    return new Response(JSON.stringify({
      success: true,
      event: {
        id: createdEvent.id,
        htmlLink: createdEvent.htmlLink,
        summary: createdEvent.summary,
        start: createdEvent.start,
        end: createdEvent.end,
        status: createdEvent.status
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('重試建立事件失敗:', error);
    return new Response(JSON.stringify({ 
      message: '建立事件失敗，請重新登入' 
    }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}