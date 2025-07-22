import React, { useState } from 'react'
import '../../../styles/CaseTextInput.css'

function CaseTextInput({ team, member, onSubmit, onCancel, onAIExtractionComplete }) {
  const [textContent, setTextContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isAISummarizing, setIsAISummarizing] = useState(false)

  const handleAISummary = async () => {
    if (!textContent.trim()) {
      alert('請先輸入陳情內容')
      return
    }

    setIsAISummarizing(true)
    
    try {
      console.log('🚀 開始 AI 分析...')
      
      // 從環境變數讀取 API 設定
      const apiUrl = process.env.REACT_APP_AI_SUMMARY_URL
      const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY
      
      if (!apiUrl || !supabaseKey) {
        throw new Error('缺少必要的環境變數設定')
      }
      
      const startTime = performance.now()
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
        },
        body: JSON.stringify({
          transcript: textContent.trim()
        })
      })

      const endTime = performance.now()
      const duration = endTime - startTime
      
      console.log(`⏱️ AI 分析耗時: ${(duration/1000).toFixed(1)} 秒`)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ API 呼叫失敗:', response.status, errorText)
        throw new Error(`API 呼叫失敗 (${response.status}): ${errorText}`)
      }

      const data = await response.json()
      
      if (data.success && data.extractedData) {
        console.log('✅ AI 分析成功！提取的資料:', data.extractedData)
        
        // 將提取的資料轉換為表單格式
        const formData = {
          title: data.extractedData["Petition Summary"] ? 
                 data.extractedData["Petition Summary"].substring(0, 50) + '...' : 
                 '通過 AI 摘要建立的案件',
          description: data.extractedData["Petition Summary"] || textContent.trim(),
          petitionerName: data.extractedData["Petitioner's Name"] || '',
          contactPhone: data.extractedData["Contact Phone Number"] || '',
          petitionerAddress: data.extractedData["Petitioner's Home Address"] || '',
          incidentLocation: data.extractedData["Incident Location"] || '',
          caseCategory: mapCaseCategory(data.extractedData["Case Category"]),
          priority: mapPriority(data.extractedData["Priority Level"]),
          petitionMethod: data.extractedData["Petition Method"] || '',
          secondPetitionerName: data.extractedData["Second Petitioner's Chinese Name"] || '',
          secondContactPhone: data.extractedData["Second Petitioner's Contact Phone"] || '',
          // 原始逐字稿
          originalTranscript: textContent.trim(),
          // AI 提取的完整資料
          aiExtractedData: data.extractedData,
          // 標記為 AI 建立
          createdByAI: true
        }
        
        // 通知父組件切換到表單模式並填入資料
        if (onAIExtractionComplete) {
          onAIExtractionComplete(formData)
        }
        
        alert(`✅ AI 分析完成！\n耗時: ${(duration/1000).toFixed(1)} 秒\n即將跳轉到逐欄輸入視窗並自動填入提取的資訊`)
        
      } else {
        console.error('❌ AI 分析失敗:', data.error)
        alert('❌ AI 分析失敗：' + (data.error || '未知錯誤'))
      }
      
    } catch (error) {
      console.error('💥 AI 分析過程發生錯誤:', error)
      alert('💥 AI 分析失敗：' + error.message)
    } finally {
      setIsAISummarizing(false)
    }
  }

  // 將 AI 回傳的案件類別對應到系統的選項
  const mapCaseCategory = (aiCategory) => {
    const mapping = {
      'Traffic Issues': 'traffic',
      'Public Services': 'public_service', 
      'Environmental Issues': 'environment',
      'Public Safety Issues': 'safety',
      'Legal Consultation': 'legal',
      'Other Issues': 'other'
    }
    return mapping[aiCategory] || 'other'
  }

  // 將 AI 回傳的優先級對應到系統的選項
  const mapPriority = (aiPriority) => {
    const mapping = {
      'Urgent': 'high',
      'Normal': 'medium', 
      'Low': 'low'
    }
    return mapping[aiPriority] || 'medium'
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!textContent.trim()) {
      alert('請輸入案件內容')
      return
    }

    setIsSubmitting(true)

    try {
      // 直接建立案件（不經過 AI 分析）
      const caseData = {
        title: 'AI摘要案件',
        description: textContent.trim(),
        inputMode: 'text',
        originalTranscript: textContent.trim()
      }

      await onSubmit(caseData)
    } catch (error) {
      console.error('提交失敗:', error)
      alert('提交失敗，請稍後再試')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="case-text-input-container">
      <form onSubmit={handleSubmit} className="case-text-form">
        {/* AI摘要輸入區域 */}
        <div className="text-input-section">
          <label className="text-input-label">
            陳情內容全文 <span className="required">*</span>
          </label>
          <textarea
            value={textContent}
            onChange={(e) => setTextContent(e.target.value)}
            placeholder="請輸入陳情內容全文，點擊「AI一鍵摘要」系統將自動分析並萃取關鍵資訊..."
            rows={15}
            className="text-input-textarea"
            required
          />
          
          {/* 字數統計 */}
          <div className="text-stats">
            字數: {textContent.length} 字
          </div>
        </div>

        {/* AI 摘要操作區域 */}
        <div className="ai-summary-section">
          <button
            type="button"
            onClick={handleAISummary}
            disabled={isAISummarizing || isSubmitting || !textContent.trim()}
            className="ai-summary-btn"
          >
            {isAISummarizing ? (
              <>
                <span className="ai-loading-icon">🤖</span>
                AI 分析中... ({Math.floor(Math.random() * 10) + 5}秒)
              </>
            ) : (
              <>
                <span className="ai-icon">🤖</span>
                AI一鍵摘要
              </>
            )}
          </button>
          <p className="ai-summary-description">
            AI將自動分析文本並萃取案件標題、聯絡人、地點等關鍵資訊，並跳轉到逐欄輸入視窗
          </p>
        </div>

        {/* Footer */}
        <div className="form-footer">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting || isAISummarizing}
            className="cancel-btn"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={isSubmitting || isAISummarizing || !textContent.trim()}
            className="submit-btn"
          >
            {isSubmitting ? '建立中...' : '直接建立案件'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default CaseTextInput