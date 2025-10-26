import React, { useState, useEffect } from "react";
import {
  Calendar,
  FileCheck,
  Clock,
  AlertCircle,
  User,
  Video,
  Plus,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import Sessions from "./session";
import Navbar from "../components/navbar";
import Analytics from "./analytics";
import Settings from "./Settings";
import Logo from "../components/logo.png";
import CalendarPage from "../components/calendar";
import { getAllRecords } from "../api/recordsFetch";

// ---------- Metric Card ----------
function MetricCard({ title, value, change, icon: Icon, theme }) {
  const isPositive = change > 0;
  return (
    <div
      className={`p-6 rounded-lg border hover:shadow-md transition-shadow ${
        theme === "light"
          ? "bg-white border-gray-200"
          : "bg-black border-gray-800"
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p
            className={`text-sm mb-1 ${
              theme === "light" ? "text-gray-500" : "text-gray-400"
            }`}
          >
            {title}
          </p>
          <p
            className={`text-3xl font-semibold ${
              theme === "light" ? "text-gray-900" : "text-white"
            }`}
          >
            {value}
          </p>
        </div>
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            theme === "light" ? "bg-gray-100" : "bg-gray-900"
          }`}
        >
          <Icon
            className={`w-5 h-5 ${
              theme === "light" ? "text-gray-600" : "text-gray-300"
            }`}
          />
        </div>
      </div>
      <div className="mt-3 flex items-center">
        <span
          className={`text-sm font-medium ${
            isPositive
              ? theme === "light"
                ? "text-green-600"
                : "text-green-400"
              : theme === "light"
              ? "text-red-600"
              : "text-red-400"
          }`}
        >
          {isPositive ? "+" : ""}
        </span>
        <span
          className={`text-xs ml-2 ${
            theme === "light" ? "text-gray-400" : "text-gray-500"
          }`}
        >
        </span>
      </div>
    </div>
  );
}

// ---------- Session Item ----------
function SessionItem({ name, complaint, date, theme }) {
  const formatDate = (dateString) => {
    if (!dateString) return "—";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return "—";
    }
  };

  return (
    <div
      className={`flex items-center justify-between p-4 border-b transition-colors ${
        theme === "light"
          ? "bg-white border-gray-100 hover:bg-gray-50"
          : "bg-black border-gray-800 hover:bg-gray-900"
      }`}
    >
      <div className="flex items-center space-x-4 flex-1">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
            theme === "light" ? "bg-gray-200" : "bg-gray-900"
          }`}
        >
          <User
            className={`w-5 h-5 ${
              theme === "light" ? "text-gray-600" : "text-gray-300"
            }`}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p
            className={`font-medium truncate ${
              theme === "light" ? "text-gray-900" : "text-white"
            }`}
          >
            {name || "Unknown Patient"}
          </p>
          <p
            className={`text-sm truncate ${
              theme === "light" ? "text-gray-500" : "text-gray-400"
            }`}
          >
            {complaint || "No complaint recorded"}
          </p>
        </div>
      </div>
      <div className="ml-4 flex-shrink-0">
        <p
          className={`text-xs ${
            theme === "light" ? "text-gray-400" : "text-gray-500"
          }`}
        >
          {formatDate(date)}
        </p>
      </div>
    </div>
  );
}

// ---------- Quick Action Button ----------
function ActionButton({ icon: Icon, label, theme, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center space-x-3 w-full p-4 border rounded-lg hover:shadow-sm transition-all ${
        theme === "light"
          ? "bg-white border-gray-200 hover:border-gray-300"
          : "bg-black border-gray-800 hover:border-gray-700"
      }`}
    >
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
          theme === "light" ? "bg-gray-900" : "bg-gray-800"
        }`}
      >
        <Icon className="w-5 h-5 text-white" />
      </div>
      <span
        className={`font-medium ${
          theme === "light" ? "text-gray-900" : "text-white"
        }`}
      >
        {label}
      </span>
    </button>
  );
}

// ---------- Main Dashboard ----------
export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [theme, setTheme] = useState("light");
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const toggleTheme = () => setTheme(theme === "light" ? "dark" : "light");

  // Fetch patient records for Recent Sessions
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const token = localStorage.getItem("accessToken");
        
        // if (!token) {
        //   console.error("No access token found");
        //   setError("Authentication required");
        //   setLoading(false);
        //   return;
        // }

        const data = await getAllRecords(token);
        console.log("Fetched records:", data); // Debug log
        
        // Handle different possible response structures
        if (Array.isArray(data)) {
          setRecords(data);
        } else if (data && Array.isArray(data.records)) {
          setRecords(data.records);
        } else if (data && Array.isArray(data.data)) {
          setRecords(data.data);
        } else {
          console.warn("Unexpected data structure:", data);
          setRecords([]);
        }
      } catch (error) {
        console.error("Error fetching records:", error);
        setError("Failed to load records");
        setRecords([]);
      } finally {
        setLoading(false);
      }
    };
    
    if (activeTab === "dashboard") {
      fetchData();
    }
  }, [activeTab]);

  // Calculate dynamic metrics from records
  const getTodaySessionsCount = () => {
    const today = new Date().toDateString();
    return records.filter(r => {
      if (!r.created_at && !r.createdAt && !r.date) return false;
      const recordDate = new Date(r.created_at || r.createdAt || r.date);
      return recordDate.toDateString() === today;
    }).length;
  };

  const metrics = [
    { title: "Today's Sessions", value: getTodaySessionsCount(), icon: Calendar },
    { title: "Total Records", value: records.length, icon: FileCheck },
    { title: "Time Saved Today", value: "18 mins", icon: Clock },
    { title: "Pending Reviews", value: 0, icon: AlertCircle },
  ];

  return (
    <div
      className={`${
        theme === "light"
          ? "bg-gray-50 text-gray-900"
          : "bg-[#030712] text-gray-100"
      } min-h-screen transition-colors`}
    >
      {/* Header */}
      <header
        className={`${
          theme === "light"
            ? "bg-white border-gray-200"
            : "bg-[#030712] border-gray-700"
        } border-b`}
      >
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-6">
            <img src={Logo} alt="Logo" className="w-40 h-auto" />
          </div>

          <Navbar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            theme={theme}
            toggleTheme={toggleTheme}
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {activeTab === "dashboard" && (
          <>
            {/* Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {metrics.map((m, i) => (
                <MetricCard key={i} {...m} theme={theme} />
              ))}
            </div>

            {/* Bottom Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Recent Sessions (dynamic) */}
              <div className="lg:col-span-2">
                <div
                  className={`${
                    theme === "light"
                      ? "bg-white border-gray-200"
                      : "bg-[#0b0f1a] border-gray-700"
                  } rounded-lg border overflow-hidden`}
                >
                  <div
                    className={`px-6 py-4 border-b ${
                      theme === "light" ? "border-gray-200" : "border-gray-700"
                    }`}
                  >
                    <h2 className="text-lg font-semibold">Recent Sessions</h2>
                  </div>
                  <div>
                    {loading ? (
                      <div className="p-6 text-center">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                        <p className={`mt-2 text-sm ${
                          theme === "light" ? "text-gray-500" : "text-gray-400"
                        }`}>
                          Loading sessions...
                        </p>
                      </div>
                    ) : error ? (
                      <div className="p-6 text-center">
                        <AlertCircle className={`mx-auto h-8 w-8 mb-2 ${
                          theme === "light" ? "text-red-500" : "text-red-400"
                        }`} />
                        <p className={`text-sm ${
                          theme === "light" ? "text-red-600" : "text-red-400"
                        }`}>
                          {error}
                        </p>
                      </div>
                    ) : records.length > 0 ? (
                      records
                        .slice(0, 5) // Show top 5
                        .map((record, i) => (
                          <SessionItem
                            key={record.id || i}
                            name={record.patient_name || record.patientName}
                            complaint={record.chief_complaint || record.chiefComplaint}
                            date={record.created_at || record.createdAt || record.date}
                            theme={theme}
                          />
                        ))
                    ) : (
                      <div className="p-6 text-center">
                        <FileCheck className={`mx-auto h-8 w-8 mb-2 ${
                          theme === "light" ? "text-gray-400" : "text-gray-600"
                        }`} />
                        <p
                          className={`text-sm ${
                            theme === "light"
                              ? "text-gray-500"
                              : "text-gray-400"
                          }`}
                        >
                          No recent sessions found. Start recording to see sessions here.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div>
                <div
                  className={`${
                    theme === "light"
                      ? "bg-white border-gray-200"
                      : "bg-[#0b0f1a] border-gray-700"
                  } rounded-lg border p-6 space-y-3`}
                >
                  <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
                  <ActionButton
                    icon={Plus}
                    label="Start New Session"
                    theme={theme}
                    onClick={() => navigate("/sessions?new=true")}
                  />
                  <ActionButton
                    icon={FileCheck}
                    label="Review Notes"
                    theme={theme}
                    onClick={() => setActiveTab("sessions")}
                  />
                  <ActionButton 
                    icon={Video} 
                    label="Schedule Meeting" 
                    theme={theme}
                    onClick={() => alert("Meeting scheduling coming soon!")}
                  />
                  <ActionButton
                    icon={Calendar}
                    label="View Calendar"
                    theme={theme}
                    onClick={() => setActiveTab("calendar")}
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === "calendar" && <CalendarPage theme={theme} />}
        {activeTab === "sessions" && <Sessions theme={theme} />}
        {activeTab === "analytics" && <Analytics theme={theme} />}
        {activeTab === "settings" && <Settings theme={theme} />}
      </main>
    </div>
  );
}