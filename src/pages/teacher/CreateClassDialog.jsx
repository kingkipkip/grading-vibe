import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Plus, Loader2 } from 'lucide-react'

export default function CreateClassDialog({ termId, onClassCreated }) {
    const { user } = useAuth()
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        subject_code: '',
        subject_name: '',
        room: ''
    })



    const [availableRooms, setAvailableRooms] = useState([])

    useEffect(() => {
        const fetchRooms = async () => {
            const { data } = await supabase
                .from('students')
                .select('current_room')
                .not('current_room', 'is', null)

            if (data) {
                // Get unique rooms
                const uniqueRooms = [...new Set(data.map(item => item.current_room))].sort()
                setAvailableRooms(uniqueRooms)
            }
        }
        fetchRooms()
    }, [])

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!termId || !user) return

        setLoading(true)
        try {
            // 1. Create Class
            const { data: classData, error: classError } = await supabase
                .from('classes')
                .insert([{
                    teacher_id: user.id,
                    term_id: termId,
                    subject_code: formData.subject_code,
                    subject_name: formData.subject_name,
                    room: formData.room
                }])
                .select()
                .single()

            if (classError) throw classError

            // 2. Auto-Enroll Students from that Room
            // Fetch students in room
            const { data: students } = await supabase
                .from('students')
                .select('id')
                .eq('current_room', formData.room)

            if (students && students.length > 0) {
                const enrollments = students.map(s => ({
                    class_id: classData.id,
                    student_id: s.id
                }))

                const { error: enrollError } = await supabase
                    .from('enrollments')
                    .insert(enrollments)

                if (enrollError) console.error("Enrollment Error:", enrollError)
            }

            setOpen(false)
            setFormData({ subject_code: '', subject_name: '', room: '' })
            onClassCreated()

        } catch (err) {
            console.error(err)
            alert('Failed to create class: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button disabled={!termId}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Class
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Create New Class</DialogTitle>
                        <DialogDescription>
                            Add a new subject for the current term. Students from the selected room will be automatically enrolled.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="code" className="text-right">
                                Code
                            </Label>
                            <Input
                                id="code"
                                placeholder="TH101"
                                className="col-span-3"
                                value={formData.subject_code}
                                onChange={e => setFormData({ ...formData, subject_code: e.target.value })}
                                required
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">
                                Name
                            </Label>
                            <Input
                                id="name"
                                placeholder="Thai Language"
                                className="col-span-3"
                                value={formData.subject_name}
                                onChange={e => setFormData({ ...formData, subject_name: e.target.value })}
                                required
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="room" className="text-right">
                                Room
                            </Label>
                            <div className="col-span-3">
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                    value={formData.room}
                                    onChange={e => setFormData({ ...formData, room: e.target.value })}
                                    required
                                >
                                    <option value="">Select a room...</option>
                                    {availableRooms.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Select from existing rooms with students.
                                </p>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Create Class'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
