import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { adminGet, adminDelete } from '../../adminApi.js';

export default function SponsorshipList() {
  const navigate = useNavigate();
  const [list,         setList]         = useState([]);
  const [tournaments,  setTournaments]  = useState([]);
  const [filterTid,    setFilterTid]    = useState('');
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    adminGet('/tournaments').then(setTournaments).catch(console.error);
  }, []);

  useEffect(() => {
    setLoading(true);
    const q = filterTid ? `?tournament_id=${filterTid}` : '';
    adminGet(`/sponsorships${q}`).then(setList).catch(console.error).finally(() => setLoading(false));
  }, [filterTid]);

  const handleDelete = async (s) => {
    if (!window.confirm(`"${s.sponsor_name}" 스폰서십을 삭제합니까?`)) return;
    const res = await adminDelete(`/sponsorships/${s.id}`);
    if (res.ok) setList((prev) => prev.filter((x) => x.id !== s.id));
    else alert('삭제 실패');
  };

  return (
    <div className="p-8">
      <div className="flex items-end justify-between mb-6">
        <div>
          <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium">SPONSORS</p>
          <h1 className="text-3xl font-bold text-ink tracking-[-0.03em] mt-1">스폰서 관리</h1>
          <p className="text-ink-400 text-sm mt-1">총 {list.length}개</p>
        </div>
        <button onClick={() => navigate('/admin/sponsorships/new')}
          className="flex items-center gap-2 bg-ink text-white px-4 py-2.5
                     rounded-full text-sm font-medium hover:bg-ink/90 transition-colors">
          <Plus size={16} />새 스폰서십 등록
        </button>
      </div>

      {/* 대회 필터 */}
      <div className="border border-ink-200 p-4 mb-4">
        <select value={filterTid} onChange={(e) => setFilterTid(e.target.value)}
          className="border border-ink-200 px-4 py-3 text-sm text-ink placeholder:text-ink-400/60 focus:outline-none focus:border-ink transition-colors">
          <option value="">전체 대회</option>
          {tournaments.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      <div className="border border-ink-200 overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-ink-400 text-sm">로딩 중...</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1.5px solid #111111' }}>
                {['ID','대회','스폰서','상품','가치','수량','당첨 조건',''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-medium text-ink-400 uppercase tracking-[0.15em] whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.map((s) => (
                <tr key={s.id} className="border-b border-ink-200 last:border-0 hover:bg-ink-200/20">
                  <td className="px-4 py-3 text-ink-400 text-xs tabular-nums">{s.id}</td>
                  <td className="px-4 py-3 text-ink-600 text-xs max-w-[140px] truncate">{s.tournament_name}</td>
                  <td className="px-4 py-3 font-semibold text-ink">{s.sponsor_name}</td>
                  <td className="px-4 py-3 text-ink-600 max-w-[160px] truncate">{s.reward_name}</td>
                  <td className="px-4 py-3 text-ink-600 whitespace-nowrap tabular-nums">
                    {s.reward_value_krw ? `${Number(s.reward_value_krw).toLocaleString()}원` : '—'}
                  </td>
                  <td className="px-4 py-3 text-ink-600 tabular-nums">{s.reward_quantity ?? '—'}개</td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-lime text-ink px-2 py-0.5 rounded-full font-medium">
                      {s.claim_condition ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => navigate(`/admin/sponsorships/${s.id}/edit`)}
                        className="flex items-center gap-1 text-xs text-ink border border-ink-200 hover:border-ink px-2.5 py-1.5 rounded-full transition-colors">
                        <Pencil size={12} />수정
                      </button>
                      <button onClick={() => handleDelete(s)}
                        className="flex items-center gap-1 text-xs text-red-600 border border-red-200 hover:bg-red-50 px-2.5 py-1.5 rounded-full transition-colors">
                        <Trash2 size={12} />삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-ink-400 text-sm">스폰서십 없음</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
