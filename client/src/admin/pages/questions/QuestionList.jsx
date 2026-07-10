import { useState, useEffect } from 'react';
import { Trash2, Search } from 'lucide-react';
import { adminGet, adminDelete } from '../../adminApi.js';

export default function QuestionList() {
  const [items,   setItems]   = useState([]);
  const [query,   setQuery]   = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminGet('/questions')
      .then((d) => setItems(Array.isArray(d) ? d : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = items.filter((q) =>
    !query ||
    q.question?.includes(query) ||
    q.answer?.includes(query) ||
    q.player_name?.includes(query) ||
    q.asker?.includes(query)
  );

  const handleDelete = async (q) => {
    if (!window.confirm(`이 질문을 삭제할까요?\n\n"${q.question}"`)) return;
    const res = await adminDelete(`/questions/${q.id}`);
    if (res.ok) setItems((prev) => prev.filter((x) => x.id !== q.id));
    else alert('삭제 실패');
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium">Q&amp;A</p>
        <h1 className="text-3xl font-bold text-ink tracking-[-0.03em] mt-1">선수 Q&amp;A 관리</h1>
        <p className="text-ink-400 text-sm mt-1">부적절한 질문/답변을 삭제할 수 있습니다 · 총 {items.length}건</p>
      </div>

      {/* 검색 */}
      <div className="relative max-w-xs mb-5">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="질문·답변·선수·작성자 검색"
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
                {['선수', '작성자', '질문', '답변', '일시', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-medium text-ink-400 uppercase tracking-[0.15em]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((q) => (
                <tr key={q.id} className="border-b border-ink-200 last:border-0 hover:bg-ink-200/20 align-top">
                  <td className="px-4 py-3 font-semibold text-ink whitespace-nowrap">{q.player_name}</td>
                  <td className="px-4 py-3 text-ink-600 whitespace-nowrap">{q.asker}</td>
                  <td className="px-4 py-3 text-ink max-w-xs">{q.question}</td>
                  <td className="px-4 py-3 max-w-xs">
                    {q.answer
                      ? <span className="text-ink-600">{q.answer}</span>
                      : <span className="text-[10px] border border-ink-200 text-ink-400 px-1.5 py-0.5">미답변</span>}
                  </td>
                  <td className="px-4 py-3 text-ink-400 text-xs tabular-nums whitespace-nowrap">
                    {q.created_at?.replace('T', ' ').slice(0, 16) ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleDelete(q)}
                      className="flex items-center gap-1 text-xs text-red-600 border border-red-200 hover:bg-red-50 px-2.5 py-1.5 rounded-full transition-colors whitespace-nowrap">
                      <Trash2 size={12} />삭제
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-ink-400 text-sm">
                  {items.length === 0 ? '등록된 질문이 없습니다.' : '검색 결과 없음'}
                </td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
