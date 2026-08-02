import { useState } from 'react';
import { Heart, Send } from 'lucide-react';
import { api } from '../api.js';
import { useToast } from '../context/ToastContext.jsx';

/**
 * 선수가 답할 것들 — 팬 질문(Q&A)과 내 글에 달린 응원 댓글.
 * 선수 홈(/player)과 피드(/feed)가 같이 쓴다.
 */

/** 'YYYY-MM-DD HH:MM:SS'(UTC) → '3분 전' */
export function since(s) {
  const t = new Date(String(s).replace(' ', 'T') + 'Z').getTime();
  if (Number.isNaN(t)) return '';
  const min = Math.floor((Date.now() - t) / 60000);
  if (min < 1) return '방금';
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}일 전`;
  return new Date(t).toISOString().slice(0, 10);
}

/* ── 팬 질문 ────────────────────────────────────────────────── */
export function QuestionRow({ q, onAnswered }) {
  const { showToast } = useToast();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      const res = await api.answerQuestion(q.id, text.trim());
      if (!res.ok) throw new Error((await res.json()).error ?? '등록 실패');
      showToast('답변을 남겼어요', 'success');
      setText('');
      onAnswered();
    } catch (e) { showToast(e.message, 'error'); } finally { setBusy(false); }
  }

  return (
    <div className="py-3.5 border-b border-ink-200 last:border-0">
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-[10px] text-ink-400">Q&amp;A</span>
        <span className="text-[13px] font-semibold text-ink">{q.nickname}</span>
        <span className="text-[10px] text-ink-400">{since(q.created_at)}</span>
        {!q.answer && <span className="text-[9px] font-bold bg-lime text-ink px-1.5 py-0.5">답변 대기</span>}
      </div>
      <p className="text-[14px] text-ink mt-1 whitespace-pre-wrap break-words">{q.question}</p>

      {q.answer ? (
        <div className="mt-2 pl-3 border-l-2 border-ink">
          <p className="text-[13px] text-ink-600 whitespace-pre-wrap break-words">{q.answer}</p>
          <p className="text-[10px] text-ink-400 mt-0.5">{since(q.answered_at)} 답변함</p>
        </div>
      ) : (
        <div className="flex gap-1.5 mt-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
            maxLength={300}
            placeholder="답변 남기기"
            className="flex-1 border border-ink-200 px-3 py-2 text-[13px] outline-none focus:border-ink"
          />
          <button onClick={submit} disabled={busy || !text.trim()}
                  className="px-3 bg-ink text-white disabled:opacity-40" aria-label="답변 등록">
            <Send size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

/* ── 내 글에 달린 팬 댓글 ───────────────────────────────────── */
export function CommentRow({ c, onChanged }) {
  const { showToast } = useToast();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  async function heart() {
    setBusy(true);
    try { await api.playerHeart(c.id); onChanged(); } finally { setBusy(false); }
  }

  async function reply() {
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      const res = await api.playerReply(c.id, text.trim());
      if (!res.ok) throw new Error((await res.json()).error ?? '등록 실패');
      showToast('답글을 남겼어요', 'success');
      setText('');
      onChanged();
    } catch (e) { showToast(e.message, 'error'); } finally { setBusy(false); }
  }

  return (
    <div className="py-3.5 border-b border-ink-200 last:border-0">
      <p className="text-[10px] text-ink-400 truncate">
        응원 · 내 글 “{c.post_content ? c.post_content.slice(0, 24) : c.post_type}”
      </p>
      <div className="flex items-baseline gap-2 mt-1 flex-wrap">
        <span className="text-[13px] font-semibold text-ink">{c.nickname}</span>
        <span className="text-[10px] text-ink-400">{since(c.created_at)}</span>
        {!c.replied && <span className="text-[9px] font-bold bg-lime text-ink px-1.5 py-0.5">답글 대기</span>}
      </div>
      <p className="text-[14px] text-ink mt-0.5 whitespace-pre-wrap break-words">{c.content}</p>

      <div className="flex items-center gap-3 mt-1.5">
        <button onClick={heart} disabled={busy} className="flex items-center gap-1 pressable">
          <Heart size={14} strokeWidth={1.8}
                 className={c.liked_by_player ? 'text-ink' : 'text-ink-400'}
                 fill={c.liked_by_player ? '#D8FF3E' : 'none'} />
          <span className={`text-[11px] ${c.liked_by_player ? 'text-ink font-semibold' : 'text-ink-400'}`}>
            {c.liked_by_player ? '하트 누름' : '하트'}
          </span>
        </button>
        {!!c.replied && <span className="text-[11px] text-ink-400">답글 완료</span>}
      </div>

      {!c.replied && (
        <div className="flex gap-1.5 mt-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') reply(); }}
            placeholder="답글 달기"
            className="flex-1 border border-ink-200 px-3 py-2 text-[13px] outline-none focus:border-ink"
          />
          <button onClick={reply} disabled={busy || !text.trim()}
                  className="px-3 bg-ink text-white disabled:opacity-40" aria-label="답글 등록">
            <Send size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
