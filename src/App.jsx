import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthProvider'
import { ToastProvider } from './contexts/ToastContext'
import { LibraryProvider } from './contexts/LibraryContext'
import ProtectedRoute from './components/layout/ProtectedRoute'
import Navbar from './components/layout/Navbar'
import BottomNav from './components/layout/BottomNav'
import AdminRoute from './components/layout/AdminRoute'

const LoginPage        = lazy(() => import('./pages/LoginPage'))
const SignupPage       = lazy(() => import('./pages/SignupPage'))
const DashboardPage    = lazy(() => import('./pages/DashboardPage'))
const RetouchPage      = lazy(() => import('./pages/RetouchPage'))
const TokensPage       = lazy(() => import('./pages/TokensPage'))
const HelpPage         = lazy(() => import('./pages/HelpPage'))
const HistoryPage      = lazy(() => import('./pages/HistoryPage'))
const AdminPage        = lazy(() => import('./pages/admin/AdminPage'))
const PresetsEditorPage = lazy(() => import('./pages/admin/PresetsEditorPage'))

function PageLoader() {
  return (
    <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-[#a855f7] border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

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
            <Suspense fallback={<PageLoader />}>
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
            </Suspense>
          </LibraryProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
