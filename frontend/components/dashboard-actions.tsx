"use client";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "boneyard-js/react"
import { useRouter } from "next/navigation"
import { ArrowRight } from "lucide-react";
import { Calendar, Mic, Notebook, Users } from "lucide-react";

const items = [
    {
        id: 1,
        title: "Appointments",
        description: "View all appointments",
        icon: Calendar,
        url: "/appointments",
    },
    {
        id: 2,
        title: "Record Session",
        description: "Start recording now",
        icon: Mic,
        url: "/record-session",
    },
    {
        id: 3,
        title: "View Sessions",
        description: "Session history",
        icon: Notebook,
        url: "/sessions",
    },
    {
        id: 4,
        title: "All Patients",
        description: "View all patients",
        icon: Users,
        url: "/patients",
    },
]

export default function DashboardActions(){
    const router = useRouter();
    return(
        <Skeleton name="dashboard-actions" loading={false}>
            <>
                {items.map((item, index) => {
                return(
                    <Card key = {item.id ?? index} onClick={() => router.push(item.url)} className="group mb-3 relative flex flex-row rounded-2xl items-center p-6 bg-card border-border cursor-pointer hover:bg-secondary transition drop-shadow-sm">
                        <div className="flex flex-col gap-1">
                            <div className="p-2 rounded-lg bg-primary/20"><item.icon/></div> 
                        </div>
                        <div className="flex items-left gap-3 flex-col">
                            <span className="font-semibold text-foreground">{item.title}</span>
                            <span className="text-sm text-muted-foreground">{item.description}</span>
                        </div>
                    </Card>
            )
            })}
            </>
        </Skeleton>
    )
}