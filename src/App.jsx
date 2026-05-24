import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthProvider'
import { ToastProvider } from './contexts/ToastContext'
import { LibraryProvider } from './contexts/LibraryContext'
import ProtectedRoute from './components/layout/ProtectedRoute'
import Navbar from './components/layout/Navbar'
import BottomNav from './components/layout/BottomNav'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import DashboardPage from './pages/DashboardPage'
import RetouchPage from './pages/RetouchPage'
import TokensPage from './pages/TokensPage'
import HelpPage from './pages/HelpPage'
import HistoryPage from './pages/HistoryPage'
import AdminPage from './pages/admin/AdminPage'
import PresetsEditorPage from './pages/admin/PresetsEditorPage'
import AdminRoute from './components/layout/AdminRoute'

function AppLayout({ children }) {
  return (
    <div className="flex flex-col h-dvh bg-[#0d0d0d]">
      <Navbar />
      <div className="flex flex-1 overflow-hidden min-h-0 pb-16 md:pb-0">
        {children}
      </div>
      <BottomNav />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <LibraryProvider>
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
              <Route path="/admin/presets" element={
                <ProtectedRoute>
                  <AdminRoute>
                    <AppLayout><PresetsEditorPage /></AppLayout>
                  </AdminRoute>
                </ProtectedRoute>
              } />
            </Routes>
          </LibraryProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
