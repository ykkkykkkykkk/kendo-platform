import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Send, Loader } from 'lucide-react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import PostComposer from '../components/PostComposer.jsx';
import PlayerFanList from '../components/PlayerFanList.jsx';
import { CHEER_ENABLED } from '../featureFlags.js';

/** 'YYYY-MM-DD HH:MM:SS'(UTC) → '3분 전' */
function since(s) {
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

/* ── 팬 질문 한 건 ──────────────────────────────────────────── */
function QuestionRow({ q, onAnswered }) {
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
      <div className="flex items-baseline gap-2">
        <span className="text-[13px] font-semibold text-ink">{q.nickname}</span>
        <span className="text-[10px] text-ink-400">{since(q.created_at)}</span>
        {!q.answer && (
          <span className="text-[9px] font-bold bg-lime text-ink px-1.5 py-0.5">답변 대기</span>
        )}
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

/* ── 내 글에 달린 팬 댓글 한 건 ─────────────────────────────── */
function CommentRow({ c, onChanged }) {
  const { showToast } = useToast();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  async function heart() {
    setBusy(true);
    try { await api.playerHeart(c.id); onChanged(); }
    finally { setBusy(false); }
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
      {/* 어느 글에 달린 댓글인지 */}
      <p className="text-[10px] text-ink-400 truncate">
        내 글 · {c.post_content ? c.post_content.slice(0, 30) : `[${c.post_type}]`}
      </p>

      <div className="flex items-baseline gap-2 mt-1">
        <span className="text-[13px] font-semibold text-ink">{c.nickname}</span>
        <span className="text-[10px] text-ink-400">{since(c.created_at)}</span>
        {!c.replied && (
          <span className="text-[9px] font-bold bg-lime text-ink px-1.5 py-0.5">답글 대기</span>
        )}
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

/* ── 페이지 ─────────────────────────────────────────────────── */
export default function PlayerInboxPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData]     = useState(null);
  const [loading, setLoad]  = useState(true);
  const [tab, setTab]       = useState('todo');   // todo | question | comment | cheer
  const [fans, setFans]     = useState(null);    // 나를 응원한 팬 (오늘의 응원)

  const load = useCallback(async () => {
    const d = await api.playerInbox();
    setData(d);
    setLoad(false);
    // 응원 목록은 실패해도 받은편지함을 막지 않는다
    if (CHEER_ENABLED) api.playerFans().then((f) => { if (f && !f.error) setFans(f); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (user?.role !== 'player') { setLoad(false); return; }
    load();
  }, [user, load]);

  if (user?.role !== 'player') {
    return (
      <main className="page-body bg-paper min-h-screen px-5 pt-12">
        <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium">PLAYER</p>
        <h1 className="text-4xl font-bold text-ink tracking-[-0.04em] leading-[0.95] mt-1">선수 홈</h1>
        <p className="text-ink-400 text-sm mt-8">선수 계정으로 로그인하면 이용할 수 있어요.</p>
        <button onClick={() => navigate('/')} className="mt-4 text-ink text-sm font-semibold underline">
          홈으로
        </button>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="page-body bg-paper min-h-screen px-5 pt-12">
        <div className="flex items-center gap-2 text-ink-400"><Loader size={16} className="animate-spin" /> 불러오는 중…</div>
      </main>
    );
  }

  const questions = data?.questions ?? [];
  const comments  = data?.comments  ?? [];
  const unanswered = questions.filter((q) => !q.answer);
  const unreplied  = comments.filter((c) => !c.replied);
  const todoCount  = unanswered.length + unreplied.length;

  const TABS = [
    ['todo',     `답할 것 ${todoCount}`],
    ['question', `질문 ${questions.length}`],
    ['comment',  `댓글 ${comments.length}`],
    ...(CHEER_ENABLED ? [['cheer', `응원 ${fans?.totalCount ?? 0}`]] : []),
  ];

  return (
    <main className="page-body bg-paper min-h-screen">
      <header className="px-5 pt-12">
        <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium">PLAYER</p>
        <h1 className="text-4xl font-bold text-ink tracking-[-0.04em] leading-[0.95] mt-1">선수 홈</h1>
        <p className="text-ink-400 text-sm mt-2">
          {data?.player?.name} · {data?.player?.team_name}
        </p>
      </header>

      {/* 소식 올리기 */}
      <div className="px-5 mt-5">
        <PostComposer onPosted={load} />
      </div>

      {/* 탭 */}
      <div className="flex gap-2 px-5 mt-6">
        {TABS.map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-3 py-1.5 text-[12px] font-medium border transition-colors ${
              tab === k ? 'bg-ink text-white border-ink' : 'bg-paper text-ink-600 border-ink-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="px-5 mt-4">
        {tab === 'todo' && (
          todoCount === 0 ? (
            <p className="py-12 text-center text-ink-400 text-sm" style={{ borderTop: '1.5px solid #111111' }}>
              <span className="block mt-8">답할 게 없어요. 다 처리하셨습니다 👏</span>
            </p>
          ) : (
            <div style={{ borderTop: '1.5px solid #111111' }}>
              {unanswered.map((q) => <QuestionRow key={`q${q.id}`} q={q} onAnswered={load} />)}
              {unreplied.map((c) => <CommentRow key={`c${c.id}`} c={c} onChanged={load} />)}
            </div>
          )
        )}

        {tab === 'question' && (
          questions.length === 0 ? (
            <p className="py-12 text-center text-ink-400 text-sm">아직 받은 질문이 없어요.</p>
          ) : (
            <div style={{ borderTop: '1.5px solid #111111' }}>
              {questions.map((q) => <QuestionRow key={q.id} q={q} onAnswered={load} />)}
            </div>
          )
        )}

        {CHEER_ENABLED && tab === 'cheer' && <PlayerFanList data={fans} />}

        {tab === 'comment' && (
          comments.length === 0 ? (
            <p className="py-12 text-center text-ink-400 text-sm">아직 달린 응원이 없어요.</p>
          ) : (
            <div style={{ borderTop: '1.5px solid #111111' }}>
              {comments.map((c) => <CommentRow key={c.id} c={c} onChanged={load} />)}
            </div>
          )
        )}
      </div>
    </main>
  );
}
