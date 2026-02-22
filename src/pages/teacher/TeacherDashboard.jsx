import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Plus, Users, BookOpen, Trash2, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import CreateClassDialog from './CreateClassDialog'

export default function TeacherDashboard() {
    const { user } = useAuth()
    const [classes, setClasses] = useState([])
    const [loading, setLoading] = useState(true)
    const [term, setTerm] = useState(null)
    const [termLoading, setTermLoading] = useState(true)
    const [deletingId, setDeletingId] = useState(null)

    useEffect(() => {
        fetchActiveTerm()
    }, [])

    useEffect(() => {
        if (user && term) {
            fetchClasses()
        } else if (!termLoading && !term) {
            setLoading(false) // No term, stop loading classes
        }
    }, [user, term, termLoading])

    const fetchActiveTerm = async () => {
        setTermLoading(true)
        try {
            const { data, error } = await supabase
                .from('academic_terms')
                .select('*')
                .eq('is_active', true)
                .maybeSingle() // Use maybeSingle to avoid 406 error if 0 rows

            if (error) {
                console.error("Error fetching term:", error)
            }
            if (data) setTerm(data)
        } catch (err) {
            console.error("Unexpected error:", err)
        } finally {
            setTermLoading(false)
        }
    }

    const fetchClasses = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('classes')
            .select('*, enrollments(count)')
            .eq('teacher_id', user.id)
            .eq('term_id', term.id)
            .order('created_at', { ascending: false })

        if (!error) setClasses(data || [])
        setLoading(false)
    }

    const handleDeleteClass = async (e, classId) => {
        e.preventDefault() // Prevent navigation from Link
        if (!window.confirm("Are you sure you want to delete this class? This will also remove all student enrollments for this class.")) return

        setDeletingId(classId)
        try {
            // First delete enrollments
            await supabase.from('enrollments').delete().eq('class_id', classId)

            // Then delete the class
            const { error } = await supabase.from('classes').delete().eq('id', classId)
            if (error) throw error

            // Refresh list
            fetchClasses()
            toast.success("Class deleted successfully")
        } catch (err) {
            console.error("Error deleting class:", err)
            toast.error("Failed to delete class: " + err.message)
        } finally {
            setDeletingId(null)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold">My Classes</h1>
                    <p className="text-muted-foreground">
                        {termLoading ? (
                            <span>Loading Term...</span>
                        ) : term ? (
                            <>
                                Term: {term.name}
                                {term.status === 'closed' && <span className="ml-2 text-red-500">(Closed)</span>}
                            </>
                        ) : (
                            <span className="text-orange-500">No Active Term Found</span>
                        )}
                    </p>
                </div>
                <CreateClassDialog termId={term?.id} onClassCreated={fetchClasses} />
            </div>

            {loading ? (
                <div>{termLoading ? 'Checking academic terms...' : 'Loading classes...'}</div>
            ) : !term ? (
                <div className="p-8 text-center border rounded bg-yellow-50 text-yellow-800">
                    <h3 className="font-bold">No Active Term</h3>
                    <p>Please contact an admin to create and activate a new academic term.</p>
                </div>
            ) : (
                <motion.div
                    className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ staggerChildren: 0.1 }}
                >
                    {classes.length === 0 && (
                        <div className="col-span-full text-center py-12 text-gray-500 border-2 border-dashed rounded-lg">
                            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-20" />
                            <p>No classes found for {term.name}.</p>
                            <p className="text-sm">Click "Create Class" to get started.</p>
                        </div>
                    )}

                    {classes.map(cls => (
                        <motion.div
                            key={cls.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            whileHover={{ scale: 1.02 }}
                            transition={{ duration: 0.2 }}
                        >
                            <Link to={`/teacher/class/${cls.id}`} className="relative group block h-full">
                                <Card className="hover:shadow-xl transition-all duration-300 border-t-4 border-t-primary h-full">
                                    <CardHeader>
                                        <CardTitle className="flex justify-between items-start">
                                            <div className="pr-8">
                                                <div className="text-2xl font-bold">{cls.subject_code}</div>
                                                <div className="text-sm font-normal text-muted-foreground">
                                                    {cls.subject_name} <span className="font-semibold text-primary">({cls.room})</span>
                                                </div>
                                            </div>
                                        </CardTitle>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="absolute top-4 right-4 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-50 transition-opacity"
                                            onClick={(e) => handleDeleteClass(e, cls.id)}
                                            disabled={deletingId === cls.id}
                                        >
                                            {deletingId === cls.id ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
                                        </Button>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex items-center text-muted-foreground">
                                            <Users className="mr-2 h-4 w-4" />
                                            {cls.enrollments[0]?.count || 0} Students
                                        </div>
                                    </CardContent>
                                    <CardFooter className="text-xs text-muted-foreground pt-0">
                                        Created {new Date(cls.created_at).toLocaleDateString()}
                                    </CardFooter>
                                </Card>
                            </Link>
                        </motion.div>
                    ))}
                </motion.div>
            )}
        </div>
    )
}
