import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import axios from 'axios';

axios.defaults.withCredentials = true;

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const tokenRef = useRef(null);
  const refreshPromiseRef = useRef(null);

  const applyAccessToken = useCallback((accessToken) => {
    tokenRef.current = accessToken || null;
    setToken(accessToken || null);
    if (accessToken) {
      axios.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
    } else {
      delete axios.defaults.headers.common.Authorization;
    }
  }, []);

  const clearSession = useCallback(() => {
    applyAccessToken(null);
    setUser(null);
    localStorage.removeItem('cc_token');
  }, [applyAccessToken]);

  const refreshAccessToken = useCallback(async () => {
    if (!refreshPromiseRef.current) {
      refreshPromiseRef.current = axios
        .post('/api/auth/refresh', null, { skipAuthRefresh: true })
        .then((response) => {
          const accessToken = response.data.accessToken || response.data.token;
          if (!accessToken) throw new Error('Refresh response did not include an access token.');
          applyAccessToken(accessToken);
          return accessToken;
        })
        .finally(() => {
          refreshPromiseRef.current = null;
        });
    }
    return refreshPromiseRef.current;
  }, [applyAccessToken]);

  const fetchProfile = useCallback(async ({ manageLoading = true } = {}) => {
    if (manageLoading) setLoading(true);
    try {
      const response = await axios.get('/api/users/me');
      if (response.data.user) setUser(response.data.user);
      return response.data.user || null;
    } finally {
      if (manageLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Remove access tokens persisted by older builds; refresh cookies now
    // restore sessions without exposing long-lived credentials to JavaScript.
    localStorage.removeItem('cc_token');

    const interceptorId = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const request = error.config;
        const isAuthEndpoint = request?.url?.includes('/api/auth/');
        if (
          error.response?.status !== 401 ||
          !request ||
          request._authRetry ||
          request.skipAuthRefresh ||
          isAuthEndpoint
        ) {
          return Promise.reject(error);
        }

        request._authRetry = true;
        try {
          const accessToken = await refreshAccessToken();
          request.headers = request.headers || {};
          request.headers.Authorization = `Bearer ${accessToken}`;
          return axios(request);
        } catch (refreshError) {
          clearSession();
          return Promise.reject(refreshError);
        }
      }
    );

    let active = true;
    const restoreSession = async () => {
      try {
        await refreshAccessToken();
        if (active) await fetchProfile({ manageLoading: false });
      } catch {
        if (active) clearSession();
      } finally {
        if (active) setLoading(false);
      }
    };
    restoreSession();

    return () => {
      active = false;
      axios.interceptors.response.eject(interceptorId);
    };
  }, [clearSession, fetchProfile, refreshAccessToken]);

  const login = async (email, password) => {
    try {
      const response = await axios.post('/api/auth/login', { email, password }, { skipAuthRefresh: true });
      const accessToken = response.data.accessToken || response.data.token;
      applyAccessToken(accessToken);
      setUser(response.data.user);
      return { success: true, user: response.data.user };
    } catch (error) {
      return {
        success: false,
        isUnverified: error.response?.status === 403,
        message: error.response?.data?.message || 'Login failed.',
      };
    }
  };

  const register = async (formData) => {
    try {
      const response = await axios.post('/api/auth/register', formData, { skipAuthRefresh: true });
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Registration failed.' };
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await axios.put('/api/users/me', profileData);
      if (response.data.user) setUser(response.data.user);
      return { success: true, message: response.data.message, user: response.data.user };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Failed to update profile.' };
    }
  };

  const requestOrganizerRole = async (message) => {
    try {
      const response = await axios.post('/api/roles/requests', { message });
      if (response.data.user) setUser(response.data.user);
      return { success: true, message: response.data.message, user: response.data.user };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Failed to submit organizer role request.' };
    }
  };

  const resendVerification = async (email) => {
    try {
      const response = await axios.post('/api/auth/resend-verification', { email }, { skipAuthRefresh: true });
      return { success: true, message: response.data.message, data: response.data };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Failed to resend verification email.' };
    }
  };

  const verifyEmail = async (verificationToken) => {
    try {
      const response = await axios.get('/api/auth/verify', {
        params: { token: verificationToken },
        headers: { Accept: 'application/json' },
        skipAuthRefresh: true,
      });
      return { success: true, message: response.data.message, user: response.data.user };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Email verification failed.' };
    }
  };

  const logout = async () => {
    try {
      await axios.post('/api/auth/logout', null, { skipAuthRefresh: true });
    } catch (error) {
      console.warn('Server logout failed; clearing local session.', error.response?.data?.message);
    } finally {
      clearSession();
    }
  };

  const toggleRole = () => {
    setUser((current) => current ? {
      ...current,
      role: current.role === 'attendee' ? 'organizer' : 'attendee',
    } : current);
  };

  const updateUserCity = (city) => {
    setUser((current) => current ? { ...current, city } : current);
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      role: user?.role || null,
      login,
      register,
      resendVerification,
      verifyEmail,
      updateProfile,
      requestOrganizerRole,
      logout,
      fetchProfile,
      toggleRole,
      updateUserCity,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}

export default AuthProvider;
