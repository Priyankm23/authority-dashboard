import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  AlertTriangle, 
  Map, 
  FileText, 
  Settings,
  LogOut
} from 'lucide-react';
import { User } from '../types';

interface SidebarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
  user: User;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPage, onPageChange, user, onLogout }) => {
  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['police', 'tourism', 'admin'] },
    { id: 'tourists', icon: Users, label: 'Tourist Management', roles: ['police', 'tourism', 'admin'] },
    { id: 'alerts', icon: AlertTriangle, label: 'SOS Alerts', roles: ['police', 'tourism', 'admin'] },
    { id: 'heatmap', icon: Map, label: 'Heatmap & Zones', roles: ['police', 'tourism', 'admin'] },
    { id: 'firs', icon: FileText, label: 'E-FIR Generator', roles: ['police', 'admin'] },
    { id: 'settings', icon: Settings, label: 'Settings', roles: ['admin'] }
  ];

  const filteredMenuItems = menuItems.filter(item => item.roles.includes(user.role));

  return (
    <div className="bg-white shadow-lg h-screen w-64 fixed left-0 top-0 z-30 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900">Tourist Safety</h1>
        <p className="text-sm text-gray-600 capitalize">{user.role} Dashboard</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6">
        <div className="space-y-1 px-3">
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => onPageChange(item.id)}
                className={`w-full flex items-center px-3 py-3 rounded-lg text-left transition-colors duration-200 ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className={`h-5 w-5 mr-3 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* User Info & Logout */}
      <div className="p-6 border-t border-gray-200">
        <div className="mb-4">
          <p className="font-medium text-gray-900 text-sm">{user.name}</p>
          <p className="text-xs text-gray-600">{user.department}</p>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center px-3 py-2 rounded-lg text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors duration-200"
        >
          <LogOut className="h-5 w-5 mr-3" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;