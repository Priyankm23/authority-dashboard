import React, { useState } from 'react';
import { Bell, Globe, User as UserIcon } from 'lucide-react';
import { User } from './types';
import Login from './components/Login';
import Signup from './components/Signup';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import TouristMap from './components/TouristMap';
import AlertsPanel from './components/AlertsPanel';
import TouristManagement from './components/TouristManagement';
import FIRGenerator from './components/FIRGenerator';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState('dashboard');

  const handleLogin = (userData: User) => {
  console.log('App handleLogin called, userData:', userData);
  setUser(userData);
  setCurrentPage('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentPage('dashboard');
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'tourists':
        return <TouristManagement />;
      case 'alerts':
        return <AlertsPanel />;
      case 'heatmap':
        return <TouristMap />;
      case 'firs':
        return <FIRGenerator />;
      case 'settings':
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">System Settings</h2>
            <p className="text-gray-600">Settings panel would be implemented here</p>
          </div>
        );
      default:
        return <Dashboard />;
    }
  };

  const [authView, setAuthView] = React.useState<'login' | 'signup'>('login');

  if (!user) {
    return authView === 'login' ? (
      <Login onLogin={handleLogin} onShowSignup={() => setAuthView('signup')} />
    ) : (
      <Signup onSignupSuccess={() => setAuthView('login')} onCancel={() => setAuthView('login')} />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar 
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        user={user}
        onLogout={handleLogout}
      />

      {/* Main Content */}
      <div className="ml-64">
        {/* Top Navigation Bar */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-gray-900 capitalize">
                {currentPage === 'dashboard' ? 'Dashboard Overview' : 
                 currentPage === 'tourists' ? 'Tourist Management' :
                 currentPage === 'alerts' ? 'SOS Alerts' :
                 currentPage === 'heatmap' ? 'Tourist Heatmap' :
                 currentPage === 'firs' ? 'E-FIR Generator' :
                 currentPage === 'settings' ? 'System Settings' : currentPage}
              </h1>
              <p className="text-sm text-gray-600">
                Welcome back, {user.name} • {user.department}
              </p>
            </div>

            <div className="flex items-center space-x-4">
              {/* Language Selector */}
              <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                <Globe className="h-5 w-5" />
              </button>

              {/* Notifications */}
              <button className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  3
                </span>
              </button>

              {/* User Profile */}
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <UserIcon className="h-4 w-4 text-blue-600" />
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-600 capitalize">{user.role}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}

export default App;