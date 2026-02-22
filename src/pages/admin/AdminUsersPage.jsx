import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Loader2, Search, ShieldCheck, UserCog } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'

export default function AdminUsersPage() {
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [updatingId, setUpdatingId] = useState(null)

    useEffect(() => {
        fetchUsers()
    }, [])

    const fetchUsers = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) {
            toast.error("Failed to fetch users: " + error.message)
        } else {
            setUsers(data || [])
        }
        setLoading(false)
    }

    const handleRoleChange = async (userId, newRole) => {
        setUpdatingId(userId)
        try {
            const { error } = await supabase
                .from('users')
                .update({ role: newRole })
                .eq('id', userId)

            if (error) throw error

            toast.success(`User role updated to ${newRole}`)
            fetchUsers()
        } catch (error) {
            toast.error("Failed to update role: " + error.message)
        } finally {
            setUpdatingId(null)
        }
    }

    const filteredUsers = users.filter(u =>
        (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (u.full_name && u.full_name.toLowerCase().includes(searchQuery.toLowerCase()))
    )

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <UserCog className="h-8 w-8 text-primary" />
                        User Accounts
                    </h1>
                    <p className="text-muted-foreground mt-1">Manage system access and assign roles to teachers.</p>
                </div>
            </div>

            <div className="flex items-center gap-4 bg-white p-4 rounded-lg shadow-sm border">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Search by name or email..."
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-gray-50">
                        <TableRow>
                            <TableHead>Account Details</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Joined Date</TableHead>
                            <TableHead className="text-right">Manage Role</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-32 text-center">
                                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary mb-2" />
                                    <p className="text-muted-foreground">Loading users...</p>
                                </TableCell>
                            </TableRow>
                        ) : filteredUsers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                                    No users found matching "{searchQuery}"
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredUsers.map(user => (
                                <TableRow key={user.id}>
                                    <TableCell>
                                        <div className="font-medium text-gray-900">{user.full_name || 'No Name Provided'}</div>
                                        <div className="text-sm text-gray-500">{user.email}</div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={`
                                            ${user.role === 'admin' ? 'bg-black text-white' : ''}
                                            ${user.role === 'teacher' ? 'bg-blue-100 text-blue-800 border-blue-200' : ''}
                                            ${user.role === 'student' ? 'bg-green-100 text-green-800 border-green-200' : ''}
                                            ${user.role === 'guest' ? 'bg-gray-100 text-gray-800 border-gray-200' : ''}
                                        `}>
                                            {user.role === 'admin' && <ShieldCheck className="w-3 h-3 mr-1 inline" />}
                                            {user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Guest'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-sm">
                                        {new Date(user.created_at).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end items-center gap-2">
                                            {updatingId === user.id && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                                            <Select
                                                defaultValue={user.role || 'guest'}
                                                onValueChange={(val) => handleRoleChange(user.id, val)}
                                                disabled={updatingId === user.id}
                                            >
                                                <SelectTrigger className="w-[130px]">
                                                    <SelectValue placeholder="Select role" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="guest">Guest</SelectItem>
                                                    <SelectItem value="student">Student</SelectItem>
                                                    <SelectItem value="teacher">Teacher</SelectItem>
                                                    <SelectItem value="admin">Admin</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
