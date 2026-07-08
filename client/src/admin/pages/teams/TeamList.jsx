import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { adminGet, adminDelete } from '../../adminApi.js';

export default function TeamList() {
  const navigate = useNavigate();
  const [teams,   setTeams]   = useState([]);
  const [query,   setQuery]   = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminGet('/teams')
      .then(setTeams)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = teams.filter((t) =>
    !query || t.name.includes(query) || t.region?.includes(query)
  );

  const handleDelete = async (t) => {
    if (!window.confirm(`"${t.name}"을 삭제합니까?`)) return;
    const res  = await adminDelete(`/teams/${t.id}`);
    const data = await res.json();
    if (res.ok) setTeams((prev) => prev.filter((x) => x.id !== t.id));
    else alert(data.error ?? '삭제 실패');
  };

  return (
    <div className="p-8">
      <div className="flex items-end justify-between mb-6">
        <div>
          <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium">TEAMS</p>
          <h1 className="text-3xl font-bold text-ink tracking-[-0.03em] mt-1">팀 관리</h1>
          <p className="text-ink-400 text-sm mt-1">총 {teams.length}개 팀</p>
        </div>
        <button
          onClick={() => navigate('/admin/teams/new')}
          className="flex items-center gap-2 bg-ink text-white px-4 py-2.5
                     rounded-full text-sm font-medium hover:bg-ink/90 transition-colors"
        >
          <Plus size={16} />새 팀 등록
        </button>
      </div>

      {/* 검색 */}
      <div className="relative max-w-xs mb-5">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="팀명 또는 지역 검색"
          className="w-full pl-9 pr-4 py-2.5 border border-ink-200 text-sm text-ink
                     placeholder:text-ink-400/60 focus:outline-none focus:border-ink transition-colors"
        />
      </div>

      <div className="border border-ink-200 overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-ink-400 text-sm">로딩 중...</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1.5px solid #111111' }}>
                {['ID','로고','팀명','지역','창단','우승','선수 수',''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-medium text-ink-400 uppercase tracking-[0.15em]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} className="border-b border-ink-200 last:border-0 hover:bg-ink-200/20">
                  <td className="px-4 py-3 text-ink-400 text-xs tabular-nums">{t.id}</td>
                  <td className="px-4 py-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                         style={{ background: t.color_primary ?? '#111111' }}>
                      {t.name[0]}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-semibold text-ink">{t.name}</td>
                  <td className="px-4 py-3 text-ink-600">{t.region ?? '—'}</td>
                  <td className="px-4 py-3 text-ink-600 tabular-nums">{t.founded_year ?? '—'}</td>
                  <td className="px-4 py-3 text-ink font-semibold tabular-nums">{t.championships}회</td>
                  <td className="px-4 py-3 text-ink-600 tabular-nums">{t.player_count}명</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => navigate(`/admin/teams/${t.id}/edit`)}
                        className="flex items-center gap-1 text-xs text-ink border border-ink-200 hover:border-ink px-2.5 py-1.5 rounded-full transition-colors">
                        <Pencil size={12} />수정
                      </button>
                      <button onClick={() => handleDelete(t)}
                        className="flex items-center gap-1 text-xs text-red-600 border border-red-200 hover:bg-red-50 px-2.5 py-1.5 rounded-full transition-colors">
                        <Trash2 size={12} />삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-ink-400 text-sm">결과 없음</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
