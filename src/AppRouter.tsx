import React from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";
import Login from "./components/Login";
import Signup from "./components/Signup";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import TouristMap from "./components/TouristMap";
import AlertsPanel from "./components/AlertsPanel";
import TouristManagement from "./components/TouristManagement";
import FIRGenerator from "./components/FIRGenerator";
import ProtectedRoute from "./components/ProtectedRoute";
import { User } from "./types";

interface AppRouterProps {
  user: User | null;
  setAuthView: (view: "login" | "signup") => void;
  handleLogin: (user: User) => void;
  handleLogout: () => void;
}

import GlobalAlertListener from "./components/GlobalAlertListener";

// Layout used on protected pages: shows Sidebar and renders the nested route via Outlet
const ProtectedLayout: React.FC<{ user: User; onLogout: () => void }> = ({
  user,
  onLogout,
}) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);
  const location = useLocation();
  const path = location.pathname === "/" ? "/dashboard" : location.pathname;
  const currentPage = path.replace(/^\//, "");

  const toggleSidebar = () => setIsSidebarCollapsed(!isSidebarCollapsed);

  return (
    <>
      {/* Global Listener for SOS Sounds/Toasts */}
      <GlobalAlertListener />

      <Sidebar
        user={user}
        onLogout={onLogout}
        isCollapsed={isSidebarCollapsed}
        toggleSidebar={toggleSidebar}
      />
      <div
        className={`transition-all duration-300 ${
          isSidebarCollapsed ? "ml-20" : "ml-64"
        }`}
      >
        {/* Top Navigation Bar - simplified header that mirrors previous App header */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-gray-900 capitalize">
                {currentPage === "dashboard"
                  ? "Dashboard Overview"
                  : currentPage}
              </h1>
              <p className="text-sm text-gray-600">
                Welcome back, {user.name}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                {user.name.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </>
  );
};

const AppRouter: React.FC<AppRouterProps> = ({
  user,
  setAuthView,
  handleLogin,
  handleLogout,
}) => (
  <BrowserRouter>
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login onLogin={handleLogin} />} />
      <Route path="/signup" element={<Signup />} />

      {/* Protected routes grouped under a parent ProtectedRoute that uses an <Outlet /> */}
      <Route element={<ProtectedRoute user={user} />}>
        {/* The ProtectedLayout mounts the Sidebar and provides an Outlet for pages */}
        <Route
          element={
            <ProtectedLayout user={user! as User} onLogout={handleLogout} />
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/tourists" element={<TouristManagement />} />
          <Route path="/alerts" element={<AlertsPanel />} />
          <Route path="/heatmap" element={<TouristMap />} />
          <Route path="/firs" element={<FIRGenerator />} />
        </Route>
      </Route>
      <Route
        path="*"
        element={<Navigate to={user ? "/dashboard" : "/login"} replace />}
      />
    </Routes>
  </BrowserRouter>
);

export default AppRouter;
