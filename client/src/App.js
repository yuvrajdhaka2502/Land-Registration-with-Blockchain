import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Web3Provider, useWeb3 } from './contexts/Web3Context';

import Home                  from './pages/Home';
import RegisterUser          from './pages/RegisterUser';
import SellerDashboard       from './pages/SellerDashboard';
import BuyerDashboard        from './pages/BuyerDashboard';
import PatwariDashboard      from './pages/PatwariDashboard';
import SurveyDashboard       from './pages/SurveyDashboard';
import SubRegistrarDashboard from './pages/SubRegistrarDashboard';
import PublicLandSearch      from './pages/PublicLandSearch';
import ToolsPage             from './pages/ToolsPage';

// Role-based protected route
function ProtectedRoute({ children, allowedRoles }) {
  const { account, currentUser, isLoading } = useWeb3();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!account) return <Navigate to="/" replace />;
  if (!currentUser?.isRegistered) return <Navigate to="/register" replace />;

  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

// Role → dashboard path mapping
// Role enum: 0=None, 1=Seller, 2=Buyer, 3=Patwari, 4=SurveyOfficer, 5=SubRegistrar
const ROLE_DASHBOARD = {
  1: '/seller',
  2: '/buyer',
  3: '/patwari',
  4: '/survey',
  5: '/sub-registrar',
};

function AppRoutes() {
  const { account, currentUser, isLoading } = useWeb3();

  const dashboardPath = currentUser?.isRegistered
    ? ROLE_DASHBOARD[currentUser.role] || '/'
    : '/register';

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route
        path="/register"
        element={
          account && !isLoading && currentUser?.isRegistered
            ? <Navigate to={dashboardPath} replace />
            : <RegisterUser />
        }
      />

      {/* Role-specific dashboards */}
      <Route path="/seller" element={
        <ProtectedRoute allowedRoles={[1]}><SellerDashboard /></ProtectedRoute>
      } />
      <Route path="/buyer" element={
        <ProtectedRoute allowedRoles={[2]}><BuyerDashboard /></ProtectedRoute>
      } />
      <Route path="/patwari" element={
        <ProtectedRoute allowedRoles={[3]}><PatwariDashboard /></ProtectedRoute>
      } />
      <Route path="/survey" element={
        <ProtectedRoute allowedRoles={[4]}><SurveyDashboard /></ProtectedRoute>
      } />
      <Route path="/sub-registrar" element={
        <ProtectedRoute allowedRoles={[5]}><SubRegistrarDashboard /></ProtectedRoute>
      } />

      {/* Public pages (available to all connected users) */}
      <Route path="/map" element={<PublicLandSearch />} />
      <Route path="/tools" element={<ToolsPage />} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Web3Provider>
        <AppRoutes />
      </Web3Provider>
    </BrowserRouter>
  );
}
