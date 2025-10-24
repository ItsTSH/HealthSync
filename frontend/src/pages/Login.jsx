import AuthLayout from '../components/Layout/AuthLayout';
import AuthForm from '../components/AuthForm';
import AuthTabs from '../components/AuthTabs';

export default function Login() {
  return (
    <AuthLayout>
      <AuthTabs />
      <AuthForm />
    </AuthLayout>
  );
}