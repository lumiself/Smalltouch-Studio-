import { Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

export default function AdminRoute({ children }) {
  const { user, loading } = useAuth()
  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL

  if (loading) return null
  if (!user || !adminEmail || user.email !== adminEmail) {
    return <Navigate to="/dashboard" replace />
  }
  return children
}
