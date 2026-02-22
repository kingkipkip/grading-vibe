import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'

export default function ClassSettingsTab({ classId, classData, onUpdate }) {
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        total_assignment_score: 50,
        total_exam_score: 50,
        grading_scale: { "4": 80, "3.5": 75, "3": 70, "2.5": 65, "2": 60, "1.5": 55, "1": 50 }
    })

    const gradesList = ["4", "3.5", "3", "2.5", "2", "1.5", "1"]

    useEffect(() => {
        if (classData) {
            setFormData({
                total_assignment_score: classData.total_assignment_score || 0,
                total_exam_score: classData.total_exam_score || 0,
                grading_scale: classData.grading_scale || { "4": 80, "3.5": 75, "3": 70, "2.5": 65, "2": 60, "1.5": 55, "1": 50 }
            })
        }
    }, [classData])

    const handleSave = async (e) => {
        e.preventDefault()
        setLoading(true)

        const { error } = await supabase
            .from('classes')
            .update({
                total_assignment_score: parseFloat(formData.total_assignment_score) || 0,
                total_exam_score: parseFloat(formData.total_exam_score) || 0,
                grading_scale: formData.grading_scale
            })
            .eq('id', classId)

        if (error) {
            toast.error('Failed to save settings: ' + error.message)
        } else {
            toast.success('Settings saved successfully!')
            if (onUpdate) onUpdate()
        }
        setLoading(false)
    }

    return (
        <form onSubmit={handleSave} className="space-y-6 max-w-xl">
            <div className="p-6 border rounded-lg bg-card text-card-foreground shadow-sm">
                <h3 className="text-lg font-semibold mb-4 border-b pb-2">คะแนนรวมของรายวิชา</h3>
                <p className="text-sm text-muted-foreground mb-6">
                    กำหนดคะแนนเก็บและคะแนนสอบรวมของรายวิชานี้ ระบบจะนำคะแนนเหล่านี้ไปใช้คำนวณคะแนนของแต่ละงานอัตโนมัติ
                </p>

                <div className="grid gap-6">
                    <div className="grid gap-2">
                        <label className="text-sm font-medium">คะแนนเก็บรวมทั้งหมด (Total Assignment Score)</label>
                        <Input
                            type="number"
                            value={formData.total_assignment_score}
                            onChange={e => setFormData({ ...formData, total_assignment_score: e.target.value })}
                            required
                            min="0"
                        />
                        <p className="text-xs text-muted-foreground">ผลรวมของงานทุกประเภท (ทั่วไป + พิเศษ)</p>
                    </div>

                    <div className="grid gap-2">
                        <label className="text-sm font-medium">คะแนนสอบรวมทั้งหมด (Total Exam Score)</label>
                        <Input
                            type="number"
                            value={formData.total_exam_score}
                            onChange={e => setFormData({ ...formData, total_exam_score: e.target.value })}
                            required
                            min="0"
                        />
                        <p className="text-xs text-muted-foreground">ผลรวมของการสอบทุกครั้งรวมกัน</p>
                    </div>
                </div>

                <h3 className="text-lg font-semibold mb-4 border-b pb-2 mt-8">เกณฑ์การตัดเกรด (คะแนนขั้นต่ำ)</h3>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {gradesList.map(grade => (
                        <div key={grade} className="grid gap-2">
                            <label className="text-xs font-semibold text-muted-foreground">เกรด {grade}</label>
                            <Input
                                type="number"
                                value={formData.grading_scale[grade]}
                                onChange={e => setFormData({
                                    ...formData,
                                    grading_scale: { ...formData.grading_scale, [grade]: Number(e.target.value) }
                                })}
                                required
                                min="0"
                                max="100"
                            />
                        </div>
                    ))}
                    <div className="grid gap-2">
                        <label className="text-xs font-semibold text-muted-foreground">เกรด 0</label>
                        <Input type="text" value="น้อยกว่าเกรด 1" disabled className="bg-muted text-muted-foreground" />
                    </div>
                </div>

                <div className="mt-8">
                    <Button type="submit" disabled={loading}>
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        บันทึกการตั้งค่า
                    </Button>
                </div>
            </div>
        </form>
    )
}
