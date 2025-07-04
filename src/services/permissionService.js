// src/services/permissionService.js
export class PermissionService {
  
  // 定義權限映射表
  static PERMISSIONS = {
    // 案件管理相關
    'case_view_all': ['politician', 'leader'],          // 查看所有案件
    'case_view_assigned': ['staff'],                    // 查看被分配的案件
    'case_create': ['politician', 'leader'],           // 建立案件
    'case_assign': ['politician', 'leader'],           // 分配案件
    'case_delete': ['politician', 'leader'],           // 刪除案件
    
    // 團隊管理相關
    'team_invite': ['politician', 'leader'],           // 生成邀請碼
    'team_remove_member': ['politician', 'leader'],    // 移除成員
    'team_view_all_members': ['politician', 'leader', 'staff'], // 查看所有成員
    
    // 分析功能
    'analytics_view': ['politician', 'leader'],        // 查看資料分析
    'achievements_view': ['politician', 'leader']      // 查看政績展示
  }

  /**
   * 檢查用戶是否有特定權限
   * @param {Object} member - 成員物件
   * @param {string} permission - 權限名稱
   * @returns {boolean} 是否有權限
   */
  static hasPermission(member, permission) {
    if (!member || !permission) return false
    
    const allowedRoles = this.PERMISSIONS[permission]
    if (!allowedRoles) return false
    
    // 檢查是否為領導者
    if (member.is_leader && allowedRoles.includes('leader')) {
      return true
    }
    
    // 檢查角色權限
    if (member.role && allowedRoles.includes(member.role)) {
      return true
    }
    
    return false
  }

  /**
   * 根據用戶權限獲取可見的導航項目
   * @param {Object} member - 成員物件
   * @returns {Array} 導航項目列表
   */
  static getVisibleNavItems(member) {
    const allItems = [
      { 
        id: 'achievements', 
        label: '政績展示',
        permission: 'achievements_view'
      },
      { 
        id: 'analytics', 
        label: '資料分析',
        permission: 'analytics_view'
      },
      { 
        id: 'cases', 
        label: '案件管理',
        permission: ['case_view_all', 'case_view_assigned'] // 任一權限即可
      },
      { 
        id: 'team', 
        label: '團隊成員',
        permission: 'team_view_all_members'
      }
    ]

    return allItems.filter(item => {
      if (Array.isArray(item.permission)) {
        // 如果是陣列，任一權限即可
        return item.permission.some(perm => this.hasPermission(member, perm))
      } else {
        return this.hasPermission(member, item.permission)
      }
    })
  }
}