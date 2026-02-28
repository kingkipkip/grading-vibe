import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'

export function StudentForm({ onSuccess, initialData }) {
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        student_id: '',
        student_number: '',
        national_id: '',
        first_name: '',
        last_name: '',
        current_room: ''
    })

    useEffect(() => {
        if (initialData) {
            setFormData({
                student_id: initialData.student_id || '',
                student_number: initialData.student_number || '',
                national_id: initialData.national_id || '',
                first_name: initialData.first_name || '',
                last_name: initialData.last_name || '',
                current_room: initialData.current_room || ''
            })
        }
    }, [initialData])

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.id]: e.target.value })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)

        try {
            const payload = {
                student_id: formData.student_id,
                student_number: formData.student_number ? parseInt(formData.student_number) : null,
                national_id: formData.national_id,
                first_name: formData.first_name,
                last_name: formData.last_name,
                current_room: formData.current_room
            }

            let error;
            if (initialData && initialData.id) {
                const { error: updateError } = await supabase
                    .from('students')
                    .update(payload)
                    .eq('id', initialData.id)
                error = updateError;
            } else {
                const { error: insertError } = await supabase
                    .from('students')
                    .insert([payload])
                error = insertError;
            }

            if (error) throw error

            // Reset form
            setFormData({
                student_id: '',
                student_number: '',
                national_id: '',
                first_name: '',
                last_name: '',
                current_room: ''
            })

            if (onSuccess) onSuccess()

        } catch (error) {
            alert(error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="student_number" className="text-right">No.</Label>
                <Input id="student_number" value={formData.student_number} onChange={handleChange} className="col-span-3" type="number" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="student_id" className="text-right">Student ID</Label>
                <Input id="student_id" value={formData.student_id} onChange={handleChange} className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="current_room" className="text-right">Room</Label>
                <Input id="current_room" value={formData.current_room} onChange={handleChange} className="col-span-3" placeholder="e.g. 4/1" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="national_id" className="text-right">National ID</Label>
                <Input id="national_id" value={formData.national_id} onChange={handleChange} className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="first_name" className="text-right">First Name</Label>
                <Input id="first_name" value={formData.first_name} onChange={handleChange} className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="last_name" className="text-right">Last Name</Label>
                <Input id="last_name" value={formData.last_name} onChange={handleChange} className="col-span-3" required />
            </div>

            <div className="flex justify-end mt-4">
                <Button type="submit" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {initialData ? 'Update Student' : 'Add Student'}
                </Button>
            </div>
        </form>
    )
}
