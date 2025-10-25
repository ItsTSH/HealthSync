import { NavLink } from 'react-router-dom';

export default function TopNav() {
  return (
    <nav className="flex justify-between items-center px-8 py-4 bg-blue-950 shadow-md text-white">
      <div className="flex items-center gap-3">
        <div className="bg-blue-600 text-white px-2 py-1 rounded font-bold text-lg">H+</div>
        <h1 className="text-xl font-semibold">HealthSync</h1>
      </div>
      <div className="flex space-x-8">
        {['Dashboard', 'Sessions', 'Analytics', 'Settings'].map((label) => (
          <NavLink
            key={label}
            to={`/${label.toLowerCase()}`}
            className={({ isActive }) =>
              `text-sm font-medium ${
                isActive ? 'text-blue-300 border-b-2 border-blue-300' : 'text-gray-400 hover:text-blue-300'
              }`
            }
          >
            {label}
          </NavLink>
        ))}
      </div>
      <div>
        <img
          src="/doctor-icon.png"
          alt="Doctor Profile"
          className="w-10 h-10 rounded-full object-cover"
        />
      </div>
    </nav>
  );
}