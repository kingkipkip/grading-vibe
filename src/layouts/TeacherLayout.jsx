import { Navigate, Outlet, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { LayoutDashboard, LogOut, BookOpen, User } from 'lucide-react'

export default function TeacherLayout() {
    const { user, loading, signOut } = useAuth()

    if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>

    // Ideally check if user.role === 'teacher'

    return (
        <div className="flex min-h-screen bg-gray-50">
            {/* Sidebar - Tablet friendly width */}
            <aside className="w-20 md:w-64 bg-white shadow-md flex flex-col print:hidden">
                <div className="p-4 md:p-6 flex items-center justify-center md:justify-start">
                    <BookOpen className="h-8 w-8 text-primary" />
                    <span className="ml-2 text-xl font-bold hidden md:block">Grading Vibe</span>
                </div>

                <nav className="flex-1 px-2 md:px-4 space-y-2 py-4">
                    <Link to="/teacher">
                        <Button variant="ghost" className="w-full justify-center md:justify-start h-12">
                            <LayoutDashboard className="md:mr-2 h-5 w-5" />
                            <span className="hidden md:inline">Classes</span>
                        </Button>
                    </Link>
                    <Link to="/teacher/profile">
                        <Button variant="ghost" className="w-full justify-center md:justify-start h-12">
                            <User className="md:mr-2 h-5 w-5" />
                            <span className="hidden md:inline">Profile</span>
                        </Button>
                    </Link>
                </nav>

                <div className="p-4">
                    <Button variant="ghost" className="w-full justify-center md:justify-start text-red-500 hover:text-red-700 hover:bg-red-50" onClick={signOut}>
                        <LogOut className="md:mr-2 h-5 w-5" />
                        <span className="hidden md:inline">Sign Out</span>
                    </Button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-4 md:p-8 overflow-y-auto print:overflow-visible print:p-0 print:bg-white">
                <Outlet />
            </main>
        </div>
    )
}
