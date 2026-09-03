// ============================================================
// App.tsx — Router & Main Application Entry
// ============================================================

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { FarmerDashboardPage } from './pages/FarmerDashboardPage';
import { ReportIncidentPage } from './pages/ReportIncidentPage';
import { CasesPage } from './pages/CasesPage';
import { CaseDetailPage } from './pages/CaseDetailPage';
import { VetConsolePage } from './pages/VetConsolePage';
import { LabTrackerPage } from './pages/LabTrackerPage';
import { OutbreakMapPage } from './pages/OutbreakMapPage';
import { AlertsPage } from './pages/AlertsPage';
import { AdminPage } from './pages/AdminPage';
import { VaccinationPage } from './pages/VaccinationPage';
import { useAuthStore } from './store/authStore';

// Protected Route Guard
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

// Role-Aware Dashboard Router
function RoleBasedDashboard() {
  const { currentUser } = useAuthStore();

  if (currentUser?.role === 'farmer') {
    return <FarmerDashboardPage />;
  }

  return <DashboardPage />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Login Route */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected App Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<RoleBasedDashboard />} />
          <Route path="report" element={<ReportIncidentPage />} />
          <Route path="cases" element={<CasesPage />} />
          <Route path="cases/:id" element={<CaseDetailPage />} />
          <Route path="vet-console" element={<VetConsolePage />} />
          <Route path="lab-tracker" element={<LabTrackerPage />} />
          <Route path="map" element={<OutbreakMapPage />} />
          <Route path="alerts" element={<AlertsPage />} />
          <Route path="admin" element={<AdminPage />} />
          <Route path="vaccination" element={<VaccinationPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
