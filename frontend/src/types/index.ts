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

export interface InteractionConfig {
  // 钻取配置
  drillDown?: {
    enabled: boolean
    type: 'self' | 'filter' | 'navigate' // self: 钻取本组件, filter: 过滤其他组件, navigate: 跳转到其他报表
    targetComponentId?: string // 目标组件ID（用于过滤）
    reportId?: number // 目标报表ID（用于跳转）
    field?: string // 用于钻取的字段（已废弃，使用dimensions）
    // 钻取维度配置（最多3级）
    dimensions?: {
      level1?: string // 一级维度字段
      level2?: string // 二级维度字段
      level3?: string // 三级维度字段
    }
  }
  // 跳转配置
  navigation?: {
    enabled: boolean
    type: 'report' | 'url' // report: 跳转到报表, url: 跳转到URL
    reportId?: number // 目标报表ID
    url?: string // 目标URL
    openInNewTab?: boolean // 是否在新标签页打开
  }
  // 过滤配置
  filter?: {
    enabled: boolean
    targetComponentIds?: string[] // 目标组件ID列表
    field?: string // 用于过滤的字段
  }
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
  interaction?: InteractionConfig // 交互控制配置
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
  conditions: DataSourceCondition[] // 多个条件，支持组合判断
  logicOperator?: 'AND' | 'OR' // 逻辑运算符，默认为 AND
  datasetId: number
  tableName?: string
  sql?: string
  fields?: Record<string, string> // 字段映射，如果未设置则使用属性配置中的字段映射
  // 为了向后兼容，保留 condition 字段（已废弃，使用 conditions 替代）
  condition?: DataSourceCondition
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

