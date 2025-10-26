import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Clock, User } from 'lucide-react';

export default function CalendarPage({ theme = "light" }) {
  const [currentDate, setCurrentDate] = useState(new Date(2025, 9, 26)); // October 26, 2025
  const [selectedDate, setSelectedDate] = useState(26);

  // Get days in month
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return { firstDay, daysInMonth };
  };

  const { firstDay, daysInMonth } = getDaysInMonth(currentDate);
  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Navigate months
  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  // Sample events for specific dates
  const events = {
    25: [
      { time: '10:00 AM', title: 'John Martinez - Annual Checkup', duration: '30 min', type: 'checkup' },
      { time: '2:00 PM', title: 'Emily Chan - Follow-up', duration: '25 min', type: 'followup' }
    ],
    26: [
      { time: '9:00 AM', title: 'Michael Brown - Consultation', duration: '45 min', type: 'consultation' },
      { time: '11:30 AM', title: 'Sarah Johnson - Initial Assessment', duration: '30 min', type: 'assessment' },
      { time: '3:00 PM', title: 'David Kim - Routine Check', duration: '20 min', type: 'checkup' }
    ],
    27: [
      { time: '10:00 AM', title: 'Lisa Anderson - Follow-up Visit', duration: '25 min', type: 'followup' },
      { time: '1:00 PM', title: 'Robert Lee - Physical Exam', duration: '40 min', type: 'exam' }
    ],
    30: [
      { time: '9:30 AM', title: 'Maria Garcia - Consultation', duration: '30 min', type: 'consultation' }
    ]
  };

  // Render calendar days
  const renderCalendarDays = () => {
    const days = [];
    
    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(
        <div key={`empty-${i}`} className="p-2 min-h-[80px]"></div>
      );
    }

    // Actual days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const hasEvents = events[day];
      const isSelected = day === selectedDate;
      const isToday = day === 26; // Current day

      days.push(
        <div
          key={day}
          onClick={() => setSelectedDate(day)}
          className={`p-2 min-h-[80px] border cursor-pointer transition-all ${
            theme === "light"
              ? `border-gray-200 hover:bg-gray-50 ${isSelected ? 'bg-blue-50 border-blue-300' : ''}`
              : `border-gray-800 hover:bg-gray-900 ${isSelected ? 'bg-gray-800 border-gray-700' : ''}`
          }`}
        >
          <div className="flex justify-between items-start mb-1">
            <span className={`text-sm font-medium ${
              isToday 
                ? theme === "light" ? 'bg-blue-500 text-white px-2 py-1 rounded-full' : 'bg-blue-600 text-white px-2 py-1 rounded-full'
                : theme === "light" ? 'text-gray-700' : 'text-gray-300'
            }`}>
              {day}
            </span>
            {hasEvents && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                theme === "light" 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'bg-blue-900 text-blue-300'
              }`}>
                {hasEvents.length}
              </span>
            )}
          </div>
          {hasEvents && (
            <div className="space-y-1">
              {hasEvents.slice(0, 2).map((event, i) => (
                <div
                  key={i}
                  className={`text-xs p-1 rounded truncate ${
                    theme === "light"
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-blue-900 text-blue-200'
                  }`}
                >
                  {event.time}
                </div>
              ))}
              {hasEvents.length > 2 && (
                <div className={`text-xs ${theme === "light" ? 'text-gray-500' : 'text-gray-400'}`}>
                  +{hasEvents.length - 2} more
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    return days;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Calendar Grid */}
      <div className="lg:col-span-2">
        <div className={`rounded-lg border ${
          theme === "light"
            ? "bg-white border-gray-200"
            : "bg-black border-gray-800"
        }`}>
          {/* Calendar Header */}
          <div className={`px-6 py-4 border-b flex items-center justify-between ${
            theme === "light" ? "border-gray-200" : "border-gray-800"
          }`}>
            <h2 className={`text-xl font-semibold ${
              theme === "light" ? "text-gray-900" : "text-white"
            }`}>
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={previousMonth}
                className={`p-2 rounded-lg transition-colors ${
                  theme === "light"
                    ? "hover:bg-gray-100"
                    : "hover:bg-gray-900"
                }`}
              >
                <ChevronLeft className={`w-5 h-5 ${
                  theme === "light" ? "text-gray-600" : "text-gray-300"
                }`} />
              </button>
              <button
                onClick={nextMonth}
                className={`p-2 rounded-lg transition-colors ${
                  theme === "light"
                    ? "hover:bg-gray-100"
                    : "hover:bg-gray-900"
                }`}
              >
                <ChevronRight className={`w-5 h-5 ${
                  theme === "light" ? "text-gray-600" : "text-gray-300"
                }`} />
              </button>
            </div>
          </div>

          {/* Day Names */}
          <div className={`grid grid-cols-7 border-b ${
            theme === "light" ? "bg-gray-50 border-gray-200" : "bg-gray-900 border-gray-800"
          }`}>
            {dayNames.map(day => (
              <div
                key={day}
                className={`p-3 text-center text-sm font-medium ${
                  theme === "light" ? "text-gray-600" : "text-gray-400"
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days Grid */}
          <div className="grid grid-cols-7">
            {renderCalendarDays()}
          </div>
        </div>
      </div>

      {/* Events Sidebar */}
      <div className="space-y-6">
        {/* Selected Date Events */}
        <div className={`rounded-lg border ${
          theme === "light"
            ? "bg-white border-gray-200"
            : "bg-black border-gray-800"
        }`}>
          <div className={`px-6 py-4 border-b ${
            theme === "light" ? "border-gray-200" : "border-gray-800"
          }`}>
            <h3 className={`text-lg font-semibold ${
              theme === "light" ? "text-gray-900" : "text-white"
            }`}>
              {monthNames[currentDate.getMonth()]} {selectedDate}
            </h3>
            <p className={`text-sm ${
              theme === "light" ? "text-gray-500" : "text-gray-400"
            }`}>
              {events[selectedDate]?.length || 0} appointments
            </p>
          </div>
          <div className="p-4 space-y-3">
            {events[selectedDate] ? (
              events[selectedDate].map((event, i) => (
                <div
                  key={i}
                  className={`p-4 rounded-lg border ${
                    theme === "light"
                      ? "bg-gray-50 border-gray-200"
                      : "bg-gray-900 border-gray-800"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Clock className={`w-4 h-4 ${
                        theme === "light" ? "text-gray-500" : "text-gray-400"
                      }`} />
                      <span className={`text-sm font-medium ${
                        theme === "light" ? "text-gray-900" : "text-white"
                      }`}>
                        {event.time}
                      </span>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${
                      theme === "light"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-blue-900 text-blue-300"
                    }`}>
                      {event.duration}
                    </span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <User className={`w-4 h-4 mt-0.5 ${
                      theme === "light" ? "text-gray-500" : "text-gray-400"
                    }`} />
                    <p className={`text-sm ${
                      theme === "light" ? "text-gray-700" : "text-gray-300"
                    }`}>
                      {event.title}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className={`text-center py-8 text-sm ${
                theme === "light" ? "text-gray-500" : "text-gray-400"
              }`}>
                No appointments scheduled
              </p>
            )}
          </div>
        </div>

        {/* Add Event Button */}
        <button className={`w-full py-3 rounded-lg transition-colors flex items-center justify-center space-x-2 ${
          theme === "light"
            ? "bg-gray-900 text-white hover:bg-gray-800"
            : "bg-gray-800 text-white hover:bg-gray-700"
        }`}>
          <Plus className="w-5 h-5" />
          <span className="font-medium">New Appointment</span>
        </button>
      </div>
    </div>
  );
}