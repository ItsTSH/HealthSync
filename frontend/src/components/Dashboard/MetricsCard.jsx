export default function MetricsCard({ title, value, change, icon }) {
  return (
    <div className="bg-blue-800 rounded-xl shadow-lg p-4 w-full text-white">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-medium text-blue-300">{title}</h3>
        <span className="text-xl">{icon}</span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-2xl font-bold">{value}</span>
        <span className={`text-sm font-semibold ${change < 0 ? 'text-red-400' : 'text-green-400'}`}>
          {change < 0 ? `↓ ${Math.abs(change)}%` : `↑ ${change}%`}
        </span>
      </div>
    </div>
  );
}