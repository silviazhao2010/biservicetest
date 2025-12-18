import React, { useEffect, useState } from 'react'
import { Card, Form, Input, Select, InputNumber, Button, message, Divider, Space, Switch, Radio } from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
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
      onUpdateComponent({
        dataSource: {
          type: 'conditional',
          fields: component.dataSource.fields || {},
          conditionalSources: [],
          defaultSource: {
            datasetId: component.dataSource.datasetId || 0,
            tableName: component.dataSource.tableName,
          },
        },
      })
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
            <Divider>默认数据源</Divider>
            <Form.Item label="默认数据集">
              <Select
                value={component.dataSource.defaultSource?.datasetId || undefined}
                onChange={(datasetId) => {
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
                    loadTables(datasetId)
                  }
                }}
                placeholder="请选择默认数据集"
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
                >
                  {tables.map(table => (
                    <Select.Option key={table.id} value={table.table_name}>
                      {table.display_name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            )}
            <Divider>条件数据源</Divider>
            {(component.dataSource.conditionalSources || []).map((source, index) => (
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
                    <Input
                      value={source.condition.field}
                      onChange={(e) => handleUpdateCondition(index, { field: e.target.value })}
                      placeholder="字段名（可选）"
                    />
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
                          onChange={(value) => handleUpdateCondition(index, { componentId: value })}
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
                      {source.condition.componentId && (
                        <Form.Item label="组件字段">
                          <Input
                            value={source.condition.componentField}
                            onChange={(e) => handleUpdateCondition(index, { componentField: e.target.value })}
                            placeholder="组件字段名（可选）"
                          />
                        </Form.Item>
                      )}
                    </>
                  )}
                  <Form.Item label="数据源">
                    <Select
                      value={source.datasetId}
                      onChange={(datasetId) => {
                        handleUpdateConditionalSource(index, { datasetId })
                        if (datasetId) {
                          loadTables(datasetId)
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
                        onChange={(tableName) => handleUpdateConditionalSource(index, { tableName })}
                        placeholder="选择数据表"
                        style={{ width: '100%' }}
                      >
                        {tables.map(table => (
                          <Select.Option key={table.id} value={table.table_name}>
                            {table.display_name}
                          </Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                  )}
                </Space>
              </Card>
            ))}
            <Button
              type="dashed"
              onClick={handleAddConditionalSource}
              block
              icon={<PlusOutlined />}
            >
              添加条件数据源
            </Button>
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

        {component.dataSource.datasetId && (
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

        {component.dataSource.tableName && getFieldConfig().map(field => (
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
    </Card>
  )
}

export default PropertyPanel

