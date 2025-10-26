import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function InputField({ label, type, icon }) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";

  return (
    <div className="flex flex-col space-y-1">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className="flex items-center border border-gray-300 rounded-lg px-3 py-2 bg-white focus-within:ring-1 focus-within:ring-gray-400">
        {icon && <span className="text-gray-400">{icon}</span>}

        <input
          type={isPassword ? (showPassword ? "text" : "password") : type}
          className="ml-2 w-full outline-none text-gray-900 text-sm bg-white"
          autoComplete="off"
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="text-gray-400 hover:text-gray-600 ml-2 focus:outline-none"
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
