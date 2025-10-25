import DashboardLayout from '../components/Layout/DashboardLayout';

export default function Sessions() {
  const sessions = [
    { name: 'John Martinez', time: 'Oct 24 • 10:00 AM', type: 'Annual Checkup', duration: '30 min' },
    { name: 'Emily Chan', time: 'Oct 24 • 11:00 AM', type: 'Follow-up Visit', duration: '25 min' },
    { name: 'Michael Brown', time: 'Oct 24 • 1:00 PM', type: 'Consultation', duration: '20 min' },
    { name: 'Lisa Anderson', time: 'Oct 24 • 2:30 PM', type: 'Initial Assessment', duration: '45 min' },
    { name: 'David Kim', time: 'Oct 24 • 4:00 PM', type: 'Routine Check', duration: '30 min' },
    { name: 'Anthony Lee', time: 'Oct 23 • 3:00 PM', type: 'Initial Assessment', duration: '60 min' },
  ];

  return (
    <DashboardLayout>
      <h2 className="text-2xl font-bold mb-6 text-blue-300">All Sessions</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sessions.map((s, i) => (
          <div key={i} className="bg-blue-800 rounded-xl shadow-md p-4 text-white">
            <h3 className="text-lg font-semibold">{s.name}</h3>
            <p className="text-sm text-blue-300">{s.time}</p>
            <p className="text-sm text-gray-400">{s.type} • Duration: {s.duration}</p>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}