import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import './index.css';

// 카카오 SDK 초기화 (VITE_KAKAO_APP_KEY 환경변수 필요)
const kakaoKey = import.meta.env.VITE_KAKAO_APP_KEY;
if (kakaoKey && window.Kakao && !window.Kakao.isInitialized()) {
  window.Kakao.init(kakaoKey);
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
