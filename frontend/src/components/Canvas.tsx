import React from 'react'
import { useDrop } from 'react-dnd'
import ComponentWrapper from './ComponentWrapper'
import type { ComponentConfig } from '../types'

interface CanvasProps {
  components: ComponentConfig[]
  selectedComponent: ComponentConfig | null
  onSelectComponent: (component: ComponentConfig | null) => void
  onUpdateComponent: (id: string, updates: Partial<ComponentConfig>) => void
  onDeleteComponent: (id: string) => void
}

const Canvas: React.FC<CanvasProps> = ({
  components,
  selectedComponent,
  onSelectComponent,
  onUpdateComponent,
  onDeleteComponent,
}) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'component',
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }))

  return (
    <div
      ref={drop}
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

