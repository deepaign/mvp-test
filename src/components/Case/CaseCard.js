import React from 'react'
import '../../styles/CaseCard.css'

function CaseCard({ stats }) {
  // 確保 stats 有預設值，避免錯誤
  const safeStats = {
    total: 0,
    byStatus: { 
      pending: 0, 
      processing: 0, 
      completed: 0 
    },
    ...stats
  }

  const cardData = [
    {
      id: 'upcoming',
      title: '所有案件', // 從「即將到期」改為「所有案件」
      count: safeStats.total // 從固定的 0 改為顯示總案件數
    },
    {
      id: 'pending',
      title: '待處理',
      count: safeStats.byStatus.pending
    },
    {
      id: 'processing',
      title: '處理中',
      count: safeStats.byStatus.processing
    },
    {
      id: 'completed',
      title: '已完成',
      count: safeStats.byStatus.completed
    }
  ]

  return (
    <div className="case-card-container">
      <div className="case-cards-wrapper">
        {cardData.map((card) => (
          <div key={card.id} className="case-card">
            <div className="case-card-header">
              <span className="case-card-title">{card.title}</span>
            </div>
            <div className="case-card-count">
              {card.count}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default CaseCard