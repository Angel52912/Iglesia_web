import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthProvider';
import { ProtectedRoute } from '../auth/ProtectedRoute';
import { AttendancePage } from '../features/attendance/AttendancePage';
import { DonationsPage } from '../features/donations/DonationsPage';
import { EventsPage } from '../features/events/EventsPage';
import { MinistriesPage } from '../features/ministries/MinistriesPage';
import { MembersPage } from '../features/members/MembersPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { UsersPage } from '../features/users/UsersPage';
import { ForgotPasswordPage } from '../pages/ForgotPasswordPage';
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/LoginPage';
import { ResetPasswordPage } from '../pages/ResetPasswordPage';

export function App(): React.JSX.Element {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/recuperar" element={<ForgotPasswordPage />} />
          <Route path="/restablecer" element={<ResetPasswordPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/usuarios"
            element={
              <ProtectedRoute roles={['admin']}>
                <UsersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/miembros"
            element={
              <ProtectedRoute roles={['admin', 'pastor', 'secretary']}>
                <MembersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/eventos"
            element={
              <ProtectedRoute roles={['admin', 'pastor', 'secretary', 'treasurer']}>
                <EventsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/asistencia"
            element={
              <ProtectedRoute roles={['admin', 'pastor', 'secretary']}>
                <AttendancePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ministerios"
            element={
              <ProtectedRoute roles={['admin', 'pastor', 'secretary']}>
                <MinistriesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/donaciones"
            element={
              <ProtectedRoute roles={['admin', 'pastor', 'treasurer']}>
                <DonationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/configuracion"
            element={
              <ProtectedRoute roles={['admin']}>
                <SettingsPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
