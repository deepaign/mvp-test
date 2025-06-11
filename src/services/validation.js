// 政治人物表單驗證
export const validatePoliticianForm = (formData) => {
  const errors = {}

  // 姓名驗證
  if (!formData.name.trim()) {
    errors.name = '請輸入姓名'
  } else if (formData.name.length < 2) {
    errors.name = '姓名至少需要2個字元'
  }

  // Email 驗證
  if (!formData.email.trim()) {
    errors.email = '請輸入 Email'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
    errors.email = '請輸入有效的 Email 格式'
  }

  // 電話驗證
  if (!formData.phone.trim()) {
    errors.phone = '請輸入電話號碼'
  } else if (!/^09\d{8}$/.test(formData.phone.replace(/[-\s]/g, ''))) {
    errors.phone = '請輸入有效的手機號碼（09xxxxxxxx）'
  }

  // 職位驗證
  if (!formData.position) {
    errors.position = '請選擇職位'
  }

  // 縣市驗證
  if (!formData.county) {
    errors.county = '請選擇服務縣市'
  }

  return errors
}

// 幕僚助理表單驗證
export const validateStaffForm = (formData) => {
  const errors = {}

  // 姓名驗證
  if (!formData.name.trim()) {
    errors.name = '請輸入姓名'
  } else if (formData.name.length < 2) {
    errors.name = '姓名至少需要2個字元'
  }

  // Email 驗證
  if (!formData.email.trim()) {
    errors.email = '請輸入 Email'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
    errors.email = '請輸入有效的 Email 格式'
  }

  // 電話驗證
  if (!formData.phone.trim()) {
    errors.phone = '請輸入電話號碼'
  } else if (!/^09\d{8}$/.test(formData.phone.replace(/[-\s]/g, ''))) {
    errors.phone = '請輸入有效的手機號碼（09xxxxxxxx）'
  }

  // 職位驗證
  if (!formData.position) {
    errors.position = '請選擇職位'
  }

  // 政治人物姓名驗證
  if (!formData.politician_name.trim()) {
    errors.politician_name = '請輸入服務的政治人物姓名'
  }

  return errors
}