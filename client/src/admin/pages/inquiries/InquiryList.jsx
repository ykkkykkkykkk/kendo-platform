import { useState, useEffect } from 'react';
import { adminGet } from '../../adminApi.js';

const STATUS_LABEL = { pending: '검토중', in_progress: '처리중', resolved: '처리완료' };
const STATUS_COLOR = { pending: 'border border-ink-200 text-ink-600', in_progress: 'border border-ink-200 text-ink-600', resolved: 'bg-lime text-ink' };
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
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium">INQUIRIES</p>
        <h1 className="text-3xl font-bold text-ink tracking-[-0.03em] mt-1">고객 문의</h1>
      </div>

      {/* 필터 */}
      <div className="flex gap-2 mb-5">
        {[['', '전체'], ['pending', '검토중'], ['in_progress', '처리중'], ['resolved', '완료']].map(([v, label]) => (
          <button key={v} onClick={() => setFilter(v)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === v ? 'bg-ink text-white' : 'text-ink-600 border border-ink-200 hover:border-ink'
            }`}>{label}</button>
        ))}
      </div>

      {loading ? (
        <p className="text-ink-400 text-sm">불러오는 중...</p>
      ) : inquiries.length === 0 ? (
        <p className="text-ink-400 text-sm">문의가 없습니다.</p>
      ) : (
        <div className="space-y-3">
          {inquiries.map((q) => (
            <div key={q.id} className="border border-ink-200 p-4 cursor-pointer hover:bg-ink-200/20 transition-colors"
              onClick={() => handleSelect(q)}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-ink-600 border border-ink-200 px-2 py-0.5 rounded-full">{q.category}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[q.status]}`}>{STATUS_LABEL[q.status]}</span>
                  </div>
                  <p className="font-semibold text-sm text-ink">{q.nickname}</p>
                  <p className="text-ink-600 text-sm mt-1 line-clamp-2">{q.content}</p>
                  {q.admin_reply && (
                    <p className="mt-1"><span className="text-xs bg-lime text-ink px-1.5 py-0.5 rounded-full font-medium">✓ 답변 완료</span></p>
                  )}
                </div>
                <p className="text-ink-400 text-xs flex-none tabular-nums">{q.created_at?.slice(0, 10)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 상세 모달 */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-paper border border-ink w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-ink">문의 상세</h3>
              <button onClick={() => setSelected(null)} className="text-ink-400 hover:text-ink">✕</button>
            </div>
            <div className="flex gap-2 mb-3">
              <span className="text-xs font-semibold text-ink-600 border border-ink-200 px-2 py-0.5 rounded-full">{selected.category}</span>
              <span className="text-xs text-ink-400">{selected.nickname} · {selected.created_at?.slice(0, 10)}</span>
            </div>
            <div className="border border-ink-200 p-4 mb-4">
              <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap">{selected.content}</p>
            </div>
            <div className="mb-4">
              <label className="text-xs font-medium text-ink-600 mb-1 block">답변</label>
              <textarea
                rows={4} value={reply} onChange={(e) => setReply(e.target.value)}
                placeholder="답변을 입력하세요..."
                className="w-full border border-ink-200 px-4 py-3 text-sm text-ink placeholder:text-ink-400/60 focus:outline-none focus:border-ink transition-colors resize-none"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleSave('in_progress')} disabled={saving}
                className="flex-1 py-2.5 text-ink border border-ink-200 hover:border-ink font-medium rounded-full text-sm transition-colors disabled:opacity-50">
                처리중
              </button>
              <button onClick={() => handleSave('resolved')} disabled={saving}
                className="flex-1 py-2.5 bg-lime text-ink font-medium rounded-full text-sm hover:bg-lime/90 transition-colors disabled:opacity-50">
                {saving ? '저장 중...' : '처리완료'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
