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
  dataSource: {
    type: 'table' | 'sql'
    datasetId: number
    tableName?: string
    sql?: string
    fields: Record<string, string>
    filters?: Filter[]
  }
  props: Record<string, any>
  relations?: ComponentRelation[]
}

export interface Filter {
  field: string
  operator: string
  value: any
}

