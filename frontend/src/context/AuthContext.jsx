import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('cc_token') || null);
  const [loading, setLoading] = useState(true);

  // Configure Axios default header
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchProfile();
    } else {
      delete axios.defaults.headers.common['Authorization'];
      setUser(null);
      setLoading(false);
    }
  }, [token]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/auth/me');
      if (res.data.user) {
        setUser(res.data.user);
      }
    } catch (err) {
      console.warn('Profile load error:', err.response?.data?.message);
      if (err.response?.status === 401) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const res = await axios.post('/api/auth/login', { email, password });
      const { token: jwtToken, user: userData } = res.data;
      setToken(jwtToken);
      localStorage.setItem('cc_token', jwtToken);
      setUser(userData);
      return { success: true, user: userData };
    } catch (err) {
      return {
        success: false,
        isUnverified: err.response?.status === 403,
        message: err.response?.data?.message || 'Login failed.',
      };
    }
  };

  const register = async (formData) => {
    try {
      const res = await axios.post('/api/auth/register', formData);
      return { success: true, data: res.data };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || 'Registration failed.',
      };
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const res = await axios.put('/api/auth/profile', profileData);
      if (res.data.user) {
        setUser(res.data.user);
      }
      return { success: true, message: res.data.message, user: res.data.user };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || 'Failed to update profile.',
      };
    }
  };

  const requestOrganizerRole = async (description) => {
    try {
      const res = await axios.post('/api/auth/request-organizer', { description });
      if (res.data.user) {
        setUser(res.data.user);
      }
      return { success: true, message: res.data.message, user: res.data.user };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || 'Failed to submit organizer role request.',
      };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('cc_token');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        updateProfile,
        requestOrganizerRole,
        logout,
        fetchProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
