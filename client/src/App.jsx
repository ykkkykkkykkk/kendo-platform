import { useState, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { trackVisit } from './api.js';
import { AnimatePresence } from 'framer-motion';
import { useAuth } from './context/AuthContext.jsx';
import BottomTabBar    from './components/BottomTabBar.jsx';
import NickLoginModal    from './components/NickLoginModal.jsx';
import KakaoLoginModal   from './components/KakaoLoginModal.jsx';
import KakaoCallback     from './pages/KakaoCallback.jsx';
import { initKakao, kakaoConfigured } from './utils/kakaoSdk.js';
import PlayerLinkNotice  from './components/PlayerLinkNotice.jsx';
import AugustEventPopup  from './components/AugustEventPopup.jsx';
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
import DrawPage                  from './pages/DrawPage.jsx';
import FeedPage                  from './pages/FeedPage.jsx';
import PlayerInboxPage           from './pages/PlayerInboxPage.jsx';
import RankingPage               from './pages/RankingPage.jsx';
import SearchPage                from './pages/SearchPage.jsx';
import Shop                from './pages/Shop.jsx';
import Debug               from './pages/Debug.jsx';
import MyPage              from './pages/MyPage.jsx';
import MyFollows           from './pages/MyFollows.jsx';

export default function App() {
  const { user }   = useAuth();
  const location   = useLocation();
  // 둘러보기 먼저: 랜딩 시 로그인 강제하지 않음 (참여 액션에서만 로그인 유도)
  const [showLogin,       setShowLogin]       = useState(false);
  const [showPlayerLogin, setShowPlayerLogin] = useState(false);

  /* 카카오가 준비됐으면 카카오 로그인을, 아니면 기존 닉네임 로그인을 띄운다.
     앱 키가 없거나 SDK를 못 받아온 상황에서 가입 자체가 막히면 안 되므로 폴백을 둔다. */
  const [kakaoReady, setKakaoReady] = useState(false);
  useEffect(() => {
    if (!kakaoConfigured()) return;
    initKakao().then(setKakaoReady);
  }, []);

  // 방문 기록: 경로 바뀔 때마다 1건 핑 (어드민 경로는 제외 — 운영자 접속은 통계에서 뺌)
  useEffect(() => {
    if (!location.pathname.startsWith('/admin')) trackVisit(location.pathname);
  }, [location.pathname]);

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
          <Route path="/draw" element={
            <PageTransition><DrawPage /></PageTransition>
          } />
          <Route path="/oauth/kakao" element={<KakaoCallback />} />
          <Route path="/feed" element={
            <PageTransition><FeedPage onLoginRequest={openLogin} /></PageTransition>
          } />
          <Route path="/player" element={
            <PageTransition><PlayerInboxPage /></PageTransition>
          } />
          <Route path="/predictions" element={
            <PageTransition><PredictionsPage onLoginRequest={openLogin} /></PageTransition>
          } />
          <Route path="/predictions/:tournament_id" element={
            <PageTransition><PredictionTournamentPage /></PageTransition>
          } />
          <Route path="/predictions/:tournament_id/pick/:division_id" element={
            <PageTransition><PickInputPage /></PageTransition>
          } />
          <Route path="/ranking" element={
            <PageTransition><RankingPage onLoginRequest={openLogin} /></PageTransition>
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
          <Route path="/me" element={
            <PageTransition><MyPage /></PageTransition>
          } />
          <Route path="/me/follows" element={
            <PageTransition><MyFollows /></PageTransition>
          } />
        </Routes>
      </AnimatePresence>

      <BottomTabBar />
      <Toaster />
      <IOSInstallBanner />
      <PlayerLinkNotice />
      <AugustEventPopup onRegisterRequest={openLogin} />

      <AnimatePresence>
        {showLogin && !user && (
          kakaoReady ? (
            <KakaoLoginModal key="kakao-login-modal" onClose={() => setShowLogin(false)} />
          ) : (
            <NickLoginModal
              key="login-modal"
              onClose={() => setShowLogin(false)}
              onSwitchToPlayer={() => { setShowLogin(false); setShowPlayerLogin(true); }}
            />
          )
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
