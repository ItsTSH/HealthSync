import TopNav from '../Dashboard/TopNav';

export default function DashboardLayout({ children }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-800 via-blue-900 to-gray-950 text-white">
      <TopNav />
      <main className="p-8 max-w-7xl mx-auto">{children}</main>
    </div>
  );
}