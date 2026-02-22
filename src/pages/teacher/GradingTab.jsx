import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Check, Loader2, ArrowUpDown, ArrowUp, ArrowDown, Clock, X, Download, Printer } from 'lucide-react'
import { toast } from 'sonner'
import GradeSummaryChart from '@/components/teacher/GradeSummaryChart'
import { useQuery } from '@tanstack/react-query'
import { useVirtualizer } from '@tanstack/react-virtual'

export default function GradingTab({ classId, classData }) {
    const [students, setStudents] = useState([])
    const [assignments, setAssignments] = useState([])
    const [grades, setGrades] = useState({}) // { studentId_assignId: gradeObject }
    const [saving, setSaving] = useState(null) // ID of cell being saved
    const [sortConfig, setSortConfig] = useState({ key: 'student_number', direction: 'asc' })

    const { data: queryData, isLoading } = useQuery({
        queryKey: ['gradingData', classId],
        queryFn: async () => {
            const [
                { data: enrollData },
                { data: assignData }
            ] = await Promise.all([
                supabase.from('enrollments')
                    .select(`
                        id,
                        student:students (id, student_id, student_number, first_name, last_name, national_id)
                    `)
                    .eq('class_id', classId)
                    .order('student_number', { foreignTable: 'students', ascending: true }),
                supabase.from('assignments')
                    .select('*')
                    .eq('class_id', classId)
                    .order('created_at')
            ]);

            const assignIds = (assignData || []).map(a => a.id);
            let gradeData = [];
            if (assignIds.length > 0) {
                const { data } = await supabase
                    .from('grades')
                    .select('*')
                    .in('assignment_id', assignIds);
                gradeData = data || [];
            }

            const gradeMap = {};
            gradeData.forEach(g => {
                gradeMap[`${g.student_id}_${g.assignment_id}`] = g;
            });

            return {
                students: enrollData?.map(e => e.student) || [],
                assignments: assignData || [],
                grades: gradeMap
            };
        }
    });

    useEffect(() => {
        if (queryData) {
            setStudents(queryData.students);
            setAssignments(queryData.assignments);
            setGrades(queryData.grades);
        }
    }, [queryData]);

    // Dynamic Scoring Logic
    const specialAssignments = assignments.filter(a => a.type === 'special')
    const regularAssignments = assignments.filter(a => a.type === 'regular' || !a.type)
    const totalSpecialMax = specialAssignments.reduce((sum, a) => sum + (Number(a.max_score) || 0), 0)

    // total_assignment_score comes from classData (default 50)
    const classTotalAssignmentScore = classData?.total_assignment_score || 50
    const classTotalExamScore = classData?.total_exam_score || 50
    const gradingScale = classData?.grading_scale || { "4": 80, "3.5": 75, "3": 70, "2.5": 65, "2": 60, "1.5": 55, "1": 50 }

    const getFinalGrade = (score) => {
        if (score >= gradingScale["4"]) return "4"
        if (score >= gradingScale["3.5"]) return "3.5"
        if (score >= gradingScale["3"]) return "3"
        if (score >= gradingScale["2.5"]) return "2.5"
        if (score >= gradingScale["2"]) return "2"
        if (score >= gradingScale["1.5"]) return "1.5"
        if (score >= gradingScale["1"]) return "1"
        return "0"
    }

    const remainingForRegular = Math.max(0, classTotalAssignmentScore - totalSpecialMax)
    const numRegular = regularAssignments.length
    const dynamicRegularMax = numRegular > 0 ? remainingForRegular / numRegular : 0

    // Helper to get effective score for a grade based on assignment type
    const getEffectiveScore = (grade, assignment) => {
        if (!grade) return 0;
        if (assignment.type === 'regular' || !assignment.type) {
            // Calculate based on status
            if (grade.status === 'submitted') return dynamicRegularMax;
            if (grade.status === 'late') return dynamicRegularMax * 0.8;
            if (grade.status === 'missing') return 0;
            return 0; // fallback
        } else {
            // Special or Exam uses the raw score
            return Number(grade.score) || 0;
        }
    }

    const handleScoreChange = (studentId, assignmentId, value) => {
        const key = `${studentId}_${assignmentId}`
        setGrades(prev => ({
            ...prev,
            [key]: { ...prev[key], score: value }
        }))
    }

    const handleStatusChange = async (studentId, assignmentId, newStatus) => {
        const key = `${studentId}_${assignmentId}`
        const currentStatus = grades[key]?.status

        // Toggle off if clicking the same status
        const finalStatus = currentStatus === newStatus ? null : newStatus

        // Optimistic update
        setGrades(prev => {
            const nextGrades = { ...prev }
            if (finalStatus === null) {
                delete nextGrades[key] // Clear it out locally
            } else {
                nextGrades[key] = { ...nextGrades[key], status: finalStatus }
            }
            return nextGrades
        })

        setSaving(key)

        if (finalStatus === null) {
            // Remove grade from database
            const { error } = await supabase
                .from('grades')
                .delete()
                .match({ student_id: studentId, assignment_id: assignmentId })
            if (error) {
                console.error("Error clearing status", error)
                toast.error("Failed to remove grade")
            } else {
                toast.success('Grade removed')
            }
        } else {
            const { error } = await supabase
                .from('grades')
                .upsert({
                    student_id: studentId,
                    assignment_id: assignmentId,
                    status: finalStatus,
                    score: null // Score is dynamically calculated for regular
                }, { onConflict: 'assignment_id, student_id' })
            if (error) {
                console.error("Error saving status", error)
                toast.error("Failed to save grade status")
            } else {
                // Determine toast message based on status (e.g., '100% (Submitted)', '80% (Late)', '0% (Missing)')
                const statusLabels = { submitted: '100% (Submitted)', late: '80% (Late)', missing: '0% (Missing)' }
                toast.success(`Score updated: ${statusLabels[finalStatus]}`)
            }
        }

        setSaving(null)
    }

    const saveScore = async (studentId, assignmentId, value) => {
        if (value === '') return // Ignore empty string? or delete? assuming number

        const key = `${studentId}_${assignmentId}`
        setSaving(key)

        // Upsert grade
        const { error } = await supabase
            .from('grades')
            .upsert({
                student_id: studentId,
                assignment_id: assignmentId,
                score: parseFloat(value),
                status: 'submitted'
            }, { onConflict: 'assignment_id, student_id' })

        if (error) {
            toast.error("Failed to save score")
        } else {
            toast.success("Score saved successfully")
        }
        setSaving(null)
    }

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    }

    const sortedStudents = [...students].sort((a, b) => {
        let valA, valB;

        if (sortConfig.key === 'total') {
            valA = assignments.reduce((sum, assign) => sum + getEffectiveScore(grades[`${a.id}_${assign.id}`], assign), 0);
            valB = assignments.reduce((sum, assign) => sum + getEffectiveScore(grades[`${b.id}_${assign.id}`], assign), 0);
        } else if (sortConfig.key.startsWith('assign_')) {
            const assignId = sortConfig.key.replace('assign_', '');
            const assignObj = assignments.find(a => a.id === assignId)
            valA = assignObj ? getEffectiveScore(grades[`${a.id}_${assignId}`], assignObj) : -1;
            valB = assignObj ? getEffectiveScore(grades[`${b.id}_${assignId}`], assignObj) : -1;
        } else if (sortConfig.key === 'first_name') {
            valA = `${a.first_name} ${a.last_name}`;
            valB = `${b.first_name} ${b.last_name}`;
        } else if (sortConfig.key === 'student_number') {
            valA = a.student_number || 99999;
            valB = b.student_number || 99999;
        } else {
            valA = a[sortConfig.key] || '';
            valB = b[sortConfig.key] || '';
        }

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    const SortIcon = ({ columnKey }) => {
        if (sortConfig.key !== columnKey) return <ArrowUpDown className="ml-1 h-3 w-3 inline text-muted-foreground opacity-50" />
        if (sortConfig.direction === 'asc') return <ArrowUp className="ml-1 h-3 w-3 inline" />
        return <ArrowDown className="ml-1 h-3 w-3 inline" />
    }

    const exportToCSV = () => {
        const headers = ['No.', 'Student ID', 'First Name', 'Last Name']
        assignments.forEach(a => headers.push(`"${a.title}"`))
        headers.push('Total Score')
        headers.push('Grade')

        const rows = sortedStudents.map(student => {
            const row = [
                student.student_number || '',
                student.student_id,
                `"${student.first_name}"`,
                `"${student.last_name}"`
            ]
            let total = 0
            assignments.forEach(a => {
                const grade = grades[`${student.id}_${a.id}`]
                const score = getEffectiveScore(grade, a)
                total += score
                row.push(Number(score).toFixed(1))
            })
            row.push(Number(total).toFixed(1))
            row.push(getFinalGrade(total))
            return row.join(',')
        })

        const csvContent = [headers.join(','), ...rows].join('\n')
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.setAttribute('href', url)
        link.setAttribute('download', `${classData?.subject_code || 'class'}_grades.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    const parentRef = useRef(null)
    const rowVirtualizer = useVirtualizer({
        count: sortedStudents.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 72,
        overscan: 5,
    })

    const virtualItems = rowVirtualizer.getVirtualItems()
    const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0
    const paddingBottom = virtualItems.length > 0 ? rowVirtualizer.getTotalSize() - virtualItems[virtualItems.length - 1].end : 0

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center print:hidden">
                <h2 className="text-xl font-bold">Gradebook</h2>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={exportToCSV}>
                        <Download className="mr-2 h-4 w-4" /> Export CSV
                    </Button>
                </div>
            </div>

            <GradeSummaryChart
                students={sortedStudents}
                assignments={assignments}
                grades={grades}
                getEffectiveScore={getEffectiveScore}
                getFinalGrade={getFinalGrade}
            />

            <div ref={parentRef} className="overflow-x-auto overflow-y-auto max-h-[70vh] border rounded-lg bg-card relative">
                {isLoading ? (
                    <div className="flex justify-center items-center h-40">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <Table>
                        <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
                            <TableRow>
                                <TableHead className="w-[80px] cursor-pointer hover:bg-muted/50" onClick={() => handleSort('student_number')}>
                                    No. <SortIcon columnKey="student_number" />
                                </TableHead>
                                <TableHead className="w-[100px] cursor-pointer hover:bg-muted/50" onClick={() => handleSort('student_id')}>
                                    ID <SortIcon columnKey="student_id" />
                                </TableHead>
                                <TableHead className="w-[200px] cursor-pointer hover:bg-muted/50" onClick={() => handleSort('first_name')}>
                                    Name <SortIcon columnKey="first_name" />
                                </TableHead>
                                {assignments.map(a => {
                                    const maxScore = (a.type === 'regular' || !a.type) ? dynamicRegularMax : a.max_score
                                    return (
                                        <TableHead key={a.id} className="min-w-[120px] text-center cursor-pointer hover:bg-muted/50" onClick={() => handleSort(`assign_${a.id}`)}>
                                            <div className="font-bold inline-flex items-center text-xs">
                                                <span className={a.type === 'exam' ? 'text-purple-600' : a.type === 'special' ? 'text-orange-600' : 'text-blue-600'}>
                                                    [{a.type?.charAt(0).toUpperCase()}]
                                                </span>
                                                <span className="ml-1">{a.title}</span> <SortIcon columnKey={`assign_${a.id}`} />
                                            </div>
                                            <div className="text-xs text-muted-foreground">{Number(maxScore).toFixed(maxScore % 1 === 0 ? 0 : 1)} pts</div>
                                        </TableHead>
                                    )
                                })}
                                <TableHead className="text-right cursor-pointer hover:bg-muted/50" onClick={() => handleSort('total')}>
                                    Total <SortIcon columnKey="total" />
                                </TableHead>
                                <TableHead className="w-[80px] text-center border-l bg-primary/5">
                                    Grade
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paddingTop > 0 && (
                                <TableRow>
                                    <TableCell colSpan={assignments.length + 5} style={{ height: paddingTop, padding: 0 }} />
                                </TableRow>
                            )}
                            {virtualItems.map(virtualRow => {
                                const student = sortedStudents[virtualRow.index];
                                const totalScore = assignments.reduce((sum, assign) => sum + getEffectiveScore(grades[`${student.id}_${assign.id}`], assign), 0);
                                return (
                                    <TableRow key={student.id}>
                                        <TableCell className="font-bold text-center">{student.student_number || '-'}</TableCell>
                                        <TableCell className="font-mono">{student.student_id}</TableCell>
                                        <TableCell>{student.first_name} {student.last_name}</TableCell>
                                        {assignments.map(a => {
                                            const key = `${student.id}_${a.id}`
                                            const grade = grades[key]
                                            const score = grade?.score ?? ''
                                            const status = grade?.status
                                            const effectiveScore = getEffectiveScore(grade, a)
                                            const maxScore = (a.type === 'regular' || !a.type) ? dynamicRegularMax : a.max_score

                                            return (
                                                <TableCell key={a.id} className="p-2 text-center align-middle">
                                                    <div className="relative inline-flex items-center justify-center w-full min-h-[40px]">
                                                        {(!a.type || a.type === 'regular') ? (
                                                            <div className="flex flex-col items-center gap-1.5 w-full">
                                                                <div className="flex gap-2 justify-center">
                                                                    <button
                                                                        onClick={() => handleStatusChange(student.id, a.id, 'submitted')}
                                                                        className={`w-8 h-8 flex justify-center items-center rounded-full transition-all duration-200 ${status === 'submitted' ? 'bg-green-500 text-white shadow-md ring-2 ring-green-500 ring-offset-1 scale-110' : 'bg-gray-100 text-gray-400 hover:bg-green-100 hover:text-green-600'}`}
                                                                        title="Submitted (100%)"
                                                                    >
                                                                        <Check className="w-5 h-5" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleStatusChange(student.id, a.id, 'late')}
                                                                        className={`w-8 h-8 flex justify-center items-center rounded-full transition-all duration-200 ${status === 'late' ? 'bg-yellow-500 text-white shadow-md ring-2 ring-yellow-500 ring-offset-1 scale-110' : 'bg-gray-100 text-gray-400 hover:bg-yellow-100 hover:text-yellow-600'}`}
                                                                        title="Late (80%)"
                                                                    >
                                                                        <Clock className="w-4 h-4" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleStatusChange(student.id, a.id, 'missing')}
                                                                        className={`w-8 h-8 flex justify-center items-center rounded-full transition-all duration-200 ${status === 'missing' ? 'bg-red-500 text-white shadow-md ring-2 ring-red-500 ring-offset-1 scale-110' : 'bg-gray-100 text-gray-400 hover:bg-red-100 hover:text-red-600'}`}
                                                                        title="Missing (0%)"
                                                                    >
                                                                        <X className="w-5 h-5" />
                                                                    </button>
                                                                </div>
                                                                <span className="text-[11px] font-semibold text-muted-foreground w-full text-center">
                                                                    {status ? `${Number(effectiveScore).toFixed(maxScore % 1 === 0 ? 0 : 1)} pts` : '-'}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <Input
                                                                type="number"
                                                                className="text-center h-8 w-16 mx-auto"
                                                                value={score}
                                                                onChange={e => handleScoreChange(student.id, a.id, e.target.value)}
                                                                onBlur={e => saveScore(student.id, a.id, e.target.value)}
                                                            />
                                                        )}
                                                        {saving === key && (
                                                            <div className="absolute top-0 right-0">
                                                                <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            )
                                        })}
                                        <TableCell className="text-right font-bold text-lg">
                                            {totalScore > 0 ? Number(totalScore).toFixed(1) : '-'}
                                        </TableCell>
                                        <TableCell className="text-center font-bold text-xl text-primary border-l bg-primary/5">
                                            {totalScore > 0 ? getFinalGrade(totalScore) : '-'}
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                            {paddingBottom > 0 && (
                                <TableRow>
                                    <TableCell colSpan={assignments.length + 5} style={{ height: paddingBottom, padding: 0 }} />
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                )}
            </div>
        </div>
    )
}
