import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

const TOKEN_KEY = 'kendo_token';

function loadToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function decodeUser(token) {
  try {
    const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(part);

    let payload;
    try {
      // TextDecoder 방식 (한글 닉네임 포함)
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      payload = JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      // 폴백: 기본 파싱 (ASCII 필드는 정확, 한글은 깨질 수 있음)
      payload = JSON.parse(decodeURIComponent(
        binary.split('').map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
      ));
    }

    return {
      id:       payload.userId,
      nickname: payload.nickname,
      role:     payload.role     ?? 'fan',
      playerId: payload.playerId ?? null,
    };
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
