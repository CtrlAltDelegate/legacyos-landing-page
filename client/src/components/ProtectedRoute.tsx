import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import Spinner from './Spinner';

export default function ProtectedRoute() {
  const { user, isInitialized } = useAuthStore();

  if (!isInitialized) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect un-onboarded users to onboarding (except if already there)
  if (!user.onboardingComplete) {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
}
