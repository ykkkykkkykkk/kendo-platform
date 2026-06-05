import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronDown, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { haptic } from '../utils/haptic.js';

const CATEGORIES = ['버그신고', '기능제안', '계정문의', '도장문의', '기타'];

const STATUS_LABEL = { pending: '검토중', in_progress: '처리중', resolved: '처리완료' };
const STATUS_COLOR = { pending: 'text-yellow-400', in_progress: 'text-blue-400', resolved: 'text-green-400' };

function timeAgo(d) {
  const diff = Math.floor((Date.now() - new Date(d + 'Z')) / 1000);
  if (diff < 60) return '방금';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
}

export default function InquiryModal({ onClose }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [view,     setView]    = useState('form');  // 'form' | 'history'
  const [nickname, setNickname]= useState(user?.nickname ?? '');
  const [category, setCategory]= useState('기타');
  const [content,  setContent] = useState('');
  const [loading,  setLoading] = useState(false);
  const [done,     setDone]    = useState(false);
  const [history,  setHistory] = useState(null);
  const [hLoading, setHLoading]= useState(false);

  const loadHistory = async () => {
    setHLoading(true);
    try {
      const res  = await fetch('/api/inquiries/my', {
        headers: { Authorization: `Bearer ${localStorage.getItem('kendo_token')}` },
      });
      setHistory(await res.json());
    } finally { setHLoading(false); }
  };

  const handleViewChange = (v) => {
    setView(v);
    if (v === 'history' && !history) loadHistory();
  };

  const handleSubmit = async () => {
    if (!nickname.trim())        return;
    if (content.trim().length < 5) { showToast('내용을 5자 이상 입력해주세요.', 'error'); return; }
    haptic();
    setLoading(true);
    try {
      const res = await fetch('/api/inquiries', {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('kendo_token')
            ? { Authorization: `Bearer ${localStorage.getItem('kendo_token')}` }
            : {}),
        },
        body: JSON.stringify({ nickname: nickname.trim(), category, content: content.trim() }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setDone(true);
      showToast('문의가 접수됐습니다!', 'success');
    } catch (e) {
      showToast(e.message || '문의 제출 실패', 'error');
    } finally { setLoading(false); }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/75" />
      <motion.div
        className="relative w-full max-w-mobile bg-black-800 rounded-t-2xl border-t border-black-700 flex flex-col max-h-[85vh]"
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="px-6 pt-5 pb-4 flex-none">
          <div className="relative flex items-center justify-center mb-5">
            <div className="w-10 h-1 bg-black-700 rounded-full" />
            <button onClick={onClose} className="absolute right-0 w-8 h-8 rounded-full bg-black-700 flex items-center justify-center text-white/50">
              <X size={15} />
            </button>
          </div>
          <h2 className="text-white font-black text-lg mb-1">고객센터</h2>

          {/* 탭 */}
          <div className="flex gap-1 bg-black-900 p-1 rounded-xl mt-3">
            {[['form', '문의하기'], ['history', '내 문의']].map(([v, label]) => (
              <button key={v} onClick={() => handleViewChange(v)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  view === v ? 'bg-black-700 text-white' : 'text-white/35'
                }`}>{label}</button>
            ))}
          </div>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto px-6 pb-8">
          {view === 'form' ? (
            done ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CheckCircle size={48} className="text-green-400 mb-4" />
                <p className="text-white font-bold text-lg">문의 접수 완료!</p>
                <p className="text-white/40 text-sm mt-2">운영팀이 검토 후 답변드립니다.</p>
                <button onClick={onClose} className="mt-6 px-6 py-2.5 bg-orange-500 text-black font-bold rounded-xl text-sm">
                  확인
                </button>
              </div>
            ) : (
              <div className="space-y-4 pt-2">
                {/* 닉네임 */}
                <div>
                  <label className="text-xs font-medium text-white/40 mb-1 block">닉네임</label>
                  <input
                    type="text" maxLength={10} placeholder="닉네임"
                    value={nickname} onChange={(e) => setNickname(e.target.value)}
                    className="w-full bg-black-900 border border-black-700 rounded-xl px-4 py-3 text-sm text-white
                               placeholder:text-white/20 focus:outline-none focus:border-orange-500 transition-colors"
                  />
                </div>

                {/* 카테고리 */}
                <div>
                  <label className="text-xs font-medium text-white/40 mb-1 block">문의 유형</label>
                  <div className="relative">
                    <select
                      value={category} onChange={(e) => setCategory(e.target.value)}
                      className="w-full appearance-none bg-black-900 border border-black-700 rounded-xl px-4 py-3 text-sm text-white
                                 focus:outline-none focus:border-orange-500 transition-colors"
                    >
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                  </div>
                </div>

                {/* 내용 */}
                <div>
                  <label className="text-xs font-medium text-white/40 mb-1 flex items-center justify-between">
                    <span>문의 내용</span>
                    <span className={content.length > 450 ? 'text-red-400' : 'text-white/25'}>{content.length}/500</span>
                  </label>
                  <textarea
                    rows={5} maxLength={500}
                    placeholder="문의 내용을 입력해주세요 (최소 5자)"
                    value={content} onChange={(e) => setContent(e.target.value)}
                    className="w-full bg-black-900 border border-black-700 rounded-xl px-4 py-3 text-sm text-white
                               placeholder:text-white/20 focus:outline-none focus:border-orange-500 transition-colors resize-none"
                  />
                </div>

                <button
                  onClick={handleSubmit} disabled={loading || !nickname.trim() || content.trim().length < 5}
                  className="w-full bg-orange-500 text-black font-bold py-3.5 rounded-xl text-sm disabled:opacity-50 pressable"
                >
                  {loading ? '제출 중...' : '문의 접수하기'}
                </button>
              </div>
            )
          ) : (
            /* 내 문의 히스토리 */
            <div className="pt-2">
              {hLoading ? (
                <div className="flex flex-col gap-2 animate-pulse">
                  {[1,2].map((i) => <div key={i} className="h-20 bg-black-900 rounded-xl" />)}
                </div>
              ) : !user ? (
                <div className="py-10 text-center">
                  <p className="text-white/30 text-sm">로그인 후 확인할 수 있습니다.</p>
                </div>
              ) : !history?.length ? (
                <div className="py-10 text-center">
                  <p className="text-white/30 text-sm">접수된 문의가 없습니다.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {history.map((q) => (
                    <div key={q.id} className="bg-black-900 border border-black-700 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-orange-500 text-[10px] font-semibold bg-orange-500/10 px-2 py-0.5 rounded-full">
                          {q.category}
                        </span>
                        <span className={`text-[10px] font-semibold ${STATUS_COLOR[q.status]}`}>
                          {STATUS_LABEL[q.status]}
                        </span>
                      </div>
                      <p className="text-white/70 text-sm leading-relaxed">{q.content}</p>
                      <p className="text-white/25 text-[10px] mt-2">{timeAgo(q.created_at)}</p>
                      {q.admin_reply && (
                        <div className="mt-3 pt-3 border-t border-black-700">
                          <p className="text-white/30 text-[10px] mb-1">운영팀 답변</p>
                          <p className="text-white/60 text-sm leading-relaxed">{q.admin_reply}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
