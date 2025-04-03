import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/state'
import { getAuthStatus } from '@/api/lightrag'
import { toast } from 'sonner'
import { Toaster } from 'sonner'
import App from './App'
import LoginPage from '@/features/LoginPage'
import ThemeProvider from '@/components/ThemeProvider'

interface ProtectedRouteProps {
  children: React.ReactNode
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated } = useAuthStore()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    let isMounted = true;

    const checkAuthStatus = async () => {
      try {
        if (isAuthenticated) {
          if (isMounted) setIsChecking(false);
          return;
        }

        // 只检查状态，不自动登录
        await getAuthStatus()
        
      } catch (error) {
        console.error('Failed to check auth status:', error)
      } finally {
        if (isMounted) {
          setIsChecking(false)
        }
      }
    }

    checkAuthStatus()

    return () => {
      isMounted = false;
    }
  }, [isAuthenticated])

  if (isChecking) {
    return null
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

const AppRouter = () => {
  const [initializing, setInitializing] = useState(true)
  const { isAuthenticated } = useAuthStore()

  // 强制清除登录状态，确保每次启动都需要登录
  useEffect(() => {
    // 应用启动时强制退出登录
    useAuthStore.getState().logout()
    localStorage.removeItem('LIGHTRAG-API-TOKEN')
    
    setInitializing(false)
  }, [])

  if (initializing) {
    return null
  }

  return (
    <ThemeProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <App />
              </ProtectedRoute>
            }
          />
        </Routes>
        <Toaster position="top-center" />
      </Router>
    </ThemeProvider>
  )
}

export default AppRouter
