import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Loader2, Settings } from 'lucide-react'
import AssignmentsTab from './AssignmentsTab'
import GradingTab from './GradingTab'
import ClassSettingsTab from './ClassSettingsTab'

export default function ClassDetail() {
    const { classId } = useParams()
    const [classData, setClassData] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchClassData()
    }, [classId])

    const fetchClassData = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('classes')
            .select('*')
            .eq('id', classId)
            .single()

        if (!error) setClassData(data)
        setLoading(false)
    }

    if (loading) return <div className="p-8 flex items-center gap-2"><Loader2 className="animate-spin h-5 w-5" /> Loading class data...</div>
    if (!classData) return <div className="p-8">Class not found</div>

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link to="/teacher" className="print:hidden">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold">{classData.subject_code} - {classData.subject_name}</h1>
                    <p className="text-muted-foreground">Room {classData.room} | สัดส่วนคะแนน: การเก็บ {classData.total_assignment_score} / สอบ {classData.total_exam_score}</p>
                </div>
            </div>

            <Tabs defaultValue="grading" className="w-full">
                <TabsList className="grid w-full grid-cols-3 max-w-[600px] print:hidden">
                    <TabsTrigger value="grading">Grading</TabsTrigger>
                    <TabsTrigger value="assignments">Assignments</TabsTrigger>
                    <TabsTrigger value="settings" className="flex items-center gap-2"><Settings className="h-4 w-4" /> Settings</TabsTrigger>
                </TabsList>
                <TabsContent value="grading" className="pt-4">
                    <GradingTab classId={classId} classData={classData} />
                </TabsContent>
                <TabsContent value="assignments" className="pt-4">
                    <AssignmentsTab classId={classId} />
                </TabsContent>
                <TabsContent value="settings" className="pt-4">
                    <ClassSettingsTab classId={classId} classData={classData} onUpdate={fetchClassData} />
                </TabsContent>
            </Tabs>
        </div>
    )
}
