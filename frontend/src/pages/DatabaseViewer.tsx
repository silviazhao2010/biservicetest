import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Layout,
  Table,
  Button,
  Space,
  Card,
  Select,
  Pagination,
  Modal,
  Form,
  Input,
  InputNumber,
  DatePicker,
  message,
} from 'antd'
import { PlusOutlined, ArrowLeftOutlined, DatabaseOutlined } from '@ant-design/icons'
import { datasetService } from '../services/datasetService'
import { dataService } from '../services/dataService'
import type { Dataset, DataTable } from '../types'
import dayjs from 'dayjs'

const { Content, Sider } = Layout
const { Option } = Select

interface TableData {
  columns: string[]
  data: Record<string, any>[]
  total: number
  limit: number
  offset: number
}

const DatabaseViewer: React.FC = () => {
  const { datasetId, tableName } = useParams<{ datasetId?: string, tableName?: string }>()
  const navigate = useNavigate()
  
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | null>(
    datasetId ? Number(datasetId) : null,
  )
  const [tables, setTables] = useState<DataTable[]>([])
  const [selectedTable, setSelectedTable] = useState<string | null>(tableName || null)
  const [tableData, setTableData] = useState<TableData | null>(null)
  const [loading, setLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [addModalVisible, setAddModalVisible] = useState(false)
  const [form] = Form.useForm()

  useEffect(() => {
    loadDatasets()
  }, [])

  useEffect(() => {
    if (selectedDatasetId) {
      loadTables(selectedDatasetId)
    }
  }, [selectedDatasetId])

  useEffect(() => {
    if (selectedDatasetId && selectedTable) {
      loadTableData(selectedDatasetId, selectedTable, currentPage, pageSize)
    }
  }, [selectedDatasetId, selectedTable, currentPage, pageSize])

  const loadDatasets = async () => {
    try {
      const data = await datasetService.getDatasets()
      setDatasets(data)
      if (data.length > 0 && !selectedDatasetId) {
        setSelectedDatasetId(data[0].id)
      }
    } catch (error) {
      message.error('加载数据集列表失败')
    }
  }

  const loadTables = async (datasetId: number) => {
    try {
      const data = await datasetService.getTables(datasetId)
      setTables(data)
      if (data.length > 0 && !selectedTable) {
        setSelectedTable(data[0].table_name)
      }
    } catch (error) {
      message.error('加载数据表列表失败')
    }
  }

  const loadTableData = async (datasetId: number, table: string, page: number, size: number) => {
    setLoading(true)
    try {
      const result = await dataService.getTableData({
        dataset_id: datasetId,
        table_name: table,
        limit: size,
        offset: (page - 1) * size,
      })
      setTableData({
        columns: result.columns,
        data: result.data,
        total: result.total,
        limit: result.limit,
        offset: result.offset,
      })
    } catch (error) {
      message.error('加载数据失败')
    } finally {
      setLoading(false)
    }
  }

  const handleDatasetChange = (datasetId: number) => {
    setSelectedDatasetId(datasetId)
    setSelectedTable(null)
    setTableData(null)
    setCurrentPage(1)
    navigate(`/database/${datasetId}`)
  }

  const handleTableSelect = (table: string) => {
    setSelectedTable(table)
    setCurrentPage(1)
    navigate(`/database/${selectedDatasetId}/${table}`)
  }

  const handleAddData = () => {
    if (!selectedTable || !selectedDatasetId) {
      message.warning('请先选择数据集和数据表')
      return
    }
    
    // 获取表结构，构建表单
    const table = tables.find(t => t.table_name === selectedTable)
    if (!table) {
      return
    }

    form.resetFields()
    setAddModalVisible(true)
  }

  const handleSubmit = async (values: Record<string, any>) => {
    if (!selectedTable || !selectedDatasetId) {
      return
    }

    try {
      // 处理日期字段
      const processedValues: Record<string, any> = {}
      const table = tables.find(t => t.table_name === selectedTable)
      
      if (table) {
        table.schema_info.fields.forEach((field: any) => {
          const fieldName = field.name
          if (values[fieldName] !== undefined) {
            if (field.type.toUpperCase().includes('DATE')) {
              // 如果是日期类型，转换为字符串
              processedValues[fieldName] = dayjs(values[fieldName]).format('YYYY-MM-DD')
            } else {
              processedValues[fieldName] = values[fieldName]
            }
          }
        })
      }

      await dataService.insertData({
        dataset_id: selectedDatasetId,
        table_name: selectedTable,
        data: processedValues,
      })
      
      message.success('添加数据成功')
      setAddModalVisible(false)
      form.resetFields()
      
      // 重新加载数据
      if (selectedDatasetId && selectedTable) {
        loadTableData(selectedDatasetId, selectedTable, currentPage, pageSize)
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || '添加数据失败')
    }
  }

  const getFormFields = () => {
    if (!selectedTable) {
      return []
    }

    const table = tables.find(t => t.table_name === selectedTable)
    if (!table || !table.schema_info.fields) {
      return []
    }

    return table.schema_info.fields.map((field: any) => {
      const isPk = field.pk
      const isAutoIncrement = isPk && field.type.toUpperCase() === 'INTEGER'
      
      // 如果是自增主键，跳过
      if (isAutoIncrement) {
        return null
      }

      const fieldConfig: any = {
        name: field.name,
        label: field.name,
        rules: field.notnull && !field.default ? [{ required: true, message: `请输入${field.name}` }] : [],
      }

      // 根据字段类型选择输入组件
      const fieldType = field.type.toUpperCase()
      if (fieldType.includes('INT')) {
        fieldConfig.input = <InputNumber style={{ width: '100%' }} />
      } else if (fieldType.includes('REAL') || fieldType.includes('FLOAT') || fieldType.includes('DOUBLE')) {
        fieldConfig.input = <InputNumber style={{ width: '100%' }} step={0.01} />
      } else if (fieldType.includes('DATE')) {
        fieldConfig.input = <DatePicker style={{ width: '100%' }} />
      } else {
        fieldConfig.input = <Input />
      }

      return fieldConfig
    }).filter(Boolean)
  }

  const columns = tableData?.columns.map(col => ({
    title: col,
    dataIndex: col,
    key: col,
  })) || []

  const selectedDataset = datasets.find(ds => ds.id === selectedDatasetId)

  return (
    <Layout style={{ height: '100vh' }}>
      <Layout.Header style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/')}
            style={{ marginRight: '16px' }}
          >
            返回
          </Button>
          <span style={{ fontSize: '18px', fontWeight: 'bold' }}>数据库浏览</span>
        </div>
        <Space>
          <Select
            value={selectedDatasetId}
            onChange={handleDatasetChange}
            style={{ width: 200 }}
            placeholder="选择数据集"
          >
            {datasets.map(ds => (
              <Option key={ds.id} value={ds.id}>{ds.name}</Option>
            ))}
          </Select>
          {selectedTable && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAddData}
            >
              添加数据
            </Button>
          )}
        </Space>
      </Layout.Header>
      <Layout>
        <Sider width={250} style={{ background: '#fff', borderRight: '1px solid #f0f0f0' }}>
          <Card
            title={<><DatabaseOutlined /> 数据表</>}
            style={{ height: '100%', borderRadius: 0 }}
            bodyStyle={{ padding: '8px' }}
          >
            {tables.map(table => (
              <div
                key={table.table_name}
                onClick={() => handleTableSelect(table.table_name)}
                style={{
                  padding: '12px',
                  cursor: 'pointer',
                  backgroundColor: selectedTable === table.table_name ? '#e6f7ff' : 'transparent',
                  borderLeft: selectedTable === table.table_name ? '3px solid #1890ff' : '3px solid transparent',
                  marginBottom: '4px',
                }}
              >
                {table.display_name || table.table_name}
              </div>
            ))}
          </Card>
        </Sider>
        <Content style={{ background: '#fff', padding: '24px', overflow: 'auto' }}>
          {selectedTable && tableData ? (
            <>
              <div style={{ marginBottom: '16px' }}>
                <h2>{selectedTable}</h2>
                <p style={{ color: '#999' }}>
                  数据集: {selectedDataset?.name} | 共 {tableData.total} 条记录
                </p>
              </div>
              <Table
                columns={columns}
                dataSource={tableData.data}
                loading={loading}
                rowKey={(record, index) => `${index}-${JSON.stringify(record)}`}
                pagination={false}
              />
              <div style={{ marginTop: '16px', textAlign: 'right' }}>
                <Pagination
                  current={currentPage}
                  pageSize={pageSize}
                  total={tableData.total}
                  onChange={(page, size) => {
                    setCurrentPage(page)
                    setPageSize(size)
                  }}
                  showSizeChanger
                  showTotal={(total) => `共 ${total} 条`}
                />
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '100px 0', color: '#999' }}>
              请选择数据集和数据表
            </div>
          )}
        </Content>
      </Layout>

      <Modal
        title={`添加数据到 ${selectedTable}`}
        open={addModalVisible}
        onCancel={() => {
          setAddModalVisible(false)
          form.resetFields()
        }}
        onOk={() => form.submit()}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          {getFormFields().map((field: any) => (
            <Form.Item
              key={field.name}
              name={field.name}
              label={field.label}
              rules={field.rules}
            >
              {field.input}
            </Form.Item>
          ))}
        </Form>
      </Modal>
    </Layout>
  )
}

export default DatabaseViewer

