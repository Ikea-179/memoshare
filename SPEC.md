# 共享备忘录应用 - 技术规格文档

## 1. 项目概述

- **项目名称**: MemoShare (共享备忘录)
- **项目类型**: 响应式Web应用 (PWA)
- **核心功能**: 支持多用户协作的事项管理，支持文字/图片内容，支持截止日期和重复事项
- **目标用户**: 情侣、家庭、团队等需要共享事项的场景

## 2. 技术栈

### 前端
- React 18 + TypeScript
- Vite (构建工具)
- TailwindCSS (样式)
- Socket.io-client (实时通信)
- React Router (路由)

### 后端
- Node.js + Express
- Socket.io (WebSocket实时同步)
- SQLite + better-sqlite3 JWT (身份 (数据库)
-认证)
- bcrypt (密码加密)
- multer (文件上传)

## 3. 数据结构设计

### 用户表 (users)
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  nickname TEXT,
  avatar TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 备忘录组表 (memo_groups)
```sql
CREATE TABLE memo_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  created_by INTEGER REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 组成员表 (group_members)
```sql
CREATE TABLE group_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id INTEGER REFERENCES memo_groups(id),
  user_id INTEGER REFERENCES users(id),
  role TEXT DEFAULT 'member',
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(group_id, user_id)
);
```

### 备忘录事项表 (memos)
```sql
CREATE TABLE memos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id INTEGER REFERENCES memo_groups(id),
  content TEXT NOT NULL,
  image_url TEXT,
  due_date DATE,
  is_recurring INTEGER DEFAULT 0,
  recurring_type TEXT,
  is_completed INTEGER DEFAULT 0,
  completed_by INTEGER REFERENCES users(id),
  completed_at DATETIME,
  created_by INTEGER REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 4. 功能模块

### 4.1 用户认证
- 注册/登录
- JWT token认证
- 密码加密存储

### 4.2 备忘录管理
- 创建/编辑/删除事项
- 上传图片
- 设置截止日期
- 设置重复（每日/每周/每月）
- 标记完成/取消完成

### 4.3 协作功能
- 创建备忘录组
- 邀请成员
- 成员管理
- 实时同步
- 操作通知

### 4.4 数据备份
- 导出JSON数据
- 导入JSON数据

## 5. API设计

### 认证
- POST /api/auth/register - 注册
- POST /api/auth/login - 登录
- GET /api/auth/me - 获取当前用户

### 备忘录组
- GET /api/groups - 获取用户的所有组
- POST /api/groups - 创建组
- GET /api/groups/:id - 获取组详情
- POST /api/groups/:id/members - 添加成员
- DELETE /api/groups/:id/members/:userId - 移除成员

### 备忘录
- GET /api/groups/:groupId/memos - 获取组内所有备忘录
- POST /api/groups/:groupId/memos - 创建备忘录
- PUT /api/memos/:id - 更新备忘录
- DELETE /api/memos/:id - 删除备忘录
- PATCH /api/memos/:id/complete - 标记完成
- PATCH /api/memos/:id/uncomplete - 取消完成

### 文件
- POST /api/upload - 上传图片
- GET /uploads/* - 静态文件服务

### 备份
- GET /api/backup/export - 导出数据
- POST /api/backup/import - 导入数据
