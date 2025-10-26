// components/Layout/AuthLayout.jsx
import { ShieldCheck, Cpu, Clock, Activity } from "lucide-react";

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f9fafb] text-gray-800 px-4">
      <div className="flex w-full max-w-5xl rounded-2xl overflow-hidden shadow-lg border border-gray-200 bg-white">
        {/* Left Info Panel */}
        <div className="hidden md:flex w-1/2 flex-col justify-center items-center space-y-8 p-10 bg-[#f3f4f6] border-r border-gray-200">
          <div className="text-center max-w-sm space-y-4">
            <h1 className="text-3xl font-bold text-gray-800">HealthSync</h1>
            <p className="text-sm text-gray-600">
              Simplify your consultations with secure AI-assisted documentation.
            </p>
          </div>

          <ul className="space-y-3 text-gray-700 text-sm font-medium text-left">
            <li className="flex items-center space-x-2">
              <Cpu className="w-5 h-5 text-gray-500" />
              <span>AI-powered transcription</span>
            </li>
            <li className="flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-gray-500" />
              <span>Data security & HIPAA compliance</span>
            </li>
            <li className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-gray-500" />
              <span>Real-time summaries</span>
            </li>
            <li className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-gray-500" />
              <span>Patient-friendly workflow</span>
            </li>
          </ul>
        </div>

        {/* Right Panel */}
        <div className="w-full md:w-1/2 flex flex-col justify-center items-center p-10">
          {children}
        </div>
      </div>
    </div>
  );
}
