import { Routes, Route } from 'react-router-dom';
import BottomTabBar  from './components/BottomTabBar.jsx';
import Home          from './pages/Home.jsx';
import TeamList      from './pages/TeamList.jsx';
import TeamDetail    from './pages/TeamDetail.jsx';
import PlayerList    from './pages/PlayerList.jsx';
import PlayerProfile from './pages/PlayerProfile.jsx';
import TournamentPage from './pages/TournamentPage.jsx';
import Shop          from './pages/Shop.jsx';

export default function App() {
  return (
    <div className="mobile-container">
      <Routes>
        <Route path="/"                      element={<Home />} />
        <Route path="/teams"                 element={<TeamList />} />
        <Route path="/teams/:slug"           element={<TeamDetail />} />
        <Route path="/players"               element={<PlayerList />} />
        <Route path="/players/:slug"         element={<PlayerProfile />} />
        <Route path="/tournaments/:slug"     element={<TournamentPage />} />
        <Route path="/shop"                  element={<Shop />} />
      </Routes>
      <BottomTabBar />
    </div>
  );
}
