import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, GraduationCap, Upload, BookOpen, ShieldCheck } from 'lucide-react'

export default function AdminDashboard() {
    const [stats, setStats] = useState({
        students: 0,
        classes: 0,
        activeTerm: null
    })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchStats()
    }, [])

    const fetchStats = async () => {
        setLoading(true)
        try {
            const [
                { count: studentCount },
                { count: classCount },
                { data: termData }
            ] = await Promise.all([
                supabase.from('students').select('*', { count: 'exact', head: true }),
                supabase.from('classes').select('*', { count: 'exact', head: true }),
                supabase.from('academic_terms').select('name').eq('is_active', true).maybeSingle()
            ])

            setStats({
                students: studentCount || 0,
                classes: classCount || 0,
                activeTerm: termData?.name || 'None'
            })
        } catch (error) {
            console.error("Error fetching admin stats:", error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage school data, terms, and students.</p>

            {/* Overview Stats */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{loading ? '-' : stats.students}</div>
                        <p className="text-xs text-muted-foreground">Registered in directory</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Classes</CardTitle>
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{loading ? '-' : stats.classes}</div>
                        <p className="text-xs text-muted-foreground">Created by teachers</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Current Term</CardTitle>
                        <GraduationCap className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-primary">{loading ? '-' : stats.activeTerm}</div>
                        <p className="text-xs text-muted-foreground">System active semester</p>
                    </CardContent>
                </Card>
            </div>

            <h2 className="text-xl font-semibold mt-10">Quick Actions</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Link to="/admin/students">
                    <Card className="hover:bg-gray-50 transition cursor-pointer border-t-4 border-t-blue-500">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Student Directory</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-xl font-bold mb-1">Manage Students</div>
                            <p className="text-xs text-muted-foreground">Import CSV, View & Edit all students</p>
                        </CardContent>
                    </Card>
                </Link>

                <Link to="/admin/terms">
                    <Card className="hover:bg-gray-50 transition cursor-pointer border-t-4 border-t-green-500">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Academic Terms</CardTitle>
                            <GraduationCap className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-xl font-bold mb-1">Manage Terms</div>
                            <p className="text-xs text-muted-foreground">Create, Open/Close, Set active semester</p>
                        </CardContent>
                    </Card>
                </Link>

                <Link to="/admin/users">
                    <Card className="hover:bg-gray-50 transition cursor-pointer border-t-4 border-t-purple-500">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">User Accounts</CardTitle>
                            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-xl font-bold mb-1">Manage Teachers</div>
                            <p className="text-xs text-muted-foreground">Assign roles, manage system access</p>
                        </CardContent>
                    </Card>
                </Link>
            </div>
        </div>
    )
}
