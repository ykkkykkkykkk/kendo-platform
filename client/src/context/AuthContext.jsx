import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

const TOKEN_KEY = 'kendo_token';

function loadToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function decodeUser(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return { id: payload.userId, nickname: payload.nickname, role: payload.role ?? 'fan', playerId: payload.playerId ?? null };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(loadToken);
  const user = token ? decodeUser(token) : null;

  const login = (newToken) => {
    setToken(newToken);
    localStorage.setItem(TOKEN_KEY, newToken);
  };

  const logout = () => {
    setToken(null);
    localStorage.removeItem(TOKEN_KEY);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
