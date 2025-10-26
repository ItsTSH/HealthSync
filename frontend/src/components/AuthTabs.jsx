import { Link, useLocation } from "react-router-dom";

export default function AuthTabs() {
  const { pathname } = useLocation();
  const isLogin = pathname === "/";
  const isRegister = pathname === "/register";

  return (
    <div className="flex space-x-8 mb-8 border-b border-gray-300 pb-2 justify-center">
      <Link
        to="/"
        className={`text-lg font-medium transition-all ${
          isLogin
            ? "text-gray-900 border-b-2 border-gray-700"
            : "text-gray-500 hover:text-gray-800"
        }`}
      >
        Log In
      </Link>
      <Link
        to="/register"
        className={`text-lg font-medium transition-all ${
          isRegister
            ? "text-gray-900 border-b-2 border-gray-700"
            : "text-gray-500 hover:text-gray-800"
        }`}
      >
        Create Account
      </Link>
    </div>
  );
}
