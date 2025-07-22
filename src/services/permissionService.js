// src/services/permissionService.js
export class PermissionService {
  
  // 定義權限映射表
  static PERMISSIONS = {
    // 案件管理相關
    'case_view_all': ['politician', 'leader', 'staff'],    // 修改：幕僚也能查看所有案件
    'case_view_assigned': ['staff'],                        // 查看被分配的案件
    'case_create': ['politician', 'leader', 'staff'],      // 修改：加入 staff，幕僚可以建立案件
    'case_edit': ['politician', 'leader', 'staff'],        // 新增：幕僚可以編輯案件
    'case_assign': ['politician', 'leader'],               // 分配案件（保持原樣，只有政治人物和負責人）
    'case_delete': ['politician', 'leader'],               // 刪除案件（保持原樣，只有政治人物和負責人）
    
    // 團隊管理相關
    'team_invite': ['politician', 'leader'],               // 生成邀請碼
    'team_remove_member': ['politician', 'leader'],        // 移除成員
    'team_view_all_members': ['politician', 'leader', 'staff'], // 查看所有成員
    
    // 分析功能
    'analytics_view': ['politician', 'leader'],            // 查看資料分析
    'achievements_view': ['politician', 'leader']          // 查看政績展示
  }

  /**
   * 檢查用戶是否有特定權限
   * @param {Object} member - 成員物件
   * @param {string} permission - 權限名稱
   * @returns {boolean} 是否有權限
   */
  static hasPermission(member, permission) {
    console.log(`=== PermissionService.hasPermission ===`);
    console.log(`檢查權限: ${permission}`);
    console.log(`成員資料:`, {
      id: member?.id,
      name: member?.name,
      role: member?.role,
      is_leader: member?.is_leader
    });
    
    if (!member || !permission) {
      console.log('成員或權限為空，返回 false');
      return false;
    }
    
    const allowedRoles = this.PERMISSIONS[permission];
    console.log(`權限 ${permission} 允許的角色:`, allowedRoles);
    
    if (!allowedRoles) {
      console.log(`未知權限: ${permission}，返回 false`);
      return false;
    }
    
    // 檢查是否為領導者
    if (member.is_leader && allowedRoles.includes('leader')) {
      console.log('成員是領導者且權限允許 leader，返回 true');
      return true;
    }
    
    // 檢查角色權限
    if (member.role && allowedRoles.includes(member.role)) {
      console.log(`成員角色 ${member.role} 在允許列表中，返回 true`);
      return true;
    }
    
    console.log('權限檢查失敗，返回 false');
    return false;
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

  /**
   * 取得成員的角色標籤（中文顯示）
   * @param {Object} member - 成員物件
   * @returns {string} 角色標籤
   */
  static getRoleLabel(member) {
    if (!member) return '未知角色';
    
    if (member.is_leader) {
      return '負責人';
    }
    
    switch (member.role) {
      case 'politician':
        return '政治人物';
      case 'staff':
        return '幕僚';
      case 'volunteer':
        return '志工';
      case 'admin':
        return '管理員';
      default:
        return member.role || '未設定角色';
    }
  }

  /**
   * 除錯方法：顯示成員的詳細權限資訊
   * @param {Object} member - 成員物件
   * @returns {Object} 權限除錯資訊
   */
  static debugMemberPermissions(member) {
    const debugInfo = {
      member: {
        id: member?.id,
        name: member?.name,
        role: member?.role,
        is_leader: member?.is_leader
      },
      roleLabel: this.getRoleLabel(member),
      permissions: {}
    };

    // 檢查所有權限
    Object.keys(this.PERMISSIONS).forEach(permission => {
      debugInfo.permissions[permission] = this.hasPermission(member, permission);
    });

    console.log('=== 權限除錯資訊 ===', debugInfo);
    return debugInfo;
  }
}