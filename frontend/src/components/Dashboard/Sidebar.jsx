export default function Sidebar() {
  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col">
      <div className="p-6 space-y-6 text-sm font-medium">
        <div className="text-blue-400 font-semibold">Dashboard</div>
        <div className="hover:text-blue-300 cursor-pointer">Sessions</div>
        <div className="hover:text-blue-300 cursor-pointer">Analytics</div>
        <div className="hover:text-blue-300 cursor-pointer">Settings</div>
      </div>
    </aside>
  );
}