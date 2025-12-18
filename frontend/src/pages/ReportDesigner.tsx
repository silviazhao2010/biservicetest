import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { Layout, Button, message } from 'antd'
import { SaveOutlined, ArrowLeftOutlined, EyeOutlined } from '@ant-design/icons'
import ComponentLibrary from '../components/ComponentLibrary'
import Canvas from '../components/Canvas'
import PropertyPanel from '../components/PropertyPanel'
import { reportService } from '../services/reportService'
import type { ComponentConfig, ReportConfig } from '../types'

const { Sider, Content } = Layout

const ReportDesigner: React.FC = () => {
  const { reportId } = useParams<{ reportId?: string }>()
  const navigate = useNavigate()
  const [components, setComponents] = useState<ComponentConfig[]>([])
  const [selectedComponent, setSelectedComponent] = useState<ComponentConfig | null>(null)
  const [reportName, setReportName] = useState('新报表')

  useEffect(() => {
    if (reportId) {
      loadReport()
    }
  }, [reportId])

  const loadReport = async () => {
    try {
      const report = await reportService.getReport(Number(reportId))
      setReportName(report.name)
      setComponents(report.config.components || [])
    } catch (error) {
      message.error('加载报表失败')
    }
  }

  const handleSave = async () => {
    try {
      const config: ReportConfig = {
        components,
      }
      
      if (reportId) {
        await reportService.updateReport(Number(reportId), {
          name: reportName,
          config,
        })
        message.success('保存成功')
      } else {
        const report = await reportService.createReport({
          name: reportName,
          description: '',
          config,
        })
        message.success('创建成功')
        navigate(`/designer/${report.id}`, { replace: true })
      }
    } catch (error) {
      message.error('保存失败')
    }
  }

  const handleAddComponent = (type: ComponentConfig['type']) => {
    // 生成唯一ID
    const uniqueId = `component-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    // 计算新组件位置，避免与现有组件重叠
    const defaultWidth = 400
    const defaultHeight = 300
    const padding = 20
    let newX = 100
    let newY = 100
    
    // 找到最右侧和最底部的组件位置
    if (components.length > 0) {
      const maxX = Math.max(...components.map(comp => comp.position.x + comp.position.width))
      const maxY = Math.max(...components.map(comp => comp.position.y + comp.position.height))
      newX = maxX + padding
      newY = maxY + padding
    }
    
    const newComponent: ComponentConfig = {
      id: uniqueId,
      type,
      position: {
        x: newX,
        y: newY,
        width: defaultWidth,
        height: defaultHeight,
      },
      style: {},
      dataSource: {
        type: 'table',
        datasetId: 0,
        fields: {},
      },
      props: {},
    }
    setComponents([...components, newComponent])
  }

  const handleUpdateComponent = (id: string, updates: Partial<ComponentConfig>) => {
    setComponents(components.map(comp => 
      comp.id === id ? { ...comp, ...updates } : comp
    ))
    if (selectedComponent?.id === id) {
      setSelectedComponent({ ...selectedComponent, ...updates })
    }
  }

  const handleDeleteComponent = (id: string) => {
    setComponents(components.filter(comp => comp.id !== id))
    if (selectedComponent?.id === id) {
      setSelectedComponent(null)
    }
  }

  const handleSelectComponent = (component: ComponentConfig | null) => {
    // 确保传递的是完整的组件对象，而不是引用
    if (component) {
      // 从components数组中查找最新的组件对象
      const latestComponent = components.find(c => c.id === component.id)
      setSelectedComponent(latestComponent || component)
    } else {
      setSelectedComponent(null)
    }
  }

  return (
    <DndProvider backend={HTML5Backend}>
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
            <span style={{ fontSize: '18px', fontWeight: 'bold' }}>报表设计器</span>
          </div>
          <div>
            {reportId && (
              <Button
                icon={<EyeOutlined />}
                onClick={() => navigate(`/preview/${reportId}`)}
                style={{ marginRight: '8px' }}
              >
                预览
              </Button>
            )}
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSave}
            >
              保存
            </Button>
          </div>
        </Layout.Header>
        <Layout>
          <Sider width={200} style={{ background: '#fff', borderRight: '1px solid #f0f0f0' }}>
            <ComponentLibrary onAddComponent={handleAddComponent} />
          </Sider>
          <Content style={{ background: '#f5f5f5', position: 'relative' }}>
            <Canvas
              components={components}
              selectedComponent={selectedComponent}
              onSelectComponent={handleSelectComponent}
              onUpdateComponent={handleUpdateComponent}
              onDeleteComponent={handleDeleteComponent}
              onAddComponent={(component) => setComponents([...components, component])}
            />
          </Content>
          <Sider width={300} style={{ background: '#fff', borderLeft: '1px solid #f0f0f0' }}>
            <PropertyPanel
              component={selectedComponent}
              allComponents={components}
              onUpdateComponent={(updates) => {
                if (selectedComponent) {
                  handleUpdateComponent(selectedComponent.id, updates)
                }
              }}
            />
          </Sider>
        </Layout>
      </Layout>
    </DndProvider>
  )
}

export default ReportDesigner

