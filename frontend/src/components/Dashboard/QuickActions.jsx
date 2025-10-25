const actions = [
  { label: 'Start New Recording', icon: '🎙️', primary: true },
  { label: 'Review Pending Notes', icon: '📝' },
  { label: 'View Full Analytics', icon: '📊' },
  { label: 'Export Reports', icon: '📤' },
  { label: 'Settings & Preferences', icon: '⚙️' },
];

export default function QuickActions() {
  return (
    <div className="bg-blue-800 rounded-xl shadow-lg p-6 text-white">
      <h3 className="text-lg font-semibold mb-4 text-blue-300">Quick Actions</h3>
      <div className="space-y-4">
        {actions.map(({ label, icon, primary }, i) => (
          <button
            key={i}
            className={`w-full flex items-center gap-2 px-4 py-2 rounded-md font-medium transition ${
              primary
                ? 'bg-blue-600 hover:bg-blue-500'
                : 'bg-blue-900 hover:bg-blue-800'
            }`}
          >
            <span className="text-xl">{icon}</span>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}