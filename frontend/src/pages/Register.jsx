import { User, Mail, Lock } from "lucide-react";
import InputField from "../components/InputField";
import Button from "../components/Button";
import AuthLayout from "../components/Layout/AuthLayout";
import AuthTabs from "../components/AuthTabs";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authAPI } from "../api/authService";

export default function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: "",
    email_id: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError("");
  };

  const handleRegister = async(e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try{
      const data = await authAPI.signup(formData);
      console.log("User registered:", data);
      // Redirect to login
      navigate("/");
    } catch(err){
      setError(err.message);
    }finally{
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <AuthTabs />
      <form
        className="space-y-4 w-full max-w-md p-8 rounded-2xl bg-transparent shadow-md border border-gray-200"
        onSubmit={handleRegister}
      >
        <h2 className="text-2xl font-semibold text-gray-900 text-center mb-6">
          Create your HealthSync Account
        </h2>
        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}
        <InputField 
          label="Username" 
          type="text" 
          name="username"
          icon={<User />} 
          value={formData.username} 
          onChange={handleChange} 
          required 
        />
        <InputField 
          label="Email Address" 
          type="email" 
          name="email_id"
          icon={<Mail />} 
          value={formData.email_id} 
          onChange={handleChange} 
          required
        />
        <InputField 
          label="Password" 
          type="password" 
          name="password"
          icon={<Lock />} 
          value={formData.password} 
          onChange={handleChange} 
          required
        />
        <Button 
          text={loading ? "Creating Account..." : "Create Account"} 
          disabled={loading} 
        />
      </form>
    </AuthLayout>
  );
}