import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, Loader2 } from 'lucide-react'

export default function StudentClassView() {
    const { classId } = useParams()
    const { user } = useAuth()
    const [assignments, setAssignments] = useState([])
    const [grades, setGrades] = useState({})
    const [classInfo, setClassInfo] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchData()
    }, [classId, user])

    const fetchData = async () => {
        setLoading(true)
        // 1. Get Student Info
        const { data: student } = await supabase
            .from('students')
            .select('id')
            .eq('user_id', user.id)
            .single()

        if (!student) return

        // 2. Get Class Info
        const { data: cls } = await supabase
            .from('classes')
            .select('*')
            .eq('id', classId)
            .single()
        setClassInfo(cls)

        // 3. Get Assignments
        const { data: assignData } = await supabase
            .from('assignments')
            .select('*')
            .eq('class_id', classId)
            .order('created_at', { ascending: true })

        // 4. Get Grades for this student
        const { data: gradeData } = await supabase
            .from('grades')
            .select('*')
            .in('assignment_id', assignData.map(a => a.id))
            .eq('student_id', student.id)

        const gradeMap = {}
        gradeData?.forEach(g => {
            gradeMap[g.assignment_id] = g
        })

        setAssignments(assignData || [])
        setGrades(gradeMap)
        setLoading(false)
    }

    if (loading) return <div className="p-8 flex items-center gap-2"><Loader2 className="animate-spin h-5 w-5" /> Loading...</div>

    // Dynamic Scoring Logic
    const specialAssignments = assignments.filter(a => a.type === 'special')
    const regularAssignments = assignments.filter(a => a.type === 'regular' || !a.type)
    const totalSpecialMax = specialAssignments.reduce((sum, a) => sum + (Number(a.max_score) || 0), 0)

    const classTotalAssignmentScore = classInfo?.total_assignment_score || 50
    const remainingForRegular = Math.max(0, classTotalAssignmentScore - totalSpecialMax)
    const numRegular = regularAssignments.length
    const dynamicRegularMax = numRegular > 0 ? remainingForRegular / numRegular : 0

    const getEffectiveScore = (grade, assignment) => {
        if (!grade) return null;
        if (assignment.type === 'regular' || !assignment.type) {
            if (grade.status === 'submitted') return dynamicRegularMax;
            if (grade.status === 'late') return dynamicRegularMax * 0.8;
            if (grade.status === 'missing') return 0;
            return null;
        } else {
            return grade.score !== null ? Number(grade.score) : null;
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2">
                <Link to="/student">
                    <Button variant="ghost" size="icon" className="-ml-2">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <h1 className="font-bold text-xl">{classInfo?.subject_name}</h1>
            </div>

            <div className="bg-primary/5 p-4 rounded-lg flex justify-between items-center">
                <div>
                    <h2 className="text-sm font-semibold text-primary">Score Overview</h2>
                </div>
                <div className="text-2xl font-bold text-primary">
                    {Number(assignments.reduce((sum, a) => sum + (getEffectiveScore(grades[a.id], a) || 0), 0)).toFixed(1)}
                </div>
            </div>

            <div className="space-y-3">
                {assignments.map(assign => {
                    const grade = grades[assign.id]
                    const effectiveScore = getEffectiveScore(grade, assign)
                    const hasScore = effectiveScore !== null

                    const maxScore = (assign.type === 'regular' || !assign.type) ? dynamicRegularMax : assign.max_score

                    return (
                        <Card key={assign.id}>
                            <CardContent className="p-4 flex justify-between items-center">
                                <div>
                                    <div className="font-semibold flex items-center gap-2">
                                        {assign.title}
                                        <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded border ${assign.type === 'exam' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                                                assign.type === 'special' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                                                    'bg-blue-100 text-blue-700 border-blue-200'
                                            }`}>
                                            {assign.type || 'regular'}
                                        </span>
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                        Max: {Number(maxScore).toFixed(maxScore % 1 === 0 ? 0 : 1)} pts
                                        {assign.type === 'regular' && grade?.status && (
                                            <span className="ml-2 px-1.5 py-0.5 rounded bg-gray-100 capitalize">
                                                Status: {grade.status}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="text-right">
                                    {hasScore ? (
                                        <div className="text-xl font-bold text-green-600">
                                            {Number(effectiveScore).toFixed(1)}
                                        </div>
                                    ) : (
                                        <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-500">
                                            --
                                        </span>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}
                {assignments.length === 0 && !loading && (
                    <div className="text-center p-8 text-muted-foreground">
                        No assignments have been created yet.
                    </div>
                )}
            </div>
        </div>
    )
}
