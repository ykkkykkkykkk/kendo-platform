import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, Trash2, Send, PlayCircle } from 'lucide-react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import PlayerAvatar from './PlayerAvatar.jsx';

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

/* ── 댓글 한 줄 ─────────────────────────────────────────────── */
function CommentRow({ c, canPlayerAct, playerName, onHeart, onReply }) {
  const [replying, setReplying] = useState(false);
  const [text, setText] = useState('');

  return (
    <div className={`py-2 ${c.parent_id ? 'pl-6' : ''}`}>
      <div className="flex items-baseline gap-1.5 flex-wrap">
        <span className="text-[13px] font-semibold text-ink">{c.nickname}</span>
        {/* 선수 답글은 라임 뱃지로 구분 */}
        {!!c.is_player && (
          <span className="text-[9px] font-bold bg-lime text-ink px-1.5 py-0.5">선수</span>
        )}
        <span className="text-[10px] text-ink-400">{since(c.created_at)}</span>
      </div>
      <p className="text-[13px] text-ink-600 mt-0.5 whitespace-pre-wrap break-words">{c.content}</p>

      <div className="flex items-center gap-3 mt-1">
        {/* 선수가 하트를 누른 댓글 */}
        {!!c.liked_by_player && (
          <span className="text-[11px] text-ink">❤️ {playerName} 선수</span>
        )}
        {canPlayerAct && !c.is_player && (
          <>
            <button
              onClick={() => onHeart(c)}
              className={`text-[11px] pressable ${c.liked_by_player ? 'text-ink font-semibold' : 'text-ink-400'}`}
            >
              {c.liked_by_player ? '하트 취소' : '❤️ 하트'}
            </button>
            <button onClick={() => setReplying((v) => !v)} className="text-[11px] text-ink-400 pressable">
              답글
            </button>
          </>
        )}
      </div>

      {replying && (
        <div className="flex gap-1.5 mt-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && text.trim()) { onReply(c, text.trim()); setText(''); setReplying(false); } }}
            placeholder="답글 달기"
            className="flex-1 border border-ink-200 px-2.5 py-1.5 text-[13px] outline-none focus:border-ink"
          />
          <button
            onClick={() => { if (text.trim()) { onReply(c, text.trim()); setText(''); setReplying(false); } }}
            className="px-3 bg-ink text-white text-[12px]"
          >
            등록
          </button>
        </div>
      )}
    </div>
  );
}

/* ── 글 카드 ────────────────────────────────────────────────── */
export default function PostCard({ post, onChanged, onLoginRequest }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [liked, setLiked]   = useState(!!post.liked);
  const [likes, setLikes]   = useState(post.like_count);
  const [open, setOpen]     = useState(false);
  const [comments, setCms]  = useState(null);
  const [text, setText]     = useState('');
  const [busy, setBusy]     = useState(false);
  const [playing, setPlay]  = useState(false);

  // 이 글이 내(선수) 글이면 댓글에 하트·답글을 달 수 있다
  const canPlayerAct = user?.role === 'player' && user?.playerId === post.player_id;
  const isMine       = canPlayerAct;

  const loadComments = useCallback(async () => {
    const rows = await api.postComments(post.id);
    setCms(Array.isArray(rows) ? rows : []);
  }, [post.id]);

  async function toggleLike() {
    if (!user) return onLoginRequest?.();
    setBusy(true);
    try {
      const res = await api.likePost(post.id);
      const b = await res.json();
      if (res.ok) { setLiked(b.liked); setLikes(b.like_count); }
    } finally { setBusy(false); }
  }

  async function openComments() {
    const next = !open;
    setOpen(next);
    if (next && comments === null) await loadComments();
  }

  async function submitComment() {
    if (!user) return onLoginRequest?.();
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      const res = await api.addComment(post.id, text.trim());
      if (res.ok) { setText(''); await loadComments(); onChanged?.(); }
    } finally { setBusy(false); }
  }

  async function heart(c) {
    await api.playerHeart(c.id);
    await loadComments();
  }

  async function reply(c, content) {
    await api.playerReply(c.id, content);
    await loadComments();
    onChanged?.();
  }

  async function removePost() {
    if (!window.confirm('이 글을 삭제할까요?\n응원과 댓글도 함께 사라집니다.')) return;
    const res = await api.deletePost(post.id);
    if (res.ok) onChanged?.();
  }

  return (
    <article className="border-t border-ink-200 py-4">
      {/* 상단: 선수 */}
      <div className="flex items-center gap-2.5">
        <button onClick={() => navigate(`/players/${post.player_slug}`)} className="pressable shrink-0">
          <PlayerAvatar slug={post.player_slug} name={post.player_name} size={36} />
        </button>
        <div className="min-w-0 flex-1">
          <button
            onClick={() => navigate(`/players/${post.player_slug}`)}
            className="block text-left pressable"
          >
            <span className="text-[14px] font-bold text-ink">{post.player_name}</span>
            {post.team_name && <span className="text-[11px] text-ink-400 ml-1.5">{post.team_name}</span>}
          </button>
          <p className="text-[10px] text-ink-400">{since(post.created_at)}</p>
        </div>
        {isMine && (
          <button onClick={removePost} className="text-ink-400 hover:text-red-600 pressable" aria-label="삭제">
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {/* 본문 */}
      {post.content && (
        <p className="text-[15px] text-ink mt-3 whitespace-pre-wrap break-words leading-relaxed">
          {post.content}
        </p>
      )}

      {post.type === 'image' && post.image_url && (
        <img src={post.image_url} alt="" loading="lazy" className="w-full mt-3 bg-ink-200" />
      )}

      {post.type === 'video' && post.video_id && (
        <div className="relative w-full mt-3 bg-ink-200" style={{ aspectRatio: '16 / 9' }}>
          {playing ? (
            <iframe
              className="absolute inset-0 w-full h-full"
              src={`https://www.youtube.com/embed/${post.video_id}?autoplay=1&rel=0`}
              title="영상" allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            />
          ) : (
            <button onClick={() => setPlay(true)} className="absolute inset-0 w-full h-full group" aria-label="재생">
              <img src={`https://i.ytimg.com/vi/${post.video_id}/hqdefault.jpg`} alt=""
                   className="absolute inset-0 w-full h-full object-cover" />
              <span className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30">
                <span className="w-12 h-12 rounded-full bg-lime flex items-center justify-center">
                  <PlayCircle size={26} strokeWidth={1.6} className="text-ink" />
                </span>
              </span>
            </button>
          )}
        </div>
      )}
      {post.type === 'video' && !post.video_id && post.video_url && (
        <a href={post.video_url} target="_blank" rel="noopener noreferrer"
           className="block text-[13px] text-ink underline mt-3 break-all">{post.video_url}</a>
      )}

      {/* 하단: 응원 · 댓글 */}
      <div className="flex items-center gap-4 mt-3">
        <button onClick={toggleLike} disabled={busy} className="flex items-center gap-1 pressable">
          <Heart size={16} strokeWidth={1.8}
                 className={liked ? 'text-ink' : 'text-ink-400'}
                 fill={liked ? '#D8FF3E' : 'none'} />
          <span className={`text-[12px] tabular-nums ${liked ? 'text-ink font-semibold' : 'text-ink-400'}`}>{likes}</span>
        </button>
        <button onClick={openComments} className="flex items-center gap-1 pressable">
          <MessageCircle size={16} strokeWidth={1.8} className="text-ink-400" />
          <span className="text-[12px] tabular-nums text-ink-400">{post.comment_count}</span>
        </button>
      </div>

      {/* 댓글 */}
      {open && (
        <div className="mt-3 pt-1 border-t border-ink-200">
          {comments === null ? (
            <p className="text-[12px] text-ink-400 py-2">불러오는 중…</p>
          ) : comments.length === 0 ? (
            <p className="text-[12px] text-ink-400 py-2">첫 응원을 남겨보세요.</p>
          ) : (
            comments.map((c) => (
              <CommentRow key={c.id} c={c} canPlayerAct={canPlayerAct}
                          playerName={post.player_name} onHeart={heart} onReply={reply} />
            ))
          )}

          <div className="flex gap-1.5 mt-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submitComment(); }}
              placeholder={user ? '응원 한마디' : '로그인하고 응원하기'}
              className="flex-1 border border-ink-200 px-3 py-2 text-[13px] outline-none focus:border-ink"
            />
            <button onClick={submitComment} disabled={busy || !text.trim()}
                    className="px-3 bg-ink text-white disabled:opacity-40" aria-label="등록">
              <Send size={14} />
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
