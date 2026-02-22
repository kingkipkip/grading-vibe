import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

export default function AdminTermPage() {
    const [terms, setTerms] = useState([])
    const [loading, setLoading] = useState(true)
    const [newTerm, setNewTerm] = useState({ name: '', year: '', term: '' })
    const [creating, setCreating] = useState(false)

    useEffect(() => {
        fetchTerms()
    }, [])

    const fetchTerms = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('academic_terms')
            .select('*')
            .order('created_at', { ascending: false })

        if (!error) setTerms(data || [])
        setLoading(false)
    }

    const handleCreateTerm = async (e) => {
        e.preventDefault()
        setCreating(true)
        const { error } = await supabase.from('academic_terms').insert([{
            name: newTerm.name,
            year: newTerm.year,
            term: newTerm.term,
            is_active: false // Default to false, manual activation needed
        }])

        if (!error) {
            setNewTerm({ name: '', year: '', term: '' })
            fetchTerms()
        }
        setCreating(false)
    }

    const toggleActive = async (id, currentStatus) => {
        // Deactivate all others first (optional, usually one active term)
        if (!currentStatus) {
            await supabase.from('academic_terms').update({ is_active: false }).neq('id', id)
        }

        const { error } = await supabase
            .from('academic_terms')
            .update({ is_active: !currentStatus })
            .eq('id', id)

        if (!error) fetchTerms()
    }

    const toggleStatus = async (id, currentStatus) => {
        const newStatus = currentStatus === 'open' ? 'closed' : 'open'
        const { error } = await supabase
            .from('academic_terms')
            .update({ status: newStatus })
            .eq('id', id)

        if (!error) fetchTerms()
    }

    const handleDeleteTerm = async (id) => {
        if (!window.confirm("Are you sure you want to delete this term? This action cannot be undone.")) return;

        try {
            const { error } = await supabase
                .from('academic_terms')
                .delete()
                .eq('id', id)

            if (error) throw error
            toast.success("Term deleted successfully")
            fetchTerms()
        } catch (error) {
            toast.error("Error deleting term: " + error.message)
        }
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold">Academic Terms</h1>

            {/* Create Form */}
            <div className="bg-white p-4 rounded-lg shadow border flex gap-4 items-end">
                <div className="grid gap-2">
                    <label className="text-sm font-medium">Term Name (e.g. 1/2567)</label>
                    <Input
                        value={newTerm.name}
                        onChange={e => setNewTerm({ ...newTerm, name: e.target.value })}
                        placeholder="1/2567"
                    />
                </div>
                <div className="grid gap-2">
                    <label className="text-sm font-medium">Year</label>
                    <Input
                        value={newTerm.year}
                        onChange={e => setNewTerm({ ...newTerm, year: e.target.value })}
                        placeholder="2567"
                        className="w-24"
                    />
                </div>
                <div className="grid gap-2">
                    <label className="text-sm font-medium">Term</label>
                    <Input
                        value={newTerm.term}
                        onChange={e => setNewTerm({ ...newTerm, term: e.target.value })}
                        placeholder="1"
                        className="w-16"
                    />
                </div>
                <Button onClick={handleCreateTerm} disabled={creating || !newTerm.name}>
                    {creating ? <Loader2 className="animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                    Add Term
                </Button>
            </div>

            {/* List */}
            <Table className="bg-white border rounded-lg">
                <TableHeader>
                    <TableRow>
                        <TableHead>System Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Active Term</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {terms.map(term => (
                        <TableRow key={term.id}>
                            <TableCell className="font-medium">{term.name}</TableCell>
                            <TableCell>
                                <Badge variant={term.status === 'open' ? 'success' : 'secondary'}
                                    className="cursor-pointer"
                                    onClick={() => toggleStatus(term.id, term.status)}>
                                    {term.status}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                <Switch
                                    checked={term.is_active}
                                    onCheckedChange={() => toggleActive(term.id, term.is_active)}
                                />
                            </TableCell>
                            <TableCell className="text-right">
                                <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDeleteTerm(term.id)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}
