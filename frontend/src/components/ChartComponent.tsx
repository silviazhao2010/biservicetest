import React, { useEffect, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import { Select, Input } from 'antd'
import { dataService } from '../services/dataService'
import type { ComponentConfig } from '../types'

interface ChartComponentProps {
  component: ComponentConfig
}

const ChartComponent: React.FC<ChartComponentProps> = ({ component }) => {
  const [chartData, setChartData] = useState<any>(null)

  useEffect(() => {
    loadData()
  }, [component.dataSource])

  const loadData = async () => {
    if (!component.dataSource.datasetId || !component.dataSource.tableName) {
      return
    }

    try {
      const result = await dataService.getTableData({
        dataset_id: component.dataSource.datasetId,
        table_name: component.dataSource.tableName,
        filters: component.dataSource.filters || [],
      })

      setChartData(result.data)
    } catch (error) {
      console.error('加载数据失败:', error)
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

