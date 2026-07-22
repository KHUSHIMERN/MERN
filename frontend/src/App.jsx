import React, { useState } from 'react';
import RegisterForm from './components/RegisterForm';
import LoginForm from './components/LoginForm';

export default function App() {
  const [view, setView] = useState('register'); // 'register' | 'login'

  return (
    <main>
      {view === 'register' ? (
        <RegisterForm onSwitchToLogin={() => setView('login')} />
      ) : (
        <LoginForm onSwitchToRegister={() => setView('register')} />
      )}
    </main>
  );
}
