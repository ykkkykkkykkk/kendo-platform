import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { adminGet, adminDelete } from '../../adminApi.js';

const STATUS_TABS = ['전체', '모집중', '마감', '종료'];
const STATUS_COLOR = {
  모집중: 'bg-green-100 text-green-700',
  마감:   'bg-orange-100 text-orange-700',
  종료:   'bg-gray-100 text-gray-500',
};

export default function ClinicList() {
  const navigate = useNavigate();
  const [list,    setList]    = useState([]);
  const [tab,     setTab]     = useState('전체');
  const [loading, setLoading] = useState(true);

  const load = (status) => {
    setLoading(true);
    const q = status !== '전체' ? `?status=${status}` : '';
    adminGet(`/clinics${q}`).then(setList).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(tab); }, [tab]);

  const handleDelete = async (c) => {
    if (!window.confirm(`"${c.title}" 클리닉을 삭제합니까?\n예약자 데이터도 삭제됩니다.`)) return;
    const res = await adminDelete(`/clinics/${c.id}`);
    if (res.ok) setList((prev) => prev.filter((x) => x.id !== c.id));
    else alert('삭제 실패');
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">클리닉 관리</h1>
          <p className="text-gray-500 text-sm mt-0.5">총 {list.length}개</p>
        </div>
        <button onClick={() => navigate('/admin/clinics/new')}
          className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2.5
                     rounded-xl text-sm font-semibold hover:bg-slate-700 transition-colors">
          <Plus size={16} />새 클리닉 등록
        </button>
      </div>

      {/* 상태 탭 */}
      <div className="flex gap-1 mb-4">
        {STATUS_TABS.map((s) => (
          <button key={s} onClick={() => setTab(s)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === s ? 'bg-slate-800 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}>
            {s}
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
                {['ID','강사','제목','일시','장소','정원/잔여','가격','상태',''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-400 text-xs">{c.id}</td>
                  <td className="px-4 py-3 font-medium text-gray-700">{c.player_name}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900 max-w-[200px] truncate">{c.title}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                    {c.scheduled_at ? c.scheduled_at.replace('T', ' ').slice(0, 16) : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{c.venue ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                    {c.capacity ?? '—'} / {c.remaining_slots ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                    {c.price_krw ? `${Number(c.price_krw).toLocaleString()}원` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[c.status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => navigate(`/admin/clinics/${c.id}/edit`)}
                        className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg">
                        <Pencil size={12} />수정
                      </button>
                      <button onClick={() => handleDelete(c)}
                        className="flex items-center gap-1 text-xs text-red-600 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-lg">
                        <Trash2 size={12} />삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400 text-sm">클리닉 없음</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
