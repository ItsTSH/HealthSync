import PatientsGrid from "@/components/patients/PatientsGrid"

export default function Patients() {
    return (
        <div className="py-5 w-full">
            <div className="mb-6">
                <h1 className="text-4xl text-foreground">All Patients</h1>
                <h3 className="text-lg text-muted-foreground">View all registered patients</h3>
            </div>

            <PatientsGrid />
        </div>
    )
}