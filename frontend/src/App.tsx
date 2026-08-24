import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { SparkJetWorkflow } from './pages/SparkJet/SparkJetWorkflow';
import { OmniaJetWorkflow } from './pages/OmniaJet/OmniaJetWorkflow';
import { Navbar } from './components/layout/Navbar';
import { AuthGuard } from './components/layout/AuthGuard';

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <main style={{ flex: 1 }}>{children}</main>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <AuthGuard>
              <AppLayout>
                <DashboardPage />
              </AppLayout>
            </AuthGuard>
          }
        />

        <Route
          path="/spark-jet"
          element={
            <AuthGuard>
              <AppLayout>
                <SparkJetWorkflow />
              </AppLayout>
            </AuthGuard>
          }
        />

        <Route
          path="/omnia-jet"
          element={
            <AuthGuard>
              <AppLayout>
                <OmniaJetWorkflow />
              </AppLayout>
            </AuthGuard>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
