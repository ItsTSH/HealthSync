import React from "react";
import { User, Clock, Activity } from "lucide-react";

const patients = [
    {
        id: 1,
        patientName: "Sunil Rane",
        age: 36,
        gender: "Male",
        chiefComplaint: "Chest Pain",
        symptoms: "Sharp chest pain while deep breathing",
        previousDiagnosis: "Tuberculosis",
        previousMedications: null,
        created_at: "2025-10-23T20:27:37.744163",
    },
    {
        id: 2,
        patientName: "Sarah Parker",
        age: 29,
        gender: "Female",
        chiefComplaint: "Frequent Headaches",
        symptoms: "Throbbing pain and nausea",
        previousDiagnosis: "Migraine",
        previousMedications: "Sumatriptan",
        created_at: "2025-10-22T17:12:40.211111",
    },
    {
        id: 3,
        patientName: "Romen Reings",
        age: 29,
        gender: "Female",
        chiefComplaint: "Frequent Headaches",
        symptoms: "Throbbing pain and nausea",
        previousDiagnosis: "Migraine",
        previousMedications: "Sumatriptan",
        created_at: "2025-10-22T17:12:40.211111",
    },
    {
        id: 4,
        patientName: "Arthur Morgan",
        age: 29,
        gender: "Female",
        chiefComplaint: "Frequent Headaches",
        symptoms: "Throbbing pain and nausea",
        previousDiagnosis: "Migraine",
        previousMedications: "Sumatriptan",
        created_at: "2025-10-22T17:12:40.211111",
    },
    {
        id: 5,
        patientName: "Sashank Mishra",
        age: 29,
        gender: "Female",
        chiefComplaint: "Frequent Headaches",
        symptoms: "Throbbing pain and nausea",
        previousDiagnosis: "Migraine",
        previousMedications: "Sumatriptan",
        created_at: "2025-10-22T17:12:40.211111",
    },
    {
        id: 6,
        patientName: "Ritik Sharma",
        age: 29,
        gender: "Female",
        chiefComplaint: "Frequent Headaches",
        symptoms: "Throbbing pain and nausea",
        previousDiagnosis: "Migraine",
        previousMedications: "Sumatriptan",
        created_at: "2025-10-22T17:12:40.211111",
    },
];

export default function Analytics({ theme = "light" }) {
    const containerClasses =
        theme === "light"
            ? "bg-gray-50 text-gray-900"
            : "bg-[#030712] text-gray-100";

    const cardBaseClasses =
        "rounded-xl border p-6 shadow-sm hover:shadow-md transition-all";

    const lightCardClasses =
        "bg-white border-gray-200 text-gray-900 hover:bg-gray-50";

    const darkCardClasses =
        "bg-[#0b0f1a] border-gray-600 text-gray-100 hover:bg-[#141b2e]";

    const metaTextClasses =
        theme === "light" ? "text-gray-500" : "text-gray-400";

    const footerClasses =
        theme === "light"
            ? "mt-4 pt-3 border-t flex items-center gap-2 text-xs border-gray-100 text-gray-500"
            : "mt-4 pt-3 border-t flex items-center gap-2 text-xs border-gray-600 text-gray-400";

    return (
        <div className={`${containerClasses} min-h-screen px-6 py-8`}>
            <h1 className="text-2xl font-semibold mb-6">Patient Analytics</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {patients.map((p) => (
                    <div
                        key={p.id}
                        className={`${cardBaseClasses} ${
                            theme === "light" ? lightCardClasses : darkCardClasses
                        }`}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                <User
                                    className={`${
                                        theme === "light" ? "text-gray-700" : "text-gray-300"
                                    } w-5 h-5`}
                                />
                                {p.patientName}
                            </h2>

                            <span className={`text-xs flex items-center gap-1 ${metaTextClasses}`}>
                                <Clock className="w-4 h-4" />
                                {new Date(p.created_at).toLocaleDateString()}
                            </span>
                        </div>

                        <div className="space-y-2 text-sm">
                            <p>
                                <strong>Age:</strong> {p.age}
                            </p>
                            <p>
                                <strong>Gender:</strong> {p.gender}
                            </p>
                            <p>
                                <strong>Chief Complaint:</strong> {p.chiefComplaint}
                            </p>
                            <p>
                                <strong>Symptoms:</strong> {p.symptoms}
                            </p>
                            <p>
                                <strong>Previous Diagnosis:</strong> {p.previousDiagnosis || "—"}
                            </p>
                            <p>
                                <strong>Previous Medications:</strong> {p.previousMedications || "—"}
                            </p>
                        </div>

                        <div className={footerClasses}>
                            <Activity className="w-4 h-4" />
                            <span>Patient ID: {p.id}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
