import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { adminGet, adminDelete } from '../../adminApi.js';

export default function PlayerList() {
  const navigate = useNavigate();
  const [players, setPlayers]   = useState([]);
  const [teams,   setTeams]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter,  setFilter]    = useState({ query: '', team: '', dan: '' });
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter.team) params.set('team', filter.team);
    if (filter.dan)  params.set('dan',  filter.dan);
    adminGet(`/players?${params}`)
      .then(setPlayers)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filter.team, filter.dan]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    adminGet('/teams').then(setTeams).catch(console.error);
  }, []);

  const handleDelete = async (player) => {
    if (!window.confirm(`"${player.name}" 선수를 삭제하시겠습니까?\n관련 장비·팔로우 데이터도 함께 삭제됩니다.`)) return;
    setDeleting(player.id);
    const res = await adminDelete(`/players/${player.id}`);
    if (res.ok) {
      setPlayers((prev) => prev.filter((p) => p.id !== player.id));
    } else {
      const data = await res.json();
      alert(data.error ?? '삭제 실패');
    }
    setDeleting(null);
  };

  const filtered = players.filter((p) =>
    !filter.query ||
    p.name.includes(filter.query) ||
    p.team_name?.includes(filter.query)
  );

  return (
    <div className="p-8">
      {/* 헤더 */}
      <div className="flex items-end justify-between mb-6">
        <div>
          <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium">PLAYERS</p>
          <h1 className="text-3xl font-bold text-ink tracking-[-0.03em] mt-1">선수 관리</h1>
          <p className="text-ink-400 text-sm mt-1">총 {players.length}명</p>
        </div>
        <button
          onClick={() => navigate('/admin/players/new')}
          className="flex items-center gap-2 bg-ink text-white px-4 py-2.5
                     rounded-full text-sm font-medium hover:bg-ink/90 transition-colors"
        >
          <Plus size={16} />
          새 선수 등록
        </button>
      </div>

      {/* 필터 바 */}
      <div className="border border-ink-200 p-4 mb-5 flex gap-3 items-center">
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            value={filter.query}
            onChange={(e) => setFilter((f) => ({ ...f, query: e.target.value }))}
            placeholder="이름 또는 팀 검색"
            className="w-full pl-9 pr-4 py-2.5 border border-ink-200 text-sm text-ink
                       placeholder:text-ink-400/60 focus:outline-none focus:border-ink transition-colors"
          />
        </div>
        <select
          value={filter.team}
          onChange={(e) => setFilter((f) => ({ ...f, team: e.target.value }))}
          className="border border-ink-200 px-4 py-3 text-sm text-ink focus:outline-none focus:border-ink transition-colors"
        >
          <option value="">전체 팀</option>
          {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select
          value={filter.dan}
          onChange={(e) => setFilter((f) => ({ ...f, dan: e.target.value }))}
          className="border border-ink-200 px-4 py-3 text-sm text-ink focus:outline-none focus:border-ink transition-colors"
        >
          <option value="">전체 단증</option>
          {[5,6,7,8,9].map((d) => <option key={d} value={d}>{d}단</option>)}
        </select>
      </div>

      {/* 테이블 */}
      <div className="border border-ink-200 overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-ink-400 text-sm">로딩 중...</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1.5px solid #111111' }}>
                {['ID','이름','소속팀','단증','포지션','출생연도','신장','전적',''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-medium text-ink-400 uppercase tracking-[0.15em] whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-ink-200 last:border-0 hover:bg-ink-200/20">
                  <td className="px-4 py-3 text-ink-400 text-xs tabular-nums">{p.id}</td>
                  <td className="px-4 py-3 font-semibold text-ink">{p.name}</td>
                  <td className="px-4 py-3 text-ink-600">{p.team_name}</td>
                  <td className="px-4 py-3 text-ink-600 tabular-nums">{p.dan_grade}단</td>
                  <td className="px-4 py-3">
                    {p.position && (
                      <span className="text-[11px] px-2 py-0.5 border border-ink-200 text-ink-600 font-medium">
                        {p.position}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink-600 tabular-nums">{p.birth_year ?? '—'}</td>
                  <td className="px-4 py-3 text-ink-600 tabular-nums">{p.height_cm ? `${p.height_cm}cm` : '—'}</td>
                  <td className="px-4 py-3 text-ink-600 text-xs tabular-nums">
                    {p.total_matches > 0 ? `${p.wins}승 ${p.losses}패` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate(`/admin/players/${p.id}/edit`)}
                        className="flex items-center gap-1 text-xs text-ink border border-ink-200 hover:border-ink px-2.5 py-1.5 rounded-full transition-colors"
                      >
                        <Pencil size={12} />
                        수정
                      </button>
                      <button
                        onClick={() => handleDelete(p)}
                        disabled={deleting === p.id}
                        className="flex items-center gap-1 text-xs text-red-600 border border-red-200 hover:bg-red-50
                                   px-2.5 py-1.5 rounded-full transition-colors disabled:opacity-40"
                      >
                        <Trash2 size={12} />
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-ink-400 text-sm">
                    검색 결과가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
