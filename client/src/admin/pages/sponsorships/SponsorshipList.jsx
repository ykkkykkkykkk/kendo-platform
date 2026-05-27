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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">스폰서 관리</h1>
          <p className="text-gray-500 text-sm mt-0.5">총 {list.length}개</p>
        </div>
        <button onClick={() => navigate('/admin/sponsorships/new')}
          className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2.5
                     rounded-xl text-sm font-semibold hover:bg-slate-700 transition-colors">
          <Plus size={16} />새 스폰서십 등록
        </button>
      </div>

      {/* 대회 필터 */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
        <select value={filterTid} onChange={(e) => setFilterTid(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-400">
          <option value="">전체 대회</option>
          {tournaments.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">로딩 중...</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['ID','대회','스폰서','상품','가치','수량','당첨 조건',''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.map((s) => (
                <tr key={s.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-400 text-xs">{s.id}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs max-w-[140px] truncate">{s.tournament_name}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{s.sponsor_name}</td>
                  <td className="px-4 py-3 text-gray-700 max-w-[160px] truncate">{s.reward_name}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                    {s.reward_value_krw ? `${Number(s.reward_value_krw).toLocaleString()}원` : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{s.reward_quantity ?? '—'}개</td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                      {s.claim_condition ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => navigate(`/admin/sponsorships/${s.id}/edit`)}
                        className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg">
                        <Pencil size={12} />수정
                      </button>
                      <button onClick={() => handleDelete(s)}
                        className="flex items-center gap-1 text-xs text-red-600 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-lg">
                        <Trash2 size={12} />삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400 text-sm">스폰서십 없음</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
