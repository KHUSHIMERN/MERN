import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState({
    _id: 'guest_user_1',
    name: 'Rohan Sharma',
    email: 'rohan.sharma@tier2community.in',
    role: 'attendee', // 'attendee' or 'organizer'
    city: 'Jaipur',
    interests: ['career', 'workshop']
  });

  const toggleRole = () => {
    setUser(prev => ({
      ...prev,
      role: prev.role === 'attendee' ? 'organizer' : 'attendee'
    }));
  };

  const updateUserCity = (city) => {
    setUser(prev => ({ ...prev, city }));
  };

  return (
    <AuthContext.Provider value={{ user, role: user.role, toggleRole, updateUserCity }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
