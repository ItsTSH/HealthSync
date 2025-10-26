import { User, Mail, Lock } from "lucide-react";
import InputField from "../components/InputField";
import Button from "../components/Button";
import AuthLayout from "../components/Layout/AuthLayout";
import AuthTabs from "../components/AuthTabs";

export default function Register() {
  const handleRegister = (e) => {
    e.preventDefault();
  };

  return (
    <AuthLayout>
      <AuthTabs />
      <form
        className="space-y-4 w-full max-w-md p-8 rounded-2xl bg-white shadow-md border border-gray-200"
        onSubmit={handleRegister}
      >
        <h2 className="text-2xl font-semibold text-gray-900 text-center mb-6">
          Create your HealthSync Account
        </h2>
        <InputField label="Username" type="text" icon={<User />} />
        <InputField label="Email Address" type="email" icon={<Mail />} />
        <InputField label="Password" type="password" icon={<Lock />} />
        <Button text="Create Account" />
      </form>
    </AuthLayout>
  );
}
