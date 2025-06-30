// src/components/Case/CreateCaseModal.jsx
import React, { useState, useEffect } from 'react'
import { CaseService } from '../../services/caseService'
import '../../styles/CreateCaseModal.css'

function CreateCaseModal({ isOpen, onClose, onSave, member, team }) {
  // 初始狀態
  const initialState = {
    title: '',
    description: '',
    status: '待處理',
    priority: '一般',
    contactType: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    voterData: {
      name: '',
      phone: '',
      email: '',
      address: '',
      job: '',
      education: ''
    },
    categories: [],
    assigneeId: ''
  }

  // 狀態管理
  const [caseData, setCaseData] = useState(initialState)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [useAI, setUseAI] = useState(false)
  const [fullText, setFullText] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiRecommendations, setAiRecommendations] = useState(null)

  // 選項資料
  const contactTypes = ['電話', '現場', 'Line', 'Facebook', 'Email', '其他']
  const categories = ['交通問題', '環境問題', '治安問題', '民生服務', '法律諮詢', '其他問題']
  const priorities = ['低', '一般', '緊急']
  const statusOptions = ['待處理', '處理中', '已完成']

  // 模擬團隊成員（實際應該從 API 獲取）
  const teamMembers = [
    { id: member.id, name: member.name, role: member.role }
    // 這裡可以添加其他團隊成員
  ]

  // 重置表單
  const resetForm = () => {
    setCaseData(initialState)
    setFullText('')
    setAiRecommendations(null)
    setError('')
    setUseAI(false)
  }

  // 當 Modal 開啟/關閉時重置表單
  useEffect(() => {
    if (isOpen) {
      resetForm()
    }
  }, [isOpen])

  // 處理輸入變更
  const handleChange = (e) => {
    const { name, value } = e.target
    
    if (name.startsWith('voter.')) {
      const voterField = name.split('.')[1]
      setCaseData(prev => ({
        ...prev,
        voterData: {
          ...prev.voterData,
          [voterField]: value
        }
      }))
    } else {
      setCaseData(prev => ({
        ...prev,
        [name]: value
      }))
    }
  }

  // 處理類別變更
  const handleCategoryChange = (category) => {
    setCaseData(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category]
    }))
  }

  // 切換輸入模式
  const toggleInputMode = () => {
    setUseAI(!useAI)
    setError('')
  }

  // AI 萃取資訊（模擬功能）
  const handleAIExtract = async () => {
    if (!fullText.trim()) {
      setError('請先輸入案件資訊文字')
      return
    }

    setAiLoading(true)
    
    try {
      // 模擬 AI 處理過程
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // 模擬 AI 萃取結果
      const extractedTitle = fullText.split('\n')[0] || fullText.substring(0, 50)
      const hasLocation = fullText.includes('地點') || fullText.includes('地址')
      
      // 根據關鍵字判斷類別
      let category = '其他問題'
      if (fullText.includes('交通') || fullText.includes('路燈') || fullText.includes('道路')) {
        category = '交通問題'
      } else if (fullText.includes('環境') || fullText.includes('垃圾') || fullText.includes('公園')) {
        category = '環境問題'
      } else if (fullText.includes('治安') || fullText.includes('安全')) {
        category = '治安問題'
      } else if (fullText.includes('服務') || fullText.includes('申請')) {
        category = '民生服務'
      }

      // 判斷優先級
      let priority = '一般'
      if (fullText.includes('緊急') || fullText.includes('危險') || fullText.includes('急')) {
        priority = '緊急'
      }

      // 萃取聯絡方式
      let contactType = '電話'
      if (fullText.includes('Line') || fullText.includes('line')) {
        contactType = 'Line'
      } else if (fullText.includes('現場') || fullText.includes('親自')) {
        contactType = '現場'
      } else if (fullText.includes('Facebook') || fullText.includes('FB')) {
        contactType = 'Facebook'
      }

      const recommendations = {
        title: extractedTitle,
        description: fullText,
        category: category,
        priority: priority,
        contactType: contactType,
        voterName: fullText.includes('王') ? '王小明' : fullText.includes('李') ? '李大華' : '',
        voterPhone: '0912345678'
      }

      setAiRecommendations(recommendations)

      // 自動填入萃取的資訊
      setCaseData(prev => ({
        ...prev,
        title: recommendations.title,
        description: recommendations.description,
        priority: recommendations.priority,
        contactType: recommendations.contactType,
        categories: [recommendations.category],
        voterData: {
          ...prev.voterData,
          name: recommendations.voterName,
          phone: recommendations.voterPhone
        }
      }))

      // 切換到表單模式
      setUseAI(false)
      
    } catch (error) {
      console.error('AI 萃取失敗:', error)
      setError('AI 萃取失敗，請稍後重試')
    } finally {
      setAiLoading(false)
    }
  }

  // 提交表單
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // 基本驗證
    if (!caseData.title.trim()) {
      setError('請輸入案件標題')
      return
    }
    
    if (!caseData.description.trim()) {
      setError('請輸入案件描述')
      return
    }

    setLoading(true)
    setError('')

    try {
      const result = await CaseService.createCase(caseData, member.auth_user_id, team.id)
      
      if (result.success) {
        onSave(result.case)
        resetForm()
      } else {
        setError(result.message)
      }
    } catch (error) {
      console.error('新增案件失敗:', error)
      setError('新增案件失敗，請稍後重試')
    } finally {
      setLoading(false)
    }
  }

  // 如果 Modal 沒有開啟，不渲染
  if (!isOpen) return null

  return (
    <div className="modal-overlay">
      <div className="create-case-modal">
        <div className="modal-header">
          <h2>新增陳情案件</h2>
          <div className="input-mode-toggle">
            <button 
              className={`toggle-btn ${!useAI ? 'active' : ''}`} 
              onClick={() => setUseAI(false)}
            >
              表單填寫
            </button>
            <button 
              className={`toggle-btn ${useAI ? 'active' : ''}`} 
              onClick={() => setUseAI(true)}
            >
              AI 萃取
            </button>
          </div>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="modal-content">
          {error && (
            <div className="error-message">
              ❌ {error}
            </div>
          )}

          {useAI ? (
            /* AI 萃取模式 */
            <div className="ai-input-section">
              <div className="form-group">
                <label htmlFor="fullText">案件資訊全文</label>
                <textarea
                  id="fullText"
                  rows="8"
                  value={fullText}
                  onChange={(e) => setFullText(e.target.value)}
                  placeholder="請貼上或輸入完整的陳情內容，AI 將自動萃取關鍵資訊..."
                />
              </div>

              <div className="ai-extract-section">
                <button 
                  className="ai-extract-btn"
                  onClick={handleAIExtract}
                  disabled={aiLoading || !fullText.trim()}
                >
                  {aiLoading ? (
                    <>
                      <div className="loading-spinner"></div>
                      AI 正在分析...
                    </>
                  ) : (
                    <>
                      <span className="ai-icon">🤖</span>
                      AI 萃取資訊
                    </>
                  )}
                </button>
              </div>

              {aiRecommendations && (
                <div className="ai-recommendations">
                  <h3>🤖 AI 推薦結果</h3>
                  <div className="recommendation-grid">
                    <div className="recommendation-item">
                      <span className="label">案件標題:</span>
                      <span className="value">{aiRecommendations.title}</span>
                    </div>
                    <div className="recommendation-item">
                      <span className="label">案件類別:</span>
                      <span className="value">{aiRecommendations.category}</span>
                    </div>
                    <div className="recommendation-item">
                      <span className="label">優先級:</span>
                      <span className="value">{aiRecommendations.priority}</span>
                    </div>
                    <div className="recommendation-item">
                      <span className="label">聯絡方式:</span>
                      <span className="value">{aiRecommendations.contactType}</span>
                    </div>
                    {aiRecommendations.voterName && (
                      <div className="recommendation-item">
                        <span className="label">陳情人:</span>
                        <span className="value">{aiRecommendations.voterName}</span>
                      </div>
                    )}
                  </div>
                  <p className="ai-note">
                    ✅ 已自動填入表單，請切換到「表單填寫」模式查看或修改
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* 表單填寫模式 */
            <form onSubmit={handleSubmit} className="case-form">
              {/* 基本資訊 */}
              <div className="form-section">
                <h3>基本資訊</h3>
                <div className="form-grid">
                  <div className="form-group full-width">
                    <label htmlFor="title">案件標題 <span className="required">*</span></label>
                    <input
                      type="text"
                      id="title"
                      name="title"
                      value={caseData.title}
                      onChange={handleChange}
                      placeholder="請輸入案件標題"
                      required
                    />
                  </div>

                  <div className="form-group full-width">
                    <label htmlFor="description">案件描述 <span className="required">*</span></label>
                    <textarea
                      id="description"
                      name="description"
                      rows="4"
                      value={caseData.description}
                      onChange={handleChange}
                      placeholder="請詳細描述案件內容"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="status">案件狀態</label>
                    <select
                      id="status"
                      name="status"
                      value={caseData.status}
                      onChange={handleChange}
                    >
                      {statusOptions.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="priority">優先級</label>
                    <select
                      id="priority"
                      name="priority"
                      value={caseData.priority}
                      onChange={handleChange}
                    >
                      {priorities.map(priority => (
                        <option key={priority} value={priority}>{priority}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="contactType">聯絡方式</label>
                    <select
                      id="contactType"
                      name="contactType"
                      value={caseData.contactType}
                      onChange={handleChange}
                    >
                      <option value="">請選擇聯絡方式</option>
                      {contactTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="assigneeId">指派處理人</label>
                    <select
                      id="assigneeId"
                      name="assigneeId"
                      value={caseData.assigneeId}
                      onChange={handleChange}
                    >
                      <option value="">請選擇處理人</option>
                      {teamMembers.map(member => (
                        <option key={member.id} value={member.id}>{member.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="startDate">開始日期</label>
                    <input
                      type="date"
                      id="startDate"
                      name="startDate"
                      value={caseData.startDate}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="endDate">預計完成日期</label>
                    <input
                      type="date"
                      id="endDate"
                      name="endDate"
                      value={caseData.endDate}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>

              {/* 案件類別 */}
              <div className="form-section">
                <h3>案件類別</h3>
                <div className="category-grid">
                  {categories.map(category => (
                    <label key={category} className="category-checkbox">
                      <input
                        type="checkbox"
                        checked={caseData.categories.includes(category)}
                        onChange={() => handleCategoryChange(category)}
                      />
                      <span className="category-label">{category}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 陳情人資訊 */}
              <div className="form-section">
                <h3>陳情人資訊</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="voter.name">姓名</label>
                    <input
                      type="text"
                      id="voter.name"
                      name="voter.name"
                      value={caseData.voterData.name}
                      onChange={handleChange}
                      placeholder="請輸入陳情人姓名"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="voter.phone">電話</label>
                    <input
                      type="tel"
                      id="voter.phone"
                      name="voter.phone"
                      value={caseData.voterData.phone}
                      onChange={handleChange}
                      placeholder="請輸入聯絡電話"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="voter.email">Email</label>
                    <input
                      type="email"
                      id="voter.email"
                      name="voter.email"
                      value={caseData.voterData.email}
                      onChange={handleChange}
                      placeholder="請輸入電子郵件"
                    />
                  </div>

                  <div className="form-group full-width">
                    <label htmlFor="voter.address">地址</label>
                    <input
                      type="text"
                      id="voter.address"
                      name="voter.address"
                      value={caseData.voterData.address}
                      onChange={handleChange}
                      placeholder="請輸入地址"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="voter.job">職業</label>
                    <input
                      type="text"
                      id="voter.job"
                      name="voter.job"
                      value={caseData.voterData.job}
                      onChange={handleChange}
                      placeholder="請輸入職業"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="voter.education">學歷</label>
                    <input
                      type="text"
                      id="voter.education"
                      name="voter.education"
                      value={caseData.voterData.education}
                      onChange={handleChange}
                      placeholder="請輸入學歷"
                    />
                  </div>
                </div>
              </div>
            </form>
          )}
        </div>

        <div className="modal-footer">
          <button 
            type="button" 
            className="cancel-btn" 
            onClick={onClose}
            disabled={loading}
          >
            取消
          </button>
          <button 
            type="submit" 
            className="save-btn"
            onClick={handleSubmit}
            disabled={loading || useAI}
          >
            {loading ? (
              <>
                <div className="loading-spinner"></div>
                建立中...
              </>
            ) : (
              '建立案件'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default CreateCaseModal