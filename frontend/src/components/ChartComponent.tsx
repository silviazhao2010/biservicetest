import React, { useEffect, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import { Select, Input } from 'antd'
import { dataService } from '../services/dataService'
import type { ComponentConfig } from '../types'

interface ChartComponentProps {
  component: ComponentConfig
  allComponents?: ComponentConfig[]
  getComponentValue?: (componentId: string, field?: string) => any
}

const ChartComponent: React.FC<ChartComponentProps> = ({ component, allComponents = [], getComponentValue }) => {
  const [chartData, setChartData] = useState<any>(null)

  useEffect(() => {
    loadData()
  }, [component.dataSource])

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
        if (getComponentValue) {
          conditionValue = getComponentValue(condition.componentId, condition.componentField)
        } else {
          // 如果没有提供getComponentValue，尝试从allComponents中查找
          const sourceComponent = allComponents.find(c => c.id === condition.componentId)
          if (sourceComponent && condition.componentField) {
            // 尝试从组件的props或dataSource中获取值
            conditionValue = (sourceComponent.props as any)?.[condition.componentField]
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
    const conditionValue = condition.staticValue

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
            options={chartData.map((item: any) => ({
              label: item[fields.option || ''],
              value: item[fields.option || ''],
            }))}
          />
        )
      
      case 'text_input':
        return <Input placeholder="请输入" />
      
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

