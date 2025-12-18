import React, { useRef } from 'react'
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

  const [{ isOver }, drop] = useDrop(() => ({
    accept: ['component', 'component-library'],
    drop: (item: ComponentConfig | { type: ComponentConfig['type'] }, monitor) => {
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
        const newComponent: ComponentConfig = {
          id: `component-${Date.now()}`,
          type: item.type,
          position: {
            x: Math.max(0, x - 200),
            y: Math.max(0, y - 150),
            width: 400,
            height: 300,
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
        background: isOver ? '#e6f7ff' : '#f5f5f5',
        overflow: 'auto',
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
      {components.length === 0 && (
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
    </div>
  )
}

export default Canvas

