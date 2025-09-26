import React, { useState } from 'react';
import { User } from './types';
import AppRouter from './AppRouter';
// getCurrentUser removed from auth API; rely on explicit login flows

function App() {
  const [user, setUser] = useState<User | null>(null);
  // authView is managed by routes now; keep a setter to pass to router if needed
  const [_authView, setAuthView] = React.useState<'login' | 'signup'>('login');
  // No automatic auth check on mount anymore; app relies on explicit login
  const [loading] = useState(false);

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