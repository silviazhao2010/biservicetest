import api from './api'
import type { Report, ReportConfig } from '../types'

export const reportService = {
  getReports: async (): Promise<Report[]> => {
    const response = await api.get('/reports')
    return response.data.data
  },

  getReport: async (reportId: number): Promise<Report> => {
    const response = await api.get(`/reports/${reportId}`)
    return response.data.data
  },

  createReport: async (data: {
    name: string
    description: string
    config: ReportConfig
    created_by?: string
  }): Promise<Report> => {
    const response = await api.post('/reports', data)
    return response.data.data
  },

  updateReport: async (
    reportId: number,
    data: {
      name?: string
      description?: string
      config?: ReportConfig
    }
  ): Promise<Report> => {
    const response = await api.put(`/reports/${reportId}`, data)
    return response.data.data
  },

  deleteReport: async (reportId: number): Promise<void> => {
    await api.delete(`/reports/${reportId}`)
  },
}

