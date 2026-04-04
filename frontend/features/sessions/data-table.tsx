"use client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { useRouter } from "next/navigation"

import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Record } from "@/lib/types"
import type { Note } from "@/lib/supabase-types"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
}

export function DataTable<TData, TValue>({
  columns,
  data,
}: DataTableProps<TData, TValue>) {
  const router = useRouter()
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = React.useState("")
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  )
  const globalFilterFn = (row: any, _columnId: string, filterValue: string) => {
    const search = filterValue.toLowerCase()

    return (
      row.original.patientName?.toLowerCase().includes(search) ||
      row.original.chiefComplaint?.toLowerCase().includes(search) ||
      row.original.symptoms?.toLowerCase().includes(search)
    )
  }
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center py-6">
        <Input
          placeholder="Filter by patients, chief complaints, status, room, etc..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="w-full border-border shadow-md text-base h-12 px-4"
        />
      </div>
      <div className="overflow-hidden rounded-lg border-secondary border-2 shadow-lg bg-card">
        <Table className="border-border">
          <TableHeader className="border-border bg-secondary hover:bg-secondary">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-border hover:bg-secondary">
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead
                      key={header.id}
                      className="border-border h-16 px-6 py-4 text-base font-bold text-foreground"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody className="border-border">
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <React.Fragment key={row.id}>
                  <ContextMenu>
                    <ContextMenuTrigger asChild>
                      <TableRow
                        key={row.id}
                        data-state={row.getIsSelected() && "selected"}
                        className="border-border hover:bg-accent/50 transition-colors h-20"
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell
                            key={cell.id}
                            className="border-border px-6 py-4 text-base align-middle"
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            ) ?? (cell.renderValue() as React.ReactNode)}
                          </TableCell>
                        ))}
                      </TableRow>
                    </ContextMenuTrigger>
                    <ContextMenuContent className="border-border shadow-md rounded-lg w-56">
                      <ContextMenuItem 
                        className="text-base py-3 px-3 cursor-pointer"
                        onClick={() => {
                          const note = row.original as Note
                          if (note.id) {
                            router.push(`/sessions/${note.id}`)
                          }
                        }}
                      >
                        View Session
                      </ContextMenuItem>
                      <ContextMenuItem 
                        className="text-base py-3 px-3 cursor-pointer"
                        onClick={() => {
                          const note = row.original as Note
                          if (note.id) {
                            navigator.clipboard.writeText(note.id)
                          }
                        }}
                      >
                        Copy Session ID
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                </React.Fragment>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-32 text-center text-lg text-muted-foreground"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-4 py-6">
        <Button
          variant="outline"
          size="lg"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
          className="border-border shadow-md text-base px-6 py-6"
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="lg"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
          className="border-border shadow-md text-base px-6 py-6"
        >
          Next
        </Button>
      </div>
    </div>
  )
}

