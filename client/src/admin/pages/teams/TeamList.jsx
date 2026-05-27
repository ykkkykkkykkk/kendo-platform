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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">팀 관리</h1>
          <p className="text-gray-500 text-sm mt-0.5">총 {teams.length}개 팀</p>
        </div>
        <button
          onClick={() => navigate('/admin/teams/new')}
          className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2.5
                     rounded-xl text-sm font-semibold hover:bg-slate-700 transition-colors"
        >
          <Plus size={16} />새 팀 등록
        </button>
      </div>

      {/* 검색 */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
        <div className="relative max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="팀명 또는 지역 검색"
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm
                       focus:outline-none focus:border-slate-400"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">로딩 중...</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['ID','로고','팀명','지역','창단','우승','선수 수',''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-400 text-xs">{t.id}</td>
                  <td className="px-4 py-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                         style={{ background: t.color_primary ?? '#0A1F44' }}>
                      {t.name[0]}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{t.name}</td>
                  <td className="px-4 py-3 text-gray-600">{t.region ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{t.founded_year ?? '—'}</td>
                  <td className="px-4 py-3 text-amber-600 font-semibold">{t.championships}회</td>
                  <td className="px-4 py-3 text-gray-600">{t.player_count}명</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => navigate(`/admin/teams/${t.id}/edit`)}
                        className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg">
                        <Pencil size={12} />수정
                      </button>
                      <button onClick={() => handleDelete(t)}
                        className="flex items-center gap-1 text-xs text-red-600 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-lg">
                        <Trash2 size={12} />삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400 text-sm">결과 없음</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
