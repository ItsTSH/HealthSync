"use client"

import { useEffect, useState } from "react"
import { Skeleton } from "boneyard-js/react"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { TimelineComponent } from "@/components/app-timeline"
import DashboardSchedule from "@/components/dashboard-appointments"
import DashboardActions from "@/components/dashboard-actions"
import { TodayDate } from "@/components/app-time"
import { createClient } from "@/lib/supabase-browser"
import { useAuth } from "@/components/auth/AuthContext"

export default function Dashboard() {
    const { session } = useAuth()
    const supabase = createClient()
    const [metrics, setMetrics] = useState({
        patientsToday: 0,
        upcomingAppointments: 0,
        pendingNotes: 0
    })
    const [doctorName, setDoctorName] = useState<string>('')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!session?.user?.id) return
        
        const fetchMetrics = async () => {
            try {
                // Fetch doctor profile
                const { data: profileData } = await supabase
                    .from('user_profiles')
                    .select('full_name, username')
                    .eq('id', session.user.id)
                    .single()
                
                if (profileData) {
                    setDoctorName(profileData.full_name || profileData.username || 'Doctor')
                }
                
                const today = new Date().toISOString().split('T')[0]
                const todayStart = `${today}T00:00:00`
                const todayEnd = `${today}T23:59:59`
                
                // Fetch medical sessions (notes) created today to count unique patients
                const { data: todayNotesData } = await supabase
                    .from('notes')
                    .select('patientName')
                    .gte('createdAt', todayStart)
                    .lt('createdAt', todayEnd)
                
                // Count unique patient names from today's sessions
                const uniquePatientsToday = todayNotesData 
                    ? new Set(todayNotesData.map(note => note.patientName)).size 
                    : 0
                
                // Fetch all upcoming appointments
                const { data: allAppointments, count: allCount } = await supabase
                    .from('appointments')
                    .select('*', { count: 'exact' })
                    .eq('user_id', session.user.id)
                    .gte('appointment_date', today)
                
                // Fetch pending notes
                const { data: pendingNotesData, count: notesCount } = await supabase
                    .from('notes')
                    .select('*', { count: 'exact' })
                    .eq('status', 'pending')
                
                setMetrics({
                    patientsToday: uniquePatientsToday,
                    upcomingAppointments: allCount || 0,
                    pendingNotes: notesCount || 0
                })
            } catch (error) {
                console.error('Error fetching metrics:', error)
            } finally {
                setLoading(false)
            }
        }
        
        fetchMetrics()
    }, [session?.user?.id, supabase])

    return (
        <>
            <div className="py-5 w-full">
                <div className="w-full p-2 gap-2">   
                    <h1 className="text-4xl text-foreground">Welcome Back <span className="text-secondary-foreground">{doctorName && `${doctorName}`}</span></h1>
                    <TodayDate/>
                </div>
            </div>
            <div className="py-10 grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                <Skeleton name="dashboard-metric-1" loading={loading}>
                    <Card className="border drop-shadow bg-card hover:bg-secondary border-border">
                       <CardHeader className="text-muted-foreground">Patients Today</CardHeader>
                       <CardContent>
                            <div className="text-3xl text-card-foreground">{loading ? '-' : metrics.patientsToday}</div>
                        </CardContent>
                    </Card>
                </Skeleton>
                <Skeleton name="dashboard-metric-2" loading={loading}>
                    <Card className="border drop-shadow bg-card hover:bg-secondary border-border">
                        <CardHeader className="text-muted-foreground">Upcoming Appointments</CardHeader>
                        <CardContent>
                            <div className="text-3xl text-card-foreground">{loading ? '-' : metrics.upcomingAppointments}</div>
                        </CardContent>
                    </Card>
                </Skeleton>
                <Skeleton name="dashboard-metric-3" loading={loading}>
                    <Card className="border drop-shadow bg-card hover:bg-secondary border-border">
                        <CardHeader className="text-muted-foreground">Pending Notes</CardHeader>
                        <CardContent>
                            <div className="text-3xl text-card-foreground">{loading ? '-' : metrics.pendingNotes}</div>
                        </CardContent>
                    </Card>
                </Skeleton>
            </div>

            <div className = "grid grid-cols-1 md:grid-cols-3 gap-4 w-full pb-10">
                <Card className="border drop-shadow bg-card border-border">
                    <CardHeader className="px-8 py-2 text-muted-foreground">
                        Recent Sessions
                    </CardHeader>
                    <CardContent>
                        <Skeleton name="dashboard-timeline" loading={loading}>
                            <div className = "bg-card rounded-radius h-[50vh] overflow-hidden">
                                <TimelineComponent />
                            </div>
                        </Skeleton>
                    </CardContent>
                </Card>
                <Card className="bg-card border-border drop-shadow">
                    <CardHeader className="text-muted-foreground px-8 py-2">Today's Schedule</CardHeader>
                    <CardContent>
                        <Skeleton name="dashboard-schedule" loading={loading}>
                            <DashboardSchedule/>
                        </Skeleton>
                    </CardContent>
                </Card>
                <Skeleton name="dashboard-actions" loading={loading}>
                    <div className="bg-background p-3 py-2 rounded-radius"><DashboardActions/></div>
                </Skeleton>
            </div>
        </>
    )
}