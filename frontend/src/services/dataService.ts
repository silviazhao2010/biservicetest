import api from './api'

export const dataService = {
  querySQL: async (data: {
    dataset_id: number
    sql: string
    params?: any[]
  }) => {
    const response = await api.post('/data/query', data)
    return {
      data: response.data.data,
      columns: response.data.columns,
    }
  },

  getTableData: async (data: {
    dataset_id: number
    table_name: string
    filters?: Array<{
      field: string
      operator: string
      value: any
    }>
    limit?: number
    offset?: number
  }) => {
    const response = await api.post('/data/table-data', data)
    return response.data
  },

  insertData: async (data: {
    dataset_id: number
    table_name: string
    data: Record<string, any>
  }) => {
    const response = await api.post('/data/insert', data)
    return response.data
  },
}

