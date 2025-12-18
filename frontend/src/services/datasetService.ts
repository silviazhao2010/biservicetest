import api from './api'
import type { Dataset, DataTable } from '../types'

export const datasetService = {
  getDatasets: async (): Promise<Dataset[]> => {
    const response = await api.get('/datasets')
    return response.data.data
  },

  createDataset: async (data: {
    name: string
    description: string
    database_path: string
  }): Promise<Dataset> => {
    const response = await api.post('/datasets', data)
    return response.data.data
  },

  getTables: async (datasetId: number): Promise<DataTable[]> => {
    const response = await api.get(`/datasets/${datasetId}/tables`)
    return response.data.data
  },
}

