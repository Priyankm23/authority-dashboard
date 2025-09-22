import React, { useState } from 'react';
import { Shield, Users, Settings } from 'lucide-react';
import { signup } from '../api/auth';

type SignupProps = {
  onSignupSuccess?: () => void;
  onCancel?: () => void;
};

const Signup: React.FC<SignupProps> = ({ onSignupSuccess, onCancel }) => {
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [policeStationId, setPoliceStationId] = useState('');
  const [role, setRole] = useState<'Police Officer' | 'Tourism Officer' | 'Emergency Responder' | 'Admin'>('Police Officer');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await signup({ username, email, password, fullName, policeStationId, role });
      if (res.success) {
        setMessage(res.message || 'Signup successful. You can now log in.');
        setUsername('');
        setFullName('');
        setEmail('');
        setPassword('');
        setPoliceStationId('');
        // notify parent to switch to login view
        if (onSignupSuccess) onSignupSuccess();
      } else {
        setError(res.message || 'Signup failed');
      }
    } catch (err: any) {
      setError(err?.message || 'Unexpected error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-4">
      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Left Side - Role Selection */}
        <div className="space-y-6">
          <div className="text-center lg:text-left">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Smart Tourist Safety</h1>
            <p className="text-xl text-gray-600 mb-8">Authority Dashboard & Incident Response System</p>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Select Your Department</h2>
            {[
              { role: 'Police Officer', icon: Shield, title: 'Police Department', description: 'Law enforcement and emergency response', color: 'text-blue-600 bg-blue-50 border-blue-200' },
              { role: 'Tourism Officer', icon: Users, title: 'Tourism Department', description: 'Tourist services and coordination', color: 'text-green-600 bg-green-50 border-green-200' },
              { role: 'Admin', icon: Settings, title: 'System Administrator', description: 'System management and oversight', color: 'text-purple-600 bg-purple-50 border-purple-200' }
            ].map((opt) => {
              const Icon = opt.icon as any;
              return (
                <div key={opt.role} className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-md ${role === opt.role ? opt.color : 'bg-white border-gray-200 hover:border-gray-300'}`} onClick={() => setRole(opt.role as any)}>
                  <div className="flex items-center space-x-3">
                    <Icon className={`h-6 w-6 ${role === opt.role ? '' : 'text-gray-400'}`} />
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{opt.title}</h3>
                      <p className="text-sm text-gray-600">{opt.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="text-sm text-gray-500 bg-gray-50 p-4 rounded-lg">
            <p className="font-medium mb-2">Quick Tips:</p>
            <div className="space-y-1">
              <p>Use your official email and a secure password.</p>
              <p>If you're an admin choose the Admin role.</p>
            </div>
          </div>
        </div>

        {/* Right Side - Signup Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="mx-auto h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <svg className="h-6 w-6 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 11c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3z"/><path d="M21 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2"/></svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Create Authority Account</h2>
            <p className="text-gray-600 mt-2">Register a new authority user</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Username</label>
              <input value={username} onChange={(e) => setUsername(e.target.value)} required className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Full Name</label>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} required className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Official Email</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors pr-12" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Police Station ID</label>
              <input value={policeStationId} onChange={(e) => setPoliceStationId(e.target.value)} required className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" />
            </div>

            {message && <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">{message}</div>}
            {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}

            <div className="flex space-x-3">
              <button type="submit" disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                {loading ? 'Creating account...' : 'Create Account'}
              </button>
              <button type="button" onClick={() => onCancel && onCancel()} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-3 px-4 rounded-lg transition-colors duration-200">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Signup;
