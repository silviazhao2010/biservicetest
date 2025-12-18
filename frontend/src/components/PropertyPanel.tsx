import React, { useEffect, useState } from 'react'
import { Card, Form, Input, Select, InputNumber, Button, message } from 'antd'
import { datasetService } from '../services/datasetService'
import { dataService } from '../services/dataService'
import type { ComponentConfig, Dataset, DataTable } from '../types'

interface PropertyPanelProps {
  component: ComponentConfig | null
  onUpdateComponent: (updates: Partial<ComponentConfig>) => void
}

const PropertyPanel: React.FC<PropertyPanelProps> = ({ component, onUpdateComponent }) => {
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

  return (
    <Card title="属性配置" style={{ height: '100%', borderRadius: 0, overflow: 'auto' }}>
      <Form form={form} layout="vertical">
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

