import React, { useEffect, useState, useMemo, useRef } from 'react'
import ReactECharts from 'echarts-for-react'
import { Select, Input, Button } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedFields, setSelectedFields] = useState<Record<string, string> | undefined>(undefined)
  // 钻取状态：存储当前钻取层级和维度值
  const drillDownState = (component.props as any)?.drillDownState || { level: 0, values: {} }
  
  // 如果组件无效，显示错误信息
  if (!component) {
    return (
      <div style={{ textAlign: 'center', padding: '20px', color: '#999', fontSize: '14px' }}>
        组件未定义
      </div>
    )
  }

  // 获取所有依赖的组件值，用于监听变化
  const dependentValuesKey = useMemo(() => {
    if (!component?.dataSource || component.dataSource.type !== 'conditional' || !component.dataSource.conditionalSources) {
      return ''
    }
    
    const values: Record<string, any> = {}
    component.dataSource.conditionalSources.forEach(source => {
      // 为了向后兼容，支持旧的 condition 格式
      const conditions = source.conditions || (source.condition ? [source.condition] : [])
      conditions.forEach(condition => {
        if (condition.valueType === 'component' && condition.componentId) {
          const compId = condition.componentId
          const field = condition.componentField || 'value'
          
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
              } else if (sourceComponent.type === 'tree_chart') {
                // 对于树图，支持 selectedNodePath 字段
                if (field === 'selectedNodePath') {
                  value = (sourceComponent.props as any)?.selectedNodePath || null
                } else if (field === 'selectedNode' || field === 'value') {
                  // 返回选中路径的最后一个节点名称
                  const path = (sourceComponent.props as any)?.selectedNodePath || []
                  value = path.length > 0 ? path[path.length - 1] : null
                } else {
                  value = (sourceComponent.props as any)?.[field] || null
                }
              } else {
                value = (sourceComponent.props as any)?.[field] || null
              }
            }
          }
          values[`${compId}.${field}`] = value
        }
      })
    })
    return JSON.stringify(values)
  }, [component?.dataSource, component?.id, allComponents, getComponentValue])

  // 使用 useRef 来跟踪组件数据源，避免不必要的重新加载
  const prevDataSourceRef = useRef<string>('')
  const prevDependentValuesKeyRef = useRef<string>('')
  const prevComponentIdRef = useRef<string>('')
  
  useEffect(() => {
    // 检查组件和数据源是否存在
    if (!component || !component.dataSource) {
      setChartData(null)
      setLoading(false)
      setError(null)
      return
    }

    try {
      // 检查数据源或组件ID是否真的发生了变化
      const currentDataSourceKey = JSON.stringify(component.dataSource)
      const dataSourceChanged = prevDataSourceRef.current !== currentDataSourceKey
      const dependentValuesChanged = prevDependentValuesKeyRef.current !== dependentValuesKey
      const componentIdChanged = prevComponentIdRef.current !== component.id
      
      // 初始化时也要加载数据
      if (prevComponentIdRef.current === '') {
        prevDataSourceRef.current = currentDataSourceKey
        prevDependentValuesKeyRef.current = dependentValuesKey
        prevComponentIdRef.current = component.id
        loadData()
        return
      }
      
      // 只有在真正变化时才加载数据
      if (dataSourceChanged || dependentValuesChanged || componentIdChanged) {
        prevDataSourceRef.current = currentDataSourceKey
        prevDependentValuesKeyRef.current = dependentValuesKey
        prevComponentIdRef.current = component.id
        loadData()
      }
    } catch (error) {
      console.error('useEffect 中出错:', error)
      setError('组件配置错误')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [component?.dataSource, dependentValuesKey, component?.id, component?.props?.drillDownState])

  const loadData = async () => {
    try {
      setError(null)
      
      // 检查组件和数据源
      if (!component || !component.dataSource) {
        setChartData(null)
        setLoading(false)
        return
      }
      
      // 如果是条件数据源，需要根据条件选择数据源
      let datasetId: number | undefined
      let tableName: string | undefined
      let currentSelectedFields: Record<string, string> | undefined

      if (component.dataSource.type === 'conditional') {
        // 评估条件，选择合适的数据源
        const selectedSource = evaluateConditionalSource(component)
        if (selectedSource) {
          datasetId = selectedSource.datasetId
          tableName = selectedSource.tableName
          currentSelectedFields = selectedSource.fields // 使用条件数据源的字段映射（如果存在）
        } else if (component.dataSource.defaultSource) {
          // 使用默认数据源
          datasetId = component.dataSource.defaultSource.datasetId
          tableName = component.dataSource.defaultSource.tableName
          // 默认数据源使用组件配置的字段映射
          currentSelectedFields = undefined
        }
      } else {
        // 固定数据源
        datasetId = component.dataSource.datasetId
        tableName = component.dataSource.tableName
        // 固定数据源使用组件配置的字段映射
        currentSelectedFields = undefined
      }

      if (!datasetId) {
        setChartData(null)
        setLoading(false)
        return
      }

      setLoading(true)
      
      // 从 component.props 获取最新的 drillDownState（确保使用最新值，而不是闭包中的旧值）
      const currentDrillDownState = (component.props as any)?.drillDownState || { level: 0, values: {} }
      
      // 构建过滤条件：包括数据源配置的过滤器和钻取过滤器
      const filters = [...(component.dataSource.filters || [])]
      
      // 如果启用了钻取本组件功能，添加钻取过滤器
      if (component.interaction?.drillDown?.enabled && 
          component.interaction.drillDown.type === 'self' &&
          currentDrillDownState && currentDrillDownState.level > 0) {
        const dimensions = component.interaction.drillDown.dimensions
        if (dimensions && currentDrillDownState.values) {
          // 根据当前钻取层级添加过滤条件
          // 当在1级时，使用level1的值过滤（显示该一级维度值下的二级维度数据）
          // 当在2级时，使用level1和level2的值过滤（显示该一级和二级维度值下的三级维度数据）
          // 当在3级时，使用level1、level2和level3的值过滤
          
          console.log('构建钻取过滤条件:', {
            currentDrillDownState,
            dimensions,
            level: currentDrillDownState.level,
            values: currentDrillDownState.values,
            hasLevel1: !!currentDrillDownState.values.level1,
            hasLevel2: !!currentDrillDownState.values.level2,
            hasLevel3: !!currentDrillDownState.values.level3,
          })
          
          // 一级维度过滤（当level >= 1时，必须过滤一级维度）
          if (currentDrillDownState.level >= 1 && currentDrillDownState.values.level1 && dimensions.level1) {
            const filter1 = {
              field: dimensions.level1,
              operator: '=' as const,
              value: currentDrillDownState.values.level1,
            }
            filters.push(filter1)
            console.log('添加一级维度过滤:', filter1)
          }
          
          // 二级维度过滤（当level >= 2时，必须过滤二级维度）
          if (currentDrillDownState.level >= 2 && currentDrillDownState.values.level2 && dimensions.level2) {
            const filter2 = {
              field: dimensions.level2,
              operator: '=' as const,
              value: currentDrillDownState.values.level2,
            }
            filters.push(filter2)
            console.log('添加二级维度过滤:', filter2)
          }
          
          // 三级维度过滤（当level >= 3时，必须过滤三级维度）
          if (currentDrillDownState.level >= 3 && currentDrillDownState.values.level3 && dimensions.level3) {
            const filter3 = {
              field: dimensions.level3,
              operator: '=' as const,
              value: currentDrillDownState.values.level3,
            }
            filters.push(filter3)
            console.log('添加三级维度过滤:', filter3)
          }
          
          console.log('最终过滤条件:', filters)
        } else {
          console.warn('钻取配置不完整:', { dimensions, currentDrillDownState })
        }
      }
      
      const result = await dataService.getTableData({
        dataset_id: datasetId,
        table_name: tableName, // tableName 现在是可选的
        filters: filters,
      })
      
      // 如果返回了自动选择的表名，更新组件配置，以便字段配置可以正确显示
      if (result.table_name && !tableName && onComponentValueChange) {
        // 更新组件配置，保存自动选择的表名
        const updates: any = {}
        if (component.dataSource.type === 'conditional') {
          if (component.dataSource.defaultSource) {
            updates.defaultSource = {
              ...component.dataSource.defaultSource,
              tableName: result.table_name,
            }
          }
        } else {
          updates.tableName = result.table_name
        }
        onComponentValueChange(component.id, updates, 'dataSource')
      }

      setChartData(result.data || [])
      setSelectedFields(currentSelectedFields) // 保存当前使用的字段映射
      setError(null)
    } catch (error: any) {
      console.error('加载数据失败:', error)
      setError(error?.message || '加载数据失败')
      setChartData(null)
    } finally {
      setLoading(false)
    }
  }

  // 评估条件数据源，返回匹配的数据源配置（包括字段映射）
  const evaluateConditionalSource = (comp: ComponentConfig): { datasetId: number, tableName?: string, fields?: Record<string, string> } | null => {
    if (comp.dataSource.type !== 'conditional' || !comp.dataSource.conditionalSources) {
      return null
    }

    // 遍历所有条件，找到第一个匹配的条件
    for (const source of comp.dataSource.conditionalSources) {
      // 为了向后兼容，支持旧的 condition 格式
      const conditions = source.conditions || (source.condition ? [source.condition] : [])
      const logicOperator = source.logicOperator || 'AND'
      
      // 评估所有子条件
      const conditionResults: boolean[] = []
      for (const condition of conditions) {
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
              } else if (sourceComponent.type === 'tree_chart') {
                // 对于树图，支持 selectedNodePath 字段
                if (field === 'selectedNodePath') {
                  conditionValue = (sourceComponent.props as any)?.selectedNodePath || null
                } else if (field === 'selectedNode' || field === 'value') {
                  // 返回选中路径的最后一个节点名称
                  const path = (sourceComponent.props as any)?.selectedNodePath || []
                  conditionValue = path.length > 0 ? path[path.length - 1] : null
                } else {
                  conditionValue = (sourceComponent.props as any)?.[field] || null
                }
              } else {
                conditionValue = (sourceComponent.props as any)?.[field] || null
              }
            }
          }
        }

        // 评估单个条件
        conditionResults.push(evaluateCondition(condition, conditionValue))
      }
      
      // 根据逻辑运算符组合结果
      let matched = false
      if (logicOperator === 'AND') {
        matched = conditionResults.length > 0 && conditionResults.every(result => result === true)
      } else if (logicOperator === 'OR') {
        matched = conditionResults.some(result => result === true)
      }
      
      if (matched) {
        return {
          datasetId: source.datasetId,
          tableName: source.tableName,
          fields: source.fields, // 返回条件数据源的字段映射
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
    // 检查组件和数据源是否存在
    if (!component || !component.dataSource) {
      return (
        <div style={{ textAlign: 'center', padding: '20px', color: '#999', fontSize: '14px' }}>
          组件配置错误
        </div>
      )
    }

    // 检查数据源配置
    let datasetId: number | undefined
    let tableName: string | undefined

    if (component.dataSource.type === 'conditional') {
      if (component.dataSource.defaultSource) {
        datasetId = component.dataSource.defaultSource.datasetId
        tableName = component.dataSource.defaultSource.tableName
      }
    } else {
      datasetId = component.dataSource.datasetId
      tableName = component.dataSource.tableName
    }

    // 如果数据集未配置，显示提示（表名现在是可选的）
    if (!datasetId) {
      return (
        <div style={{ textAlign: 'center', padding: '20px', color: '#999', fontSize: '14px' }}>
          {component.dataSource.type === 'conditional' 
            ? '请配置条件数据源（默认数据源）' 
            : '请配置数据源'}
        </div>
      )
    }

    // 如果数据为空，显示提示
    if (!chartData || chartData.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '20px', color: '#999', fontSize: '14px' }}>
          暂无数据
        </div>
      )
    }

    // 使用条件数据源的字段映射（如果存在），否则使用组件配置的字段映射
    const fields = selectedFields || component.dataSource.fields || {}
    
    // 处理钻取点击事件
    const handleDrillDownClick = (clickedValue: any, clickedField?: string, dataIndex?: number) => {
      if (!component.interaction?.drillDown?.enabled || 
          component.interaction.drillDown.type !== 'self' ||
          !onComponentValueChange) {
        return
      }
      
      const dimensions = component.interaction.drillDown.dimensions
      if (!dimensions) {
        return
      }
      
      const currentLevel = drillDownState.level
      // 确保 values 对象被正确复制
      const newState = { 
        level: drillDownState.level,
        values: { ...drillDownState.values }
      }
      
      // 确定点击的是哪个维度的字段
      let targetLevel = 0
      let targetField = ''
      
      if (currentLevel === 0 && dimensions.level1) {
        // 从0级下钻到1级：点击的是一级维度的值（如"江苏"）
        targetLevel = 1
        targetField = dimensions.level1
        // 保存点击的一级维度值到 level1，用于过滤
        newState.values.level1 = clickedValue
      } else if (currentLevel === 1 && dimensions.level2) {
        // 从1级下钻到2级：点击的是二级维度的值（如"南京"）
        targetLevel = 2
        targetField = dimensions.level2
        // 保存点击的二级维度值到 level2，用于过滤
        // level1 的值保持不变，用于过滤（从 drillDownState.values 中保留）
        newState.values.level1 = drillDownState.values.level1
        newState.values.level2 = clickedValue
      } else if (currentLevel === 2 && dimensions.level3) {
        // 从2级下钻到3级：点击的是三级维度的值
        targetLevel = 3
        targetField = dimensions.level3
        // 保存点击的三级维度值到 level3，用于过滤
        // level1 和 level2 的值保持不变，用于过滤（从 drillDownState.values 中保留）
        newState.values.level1 = drillDownState.values.level1
        newState.values.level2 = drillDownState.values.level2
        newState.values.level3 = clickedValue
      }
      
      if (targetLevel > 0 && targetField) {
        // 更新钻取状态
        newState.level = targetLevel
        
        // 清除更高级别的值
        for (let i = targetLevel + 1; i <= 3; i++) {
          delete newState.values[`level${i}`]
        }
        
        console.log('钻取下钻:', {
          currentLevel,
          targetLevel,
          clickedValue,
          targetField,
          newState,
        })
        
        // 保存钻取状态并触发数据重新加载
        onComponentValueChange(component.id, newState, 'drillDownState')
      }
    }
    
    // 处理返回上级
    const handleDrillUp = () => {
      if (!onComponentValueChange || drillDownState.level <= 0) {
        return
      }
      
      const newState = { ...drillDownState }
      const currentLevel = newState.level
      
      // 清除当前级别的值
      delete newState.values[`level${currentLevel}`]
      newState.level = currentLevel - 1
      
      // 保存钻取状态并触发数据重新加载
      onComponentValueChange(component.id, newState, 'drillDownState')
    }
    
    // 检查字段配置是否完整
    const hasRequiredFields = () => {
      switch (component.type) {
        case 'line_chart':
          return !!(fields.x && fields.y)
        case 'pie_chart':
          return !!(fields.category && fields.value)
        case 'tree_chart':
          return !!(fields.name && fields.value)
        case 'dropdown':
          return !!fields.option
        default:
          return true
      }
    }

    if (!hasRequiredFields()) {
      const fieldMessage = component.type === 'line_chart' ? 'X轴字段和Y轴字段' : 
                          component.type === 'pie_chart' ? '分类字段和数值字段' :
                          component.type === 'tree_chart' ? '名称字段和数值字段' :
                          component.type === 'dropdown' ? '选项字段' : '字段'
      return (
        <div style={{ textAlign: 'center', padding: '20px', color: '#ff4d4f', fontSize: '14px' }}>
          请配置字段映射：{fieldMessage}
        </div>
      )
    }
    
    switch (component.type) {
      case 'line_chart':
        // 确定当前钻取层级对应的维度字段
        const lineDrillField = drillDownState.level === 0 
          ? (component.interaction?.drillDown?.dimensions?.level1 || fields.x)
          : drillDownState.level === 1
          ? (component.interaction?.drillDown?.dimensions?.level2 || fields.x)
          : (component.interaction?.drillDown?.dimensions?.level3 || fields.x)
        
        return (
          <div style={{ height: '100%', width: '100%', position: 'relative' }}>
            {drillDownState.level > 0 && (
              <Button
                type="link"
                icon={<ArrowLeftOutlined />}
                onClick={handleDrillUp}
                style={{ position: 'absolute', top: 0, left: 0, zIndex: 1000 }}
              >
                返回上级
              </Button>
            )}
            <ReactECharts
              option={{
                xAxis: {
                  type: 'category',
                  data: chartData.map((item: any) => item[lineDrillField] || ''),
                },
                yAxis: {
                  type: 'value',
                },
                series: [{
                  data: chartData.map((item: any) => item[fields.y] || 0),
                  type: 'line',
                }],
              }}
              style={{ height: '100%', width: '100%' }}
              onEvents={{
                click: (params: any) => {
                  if (component.interaction?.drillDown?.enabled && 
                      component.interaction.drillDown.type === 'self') {
                    // 从图表数据中获取点击的值
                    // params.dataIndex 是点击的数据点索引
                    const dataIndex = params.dataIndex
                    let clickedValue = params.name || params.value
                    
                    // 如果可以从数据中获取，优先使用数据中的值
                    if (dataIndex !== undefined && chartData && chartData[dataIndex]) {
                      const clickedData = chartData[dataIndex]
                      clickedValue = clickedData[lineDrillField] || clickedValue
                    }
                    
                    console.log('折线图点击:', {
                      params,
                      dataIndex,
                      clickedValue,
                      lineDrillField,
                      chartData: chartData?.[dataIndex],
                    })
                    
                    handleDrillDownClick(clickedValue, lineDrillField, dataIndex)
                  }
                },
              }}
            />
          </div>
        )
      
      case 'pie_chart':
        // 确定当前钻取层级对应的维度字段
        const pieDrillField = drillDownState.level === 0 
          ? (component.interaction?.drillDown?.dimensions?.level1 || fields.category)
          : drillDownState.level === 1
          ? (component.interaction?.drillDown?.dimensions?.level2 || fields.category)
          : (component.interaction?.drillDown?.dimensions?.level3 || fields.category)
        
        return (
          <div style={{ height: '100%', width: '100%', position: 'relative' }}>
            {drillDownState.level > 0 && (
              <Button
                type="link"
                icon={<ArrowLeftOutlined />}
                onClick={handleDrillUp}
                style={{ position: 'absolute', top: 0, left: 0, zIndex: 1000 }}
              >
                返回上级
              </Button>
            )}
            <ReactECharts
              option={{
                series: [{
                  type: 'pie',
                  data: chartData.map((item: any) => ({
                    name: item[pieDrillField] || '',
                    value: item[fields.value] || 0,
                  })),
                }],
              }}
              style={{ height: '100%', width: '100%' }}
              onEvents={{
                click: (params: any) => {
                  if (component.interaction?.drillDown?.enabled && 
                      component.interaction.drillDown.type === 'self') {
                    // 从图表数据中获取点击的值
                    // params.dataIndex 是点击的数据点索引
                    const dataIndex = params.dataIndex
                    let clickedValue = params.name || params.data?.name || params.value
                    
                    // 如果可以从数据中获取，优先使用数据中的值
                    if (dataIndex !== undefined && chartData && chartData[dataIndex]) {
                      const clickedData = chartData[dataIndex]
                      clickedValue = clickedData[pieDrillField] || clickedValue
                    }
                    
                    console.log('饼图点击:', {
                      params,
                      dataIndex,
                      clickedValue,
                      pieDrillField,
                      chartData: chartData?.[dataIndex],
                    })
                    
                    handleDrillDownClick(clickedValue, pieDrillField, dataIndex)
                  }
                },
              }}
            />
          </div>
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
        const selectedNodePath = (component.props as any)?.selectedNodePath || []
        return (
          <ReactECharts
            option={{
              series: [{
                type: 'tree',
                data: buildTreeData(chartData, fields, selectedNodePath),
                layout: 'orthogonal',
                orient: 'TB',
                label: {
                  position: 'left',
                  verticalAlign: 'middle',
                  align: 'right',
                },
                leaves: {
                  label: {
                    position: 'right',
                    verticalAlign: 'middle',
                    align: 'left',
                  },
                },
                emphasis: {
                  focus: 'descendant',
                },
                expandAndCollapse: true,
                initialTreeDepth: 2,
              }],
            }}
            style={{ height: '100%', width: '100%' }}
            onEvents={{
              click: (params: any) => {
                if (params.data && onComponentValueChange) {
                  // params.data 中已经包含了 path 属性（在 buildTreeData 中添加）
                  const nodePath = params.data.path || []
                  onComponentValueChange(component.id, nodePath, 'selectedNodePath')
                }
              },
            }}
          />
        )
      
      default:
        return <div>不支持的图表类型</div>
    }
  }

  const buildTreeData = (data: any[], fields: Record<string, string>, selectedNodePath: string[] = []) => {
    // 递归函数：标记节点是否在选中路径中，并添加路径信息
    const markNode = (node: any, path: string[]): any => {
      const currentPath = [...path, node.name]
      const isSelected = selectedNodePath.length > 0 && 
        selectedNodePath.length === currentPath.length &&
        selectedNodePath.every((name, index) => name === currentPath[index])
      const isInPath = selectedNodePath.length > 0 && 
        currentPath.length <= selectedNodePath.length &&
        currentPath.every((name, index) => name === selectedNodePath[index])
      
      const nodeStyle: any = {}
      if (isSelected) {
        // 选中的节点：高亮显示
        nodeStyle.itemStyle = {
          color: '#1890ff',
          borderColor: '#1890ff',
          borderWidth: 2,
        }
        nodeStyle.label = {
          color: '#1890ff',
          fontWeight: 'bold',
        }
      } else if (isInPath) {
        // 在选中路径上的节点：半高亮
        nodeStyle.itemStyle = {
          color: '#91d5ff',
          borderColor: '#91d5ff',
          borderWidth: 1,
        }
        nodeStyle.label = {
          color: '#1890ff',
        }
      }
      
      // 添加路径信息到节点
      const nodeWithPath = {
        ...node,
        path: currentPath,
        ...nodeStyle,
      }
      
      if (node.children && node.children.length > 0) {
        return {
          ...nodeWithPath,
          children: node.children.map((child: any) => markNode(child, currentPath)),
        }
      }
      
      return nodeWithPath
    }
    
    // 构建树形数据
    const rootNode = {
      name: '根节点',
      value: data.reduce((sum: number, item: any) => sum + (Number(item[fields.value || '']) || 0), 0),
      children: data.map((item: any) => ({
        name: item[fields.name || ''] || '节点',
        value: item[fields.value || ''],
      })),
    }
    
    // 标记选中路径
    return [markNode(rootNode, [])]
  }

  // 确保总是有内容显示，避免空白
  let chartContent: React.ReactNode = null
  
  try {
    chartContent = renderChart()
  } catch (error: any) {
    console.error('渲染图表时出错:', error)
    chartContent = (
      <div style={{ textAlign: 'center', padding: '20px', color: '#ff4d4f', fontSize: '14px' }}>
        渲染错误: {error?.message || '未知错误'}
      </div>
    )
  }
  
  return (
    <div style={{ height: '100%', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100px' }}>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px', color: '#999', fontSize: '14px' }}>
          加载中...
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '20px', color: '#ff4d4f', fontSize: '14px' }}>
          {error}
        </div>
      ) : chartContent ? (
        chartContent
      ) : (
        <div style={{ textAlign: 'center', padding: '20px', color: '#999', fontSize: '14px' }}>
          请配置数据源
        </div>
      )}
    </div>
  )
}

export default ChartComponent

