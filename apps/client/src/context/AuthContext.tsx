import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '../types';
import { apiFetch } from '../api/apiClient';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signin: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const checkUserSession = async () => {
    try {
      const profile = await apiFetch<User>('/user');
      setUser(profile);
    } catch (err) {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkUserSession();

    const handleUnauthorized = () => {
      setUser(null);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  const signin = async (email: string, password: string) => {
    const res = await apiFetch<{ message: string; user: User }>('/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setUser(res.user);
  };

  const signup = async (name: string, email: string, password: string) => {
    const res = await apiFetch<{ message: string; user: User }>('/signup', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
    setUser(res.user);
  };

  const logout = async () => {
    try {
      await apiFetch('/logout', { method: 'POST' });
    } catch (err) {
      // Ignore logout network errors
    } finally {
      setUser(null);
    }
  };

  const deleteAccount = async () => {
    await apiFetch('/user', { method: 'DELETE' });
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        isLoading,
        signin,
        signup,
        logout,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
