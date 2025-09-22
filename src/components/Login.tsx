import React, { useState } from 'react';
import { Shield, Users, Settings, Eye, EyeOff } from 'lucide-react';
// To re-enable real API login, uncomment the import below and the call in handleLogin
// import { login as authLogin } from '../api/auth';
import { mockUsers } from '../utils/mockData';
import { User } from '../types';

interface LoginProps {
  onLogin: (user: User) => void;
  onShowSignup?: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, onShowSignup }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [selectedRole, setSelectedRole] = useState<'police' | 'tourism' | 'admin'>('police');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Temporary: use mock users for frontend testing
    const user = mockUsers.find(u => u.email === email && u.password === password);
    if (user) {
      onLogin({
        id: `${user.role}_${Date.now()}`,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department
      });
      return;
    }

    // Real API call (commented out for local testing)
    /*
    (async () => {
      try {
        const res = await authLogin(email, password);
        if (!res.success) {
          setError(res.message || 'Login failed');
          return;
        }
        const token = res.token;
        if (token) {
          try { localStorage.setItem('auth_token', token); } catch (e) { }
          // decode token and call onLogin as before
        } else {
          setError('No token returned from server');
        }
      } catch (err: any) {
        setError(err?.message || 'Unexpected error');
      }
    })();
    */

    setError('Invalid credentials. Please check your email and password.');
  };

  const roleOptions = [
    {
      role: 'police' as const,
      icon: Shield,
      title: 'Police Department',
      description: 'Law enforcement and emergency response',
      color: 'text-blue-600 bg-blue-50 border-blue-200'
    },
    {
      role: 'tourism' as const,
      icon: Users,
      title: 'Tourism Department',
      description: 'Tourist services and coordination',
      color: 'text-green-600 bg-green-50 border-green-200'
    },
    {
      role: 'admin' as const,
      icon: Settings,
      title: 'System Administrator',
      description: 'System management and oversight',
      color: 'text-purple-600 bg-purple-50 border-purple-200'
    }
  ];

  const quickLogin = (role: 'police' | 'tourism' | 'admin') => {
    const user = mockUsers.find(u => u.role === role);
    if (user) {
      setEmail(user.email);
      setPassword(user.password);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-4">
      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Left Side - Role Selection */}
        <div className="space-y-6">
          <div className="text-center lg:text-left">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Smart Tourist Safety
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Authority Dashboard & Incident Response System
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Select Your Department</h2>
            {roleOptions.map(({ role, icon: Icon, title, description, color }) => (
              <div
                key={role}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-md ${
                  selectedRole === role ? color : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => {
                  setSelectedRole(role);
                  quickLogin(role);
                }}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`h-6 w-6 ${selectedRole === role ? '' : 'text-gray-400'}`} />
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{title}</h3>
                    <p className="text-sm text-gray-600">{description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-sm text-gray-500 bg-gray-50 p-4 rounded-lg">
            <p className="font-medium mb-2">Quick Login Credentials:</p>
            <div className="space-y-1">
              <p><strong>Police:</strong> police@system.gov / police123</p>
              <p><strong>Tourism:</strong> tourism@system.gov / tourism123</p>
              <p><strong>Admin:</strong> admin@system.gov / admin123</p>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="mx-auto h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Shield className="h-6 w-6 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Authority Login</h2>
            <p className="text-gray-600 mt-2">Secure access to the dashboard</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Official Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="your-email@system.gov"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors pr-12"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Sign In to Dashboard
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            <p>Authorized personnel only. All access is logged and monitored.</p>
            <p className="mt-3">
              <button type="button" onClick={() => onShowSignup && onShowSignup()} className="text-blue-600 hover:underline">
                Need an account? Sign up
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;