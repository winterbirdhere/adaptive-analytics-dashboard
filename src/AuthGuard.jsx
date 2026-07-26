import { Navigate, Outlet } from 'react-router-dom';
import { isAuthenticated } from './auth';

export default function AuthGuard() {
  if (!isAuthenticated()) {
    return <Navigate to="/sign-in" replace />;
  }
  return <Outlet />;
}
