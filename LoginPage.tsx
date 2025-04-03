import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/state'
import { loginToServer, getAuthStatus } from '@/api/lightrag'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'

import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { ZapIcon, AlertCircle, Sprout, Leaf } from 'lucide-react'
import AppSettings from '@/components/AppSettings'

const LoginPage = () => {
  const navigate = useNavigate()
  const { login, isAuthenticated, logout } = useAuthStore()
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [checkingAuth, setCheckingAuth] = useState(true)
  // 添加错误状态
  const [connectionError, setConnectionError] = useState(false)

  // 确保用户在登录页面时已经退出登录状态
  useEffect(() => {
    // 强制退出登录状态
    logout()
    localStorage.removeItem('LIGHTRAG-API-TOKEN')
  }, [logout])

  // Check if authentication is configured
  useEffect(() => {
    let isMounted = true; // Flag to prevent state updates after unmount

    const checkAuthConfig = async () => {
      try {
        // 不再检查是否已认证，因为我们已经强制退出登录

        // 检查认证状态，但不自动使用访客模式
        const status = await getAuthStatus()
        
        if (isMounted) {
          // 即使服务器返回访客模式，我们也只显示登录表单
          setCheckingAuth(false)
          setConnectionError(false)
        }
      } catch (error) {
        console.error('Failed to check auth configuration:', error)
        if (isMounted) {
          setCheckingAuth(false)
          setConnectionError(true)
        }
      }
    }

    // Execute immediately
    checkAuthConfig()

    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    }
  }, [])

  // Don't render anything while checking auth
  if (checkingAuth) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <p>正在连接服务器...</p>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!username || !password) {
      toast.error(t('login.errorEmptyFields'))
      return
    }

    try {
      setLoading(true)
      const response = await loginToServer(username, password)

      // 检查是否登录成功
      if (response && response.access_token) {
        // 即使后端返回访客模式，我们也当作正常登录处理
        login(response.access_token, false)
        toast.success(t('login.successMessage'))
        navigate('/')
      } else {
        toast.error(t('login.errorInvalidCredentials'))
      }
    } catch (error) {
      console.error('Login failed...', error)
      toast.error(t('login.errorInvalidCredentials'))
    } finally {
      setLoading(false)
    }
  }

  const handleGuestLogin = async () => {
    try {
      setLoading(true)
      // 使用访客模式登录
      login("guest-token", true)
      toast.success("访客模式已启用，部分功能可能受限")
      // 登录后导航到主页
      navigate('/')
    } catch (error) {
      console.error('Guest login failed...', error)
      toast.error("访客模式启用失败")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-gray-900 dark:to-gray-800 bg-[url('/agriculture-background.png')] bg-cover bg-center bg-no-repeat relative">
      {/* 添加半透明遮罩，使文字更易读 */}
      <div className="absolute inset-0 bg-emerald-100/60 dark:bg-emerald-900/60 z-0"></div>
      
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
        <AppSettings className="bg-white/30 dark:bg-gray-800/30 backdrop-blur-sm rounded-md" />
      </div>
      
      {connectionError && (
        <div className="absolute top-16 left-0 right-0 mx-auto w-fit bg-white dark:bg-gray-800 p-3 rounded-md shadow-md z-20">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertCircle size={16} />
            <span className="text-sm font-medium">连接服务器失败，请检查网络或服务器状态</span>
          </div>
        </div>
      )}
      
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0">
        <Leaf className="absolute text-emerald-100 dark:text-emerald-900/20 opacity-20 -top-10 -left-10 size-64 rotate-45" />
        <Leaf className="absolute text-emerald-100 dark:text-emerald-900/20 opacity-20 -bottom-10 -right-10 size-64 -rotate-12" />
      </div>
      
      <Card className="w-full max-w-[480px] shadow-lg mx-4 border-emerald-200 dark:border-emerald-800 relative z-10 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm">
        <CardHeader className="flex items-center justify-center space-y-2 pb-6 pt-6">
          <div className="flex flex-col items-center space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center bg-emerald-50 dark:bg-emerald-900/30 rounded-full p-3">
                <Sprout className="size-10 text-emerald-600 dark:text-emerald-400" />
              </div>
              <ZapIcon className="size-8 text-emerald-400" aria-hidden="true" />
            </div>
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold tracking-tight text-emerald-800 dark:text-emerald-300">农业知识检索系统</h1>
              <p className="text-muted-foreground text-sm">
                基于LightRAG的智能农业知识库，请输入账号密码登录
              </p>
              {connectionError && (
                <p className="text-red-500 text-xs mt-2">
                  服务器连接失败，但您仍可尝试登录
                </p>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="px-8 pb-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium block text-emerald-700 dark:text-emerald-300">
                {t('login.username')}
              </label>
              <div className="relative">
                <Input
                  id="username"
                  placeholder={t('login.usernamePlaceholder')}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="h-11 w-full pl-10 border-emerald-200 dark:border-emerald-800 focus:ring-emerald-500"
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                  <Sprout className="h-5 w-5 text-emerald-500" />
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium block text-emerald-700 dark:text-emerald-300">
                {t('login.password')}
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type="password"
                  placeholder={t('login.passwordPlaceholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11 w-full pl-10 border-emerald-200 dark:border-emerald-800 focus:ring-emerald-500"
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                  <Leaf className="h-5 w-5 text-emerald-500" />
                </div>
              </div>
            </div>
            
            <Button
              type="submit"
              className="w-full h-11 text-base font-medium mt-4 bg-emerald-600 hover:bg-emerald-700"
              disabled={loading}
            >
              {loading ? t('login.loggingIn') : t('login.loginButton')}
            </Button>
            
            {/* 添加访客模式按钮 */}
            <div className="mt-4 text-center">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-300 dark:border-gray-600"></span>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">或者</span>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                className="mt-4 w-full border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
                onClick={handleGuestLogin}
                disabled={loading}
              >
                以访客模式访问
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      
      <div className="absolute bottom-4 flex gap-2 items-center z-10">
        <Leaf className="text-emerald-500" size={16} />
        <span className="text-xs text-emerald-700 dark:text-emerald-400">基于 LightRAG 的智能农业知识库</span>
      </div>
    </div>
  )
}

export default LoginPage
