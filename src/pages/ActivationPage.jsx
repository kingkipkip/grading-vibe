import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Loader2, CheckCircle2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

export default function ActivationPage() {
    const { user } = useAuth()
    const [studentId, setStudentId] = useState('')
    const [nationalId, setNationalId] = useState('')
    const [loading, setLoading] = useState(false)
    const [status, setStatus] = useState({ type: '', message: '' })
    const navigate = useNavigate()

    const handleActivation = async (e) => {
        e.preventDefault()
        setLoading(true)
        setStatus({ type: '', message: '' })

        try {
            // Use the Postgres function to bypass RLS and securely activate the student
            const { data, error } = await supabase.rpc('activate_student_account', {
                p_student_id: studentId,
                p_national_id: nationalId
            })

            if (error) throw error

            if (!data.success) {
                throw new Error(data.message || "Activation failed.")
            }

            // Refresh the session so the new role ('student') takes effect immediately
            await supabase.auth.refreshSession()

            // For now, prompt success
            setStatus({ type: 'success', message: 'Account activated successfully! Redirecting...' })
            setTimeout(() => {
                window.location.href = '/dashboard' // Force hard reload to reset all states
            }, 2000)

        } catch (err) {
            setStatus({ type: 'error', message: err.message })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold text-center">Student Activation</CardTitle>
                    <CardDescription className="text-center">
                        Link your account to your student profile
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleActivation} className="space-y-4">
                        {status.message && (
                            <Alert variant={status.type === 'error' ? "destructive" : "default"} className={status.type === 'success' ? "border-green-500 text-green-600" : ""}>
                                {status.type === 'success' && <CheckCircle2 className="h-4 w-4" />}
                                <AlertTitle>{status.type === 'error' ? "Error" : "Success"}</AlertTitle>
                                <AlertDescription>{status.message}</AlertDescription>
                            </Alert>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="studentId">Student ID (รหัสนักเรียน)</Label>
                            <Input
                                id="studentId"
                                placeholder="e.g. 670123"
                                value={studentId}
                                onChange={(e) => setStudentId(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="nationalId">National ID (เลขบัตรประชาชน)</Label>
                            <Input
                                id="nationalId"
                                placeholder="13 Digits"
                                value={nationalId}
                                onChange={(e) => setNationalId(e.target.value)}
                                required
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Activate Account'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
