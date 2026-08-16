import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import type { LatticeUser } from './lib/api';
import { ThemeProvider } from './lib/theme';
import { AppToaster } from './components/AppToaster';
import { AppShell } from './components/AppShell';
import { LoginPage } from './pages/LoginPage';
import { OverviewPage } from './pages/OverviewPage';
import { RfqPage } from './pages/RfqPage';
import { OrdersPage } from './pages/OrdersPage';
import { PortfolioPage } from './pages/PortfolioPage';
import { MarketDataPage } from './pages/MarketDataPage';
import { AuditPage } from './pages/AuditPage';
import { DealerPage } from './pages/DealerPage';
import { PipelinePage } from './pages/PipelinePage';

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-full grid place-items-center text-[var(--color-muted)]">Loading terminal…</div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function RoleGate({
  allow,
  children,
}: {
  allow: Array<LatticeUser['role']>;
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  if (!user || !allow.includes(user.role)) {
    return <Navigate to="/pipeline" replace />;
  }
  return children;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppToaster />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <Protected>
                <AppShell />
              </Protected>
            }
          >
            <Route index element={<Navigate to="/pipeline" replace />} />
            <Route path="pipeline" element={<PipelinePage />} />
            <Route path="overview" element={<OverviewPage />} />
            <Route
              path="rfq"
              element={
                <RoleGate allow={['buyer', 'admin']}>
                  <RfqPage />
                </RoleGate>
              }
            />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="portfolio" element={<PortfolioPage />} />
            <Route path="market-data" element={<MarketDataPage />} />
            <Route path="audit" element={<AuditPage />} />
            <Route
              path="dealer"
              element={
                <RoleGate allow={['provider_dealer', 'admin']}>
                  <DealerPage />
                </RoleGate>
              }
            />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
}
