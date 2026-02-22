import { useMemo } from 'react'
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const COLORS = {
    "4": "#10b981",   // Emerald 500
    "3.5": "#34d399", // Emerald 400
    "3": "#60a5fa",   // Blue 400
    "2.5": "#93c5fd", // Blue 300
    "2": "#fbbf24",   // Amber 400
    "1.5": "#fcd34d", // Amber 300
    "1": "#f87171",   // Red 400
    "0": "#ef4444"    // Red 500
}

export default function GradeSummaryChart({ students, assignments, grades, getEffectiveScore, getFinalGrade }) {
    const chartData = useMemo(() => {
        // Collect all final grades
        const gradeCounts = {
            "4": 0, "3.5": 0, "3": 0, "2.5": 0, "2": 0, "1.5": 0, "1": 0, "0": 0
        }

        students.forEach(student => {
            let total = 0
            assignments.forEach(a => {
                const grade = grades[`${student.id}_${a.id}`]
                total += getEffectiveScore(grade, a)
            })

            // Only count if they have some score (or you could count all enrolled)
            if (total > 0) {
                const finalGrade = getFinalGrade(total)
                if (gradeCounts[finalGrade] !== undefined) {
                    gradeCounts[finalGrade]++
                }
            }
        })

        // Format for Recharts
        return Object.entries(gradeCounts)
            .map(([grade, count]) => ({
                grade,
                count
            }))
            .sort((a, b) => Number(b.grade) - Number(a.grade)) // Sort 4 to 0
    }, [students, assignments, grades, getEffectiveScore, getFinalGrade])

    const totalGraded = chartData.reduce((sum, item) => sum + item.count, 0)

    if (totalGraded === 0) {
        return null // Don't show chart if no one is graded
    }

    return (
        <Card className="print:hidden w-full max-w-2xl mx-auto my-6 border-indigo-100 shadow-sm">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold text-center text-primary">
                    Grade Distribution (Overview)
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[250px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={chartData}
                            margin={{
                                top: 20,
                                right: 30,
                                left: 0,
                                bottom: 20,
                            }}
                        >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.4} />
                            <XAxis
                                dataKey="grade"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#6b7280', fontSize: 12 }}
                                dy={10}
                            />
                            <YAxis
                                allowDecimals={false}
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#6b7280', fontSize: 12 }}
                            />
                            <Tooltip
                                cursor={{ fill: '#f3f4f6' }}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                formatter={(value) => [`${value} Students`, 'Count']}
                                labelFormatter={(label) => `Grade: ${label}`}
                            />
                            <Bar
                                dataKey="count"
                                radius={[4, 4, 0, 0]}
                                barSize={40}
                                animationDuration={1500}
                            >
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[entry.grade] || '#cbd5e1'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    )
}
