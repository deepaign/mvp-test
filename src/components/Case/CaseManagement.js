import React, { useState } from 'react'
import CaseTabs from './CaseTabs'

function CaseManagement({ member, team }) {
  const [activeTab, setActiveTab] = useState('all')

  const handleTabChange = (tabId) => {
    setActiveTab(tabId)
    console.log('切換到案件狀態:', tabId)
    // 這裡之後可以添加重新載入案件列表的邏輯
  }

  const renderCaseContent = () => {
    switch (activeTab) {
      case 'all':
        return (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '16px' }}>📋</div>
            <h3 style={{ color: '#333', marginBottom: '12px' }}>全部案件</h3>
            <p style={{ color: '#666' }}>案件列表功能開發中...</p>
          </div>
        )
      case 'pending':
        return (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '16px' }}>⏳</div>
            <h3 style={{ color: '#333', marginBottom: '12px' }}>待處理案件</h3>
            <p style={{ color: '#666' }}>待處理案件列表功能開發中...</p>
          </div>
        )
      case 'processing':
        return (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '16px' }}>🔄</div>
            <h3 style={{ color: '#333', marginBottom: '12px' }}>處理中案件</h3>
            <p style={{ color: '#666' }}>處理中案件列表功能開發中...</p>
          </div>
        )
      case 'completed':
        return (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '16px' }}>✅</div>
            <h3 style={{ color: '#333', marginBottom: '12px' }}>已完成案件</h3>
            <p style={{ color: '#666' }}>已完成案件列表功能開發中...</p>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div style={{ 
      background: 'white', 
      borderRadius: '12px', 
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      minHeight: '600px'
    }}>
      <CaseTabs 
        activeTab={activeTab} 
        onTabChange={handleTabChange} 
      />
      
      <div style={{ 
        background: 'white',
        borderRadius: '0 0 12px 12px',
        minHeight: '500px'
      }}>
        {renderCaseContent()}
      </div>
    </div>
  )
}

export default CaseManagement