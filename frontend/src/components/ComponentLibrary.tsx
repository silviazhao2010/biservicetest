import React from 'react'
import { useDrag } from 'react-dnd'
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

const ComponentItem: React.FC<{ item: typeof componentTypes[0], onAddComponent: (type: ComponentConfig['type']) => void }> = ({ item, onAddComponent }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'component-library',
    item: { type: item.type },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }))

  return (
    <List.Item
      ref={drag}
      style={{
        cursor: 'move',
        padding: '12px',
        opacity: isDragging ? 0.5 : 1,
        backgroundColor: isDragging ? '#f0f0f0' : 'transparent',
      }}
      onClick={() => onAddComponent(item.type)}
    >
      <List.Item.Meta
        avatar={item.icon}
        title={item.name}
      />
    </List.Item>
  )
}

const ComponentLibrary: React.FC<ComponentLibraryProps> = ({ onAddComponent }) => {
  return (
    <Card title="组件库" style={{ height: '100%', borderRadius: 0 }}>
      <List
        dataSource={componentTypes}
        renderItem={(item) => (
          <ComponentItem key={item.type} item={item} onAddComponent={onAddComponent} />
        )}
      />
    </Card>
  )
}

export default ComponentLibrary

