import { useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useAuth } from './context/AuthContext.jsx';
import BottomTabBar    from './components/BottomTabBar.jsx';
import NickLoginModal    from './components/NickLoginModal.jsx';
import PlayerLoginModal  from './components/PlayerLoginModal.jsx';
import IOSInstallBanner  from './components/IOSInstallBanner.jsx';
import PageTransition  from './components/PageTransition.jsx';
import Toaster         from './components/Toaster.jsx';
import { Navigate }       from 'react-router-dom';
import AdminApp            from './admin/AdminApp.jsx';
import Home                from './pages/Home.jsx';
import TeamList            from './pages/TeamList.jsx';
import TeamDetail          from './pages/TeamDetail.jsx';
import PlayerProfile       from './pages/PlayerProfile.jsx';
import PredictionsPage           from './pages/PredictionsPage.jsx';
import PredictionTournamentPage  from './pages/PredictionTournamentPage.jsx';
import PickInputPage             from './pages/PickInputPage.jsx';
import RankingPage               from './pages/RankingPage.jsx';
import SearchPage                from './pages/SearchPage.jsx';
import Shop                from './pages/Shop.jsx';
import Debug               from './pages/Debug.jsx';

export default function App() {
  const { user }   = useAuth();
  const location   = useLocation();
  const [showLogin,       setShowLogin]       = useState(!user);
  const [showPlayerLogin, setShowPlayerLogin] = useState(false);

  // /admin/* 경로는 완전히 분리된 AdminApp으로 렌더링
  if (location.pathname.startsWith('/admin')) {
    return (
      <div className="admin-container">
        <Routes>
          <Route path="/admin/*" element={<AdminApp />} />
        </Routes>
      </div>
    );
  }

  const openLogin = () => setShowLogin(true);

  return (
    <div className="mobile-container">
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={
            <PageTransition><Home onLoginRequest={openLogin} /></PageTransition>
          } />
          <Route path="/teams" element={
            <PageTransition><TeamList /></PageTransition>
          } />
          <Route path="/teams/:slug" element={
            <PageTransition><TeamDetail /></PageTransition>
          } />
          <Route path="/players" element={<Navigate to="/" replace />} />
          <Route path="/players/:slug" element={
            <PageTransition><PlayerProfile onLoginRequest={openLogin} /></PageTransition>
          } />
          <Route path="/tournaments" element={<Navigate to="/predictions" replace />} />
          <Route path="/tournaments/:slug" element={<Navigate to="/predictions" replace />} />
          <Route path="/predictions" element={
            <PageTransition><PredictionsPage /></PageTransition>
          } />
          <Route path="/predictions/:tournament_id" element={
            <PageTransition><PredictionTournamentPage /></PageTransition>
          } />
          <Route path="/predictions/:tournament_id/pick/:division_id" element={
            <PageTransition><PickInputPage /></PageTransition>
          } />
          <Route path="/ranking" element={
            <PageTransition><RankingPage /></PageTransition>
          } />
          <Route path="/search" element={
            <PageTransition><SearchPage /></PageTransition>
          } />
          <Route path="/shop" element={
            <PageTransition><Shop /></PageTransition>
          } />
          <Route path="/debug" element={
            <PageTransition><Debug /></PageTransition>
          } />
        </Routes>
      </AnimatePresence>

      <BottomTabBar />
      <Toaster />
      <IOSInstallBanner />

      <AnimatePresence>
        {showLogin && !user && (
          <NickLoginModal
            key="login-modal"
            onClose={() => setShowLogin(false)}
            onSwitchToPlayer={() => { setShowLogin(false); setShowPlayerLogin(true); }}
          />
        )}
        {showPlayerLogin && !user && (
          <PlayerLoginModal
            key="player-login-modal"
            onClose={() => setShowPlayerLogin(false)}
            onSwitchToFan={() => { setShowPlayerLogin(false); setShowLogin(true); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
