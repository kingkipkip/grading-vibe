import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { Toaster } from 'sonner'
import { Suspense, lazy, useState, useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Loader2, UserCircle2 } from 'lucide-react'
import ErrorBoundary from '@/components/ErrorBoundary'
import { supabase } from '@/lib/supabase'

// ... existing imports ...

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
  const [studentInfo, setStudentInfo] = useState(null)

  useEffect(() => {
    if (user?.role === 'student') {
      const fetchStudentInfo = async () => {
        const { data } = await supabase
          .from('students')
          .select('*')
          .eq('user_id', user.id)
          .single()
        if (data) setStudentInfo(data)
      }
      fetchStudentInfo()
    }
  }, [user])
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <UserCircle2 className="h-10 w-10 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">ยินดีต้อนรับ, {studentInfo ? `${studentInfo.first_name} ${studentInfo.last_name}` : user?.email}</h1>
          <p className="text-muted-foreground">สถานะการใช้งาน: <span className="font-semibold uppercase text-primary">{user?.role || 'Guest'}</span></p>
        </div>
      </div>

      {studentInfo && (
        <div className="bg-white border rounded-lg shadow-sm p-6 mb-8 mt-6">
          <h3 className="text-lg font-semibold border-b pb-3 mb-4 text-gray-800">ข้อมูลส่วนตัวนักเรียน</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">รหัสนักเรียน</p>
              <p className="font-medium text-lg">{studentInfo.student_id}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">เลขประจำตัวประชน</p>
              <p className="font-medium">{studentInfo.national_id}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">ห้องเรียน</p>
              <p className="font-medium">{studentInfo.current_room || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">เลขที่</p>
              <p className="font-medium">{studentInfo.student_number || '-'}</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {user?.role === 'guest' && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md mb-4 max-w-lg">
            <h3 className="font-semibold text-yellow-800 mb-2">บัญชียังไม่ถูกเปิดใช้งาน</h3>
            <p className="text-yellow-700 mb-4 text-sm">
              บัญชีของคุณมีสถานะเป็นผู้ชมทั่วไปในขณะนี้
              <br />• <strong>ถ้านักเรียน:</strong> กรุณากดปุ่มด้านล่างเพื่อเชื่อมโยงรหัสนักเรียนของคุณ
              <br />• <strong>ถ้าเป็นครู:</strong> กรุณารอผู้ดูแลระบบ (Admin) ตรวจสอบและอัปเดตสถานะให้คุณ
            </p>
            <a href="/activate" className="inline-block bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 transition">
              ยืนยันตัวตนนักเรียน
            </a>
          </div>
        )}
        <div className="flex gap-4">
          {user?.role === 'admin' && (
            <a href="/admin" className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800">
              ไปยังระบบผู้ดูแล (Admin)
            </a>
          )}
          {(user?.role === 'teacher' || user?.role === 'admin') && (
            <a href="/teacher" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
              ไปยังระบบสำหรับครู
            </a>
          )}
          {user?.role === 'student' && (
            <a href="/student" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
              ดูผลการเรียนของฉัน
            </a>
          )}
          <button onClick={signOut} className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600">ออกจากระบบ</button>
        </div>
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
