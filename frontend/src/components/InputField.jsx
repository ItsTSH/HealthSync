import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function InputField({
  label,
  type,
  icon,
  name,
  value,
  onChange,
  required,
  placeholder
}) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
 
  return (
    <div className="flex flex-col space-y-1">
      <label htmlFor={name} className="text-sm font-medium text-gray-700">
        {label}
      </label>
      <div className="flex items-center border border-gray-300 rounded-lg px-3 py-2 bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition">
        {icon && <span className="text-gray-400 flex-shrink-0">{icon}</span>}
        <input
          id={name}
          name={name}
          type={isPassword ? (showPassword ? "text" : "password") : type}
          value={value || ""}
          onChange={onChange}
          required={required}
          placeholder={placeholder || label}
          className="ml-2 w-full outline-none text-gray-900 text-sm bg-transparent placeholder:text-gray-400"
          style={{ color: '#111827' }}
          autoComplete={type === "password" ? "current-password" : type === "email" ? "email" : "off"}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="text-gray-400 hover:text-gray-600 ml-2 focus:outline-none flex-shrink-0 transition"
            aria-label={showPassword ? "Hide password" : "Show password"}
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