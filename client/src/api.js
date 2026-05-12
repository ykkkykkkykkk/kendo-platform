const BASE = '/api';

const get = (path) => fetch(BASE + path).then((r) => r.json());

export const api = {
  teams:      ()     => get('/teams'),
  team:       (slug) => get(`/teams/${slug}`),
  players:    (team) => get(team ? `/players?team=${team}` : '/players'),
  player:     (slug) => get(`/players/${slug}`),
  tournaments: ()    => get('/tournaments'),
  tournament:  (slug)=> get(`/tournaments/${slug}`),
};
