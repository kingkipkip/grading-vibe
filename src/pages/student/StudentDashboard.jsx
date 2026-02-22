import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { ChevronRight } from 'lucide-react'

export default function StudentDashboard() {
    const { user } = useAuth()
    const [enrollments, setEnrollments] = useState([])
    const [studentInfo, setStudentInfo] = useState(null)

    useEffect(() => {
        fetchStudentData()
    }, [user])

    const fetchStudentData = async () => {
        // 1. Get Student ID from users table join (or store in metadata)
        // We need to find the student record linked to this user
        const { data: student } = await supabase
            .from('students')
            .select('*')
            .eq('user_id', user.id)
            .single()

        if (student) {
            setStudentInfo(student)

            // 2. Fetch Enrollments
            const { data: enrolls } = await supabase
                .from('enrollments')
                .select(`
                *,
                class:classes (
                    id, 
                    subject_code, 
                    subject_name,
                    teacher:users(full_name)
                )
            `)
                .eq('student_id', student.id)

            if (enrolls) setEnrollments(enrolls)
        }
    }

    if (!studentInfo) return <div className="p-4 text-center">Loading student profile...</div>

    return (
        <div className="space-y-6">
            <div className="bg-primary/10 p-4 rounded-lg">
                <h2 className="font-bold text-lg">{studentInfo.first_name} {studentInfo.last_name}</h2>
                <p className="text-sm text-muted-foreground">ID: {studentInfo.student_id}</p>
            </div>

            <div className="grid gap-4">
                <h3 className="font-semibold text-lg">My Classes</h3>
                {enrollments.map(e => (
                    <Link to={`/student/class/${e.class.id}`} key={e.id}>
                        <Card className="hover:shadow transition active:scale-95">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base flex justify-between">
                                    {e.class.subject_name}
                                    <ChevronRight className="h-5 w-5 text-gray-400" />
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">{e.class.subject_code}</p>
                                <p className="text-xs text-gray-500">Teacher: {e.class.teacher?.full_name}</p>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
                {enrollments.length === 0 && (
                    <p className="text-center text-gray-500">You are not enrolled in any classes yet.</p>
                )}
            </div>
        </div>
    )
}
