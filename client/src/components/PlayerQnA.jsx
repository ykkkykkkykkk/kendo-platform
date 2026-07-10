import { useState, useEffect } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Math.floor((Date.now() - new Date(dateStr + 'Z')) / 1000);
  if (diff < 60)    return '방금';
  if (diff < 3600)  return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
}

/* 답변 입력 (선수 본인 전용) */
function AnswerBox({ questionId, onAnswered }) {
  const { showToast } = useToast();
  const [open, setOpen]   = useState(false);
  const [text, setText]   = useState('');
  const [busy, setBusy]   = useState(false);

  const submit = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      const res  = await api.answerQuestion(questionId, text.trim());
      const data = await res.json();
      if (!res.ok) { showToast(data.error ?? '답변 실패', 'error'); return; }
      onAnswered(data);
      setOpen(false); setText('');
    } finally { setBusy(false); }
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="mt-2 text-xs text-ink font-semibold border border-ink-200 hover:border-ink px-3 py-1.5 rounded-full transition-colors">
        답변하기
      </button>
    );
  }
  return (
    <div className="mt-2 flex gap-2">
      <textarea
        rows={2} maxLength={300} autoFocus
        placeholder="팬에게 답해주세요..."
        value={text} onChange={(e) => setText(e.target.value)}
        className="flex-1 border border-ink-200 px-3 py-2 text-sm text-ink placeholder:text-ink-400/60 focus:outline-none focus:border-ink resize-none transition-colors"
      />
      <button onClick={submit} disabled={busy || !text.trim()}
        className="bg-lime hover:bg-lime-dark text-ink text-xs font-medium rounded-full px-4 disabled:opacity-40 flex-none pressable">
        등록
      </button>
    </div>
  );
}

export default function PlayerQnA({ slug, playerId, playerName, onLoginRequest }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [questions, setQuestions] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [canAsk,    setCanAsk]    = useState(false);
  const [text,      setText]      = useState('');
  const [posting,   setPosting]   = useState(false);

  const isOwner = user?.role === 'player' && user?.playerId === playerId;

  useEffect(() => {
    api.playerQuestions(slug)
      .then((d) => setQuestions(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (!user || isOwner) { setCanAsk(false); return; }
    api.questionQuota(slug)
      .then((d) => setCanAsk(!!d.canAsk))
      .catch(() => setCanAsk(false));
  }, [user?.userId, slug, isOwner]);

  const ask = async () => {
    if (!text.trim()) return;
    setPosting(true);
    try {
      const res  = await api.askQuestion(slug, text.trim());
      const data = await res.json();
      if (!res.ok) { showToast(data.error ?? '질문 실패', 'error'); return; }
      setQuestions((q) => [data, ...q]);
      setText('');
      setCanAsk(false);
      showToast('질문이 등록됐어요!', 'success');
    } finally { setPosting(false); }
  };

  const onAnswered = (updated) =>
    setQuestions((qs) => qs.map((q) => (q.id === updated.id ? updated : q)));

  return (
    <section className="mt-8">
      <div className="flex items-baseline gap-2 mb-3">
        <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium">Q&amp;A</p>
        <span className="text-[11px] text-ink-400">선수에게 직접 물어보세요 · 하루 1회</span>
      </div>

      {/* ── 질문 입력 영역 ── */}
      <div className="pt-4" style={{ borderTop: '1.5px solid #111111' }}>
        {!user ? (
          <div className="text-center py-4">
            <p className="text-ink-600 text-sm mb-3">로그인하고 {playerName ?? '선수'}에게 질문해보세요.</p>
            <button onClick={onLoginRequest}
              className="bg-lime hover:bg-lime-dark text-ink text-sm font-medium px-5 py-2.5 rounded-full pressable">
              시작하기 →
            </button>
          </div>
        ) : isOwner ? (
          <p className="text-ink-400 text-sm py-2">내 Q&amp;A 페이지예요. 팬들의 질문에 답해보세요. 👇</p>
        ) : canAsk ? (
          <div className="flex gap-2">
            <textarea
              rows={2} maxLength={200}
              placeholder="궁금한 걸 물어보세요 (하루 한 번)"
              value={text} onChange={(e) => setText(e.target.value)}
              className="flex-1 border border-ink-200 px-3 py-2.5 text-sm text-ink placeholder:text-ink-400/60 focus:outline-none focus:border-ink resize-none transition-colors"
            />
            <button onClick={ask} disabled={posting || !text.trim()}
              className="bg-lime hover:bg-lime-dark text-ink text-sm font-medium rounded-full px-5 disabled:opacity-40 flex-none pressable">
              질문
            </button>
          </div>
        ) : (
          <div className="border border-ink-200 px-4 py-3 text-center">
            <p className="text-ink-600 text-sm">오늘은 이미 질문했어요.</p>
            <p className="text-ink-400 text-xs mt-0.5">질문은 <span className="bg-lime px-1 text-ink font-medium">하루에 한 번</span> 할 수 있어요. 내일 또 물어봐 주세요!</p>
          </div>
        )}
      </div>

      {/* ── 질문 목록 ── */}
      {loading ? (
        <div className="flex flex-col gap-2 mt-4">
          {[1, 2].map((i) => <div key={i} className="h-16 bg-ink-200/40 animate-pulse" />)}
        </div>
      ) : questions.length === 0 ? (
        <p className="text-ink-400 text-sm text-center py-8">아직 질문이 없어요. 첫 질문을 남겨보세요!</p>
      ) : (
        <div className="mt-2" style={{ borderTop: '1px solid #E5E5E5' }}>
          {questions.map((q) => (
            <div key={q.id} className="py-4 border-b border-ink-200 last:border-b-0">
              {/* 질문 */}
              <div className="flex items-start gap-2">
                <span className="text-lime-dark font-black text-sm leading-none mt-0.5">Q</span>
                <div className="flex-1 min-w-0">
                  <p className="text-ink text-sm leading-relaxed">{q.question}</p>
                  <p className="text-ink-400 text-[11px] mt-1">{q.asker} · {timeAgo(q.created_at)}</p>
                </div>
              </div>

              {/* 답변 or 답변입력 or 대기 */}
              {q.answer ? (
                <div className="flex items-start gap-2 mt-3 ml-1 pl-3 border-l-2 border-ink">
                  <span className="text-ink font-black text-sm leading-none mt-0.5">A</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[10px] font-semibold bg-lime text-ink px-1.5 py-0.5">{playerName ?? '선수'}</span>
                      <span className="text-ink-400 text-[10px]">{timeAgo(q.answered_at)}</span>
                    </div>
                    <p className="text-ink-600 text-sm leading-relaxed">{q.answer}</p>
                  </div>
                </div>
              ) : isOwner ? (
                <div className="ml-5"><AnswerBox questionId={q.id} onAnswered={onAnswered} /></div>
              ) : (
                <p className="text-ink-400 text-[11px] mt-2 ml-5">답변 대기 중</p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
