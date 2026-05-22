import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthProvider'
import ProtectedRoute from './components/layout/ProtectedRoute'
import Navbar from './components/layout/Navbar'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import DashboardPage from './pages/DashboardPage'
import RetouchPage from './pages/RetouchPage'
import BackgroundPage from './pages/BackgroundPage'
import TokensPage from './pages/TokensPage'
import HelpPage from './pages/HelpPage'
import HistoryPage from './pages/HistoryPage'
import AdminPage from './pages/admin/AdminPage'
import AdminRoute from './components/layout/AdminRoute'

function AppLayout({ children }) {
  return (
    <div className="flex flex-col h-screen bg-[#0d0d0d]">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          <Route path="/dashboard" element={
            <ProtectedRoute>
              <AppLayout><DashboardPage /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/retouch" element={
            <ProtectedRoute>
              <AppLayout><RetouchPage /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/background" element={
            <ProtectedRoute>
              <AppLayout><BackgroundPage /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/tokens" element={
            <ProtectedRoute>
              <AppLayout><TokensPage /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/help" element={
            <ProtectedRoute>
              <AppLayout><HelpPage /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/history" element={
            <ProtectedRoute>
              <AppLayout><HistoryPage /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/admin" element={
            <ProtectedRoute>
              <AdminRoute>
                <AppLayout><AdminPage /></AppLayout>
              </AdminRoute>
            </ProtectedRoute>
          } />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
