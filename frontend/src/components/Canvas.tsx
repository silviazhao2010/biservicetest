import React, { useRef, useState } from 'react'
import { useDrop } from 'react-dnd'
import ComponentWrapper from './ComponentWrapper'
import type { ComponentConfig } from '../types'

interface CanvasProps {
  components: ComponentConfig[]
  selectedComponent: ComponentConfig | null
  onSelectComponent: (component: ComponentConfig | null) => void
  onUpdateComponent: (id: string, updates: Partial<ComponentConfig>) => void
  onDeleteComponent: (id: string) => void
  onAddComponent?: (component: ComponentConfig) => void
}

const Canvas: React.FC<CanvasProps> = ({
  components,
  selectedComponent,
  onSelectComponent,
  onUpdateComponent,
  onDeleteComponent,
  onAddComponent,
}) => {
  const canvasRef = useRef<HTMLDivElement>(null)
  const [dragPreview, setDragPreview] = useState<{ x: number, y: number, type?: ComponentConfig['type'] } | null>(null)

  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: ['component', 'component-library'],
    hover: (item: ComponentConfig | { type: ComponentConfig['type'] }, monitor) => {
      if (!canvasRef.current) {
        return
      }

      const offset = monitor.getClientOffset()
      if (!offset) {
        return
      }

      const canvasRect = canvasRef.current.getBoundingClientRect()
      const x = offset.x - canvasRect.left
      const y = offset.y - canvasRect.top

      // 如果是从组件库拖拽的组件，显示预览
      if ('type' in item && !('id' in item)) {
        setDragPreview({ x, y, type: item.type })
      } else {
        setDragPreview(null)
      }
    },
    drop: (item: ComponentConfig | { type: ComponentConfig['type'] }, monitor) => {
      setDragPreview(null)
      
      if (!canvasRef.current) {
        return
      }

      const offset = monitor.getClientOffset()
      if (!offset) {
        return
      }

      const canvasRect = canvasRef.current.getBoundingClientRect()
      const x = offset.x - canvasRect.left
      const y = offset.y - canvasRect.top

      // 如果是从组件库拖拽过来的新组件
      if ('type' in item && !('id' in item) && onAddComponent) {
        // 生成唯一ID，使用时间戳和随机数
        const uniqueId = `component-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        
        // 计算新组件位置，避免与现有组件重叠
        const defaultWidth = 400
        const defaultHeight = 300
        let newX = Math.max(0, x - defaultWidth / 2)
        let newY = Math.max(0, y - defaultHeight / 2)
        
        // 检查是否与现有组件重叠，如果重叠则偏移位置
        const padding = 20
        let attempts = 0
        while (attempts < 10) {
          const overlapping = components.some(comp => {
            const compRight = comp.position.x + comp.position.width
            const compBottom = comp.position.y + comp.position.height
            const newRight = newX + defaultWidth
            const newBottom = newY + defaultHeight
            
            return !(
              newX > compRight + padding ||
              newRight < comp.position.x - padding ||
              newY > compBottom + padding ||
              newBottom < comp.position.y - padding
            )
          })
          
          if (!overlapping) {
            break
          }
          
          // 如果重叠，向右下方偏移
          newX += defaultWidth + padding
          newY += defaultHeight + padding
          attempts++
        }
        
        const newComponent: ComponentConfig = {
          id: uniqueId,
          type: item.type,
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
        onAddComponent(newComponent)
        return
      }

      // 如果是画布上已有的组件，更新位置
      if ('id' in item) {
        // 获取拖拽的初始偏移量（如果有）
        const dragOffset = (item as any).dragOffset
        let newX = x - item.position.width / 2
        let newY = y - item.position.height / 2

        // 如果有拖拽偏移量，使用更精确的计算
        if (dragOffset) {
          const initialOffset = monitor.getInitialClientOffset()
          if (initialOffset) {
            const deltaX = offset.x - initialOffset.x
            const deltaY = offset.y - initialOffset.y
            newX = item.position.x + deltaX
            newY = item.position.y + deltaY
          }
        }

        onUpdateComponent(item.id, {
          position: {
            ...item.position,
            x: Math.max(0, newX),
            y: Math.max(0, newY),
          },
        })
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }))


  return (
    <div
      ref={(node) => {
        drop(node)
        canvasRef.current = node
      }}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        background: isOver && canDrop ? '#e6f7ff' : '#f5f5f5',
        overflow: 'auto',
        transition: 'background-color 0.2s',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onSelectComponent(null)
        }
      }}
    >
      {components.map((component) => (
        <ComponentWrapper
          key={component.id}
          component={component}
          isSelected={selectedComponent?.id === component.id}
          onSelect={() => onSelectComponent(component)}
          onUpdate={(updates) => onUpdateComponent(component.id, updates)}
          onDelete={() => onDeleteComponent(component.id)}
        />
      ))}
      {components.length === 0 && !dragPreview && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: '#999',
            fontSize: '16px',
          }}
        >
          从左侧组件库拖拽组件到此处，或点击组件添加到画布
        </div>
      )}
      
      {/* 拖拽预览 */}
      {dragPreview && (
        <div
          style={{
            position: 'absolute',
            left: Math.max(0, dragPreview.x - 200),
            top: Math.max(0, dragPreview.y - 150),
            width: 400,
            height: 300,
            border: '2px dashed #1890ff',
            backgroundColor: 'rgba(24, 144, 255, 0.1)',
            borderRadius: '4px',
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#1890ff',
            fontSize: '14px',
            zIndex: 9999,
          }}
        >
          放置组件
        </div>
      )}
    </div>
  )
}

export default Canvas

