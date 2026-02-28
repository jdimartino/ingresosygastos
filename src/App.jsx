import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import ReloadPrompt from './components/ReloadPrompt';
import { TbLoaderQuarter } from 'react-icons/tb';

// Fix #6: Code splitting with React.lazy so Dashboard & Administracion are NOT bundled
// into the initial JS load. Users who only fill in forms never download this code.
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
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="admin" element={
                <ProtectedRoute>
                  <Administracion />
                </ProtectedRoute>
              } />
              <Route path="estadisticas" element={
                <ProtectedRoute>
                  <Estadisticas />
                </ProtectedRoute>
              } />
            </Route>
          </Routes>
        </Suspense>
      </Router>
      <ReloadPrompt />
    </AuthProvider>
  );
}

export default App;
