import React from "react";
import { useNavigate } from "react-router-dom";
import { User } from "lucide-react";
import Layout from "../components/Layout";

export default function SessionsPage({ theme = "light", toggleTheme }) {
  const navigate = useNavigate();

  const patients = [
    { name: "John Martinez", age: 45, gender: "Male", lastVisit: "Oct 25, 2025", condition: "Annual Checkup", status: "Completed" },
    { name: "Emily Chan", age: 32, gender: "Female", lastVisit: "Oct 25, 2025", condition: "Follow-up Visit", status: "Completed" },
    { name: "Michael Brown", age: 58, gender: "Male", lastVisit: "Oct 25, 2025", condition: "Consultation", status: "Completed" },
    { name: "Lisa Anderson", age: 28, gender: "Female", lastVisit: "Oct 25, 2025", condition: "Initial Assessment", status: "In Progress" },
    { name: "David Kim", age: 41, gender: "Male", lastVisit: "Oct 24, 2025", condition: "Routine Check", status: "Completed" },
  ];

  const handlePatientClick = (patient) => {
    navigate("/analytics", { state: { patient } });
  };

  return (
    <Layout theme={theme} toggleTheme={toggleTheme}>
      <div className={`${theme === "light" ? "bg-white border-gray-200" : "bg-[#0b0f1a] border-gray-600"} rounded-lg border`}>
        <div className={`px-6 py-4 border-b flex items-center justify-between ${
          theme === "light" ? "border-gray-200" : "border-gray-600"
        }`}>
          <h2 className="text-lg font-semibold">Consulted Patients</h2>
          <input
            type="text"
            placeholder="Search patients..."
            className={`px-4 py-2 border rounded-lg text-sm focus:outline-none ${
              theme === "light"
                ? "border-gray-200 focus:border-gray-400 text-gray-900"
                : "border-gray-600 focus:border-gray-500 bg-[#141b2e] text-gray-100 placeholder-gray-400"
            }`}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={`${theme === "light" ? "bg-gray-50 border-gray-200" : "bg-[#0b0f1a] border-gray-600"} border-b`}>
              <tr>
                {["Patient Name", "Age", "Gender", "Last Visit", "Condition", "Status"].map((header) => (
                  <th
                    key={header}
                    className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      theme === "light" ? "text-gray-500" : "text-gray-400"
                    }`}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className={`${theme === "light" ? "bg-white divide-gray-200" : "bg-[#0b0f1a] divide-gray-600"}`}>
              {patients.map((patient, i) => (
                <tr
                  key={i}
                  onClick={() => handlePatientClick(patient)}
                  className={`hover:cursor-pointer ${
                    theme === "light" ? "hover:bg-gray-50" : "hover:bg-[#141b2e]"
                  }`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${
                        theme === "light" ? "bg-gray-200" : "bg-[#141b2e]"
                      }`}>
                        <User className={`w-5 h-5 ${theme === "light" ? "text-gray-600" : "text-gray-300"}`} />
                      </div>
                      <div className={`${theme === "light" ? "text-gray-900" : "text-gray-100"} font-medium`}>
                        {patient.name}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{patient.age}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{patient.gender}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{patient.lastVisit}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{patient.condition}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-3 py-1 inline-flex text-xs leading-5 font-medium rounded-full ${
                        patient.status === "Completed"
                          ? theme === "light" ? "bg-green-100 text-green-800" : "bg-green-900 text-green-400"
                          : theme === "light" ? "bg-yellow-100 text-yellow-800" : "bg-yellow-900 text-yellow-400"
                      }`}
                    >
                      {patient.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
