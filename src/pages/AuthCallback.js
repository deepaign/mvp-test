import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';

function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('處理中...');
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('🔍 處理認證回調...');
        console.log('當前 URL:', window.location.href);
        
        // 等待 Supabase 處理 OAuth 回調
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('認證回調錯誤:', error);
          setError(error.message);
          setStatus('認證失敗');
          
          // 3秒後跳轉到登入頁面
          setTimeout(() => {
            navigate('/login?error=auth_failed');
          }, 3000);
          return;
        }

        if (data.session) {
          console.log('✅ 登入成功:', data.session.user);
          setStatus('登入成功！正在跳轉...');
          
          // 檢查是否有有效的 Google provider_token
          if (data.session.provider_token) {
            console.log('✅ 取得 Google provider_token');
          } else {
            console.log('⚠️ 沒有取得 provider_token');
          }
          
          // 1秒後跳轉到主頁面
          setTimeout(() => {
            navigate('/dashboard');
          }, 1000);
        } else {
          console.log('❌ 沒有找到有效的 session');
          setStatus('沒有找到有效的登入資訊');
          setError('請重新登入');
          
          setTimeout(() => {
            navigate('/login');
          }, 3000);
        }
      } catch (err) {
        console.error('處理認證回調失敗:', err);
        setError(err.message);
        setStatus('處理失敗');
        
        setTimeout(() => {
          navigate('/login?error=callback_failed');
        }, 3000);
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      height: '100vh',
      padding: '20px'
    }}>
      <div style={{ textAlign: 'center', maxWidth: '400px' }}>
        <h2>認證處理中</h2>
        <p style={{ fontSize: '18px', margin: '20px 0' }}>{status}</p>
        
        {error && (
          <div style={{ 
            padding: '10px', 
            backgroundColor: '#f8d7da', 
            color: '#721c24',
            border: '1px solid #f5c6cb',
            borderRadius: '4px',
            marginTop: '20px'
          }}>
            <strong>錯誤：</strong> {error}
          </div>
        )}
        
        <div style={{ marginTop: '20px' }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #3498db',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }}></div>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default AuthCallback;