import DataTableProvider from "@/features/sessions/table-provider";

export default function Sessions() {
    return (
        <>
            <div className = "py-5 grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                    <div className="w-full size-10 p-2 gap-2">   
                        <h1 className="text-4xl text-foreground">All Session</h1>
                        <h3 className="text-lg text-muted-foreground">View all previous sessions</h3>
                    </div>
            </div>
            <DataTableProvider/>
        </>
    )
}