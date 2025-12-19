import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Layout, Button, Spin } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import ChartComponent from '../components/ChartComponent'
import { reportService } from '../services/reportService'
import type { ComponentConfig } from '../types'

const { Header, Content } = Layout

const ReportPreview: React.FC = () => {
  const { reportId } = useParams<{ reportId: string }>()
  const navigate = useNavigate()
  const [components, setComponents] = useState<ComponentConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [reportName, setReportName] = useState('')

  useEffect(() => {
    if (reportId) {
      loadReport()
    }
  }, [reportId])

  const loadReport = async () => {
    try {
      setLoading(true)
      const report = await reportService.getReport(Number(reportId))
      setReportName(report.name)
      setComponents(report.config.components || [])
    } catch (error) {
      console.error('加载报表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // 更新组件值的函数
  const updateComponentValue = React.useCallback((componentId: string, value: any, field: string = 'value') => {
    setComponents(prevComponents => 
      prevComponents.map(comp => 
        comp.id === componentId 
          ? { ...comp, props: { ...comp.props, [field]: value } }
          : comp
      )
    )
  }, [])

  // 获取组件值的函数（用于条件数据源）
  const getComponentValue = React.useCallback((componentId: string, field?: string): any => {
    const comp = components.find(c => c.id === componentId)
    if (!comp) {
      return null
    }

    // 根据组件类型和字段获取值
    const fieldName = field || 'value'
    
    // 对于下拉列表，value和selectedValue都指向同一个值
    if (comp.type === 'dropdown' && (fieldName === 'value' || fieldName === 'selectedValue')) {
      return (comp.props as any)?.value || null
    }
    
    // 对于树图，支持 selectedNodePath 字段
    if (comp.type === 'tree_chart') {
      if (fieldName === 'selectedNodePath') {
        return (comp.props as any)?.selectedNodePath || null
      } else if (fieldName === 'selectedNode' || fieldName === 'value') {
        // 返回选中路径的最后一个节点名称
        const path = (comp.props as any)?.selectedNodePath || []
        return path.length > 0 ? path[path.length - 1] : null
      }
    }
    
    // 对于其他组件或字段，直接返回对应字段的值
    return (comp.props as any)?.[fieldName] || null
  }, [components])

  if (loading) {
    return (
      <Layout style={{ height: '100vh' }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <Spin size="large" tip="加载报表中..." />
        </div>
      </Layout>
    )
  }

  // 计算画布大小（基于所有组件的位置）
  const canvasWidth = components.length > 0
    ? Math.max(...components.map(comp => comp.position.x + comp.position.width), 1200)
    : 1200
  const canvasHeight = components.length > 0
    ? Math.max(...components.map(comp => comp.position.y + comp.position.height), 800)
    : 800

  return (
    <Layout style={{ height: '100vh' }}>
      <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <div>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(-1)}
            style={{ marginRight: '16px' }}
          >
            返回
          </Button>
          <span style={{ fontSize: '18px', fontWeight: 'bold' }}>{reportName || '报表预览'}</span>
        </div>
        <Button
          onClick={() => navigate(`/designer/${reportId}`)}
        >
          编辑报表
        </Button>
      </Header>
      <Content style={{ background: '#f5f5f5', padding: '24px', overflow: 'auto' }}>
        <div
          style={{
            position: 'relative',
            width: canvasWidth,
            minHeight: canvasHeight,
            margin: '0 auto',
            background: '#fff',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            padding: '20px',
          }}
        >
          {components.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '100px 0',
                color: '#999',
                fontSize: '16px',
              }}
            >
              报表暂无内容
            </div>
          ) : (
            components.map((component) => (
              <div
                key={component.id}
                style={{
                  position: 'absolute',
                  left: component.position.x,
                  top: component.position.y,
                  width: component.position.width,
                  height: component.position.height,
                  border: '1px solid #e8e8e8',
                  borderRadius: '4px',
                  background: '#fff',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                }}
              >
                <ChartComponent
                  component={component}
                  allComponents={components}
                  getComponentValue={getComponentValue}
                  onComponentValueChange={updateComponentValue}
                />
              </div>
            ))
          )}
        </div>
      </Content>
    </Layout>
  )
}

export default ReportPreview

