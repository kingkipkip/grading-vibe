import { useState, useEffect } from 'react'
import Papa from 'papaparse'
import { AddStudentForm } from '@/components/AddStudentForm'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Loader2, UploadCloud, CheckCircle, AlertTriangle, Plus, Search, Download } from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from 'sonner'

export default function StudentImportPage() {
    const [csvData, setCsvData] = useState([])
    const [uploading, setUploading] = useState(false)
    const [status, setStatus] = useState(null) // { type: 'success'|'error', message: '' }
    const [students, setStudents] = useState([])
    const [searchQuery, setSearchQuery] = useState('')

    useEffect(() => {
        fetchStudents()
    }, [])

    const fetchStudents = async () => {
        const { data, error } = await supabase
            .from('students')
            .select('*')
            .order('student_id', { ascending: true })

        if (!error) setStudents(data || [])
    }

    const handleFileUpload = (event) => {
        const file = event.target.files[0]
        if (!file) return

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                // Expected headers: student_id, national_id, first_name, last_name, current_room
                if (results.errors.length > 0) {
                    setStatus({ type: 'error', message: 'Error parsing CSV file.' })
                    return
                }
                setCsvData(results.data)
                setStatus(null)
            },
            error: (err) => {
                setStatus({ type: 'error', message: 'Failed to read file: ' + err.message })
            }
        })
    }

    const handleImport = async () => {
        if (csvData.length === 0) return
        setUploading(true)
        setStatus(null)

        try {
            // Validate headers roughly
            const sample = csvData[0]
            if (!sample.student_id || !sample.national_id || !sample.first_name) {
                throw new Error("Invalid CSV Format. Missing required columns (student_id, national_id, first_name...)")
            }

            // Insert into Supabase
            const { error } = await supabase
                .from('students')
                .upsert(
                    csvData.map(row => ({
                        student_id: row.student_id,
                        national_id: row.national_id,
                        first_name: row.first_name,
                        last_name: row.last_name || '',
                        current_room: row.current_room || null,
                        student_number: row.student_number ? parseInt(row.student_number) : null
                    })),
                    { onConflict: 'student_id' } // Upsert based on student_id
                )

            if (error) throw error

            setStatus({ type: 'success', message: `Successfully imported ${csvData.length} students!` })
            setCsvData([])
            fetchStudents()

        } catch (err) {
            setStatus({ type: 'error', message: err.message })
        } finally {
            setUploading(false)
        }
    }

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this student? This may fail if they have existing grades or enrollments.")) return

        try {
            const { error } = await supabase.from('students').delete().eq('id', id)
            if (error) throw error
            toast.success("Student deleted successfully")
            fetchStudents()
        } catch (error) {
            toast.error("Failed to delete student: " + error.message)
        }
    }

    const handleDownloadSample = () => {
        const headers = "student_id,student_number,national_id,first_name,last_name,current_room\n"
        const sampleRow1 = "65001,1,1100000000001,John,Doe,M.1/1\n"
        const sampleRow2 = "65002,2,1100000000002,Jane,Smith,M.1/1\n"
        const csvContent = headers + sampleRow1 + sampleRow2

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')

        link.href = url
        link.setAttribute('download', 'student_import_sample.csv')
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">Import Students</h1>
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="outline">
                            <Plus className="mr-2 h-4 w-4" /> Add Student Manually
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Add New Student</DialogTitle>
                            <DialogDescription>
                                Enter student details manually here.
                            </DialogDescription>
                        </DialogHeader>
                        <AddStudentForm onSuccess={() => {
                            setStatus({ type: 'success', message: 'Student added successfully' })
                            fetchStudents()
                        }} />
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-start justify-between">
                    <div className="space-y-1">
                        <CardTitle>Upload CSV File</CardTitle>
                        <CardDescription>
                            File must contain headers: <code>student_id, student_number, national_id, first_name, last_name, current_room</code>
                        </CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleDownloadSample} className="shrink-0 flex items-center gap-2">
                        <Download className="h-4 w-4" /> Download Sample CSV
                    </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid w-full max-w-sm items-center gap-1.5">
                        <input
                            type="file"
                            accept=".csv"
                            onChange={handleFileUpload}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                    </div>

                    {status && (
                        <Alert variant={status.type === 'error' ? 'destructive' : 'default'} className={status.type === 'success' ? 'border-green-500 text-green-700 bg-green-50' : ''}>
                            {status.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                            <AlertDescription>{status.message}</AlertDescription>
                        </Alert>
                    )}

                    {csvData.length > 0 && (
                        <div className="border rounded-md">
                            <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
                                <span className="font-medium">{csvData.length} records found</span>
                                <Button onClick={handleImport} disabled={uploading}>
                                    {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                                    Confirm Import
                                </Button>
                            </div>
                            <div className="max-h-64 overflow-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Student ID</TableHead>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Room</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {csvData.slice(0, 10).map((row, i) => (
                                            <TableRow key={i}>
                                                <TableCell>{row.student_id}</TableCell>
                                                <TableCell>{row.first_name} {row.last_name}</TableCell>
                                                <TableCell>{row.current_room}</TableCell>
                                            </TableRow>
                                        ))}
                                        {csvData.length > 10 && (
                                            <TableRow>
                                                <TableCell colSpan={3} className="text-center text-muted-foreground">
                                                    ... and {csvData.length - 10} more ...
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>


            <div className="space-y-4">
                <h2 className="text-2xl font-bold">Current Students</h2>
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Search by ID, Name, or Room..."
                        className="pl-8 max-w-sm"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="border rounded-md bg-white">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>No.</TableHead>
                                <TableHead>Student ID</TableHead>
                                <TableHead>Full Name</TableHead>
                                <TableHead>Room</TableHead>
                                <TableHead>National ID</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {students
                                .filter(s =>
                                    s.student_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                    s.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                    s.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                    (s.current_room && s.current_room.toLowerCase().includes(searchQuery.toLowerCase()))
                                )
                                .slice(0, 50) // Limit display for now
                                .map((student) => (
                                    <TableRow key={student.id}>
                                        <TableCell>{student.student_number || '-'}</TableCell>
                                        <TableCell className="font-mono">{student.student_id}</TableCell>
                                        <TableCell>{student.first_name} {student.last_name}</TableCell>
                                        <TableCell>{student.current_room}</TableCell>
                                        <TableCell className="text-muted-foreground text-sm">{student.national_id}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(student.id)}>
                                                Delete
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            {students.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                        No students found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                <div className="text-xs text-muted-foreground text-center">
                    Showing top 50 results
                </div>
            </div>
        </div >
    )
}
