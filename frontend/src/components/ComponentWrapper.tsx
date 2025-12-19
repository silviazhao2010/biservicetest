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
  onComponentValueChange?: (componentId: string, value: any, field?: string) => void
}

const ComponentWrapper: React.FC<ComponentWrapperProps> = ({
  component,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  allComponents = [],
  getComponentValue,
  onComponentValueChange,
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null)
  // 使用 useRef 存储拖拽开始时的组件信息，避免在拖拽过程中被更新
  const dragStartComponentRef = useRef<ComponentConfig | null>(null)

  const [{ isDragging }, drag, preview] = useDrag(() => ({
    type: 'component',
    item: () => {
      // 在 react-dnd v14 中，item 函数在拖拽开始时被调用一次，返回的值会被缓存
      // 如果 ref 为空，说明这是第一次调用，捕获组件信息并存储
      if (!dragStartComponentRef.current) {
        // 在拖拽开始时捕获组件信息（深拷贝，确保位置信息不会被后续更新影响）
        const startComponent = {
          ...component,
          position: { ...component.position },
        }
        dragStartComponentRef.current = startComponent
        console.log('Drag item: Captured component', {
          id: startComponent.id,
          position: startComponent.position,
        })
        return startComponent
      }
      // 后续调用返回 ref 中存储的值（虽然理论上不会再次调用，但为了安全起见）
      console.log('Drag item: Returning cached component', {
        id: dragStartComponentRef.current.id,
        position: dragStartComponentRef.current.position,
      })
      return dragStartComponentRef.current
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    end: (item, monitor) => {
      // 拖拽结束时清理
      console.log('Drag end: Cleaning up', {
        id: item?.id,
        position: item?.position,
      })
      dragStartComponentRef.current = null
    },
  }), [component])

  // 使用空预览，让原始元素保持可见
  React.useEffect(() => {
    preview(null, { captureDraggingState: true })
  }, [preview])

  const handleClick = (e: React.MouseEvent) => {
    // 阻止事件冒泡，避免触发画布的点击事件
    e.stopPropagation()
    e.preventDefault()
    // 如果点击的是删除按钮，不触发选择
    if ((e.target as HTMLElement).closest('.ant-btn')) {
      return
    }
    // 如果正在拖拽，不触发选择
    if (isDragging) {
      return
    }
    try {
      onSelect()
    } catch (error) {
      console.error('选择组件时出错:', error)
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
        pointerEvents: isDragging ? 'auto' : 'auto', // 保持pointerEvents为auto，确保组件在拖拽时仍然可见
        transform: isDragging ? 'none' : 'none',
      }}
      onClick={handleClick}
    >
      <Card
        size="small"
        style={{
          height: '100%',
          border: isSelected ? '2px solid #1890ff' : '1px solid #d9d9d9',
        }}
        bodyStyle={{ padding: '8px', height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
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
        <React.Suspense fallback={<div style={{ textAlign: 'center', padding: '20px' }}>加载中...</div>}>
          <ChartComponent 
            component={component} 
            allComponents={allComponents}
            getComponentValue={getComponentValue}
            onComponentValueChange={onComponentValueChange}
          />
        </React.Suspense>
      </Card>
    </div>
  )
}

export default ComponentWrapper

