# 报表BI系统 Demo

基于React + Flask的报表BI系统演示项目。

## 技术栈

### 后端
- Python 3.8+
- Flask 3.0.0
- SQLite

### 前端
- React 18
- TypeScript
- Ant Design
- ECharts
- react-dnd

## 项目结构

```
biservicetest/
├── app/                    # Flask后端应用
│   ├── __init__.py
│   ├── config.py
│   ├── models/            # 数据模型
│   ├── api/               # API路由
│   └── services/          # 业务逻辑
├── frontend/              # React前端应用
│   ├── src/
│   │   ├── components/   # React组件
│   │   ├── pages/        # 页面组件
│   │   ├── services/     # API服务
│   │   └── types/        # TypeScript类型
│   └── package.json
├── database/              # 系统数据库
├── datasets/              # 业务数据集
├── app.py                 # Flask应用入口
├── init_db.py             # 数据库初始化脚本
└── requirements.txt       # Python依赖
```

## 快速开始

### 1. 后端设置

```bash
# 安装Python依赖
pip install -r requirements.txt

# 初始化数据库
python init_db.py

# 启动Flask服务
python app.py
```

后端服务将在 http://localhost:5000 启动

### 2. 前端设置

```bash
# 进入前端目录
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

前端应用将在 http://localhost:3000 启动

## 功能说明

### 已实现功能

1. **数据集管理**
   - 查看数据集列表
   - 创建数据集
   - 查看数据表结构

2. **报表设计**
   - 拖拽式报表设计器
   - 支持多种图表类型（折线图、饼图、下拉列表、文本框、树图）
   - 组件属性配置
   - 数据源绑定

3. **报表管理**
   - 报表列表
   - 创建报表
   - 编辑报表
   - 删除报表

### 使用流程

1. 访问 http://localhost:3000
2. 点击"新建报表"进入报表设计器
3. 从左侧组件库选择组件添加到画布
4. 在右侧属性面板配置数据源和字段
5. 点击"保存"保存报表
6. 点击"预览"按钮查看报表效果
7. 在报表列表中也可以点击"预览"快速查看报表

## API接口

### 数据集接口
- `GET /api/datasets` - 获取数据集列表
- `POST /api/datasets` - 创建数据集
- `GET /api/datasets/{id}/tables` - 获取数据表列表

### 报表接口
- `GET /api/reports` - 获取报表列表
- `POST /api/reports` - 创建报表
- `GET /api/reports/{id}` - 获取报表详情
- `PUT /api/reports/{id}` - 更新报表
- `DELETE /api/reports/{id}` - 删除报表

### 数据查询接口
- `POST /api/data/query` - 执行SQL查询
- `POST /api/data/table-data` - 获取数据表数据

## 注意事项

1. 首次运行需要执行 `python init_db.py` 初始化数据库
2. 示例数据集会自动创建在 `datasets/sample.db`
3. 前端开发服务器已配置代理，API请求会自动转发到后端

## 开发说明

### 后端开发
- Flask应用使用Blueprint组织路由
- 数据模型使用SQLite直接操作
- 服务层封装业务逻辑

### 前端开发
- 使用TypeScript进行类型安全开发
- 组件化设计，易于扩展
- 使用react-dnd实现拖拽功能
- 使用ECharts渲染图表

## 后续扩展

- [ ] 支持更多图表类型
- [ ] 报表预览和导出
- [ ] 用户权限管理
- [ ] 报表模板功能
- [ ] 数据过滤器高级配置

