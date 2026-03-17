import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import ReloadPrompt from './components/ReloadPrompt';
import ErrorBoundary from './components/ErrorBoundary';
import { TbLoaderQuarter } from 'react-icons/tb';

import NuevoRegistro from './pages/NuevoRegistro';
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Administracion = lazy(() => import('./pages/Administracion'));
const Estadisticas = lazy(() => import('./pages/Estadisticas'));

const PageLoader = () => (
  <div className="flex justify-center items-center py-20">
    <TbLoaderQuarter className="animate-spin text-blue-500 text-4xl" />
  </div>
);

function App() {
  return (
    <AuthProvider>
      <Router>
        {/* Fix 8: ErrorBoundary evita que un error en una página rompa toda la app */}
        <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Navigate to="/registrar" replace />} />
                <Route path="registrar" element={<NuevoRegistro />} />
                {/* Legacy redirects */}
                <Route path="ingreso" element={<Navigate to="/registrar" replace />} />
                <Route path="gasto" element={<Navigate to="/registrar" replace />} />

                {/* Protected Routes */}
                <Route path="dashboard" element={
                  <ProtectedRoute>
                    <ErrorBoundary>
                      <Dashboard />
                    </ErrorBoundary>
                  </ProtectedRoute>
                } />
                <Route path="admin" element={
                  <ProtectedRoute>
                    <ErrorBoundary>
                      <Administracion />
                    </ErrorBoundary>
                  </ProtectedRoute>
                } />
                <Route path="estadisticas" element={
                  <ProtectedRoute>
                    <ErrorBoundary>
                      <Estadisticas />
                    </ErrorBoundary>
                  </ProtectedRoute>
                } />
              </Route>
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </Router>
      <ReloadPrompt />
    </AuthProvider>
  );
}

export default App;
