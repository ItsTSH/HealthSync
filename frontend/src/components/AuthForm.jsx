import InputField from './InputField';
import Button from './Button';
import { Link } from 'react-router-dom';

export default function AuthForm() {
  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: Add login logic here
    console.log('Login submitted');
  };

  return (
    <div className="w-full max-w-md">
      <h2 className="text-2xl font-semibold mb-6">Sign in to your account</h2>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <InputField label="Email Address" type="email" />
        <InputField label="Password" type="password" />
        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center">
            <input type="checkbox" className="mr-2" />
            Remember me
          </label>
          <Link to="#" className="text-blue-600 hover:underline">Forgot password?</Link>
        </div>
        <Button text="Sign In" />
      </form>
      <p className="mt-6 text-sm text-gray-600 text-center">
        Don’t have an account? <Link to="/register" className="text-blue-600 hover:underline">Create one</Link>
      </p>
      <p className="mt-2 text-xs text-gray-400 text-center">
        By signing in, you agree to our <Link to="#" className="underline">Terms of Service</Link> and <Link to="#" className="underline">Privacy Policy</Link>.
      </p>
    </div>
  );
}