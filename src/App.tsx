import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import TitleBar from './components/TitleBar'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import PaperListPage from './pages/PaperListPage'
import PaperDetailPage from './pages/PaperDetailPage'
import PaperUploadPage from './pages/PaperUploadPage'
import ReviewFormPage from './pages/ReviewFormPage'
import PricingPage from './pages/PricingPage'
import SettingsPage from './pages/SettingsPage'

const isTauri = '__TAURI_INTERNALS__' in window

export default function App() {
  return (
    <div className="flex h-screen flex-col">
      {isTauri && <TitleBar />}
      <div className="min-h-0 flex-1">
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Protected routes */}
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/history" element={<PaperListPage />} />
        <Route path="/upload" element={<PaperUploadPage />} />
        <Route path="/suggestions" element={<PaperDetailPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/papers" element={<PaperListPage />} />
        <Route path="/papers/upload" element={<PaperUploadPage />} />
        <Route path="/papers/:id" element={<PaperDetailPage />} />
        <Route path="/papers/:paperId/review" element={<ReviewFormPage />} />
      </Route>
    </Routes>
      </div>
    </div>
  )
}
