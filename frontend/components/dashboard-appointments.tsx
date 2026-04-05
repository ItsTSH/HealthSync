"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "boneyard-js/react";
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase-browser"
import { useAuth } from "@/components/auth/AuthContext"
import { ArrowRight, Clock, MapPin } from "lucide-react";

interface Appointment {
  id: string
  appointment_time: string
  patient_name: string
  room?: string
  duration_minutes: number
  appointment_type?: string
}

export default function DashboardSchedule() {
  const router = useRouter();
  const { session } = useAuth();
  const supabase = createClient();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user?.id) return;

    const fetchAppointments = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const { data, error } = await supabase
          .from('appointments')
          .select('*')
          .eq('user_id', session.user.id)
          .eq('appointment_date', today)
          .order('appointment_time', { ascending: true })
          .limit(4);

        if (error) throw error;
        setAppointments(data || []);
      } catch (error) {
        console.error('Error fetching appointments:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, [session?.user?.id, supabase]);

  return (
    <Skeleton name="dashboard-appointments" loading={loading}>
      <>
        {loading ? (
          <div className="text-center text-muted-foreground">Loading appointments...</div>
        ) : appointments.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">No appointments today</div>
        ) : (
          appointments.map((appointment, index) => (
            <Card 
              key={appointment.id ?? index} 
              onClick={() => router.push('/record-session')} 
              className="group mb-3 relative flex flex-row rounded-2xl items-center justify-between p-4 bg-secondary border-border cursor-pointer hover:bg-card transition"
            >
              <div className="absolute left-0 top-0 h-full w-2 bg-ring rounded-l-2xl" />
              <div className="flex flex-col gap-2 flex-1">
                <span className="font-semibold text-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {appointment.appointment_time}
                </span>
                <span className="text-sm text-muted-foreground">{appointment.patient_name}</span>
                {appointment.room && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {appointment.room}
                  </span>
                )}
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition" />
            </Card>
          ))
        )}
      </>
    </Skeleton>
  );
}