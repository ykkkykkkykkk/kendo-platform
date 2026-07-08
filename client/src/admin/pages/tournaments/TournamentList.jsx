import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, Trophy, Star } from 'lucide-react';
import { adminGet, adminDelete } from '../../adminApi.js';

const STATUS_TABS = ['전체', '예정', '진행', '종료'];
const STATUS_BADGE = {
  예정: 'border border-ink-200 text-ink-600',
  진행: 'bg-lime text-ink',
  종료: 'border border-ink-200 text-ink-400',
};

export default function TournamentList() {
  const navigate = useNavigate();
  const [list,    setList]    = useState([]);
  const [tab,     setTab]     = useState('전체');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminGet('/tournaments')
      .then((d) => setList(Array.isArray(d) ? d : []))
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
      <div className="flex items-end justify-between mb-6">
        <div>
          <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium">TOURNAMENTS</p>
          <h1 className="text-3xl font-bold text-ink tracking-[-0.03em] mt-1">대회 관리</h1>
          <p className="text-ink-400 text-sm mt-1">총 {list.length}개</p>
        </div>
        <button
          onClick={() => navigate('/admin/tournaments/new')}
          className="flex items-center gap-2 bg-ink text-white px-4 py-2.5
                     rounded-full text-sm font-medium hover:bg-ink/90 transition-colors"
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
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              tab === s
                ? 'bg-ink text-white'
                : 'border border-ink-200 text-ink-600 hover:border-ink'
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

      <div className="border border-ink-200 overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-ink-400 text-sm">로딩 중...</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1.5px solid #111111' }}>
                {['ID','대회명','시작일','종료일','종목','상태','매치 수',''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-medium text-ink-400 uppercase tracking-[0.15em] whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} className="border-b border-ink-200 last:border-0 hover:bg-ink-200/20">
                  <td className="px-4 py-3 text-ink-400 text-xs tabular-nums">{t.id}</td>
                  <td className="px-4 py-3 font-semibold text-ink">{t.name}</td>
                  <td className="px-4 py-3 text-ink-600 tabular-nums">{t.start_date ?? '—'}</td>
                  <td className="px-4 py-3 text-ink-600 tabular-nums">{t.end_date ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium border border-ink-200 text-ink-600">
                      {t.tournament_type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[t.status] ?? 'border border-ink-200 text-ink-600'}`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink-600 tabular-nums">{t.match_count}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate(`/admin/tournaments/${t.id}/matches`)}
                        className="flex items-center gap-1 text-xs text-ink border border-ink-200
                                   hover:border-ink px-2.5 py-1.5 rounded-full transition-colors"
                      >
                        <Trophy size={12} />
                        대진표
                      </button>
                      <button
                        onClick={() => navigate(`/admin/tournaments/${t.id}/picks`)}
                        className="flex items-center gap-1 text-xs text-ink border border-ink-200
                                   hover:border-ink px-2.5 py-1.5 rounded-full transition-colors"
                      >
                        <Star size={12} />
                        픽 결과
                      </button>
                      <button
                        onClick={() => navigate(`/admin/tournaments/${t.id}/edit`)}
                        className="flex items-center gap-1 text-xs text-ink border border-ink-200
                                   hover:border-ink px-2.5 py-1.5 rounded-full transition-colors"
                      >
                        <Pencil size={12} />
                        수정
                      </button>
                      <button
                        onClick={() => handleDelete(t)}
                        className="flex items-center gap-1 text-xs text-red-600 border border-red-200
                                   hover:bg-red-50 px-2.5 py-1.5 rounded-full transition-colors"
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
                  <td colSpan={8} className="px-4 py-8 text-center text-ink-400 text-sm">
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
