import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLogout } from '@/hooks/useAuthApi';
import { LoginForm } from '@/components/auth/LoginForm';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';
import { UserProfile } from '@/components/auth/UserProfile';
import { ChangePasswordForm } from '@/components/auth/ChangePasswordForm';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { IfAuthenticated, IfNotAuthenticated, IfAdmin } from '@/components/auth/AuthGuards';
import { Button } from '@/components/ui/Button';
import { PageWrapper } from '@/components/layout/PageWrapper';

type AuthMode = 'login' | 'register' | 'forgot-password' | 'reset-password' | 'profile' | 'change-password' | 'protected';

export function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('login');
  const { user, isAuthenticated } = useAuth();
  const { logout } = useLogout();

  const handleAuthSuccess = () => {
    setMode('protected');
  };

  if (isAuthenticated && (mode === 'protected' || mode === 'profile' || mode === 'change-password')) {
    return (
      <PageWrapper
        title="Authentication Demo"
        subtitle="Protected content area"
      >
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-green-800 dark:text-green-300 mb-2">
              🎉 Authentication Successful!
            </h3>
            <p className="text-green-700 dark:text-green-400">
              You are now logged in and can access protected content.
            </p>
          </div>

          {/* Mode Selector */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <div className="flex flex-wrap gap-2 mb-4">
              <Button 
                onClick={() => setMode('protected')} 
                variant={mode === 'protected' ? 'primary' : 'outline'}
                size="sm"
              >
                Dashboard
              </Button>
              <Button 
                onClick={() => setMode('profile')} 
                variant={mode === 'profile' ? 'primary' : 'outline'}
                size="sm"
              >
                Profile
              </Button>
              <Button 
                onClick={() => setMode('change-password')} 
                variant={mode === 'change-password' ? 'primary' : 'outline'}
                size="sm"
              >
                Change Password
              </Button>
            </div>
          </div>

          {mode === 'profile' && (
            <UserProfile 
              onPasswordChangeClick={() => setMode('change-password')}
            />
          )}

          {mode === 'change-password' && (
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <ChangePasswordForm 
                onSuccess={() => setMode('profile')}
                onCancel={() => setMode('profile')}
              />
            </div>
          )}

          {mode === 'protected' && (
            <>
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">User Information</h3>
                <div className="space-y-2">
                  <p>
                    <span className="font-medium">Name:</span> {user?.name}
                  </p>
                  <p>
                    <span className="font-medium">Email:</span> {user?.email}
                  </p>
                  <p>
                    <span className="font-medium">Role:</span>{' '}
                    {user?.role || 'user'}
                  </p>
                  <p>
                    <span className="font-medium">ID:</span> {user?.id}
                  </p>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">
                  Protected Features Demo
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <h4 className="font-medium mb-2">Basic Protected Content</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      This content is only visible to authenticated users.
                    </p>
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded text-sm">
                      Secret data: AUTH_TOKEN_VERIFIED ✅
                    </div>
                  </div>

                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <h4 className="font-medium mb-2">Role-Based Content</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      Content based on user roles.
                    </p>
                    <IfAdmin>
                      <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded text-sm">
                        Admin Panel Access ⚡
                      </div>
                    </IfAdmin>
{user?.role !== 'admin' && (
                      <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded text-sm">
                        Standard User Access 👤
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">
                  Auth Guards Demo
                </h3>
                <div className="space-y-4 text-sm">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <h4 className="font-medium mb-2">Conditional Rendering</h4>
                      <IfAuthenticated>
                        <p className="text-green-600">✅ User is authenticated</p>
                      </IfAuthenticated>
                      <IfNotAuthenticated>
                        <p className="text-red-600">❌ User is not authenticated</p>
                      </IfNotAuthenticated>
                      <IfAdmin>
                        <p className="text-purple-600">👑 User is admin</p>
                      </IfAdmin>
{user?.role !== 'admin' && (
                        <p className="text-gray-600">👤 User is not admin</p>
                      )}
                    </div>

                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <h4 className="font-medium mb-2">Protected Route Test</h4>
                      <ProtectedRoute
                        requiredRole={user?.role === 'admin' ? 'user' : 'admin'}
                        fallback={
                          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded text-sm">
                            <p className="text-yellow-800 dark:text-yellow-300">
                              Access denied: Wrong role
                            </p>
                          </div>
                        }
                      >
                        <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded text-sm">
                          <p className="text-green-800 dark:text-green-300">
                            This shouldn't be visible!
                          </p>
                        </div>
                      </ProtectedRoute>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">
              Authentication Controls
            </h3>
            <div className="flex gap-4">
              <Button onClick={() => setMode('login')} variant="outline">
                Back to Login Demo
              </Button>
              <Button onClick={logout} variant="error">
                Logout
              </Button>
            </div>
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Authentication System"
      subtitle="Login and registration demo"
    >
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-300 mb-2">
            🔐 Authentication System Demo
          </h3>
          <p className="text-blue-700 dark:text-blue-400 mb-4">
            This page demonstrates our complete authentication system with JWT
            tokens, automatic refresh, and protected routes.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">Features Included:</h4>
              <ul className="space-y-1 text-blue-600 dark:text-blue-400">
                <li>• JWT token management</li>
                <li>• Automatic token refresh</li>
                <li>• Protected routes</li>
                <li>• Form validation</li>
                <li>• Error handling</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Security Features:</h4>
              <ul className="space-y-1 text-blue-600 dark:text-blue-400">
                <li>• Axios interceptors</li>
                <li>• Token expiry management</li>
                <li>• Secure token storage</li>
                <li>• Role-based access</li>
                <li>• Session management</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <div className="flex flex-wrap space-x-2 space-y-2 mb-6">
                <button
                  onClick={() => setMode('login')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    mode === 'login'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                >
                  Login
                </button>
                <button
                  onClick={() => setMode('register')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    mode === 'register'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                >
                  Register
                </button>
                <button
                  onClick={() => setMode('forgot-password')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    mode === 'forgot-password'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                >
                  Forgot Password
                </button>
                <button
                  onClick={() => setMode('reset-password')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    mode === 'reset-password'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                >
                  Reset Password
                </button>
              </div>

              <div className="flex justify-center">
                {mode === 'login' && (
                  <LoginForm
                    onSuccess={handleAuthSuccess}
                    onSwitchToRegister={() => setMode('register')}
                    onForgotPassword={() => setMode('forgot-password')}
                  />
                )}
                {mode === 'register' && (
                  <RegisterForm
                    onSuccess={handleAuthSuccess}
                    onSwitchToLogin={() => setMode('login')}
                  />
                )}
                {mode === 'forgot-password' && (
                  <ForgotPasswordForm
                    onSuccess={() => setMode('login')}
                    onBackToLogin={() => setMode('login')}
                  />
                )}
                {mode === 'reset-password' && (
                  <ResetPasswordForm
                    token="demo-reset-token"
                    onSuccess={() => setMode('login')}
                    onBackToLogin={() => setMode('login')}
                  />
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Test Credentials</h3>
              <div className="space-y-4 text-sm">
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Demo User</h4>
                  <p>
                    <span className="font-medium">Email:</span> user@example.com
                  </p>
                  <p>
                    <span className="font-medium">Password:</span> password123
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Demo Admin</h4>
                  <p>
                    <span className="font-medium">Email:</span>{' '}
                    admin@example.com
                  </p>
                  <p>
                    <span className="font-medium">Password:</span> admin123
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">
                Protected Route Demo
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Try accessing protected content without logging in:
              </p>
              <ProtectedRoute
                requiredRole={user?.role === 'admin' ? 'user' : 'admin'}
              >
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                  <p className="text-green-800 dark:text-green-300">
                    This content should not be visible!
                  </p>
                </div>
              </ProtectedRoute>
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
