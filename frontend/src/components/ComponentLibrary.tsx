import React from 'react'
import { Card, List } from 'antd'
import { LineChartOutlined, PieChartOutlined, DownOutlined, EditOutlined, ApartmentOutlined } from '@ant-design/icons'
import type { ComponentConfig } from '../types'

interface ComponentLibraryProps {
  onAddComponent: (type: ComponentConfig['type']) => void
}

const componentTypes = [
  { type: 'line_chart' as const, name: '折线图', icon: <LineChartOutlined /> },
  { type: 'pie_chart' as const, name: '饼图', icon: <PieChartOutlined /> },
  { type: 'dropdown' as const, name: '下拉列表', icon: <DownOutlined /> },
  { type: 'text_input' as const, name: '文本框', icon: <EditOutlined /> },
  { type: 'tree_chart' as const, name: '树图', icon: <ApartmentOutlined /> },
]

const ComponentLibrary: React.FC<ComponentLibraryProps> = ({ onAddComponent }) => {
  return (
    <Card title="组件库" style={{ height: '100%', borderRadius: 0 }}>
      <List
        dataSource={componentTypes}
        renderItem={(item) => (
          <List.Item
            style={{ cursor: 'pointer', padding: '12px' }}
            onClick={() => onAddComponent(item.type)}
          >
            <List.Item.Meta
              avatar={item.icon}
              title={item.name}
            />
          </List.Item>
        )}
      />
    </Card>
  )
}

export default ComponentLibrary

