import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import ReportList from './pages/ReportList'
import ReportDesigner from './pages/ReportDesigner'
import DatabaseViewer from './pages/DatabaseViewer'

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ReportList />} />
        <Route path="/designer" element={<ReportDesigner />} />
        <Route path="/designer/:reportId" element={<ReportDesigner />} />
        <Route path="/database" element={<DatabaseViewer />} />
        <Route path="/database/:datasetId" element={<DatabaseViewer />} />
        <Route path="/database/:datasetId/:tableName" element={<DatabaseViewer />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

