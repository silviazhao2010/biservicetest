# 测试说明

## 测试用例：报表设计器组件拖动和配置测试

### 测试覆盖范围

1. **拖动组件到画布**
   - 从组件库拖动组件到画布
   - 添加多个组件到画布

2. **单击组件选择**
   - 单击组件显示属性面板
   - 选择组件后显示配置选项

3. **配置数据源**
   - 选择数据集
   - 选择数据表
   - 配置字段映射

4. **渲染图表**
   - 配置数据源后渲染图表
   - 配置完整数据源后加载并显示数据

5. **错误处理**
   - 数据加载失败时的错误处理
   - 数据集加载失败时的错误提示

6. **组件交互**
   - 取消选择组件
   - 删除组件

### 运行测试

```bash
# 运行所有测试
npm test

# 运行测试并查看覆盖率
npm run test:coverage

# 运行测试 UI
npm run test:ui

# 监听模式运行测试
npm test -- --watch
```

### 测试文件结构

```
frontend/src/__tests__/
├── setup.ts              # 测试环境配置
├── ReportDesigner.test.tsx  # 报表设计器测试用例
└── README.md             # 测试说明文档
```

### 注意事项

1. 测试使用了 Vitest 作为测试框架
2. 使用 @testing-library/react 进行组件测试
3. 使用 jsdom 模拟浏览器环境
4. Mock 了所有外部依赖（API 服务、路由等）
5. 测试需要安装依赖：`npm install`

### Mock 说明

- `datasetService`: Mock 数据集相关 API
- `dataService`: Mock 数据查询相关 API
- `reportService`: Mock 报表相关 API
- `react-router-dom`: Mock 路由相关功能
- `antd`: Mock Ant Design 的 message 组件
- `echarts-for-react`: Mock ECharts 组件

