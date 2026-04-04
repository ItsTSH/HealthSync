import { AppointmentsPanel } from "@/features/appointments/appointments-panel";
import { AppointmentsProvider } from "@/features/appointments/appointments-provider";
import { CalendarProvider } from "@/features/calendar/calendar-provider";
import { CalendarView } from "@/features/calendar/calendar-view";


export default function Appointments() {
    return (
                <>
                    <div className = "py-5 grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                        <div className="w-full size-10 p-2 gap-2">   
                            <h1 className="text-4xl text-foreground">Appointments</h1>
                            <h3 className="text-lg text-muted-foreground pt-2">Handle Appointments</h3>
                        </div>
                    </div>
                    <div className="py-3">
                        <CalendarProvider>
                            <AppointmentsProvider>
                                <div className="py-10 grid grid-cols-1 md:grid-cols-[2fr_1.6fr] gap-4 w-full">
                                {/* Calendar */}
                                <CalendarView />
                                {/* Appointments */}
                                <AppointmentsPanel />
                                </div>
                            </AppointmentsProvider>
                        </CalendarProvider>
                    </div>
                </>
    )
}