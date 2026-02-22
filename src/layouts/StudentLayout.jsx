import { Navigate, Outlet, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { BookOpen, User, LogOut } from 'lucide-react'

export default function StudentLayout() {
    const { loading, signOut } = useAuth()

    if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Mobile-first Header */}
            <header className="bg-white shadow sticky top-0 z-10 px-4 h-16 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <BookOpen className="h-6 w-6 text-primary" />
                    <span className="font-bold text-lg">My Grades</span>
                </div>
                <Button variant="ghost" size="sm" onClick={signOut}>
                    <LogOut className="h-4 w-4" />
                </Button>
            </header>

            {/* Main Content */}
            <main className="flex-1 p-4 max-w-lg mx-auto w-full">
                <Outlet />
            </main>

            {/* Bottom Nav (Mobile) */}
            <nav className="bg-white border-t flex justify-around p-2 md:hidden">
                <Link to="/student">
                    <Button variant="ghost" className="flex flex-col gap-1 h-auto py-2">
                        <BookOpen className="h-5 w-5" />
                        <span className="text-[10px]">Classes</span>
                    </Button>
                </Link>
                <Link to="/student/profile">
                    <Button variant="ghost" className="flex flex-col gap-1 h-auto py-2">
                        <User className="h-5 w-5" />
                        <span className="text-[10px]">Profile</span>
                    </Button>
                </Link>
            </nav>
        </div>
    )
}
