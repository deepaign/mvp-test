// 簡化的 Google Calendar Edge Function
// 檔案位置: supabase/functions/google-calendar/index.ts

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
      return new Response(JSON.stringify({ 
        message: 'Missing Authorization header',
        code: 'MISSING_AUTH' 
      }), { 
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ 
        message: 'Invalid token',
        code: 'INVALID_TOKEN' 
      }), { 
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 路由處理
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/');
    const action = pathSegments[pathSegments.length - 1];

    console.log('收到請求:', req.method, action);

    switch (req.method) {
      case 'POST':
        if (action === 'create-event') {
          return await createCalendarEvent(req, user);
        }
        break;
      
      case 'GET':
        if (action === 'check-auth') {
          return await checkGoogleAuth(req, user);
        }
        break;
    }

    return new Response(JSON.stringify({ 
      message: 'Method not allowed',
      code: 'METHOD_NOT_ALLOWED' 
    }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Server error:', error);
    return new Response(JSON.stringify({ 
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
      error: error.message 
    }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// ============================================================================
// 檢查 Google 授權狀態
// ============================================================================
async function checkGoogleAuth(req: Request, user: any) {
  try {
    console.log('🔍 檢查 Google 授權狀態...');
    console.log('User ID:', user.id);

    // 從請求中取得 provider_token
    const url = new URL(req.url);
    const providerToken = url.searchParams.get('provider_token');

    if (!providerToken) {
      console.log('❌ 沒有提供 provider_token');
      return new Response(JSON.stringify({
        hasValidToken: false,
        needsReauth: true,
        error: 'No provider token provided'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ 收到 provider_token');

    // 驗證 Google token
    const isValid = await validateGoogleToken(providerToken);
    
    return new Response(JSON.stringify({
      hasValidToken: isValid,
      needsReauth: !isValid,
      error: isValid ? null : 'Token validation failed'
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
// 建立 Google Calendar 事件
// ============================================================================
async function createCalendarEvent(req: Request, user: any) {
  try {
    console.log('🔍 開始建立 Google Calendar 事件...');
    console.log('User ID:', user.id);
    
    const requestBody = await req.json();
    console.log('請求內容:', requestBody);

    const { eventData, providerToken } = requestBody;

    // 驗證必要參數
    if (!providerToken) {
      console.log('❌ 沒有提供 provider_token');
      return new Response(JSON.stringify({ 
        message: '缺少 provider_token',
        code: 'MISSING_PROVIDER_TOKEN'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!eventData || !eventData.summary || !eventData.start?.dateTime || !eventData.end?.dateTime) {
      console.log('❌ 缺少必要的事件資料');
      return new Response(JSON.stringify({ 
        message: '缺少必要欄位：summary, start.dateTime, end.dateTime',
        code: 'MISSING_FIELDS'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ 驗證通過，準備建立事件');

    // 驗證 Google token
    const isValidToken = await validateGoogleToken(providerToken);
    if (!isValidToken) {
      console.log('❌ Provider token 無效');
      return new Response(JSON.stringify({ 
        message: 'Google 授權已過期，請重新登入',
        code: 'REAUTH_REQUIRED',
        needsReauth: true
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ Token 驗證成功');

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

    console.log('呼叫 Google Calendar API...', calendarEvent);

    // 呼叫 Google Calendar API
    const calendarResponse = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${providerToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(calendarEvent),
      }
    );

    console.log('Google Calendar API 回應狀態:', calendarResponse.status);

    if (!calendarResponse.ok) {
      const errorText = await calendarResponse.text();
      console.error('Google Calendar API 錯誤:', errorText);
      
      return new Response(JSON.stringify({ 
        message: '建立 Google Calendar 事件失敗',
        code: 'CALENDAR_API_ERROR',
        error: errorText 
      }), {
        status: calendarResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const createdEvent = await calendarResponse.json();
    console.log('✅ 事件建立成功:', createdEvent.id);

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
      code: 'INTERNAL_ERROR',
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// ============================================================================
// 驗證 Google Token
// ============================================================================
async function validateGoogleToken(token: string): Promise<boolean> {
  try {
    const response = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${token}`);
    
    if (!response.ok) {
      console.log('Token 驗證失敗，HTTP狀態:', response.status);
      return false;
    }

    const tokenInfo = await response.json();
    console.log('Token 驗證成功:', tokenInfo);
    
    // 檢查是否包含 Calendar 權限
    const hasCalendarScope = tokenInfo.scope?.includes('calendar');
    if (!hasCalendarScope) {
      console.log('❌ Token 缺少 Calendar 權限');
      return false;
    }

    console.log('✅ Token 驗證成功，包含 Calendar 權限');
    return true;
  } catch (error) {
    console.error('驗證 Google token 失敗:', error);
    return false;
  }
}