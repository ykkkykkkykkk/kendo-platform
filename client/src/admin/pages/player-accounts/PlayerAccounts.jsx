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
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">선수 계정 관리</h1>

      {/* 생성 폼 */}
      <div className="bg-white border rounded-xl p-5 mb-8 shadow-sm">
        <h2 className="font-bold text-lg mb-4">새 선수 계정 생성</h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">선수 선택</label>
            <select
              required
              value={form.player_id}
              onChange={(e) => setForm({ ...form, player_id: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
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
            <label className="block text-sm font-medium text-gray-700 mb-1">아이디</label>
            <input
              required
              type="text"
              placeholder="영문+숫자 조합"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">임시 비밀번호</label>
            <div className="flex gap-2">
              <input
                required
                type="text"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="flex-1 border rounded-lg px-3 py-2 text-sm font-mono"
              />
              <button
                type="button"
                onClick={() => setForm({ ...form, password: generatePassword() })}
                className="px-3 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200"
              >
                재생성
              </button>
            </div>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-orange-500 text-white font-bold py-2.5 rounded-lg hover:bg-orange-600 disabled:opacity-50"
          >
            {saving ? '생성 중...' : '계정 생성'}
          </button>
        </form>
      </div>

      {/* 생성 완료 알림 */}
      {created && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
          <p className="font-bold text-green-800 mb-2">✅ {created.player_name} 계정 생성 완료</p>
          <p className="text-sm text-green-700">아이디: <span className="font-mono font-bold">{created.username}</span></p>
          <p className="text-sm text-green-700">비밀번호: <span className="font-mono font-bold">{created.password}</span></p>
          <p className="text-xs text-green-600 mt-2">위 정보를 선수에게 카톡으로 전달하세요.</p>
          <button onClick={() => setCreated(null)} className="mt-2 text-xs text-green-600 underline">닫기</button>
        </div>
      )}

      {/* 계정 목록 */}
      <h2 className="font-bold text-lg mb-3">등록된 선수 계정 ({accounts.length})</h2>
      {loading ? (
        <p className="text-gray-400 text-sm">불러오는 중...</p>
      ) : accounts.length === 0 ? (
        <p className="text-gray-400 text-sm">등록된 선수 계정이 없습니다.</p>
      ) : (
        <div className="space-y-3">
          {accounts.map((a) => (
            <div key={a.id} className="bg-white border rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold">{a.player_name ?? a.nickname}</p>
                  <p className="text-sm text-gray-500">{a.team_name} · 아이디: <span className="font-mono">{a.username}</span></p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setResetId(a.id); setNewPw(generatePassword()); }}
                    className="text-xs px-3 py-1.5 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    비번 재설정
                  </button>
                  <button
                    onClick={() => handleDelete(a.id)}
                    className="text-xs px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
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
                    className="flex-1 border rounded-lg px-3 py-1.5 text-sm font-mono"
                  />
                  <button
                    onClick={() => handleResetPassword(a.id)}
                    className="px-3 py-1.5 bg-orange-500 text-white text-sm rounded-lg"
                  >
                    변경
                  </button>
                  <button
                    onClick={() => setResetId(null)}
                    className="px-3 py-1.5 bg-gray-100 text-sm rounded-lg"
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
