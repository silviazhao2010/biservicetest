import React from 'react'
import { useDrag } from 'react-dnd'
import { Card, Button } from 'antd'
import { DeleteOutlined } from '@ant-design/icons'
import ChartComponent from './ChartComponent'
import type { ComponentConfig } from '../types'

interface ComponentWrapperProps {
  component: ComponentConfig
  isSelected: boolean
  onSelect: () => void
  onUpdate: (updates: Partial<ComponentConfig>) => void
  onDelete: () => void
}

const ComponentWrapper: React.FC<ComponentWrapperProps> = ({
  component,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
}) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'component',
    item: component,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }))

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).closest('.ant-card')) {
      onSelect()
    }
  }

  return (
    <div
      ref={drag}
      style={{
        position: 'absolute',
        left: component.position.x,
        top: component.position.y,
        width: component.position.width,
        height: component.position.height,
        opacity: isDragging ? 0.5 : 1,
        cursor: 'move',
      }}
      onMouseDown={handleMouseDown}
    >
      <Card
        size="small"
        style={{
          height: '100%',
          border: isSelected ? '2px solid #1890ff' : '1px solid #d9d9d9',
        }}
        bodyStyle={{ padding: '8px', height: '100%', overflow: 'hidden' }}
        extra={
          isSelected && (
            <Button
              type="text"
              danger
              size="small"
              icon={<DeleteOutlined />}
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
            />
          )
        }
      >
        <ChartComponent component={component} />
      </Card>
    </div>
  )
}

export default ComponentWrapper

