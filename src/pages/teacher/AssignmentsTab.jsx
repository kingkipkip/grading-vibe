import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Trash2, Loader2 } from 'lucide-react'

export default function AssignmentsTab({ classId }) {
    const [assignments, setAssignments] = useState([])
    const [loading, setLoading] = useState(true)
    const [deletingId, setDeletingId] = useState(null)
    const [newAssign, setNewAssign] = useState({ title: '', type: 'regular', max_score: '' })

    useEffect(() => {
        fetchAssignments()
    }, [classId])

    const fetchAssignments = async () => {
        setLoading(true)
        const { data } = await supabase
            .from('assignments')
            .select('*')
            .eq('class_id', classId)
            .order('created_at', { ascending: true })
        if (data) setAssignments(data)
        setLoading(false)
    }

    const handleCreate = async () => {
        if (!newAssign.title) return

        let finalMaxScore = null;
        if (newAssign.type === 'special' || newAssign.type === 'exam') {
            finalMaxScore = parseFloat(newAssign.max_score);
            if (isNaN(finalMaxScore)) {
                alert("Please enter a valid max score for this assignment type.");
                return;
            }
        }

        const { error } = await supabase.from('assignments').insert([{
            class_id: classId,
            title: newAssign.title,
            type: newAssign.type,
            max_score: finalMaxScore,
        }])

        if (!error) {
            setNewAssign({ title: '', type: 'regular', max_score: '' })
            fetchAssignments()
        } else {
            console.error(error);
            alert("Error creating assignment: " + error.message);
        }
    }

    const handleDelete = async (id) => {
        if (!confirm("Are you sure you want to delete this assignment?")) return;
        setDeletingId(id);

        // First delete grades
        await supabase.from('grades').delete().eq('assignment_id', id);

        // Then delete assignment
        const { error } = await supabase.from('assignments').delete().eq('id', id);
        if (error) {
            alert("Error deleting assignment");
        } else {
            fetchAssignments();
        }
        setDeletingId(null);
    }

    return (
        <div className="space-y-6">
            <div className="grid gap-4 bg-white p-4 rounded shadow-sm border md:flex md:items-end">
                <div className="grid gap-2 flex-1">
                    <label className="text-sm font-medium">Title</label>
                    <Input value={newAssign.title} onChange={e => setNewAssign({ ...newAssign, title: e.target.value })} placeholder="Assignment 1" />
                </div>
                <div className="grid gap-2 w-full md:w-32">
                    <label className="text-sm font-medium">Type</label>
                    <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        value={newAssign.type}
                        onChange={e => setNewAssign({ ...newAssign, type: e.target.value })}
                    >
                        <option value="regular">Regular</option>
                        <option value="special">Special</option>
                        <option value="exam">Exam</option>
                    </select>
                </div>
                {(newAssign.type === 'special' || newAssign.type === 'exam') && (
                    <div className="grid gap-2 w-full md:w-24">
                        <label className="text-sm font-medium">Max Score</label>
                        <Input type="number" min="0" value={newAssign.max_score} onChange={e => setNewAssign({ ...newAssign, max_score: e.target.value })} placeholder="e.g. 10" />
                    </div>
                )}
                <Button onClick={handleCreate} className="w-full md:w-auto mt-4 md:mt-0">
                    <Plus className="mr-2 h-4 w-4" /> Add
                </Button>
            </div>

            <div className="grid gap-4">
                {assignments.map(a => (
                    <Card key={a.id}>
                        <CardHeader className="flex flex-row items-center justify-between py-4">
                            <div className="flex items-center gap-4">
                                <CardTitle className="text-base">{a.title}</CardTitle>
                                <span className="text-xs font-semibold uppercase bg-gray-100 px-2 py-1 rounded border">
                                    {a.type}
                                </span>
                                {a.type !== 'regular' && (
                                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                        Max: {a.max_score} pts
                                    </span>
                                )}
                            </div>
                            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(a.id)} disabled={deletingId === a.id}>
                                {deletingId === a.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            </Button>
                        </CardHeader>
                    </Card>
                ))}
                {assignments.length === 0 && !loading && (
                    <div className="text-center p-8 border-2 border-dashed rounded-lg text-muted-foreground">
                        No assignments yet. Create one above!
                    </div>
                )}
            </div>
        </div>
    )
}
