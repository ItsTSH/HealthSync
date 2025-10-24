import InputField from '../components/InputField';
import Button from '../components/Button';
import AuthLayout from '../components/Layout/AuthLayout';
import AuthTabs from '../components/AuthTabs';

export default function Register() {
  const handleRegister = (e) => {
    e.preventDefault();
    console.log('Register submitted');
  };

  return (
    <AuthLayout>
      <AuthTabs />
      <form className="space-y-4 w-full max-w-md" onSubmit={handleRegister}>
        <InputField label="Full Name" type="text" />
        <InputField label="Email Address" type="email" />
        <InputField label="Password" type="password" />
        <Button text="Create Account" />
        <p className="mt-4 text-xs text-gray-400 text-center">
          By continuing, you agree to our <a href="#" className="underline">Terms of Service</a> & <a href="#" className="underline">Privacy Policy</a>.
        </p>
      </form>
    </AuthLayout>
  );
}