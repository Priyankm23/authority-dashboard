import React, { useState, useEffect } from 'react';
import { User } from './types';
import AppRouter from './AppRouter';
import { getCurrentUser } from './api/auth';

function App() {
  const [user, setUser] = useState<User | null>(null);
  // authView is managed by routes now; keep a setter to pass to router if needed
  const [_authView, setAuthView] = React.useState<'login' | 'signup'>('login');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // On mount, check if user is already authenticated (via cookie/session)
    const checkAuth = async () => {
      try {
        const res = await getCurrentUser();
        if (res.success && res.user) {
          setUser(res.user);
        }
      } catch (e) {
        // ignore error, user stays null
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const handleLogin = (userData: User) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-lg">Loading...</div>;
  }

  return (
    <AppRouter
      user={user}
      setAuthView={setAuthView}
      handleLogin={handleLogin}
      handleLogout={handleLogout}
    />
  );
}

export default App;