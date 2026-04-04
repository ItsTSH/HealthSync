"use client"
import { ArrowUpDown, Badge as BadgeIcon } from "lucide-react"
import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, Eye } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { getStatusDisplay } from "@/lib/supabase-services"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/animate-ui/components/radix/dropdown-menu"
import type { Note } from "@/lib/supabase-types"

// Helper function to format date
function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "—"
  try {
    const date = new Date(dateString)
    return date.toLocaleString()
  } catch {
    return "—"
  }
}

// ActionCell Component to handle navigation
function ActionCell({ note }: { note: Note }) {
  const router = useRouter()

  const handleViewSession = () => {
    if (note.id) {
      router.push(`/sessions/${note.id}`)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-10 w-10 p-0 border-border shadow-md">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="border-border shadow-md">
        <DropdownMenuLabel className="text-muted-foreground">Actions</DropdownMenuLabel>
        <DropdownMenuItem onClick={handleViewSession} className="flex items-center gap-2">
          <Eye className="h-4 w-4" />
          View Session
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => navigator.clipboard.writeText(note.id.toString())}
        >
          Copy note ID
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export const columns: ColumnDef<Note>[] = [
  {
    id: "serialNumber",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="text-base font-semibold"
        >
          S.No.
          <ArrowUpDown className="ml-2 h-5 w-5" />
        </Button>
      )
    },
    cell: ({ row }) => {
      return <span className="text-base justify-content items-center">{row.index + 1}</span>
    },
    enableSorting: true,
    enableHiding: false,
  },
  {
    accessorKey: "patientName",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="text-base font-semibold"
        >
          Patient Name
          <ArrowUpDown className="ml-2 h-5 w-5" />
        </Button>
      )
    },
    cell: ({ getValue }) => {
      const value = getValue<string>()
      return <span className="text-base">{value ?? "—"}</span>
    },
  },
  {
    accessorKey: "age",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="text-base font-semibold"
        >
          Age
          <ArrowUpDown className="ml-2 h-5 w-5" />
        </Button>
      )
    },
    cell: ({ getValue }) => {
      const value = getValue<number>()
      return <span className="text-base">{value ?? "—"}</span>
    },
  },
  {
    accessorKey: "chiefComplaint",
    header: ({ column }) => {
      return (
        <div className="flex items-center">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="text-base font-semibold"
          >
            Chief Complaint
            <ArrowUpDown className="ml-2 h-5 w-5" />
          </Button>
        </div>
      )
    },
    cell: ({ getValue }) => {
      const value = getValue<string>()
      return <span className="text-base line-clamp-1">{value ?? "—"}</span>
    },
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => {
      return (
        <div className="flex items-center">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="text-base font-semibold"
          >
            Created
            <ArrowUpDown className="ml-2 h-5 w-5" />
          </Button>
        </div>
      )
    },
    cell: ({ getValue }) => {
      const value = getValue<string>()
      return <span className="text-base text-muted-foreground">{formatDate(value)}</span>
    },
  },
  {
    accessorKey: "status",
    header: ({ column }) => {
      return (
        <div className="flex items-center">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="text-base font-semibold"
          >
            Status
            <ArrowUpDown className="ml-2 h-5 w-5" />
          </Button>
        </div>
      )
    },
    cell: ({ getValue }) => {
      const status = getValue<'pending' | 'processing' | 'completed' | 'failed'>()
      const variantMap: Record<string, 'default' | 'secondary' | 'destructive'> = {
        pending: 'secondary',
        processing: 'secondary',
        completed: 'default',
        failed: 'destructive',
      }
      return (
        <Badge variant={variantMap[status] || 'secondary'}>
          {getStatusDisplay(status)}
        </Badge>
      )
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const note = row.original
      return <ActionCell note={note} />
    },
  },
]
