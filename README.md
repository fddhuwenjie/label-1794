# TimelineGPT

一款现代化的 AI 对话界面，基于 React + Express + SQLite 构建。

## 功能特性

- 双栏布局：可折叠侧边栏 + 对话主体区域
- 对话管理：创建、删除、重命名对话，历史记录含标题/时间戳/预览
- 用户系统：注册、登录、密码找回、个人资料编辑
- 设置模块：主题切换（深色/浅色）、字体大小调整、对话行为配置（Enter 发送、时间戳显示、自动滚动）
- 响应式设计：适配桌面端、平板及移动设备
- AI 交互：对话输入/发送/接收，含加载状态指示器
- 演示模式：未配置 API 密钥时自动启用模拟回复

## How to Run

### Docker 启动（推荐）

```bash
docker-compose up --build -d
```

- 前端访问：http://localhost:8081
- 后端 API：http://localhost:8794

停止服务：

```bash
docker-compose down
```

### 本地启动

1. 启动后端：

```bash
cd backend
npm install
npm start
```

后端运行在 http://localhost:8794

2. 启动前端：

```bash
cd frontend
npm install
npm run dev
```

前端运行在 http://localhost:8081

## Services

| 服务 | 端口 | 说明 |
|------|------|------|
| Frontend | 8081 | React SPA，Vite + TailwindCSS 构建 |
| Backend | 8794 | Express REST API，SQLite 数据存储 |

### API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/auth/register | 用户注册 |
| POST | /api/auth/login | 用户登录 |
| GET | /api/auth/me | 获取当前用户信息 |
| PUT | /api/auth/me | 更新用户资料 |
| POST | /api/auth/reset-password | 请求密码重置 |
| POST | /api/auth/reset-password/confirm | 确认密码重置 |
| GET | /api/conversations | 获取对话列表 |
| POST | /api/conversations | 创建新对话 |
| GET | /api/conversations/:id | 获取对话详情及消息 |
| PUT | /api/conversations/:id | 重命名对话 |
| DELETE | /api/conversations/:id | 删除对话 |
| POST | /api/chat/:conversationId/messages | 发送消息并获取 AI 回复 |
| GET | /api/health | 健康检查 |

## 测试账号

| 用户名 | 密码 | 邮箱 |
|--------|------|------|
| testuser | password123 | test@timelinegpt.com |
| demo | password123 | demo@timelinegpt.com |

## 题目内容

设计并开发一款名为TimelineGPT的AI交互界面网站，需实现以下完整功能与设计要求： 

1. **整体布局结构**： 
- 采用双栏式布局，左侧为可折叠侧边栏，右侧为对话主体区域 
- 侧边栏底部集成设置UI模块，支持用户个性化配置 
- 侧边栏主要功能为展示用户历史对话记录，需包含对话标题、时间戳及预览内容 
- 右侧主体区域为对话界面，包含消息气泡展示区和底部输入框组件 

2. **核心功能模块**： 
- 对话管理：支持创建新对话、删除对话、重命名对话功能 
- 用户系统：实现完整的用户注册、登录、密码找回功能，包含用户信息管理界面 
- 响应式设计：确保在桌面端、平板及移动设备上均有良好显示效果和交互体验 
- AI交互：实现完整的对话输入、发送、接收AI响应功能，包含加载状态显示 

3. **界面设计要求**： 
- 视觉风格：采用现代简约设计语言，界面美观大气，符合Awwwards级别的UI标准 
- 色彩方案：设计专业的配色系统，包含主色、辅助色及中性色，确保视觉层次感 
- 交互体验：添加平滑过渡动画、悬停效果及微交互，提升用户体验 
- 排版系统：建立清晰的字体层级结构，确保文本内容易读性 

4. **技术架构要求**： 
- 前端：采用现代JavaScript框架构建，实现组件化开发，确保代码可维护性 
- 后端：设计完整的服务端架构，包含用户认证、对话数据存储等功能模块 
- API集成：预留AI服务API集成接口（API令牌后续提供，当前仅需设计接口结构） 
- 数据存储：实现用户数据、对话历史的持久化存储方案 

5. **性能与安全要求**： 
- 前端性能优化：实现代码分割、懒加载等性能优化策略 
- 数据安全：确保用户认证安全，实现敏感数据加密存储 
- 错误处理：添加全面的错误处理机制，提供友好的错误提示 

请基于以上需求，设计并开发完整的TimelineGPT网站，包含前后端完整实现及美观大气的用户界面。

## AI 服务说明

- 当 `AI_API_KEY` 未配置时，系统运行在演示模式，AI 回复为模拟数据
- API 响应中 `isMock: true` 字段标识当前回复是否为模拟数据
- 前端底部会显示"演示模式"提示
- 支持通过 `.env` 配置不同的 AI 提供商（API URL、模型、Token 上限、系统提示词）

## 密码重置说明

当前密码重置为简化实现（直接返回令牌），生产环境应集成邮件服务。API 响应中包含 `_notice` 字段说明此限制。

## 日志系统

- 后端使用文件 + 控制台双输出日志，日志文件位于 `backend/data/logs/`
- 支持 `LOG_LEVEL` 环境变量（error / warn / info / debug）
- 包含请求日志中间件，记录所有 HTTP 请求
