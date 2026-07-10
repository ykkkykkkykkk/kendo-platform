const BASE = (import.meta.env.VITE_API_URL ?? '') + '/api';

function authHeaders() {
  const token = localStorage.getItem('kendo_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const get = (path) => fetch(BASE + path).then((r) => r.json());

export const authPost = (path, body) =>
  fetch(BASE + path, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body:    JSON.stringify(body),
  });

export const authGet = (path) =>
  fetch(BASE + path, { headers: authHeaders() }).then((r) => r.json());

export const authDelete = (path) =>
  fetch(BASE + path, {
    method:  'DELETE',
    headers: authHeaders(),
  });

export const authPut = (path, body) =>
  fetch(BASE + path, {
    method:  'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body:    JSON.stringify(body),
  });

export const api = {
  teams:       ()     => get('/teams'),
  team:        (slug) => get(`/teams/${slug}`),
  players:     (team) => get(team ? `/players?team=${team}` : '/players'),
  player:      (slug) => get(`/players/${slug}`),

  // 선수 Q&A
  playerQuestions: (slug)          => get(`/players/${slug}/questions`),
  questionQuota:   (slug)          => authGet(`/players/${slug}/questions/quota`),
  askQuestion:     (slug, question)=> authPost(`/players/${slug}/questions`, { question }),
  answerQuestion:  (id, answer)    => authPost(`/questions/${id}/answer`, { answer }),
  deleteQuestion:  (id)            => authDelete(`/questions/${id}`),
  tournaments: ()     => get('/tournaments'),
  tournament:  (slug) => get(`/tournaments/${slug}`),

  // 픽 시스템
  tournamentsWithDivisions: ()   => authGet('/tournaments-with-divisions'),
  tournamentFull:   (id)         => authGet(`/tournaments/${id}/full`),
  divisionParticipants: (id)     => authGet(`/divisions/${id}/participants`),
  myPick:           (divId)      => authGet(`/divisions/${divId}/my-pick`),
  allPicks:         (divId)      => authGet(`/divisions/${divId}/all-picks`),
  tournamentRanking:(id, p = 1)  => authGet(`/tournaments/${id}/ranking?page=${p}&limit=50`),
  submitPick: (divId, body)      => authPost(`/divisions/${divId}/pick`, body),
  lockPick:   (divId)            => authPost(`/divisions/${divId}/pick/lock`, {}),

  // 마이페이지
  me:           ()          => authGet('/me'),
  updateMe:     (body)      => authPost('/me', body),
  myFollows:    ()          => authGet('/me/follows'),
  myPicks:      ()          => authGet('/me/picks'),
  unfollow:     (playerId)  => authDelete(`/me/follows/${playerId}`),
  withdraw:     ()          => authPost('/me/withdraw', {}),

  // 도장 시스템
  dojoSearch:   (q)   => get(`/dojos/search?q=${encodeURIComponent(q)}`),
  dojoRanking:  ()    => authGet('/dojos/ranking'),
  myDojo:       ()    => authGet('/dojos/my'),
  joinDojo:     (name) => authPost('/dojos/join', { name }),
  dojoChangeRequest: (body) => authPost('/dojos/change-request', body),
  pastSeasons:  ()    => get('/seasons/past?limit=4'),
};
