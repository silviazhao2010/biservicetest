export interface Dataset {
  id: number
  name: string
  description: string
  database_path: string
  created_at: string
  updated_at: string
}

export interface DataTable {
  id: number
  table_name: string
  display_name: string
  schema_info: {
    fields: Array<{
      name: string
      type: string
      notnull: boolean
      default: any
      pk: boolean
    }>
  }
}

export interface Report {
  id: number
  name: string
  description: string
  config: ReportConfig
  created_by: string
  created_at: string
  updated_at: string
}

export interface ReportConfig {
  components: ComponentConfig[]
  relations?: Array<{
    sourceId: string
    targetId: string
    relationType: 'filter' | 'data' | 'trigger'
    config?: Record<string, any>
  }>
}

export interface ComponentRelation {
  targetComponentId: string
  relationType: 'filter' | 'data' | 'trigger'
  sourceField?: string
  targetField?: string
  operator?: string
}

export interface ComponentConfig {
  id: string
  type: 'line_chart' | 'pie_chart' | 'dropdown' | 'text_input' | 'tree_chart'
  position: {
    x: number
    y: number
    width: number
    height: number
  }
  style: {
    backgroundColor?: string
    borderColor?: string
    fontSize?: number
  }
  dataSource: DataSourceConfig
  props: Record<string, any>
  relations?: ComponentRelation[]
}

export interface Filter {
  field: string
  operator: string
  value: any
}

export interface DataSourceCondition {
  field?: string
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'IN' | 'LIKE'
  valueType: 'static' | 'component'
  staticValue?: any
  componentId?: string
  componentField?: string
  // 组件值模式下的目标值配置
  componentValueMode?: 'current' | 'fixed' // 'current': 使用组件当前值, 'fixed': 使用固定值匹配
  componentTargetValue?: any // 当componentValueMode为'fixed'时，用于匹配的目标值
  componentTargetValueSource?: 'input' | 'datasource' // 目标值来源：手动输入或从数据源选择
  componentTargetValueField?: string // 从数据源选择时使用的字段名
}

export interface ConditionalDataSource {
  condition: DataSourceCondition
  datasetId: number
  tableName?: string
  sql?: string
}

export interface DataSourceConfig {
  type?: 'table' | 'sql' | 'conditional'
  datasetId?: number
  tableName?: string
  sql?: string
  fields: Record<string, string>
  filters?: Filter[]
  // 条件数据源选择配置
  conditionalSources?: ConditionalDataSource[]
  defaultSource?: {
    datasetId: number
    tableName?: string
    sql?: string
  }
}

