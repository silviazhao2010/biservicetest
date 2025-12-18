import React, { useEffect, useState, useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import { Select, Input } from 'antd'
import { dataService } from '../services/dataService'
import type { ComponentConfig } from '../types'

interface ChartComponentProps {
  component: ComponentConfig
  allComponents?: ComponentConfig[]
  getComponentValue?: (componentId: string, field?: string) => any
  onComponentValueChange?: (componentId: string, value: any, field?: string) => void
}

const ChartComponent: React.FC<ChartComponentProps> = ({ component, allComponents = [], getComponentValue, onComponentValueChange }) => {
  const [chartData, setChartData] = useState<any>(null)

  // 获取所有依赖的组件值，用于监听变化
  const dependentValuesKey = useMemo(() => {
    if (component.dataSource.type !== 'conditional' || !component.dataSource.conditionalSources) {
      return ''
    }
    
    const values: Record<string, any> = {}
    component.dataSource.conditionalSources.forEach(source => {
      if (source.condition.valueType === 'component' && source.condition.componentId) {
        const compId = source.condition.componentId
        const field = source.condition.componentField || 'value'
        
        // 优先使用 getComponentValue，如果没有则从 allComponents 中获取
        let value: any = null
        if (getComponentValue) {
          value = getComponentValue(compId, field)
        } else {
          const sourceComponent = allComponents.find(c => c.id === compId)
          if (sourceComponent) {
            // 对于下拉列表，value和selectedValue都指向同一个值
            if (sourceComponent.type === 'dropdown' && (field === 'value' || field === 'selectedValue')) {
              value = (sourceComponent.props as any)?.value || null
            } else {
              value = (sourceComponent.props as any)?.[field] || null
            }
          }
        }
        values[`${compId}.${field}`] = value
      }
    })
    return JSON.stringify(values)
  }, [component.dataSource, allComponents])

  useEffect(() => {
    loadData()
  }, [component.dataSource, dependentValuesKey, component.id, allComponents])

  const loadData = async () => {
    // 如果是条件数据源，需要根据条件选择数据源
    let datasetId: number | undefined
    let tableName: string | undefined

    if (component.dataSource.type === 'conditional') {
      // 评估条件，选择合适的数据源
      const selectedSource = evaluateConditionalSource(component)
      if (selectedSource) {
        datasetId = selectedSource.datasetId
        tableName = selectedSource.tableName
      } else if (component.dataSource.defaultSource) {
        // 使用默认数据源
        datasetId = component.dataSource.defaultSource.datasetId
        tableName = component.dataSource.defaultSource.tableName
      }
    } else {
      // 固定数据源
      datasetId = component.dataSource.datasetId
      tableName = component.dataSource.tableName
    }

    if (!datasetId || !tableName) {
      setChartData(null)
      return
    }

    try {
      const result = await dataService.getTableData({
        dataset_id: datasetId,
        table_name: tableName,
        filters: component.dataSource.filters || [],
      })

      setChartData(result.data)
    } catch (error) {
      console.error('加载数据失败:', error)
      setChartData(null)
    }
  }

  // 评估条件数据源，返回匹配的数据源配置
  const evaluateConditionalSource = (comp: ComponentConfig): { datasetId: number, tableName?: string } | null => {
    if (comp.dataSource.type !== 'conditional' || !comp.dataSource.conditionalSources) {
      return null
    }

    // 遍历所有条件，找到第一个匹配的条件
    for (const source of comp.dataSource.conditionalSources) {
      const condition = source.condition
      let conditionValue: any

      // 获取条件值
      if (condition.valueType === 'static') {
        conditionValue = condition.staticValue
      } else if (condition.valueType === 'component' && condition.componentId) {
        // 从其他组件获取值
        const field = condition.componentField || 'value'
        if (getComponentValue) {
          conditionValue = getComponentValue(condition.componentId, field)
        } else {
          // 如果没有提供getComponentValue，尝试从allComponents中查找
          const sourceComponent = allComponents.find(c => c.id === condition.componentId)
          if (sourceComponent) {
            // 对于下拉列表，value和selectedValue都指向同一个值
            if (sourceComponent.type === 'dropdown' && (field === 'value' || field === 'selectedValue')) {
              conditionValue = (sourceComponent.props as any)?.value || null
            } else {
              conditionValue = (sourceComponent.props as any)?.[field] || null
            }
          }
        }
      }

      // 评估条件
      if (evaluateCondition(condition, conditionValue)) {
        return {
          datasetId: source.datasetId,
          tableName: source.tableName,
        }
      }
    }

    return null
  }

  // 评估单个条件
  const evaluateCondition = (condition: any, value: any): boolean => {
    if (value === null || value === undefined) {
      return false
    }

    const operator = condition.operator || '='
    // 如果是组件值模式，根据模式选择比较值
    let conditionValue: any
    if (condition.valueType === 'component') {
      if (condition.componentValueMode === 'fixed') {
        // 使用固定值匹配模式：比较组件的当前值和配置的目标值
        conditionValue = condition.componentTargetValue
      } else {
        // 使用组件当前值模式：这种情况下，条件值应该是静态值（用于比较）
        // 但实际上，当使用组件值时，应该使用fixed模式来明确指定目标值
        // 这里保留兼容性，但建议使用fixed模式
        conditionValue = condition.staticValue
      }
    } else {
      // 静态值类型
      conditionValue = condition.staticValue
    }

    switch (operator) {
      case '=':
        return String(value) === String(conditionValue)
      case '!=':
        return String(value) !== String(conditionValue)
      case '>':
        return Number(value) > Number(conditionValue)
      case '<':
        return Number(value) < Number(conditionValue)
      case '>=':
        return Number(value) >= Number(conditionValue)
      case '<=':
        return Number(value) <= Number(conditionValue)
      case 'LIKE':
        return String(value).includes(String(conditionValue))
      case 'IN':
        const inValues = Array.isArray(conditionValue) ? conditionValue : [conditionValue]
        return inValues.includes(value)
      default:
        return false
    }
  }

  const renderChart = () => {
    if (!chartData || chartData.length === 0) {
      return <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>暂无数据</div>
    }

    const fields = component.dataSource.fields || {}
    
    switch (component.type) {
      case 'line_chart':
        return (
          <ReactECharts
            option={{
              xAxis: {
                type: 'category',
                data: chartData.map((item: any) => item[fields.x || '']),
              },
              yAxis: {
                type: 'value',
              },
              series: [{
                data: chartData.map((item: any) => item[fields.y || '']),
                type: 'line',
              }],
            }}
            style={{ height: '100%', width: '100%' }}
          />
        )
      
      case 'pie_chart':
        return (
          <ReactECharts
            option={{
              series: [{
                type: 'pie',
                data: chartData.map((item: any) => ({
                  name: item[fields.category || ''],
                  value: item[fields.value || ''],
                })),
              }],
            }}
            style={{ height: '100%', width: '100%' }}
          />
        )
      
      case 'dropdown':
        return (
          <Select
            style={{ width: '100%' }}
            placeholder="请选择"
            value={(component.props as any)?.value}
            onChange={(value) => {
              if (onComponentValueChange) {
                onComponentValueChange(component.id, value, 'value')
              }
            }}
            options={chartData.map((item: any) => ({
              label: item[fields.option || ''],
              value: item[fields.option || ''],
            }))}
          />
        )
      
      case 'text_input':
        return (
          <Input 
            placeholder="请输入"
            value={(component.props as any)?.value || ''}
            onChange={(e) => {
              if (onComponentValueChange) {
                onComponentValueChange(component.id, e.target.value, 'value')
              }
            }}
          />
        )
      
      case 'tree_chart':
        return (
          <ReactECharts
            option={{
              series: [{
                type: 'tree',
                data: buildTreeData(chartData, fields),
                layout: 'orthogonal',
                orient: 'TB',
              }],
            }}
            style={{ height: '100%', width: '100%' }}
          />
        )
      
      default:
        return <div>不支持的图表类型</div>
    }
  }

  const buildTreeData = (data: any[], fields: Record<string, string>) => {
    // 简单的树形数据构建示例
    return [{
      name: '根节点',
      children: data.map((item: any) => ({
        name: item[fields.name || ''] || '节点',
        value: item[fields.value || ''],
      })),
    }]
  }

  return (
    <div style={{ height: '100%', width: '100%' }}>
      {renderChart()}
    </div>
  )
}

export default ChartComponent

