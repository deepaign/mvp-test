// 修正後的 CategoryAutoComplete.js
import React, { useState, useEffect, useRef, useCallback } from 'react'
import '../../../../styles/CategoryAutoComplete.css'

const CategoryAutoComplete = ({ 
  formData, 
  categories = [], 
  onChange, 
  placeholder = "請選擇或輸入案件分類",
  required = false 
}) => {
  const [inputValue, setInputValue] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [filteredCategories, setFilteredCategories] = useState([])
  const inputRef = useRef(null)
  const dropdownRef = useRef(null)

  // 初始化輸入值
  useEffect(() => {
    console.log('CategoryAutoComplete 初始化:', { formData, categories })
    
    if (formData.category) {
      // 直接使用 formData.category 作為顯示值
      // 如果是預設類別 ID，轉換為名稱顯示
      const categoryName = getCategoryDisplayName(formData.category)
      setInputValue(categoryName)
    } else {
      setInputValue('')
    }
  }, [formData.category, categories])

  // 獲取類別顯示名稱
  const getCategoryDisplayName = (categoryValue) => {
    if (!categoryValue) return ''
    
    // 預設類別對應
    const defaultCategoryMap = {
      'traffic': '交通問題',
      'environment': '環境問題',
      'security': '治安問題',
      'public_service': '民生服務',
      'legal_consultation': '法律諮詢'
    }
    
    return defaultCategoryMap[categoryValue] || categoryValue
  }

  // 處理輸入變更
  const handleInputChange = useCallback((e) => {
    const value = e.target.value
    setInputValue(value)
    setIsOpen(true)
    
    // 過濾類別
    if (value.trim() === '') {
      setFilteredCategories(categories)
    } else {
      const filtered = categories.filter(category =>
        category.name.toLowerCase().includes(value.toLowerCase())
      )
      setFilteredCategories(filtered)
    }
  }, [categories])

  // 處理輸入焦點
  const handleInputFocus = useCallback(() => {
    setIsOpen(true)
    setFilteredCategories(categories)
  }, [categories])

  // 處理選項點擊
  const handleOptionClick = useCallback((category) => {
    console.log('選擇類別:', category)
    setInputValue(category.name)
    setIsOpen(false)
    
    // 將選擇的類別傳遞給父組件
    // 統一傳遞類別名稱，讓後端邏輯統一處理
    if (onChange) {
      onChange(category.name)
    }
  }, [onChange])

  // 處理鍵盤事件
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      
      if (filteredCategories.length > 0) {
        // 選擇第一個匹配的類別
        handleOptionClick(filteredCategories[0])
      } else if (inputValue.trim()) {
        // 創建新類別
        console.log('創建新類別:', inputValue.trim())
        setIsOpen(false)
        if (onChange) {
          onChange(inputValue.trim())
        }
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }, [filteredCategories, inputValue, handleOptionClick, onChange])

  // 處理失去焦點
  const handleBlur = useCallback((e) => {
    // 延遲關閉，以便點擊選項能正常工作
    setTimeout(() => {
      if (!dropdownRef.current?.contains(document.activeElement)) {
        setIsOpen(false)
        
        // 如果輸入值不為空但沒有匹配的類別，則創建新類別
        if (inputValue.trim() && !categories.some(cat => cat.name === inputValue.trim())) {
          console.log('失去焦點後創建新類別:', inputValue.trim())
          if (onChange) {
            onChange(inputValue.trim())
          }
        }
      }
    }, 200)
  }, [inputValue, categories, onChange])

  // 高亮匹配文字
  const highlightMatch = (text, searchTerm) => {
    if (!searchTerm) return text
    
    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    const parts = text.split(regex)
    
    return parts.map((part, index) => {
      const key = `highlight-${index}`
      return regex.test(part) ? 
        <span key={key} className="category-highlight">{part}</span> : 
        part
    })
  }

  // 過濾出預設類型和自定義類型
  const defaultCategories = filteredCategories.filter(cat => cat.isDefault)
  const customCategories = filteredCategories.filter(cat => !cat.isDefault)

  return (
    <div className="category-autocomplete">
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        required={required}
        className="category-input"
      />
      
      {isOpen && (filteredCategories.length > 0 || inputValue.trim()) && (
        <div ref={dropdownRef} className="category-dropdown">
          {/* 預設類型 */}
          {defaultCategories.length > 0 && (
            <>
              <div className="category-group-header">預設分類</div>
              {defaultCategories.map((category, index) => {
                const key = `default-${category.id || index}`
                return (
                  <div
                    key={key}
                    onClick={() => handleOptionClick(category)}
                    className="category-option default"
                    role="option"
                    aria-selected="false"
                    tabIndex={0}
                  >
                    <div className="category-option-name">
                      {highlightMatch(category.name, inputValue)}
                    </div>
                  </div>
                )
              })}
            </>
          )}
          
          {/* 自定義類型 */}
          {customCategories.length > 0 && (
            <>
              {defaultCategories.length > 0 && <div className="category-divider" />}
              <div className="category-group-header">自定義分類</div>
              {customCategories.map((category, index) => {
                const key = `custom-${category.id || index}`
                return (
                  <div
                    key={key}
                    onClick={() => handleOptionClick(category)}
                    className="category-option custom"
                    role="option"
                    aria-selected="false"
                    tabIndex={0}
                  >
                    <div className="category-option-name">
                      {highlightMatch(category.name, inputValue)}
                    </div>
                  </div>
                )
              })}
            </>
          )}
          
          {/* 新建類別選項 */}
          {inputValue.trim() && !categories.some(cat => 
            cat.name.toLowerCase() === inputValue.toLowerCase()
          ) && (
            <>
              {(defaultCategories.length > 0 || customCategories.length > 0) && 
                <div className="category-divider" />
              }
              <div
                onClick={() => {
                  console.log('點擊新建類別:', inputValue.trim())
                  setIsOpen(false)
                  if (onChange) {
                    onChange(inputValue.trim())
                  }
                }}
                className="category-option create-new"
                role="option"
                aria-selected="false"
                tabIndex={0}
              >
                <div className="category-option-name">
                  <span className="create-icon">+ </span>
                  新建分類: "{inputValue.trim()}"
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default CategoryAutoComplete