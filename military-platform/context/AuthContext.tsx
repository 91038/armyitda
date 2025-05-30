"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { loginUser, registerUser, signOut, getCurrentUser } from '@/lib/auth';

// 인증 컨텍스트의 타입 정의
interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error: string | null }>;
  register: (email: string, password: string) => Promise<{ success: boolean; error: string | null }>;
  logout: () => Promise<{ success: boolean; error: string | null }>;
}

// 초기 상태
const initialAuthContext: AuthContextType = {
  user: null,
  loading: true,
  error: null,
  login: async () => ({ success: false, error: null }),
  register: async () => ({ success: false, error: null }),
  logout: async () => ({ success: false, error: null }),
};

// 인증 컨텍스트 생성
const AuthContext = createContext<AuthContextType>(initialAuthContext);

// 인증 컨텍스트 훅
export const useAuth = () => useContext(AuthContext);

// 인증 컨텍스트 제공자 속성 타입
interface AuthProviderProps {
  children: ReactNode;
}

// 인증 컨텍스트 제공자 컴포넌트
export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 현재 사용자 불러오기 효과
  useEffect(() => {
    const loadUser = async () => {
      try {
        setLoading(true);
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      } catch (err) {
        console.error('사용자 정보 로드 실패:', err);
        setError('사용자 정보를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  // 로그인 함수
  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);

    try {
      const { user: authUser, error: loginError } = await loginUser(email, password);
      
      if (loginError) {
        setError(loginError);
        return { success: false, error: loginError };
      }

      setUser(authUser);
      return { success: true, error: null };
    } catch (err: any) {
      const errorMessage = err.message || '로그인 중 오류가 발생했습니다.';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // 회원가입 함수
  const register = async (email: string, password: string) => {
    setLoading(true);
    setError(null);

    try {
      const { user: authUser, error: registerError } = await registerUser(email, password);
      
      if (registerError) {
        setError(registerError);
        return { success: false, error: registerError };
      }

      setUser(authUser);
      return { success: true, error: null };
    } catch (err: any) {
      const errorMessage = err.message || '회원가입 중 오류가 발생했습니다.';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // 로그아웃 함수
  const logout = async () => {
    setLoading(true);
    setError(null);

    try {
      const { success, error: logoutError } = await signOut();
      
      if (logoutError) {
        setError(logoutError);
        return { success: false, error: logoutError };
      }

      setUser(null);
      return { success: true, error: null };
    } catch (err: any) {
      const errorMessage = err.message || '로그아웃 중 오류가 발생했습니다.';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // 인증 컨텍스트 값
  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 
 