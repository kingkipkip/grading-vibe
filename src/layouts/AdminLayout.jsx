import { Navigate, Outlet, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { LayoutDashboard, Users, GraduationCap, LogOut, ShieldCheck } from 'lucide-react'

export default function AdminLayout() {
    const { user, loading, signOut } = useAuth()

    if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>

    // Ideally, check user.role from metadata or DB
    // For now, assuming if they can access this route, they are admin (or we add strict check)
    // Strict check:
    // if (user?.user_metadata?.role !== 'admin') return <Navigate to="/dashboard" />

    return (
        <div className="flex min-h-screen bg-gray-100">
            {/* Sidebar */}
            <aside className="w-64 bg-white shadow-md hidden md:block">
                <div className="p-6">
                    <h2 className="text-2xl font-bold text-primary">Admin Panel</h2>
                </div>
                <nav className="px-4 space-y-2">
                    <Link to="/admin">
                        <Button variant="ghost" className="w-full justify-start">
                            <LayoutDashboard className="mr-2 h-4 w-4" />
                            Dashboard
                        </Button>
                    </Link>
                    <Link to="/admin/students">
                        <Button variant="ghost" className="w-full justify-start">
                            <Users className="mr-2 h-4 w-4" />
                            Students
                        </Button>
                    </Link>
                    <Link to="/admin/terms">
                        <Button variant="ghost" className="w-full justify-start">
                            <GraduationCap className="mr-2 h-4 w-4" />
                            Terms & Years
                        </Button>
                    </Link>
                    <Link to="/admin/users">
                        <Button variant="ghost" className="w-full justify-start">
                            <ShieldCheck className="mr-2 h-4 w-4" />
                            Teachers & Roles
                        </Button>
                    </Link>
                    <Button variant="ghost" className="w-full justify-start text-red-500 hover:text-red-700 hover:bg-red-50 mt-8" onClick={signOut}>
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign Out
                    </Button>
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-8 overflow-y-auto">
                <Outlet />
            </main>
        </div>
    )
}
