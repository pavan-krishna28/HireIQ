import { createContext, useContext, useState } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [recruiter, setRecruiter] = useState(() => {
    try { return JSON.parse(localStorage.getItem('hireiq_recruiter')) || null; } catch { return null; }
  });

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('hireiq_token', data.token);
    localStorage.setItem('hireiq_recruiter', JSON.stringify(data.recruiter));
    setRecruiter(data.recruiter);
    return data;
  };

  const register = async (name, email, password, company_name) => {
    const { data } = await api.post('/auth/register', { name, email, password, company_name });
    localStorage.setItem('hireiq_token', data.token);
    localStorage.setItem('hireiq_recruiter', JSON.stringify(data.recruiter));
    setRecruiter(data.recruiter);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('hireiq_token');
    localStorage.removeItem('hireiq_recruiter');
    setRecruiter(null);
  };

  return (
    <AuthContext.Provider value={{ recruiter, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
