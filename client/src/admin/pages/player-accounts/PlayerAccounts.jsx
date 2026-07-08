import { useState, useEffect } from 'react';
import { adminGet, adminPost, adminDelete } from '../../adminApi.js';

const BASE      = '/api/admin';
const TOKEN_KEY = 'kendo_admin_token';

const adminPatch = (path, body) =>
  fetch(BASE + path, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'x-admin-token': localStorage.getItem(TOKEN_KEY) ?? '' },
    body: JSON.stringify(body),
  }).then((r) => r.json());

function generatePassword() {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export default function PlayerAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [players,  setPlayers]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [form,     setForm]     = useState({ player_id: '', username: '', password: generatePassword() });
  const [created,  setCreated]  = useState(null);
  const [error,    setError]    = useState(null);
  const [saving,   setSaving]   = useState(false);
  const [resetId,  setResetId]  = useState(null);
  const [newPw,    setNewPw]    = useState('');

  const load = async () => {
    setLoading(true);
    const [accs, pls] = await Promise.all([
      adminGet('/player-accounts'),
      adminGet('/players?limit=200'),
    ]);
    setAccounts(Array.isArray(accs) ? accs : []);
    setPlayers(Array.isArray(pls) ? pls : (pls.players ?? []));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await adminPost('/player-accounts', {
        player_id: Number(form.player_id),
        username:  form.username,
        password:  form.password,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCreated({ username: form.username, password: form.password, player_name: data.player_name });
      setForm({ player_id: '', username: '', password: generatePassword() });
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('계정을 삭제하시겠습니까?')) return;
    await adminDelete(`/player-accounts/${id}`);
    load();
  };

  const handleResetPassword = async (id) => {
    if (!newPw || newPw.length < 6) { alert('6자 이상 입력해주세요.'); return; }
    await adminPatch(`/player-accounts/${id}/password`, { password: newPw });
    setResetId(null);
    setNewPw('');
    alert('비밀번호가 변경됐습니다.');
  };

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium">PLAYER ACCOUNTS</p>
        <h1 className="text-3xl font-bold text-ink tracking-[-0.03em] mt-1">선수 계정 관리</h1>
      </div>

      {/* 생성 폼 */}
      <div className="border border-ink-200 p-5 mb-8">
        <h2 className="font-bold text-lg text-ink mb-4">새 선수 계정 생성</h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-ink-600 mb-1 block">선수 선택</label>
            <select
              required
              value={form.player_id}
              onChange={(e) => setForm({ ...form, player_id: e.target.value })}
              className="w-full border border-ink-200 px-4 py-3 text-sm text-ink focus:outline-none focus:border-ink transition-colors"
            >
              <option value="">-- 선수 선택 --</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.team_name ?? '팀 없음'})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-ink-600 mb-1 block">아이디</label>
            <input
              required
              type="text"
              placeholder="영문+숫자 조합"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className="w-full border border-ink-200 px-4 py-3 text-sm text-ink placeholder:text-ink-400/60 focus:outline-none focus:border-ink transition-colors"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-600 mb-1 block">임시 비밀번호</label>
            <div className="flex gap-2">
              <input
                required
                type="text"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="flex-1 border border-ink-200 px-4 py-3 text-sm text-ink font-mono placeholder:text-ink-400/60 focus:outline-none focus:border-ink transition-colors"
              />
              <button
                type="button"
                onClick={() => setForm({ ...form, password: generatePassword() })}
                className="px-4 py-3 text-ink border border-ink-200 hover:border-ink rounded-full text-sm transition-colors"
              >
                재생성
              </button>
            </div>
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-ink text-white font-medium py-3 rounded-full text-sm hover:bg-ink/90 transition-colors disabled:opacity-50"
          >
            {saving ? '생성 중...' : '계정 생성'}
          </button>
        </form>
      </div>

      {/* 생성 완료 알림 */}
      {created && (
        <div className="border border-ink-200 p-4 mb-6">
          <p className="font-bold text-ink mb-2">✅ <span className="bg-lime px-1">{created.player_name} 계정 생성 완료</span></p>
          <p className="text-sm text-ink-600">아이디: <span className="font-mono font-bold text-ink">{created.username}</span></p>
          <p className="text-sm text-ink-600">비밀번호: <span className="font-mono font-bold text-ink">{created.password}</span></p>
          <p className="text-xs text-ink-400 mt-2">위 정보를 선수에게 카톡으로 전달하세요.</p>
          <button onClick={() => setCreated(null)} className="mt-2 text-xs text-ink-600 hover:text-ink underline">닫기</button>
        </div>
      )}

      {/* 계정 목록 */}
      <h2 className="font-bold text-lg text-ink mb-3">등록된 선수 계정 ({accounts.length})</h2>
      {loading ? (
        <p className="text-ink-400 text-sm">불러오는 중...</p>
      ) : accounts.length === 0 ? (
        <p className="text-ink-400 text-sm">등록된 선수 계정이 없습니다.</p>
      ) : (
        <div className="space-y-3">
          {accounts.map((a) => (
            <div key={a.id} className="border border-ink-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-ink">{a.player_name ?? a.nickname}</p>
                  <p className="text-sm text-ink-400">{a.team_name} · 아이디: <span className="font-mono text-ink-600">{a.username}</span></p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setResetId(a.id); setNewPw(generatePassword()); }}
                    className="text-xs px-2.5 py-1.5 text-ink border border-ink-200 hover:border-ink rounded-full transition-colors"
                  >
                    비번 재설정
                  </button>
                  <button
                    onClick={() => handleDelete(a.id)}
                    className="text-xs px-2.5 py-1.5 text-red-600 border border-red-200 hover:bg-red-50 rounded-full transition-colors"
                  >
                    삭제
                  </button>
                </div>
              </div>
              {resetId === a.id && (
                <div className="mt-3 flex gap-2">
                  <input
                    type="text"
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                    className="flex-1 border border-ink-200 px-3 py-1.5 text-sm text-ink font-mono placeholder:text-ink-400/60 focus:outline-none focus:border-ink transition-colors"
                  />
                  <button
                    onClick={() => handleResetPassword(a.id)}
                    className="px-3 py-1.5 bg-ink text-white text-sm rounded-full hover:bg-ink/90 transition-colors"
                  >
                    변경
                  </button>
                  <button
                    onClick={() => setResetId(null)}
                    className="px-3 py-1.5 text-ink border border-ink-200 hover:border-ink text-sm rounded-full transition-colors"
                  >
                    취소
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
