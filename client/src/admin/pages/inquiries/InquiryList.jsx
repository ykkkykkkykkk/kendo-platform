import { useState, useEffect } from 'react';
import { adminGet } from '../../adminApi.js';

const STATUS_LABEL = { pending: '검토중', in_progress: '처리중', resolved: '처리완료' };
const STATUS_COLOR = { pending: 'bg-yellow-100 text-yellow-800', in_progress: 'bg-blue-100 text-blue-800', resolved: 'bg-green-100 text-green-800' };
const TOKEN_KEY = 'kendo_admin_token';

const adminPatch = (path, body) =>
  fetch('/api/admin' + path, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'x-admin-token': localStorage.getItem(TOKEN_KEY) ?? '' },
    body: JSON.stringify(body),
  }).then((r) => r.json());

export default function InquiryList() {
  const [inquiries, setInquiries] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [filter,    setFilter]    = useState('pending');
  const [selected,  setSelected]  = useState(null);
  const [reply,     setReply]     = useState('');
  const [saving,    setSaving]    = useState(false);

  const load = async () => {
    setLoading(true);
    const res = await adminGet(`/inquiries${filter ? `?status=${filter}` : ''}`);
    setInquiries(Array.isArray(res) ? res : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  const handleSelect = (q) => {
    setSelected(q);
    setReply(q.admin_reply ?? '');
  };

  const handleSave = async (status) => {
    if (!selected) return;
    setSaving(true);
    await adminPatch(`/inquiries/${selected.id}`, {
      status,
      ...(reply.trim() ? { admin_reply: reply.trim() } : {}),
    });
    setSaving(false);
    setSelected(null);
    load();
  };

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">고객 문의</h1>

      {/* 필터 */}
      <div className="flex gap-2 mb-5">
        {[['', '전체'], ['pending', '검토중'], ['in_progress', '처리중'], ['resolved', '완료']].map(([v, label]) => (
          <button key={v} onClick={() => setFilter(v)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === v ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}>{label}</button>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">불러오는 중...</p>
      ) : inquiries.length === 0 ? (
        <p className="text-gray-400 text-sm">문의가 없습니다.</p>
      ) : (
        <div className="space-y-3">
          {inquiries.map((q) => (
            <div key={q.id} className="bg-white border rounded-xl p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleSelect(q)}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">{q.category}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[q.status]}`}>{STATUS_LABEL[q.status]}</span>
                  </div>
                  <p className="font-semibold text-sm">{q.nickname}</p>
                  <p className="text-gray-600 text-sm mt-1 line-clamp-2">{q.content}</p>
                  {q.admin_reply && (
                    <p className="text-green-600 text-xs mt-1">✓ 답변 완료</p>
                  )}
                </div>
                <p className="text-gray-400 text-xs flex-none">{q.created_at?.slice(0, 10)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 상세 모달 */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">문의 상세</h3>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="flex gap-2 mb-3">
              <span className="text-xs font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">{selected.category}</span>
              <span className="text-xs text-gray-500">{selected.nickname} · {selected.created_at?.slice(0, 10)}</span>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{selected.content}</p>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">답변</label>
              <textarea
                rows={4} value={reply} onChange={(e) => setReply(e.target.value)}
                placeholder="답변을 입력하세요..."
                className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleSave('in_progress')} disabled={saving}
                className="flex-1 py-2.5 bg-blue-500 text-white font-semibold rounded-xl text-sm hover:bg-blue-600 disabled:opacity-50">
                처리중
              </button>
              <button onClick={() => handleSave('resolved')} disabled={saving}
                className="flex-1 py-2.5 bg-green-500 text-white font-semibold rounded-xl text-sm hover:bg-green-600 disabled:opacity-50">
                {saving ? '저장 중...' : '처리완료'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
