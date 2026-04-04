"use client"

import Link from "next/link"
import * as React from "react"
import { User, FileText } from "lucide-react"

import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { GroupedPatientData } from "@/lib/types"
import { formatDate } from "@/lib/dateUtils"

interface PatientCardProps {
  patient: GroupedPatientData & { patientUUID: string }
}

export default function PatientCard({ patient }: PatientCardProps) {
  // Use patientUUID for navigation instead of base64-encoded patient name
  return (
    <Link href={`/patients/${patient.patientUUID}`} className="no-underline">
      <Card className="cursor-pointer hover:shadow-md transition-shadow duration-150 border-border drop-shadow">
        <CardContent className="flex flex-col items-start gap-4">
          <div className="w-full flex flex-col">
            <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-2">
              <User className="h-6 w-6 text-foreground" />
            </div>
            <div className="text-sm font-semibold truncate">{patient.patientName}</div>
            {/* <div className="text-xs text-muted-foreground truncate">Last Visit:</div> */}
            <div className="text-xs text-muted-foreground pt-2">
              {formatDate(patient.dateTime)}
            </div>
          </div>

          <Separator />

          <div className="w-full space-y-2">
            <div>
              <div className="text-sm font-medium">Recent Complaint</div>
              <div className="text-sm text-muted-foreground truncate">{patient.chiefComplaint}</div>
            </div>

            {patient.diagnosis && (
              <div>
                <div className="text-xs font-medium text-wrap">Diagnosis</div>
                <div className="text-sm text-muted-foreground text-wrap">{patient.diagnosis}</div>
              </div>
            )}

            {/* Record count badge */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2 pt-2 border-t border-border">
              <FileText className="h-3 w-3" />
              <span>
                {patient.recordCount} record{patient.recordCount !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
