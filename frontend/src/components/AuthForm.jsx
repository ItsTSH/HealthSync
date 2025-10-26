import { Mail, Lock } from "lucide-react";
import InputField from "./InputField";
import Button from "./Button";
import { Link } from "react-router-dom";

export default function AuthForm() {
  const handleSubmit = (e) => {
    e.preventDefault();
  };

  return (
    <div className="w-full max-w-md p-8 rounded-2xl bg-white shadow-md border border-gray-200">
      <h2 className="text-2xl font-semibold text-gray-900 mb-6 text-center">
        Sign in to HealthSync
      </h2>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <InputField label="Email Address" type="email" icon={<Mail />} />
        <InputField label="Password" type="password" icon={<Lock />} />

        <div className="flex items-center justify-between text-sm text-gray-600">
          <label className="flex items-center">
            <input type="checkbox" className="mr-2 accent-gray-700" />
            Remember me
          </label>
          <Link to="#" className="text-gray-700 hover:underline">
            Forgot password?
          </Link>
        </div>

        <Button text="Sign In" />
      </form>

      <p className="mt-6 text-sm text-gray-600 text-center">
        Don’t have an account?{" "}
        <Link to="/register" className="text-gray-800 font-medium hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
