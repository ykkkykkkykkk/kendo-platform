import React from 'react';
import ReactDOM from 'react-dom/client';

window.addEventListener('beforeinstallprompt', (e) => e.preventDefault());
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import './index.css';
import { keepServiceWorkerFresh } from './swUpdate.js';
import { initMonitoring } from './monitoring.js';
import RouteTracker from './RouteTracker.jsx';

keepServiceWorkerFresh();
initMonitoring();


ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <RouteTracker />
      <AuthProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
