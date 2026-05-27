import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, Trophy } from 'lucide-react';
import { adminGet, adminDelete } from '../../adminApi.js';

const STATUS_TABS = ['전체', '예정', '진행', '종료'];
const STATUS_BADGE = {
  예정: 'bg-blue-100 text-blue-700',
  진행: 'bg-green-100 text-green-700',
  종료: 'bg-gray-100 text-gray-500',
};
const TYPE_BADGE = {
  개인전: 'bg-amber-50 text-amber-700',
  단체전: 'bg-purple-50 text-purple-700',
  혼합:   'bg-pink-50 text-pink-700',
};

export default function TournamentList() {
  const navigate = useNavigate();
  const [list,    setList]    = useState([]);
  const [tab,     setTab]     = useState('전체');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminGet('/tournaments')
      .then(setList)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = tab === '전체' ? list : list.filter((t) => t.status === tab);

  const handleDelete = async (t) => {
    if (!window.confirm(`"${t.name}" 대회를 삭제합니다.\n매치·예측 데이터도 모두 삭제됩니다.`)) return;
    const res = await adminDelete(`/tournaments/${t.id}`);
    if (res.ok) setList((prev) => prev.filter((x) => x.id !== t.id));
    else alert('삭제 실패');
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">대회 관리</h1>
          <p className="text-gray-500 text-sm mt-0.5">총 {list.length}개</p>
        </div>
        <button
          onClick={() => navigate('/admin/tournaments/new')}
          className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2.5
                     rounded-xl text-sm font-semibold hover:bg-slate-700 transition-colors"
        >
          <Plus size={16} />
          새 대회 등록
        </button>
      </div>

      {/* 상태 탭 */}
      <div className="flex gap-1 mb-4">
        {STATUS_TABS.map((s) => (
          <button
            key={s}
            onClick={() => setTab(s)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === s
                ? 'bg-slate-800 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            {s}
            {s !== '전체' && (
              <span className="ml-1.5 text-xs opacity-70">
                {list.filter((x) => x.status === s).length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">로딩 중...</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['ID','대회명','시작일','종료일','종목','상태','매치 수',''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-400 text-xs">{t.id}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{t.name}</td>
                  <td className="px-4 py-3 text-gray-600">{t.start_date ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{t.end_date ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_BADGE[t.tournament_type] ?? ''}`}>
                      {t.tournament_type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[t.status] ?? ''}`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{t.match_count}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate(`/admin/tournaments/${t.id}/matches`)}
                        className="flex items-center gap-1 text-xs text-purple-600 bg-purple-50
                                   hover:bg-purple-100 px-2.5 py-1.5 rounded-lg transition-colors"
                      >
                        <Trophy size={12} />
                        대진표
                      </button>
                      <button
                        onClick={() => navigate(`/admin/tournaments/${t.id}/edit`)}
                        className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50
                                   hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors"
                      >
                        <Pencil size={12} />
                        수정
                      </button>
                      <button
                        onClick={() => handleDelete(t)}
                        className="flex items-center gap-1 text-xs text-red-600 bg-red-50
                                   hover:bg-red-100 px-2.5 py-1.5 rounded-lg transition-colors"
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
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400 text-sm">
                    {tab === '전체' ? '등록된 대회가 없습니다.' : `${tab} 상태의 대회가 없습니다.`}
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
