import React, { useEffect, useState } from 'react'
import { Card, Form, Input, Select, InputNumber, Button, message, Divider, Space, Switch, Radio, Modal } from 'antd'
import { PlusOutlined, DeleteOutlined, SettingOutlined } from '@ant-design/icons'
import { datasetService } from '../services/datasetService'
import { dataService } from '../services/dataService'
import type { ComponentConfig, Dataset, DataTable, ComponentRelation, ConditionalDataSource, DataSourceCondition } from '../types'

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
    if (!component || !component.dataSource.conditionalSources || !conditionalSourceModalVisible) {
      return
    }
    
    component.dataSource.conditionalSources.forEach((source) => {
      if (source.condition.valueType === 'component' && source.condition.componentId) {
        const sourceComponent = allComponents.find(c => c.id === source.condition.componentId)
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
  }, [component?.dataSource.conditionalSources, allComponents, conditionalSourceModalVisible])

  useEffect(() => {
    loadDatasets()
  }, [])

  useEffect(() => {
    if (component) {
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
    loadTables(datasetId)
    onUpdateComponent({
      dataSource: {
        ...component!.dataSource,
        datasetId,
        tableName: undefined,
        fields: {},
      },
    })
  }

  const handleTableChange = (tableName: string) => {
    const table = tables.find(t => t.table_name === tableName)
    if (table) {
      onUpdateComponent({
        dataSource: {
          ...component!.dataSource,
          tableName,
        },
      })
    }
  }

  const handleFieldChange = (fieldKey: string, value: string) => {
    onUpdateComponent({
      dataSource: {
        ...component!.dataSource,
        fields: {
          ...component!.dataSource.fields,
          [fieldKey]: value,
        },
      },
    })
  }

  if (!component) {
    return (
      <Card title="属性配置" style={{ height: '100%', borderRadius: 0 }}>
        <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
          请选择一个组件
        </div>
      </Card>
    )
  }

  const getFieldConfig = () => {
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

  const currentTable = tables.find(t => t.table_name === component.dataSource.tableName)
  const availableFields = currentTable?.schema_info.fields || []
  const useConditionalSource = component.dataSource.type === 'conditional'

  const handleDataSourceTypeChange = (type: 'table' | 'conditional') => {
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
    // 验证配置完整性
    if (component.dataSource.type === 'conditional') {
      // 检查是否有默认数据源
      if (!component.dataSource.defaultSource?.datasetId) {
        message.warning('请配置默认数据源')
        return
      }
      
      if (!component.dataSource.defaultSource?.tableName) {
        message.warning('请配置默认数据表')
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
        
        if (!source.tableName) {
          message.warning(`条件 ${i + 1} 未配置数据表`)
          return
        }
        
        const condition = source.condition
        if (!condition.operator) {
          message.warning(`条件 ${i + 1} 未配置操作符`)
          return
        }
        
        if (condition.valueType === 'static') {
          if (condition.staticValue === undefined || condition.staticValue === null || condition.staticValue === '') {
            message.warning(`条件 ${i + 1} 未配置静态值`)
            return
          }
        }
        
        if (condition.valueType === 'component') {
          if (!condition.componentId) {
            message.warning(`条件 ${i + 1} 未选择来源组件`)
            return
          }
          if (!condition.componentField) {
            message.warning(`条件 ${i + 1} 未选择组件字段`)
            return
          }
          if (condition.componentValueMode === 'fixed') {
            if (!condition.componentTargetValueSource) {
              message.warning(`条件 ${i + 1} 未选择目标值来源`)
              return
            }
            if (condition.componentTargetValueSource === 'input' && !condition.componentTargetValue) {
              message.warning(`条件 ${i + 1} 未配置目标值`)
              return
            }
            if (condition.componentTargetValueSource === 'datasource') {
              if (!condition.componentTargetValueField) {
                message.warning(`条件 ${i + 1} 未选择目标值字段`)
                return
              }
              if (!condition.componentTargetValue) {
                message.warning(`条件 ${i + 1} 未选择目标值`)
                return
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
      updatedDataSource.conditionalSources = updatedDataSource.conditionalSources.map(source => ({
        ...source,
        condition: {
          ...source.condition,
          // 确保所有字段都存在
          operator: source.condition.operator || '=',
          valueType: source.condition.valueType || 'static',
        },
      }))
    }
    
    // 更新组件配置
    onUpdateComponent({
      dataSource: updatedDataSource,
    })
    
    message.success('条件数据源配置已保存')
    setConditionalSourceModalVisible(false)
  }

  const loadModalTables = async (datasetId: number) => {
    // 如果已经加载过，直接返回
    if (modalTablesMap[datasetId]) {
      return
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

  const getModalTables = (datasetId: number): DataTable[] => {
    return modalTablesMap[datasetId] || []
  }

  const handleAddConditionalSource = () => {
    const newCondition: ConditionalDataSource = {
      condition: {
        operator: '=',
        valueType: 'static',
      },
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
    const newSources = [...(component.dataSource.conditionalSources || [])]
    newSources[index] = { ...newSources[index], ...updates }
    onUpdateComponent({
      dataSource: {
        ...component.dataSource,
        conditionalSources: newSources,
      },
    })
  }

  const handleUpdateCondition = (sourceIndex: number, conditionUpdates: Partial<DataSourceCondition>) => {
    const newSources = [...(component.dataSource.conditionalSources || [])]
    newSources[sourceIndex] = {
      ...newSources[sourceIndex],
      condition: {
        ...newSources[sourceIndex].condition,
        ...conditionUpdates,
      },
    }
    onUpdateComponent({
      dataSource: {
        ...component.dataSource,
        conditionalSources: newSources,
      },
    })
  }

  return (
    <Card title="属性配置" style={{ height: '100%', borderRadius: 0, overflow: 'auto' }}>
      <Form form={form} layout="vertical">
        <Form.Item label="数据源类型">
          <Radio.Group
            value={component.dataSource.type || 'table'}
            onChange={(e) => handleDataSourceTypeChange(e.target.value)}
          >
            <Radio value="table">固定数据源</Radio>
            <Radio value="conditional">条件数据源</Radio>
          </Radio.Group>
        </Form.Item>

        {!useConditionalSource ? (
          <>
            <Form.Item label="数据集">
              <Select
                value={component.dataSource.datasetId || undefined}
                onChange={handleDatasetChange}
                placeholder="请选择数据集"
              >
                {datasets.map(ds => (
                  <Select.Option key={ds.id} value={ds.id}>
                    {ds.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
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

        {!useConditionalSource && component.dataSource.datasetId && (
          <Form.Item label="数据表">
            <Select
              value={component.dataSource.tableName}
              onChange={handleTableChange}
              placeholder="请选择数据表"
            >
              {tables.map(table => (
                <Select.Option key={table.id} value={table.table_name}>
                  {table.display_name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        )}

        {(!useConditionalSource && component.dataSource.tableName) && getFieldConfig().map(field => (
          <Form.Item key={field.key} label={field.label}>
            <Select
              value={component.dataSource.fields[field.key]}
              onChange={(value) => handleFieldChange(field.key, value)}
              placeholder={`请选择${field.label}`}
            >
              {availableFields.map(f => (
                <Select.Option key={f.name} value={f.name}>
                  {f.name} ({f.type})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        ))}

        <Form.Item label="宽度">
          <InputNumber
            value={component.position.width}
            onChange={(value) => onUpdateComponent({
              position: { ...component.position, width: value || 400 },
            })}
            min={100}
            max={2000}
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
          />
        </Form.Item>
      </Form>

      {/* 条件数据源配置Modal */}
      <Modal
        title="条件数据源配置"
        open={conditionalSourceModalVisible}
        onCancel={handleCloseConditionalSourceModal}
        width={800}
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
                        tableName,
                      } as any,
                    },
                  })
                }}
                placeholder="请选择默认数据表"
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
                  <Form.Item label="条件字段">
                    <Select
                      value={source.condition.field}
                      onChange={(value) => handleUpdateCondition(index, { field: value || undefined })}
                      placeholder="选择字段（可选）"
                      allowClear
                      style={{ width: '100%' }}
                    >
                      {source.datasetId && source.tableName ? (
                        getModalTables(source.datasetId)
                          .find(t => t.table_name === source.tableName)
                          ?.schema_info.fields.map((field: any) => (
                            <Select.Option key={field.name} value={field.name}>
                              {field.name} ({field.type})
                            </Select.Option>
                          ))
                      ) : (
                        <Select.Option value="" disabled>
                          请先选择数据表
                        </Select.Option>
                      )}
                    </Select>
                  </Form.Item>
                  <Form.Item label="操作符">
                    <Select
                      value={source.condition.operator}
                      onChange={(value) => handleUpdateCondition(index, { operator: value })}
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
                  <Form.Item label="值类型">
                    <Radio.Group
                      value={source.condition.valueType}
                      onChange={(e) => handleUpdateCondition(index, { valueType: e.target.value })}
                    >
                      <Radio value="static">静态值</Radio>
                      <Radio value="component">组件值</Radio>
                    </Radio.Group>
                  </Form.Item>
                  {source.condition.valueType === 'static' ? (
                    <Form.Item label="静态值">
                      <Input
                        value={source.condition.staticValue}
                        onChange={(e) => handleUpdateCondition(index, { staticValue: e.target.value })}
                        placeholder="输入静态值"
                      />
                    </Form.Item>
                  ) : (
                    <>
                      <Form.Item label="来源组件">
                        <Select
                          value={source.condition.componentId}
                          onChange={(value) => {
                            handleUpdateCondition(index, { componentId: value })
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
                      {source.condition.componentId && (() => {
                        const sourceComponent = allComponents.find(c => c.id === source.condition.componentId)
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
                                { value: 'name', label: 'name (名称字段值)' },
                                { value: 'value', label: 'value (数值字段值)' },
                                { value: 'selectedData', label: 'selectedData (选中的数据)' },
                              ]
                            default:
                              return [
                                { value: 'value', label: 'value (默认值)' },
                              ]
                          }
                        }
                        const availableFields = getComponentFields(sourceComponent?.type)
                        
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
                        const componentValueMode = source.condition.componentValueMode || 'current'
                        
                        // 当选择组件且有数据源时，自动加载数据
                        if (sourceComponent && sourceComponent.dataSource.datasetId && sourceComponent.dataSource.tableName) {
                          loadComponentDataSourceData(sourceComponent)
                        }
                        
                        return (
                          <>
                            <Form.Item label="组件字段">
                              <Select
                                value={source.condition.componentField}
                                onChange={(value) => handleUpdateCondition(index, { componentField: value || undefined })}
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
                            <Form.Item label="值匹配方式">
                              <Radio.Group
                                value={componentValueMode}
                                onChange={(e) => handleUpdateCondition(index, { 
                                  componentValueMode: e.target.value,
                                  componentTargetValue: undefined,
                                  componentTargetValueSource: undefined,
                                  componentTargetValueField: undefined,
                                })}
                              >
                                <Radio value="current">使用组件当前值（需配置静态值作为比较目标）</Radio>
                                <Radio value="fixed">使用固定值匹配（推荐）</Radio>
                              </Radio.Group>
                              <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                                {componentValueMode === 'current' 
                                  ? '提示：此模式下，组件的当前值将与下方配置的静态值进行比较'
                                  : '提示：此模式下，需要配置目标值，当组件的value等于目标值时匹配此条件'}
                              </div>
                            </Form.Item>
                            {componentValueMode === 'current' && (
                              <Form.Item label="比较目标值（静态值）">
                                <Input
                                  value={source.condition.staticValue}
                                  onChange={(e) => handleUpdateCondition(index, { staticValue: e.target.value })}
                                  placeholder="输入要与组件value比较的值"
                                />
                                <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                                  例如：如果组件value="产品A"时使用此数据源，则输入"产品A"
                                </div>
                              </Form.Item>
                            )}
                            {componentValueMode === 'fixed' && (
                              <>
                                <Form.Item label="目标值来源">
                                  <Radio.Group
                                    value={source.condition.componentTargetValueSource || 'input'}
                                    onChange={(e) => handleUpdateCondition(index, { 
                                      componentTargetValueSource: e.target.value,
                                      componentTargetValue: undefined,
                                      componentTargetValueField: undefined,
                                    })}
                                  >
                                    <Radio value="input">手动输入</Radio>
                                    <Radio value="datasource" disabled={!sourceComponent?.dataSource.datasetId || !sourceComponent?.dataSource.tableName}>
                                      从数据源选择
                                    </Radio>
                                  </Radio.Group>
                                </Form.Item>
                                {source.condition.componentTargetValueSource === 'input' ? (
                                  <Form.Item label="目标值">
                                    <Input
                                      value={source.condition.componentTargetValue}
                                      onChange={(e) => handleUpdateCondition(index, { componentTargetValue: e.target.value })}
                                      placeholder="输入要匹配的值"
                                    />
                                  </Form.Item>
                                ) : source.condition.componentTargetValueSource === 'datasource' && componentTable ? (
                                  <>
                                    <Form.Item label="选择字段">
                                      <Select
                                        value={source.condition.componentTargetValueField}
                                        onChange={(value) => handleUpdateCondition(index, { 
                                          componentTargetValueField: value,
                                          componentTargetValue: undefined,
                                        })}
                                        placeholder="选择字段"
                                        style={{ width: '100%' }}
                                      >
                                        {componentTable.schema_info.fields.map((field: any) => (
                                          <Select.Option key={field.name} value={field.name}>
                                            {field.name} ({field.type})
                                          </Select.Option>
                                        ))}
                                      </Select>
                                    </Form.Item>
                                    {source.condition.componentTargetValueField && (
                                      <Form.Item label="选择值">
                                        <Select
                                          value={source.condition.componentTargetValue}
                                          onChange={(value) => handleUpdateCondition(index, { componentTargetValue: value })}
                                          placeholder="从数据源选择值"
                                          showSearch
                                          filterOption={(input, option) =>
                                            String(option?.children || '').toLowerCase().includes(input.toLowerCase())
                                          }
                                          style={{ width: '100%' }}
                                        >
                                          {Array.from(new Set(componentData.map((item: any) => {
                                            const fieldValue = item[source.condition.componentTargetValueField || '']
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
                                ) : null}
                              </>
                            )}
                          </>
                        )
                      })()}
                    </>
                  )}
                  <Form.Item label="数据源">
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
                          handleUpdateConditionalSource(index, { tableName })
                          // 如果选择了数据表，检查条件字段是否在新表中存在
                          if (tableName && source.condition.field) {
                            const newTable = getModalTables(source.datasetId).find(t => t.table_name === tableName)
                            const fieldExists = newTable?.schema_info.fields.some((f: any) => f.name === source.condition.field)
                            if (!fieldExists) {
                              handleUpdateCondition(index, { field: undefined })
                            }
                          }
                        }}
                        placeholder="选择数据表"
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

