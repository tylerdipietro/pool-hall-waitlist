import React, { createContext, useState, useEffect } from 'react';
import Constants from 'expo-constants';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  fetch(`${API_BASE_URL}/api/auth/success`, {
    credentials: 'include', // Important to send cookies/session
  })
  .then((res) => {
    if (res.status === 200) return res.json();
    throw new Error('Not authenticated');
  })
  .then((data) => {
    if (data.success) {
      setUser(data.user);
    } else {
      setUser(null);
    }
  })
  .catch(() => setUser(null))
  .finally(() => setLoading(false));
}, []);


  return (
    <AuthContext.Provider value={{ user, setUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
