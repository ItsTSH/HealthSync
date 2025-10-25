import { Link, useLocation } from 'react-router-dom';

export default function AuthTabs() {
  const { pathname } = useLocation();

  const isLogin = pathname === '/';
  const isRegister = pathname === '/register';

  return (
    <div className="flex space-x-6 mb-6 border-b pb-2">
      <Link
        to="/"
        className={`text-lg font-medium ${
          isLogin ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-blue-500'
        }`}
      >
        Sign In
      </Link>
      <Link
        to="/register"
        className={`text-lg font-medium ${
          isRegister ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-blue-500'
        }`}
      >
        Create Account
      </Link>
    </div>
  );
}