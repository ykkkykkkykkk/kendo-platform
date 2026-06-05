import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import AdminLogin        from './AdminLogin.jsx';
import AdminLayout       from './AdminLayout.jsx';
import Dashboard         from './pages/Dashboard.jsx';
import PlayerList        from './pages/players/PlayerList.jsx';
import PlayerForm        from './pages/players/PlayerForm.jsx';
import TeamList          from './pages/teams/TeamList.jsx';
import TeamForm          from './pages/teams/TeamForm.jsx';
import TournamentList    from './pages/tournaments/TournamentList.jsx';
import TournamentForm    from './pages/tournaments/TournamentForm.jsx';
import TournamentMatches from './pages/tournaments/TournamentMatches.jsx';
import ClinicList        from './pages/clinics/ClinicList.jsx';
import ClinicForm        from './pages/clinics/ClinicForm.jsx';
import SponsorshipList   from './pages/sponsorships/SponsorshipList.jsx';
import SponsorshipForm   from './pages/sponsorships/SponsorshipForm.jsx';
import PlayerAccounts    from './pages/player-accounts/PlayerAccounts.jsx';
import InquiryList      from './pages/inquiries/InquiryList.jsx';

const TOKEN_KEY = 'kendo_admin_token';

export default function AdminApp() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));

  const login  = (t) => { localStorage.setItem(TOKEN_KEY, t); setToken(t); };
  const logout = ()  => { localStorage.removeItem(TOKEN_KEY); setToken(null); };

  if (!token) return <AdminLogin onLogin={login} />;

  return (
    <AdminLayout onLogout={logout}>
      <Routes>
        <Route index                               element={<Dashboard />} />

        <Route path="players"                      element={<PlayerList />} />
        <Route path="players/new"                  element={<PlayerForm />} />
        <Route path="players/:id/edit"             element={<PlayerForm />} />

        <Route path="teams"                        element={<TeamList />} />
        <Route path="teams/new"                    element={<TeamForm />} />
        <Route path="teams/:id/edit"               element={<TeamForm />} />

        <Route path="tournaments"                  element={<TournamentList />} />
        <Route path="tournaments/new"              element={<TournamentForm />} />
        <Route path="tournaments/:id/edit"         element={<TournamentForm />} />
        <Route path="tournaments/:id/matches"      element={<TournamentMatches />} />

        <Route path="clinics"                      element={<ClinicList />} />
        <Route path="clinics/new"                  element={<ClinicForm />} />
        <Route path="clinics/:id/edit"             element={<ClinicForm />} />

        <Route path="sponsorships"                 element={<SponsorshipList />} />
        <Route path="sponsorships/new"             element={<SponsorshipForm />} />
        <Route path="sponsorships/:id/edit"        element={<SponsorshipForm />} />

        <Route path="player-accounts"              element={<PlayerAccounts />} />
        <Route path="inquiries"                    element={<InquiryList />} />
      </Routes>
    </AdminLayout>
  );
}
