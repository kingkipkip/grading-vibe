import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { Toaster } from 'sonner'
import { Suspense, lazy } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import ErrorBoundary from '@/components/ErrorBoundary'

const LoginPage = lazy(() => import('@/pages/LoginPage'))
const RegisterPage = lazy(() => import('@/pages/RegisterPage'))
const ActivationPage = lazy(() => import('@/pages/ActivationPage'))
const ForgotPasswordPage = lazy(() => import('@/pages/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('@/pages/ResetPasswordPage'))

// Admin Pages
const AdminLayout = lazy(() => import('@/layouts/AdminLayout'))
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'))
const StudentImportPage = lazy(() => import('@/pages/admin/StudentImportPage'))
const AdminTermPage = lazy(() => import('@/pages/admin/AdminTermPage'))
const AdminUsersPage = lazy(() => import('@/pages/admin/AdminUsersPage'))

// Teacher Pages
const TeacherLayout = lazy(() => import('@/layouts/TeacherLayout'))
const TeacherDashboard = lazy(() => import('@/pages/teacher/TeacherDashboard'))
const ClassDetail = lazy(() => import('@/pages/teacher/ClassDetail'))

// Student Pages
const StudentLayout = lazy(() => import('@/layouts/StudentLayout'))
const StudentDashboard = lazy(() => import('@/pages/student/StudentDashboard'))
const StudentClassView = lazy(() => import('@/pages/student/StudentClassView'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function Dashboard() {
  const { user, signOut } = useAuth()
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Welcome, {user?.email}</h1>
      <p className="mb-4">Role: <span className="font-semibold uppercase">{user?.role || 'Guest'}</span></p>

      <div className="flex gap-4">
        {user?.role === 'admin' && (
          <a href="/admin" className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800">
            Go to Admin Panel
          </a>
        )}
        {(user?.role === 'teacher' || user?.role === 'admin') && (
          <a href="/teacher" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            Go to Teacher Space
          </a>
        )}
        {user?.role === 'student' && (
          <a href="/student" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
            Go to My Grades
          </a>
        )}
        <button onClick={signOut} className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600">Sign Out</button>
      </div>
    </div>
  )
}

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div>Loading...</div>
  return user ? children : <Navigate to="/login" />
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Toaster position="bottom-right" richColors />
          <Router>
            <Suspense fallback={
              <div className="flex h-screen w-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
              </div>
            }>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/activate" element={<PrivateRoute><ActivationPage /></PrivateRoute>} />

                {/* Admin Routes */}
                <Route path="/admin" element={<PrivateRoute><AdminLayout /></PrivateRoute>}>
                  <Route index element={<AdminDashboard />} />
                  <Route path="students" element={<StudentImportPage />} />
                  <Route path="terms" element={<AdminTermPage />} />
                  <Route path="users" element={<AdminUsersPage />} />
                </Route>

                {/* Teacher Routes */}
                <Route path="/teacher" element={<PrivateRoute><TeacherLayout /></PrivateRoute>}>
                  <Route index element={<TeacherDashboard />} />
                  <Route path="class/:classId" element={<ClassDetail />} />
                  <Route path="profile" element={<div>Teacher Profile Placeholder</div>} />
                </Route>

                {/* Student Routes */}
                <Route path="/student" element={<PrivateRoute><StudentLayout /></PrivateRoute>}>
                  <Route index element={<StudentDashboard />} />
                  <Route path="class/:classId" element={<StudentClassView />} />
                  <Route path="profile" element={<div>Student Profile Placeholder</div>} />
                </Route>

                <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
                <Route path="/" element={<Navigate to="/dashboard" />} />
              </Routes>
            </Suspense>
          </Router>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
