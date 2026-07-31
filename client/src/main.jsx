import React from 'react';
import ReactDOM from 'react-dom/client';

window.addEventListener('beforeinstallprompt', (e) => e.preventDefault());
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import './index.css';
import { keepServiceWorkerFresh } from './swUpdate.js';

keepServiceWorkerFresh();

/* 세로 스크롤바 폭을 --sbw로 노출한다. .wide-break(대진표처럼 화면 전체를 쓰는 요소)가
   100vw를 그대로 쓰면 스크롤바 폭만큼 페이지가 가로로 밀리기 때문이다.
   스크롤바는 내용 높이에 따라 생겼다 없어지므로 body 크기 변화를 관찰해 다시 잰다. */
function measureScrollbar() {
  const w = window.innerWidth - document.documentElement.clientWidth;
  document.documentElement.style.setProperty('--sbw', `${Math.max(0, w)}px`);
}
window.addEventListener('resize', measureScrollbar);
if (typeof ResizeObserver !== 'undefined') {
  new ResizeObserver(measureScrollbar).observe(document.body);
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);

measureScrollbar();
