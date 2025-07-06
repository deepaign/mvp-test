// CategoryAutoComplete.js - 配合現有 CSS 的修正版
import React, { useState, useEffect, useRef } from 'react'
import '../../../../styles/CategoryAutoComplete.css'

const CategoryAutoComplete = ({ 
  value, 
  onChange, 
  categories = [], 
  placeholder = "請輸入或選擇案件類型", 
  required = false 
}) => {
  const [inputValue, setInputValue] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [filteredCategories, setFilteredCategories] = useState([])
  const inputRef = useRef(null)
  const dropdownRef = useRef(null)

  // 當外部 value 變化時，更新 inputValue
  useEffect(() => {
    if (value) {
      // 如果 value 是預設類型 ID，轉換為名稱顯示
      const categoryMap = {
        'traffic': '交通問題',
        'environment': '環境問題',
        'security': '治安問題',
        'public_service': '民生服務'
      }
      setInputValue(categoryMap[value] || value)
    } else {
      setInputValue('')
    }
  }, [value])

  // 當 categories 或 inputValue 變化時，更新篩選結果
  useEffect(() => {
    if (!inputValue.trim()) {
      setFilteredCategories(categories)
    } else {
      const filtered = categories.filter(category =>
        category.name.toLowerCase().includes(inputValue.toLowerCase())
      )
      setFilteredCategories(filtered)
    }
  }, [categories, inputValue])

  // 點擊外部關閉下拉選單
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target) &&
        inputRef.current &&
        !inputRef.current.contains(event.target)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleInputChange = (e) => {
    const newValue = e.target.value
    setInputValue(newValue)
    setIsOpen(true)
    
    // 即時回傳輸入值
    if (onChange) {
      onChange(newValue)
    }
  }

  const handleInputFocus = () => {
    setIsOpen(true)
  }

  const handleOptionClick = (category) => {
    setInputValue(category.name)
    setIsOpen(false)
    
    // 回傳選中的類型
    // 如果是預設類型，回傳 ID；如果是自定義類型，回傳名稱
    const returnValue = category.isDefault ? 
      getDefaultCategoryId(category.name) : 
      category.name
    
    if (onChange) {
      onChange(returnValue)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      setIsOpen(false)
      
      // Enter 確認當前輸入值
      if (onChange) {
        onChange(inputValue)
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  const getDefaultCategoryId = (categoryName) => {
    const nameToIdMap = {
      '交通問題': 'traffic',
      '環境問題': 'environment',
      '治安問題': 'security',
      '民生服務': 'public_service'
    }
    return nameToIdMap[categoryName] || categoryName
  }

  const highlightMatch = (text, query) => {
    if (!query.trim()) return text
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    const parts = text.split(regex)
    
    return parts.map((part, index) => {
      const key = `highlight-${index}`
      return regex.test(part) ? 
        <span key={key} className="category-highlight">{part}</span> : 
        part
    })
  }

  const handleCreateNewCategory = () => {
    setIsOpen(false)
    // Enter 確認當前輸入值作為新類型
    if (onChange) {
      onChange(inputValue)
    }
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
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        required={required}
      />
      
      {isOpen && (
        <div ref={dropdownRef} className="category-dropdown">
          {/* 預設類型 */}
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleOptionClick(category)
                  }
                }}
              >
                <div className="category-option-name">
                  {highlightMatch(category.name, inputValue)}
                </div>
              </div>
            )
          })}
          
          {/* 自定義類型 */}
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleOptionClick(category)
                  }
                }}
              >
                <div className="category-option-name">
                  {highlightMatch(category.name, inputValue)}
                </div>
              </div>
            )
          })}
          
          {/* 如果沒有匹配項目且有輸入值，顯示建立新類型選項 */}
          {filteredCategories.length === 0 && inputValue.trim() && (
            <div 
              className="category-empty-state"
              onClick={handleCreateNewCategory}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleCreateNewCategory()
                }
              }}
              tabIndex={0}
              role="option"
              aria-selected="false"
            >
              <div className="empty-text">
                按 Enter 建立 &quot;{inputValue}&quot;
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default CategoryAutoComplete