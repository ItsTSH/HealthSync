import DashboardLayout from '../components/Layout/DashboardLayout';
import MetricsCard from '../components/Dashboard/MetricsCard';
import SessionCard from '../components/Dashboard/SessionCard';
import QuickActions from '../components/Dashboard/QuickActions';

export default function Dashboard() {
  const metrics = [
    { title: "Today's Sessions", value: 12, change: -21, icon: '📅' },
    { title: 'Completed Notes', value: 8, change: 15, icon: '✅' },
    { title: 'Time Saved Today', value: '2.4h', change: 18, icon: '⚡' },
    { title: 'Pending Reviews', value: 4, change: 8, icon: '👁️' },
  ];

  const sessions = [
    { name: 'John Martinez', time: '10:00 AM', type: 'Annual Checkup', duration: '30 min' },
    { name: 'Emily Chan', time: '11:00 AM', type: 'Follow-up Visit', duration: '25 min' },
    { name: 'Michael Brown', time: '1:00 PM', type: 'Consultation', duration: '20 min' },
    { name: 'Lisa Anderson', time: '2:30 PM', type: 'Initial Assessment', duration: '45 min' },
    { name: 'David Kim', time: '4:00 PM', type: 'Routine Check', duration: '30 min' },
  ];

  return (
    <DashboardLayout>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {metrics.map((m, i) => (
          <MetricsCard key={i} {...m} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <h3 className="text-xl font-semibold mb-6 text-blue-300">Recent Sessions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {sessions.map((s, i) => (
              <SessionCard key={i} {...s} />
            ))}
          </div>
        </div>
        <QuickActions />
      </div>
    </DashboardLayout>
  );
}