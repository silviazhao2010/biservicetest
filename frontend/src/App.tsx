import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import ReportList from './pages/ReportList'
import ReportDesigner from './pages/ReportDesigner'

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ReportList />} />
        <Route path="/designer" element={<ReportDesigner />} />
        <Route path="/designer/:reportId" element={<ReportDesigner />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

