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
  Checkbox,
  Divider,
} from 'antd'
import { PlusOutlined, ArrowLeftOutlined, DatabaseOutlined, TableOutlined, FieldTimeOutlined, MinusCircleOutlined } from '@ant-design/icons'
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
  const [addDatasetModalVisible, setAddDatasetModalVisible] = useState(false)
  const [addTableModalVisible, setAddTableModalVisible] = useState(false)
  const [addColumnModalVisible, setAddColumnModalVisible] = useState(false)
  const [form] = Form.useForm()
  const [datasetForm] = Form.useForm()
  const [tableForm] = Form.useForm()
  const [columnForm] = Form.useForm()

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
          <Button
            icon={<PlusOutlined />}
            onClick={() => setAddDatasetModalVisible(true)}
          >
            新建数据集
          </Button>
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
          {selectedDatasetId && (
            <Button
              icon={<TableOutlined />}
              onClick={() => setAddTableModalVisible(true)}
            >
              新建表
            </Button>
          )}
          {selectedTable && (
            <>
              <Button
                icon={<FieldTimeOutlined />}
                onClick={() => setAddColumnModalVisible(true)}
              >
                添加字段
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAddData}
              >
                添加数据
              </Button>
            </>
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

      {/* 创建数据集模态框 */}
      <Modal
        title="新建数据集"
        open={addDatasetModalVisible}
        onCancel={() => {
          setAddDatasetModalVisible(false)
          datasetForm.resetFields()
        }}
        onOk={() => datasetForm.submit()}
        width={500}
      >
        <Form
          form={datasetForm}
          layout="vertical"
          onFinish={async (values) => {
            try {
              await datasetService.createDataset({
                name: values.name,
                description: values.description,
                database_name: values.database_name,
              })
              message.success('创建数据集成功')
              setAddDatasetModalVisible(false)
              datasetForm.resetFields()
              loadDatasets()
            } catch (error: any) {
              message.error(error.response?.data?.message || '创建数据集失败')
            }
          }}
        >
          <Form.Item
            name="name"
            label="数据集名称"
            rules={[{ required: true, message: '请输入数据集名称' }]}
          >
            <Input placeholder="例如：销售数据" />
          </Form.Item>
          <Form.Item
            name="description"
            label="描述"
          >
            <Input.TextArea rows={3} placeholder="数据集的描述信息" />
          </Form.Item>
          <Form.Item
            name="database_name"
            label="数据库文件名（可选）"
            tooltip="如果不填写，将使用数据集名称自动生成"
          >
            <Input placeholder="例如：sales_data.db" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 创建表模态框 */}
      <Modal
        title="新建数据表"
        open={addTableModalVisible}
        onCancel={() => {
          setAddTableModalVisible(false)
          tableForm.resetFields()
        }}
        onOk={() => tableForm.submit()}
        width={700}
      >
        <Form
          form={tableForm}
          layout="vertical"
          onFinish={async (values) => {
            if (!selectedDatasetId) {
              return
            }
            try {
              await datasetService.createTable(selectedDatasetId, {
                table_name: values.table_name,
                fields: values.fields,
              })
              message.success('创建表成功')
              setAddTableModalVisible(false)
              tableForm.resetFields()
              loadTables(selectedDatasetId)
            } catch (error: any) {
              message.error(error.response?.data?.message || '创建表失败')
            }
          }}
          initialValues={{
            fields: [{ name: '', type: 'TEXT', primaryKey: false, notNull: false }],
          }}
        >
          <Form.Item
            name="table_name"
            label="表名"
            rules={[{ required: true, message: '请输入表名' }]}
          >
            <Input placeholder="例如：users" />
          </Form.Item>
          <Divider>字段定义</Divider>
          <Form.List name="fields">
            {(fields, { add, remove }) => (
              <>
                {fields.map((field, index) => (
                  <div key={field.key} style={{ marginBottom: 16, padding: 16, border: '1px solid #f0f0f0', borderRadius: 4 }}>
                    <Space style={{ width: '100%', marginBottom: 8 }} align="baseline">
                      <Form.Item
                        {...field}
                        name={[field.name, 'name']}
                        label="字段名"
                        rules={[{ required: true, message: '请输入字段名' }]}
                        style={{ width: 150 }}
                      >
                        <Input placeholder="字段名" />
                      </Form.Item>
                      <Form.Item
                        {...field}
                        name={[field.name, 'type']}
                        label="类型"
                        rules={[{ required: true, message: '请选择类型' }]}
                        style={{ width: 120 }}
                      >
                        <Select>
                          <Option value="INTEGER">INTEGER</Option>
                          <Option value="REAL">REAL</Option>
                          <Option value="TEXT">TEXT</Option>
                          <Option value="BLOB">BLOB</Option>
                          <Option value="DATE">DATE</Option>
                        </Select>
                      </Form.Item>
                      <Form.Item
                        {...field}
                        name={[field.name, 'primaryKey']}
                        valuePropName="checked"
                      >
                        <Checkbox>主键</Checkbox>
                      </Form.Item>
                      <Form.Item
                        {...field}
                        name={[field.name, 'notNull']}
                        valuePropName="checked"
                      >
                        <Checkbox>非空</Checkbox>
                      </Form.Item>
                      <Form.Item
                        {...field}
                        name={[field.name, 'default']}
                        label="默认值"
                        style={{ width: 120 }}
                      >
                        <Input placeholder="默认值" />
                      </Form.Item>
                      {fields.length > 1 && (
                        <Button
                          type="link"
                          danger
                          icon={<MinusCircleOutlined />}
                          onClick={() => remove(field.name)}
                        >
                          删除
                        </Button>
                      )}
                    </Space>
                  </div>
                ))}
                <Button
                  type="dashed"
                  onClick={() => add()}
                  block
                  icon={<PlusOutlined />}
                >
                  添加字段
                </Button>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>

      {/* 添加字段模态框 */}
      <Modal
        title={`添加字段到 ${selectedTable}`}
        open={addColumnModalVisible}
        onCancel={() => {
          setAddColumnModalVisible(false)
          columnForm.resetFields()
        }}
        onOk={() => columnForm.submit()}
        width={500}
      >
        <Form
          form={columnForm}
          layout="vertical"
          onFinish={async (values) => {
            if (!selectedDatasetId || !selectedTable) {
              return
            }
            try {
              await datasetService.addColumn(selectedDatasetId, selectedTable, {
                column_name: values.column_name,
                column_type: values.column_type,
                not_null: values.not_null || false,
                default_value: values.default_value,
              })
              message.success('添加字段成功')
              setAddColumnModalVisible(false)
              columnForm.resetFields()
              loadTables(selectedDatasetId)
              if (selectedTable) {
                loadTableData(selectedDatasetId, selectedTable, currentPage, pageSize)
              }
            } catch (error: any) {
              message.error(error.response?.data?.message || '添加字段失败')
            }
          }}
        >
          <Form.Item
            name="column_name"
            label="字段名"
            rules={[{ required: true, message: '请输入字段名' }]}
          >
            <Input placeholder="例如：email" />
          </Form.Item>
          <Form.Item
            name="column_type"
            label="类型"
            rules={[{ required: true, message: '请选择类型' }]}
          >
            <Select>
              <Option value="INTEGER">INTEGER</Option>
              <Option value="REAL">REAL</Option>
              <Option value="TEXT">TEXT</Option>
              <Option value="BLOB">BLOB</Option>
              <Option value="DATE">DATE</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="not_null"
            valuePropName="checked"
          >
            <Checkbox>非空</Checkbox>
          </Form.Item>
          <Form.Item
            name="default_value"
            label="默认值"
          >
            <Input placeholder="默认值（可选）" />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  )
}

export default DatabaseViewer

