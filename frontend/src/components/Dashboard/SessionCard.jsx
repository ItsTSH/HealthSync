export default function SessionCard({ name, time, type, duration }) {
  return (
    <div className="bg-blue-800 rounded-xl shadow-md p-4 text-white">
      <h3 className="text-lg font-semibold">{name}</h3>
      <p className="text-sm text-blue-300">Today • {time}</p>
      <p className="text-sm text-gray-400">{type} • Duration: {duration}</p>
    </div>
  );
}