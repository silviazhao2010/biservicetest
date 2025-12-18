import api from './api'
import type { Dataset, DataTable } from '../types'

export const datasetService = {
  getDatasets: async (): Promise<Dataset[]> => {
    const response = await api.get('/datasets')
    return response.data.data
  },

  createDataset: async (data: {
    name: string
    description?: string
    database_name?: string
  }): Promise<Dataset> => {
    const response = await api.post('/datasets', data)
    return response.data.data
  },

  getTables: async (datasetId: number): Promise<DataTable[]> => {
    const response = await api.get(`/datasets/${datasetId}/tables`)
    return response.data.data
  },

  createTable: async (datasetId: number, data: {
    table_name: string
    fields: Array<{
      name: string
      type: string
      primaryKey?: boolean
      notNull?: boolean
      default?: any
    }>
  }): Promise<void> => {
    await api.post(`/datasets/${datasetId}/tables`, data)
  },

  addColumn: async (datasetId: number, tableName: string, data: {
    column_name: string
    column_type: string
    not_null?: boolean
    default_value?: any
  }): Promise<void> => {
    await api.post(`/datasets/${datasetId}/tables/${tableName}/columns`, data)
  },
}

