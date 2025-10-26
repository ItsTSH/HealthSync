import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Mail, Lock } from "lucide-react";
import InputField from "./InputField";
import Button from "./Button";
import { useAuth } from "../context/authContext";

export default function AuthForm() {
  const navigate = useNavigate();
  const { login } = useAuth();
 
  const [formData, setFormData] = useState({
    email_id: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError(""); // Clear error when user types
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await login(formData);
     
      if (rememberMe) {
        localStorage.setItem("remember_me", "true");
      }
     
      // Redirect to dashboard after successful login
      navigate("/dashboard");
     
    } catch (err) {
      setError(err.message || "Login Failed. Please Try Again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-6">
      <h2 className="text-2xl font-semibold text-gray-900 text-center">
        Log in to HealthSync
      </h2>
      
      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}
      
      <form className="space-y-4" onSubmit={handleSubmit}>
        <InputField
          label="Email Address"
          type="email"
          name="email_id"
          icon={<Mail className="w-5 h-5" />}
          value={formData.email_id}
          onChange={handleChange}
          required
        />
        
        <InputField
          label="Password"
          type="password"
          name="password"
          icon={<Lock className="w-5 h-5" />}
          value={formData.password}
          onChange={handleChange}
          required
        />
        
        <div className="flex items-center justify-between text-sm text-gray-600">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="mr-2 accent-gray-700 cursor-pointer"
            />
            Remember me
          </label>
          <Link to="/forgot-password" className="text-gray-700 hover:underline">
            Forgot password?
          </Link>
        </div>
        
        <Button
          text={loading ? "Signing in..." : "Sign In"}
          disabled={loading}
        />
      </form>
      
      <p className="text-sm text-gray-600 text-center">
        Don't have an account?{" "}
        <Link to="/register" className="text-gray-800 font-medium hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}