import React, { useState } from 'react';
import { supabase } from '../supabase';
import { GoogleCalendarService } from '../services/googleCalendarService';

function OAuthTest() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    const testBasicOAuth = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
    console.log('🔍 測試基本 OAuth 設定...');
    console.log('當前 URL:', window.location.origin);
    console.log('Supabase URL:', process.env.REACT_APP_SUPABASE_URL);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });

    if (error) {
      console.error('OAuth 錯誤:', error);
      setError(error.message);
    } else {
      console.log('OAuth 成功:', data);
      setResult('OAuth 調用成功，等待重定向...');
    }

    } catch (err) {
    console.error('測試失敗:', err);
    setError(err.message);
    } finally {
    setLoading(false);
    }
    };

    const testWithCallback = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
    console.log('🔍 測試帶回調的 OAuth 設定...');

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });

    if (error) {
      console.error('OAuth 錯誤:', error);
      setError(error.message);
    } else {
      console.log('OAuth 成功:', data);
      setResult('OAuth 調用成功，等待重定向...');
    }

    } catch (err) {
    console.error('測試失敗:', err);
    setError(err.message);
    } finally {
    setLoading(false);
    }
    };

    const checkSupabaseConnection = async () => {
    try {
    console.log('🔍 檢查 Supabase 連接...');
    const { data, error } = await supabase.auth.getSession();
    console.log('Session 檢查結果:', { data, error });

    if (error) {
      setError(`Supabase 連接錯誤: ${error.message}`);
    } else {
      setResult('Supabase 連接正常');
    }
    } catch (err) {
    setError(`Supabase 連接失敗: ${err.message}`);
    }
    };

    const showEnvironmentInfo = () => {
    console.log('🔍 環境資訊:');
    console.log('REACT_APP_SUPABASE_URL:', process.env.REACT_APP_SUPABASE_URL);
    console.log('REACT_APP_SUPABASE_ANON_KEY:', process.env.REACT_APP_SUPABASE_ANON_KEY ? '已設定' : '未設定');
    console.log('當前 URL:', window.location.href);
    console.log('當前 Origin:', window.location.origin);

    setResult('環境資訊已在控制台中顯示');
    };

    const testWithExplicitRedirect = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      console.log('🔍 測試明確指定本地重定向...');
      console.log('當前 Origin:', window.location.origin);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
          redirectTo: 'http://localhost:3000/auth/callback',
          scopes: 'openid email profile'
      }
      });

      if (error) {
      console.error('OAuth 錯誤:', error);
      setError(error.message);
      } else {
      console.log('OAuth 成功:', data);
      setResult('OAuth 調用成功，等待重定向...');
      }

    } catch (err) {
      console.error('測試失敗:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
    };

    // 檢查 Supabase 設定
    const checkSupabaseSettings = async () => {
    try {
      console.log('🔍 檢查 Supabase 設定...');
      
      // 檢查當前 session
      const { data: session } = await supabase.auth.getSession();
      console.log('當前 session:', session);
      
      // 檢查 auth 設定
      const { data: { user } } = await supabase.auth.getUser();
      console.log('當前 user:', user);
      
      setResult('Supabase 設定檢查完成，請查看控制台');
      
    } catch (err) {
      console.error('檢查失敗:', err);
      setError(err.message);
    }
    };
    const testWithCalendarScope = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
    console.log('🔍 測試包含 Calendar 權限的登入...');

    // 先登出當前用戶
    await supabase.auth.signOut();

    // 等待一秒
    await new Promise(resolve => setTimeout(resolve, 1000));

    const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: 'http://localhost:3000/auth/callback',
      scopes: 'openid email profile https://www.googleapis.com/auth/calendar',
      queryParams: {
        access_type: 'offline',
        prompt: 'consent' // 強制顯示權限同意頁面
      }
    }
    });

    if (error) {
    console.error('OAuth 錯誤:', error);
    setError(error.message);
    } else {
    console.log('OAuth 成功:', data);
    setResult('OAuth 調用成功，等待重定向...');
    }

    } catch (err) {
    console.error('測試失敗:', err);
    setError(err.message);
    } finally {
    setLoading(false);
    }
    };

    // 檢查當前 token 的權限
    const checkTokenScopes = async () => {
    try {
      console.log('🔍 檢查當前 token 的權限範圍...');
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.provider_token) {
      // 檢查 token 資訊
      const response = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${session.provider_token}`);
      const tokenInfo = await response.json();
      
      console.log('Token 資訊:', tokenInfo);
      
      if (tokenInfo.scope) {
          const scopes = tokenInfo.scope.split(' ');
          console.log('當前權限範圍:', scopes);
          
          const hasCalendarScope = scopes.some(scope => 
          scope.includes('calendar') || 
          scope.includes('https://www.googleapis.com/auth/calendar')
          );
          
          if (hasCalendarScope) {
          setResult('✅ Token 包含 Calendar 權限');
          } else {
          setResult('❌ Token 缺少 Calendar 權限，需要重新授權');
          }
      } else {
          setResult('❌ 無法取得 token 權限資訊');
      }
      } else {
      setResult('❌ 沒有找到 provider_token');
      }
      
    } catch (err) {
      console.error('檢查 token 權限失敗:', err);
      setError(err.message);
    }
    };

    // 添加到您的 OAuthTest 組件中
    const testGoogleCalendarAuth = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      console.log('🔍 測試 Google Calendar 授權狀態...');
      
      const authResult = await GoogleCalendarService.checkGoogleAuth();
      console.log('Calendar 授權結果:', authResult);
      
      if (authResult.hasValidToken) {
      setResult('✅ Google Calendar 授權正常！可以建立事件。');
      } else if (authResult.needsReauth) {
      setResult('⚠️ 需要重新授權 Calendar 權限');
      } else {
      setResult('❌ Google Calendar 授權失敗');
      }
      
    } catch (err) {
      console.error('測試 Calendar 授權失敗:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
    };

    const testCreateCalendarEvent = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      console.log('🔍 測試建立 Google Calendar 事件...');
      
      // 建立測試事件
      const now = new Date();
      const startTime = new Date(now.getTime() + 60 * 60 * 1000); // 1小時後
      const endTime = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2小時後
      
      const eventResult = await GoogleCalendarService.quickCreateEvent({
      title: '測試事件 - 政治助理系統',
      description: '這是一個由政治助理系統建立的測試事件',
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      location: '測試地點',
      reminderMinutes: 15
      });
      
      console.log('事件建立結果:', eventResult);
      
      if (eventResult.success) {
      setResult(`✅ 事件建立成功！事件ID: ${eventResult.event.id}`);
      } else if (eventResult.needsReauth) {
      setResult('⚠️ 需要重新授權 Calendar 權限才能建立事件');
      } else {
      setResult(`❌ 事件建立失敗: ${eventResult.error}`);
      }
      
    } catch (err) {
      console.error('測試建立事件失敗:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
    };

    const testCurrentSession = async () => {
    try {
      console.log('🔍 檢查當前 session 的 provider_token...');
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.provider_token) {
      console.log('✅ 有 provider_token:', session.provider_token.substring(0, 20) + '...');
      
      // 測試 provider_token 是否有效
      const tokenValidation = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${session.provider_token}`);
      const tokenInfo = await tokenValidation.json();
      
      console.log('Token 資訊:', tokenInfo);
      
      if (tokenInfo.scope && tokenInfo.scope.includes('calendar')) {
          setResult('✅ Provider token 有效且包含 Calendar 權限');
      } else {
          setResult('⚠️ Provider token 有效但可能缺少 Calendar 權限');
      }
      } else {
      setResult('❌ 沒有找到 provider_token');
      }
      
    } catch (err) {
      console.error('檢查 session 失敗:', err);
      setError(err.message);
    }
    };

    const debugEdgeFunction = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
    console.log('🔍 調試 Edge Function...');

    // 取得當前 session
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
    setError('沒有找到有效的 session');
    return;
    }

    console.log('當前 session 資訊:');
    console.log('- User ID:', session.user.id);
    console.log('- Provider Token:', session.provider_token ? '有' : '無');
    console.log('- Access Token:', session.access_token ? '有' : '無');
    console.log('- Refresh Token:', session.refresh_token ? '有' : '無');

    // 呼叫 Edge Function 的檢查授權端點
    const response = await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/google-calendar/check-auth`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json'
    }
    });

    console.log('Edge Function 回應狀態:', response.status);

    const result = await response.json();
    console.log('Edge Function 回應:', result);

    if (response.ok) {
    setResult(`✅ Edge Function 回應成功:
    狀態: ${response.status}
    有效 Token: ${result.hasValidToken ? '是' : '否'}
    需要重新授權: ${result.needsReauth ? '是' : '否'}
    錯誤: ${result.error || '無'}`);
    } else {
    setError(`❌ Edge Function 錯誤 ${response.status}: ${result.message || '未知錯誤'}`);
    }

    } catch (err) {
    console.error('調試失敗:', err);
    setError(err.message);
    } finally {
    setLoading(false);
    }
    };

    const testEdgeFunctionWithDirectToken = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
    console.log('🔍 使用直接 token 測試 Edge Function...');

    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.provider_token) {
    setError('沒有找到 provider_token');
    return;
    }

    // 準備測試事件資料
    const now = new Date();
    const startTime = new Date(now.getTime() + 60 * 60 * 1000);
    const endTime = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    const eventData = {
    summary: '測試事件 - Edge Function',
    description: '通過 Edge Function 建立的測試事件',
    start: {
      dateTime: startTime.toISOString(),
      timeZone: 'Asia/Taipei'
    },
    end: {
      dateTime: endTime.toISOString(),
      timeZone: 'Asia/Taipei'
    },
    location: '測試地點',
    reminders: {
      useDefault: false,
      overrides: [{ method: 'popup', minutes: 15 }]
    }
    };

    console.log('發送事件資料:', eventData);

    // 呼叫 Edge Function 建立事件
    const response = await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/google-calendar/create-event`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(eventData)
    });

    console.log('Edge Function 回應狀態:', response.status);

    const result = await response.json();
    console.log('Edge Function 回應:', result);

    if (response.ok && result.success) {
    setResult(`✅ Edge Function 事件建立成功!
    事件 ID: ${result.event.id}
    事件連結: ${result.event.htmlLink}
    狀態: ${result.event.status}`);
    } else {
    setError(`❌ Edge Function 失敗: ${result.message || '未知錯誤'}
    代碼: ${result.code || '無'}
    需要重新授權: ${result.needsReauth ? '是' : '否'}`);
    }

    } catch (err) {
    console.error('Edge Function 測試失敗:', err);
    setError(err.message);
    } finally {
    setLoading(false);
    }
    };

    // 檢查 Edge Function 環境變數
    const checkEdgeFunctionEnv = async () => {
    try {
    console.log('🔍 檢查 Edge Function 環境...');

    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
    setError('沒有找到有效的 session');
    return;
    }

    // 嘗試呼叫一個簡單的端點來檢查環境
    const response = await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/google-calendar/check-auth`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json'
    }
    });

    console.log('環境檢查回應狀態:', response.status);
    console.log('環境檢查回應標頭:', Object.fromEntries(response.headers));

    const result = await response.json();
    console.log('環境檢查結果:', result);

    setResult(`Edge Function 環境檢查:
    狀態碼: ${response.status}
    內容類型: ${response.headers.get('content-type')}
    結果: ${JSON.stringify(result, null, 2)}`);

    } catch (err) {
    console.error('環境檢查失敗:', err);
    setError(err.message);
    }
    };

    const testUpdatedEdgeFunction = async () => {
      setLoading(true);
      setError(null);
      setResult(null);

      try {
        console.log('🔍 測試更新後的 Edge Function...');
        
        // 檢查是否有 provider_token
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.provider_token) {
          setError('沒有找到 provider_token，請重新登入');
          return;
        }
        
        console.log('✅ 找到 provider_token');

        // 使用 GoogleCalendarService 測試
        const result = await GoogleCalendarService.quickCreateEvent({
          title: '測試事件 - 更新版 Edge Function',
          description: '使用更新後的 Edge Function 建立的測試事件',
          startTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1小時後
          endTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2小時後
          location: '測試地點',
          reminderMinutes: 15
        });
        
        console.log('Edge Function 測試結果:', result);
        
        if (result.success) {
          setResult(`✅ Edge Function 事件建立成功!
    事件 ID: ${result.event.id}
    事件連結: ${result.event.htmlLink}
    狀態: ${result.event.status}`);
        } else if (result.needsReauth) {
          setResult('⚠️ 需要重新授權 Google 帳號');
        } else {
          setError(`❌ Edge Function 失敗: ${result.error}`);
        }
        
      } catch (err) {
        console.error('Edge Function 測試失敗:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    const testUpdatedAuthCheck = async () => {
      try {
        console.log('🔍 測試更新後的授權檢查...');
        
        const result = await GoogleCalendarService.checkGoogleAuth();
        console.log('授權檢查結果:', result);
        
        if (result.hasValidToken) {
          setResult('✅ Google Calendar 授權正常！');
        } else if (result.needsReauth) {
          setResult('⚠️ 需要重新授權 Calendar 權限');
        } else {
          setResult(`❌ 授權檢查失敗: ${result.error}`);
        }
        
      } catch (err) {
        console.error('授權檢查失敗:', err);
        setError(err.message);
      }
    };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h2>OAuth 測試工具</h2>
      
      <div style={{ marginBottom: '20px' }}>
      <h3>環境檢查</h3>
      <button onClick={showEnvironmentInfo}>
        顯示環境資訊
      </button>
      <button onClick={checkSupabaseConnection} style={{ marginLeft: '10px' }}>
        檢查 Supabase 連接
      </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
      <h3>OAuth 測試</h3>
      <button 
        onClick={testBasicOAuth} 
        disabled={loading}
        style={{ marginRight: '10px' }}
      >
        {loading ? '測試中...' : '測試基本 OAuth'}
      </button>
      <button 
        onClick={testWithCallback} 
        disabled={loading}
      >
        {loading ? '測試中...' : '測試帶回調的 OAuth'}
      </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
      <h3>修正後的測試</h3>
      <button 
          onClick={testWithExplicitRedirect} 
          disabled={loading}
          style={{ marginRight: '10px' }}
      >
          {loading ? '測試中...' : '測試本地重定向'}
      </button>
      <button 
          onClick={checkSupabaseSettings} 
          disabled={loading}
      >
          檢查 Supabase 設定
      </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
      <h3>Calendar 權限測試</h3>
      <button 
      onClick={checkTokenScopes} 
      disabled={loading}
      style={{ marginRight: '10px' }}
      >
      檢查 Token 權限
      </button>
      <button 
      onClick={testWithCalendarScope} 
      disabled={loading}
      >
      {loading ? '測試中...' : '重新授權 Calendar'}
      </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
      <h3>Google Calendar 測試</h3>
      <button 
          onClick={testCurrentSession} 
          disabled={loading}
          style={{ marginRight: '10px' }}
      >
          檢查 Provider Token
      </button>
      <button 
          onClick={testGoogleCalendarAuth} 
          disabled={loading}
          style={{ marginRight: '10px' }}
      >
          {loading ? '測試中...' : '測試 Calendar 授權'}
      </button>
      <button 
          onClick={testCreateCalendarEvent} 
          disabled={loading}
      >
          {loading ? '測試中...' : '測試建立事件'}
      </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
      <h3>Edge Function 調試</h3>
      <button 
      onClick={checkEdgeFunctionEnv} 
      disabled={loading}
      style={{ marginRight: '10px' }}
      >
      檢查環境
      </button>
      <button 
      onClick={debugEdgeFunction} 
      disabled={loading}
      style={{ marginRight: '10px' }}
      >
      {loading ? '調試中...' : '調試授權'}
      </button>
      <button 
      onClick={testEdgeFunctionWithDirectToken} 
      disabled={loading}
      >
      {loading ? '測試中...' : '測試建立事件'}
      </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
      <h3>更新後的 Edge Function 測試</h3>
      <button 
      onClick={testUpdatedAuthCheck} 
      disabled={loading}
      style={{ marginRight: '10px' }}
      >
      測試授權檢查
      </button>
      <button 
      onClick={testUpdatedEdgeFunction} 
      disabled={loading}
      >
      {loading ? '測試中...' : '測試建立事件'}
      </button>
      </div>
      {result && (
        <div style={{ 
          padding: '10px', 
          backgroundColor: '#d4edda', 
          color: '#155724',
          border: '1px solid #c3e6cb',
          borderRadius: '4px',
          marginBottom: '10px'
        }}>
          <strong>結果：</strong> {result}
        </div>
      )}

      {error && (
        <div style={{ 
          padding: '10px', 
          backgroundColor: '#f8d7da', 
          color: '#721c24',
          border: '1px solid #f5c6cb',
          borderRadius: '4px',
          marginBottom: '10px'
        }}>
          <strong>錯誤：</strong> {error}
        </div>
      )}

      <div style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
        <h4>Google Cloud Console 設定檢查：</h4>
        <p><strong>已授權的 JavaScript 來源：</strong></p>
        <code>https://cumaiyjgrifebvyajwwr.supabase.co</code><br/>
        <code>http://localhost:3000</code>
        
        <p><strong>已授權的重新導向 URI：</strong></p>
        <code>https://cumaiyjgrifebvyajwwr.supabase.co/auth/v1/callback</code><br/>
        <code>http://localhost:3000/auth/callback</code>
      </div>
    </div>
  );
}

export default OAuthTest;