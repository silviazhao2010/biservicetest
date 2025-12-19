import React, { useEffect, useState } from 'react'
import { Card, Form, Input, Select, InputNumber, Button, message, Divider, Space, Radio, Modal, Tabs, Table, Alert, Tooltip } from 'antd'
import { PlusOutlined, DeleteOutlined, SettingOutlined } from '@ant-design/icons'
import { datasetService } from '../services/datasetService'
import { dataService } from '../services/dataService'
import type { ComponentConfig, Dataset, DataTable, ConditionalDataSource, DataSourceCondition } from '../types'

interface PropertyPanelProps {
  component: ComponentConfig | null
  allComponents?: ComponentConfig[]
  onUpdateComponent: (updates: Partial<ComponentConfig>) => void
}

const PropertyPanel: React.FC<PropertyPanelProps> = ({ component, allComponents = [], onUpdateComponent }) => {
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [tables, setTables] = useState<DataTable[]>([])
  const [form] = Form.useForm()
  const [conditionalSourceModalVisible, setConditionalSourceModalVisible] = useState(false)
  const [modalTablesMap, setModalTablesMap] = useState<Record<number, DataTable[]>>({})
  const [componentDataSourceData, setComponentDataSourceData] = useState<Record<string, any[]>>({})
  const [previewData, setPreviewData] = useState<any[]>([])
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewTableName, setPreviewTableName] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  
  // 加载模态框中的表数据（必须在所有 useEffect 之前定义）
  const loadModalTables = async (datasetId: number) => {
    if (modalTablesMap[datasetId]) {
      return // 已经加载过
    }
    try {
      const data = await datasetService.getTables(datasetId)
      setModalTablesMap(prev => ({
        ...prev,
        [datasetId]: data,
      }))
    } catch (error) {
      message.error('加载数据表失败')
    }
  }
  
  // 加载组件数据源数据
  const loadComponentDataSourceData = async (sourceComponent: ComponentConfig) => {
    if (!sourceComponent || !sourceComponent.dataSource.datasetId || !sourceComponent.dataSource.tableName) {
      return
    }
    
    const cacheKey = `${sourceComponent.id}-${sourceComponent.dataSource.datasetId}-${sourceComponent.dataSource.tableName}`
    if (componentDataSourceData[cacheKey]) {
      return
    }
    
    try {
      const result = await dataService.getTableData({
        dataset_id: sourceComponent.dataSource.datasetId,
        table_name: sourceComponent.dataSource.tableName,
        limit: 1000, // 限制最多1000条
      })
      setComponentDataSourceData(prev => ({
        ...prev,
        [cacheKey]: result.data,
      }))
    } catch (error) {
      console.error('加载组件数据源失败:', error)
    }
  }
  
  // 监听条件数据源中的组件选择，自动加载数据
  useEffect(() => {
    if (!component?.dataSource?.conditionalSources || !conditionalSourceModalVisible) {
      return
    }
    
    component.dataSource.conditionalSources.forEach((source) => {
      // 为了向后兼容，支持旧的 condition 格式
      const conditions = source.conditions || (source.condition ? [source.condition] : [])
      conditions.forEach((condition) => {
        if (condition.valueType === 'component' && condition.componentId) {
          const sourceComponent = allComponents.find(c => c.id === condition.componentId)
          if (sourceComponent) {
            // 加载表结构
            if (sourceComponent.dataSource?.datasetId) {
              loadModalTables(sourceComponent.dataSource.datasetId)
            }
            // 加载数据
            if (sourceComponent.dataSource?.datasetId && sourceComponent.dataSource?.tableName) {
              loadComponentDataSourceData(sourceComponent)
            }
          }
        }
      })
    })
  }, [component?.dataSource.conditionalSources, allComponents, conditionalSourceModalVisible])

  useEffect(() => {
    loadDatasets()
  }, [])

  useEffect(() => {
    if (component?.dataSource) {
      form.setFieldsValue({
        datasetId: component.dataSource.datasetId,
        tableName: component.dataSource.tableName,
        ...component.dataSource.fields,
      })
      if (component.dataSource.datasetId) {
        loadTables(component.dataSource.datasetId)
      }
    }
  }, [component])

  const loadDatasets = async () => {
    try {
      const data = await datasetService.getDatasets()
      setDatasets(data)
    } catch (error) {
      message.error('加载数据集失败')
    }
  }

  const loadTables = async (datasetId: number) => {
    try {
      const data = await datasetService.getTables(datasetId)
      setTables(data)
    } catch (error) {
      message.error('加载数据表失败')
    }
  }

  const handleDatasetChange = (datasetId: number) => {
    if (!component?.dataSource) {
      return
    }
    
    loadTables(datasetId)
    onUpdateComponent({
      dataSource: {
        ...component.dataSource,
        datasetId,
        tableName: undefined,
        fields: {},
      },
    })
  }

  const handleTableChange = (tableName: string | undefined) => {
    if (!component?.dataSource) {
      return
    }
    
    onUpdateComponent({
      dataSource: {
        ...component.dataSource,
        tableName: tableName || undefined, // 允许为空
        fields: tableName ? {} : component.dataSource.fields, // 如果清空表名，保留字段配置
      },
    })
  }

  const handleFieldChange = (fieldKey: string, value: string) => {
    if (!component?.dataSource) {
      return
    }
    
    onUpdateComponent({
      dataSource: {
        ...component.dataSource,
        fields: {
          ...component.dataSource.fields,
          [fieldKey]: value,
        },
      },
    })
  }

  const getFieldConfig = () => {
    if (!component) {
      return []
    }
    switch (component.type) {
      case 'line_chart':
        return [
          { key: 'x', label: 'X轴字段' },
          { key: 'y', label: 'Y轴字段' },
        ]
      case 'pie_chart':
        return [
          { key: 'category', label: '分类字段' },
          { key: 'value', label: '数值字段' },
        ]
      case 'dropdown':
        return [{ key: 'option', label: '选项字段' }]
      case 'text_input':
        return []
      case 'tree_chart':
        return [
          { key: 'name', label: '名称字段' },
          { key: 'value', label: '数值字段' },
        ]
      default:
        return []
    }
  }

  // 获取当前使用的表（条件数据源时使用默认数据源的表）
  const getCurrentTable = () => {
    if (!component?.dataSource) {
      return null
    }
    
    if (component.dataSource.type === 'conditional') {
      // 条件数据源：使用默认数据源的表
      if (component.dataSource.defaultSource?.datasetId) {
        // 如果指定了表名，使用指定的表
        if (component.dataSource.defaultSource?.tableName) {
          const defaultTables = modalTablesMap[component.dataSource.defaultSource.datasetId] || []
          let table = defaultTables.find(t => t.table_name === component.dataSource.defaultSource?.tableName)
          if (!table && defaultTables.length === 0) {
            loadModalTables(component.dataSource.defaultSource.datasetId)
          }
          return table
        }
        // 如果没有指定表名，尝试从已加载的表中获取第一个表（用于字段配置）
        const defaultTables = modalTablesMap[component.dataSource.defaultSource.datasetId] || []
        if (defaultTables.length > 0) {
          return defaultTables[0]
        }
        // 如果还没有加载，触发加载
        if (defaultTables.length === 0) {
          loadModalTables(component.dataSource.defaultSource.datasetId)
        }
      }
      return null
    } else {
      // 固定数据源：使用配置的表
      if (component.dataSource.tableName) {
        return tables.find(t => t.table_name === component.dataSource.tableName)
      }
      // 如果没有指定表名，尝试从已加载的表中获取第一个表（用于字段配置）
      if (tables.length > 0) {
        return tables[0]
      }
    }
    return null
  }

  // 如果条件数据源模式下没有可用字段，尝试加载默认数据源的表
  useEffect(() => {
    if (!component?.dataSource) {
      return
    }
    
    const useConditionalSource = component.dataSource.type === 'conditional'
    if (useConditionalSource && 
        component.dataSource.defaultSource?.datasetId && 
        component.dataSource.defaultSource?.tableName) {
      const currentTable = getCurrentTable()
      const availableFields = currentTable?.schema_info.fields || []
      if (availableFields.length === 0) {
        loadModalTables(component.dataSource.defaultSource.datasetId)
      }
    }
  }, [component?.dataSource?.type, component?.dataSource?.defaultSource, component?.dataSource?.tableName, tables.length, modalTablesMap])
  
  // 如果组件为空，显示提示信息（必须在所有 hooks 之后）
  if (!component || !component.dataSource) {
    return (
      <Card title="属性配置" style={{ height: '100%', borderRadius: 0, overflow: 'auto' }}>
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#999', fontSize: '14px' }}>
          请选择一个组件进行配置
        </div>
      </Card>
    )
  }
  
  const currentTable = getCurrentTable()
  const availableFields = currentTable?.schema_info.fields || []
  const useConditionalSource = component.dataSource.type === 'conditional'
  
  const handleDataSourceTypeChange = (type: 'table' | 'conditional') => {
    if (!component?.dataSource) {
      return
    }
    
    if (type === 'conditional') {
      // 切换到条件数据源时，打开配置窗口
      onUpdateComponent({
        dataSource: {
          type: 'conditional',
          fields: component.dataSource.fields || {},
          conditionalSources: component.dataSource.conditionalSources || [],
          defaultSource: {
            datasetId: component.dataSource.datasetId || 0,
            tableName: component.dataSource.tableName,
          },
        },
      })
      setConditionalSourceModalVisible(true)
    } else {
      onUpdateComponent({
        dataSource: {
          type: 'table',
          datasetId: component.dataSource.defaultSource?.datasetId || component.dataSource.datasetId || 0,
          tableName: component.dataSource.defaultSource?.tableName || component.dataSource.tableName,
          fields: component.dataSource.fields || {},
        },
      })
    }
  }

  const handleOpenConditionalSourceModal = async () => {
    if (!component?.dataSource) {
      return
    }
    
    setConditionalSourceModalVisible(true)
    // 如果已有默认数据源，加载对应的表
    if (component.dataSource.defaultSource?.datasetId) {
      await loadModalTables(component.dataSource.defaultSource.datasetId)
    }
    // 加载所有条件数据源对应的表
    const conditionalSources = component.dataSource.conditionalSources || []
    for (const source of conditionalSources) {
      if (source.datasetId) {
        await loadModalTables(source.datasetId)
      }
    }
  }

  const handleCloseConditionalSourceModal = () => {
    setConditionalSourceModalVisible(false)
  }

  const handleSaveConditionalSource = () => {
    if (!component?.dataSource) {
      return
    }
    
    // 验证配置完整性
    if (component.dataSource.type === 'conditional') {
      // 检查是否有默认数据源
      if (!component.dataSource.defaultSource?.datasetId) {
        message.warning('请配置默认数据源')
        return
      }
      
      if (!component.dataSource.defaultSource?.datasetId) {
        message.warning('请配置默认数据集')
        return
      }
      
      // 检查条件数据源配置
      const conditionalSources = component.dataSource.conditionalSources || []
      for (let i = 0; i < conditionalSources.length; i++) {
        const source = conditionalSources[i]
        if (!source.datasetId) {
          message.warning(`条件 ${i + 1} 未配置数据集`)
          return
        }
        
        // 数据表现在是可选的，不再强制要求
        
        // 为了向后兼容，支持旧的 condition 格式
        const conditions = source.conditions || (source.condition ? [source.condition] : [])
        if (conditions.length === 0) {
          message.warning(`条件 ${i + 1} 未配置子条件`)
          return
        }
        
        for (let j = 0; j < conditions.length; j++) {
          const condition = conditions[j]
          if (!condition.operator) {
            message.warning(`条件 ${i + 1} 的子条件 ${j + 1} 未配置操作符`)
            return
          }
          
          if (condition.valueType === 'static') {
            if (condition.staticValue === undefined || condition.staticValue === null || condition.staticValue === '') {
              message.warning(`条件 ${i + 1} 的子条件 ${j + 1} 未配置静态值`)
              return
            }
          }
          
          if (condition.valueType === 'component') {
            if (!condition.componentId) {
              message.warning(`条件 ${i + 1} 的子条件 ${j + 1} 未选择来源组件`)
              return
            }
            if (!condition.componentField) {
              message.warning(`条件 ${i + 1} 的子条件 ${j + 1} 未选择组件字段`)
              return
            }
            if (condition.componentValueMode === 'fixed') {
              if (!condition.componentTargetValueSource) {
                message.warning(`条件 ${i + 1} 的子条件 ${j + 1} 未选择目标值来源`)
                return
              }
              if (condition.componentTargetValueSource === 'input' && !condition.componentTargetValue) {
                message.warning(`条件 ${i + 1} 的子条件 ${j + 1} 未配置目标值`)
                return
              }
              if (condition.componentTargetValueSource === 'datasource') {
                if (!condition.componentTargetValueField) {
                  message.warning(`条件 ${i + 1} 的子条件 ${j + 1} 未选择目标值字段`)
                  return
                }
                if (!condition.componentTargetValue) {
                  message.warning(`条件 ${i + 1} 的子条件 ${j + 1} 未选择目标值`)
                  return
                }
              }
            }
          }
        }
      }
    }
    
    // 配置已通过onUpdateComponent实时更新到组件中
    // 确保所有配置字段都被正确保存
    const updatedDataSource = {
      ...component.dataSource,
      type: 'conditional' as const,
    }
    
    // 确保条件数据源配置完整
    if (updatedDataSource.conditionalSources) {
      updatedDataSource.conditionalSources = updatedDataSource.conditionalSources.map(source => {
        // 为了向后兼容，支持旧的 condition 格式
        const conditions = source.conditions || (source.condition ? [source.condition] : [])
        return {
          ...source,
          conditions: conditions.map(condition => ({
            ...condition,
            // 确保所有字段都存在
            operator: condition.operator || '=',
            valueType: condition.valueType || 'static',
          })),
          logicOperator: source.logicOperator || 'AND',
        }
      })
    }
    
    // 更新组件配置
    onUpdateComponent({
      dataSource: updatedDataSource,
    })
    
    message.success('条件数据源配置已保存')
    setConditionalSourceModalVisible(false)
  }

  const getModalTables = (datasetId: number): DataTable[] => {
    return modalTablesMap[datasetId] || []
  }

  const handleAddConditionalSource = () => {
    if (!component?.dataSource) {
      return
    }
    
    const newCondition: ConditionalDataSource = {
      conditions: [{
        operator: '=',
        valueType: 'static',
      }],
      logicOperator: 'AND',
      datasetId: 0,
    }
    onUpdateComponent({
      dataSource: {
        ...component.dataSource,
        conditionalSources: [
          ...(component.dataSource.conditionalSources || []),
          newCondition,
        ],
      },
    })
  }

  const handleRemoveConditionalSource = (index: number) => {
    if (!component?.dataSource) {
      return
    }
    
    const newSources = [...(component.dataSource.conditionalSources || [])]
    newSources.splice(index, 1)
    onUpdateComponent({
      dataSource: {
        ...component.dataSource,
        conditionalSources: newSources,
      },
    })
  }

  const handleUpdateConditionalSource = (index: number, updates: Partial<ConditionalDataSource>) => {
    if (!component?.dataSource) {
      return
    }
    
    const newSources = [...(component.dataSource.conditionalSources || [])]
    newSources[index] = { ...newSources[index], ...updates }
    onUpdateComponent({
      dataSource: {
        ...component.dataSource,
        conditionalSources: newSources,
      },
    })
  }

  const handleUpdateSubCondition = (sourceIndex: number, conditionIndex: number, conditionUpdates: Partial<DataSourceCondition>) => {
    if (!component?.dataSource || !component.dataSource.conditionalSources) {
      return
    }
    
    const source = component.dataSource.conditionalSources[sourceIndex]
    const conditions = source.conditions || (source.condition ? [source.condition] : [])
    
    const newSources = [...(component.dataSource.conditionalSources || [])]
    newSources[sourceIndex] = {
      ...newSources[sourceIndex],
      conditions: conditions.map((cond, idx) => 
        idx === conditionIndex ? { ...cond, ...conditionUpdates } : cond
      ),
      logicOperator: source.logicOperator || 'AND',
    }
    onUpdateComponent({
      dataSource: {
        ...component.dataSource,
        conditionalSources: newSources,
      },
    })
  }

  // 数据预览功能
  const handlePreviewData = async () => {
    if (!component?.dataSource) {
      return
    }
    
    setPreviewLoading(true)
    setShowPreview(true)
    
    try {
      let datasetId: number | undefined
      let tableName: string | undefined
      
      if (component.dataSource.type === 'conditional') {
        if (component.dataSource.defaultSource) {
          datasetId = component.dataSource.defaultSource.datasetId
          tableName = component.dataSource.defaultSource.tableName
        }
      } else {
        datasetId = component.dataSource.datasetId
        tableName = component.dataSource.tableName
      }
      
      if (!datasetId) {
        message.warning('请先选择数据集')
        setPreviewLoading(false)
        return
      }
      
      const result = await dataService.getTableData({
        dataset_id: datasetId,
        table_name: tableName,
        filters: [],
        limit: 10,
      })
      
      setPreviewData(result.data || [])
      setPreviewTableName(result.table_name || tableName || '自动选择')
    } catch (error: any) {
      message.error('预览数据失败: ' + (error?.message || '未知错误'))
      setPreviewData([])
    } finally {
      setPreviewLoading(false)
    }
  }
  
  // 获取配置状态提示
  const getConfigStatus = () => {
    if (!component?.dataSource) {
      return []
    }
    
    const status: Array<{ type: 'success' | 'warning', message: string }> = []
    
    if (component.dataSource.type === 'conditional') {
      if (component.dataSource.defaultSource?.datasetId) {
        status.push({ type: 'success', message: '✅ 默认数据集已选择' })
      } else {
        status.push({ type: 'warning', message: '⚠️ 请配置默认数据集' })
      }
      
      if (component.dataSource.defaultSource?.tableName) {
        status.push({ type: 'success', message: '✅ 默认数据表已选择' })
      } else {
        status.push({ type: 'warning', message: '⚠️ 数据表未选择（将自动选择）' })
      }
    } else {
      if (component.dataSource.datasetId) {
        status.push({ type: 'success', message: '✅ 数据集已选择' })
      } else {
        status.push({ type: 'warning', message: '⚠️ 请选择数据集' })
      }
      
      if (component.dataSource.tableName) {
        status.push({ type: 'success', message: '✅ 数据表已选择' })
      } else {
        status.push({ type: 'warning', message: '⚠️ 数据表未选择（将自动选择）' })
      }
    }
    
    const fieldConfig = getFieldConfig()
    const hasAllFields = fieldConfig.every(field => component.dataSource.fields[field.key])
    if (hasAllFields && fieldConfig.length > 0) {
      status.push({ type: 'success', message: '✅ 字段已配置' })
    } else if (fieldConfig.length > 0) {
      status.push({ type: 'warning', message: '⚠️ 请配置所有必需字段' })
    }
    
    return status
  }
  
  // 获取智能提示信息
  const getSmartTips = () => {
    if (!component?.dataSource) {
      return null
    }
    
    const tips: string[] = []
    
    if (component.dataSource.type === 'table') {
      // 固定数据源提示
      if (component.dataSource.datasetId && !component.dataSource.tableName) {
        const selectedFields = Object.values(component.dataSource.fields).filter(Boolean)
        if (selectedFields.length > 0) {
          tips.push(`已选择字段：[${selectedFields.join(', ')}]，系统将自动选择包含这些字段的表`)
        }
        
      }
    }
    
    return tips.length > 0 ? tips : null
  }

  return (
    <Card title="属性配置" style={{ height: '100%', borderRadius: 0, overflow: 'auto' }}>
      <Tabs
        activeKey={component.dataSource.type || 'table'}
        onChange={(key) => handleDataSourceTypeChange(key as 'table' | 'conditional')}
        items={[
          {
            key: 'table',
            label: '固定数据源',
          },
          {
            key: 'conditional',
            label: '条件数据源',
          },
        ]}
      />
      
      <Form form={form} layout="vertical" style={{ marginTop: '16px' }}>
        {/* 配置状态提示 */}
        {getConfigStatus().length > 0 && (
          <Form.Item>
            <div style={{ marginBottom: '16px' }}>
              {getConfigStatus().map((status, index) => (
                <div key={index} style={{ fontSize: '12px', marginBottom: '4px', color: status.type === 'success' ? '#52c41a' : '#faad14' }}>
                  {status.message}
                </div>
              ))}
            </div>
          </Form.Item>
        )}
        
        {/* 智能提示 */}
        {getSmartTips() && (
          <Form.Item>
            <Alert
              message="智能提示"
              description={
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  {getSmartTips()?.map((tip, index) => (
                    <li key={index} style={{ marginBottom: '4px' }}>{tip}</li>
                  ))}
                </ul>
              }
              type="info"
              showIcon
              style={{ marginBottom: '16px' }}
            />
          </Form.Item>
        )}

        {!useConditionalSource ? (
          <>
            <Form.Item label="数据集" required>
              <Select
                value={component.dataSource.datasetId || undefined}
                onChange={handleDatasetChange}
                placeholder="请选择数据集"
                showSearch
                filterOption={(input, option) => {
                  const text = String(option?.label || option?.children || '')
                  return text.toLowerCase().includes(input.toLowerCase())
                }}
              >
                {datasets.map(ds => (
                  <Select.Option key={ds.id} value={ds.id}>
                    {ds.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            {component.dataSource.datasetId && (
              <Form.Item 
                label={
                  <span>
                    数据表
                    <Tooltip title="可选：如果不选择，系统将根据字段自动选择包含这些字段的表">
                      <span style={{ marginLeft: '4px', color: '#999', cursor: 'help' }}>?</span>
                    </Tooltip>
                  </span>
                }
              >
                <Select
                  value={component.dataSource.tableName}
                  onChange={handleTableChange}
                  placeholder="请选择数据表（可选，系统可自动选择）"
                  allowClear
                  showSearch
                  filterOption={(input, option) => {
                    const text = String(option?.label || option?.children || '')
                    return text.toLowerCase().includes(input.toLowerCase())
                  }}
                >
                  {tables.map(table => (
                    <Select.Option key={table.id} value={table.table_name}>
                      {table.display_name}
                    </Select.Option>
                  ))}
                </Select>
                {!component.dataSource.tableName && (
                  <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                    系统将根据字段自动选择最合适的表
                  </div>
                )}
              </Form.Item>
            )}
          </>
        ) : (
          <>
            <Form.Item label="条件数据源配置">
              <Button
                type="primary"
                icon={<SettingOutlined />}
                onClick={handleOpenConditionalSourceModal}
                block
              >
                配置条件数据源
              </Button>
            </Form.Item>
            {component.dataSource.conditionalSources && component.dataSource.conditionalSources.length > 0 && (
              <Form.Item label="已配置条件">
                <div style={{ fontSize: '12px', color: '#666' }}>
                  共 {component.dataSource.conditionalSources.length} 个条件数据源
                </div>
              </Form.Item>
            )}
            {component.dataSource.defaultSource && (
              <Form.Item label="默认数据源">
                <div style={{ fontSize: '12px', color: '#666' }}>
                  {datasets.find(ds => ds.id === component.dataSource.defaultSource?.datasetId)?.name || '未设置'}
                  {component.dataSource.defaultSource?.tableName && ` / ${component.dataSource.defaultSource.tableName}`}
                </div>
              </Form.Item>
            )}
          </>
        )}

        {/* 字段映射配置 */}
        {((!useConditionalSource && component.dataSource.datasetId) || 
          (useConditionalSource && component.dataSource.defaultSource?.datasetId)) && (
          <>
            <Divider orientation="left" style={{ margin: '16px 0' }}>字段映射</Divider>
            {getFieldConfig().map(field => (
              <Form.Item key={field.key} label={field.label} required>
                <Select
                  value={component.dataSource.fields[field.key]}
                  onChange={(value) => handleFieldChange(field.key, value)}
                  placeholder={`请选择${field.label}`}
                  showSearch
                  filterOption={(input, option) => {
                    const text = String(option?.label || option?.children || '')
                    return text.toLowerCase().includes(input.toLowerCase())
                  }}
                >
                  {availableFields.map(f => (
                    <Select.Option key={f.name} value={f.name}>
                      {f.name} ({f.type})
                    </Select.Option>
                  ))}
                </Select>
                {useConditionalSource && (
                  <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                    提示：字段配置基于默认数据源的表结构，所有条件数据源应使用相同的字段结构
                  </div>
                )}
              </Form.Item>
            ))}
          </>
        )}

        {/* 数据预览 */}
        {((!useConditionalSource && component.dataSource.datasetId) || 
          (useConditionalSource && component.dataSource.defaultSource?.datasetId)) && (
          <>
            <Divider orientation="left" style={{ margin: '16px 0' }}>数据预览</Divider>
            <Form.Item>
              <Button
                type="default"
                onClick={handlePreviewData}
                loading={previewLoading}
                block
              >
                预览数据
              </Button>
            </Form.Item>
            {showPreview && (
              <Form.Item>
                <Card size="small" title={`数据预览${previewTableName ? ` (表: ${previewTableName})` : ''}`}>
                  {previewLoading ? (
                    <div style={{ textAlign: 'center', padding: '20px' }}>加载中...</div>
                  ) : previewData.length > 0 ? (
                    <Table
                      dataSource={previewData}
                      columns={Object.keys(previewData[0] || {}).map(key => ({
                        title: key,
                        dataIndex: key,
                        key,
                      }))}
                      pagination={false}
                      size="small"
                      scroll={{ y: 200 }}
                    />
                  ) : (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>暂无数据</div>
                  )}
                </Card>
              </Form.Item>
            )}
          </>
        )}

        <Divider orientation="left" style={{ margin: '16px 0' }}>组件尺寸</Divider>
        <Form.Item label="宽度">
          <InputNumber
            value={component.position.width}
            onChange={(value) => onUpdateComponent({
              position: { ...component.position, width: value || 400 },
            })}
            min={100}
            max={2000}
            style={{ width: '100%' }}
          />
        </Form.Item>

        <Form.Item label="高度">
          <InputNumber
            value={component.position.height}
            onChange={(value) => onUpdateComponent({
              position: { ...component.position, height: value || 300 },
            })}
            min={100}
            max={2000}
            style={{ width: '100%' }}
          />
        </Form.Item>
      </Form>

      {/* 条件数据源配置Modal */}
      <Modal
        title="条件数据源配置"
        open={conditionalSourceModalVisible}
        onCancel={handleCloseConditionalSourceModal}
        width={1400}
        footer={[
          <Button key="cancel" onClick={handleCloseConditionalSourceModal}>
            取消
          </Button>,
          <Button key="save" type="primary" onClick={handleSaveConditionalSource}>
            保存
          </Button>,
        ]}
      >
        <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <Divider>默认数据源</Divider>
          <Form.Item label="默认数据集">
            <Select
              value={component.dataSource.defaultSource?.datasetId || undefined}
              onChange={async (datasetId) => {
                onUpdateComponent({
                  dataSource: {
                    ...component.dataSource,
                    defaultSource: {
                      ...component.dataSource.defaultSource,
                      datasetId,
                      tableName: undefined,
                    } as any,
                  },
                })
                if (datasetId) {
                  await loadModalTables(datasetId)
                }
              }}
              placeholder="请选择默认数据集"
              style={{ width: '100%' }}
            >
              {datasets.map(ds => (
                <Select.Option key={ds.id} value={ds.id}>
                  {ds.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          {component.dataSource.defaultSource?.datasetId && (
            <Form.Item label="默认数据表">
              <Select
                value={component.dataSource.defaultSource?.tableName}
                onChange={(tableName) => {
                  onUpdateComponent({
                    dataSource: {
                      ...component.dataSource,
                      defaultSource: {
                        ...component.dataSource.defaultSource,
                        tableName: tableName || undefined, // 允许为空
                      } as any,
                    },
                  })
                }}
                placeholder="请选择默认数据表（可选，系统可自动选择）"
                allowClear
                style={{ width: '100%' }}
              >
                {getModalTables(component.dataSource.defaultSource?.datasetId || 0).map(table => (
                  <Select.Option key={table.id} value={table.table_name}>
                    {table.display_name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          )}

          <Divider>条件数据源</Divider>
          {(component.dataSource.conditionalSources || []).map((source, index) => {
            // 为了向后兼容，支持旧的 condition 格式
            const conditions = source.conditions || (source.condition ? [source.condition] : [])
            const logicOperator = source.logicOperator || 'AND'
            
            return (
              <Card
                key={index}
                size="small"
                style={{ marginBottom: 16 }}
                title={`条件 ${index + 1}`}
                extra={
                  <Button
                    type="link"
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={() => handleRemoveConditionalSource(index)}
                  >
                    删除
                  </Button>
                }
              >
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Form.Item label="逻辑运算符">
                    <Radio.Group
                      value={logicOperator}
                      onChange={(e) => {
                        const newSources = [...(component.dataSource.conditionalSources || [])]
                        newSources[index] = {
                          ...newSources[index],
                          logicOperator: e.target.value,
                          conditions: conditions, // 保持现有条件
                        }
                        onUpdateComponent({
                          dataSource: {
                            ...component.dataSource,
                            conditionalSources: newSources,
                          },
                        })
                      }}
                    >
                      <Radio value="AND">AND (所有条件都满足)</Radio>
                      <Radio value="OR">OR (任一条件满足)</Radio>
                    </Radio.Group>
                  </Form.Item>
                  <Divider style={{ margin: '8px 0' }}>子条件</Divider>
                  {conditions.map((condition, conditionIndex) => (
                    <Card
                      key={conditionIndex}
                      size="small"
                      style={{ marginBottom: 8, background: '#fafafa' }}
                      title={`子条件 ${conditionIndex + 1}`}
                      extra={
                        conditions.length > 1 && (
                          <Button
                            type="link"
                            danger
                            size="small"
                            icon={<DeleteOutlined />}
                            onClick={() => {
                              const newConditions = conditions.filter((_, i) => i !== conditionIndex)
                              const newSources = [...(component.dataSource.conditionalSources || [])]
                              newSources[index] = {
                                ...newSources[index],
                                conditions: newConditions.length > 0 ? newConditions : [{
                                  operator: '=',
                                  valueType: 'static',
                                  componentValueMode: 'fixed',
                                }],
                                logicOperator: logicOperator,
                              }
                              onUpdateComponent({
                                dataSource: {
                                  ...component.dataSource,
                                  conditionalSources: newSources,
                                },
                              })
                            }}
                          >
                            删除
                          </Button>
                        )
                      }
                    >
                      <Space direction="horizontal" style={{ width: '100%' }} wrap align="baseline">
                        <Form.Item label="条件字段" style={{ marginBottom: 0, flex: 1, minWidth: '150px' }}>
                          <Select
                            value={condition.field}
                            onChange={(value) => handleUpdateSubCondition(index, conditionIndex, { field: value || undefined })}
                            placeholder="选择字段（可选）"
                            allowClear
                            style={{ width: '100%' }}
                          >
                            {source.datasetId ? (
                              (() => {
                                // 如果指定了表名，使用该表的字段；否则使用所有表的字段
                                if (source.tableName) {
                                  const table = getModalTables(source.datasetId).find(t => t.table_name === source.tableName)
                                  return table?.schema_info.fields.map((field: any) => (
                                    <Select.Option key={field.name} value={field.name}>
                                      {field.name} ({field.type})
                                    </Select.Option>
                                  )) || []
                                } else {
                                  // 如果没有指定表名，尝试从所有表中查找包含该字段的表
                                  const allTables = getModalTables(source.datasetId)
                                  const allFields = new Set<string>()
                                  allTables.forEach((table: any) => {
                                    table.schema_info.fields.forEach((field: any) => {
                                      allFields.add(field.name)
                                    })
                                  })
                                  return Array.from(allFields).map((fieldName: string) => (
                                    <Select.Option key={fieldName} value={fieldName}>
                                      {fieldName}
                                    </Select.Option>
                                  ))
                                }
                              })()
                            ) : (
                              <Select.Option value="" disabled>
                                请先选择数据表
                              </Select.Option>
                            )}
                          </Select>
                        </Form.Item>
                        <Form.Item label="操作符" style={{ marginBottom: 0, width: '120px' }}>
                          <Select
                            value={condition.operator}
                            onChange={(value) => handleUpdateSubCondition(index, conditionIndex, { operator: value })}
                            style={{ width: '100%' }}
                          >
                            <Select.Option value="=">=</Select.Option>
                            <Select.Option value="!=">!=</Select.Option>
                            <Select.Option value=">">&gt;</Select.Option>
                            <Select.Option value="<">&lt;</Select.Option>
                            <Select.Option value=">=">&gt;=</Select.Option>
                            <Select.Option value="<=">&lt;=</Select.Option>
                            <Select.Option value="IN">IN</Select.Option>
                            <Select.Option value="LIKE">LIKE</Select.Option>
                          </Select>
                        </Form.Item>
                        <Form.Item label="值类型" style={{ marginBottom: 0, width: '150px' }}>
                          <Radio.Group
                            value={condition.valueType}
                            onChange={(e) => handleUpdateSubCondition(index, conditionIndex, { valueType: e.target.value })}
                            size="small"
                          >
                            <Radio value="static">静态值</Radio>
                            <Radio value="component">组件值</Radio>
                          </Radio.Group>
                        </Form.Item>
                        {condition.valueType === 'static' ? (
                          <Form.Item label="静态值" style={{ marginBottom: 0, flex: 1, minWidth: '150px' }}>
                            <Input
                              value={condition.staticValue}
                              onChange={(e) => handleUpdateSubCondition(index, conditionIndex, { staticValue: e.target.value })}
                              placeholder="输入静态值"
                            />
                          </Form.Item>
                        ) : (
                          <>
                            <Form.Item label="来源组件" style={{ marginBottom: 0, flex: 1, minWidth: '150px' }}>
                              <Select
                                value={condition.componentId}
                                onChange={(value) => {
                                  handleUpdateSubCondition(index, conditionIndex, { componentId: value })
                                  // 当选择组件后，如果该组件有数据源，自动加载表数据
                                  if (value) {
                                    const selectedComponent = allComponents.find(c => c.id === value)
                                    if (selectedComponent?.dataSource?.datasetId) {
                                      loadModalTables(selectedComponent.dataSource.datasetId)
                                      // 如果组件有数据源，也加载数据
                                      if (selectedComponent.dataSource?.tableName) {
                                        loadComponentDataSourceData(selectedComponent)
                                      }
                                    }
                                  }
                                }}
                                placeholder="选择组件"
                                style={{ width: '100%' }}
                              >
                                {allComponents
                                  .filter(comp => comp.id !== component.id)
                                  .map(comp => (
                                    <Select.Option key={comp.id} value={comp.id}>
                                      {comp.type} ({comp.id.substring(0, 8)})
                                    </Select.Option>
                                  ))}
                              </Select>
                            </Form.Item>
                            {condition.componentId && (() => {
                              const sourceComponent = allComponents.find(c => c.id === condition.componentId)
                              const getComponentFields = (componentType?: string): Array<{ value: string, label: string }> => {
                                switch (componentType) {
                                  case 'dropdown':
                                    return [
                                      { value: 'value', label: 'value (当前选中值)' },
                                      { value: 'selectedValue', label: 'selectedValue (选中值)' },
                                    ]
                                  case 'text_input':
                                    return [
                                      { value: 'value', label: 'value (输入值)' },
                                    ]
                                  case 'line_chart':
                                    return [
                                      { value: 'x', label: 'x (X轴字段值)' },
                                      { value: 'y', label: 'y (Y轴字段值)' },
                                      { value: 'selectedData', label: 'selectedData (选中的数据)' },
                                    ]
                                  case 'pie_chart':
                                    return [
                                      { value: 'category', label: 'category (分类字段值)' },
                                      { value: 'value', label: 'value (数值字段值)' },
                                      { value: 'selectedData', label: 'selectedData (选中的数据)' },
                                    ]
                                  case 'tree_chart':
                                    return [
                                      { value: 'selectedNode', label: 'selectedNode (选中节点名称，推荐)' },
                                      { value: 'value', label: 'value (选中节点名称，与selectedNode相同)' },
                                      { value: 'selectedNodePath', label: 'selectedNodePath (完整路径数组)' },
                                    ]
                                  default:
                                    return [
                                      { value: 'value', label: 'value (默认值)' },
                                    ]
                                }
                              }
                              const availableFields = getComponentFields(sourceComponent?.type)
                              
                              return (
                                <Form.Item label="组件字段" style={{ marginBottom: 0, flex: 1, minWidth: '150px' }}>
                                  <Select
                                    value={condition.componentField}
                                    onChange={(value) => handleUpdateSubCondition(index, conditionIndex, { componentField: value || undefined })}
                                    placeholder="选择组件字段"
                                    allowClear
                                    style={{ width: '100%' }}
                                  >
                                    {availableFields.map(field => (
                                      <Select.Option key={field.value} value={field.value}>
                                        {field.label}
                                      </Select.Option>
                                    ))}
                                  </Select>
                                </Form.Item>
                              )
                            })()}
                          </>
                        )}
                      </Space>
                      {/* 组件值的额外配置（值匹配方式等）保持垂直布局 */}
                      {condition.valueType === 'component' && condition.componentId && (() => {
                        const sourceComponent = allComponents.find(c => c.id === condition.componentId)
                        
                        // 获取组件数据源数据
                        const getComponentDataSourceData = () => {
                          if (!sourceComponent || !sourceComponent.dataSource.datasetId || !sourceComponent.dataSource.tableName) {
                            return []
                          }
                          const cacheKey = `${sourceComponent.id}-${sourceComponent.dataSource.datasetId}-${sourceComponent.dataSource.tableName}`
                          return componentDataSourceData[cacheKey] || []
                        }
                        
                        // 获取组件数据源表结构
                        const getComponentDataSourceTable = () => {
                          if (!sourceComponent || !sourceComponent.dataSource.datasetId || !sourceComponent.dataSource.tableName) {
                            return null
                          }
                          // 从modalTablesMap中查找，如果不存在则尝试加载
                          const tables = modalTablesMap[sourceComponent.dataSource.datasetId] || []
                          let table = tables.find(t => t.table_name === sourceComponent.dataSource.tableName)
                          
                          // 如果表中不存在，尝试加载
                          if (!table && sourceComponent.dataSource.datasetId) {
                            // 触发加载表数据
                            loadModalTables(sourceComponent.dataSource.datasetId)
                          }
                          
                          return table
                        }
                        
                        const componentTable = getComponentDataSourceTable()
                        const componentData = getComponentDataSourceData()
                        
                        // 当选择组件且有数据源时，自动加载数据
                        if (sourceComponent && sourceComponent.dataSource.datasetId) {
                          // 如果有明确指定的表名，加载数据
                          if (sourceComponent.dataSource.tableName) {
                            loadComponentDataSourceData(sourceComponent)
                          } else {
                            // 如果没有明确指定表名，尝试加载表列表，以便后续可能自动选择表
                            loadModalTables(sourceComponent.dataSource.datasetId)
                          }
                        }
                        
                        // 检查是否可以启用"从数据源选择"选项
                        // 条件：来源组件有datasetId，并且（有明确指定的tableName，或者可以从已加载的表中获取表结构）
                        const canUseDataSource = sourceComponent?.dataSource.datasetId && (
                          sourceComponent.dataSource.tableName || 
                          (modalTablesMap[sourceComponent.dataSource.datasetId] || []).length > 0
                        )
                        
                        // 获取表结构：优先使用明确指定的表名，否则使用已加载的第一个表
                        let availableTable = componentTable
                        if (!availableTable && sourceComponent?.dataSource.datasetId) {
                          const availableTables = modalTablesMap[sourceComponent.dataSource.datasetId] || []
                          if (availableTables.length > 0) {
                            availableTable = availableTables[0]
                          }
                        }
                        
                        return (
                          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f0f0f0' }}>
                            <Form.Item label="目标值来源">
                              <Radio.Group
                                value={condition.componentTargetValueSource || 'input'}
                                onChange={(e) => handleUpdateSubCondition(index, conditionIndex, { 
                                  componentTargetValueSource: e.target.value,
                                  componentTargetValue: undefined,
                                  componentTargetValueField: undefined,
                                })}
                              >
                                <Radio value="input">手动输入</Radio>
                                <Radio value="datasource" disabled={!canUseDataSource}>
                                  从数据源选择
                                  {!canUseDataSource && sourceComponent?.dataSource.datasetId && !sourceComponent.dataSource.tableName && (
                                    <span style={{ fontSize: '12px', color: '#999', marginLeft: '8px' }}>
                                      (需要来源组件配置数据表)
                                    </span>
                                  )}
                                </Radio>
                              </Radio.Group>
                            </Form.Item>
                            {condition.componentTargetValueSource === 'input' ? (
                              <Form.Item label="目标值">
                                <Input
                                  value={condition.componentTargetValue}
                                  onChange={(e) => handleUpdateSubCondition(index, conditionIndex, { componentTargetValue: e.target.value })}
                                  placeholder="输入要匹配的值"
                                />
                              </Form.Item>
                            ) : condition.componentTargetValueSource === 'datasource' ? (
                              availableTable ? (
                                <>
                                  <Form.Item label="选择字段">
                                    <Select
                                      value={condition.componentTargetValueField}
                                      onChange={(value) => handleUpdateSubCondition(index, conditionIndex, { 
                                        componentTargetValueField: value,
                                        componentTargetValue: undefined,
                                      })}
                                      placeholder="选择字段"
                                      style={{ width: '100%' }}
                                    >
                                      {availableTable.schema_info.fields.map((field: any) => (
                                        <Select.Option key={field.name} value={field.name}>
                                          {field.name} ({field.type})
                                        </Select.Option>
                                      ))}
                                    </Select>
                                  </Form.Item>
                                  {condition.componentTargetValueField && (
                                    <Form.Item label="选择值">
                                      <Select
                                        value={condition.componentTargetValue}
                                        onChange={(value) => handleUpdateSubCondition(index, conditionIndex, { componentTargetValue: value })}
                                        placeholder="从数据源选择值"
                                        showSearch
                                        filterOption={(input, option) =>
                                          String(option?.children || '').toLowerCase().includes(input.toLowerCase())
                                        }
                                        style={{ width: '100%' }}
                                      >
                                        {Array.from(new Set(componentData.map((item: any) => {
                                          const fieldValue = item[condition.componentTargetValueField || '']
                                          return fieldValue !== undefined && fieldValue !== null ? String(fieldValue) : null
                                        }).filter((v): v is string => v !== null))).map((value: string, idx: number) => (
                                          <Select.Option key={idx} value={value}>
                                            {value}
                                          </Select.Option>
                                        ))}
                                      </Select>
                                    </Form.Item>
                                  )}
                                </>
                              ) : (
                                <div style={{ padding: '12px', textAlign: 'center', color: '#999', fontSize: '12px' }}>
                                  无法获取来源组件的数据表结构，请确保来源组件已配置数据源和数据表
                                </div>
                              )
                            ) : null}
                          </div>
                        )
                      })()}
                    </Card>
                  ))}
                  <Button
                    type="dashed"
                    onClick={() => {
                      const newConditions = [...conditions, {
                        operator: '=' as const,
                        valueType: 'static' as const,
                      }]
                      const newSources = [...(component.dataSource.conditionalSources || [])]
                      newSources[index] = {
                        ...newSources[index],
                        conditions: newConditions,
                        logicOperator: logicOperator,
                      }
                      onUpdateComponent({
                        dataSource: {
                          ...component.dataSource,
                          conditionalSources: newSources,
                        },
                      })
                    }}
                    block
                    icon={<PlusOutlined />}
                  >
                    添加子条件
                  </Button>
                  <Divider style={{ margin: '16px 0' }}>数据源配置</Divider>
                  <Form.Item label="数据集">
                    <Select
                      value={source.datasetId}
                      onChange={async (datasetId) => {
                        handleUpdateConditionalSource(index, { datasetId })
                        if (datasetId) {
                          await loadModalTables(datasetId)
                        }
                      }}
                      placeholder="选择数据集"
                      style={{ width: '100%' }}
                    >
                      {datasets.map(ds => (
                        <Select.Option key={ds.id} value={ds.id}>
                          {ds.name}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                  {source.datasetId && (
                    <Form.Item label="数据表">
                      <Select
                        value={source.tableName}
                        onChange={(tableName) => {
                          handleUpdateConditionalSource(index, { tableName: tableName || undefined })
                          // 如果选择了数据表，检查条件字段是否在新表中存在
                          // 为了向后兼容，支持旧的 condition 格式
                          const conditions = source.conditions || (source.condition ? [source.condition] : [])
                          conditions.forEach((cond, condIdx) => {
                            if (tableName && cond.field) {
                              const newTable = getModalTables(source.datasetId).find(t => t.table_name === tableName)
                              const fieldExists = newTable?.schema_info.fields.some((f: any) => f.name === cond.field)
                              if (!fieldExists) {
                                handleUpdateSubCondition(index, condIdx, { field: undefined })
                              }
                            }
                          })
                        }}
                        placeholder="选择数据表（可选，系统可自动选择）"
                        allowClear
                        style={{ width: '100%' }}
                      >
                        {getModalTables(source.datasetId).map(table => (
                          <Select.Option key={table.id} value={table.table_name}>
                            {table.display_name}
                          </Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                  )}
                </Space>
              </Card>
            )
          })}
          <Button
            type="dashed"
            onClick={handleAddConditionalSource}
            block
            icon={<PlusOutlined />}
          >
            添加条件数据源
          </Button>
        </div>
      </Modal>
    </Card>
  )
}

export default PropertyPanel

