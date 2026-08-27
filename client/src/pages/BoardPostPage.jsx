import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Heart, MessageSquare, Siren, Trash2, Send, EyeOff, CornerDownRight } from 'lucide-react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { haptic } from '../utils/haptic.js';
import UserBadge from '../components/UserBadge.jsx';
import { timeAgo } from '../utils/timeAgo.js';

/* ── 댓글 한 줄 ───────────────────────────────────────────── */
function CommentRow({ c, reply, onReply, onDelete, onReport, canAct }) {
  const gone = c.is_deleted || c.is_blinded;

  return (
    <div className={`py-3.5 ${reply ? 'pl-7' : ''} border-t border-ink-200`}>
      {reply && <CornerDownRight size={12} className="text-ink-200 inline-block mr-1 -ml-5 align-top mt-1" />}

      <div className="flex items-baseline gap-2 flex-wrap">
        <UserBadge nickname={c.nickname} dojoName={c.dojo_name} size="sm" />
        <span className="text-[10px] text-ink-400">{timeAgo(c.created_at)}</span>
      </div>

      {gone ? (
        <p className="text-[13px] text-ink-400 mt-1 italic">
          {c.is_deleted ? '삭제된 댓글입니다' : '신고가 누적되어 가려진 댓글입니다'}
        </p>
      ) : (
        <p className="text-[14px] text-ink mt-1 whitespace-pre-wrap break-words leading-relaxed">
          {c.content}
        </p>
      )}

      {!gone && canAct && (
        <div className="flex items-center gap-3 mt-1.5">
          {!reply && (
            <button onClick={() => onReply(c.id)} className="text-[11px] text-ink-400 font-medium pressable">
              답글
            </button>
          )}
          {c.is_mine ? (
            <button onClick={() => onDelete(c.id)} className="text-[11px] text-ink-400 font-medium pressable">
              삭제
            </button>
          ) : (
            <button onClick={() => onReport('comment', c.id)} className="text-[11px] text-ink-400 font-medium pressable">
              신고
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ── 페이지 ───────────────────────────────────────────────── */
export default function BoardPostPage({ onLoginRequest }) {
  const { id }   = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [text,    setText]    = useState('');
  const [replyTo, setReplyTo] = useState(null);   // 답글 달 대상 댓글 id
  const [busy,    setBusy]    = useState(false);

  const load = useCallback(async () => {
    const d = await api.boardDetail(id);
    if (d?.error) { setData(null); return; }
    setData(d);
  }, [id]);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  const needLogin = () => { onLoginRequest?.(); };

  /* ── 좋아요 ── */
  const toggleLike = async () => {
    if (!user) return needLogin();
    haptic();
    const res  = await api.boardLike(id);
    const j    = await res.json();
    if (!res.ok) { showToast(j.error ?? '실패했습니다.', 'error'); return; }
    setData((d) => ({ ...d, post: { ...d.post, liked: j.liked, like_count: j.like_count } }));
  };

  /* ── 댓글 ── */
  const submitComment = async () => {
    if (!user) return needLogin();
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      const res = await api.boardComment(id, text.trim(), replyTo ?? undefined);
      const j   = await res.json();
      if (!res.ok) { showToast(j.error ?? '등록에 실패했습니다.', 'error'); return; }
      setText(''); setReplyTo(null);
      await load();
    } finally { setBusy(false); }
  };

  const deleteComment = async (cid) => {
    const res = await api.boardDeleteComment(cid);
    if (!res.ok) { showToast('삭제에 실패했습니다.', 'error'); return; }
    showToast('댓글을 삭제했습니다.', 'info');
    await load();
  };

  /* ── 신고 ── */
  const report = async (targetType, targetId) => {
    if (!user) return needLogin();
    const res = await api.boardReport(targetType, targetId);
    const j   = await res.json();
    if (!res.ok) { showToast(j.error ?? '신고에 실패했습니다.', 'error'); return; }
    if (j.already)      showToast('이미 신고한 대상입니다.', 'info');
    else if (j.blinded) showToast('신고가 누적되어 가려졌습니다.', 'success');
    else                showToast('신고했습니다. 검토 후 조치됩니다.', 'success');
    await load();
  };

  /* ── 글 삭제 ── */
  const deletePost = async () => {
    const res = await api.boardDelete(id);
    if (!res.ok) { showToast('삭제에 실패했습니다.', 'error'); return; }
    showToast('글을 삭제했습니다.', 'info');
    navigate('/board', { replace: true });
  };

  if (loading) return (
    <main className="page-body bg-paper min-h-screen flex justify-center pt-24">
      <div className="w-8 h-8 border-2 border-ink border-t-transparent rounded-full animate-spin" />
    </main>
  );

  if (!data) return (
    <main className="page-body bg-paper min-h-screen px-5 flex flex-col items-center justify-center gap-3">
      <p className="text-ink-400 text-sm">글을 찾을 수 없습니다.</p>
      <button onClick={() => navigate('/board')} className="text-ink text-sm font-semibold pressable">← 목록으로</button>
    </main>
  );

  const { post, comments } = data;
  const roots   = comments.filter((c) => !c.parent_id);
  const repliesOf = (pid) => comments.filter((c) => c.parent_id === pid);

  return (
    <main className="page-body bg-paper min-h-screen">
      <header className="px-5 pt-12 pb-4 flex items-center gap-3">
        <button
          onClick={() => navigate('/board')}
          className="w-9 h-9 flex items-center justify-center rounded-full border border-ink-200 pressable"
          aria-label="목록으로"
        >
          <ChevronLeft size={18} className="text-ink" />
        </button>
        <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium flex-1">COMMUNITY</p>
        {post.is_mine ? (
          <button onClick={deletePost} className="flex items-center gap-1 text-[11px] text-ink-400 font-medium pressable">
            <Trash2 size={13} /> 삭제
          </button>
        ) : (
          <button onClick={() => report('post', post.id)} className="flex items-center gap-1 text-[11px] text-ink-400 font-medium pressable">
            <Siren size={13} /> 신고
          </button>
        )}
      </header>

      <div className="px-5 pb-28">
        {post.is_blinded ? (
          <div className="py-16 text-center" style={{ borderTop: '1.5px solid #111111' }}>
            <EyeOff size={26} className="text-ink-200 mx-auto" />
            <p className="text-ink font-bold text-sm mt-3">신고가 누적되어 가려진 글입니다</p>
            <p className="text-ink-400 text-xs mt-1">관리자 검토 후 처리됩니다</p>
          </div>
        ) : (
          <article style={{ borderTop: '1.5px solid #111111' }}>
            <h1 className="text-ink font-bold text-[22px] leading-snug tracking-tight pt-5">
              {post.title}
            </h1>

            <div className="flex items-center gap-2 mt-2.5">
              <UserBadge nickname={post.nickname} dojoName={post.dojo_name} />
              <span className="text-ink-200">·</span>
              <span className="text-[11px] text-ink-400">{timeAgo(post.created_at)}</span>
            </div>

            <p className="text-ink text-[15px] leading-[1.75] mt-5 whitespace-pre-wrap break-words">
              {post.content}
            </p>

            {post.image_url && (
              <img src={post.image_url} alt="" className="w-full rounded-lg border border-ink-200 mt-5" />
            )}

            {post.video_id && (
              <div className="mt-5 relative w-full overflow-hidden rounded-lg border border-ink-200" style={{ paddingTop: '56.25%' }}>
                <iframe
                  className="absolute inset-0 w-full h-full"
                  src={`https://www.youtube.com/embed/${post.video_id}`}
                  title="첨부 영상"
                  allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}

            {/* 유튜브가 아닌 링크는 임베드가 안 되므로 주소만 남긴다 */}
            {post.video_url && !post.video_id && (
              <a href={post.video_url} target="_blank" rel="noreferrer"
                 className="block mt-4 text-[13px] text-ink underline break-all">
                {post.video_url}
              </a>
            )}

            {/* 좋아요 */}
            <div className="flex justify-center mt-8">
              <button
                onClick={toggleLike}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full border-2 pressable transition-colors ${
                  post.liked ? 'bg-ink border-ink text-white' : 'border-ink text-ink'
                }`}
              >
                <Heart size={16} fill={post.liked ? '#FFFFFF' : 'none'} strokeWidth={2} />
                <span className="text-sm font-bold tabular-nums">{post.like_count}</span>
              </button>
            </div>
          </article>
        )}

        {/* 댓글 */}
        <section className="mt-9">
          <div className="flex items-baseline gap-2 mb-1">
            <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium">COMMENTS</p>
            <span className="text-[11px] text-ink-400 tabular-nums">{comments.length}</span>
          </div>

          <div style={{ borderTop: '1.5px solid #111111' }}>
            {roots.length === 0 ? (
              <p className="py-10 text-center text-ink-400 text-sm">
                <MessageSquare size={20} className="mx-auto mb-2 text-ink-200" />
                첫 댓글을 남겨보세요
              </p>
            ) : (
              roots.map((c) => (
                <div key={c.id}>
                  <CommentRow c={c} onReply={setReplyTo} onDelete={deleteComment} onReport={report} canAct={!!user} />
                  {repliesOf(c.id).map((r) => (
                    <CommentRow key={r.id} c={r} reply onReply={setReplyTo} onDelete={deleteComment} onReport={report} canAct={!!user} />
                  ))}
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* 댓글 입력 — 하단 고정. 탭바(60px) 바로 위에 붙인다. */}
      <div
        className="fixed left-0 right-0 z-30 bg-paper"
        style={{ bottom: 60, borderTop: '1.5px solid #111111' }}
      >
        <div className="mx-auto w-full max-w-mobile px-5 py-3">
          {replyTo && (
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-ink-600">답글 다는 중</span>
              <button onClick={() => setReplyTo(null)} className="text-[11px] text-ink-400 font-medium pressable">
                취소
              </button>
            </div>
          )}
          <div className="flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onFocus={() => { if (!user) needLogin(); }}
              onKeyDown={(e) => { if (e.key === 'Enter') submitComment(); }}
              placeholder={user ? (replyTo ? '답글 달기' : '댓글 달기') : '로그인하고 댓글 남기기'}
              className="flex-1 border border-ink-200 px-3 py-2.5 text-[14px] outline-none focus:border-ink min-w-0"
            />
            <button
              onClick={submitComment}
              disabled={busy || !text.trim()}
              className="px-4 bg-ink text-white disabled:opacity-40 pressable flex items-center justify-center"
              aria-label="댓글 등록"
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
