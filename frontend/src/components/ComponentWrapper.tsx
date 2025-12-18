import React, { useRef } from 'react'
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
  allComponents?: ComponentConfig[]
  getComponentValue?: (componentId: string, field?: string) => any
}

const ComponentWrapper: React.FC<ComponentWrapperProps> = ({
  component,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  allComponents = [],
  getComponentValue,
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null)

  const [{ isDragging }, drag, preview] = useDrag(() => ({
    type: 'component',
    item: () => {
      // 返回组件信息
      return {
        ...component,
      }
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    end: (item, monitor) => {
      // 拖拽结束时的处理
    },
  }))

  // 使用空预览，让原始元素保持可见
  React.useEffect(() => {
    preview(null, { captureDraggingState: true })
  }, [preview])

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).closest('.ant-card')) {
      onSelect()
    }
  }

  return (
    <div
      ref={(node) => {
        drag(node)
        wrapperRef.current = node
      }}
      style={{
        position: 'absolute',
        left: component.position.x,
        top: component.position.y,
        width: component.position.width,
        height: component.position.height,
        opacity: isDragging ? 0.6 : 1,
        cursor: 'move',
        zIndex: isSelected ? 1000 : isDragging ? 999 : 1,
        pointerEvents: isDragging ? 'none' : 'auto',
        transform: isDragging ? 'none' : 'none',
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
        <ChartComponent 
          component={component} 
          allComponents={allComponents}
          getComponentValue={getComponentValue}
        />
      </Card>
    </div>
  )
}

export default ComponentWrapper

