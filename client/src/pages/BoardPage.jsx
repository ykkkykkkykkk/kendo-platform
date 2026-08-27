import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, PenLine, Heart, MessageSquare, ImageIcon, PlayCircle, EyeOff } from 'lucide-react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { ScrollReveal } from '../components/ScrollReveal.jsx';
import UserBadge from '../components/UserBadge.jsx';
import { timeAgo } from '../utils/timeAgo.js';

/* ── 글 한 줄 ─────────────────────────────────────────────── */
function PostRow({ post, first }) {
  // 가려진 글은 제목·본문이 서버에서 아예 안 온다. 자리만 남겨 흐름을 끊지 않는다.
  if (post.is_blinded) {
    return (
      <div className={`py-4 ${first ? '' : 'border-t border-ink-200'}`}>
        <div className="flex items-center gap-2 text-ink-400">
          <EyeOff size={14} />
          <p className="text-sm">신고가 누적되어 가려진 글입니다</p>
        </div>
      </div>
    );
  }

  return (
    <Link
      to={`/board/${post.id}`}
      className={`block py-4 pressable ${first ? '' : 'border-t border-ink-200'}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-ink font-bold text-[15px] leading-snug tracking-tight line-clamp-2">
            {post.title}
          </p>
          {post.content && (
            <p className="text-ink-600 text-[13px] mt-1 leading-relaxed line-clamp-2">
              {post.content}
            </p>
          )}

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <UserBadge nickname={post.nickname} dojoName={post.dojo_name} size="sm" />
            <span className="text-ink-200">·</span>
            <span className="text-[11px] text-ink-400">{timeAgo(post.created_at)}</span>

            {post.image_url && <ImageIcon size={12} className="text-ink-400" />}
            {post.video_id  && <PlayCircle   size={13} className="text-ink-400" />}
          </div>
        </div>

        {/* 반응 수치는 오른쪽에 모아 스캔하기 쉽게 */}
        <div className="flex flex-col items-end gap-1 flex-none pt-0.5">
          {post.like_count > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-ink font-semibold tabular-nums">
              <Heart size={11} fill="#111111" strokeWidth={0} />
              {post.like_count}
            </span>
          )}
          {post.comment_count > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-ink-400 tabular-nums">
              <MessageSquare size={11} />
              {post.comment_count}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

/* ── 페이지 ───────────────────────────────────────────────── */
export default function BoardPage({ onLoginRequest }) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [posts,   setPosts]   = useState([]);
  const [page,    setPage]    = useState(1);
  const [total,   setTotal]   = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [more,    setMore]    = useState(false);

  const load = useCallback(async (p) => {
    const d = await api.boardList(p);
    if (!d || d.error) return;
    // 1페이지는 갈아끼우고 그 뒤는 이어붙인다(뒤로가기로 돌아왔을 때 처음부터 다시 보이게)
    setPosts((prev) => (p === 1 ? d.posts : [...prev, ...d.posts]));
    setTotal(d.total);
    setHasMore(d.has_more);
    setPage(p);
  }, []);

  useEffect(() => {
    load(1).finally(() => setLoading(false));
  }, [load]);

  const loadMore = async () => {
    setMore(true);
    await load(page + 1).catch(() => {});
    setMore(false);
  };

  const write = () => {
    if (!user) { onLoginRequest?.(); return; }
    navigate('/board/write');
  };

  return (
    <main className="page-body bg-paper min-h-screen">
      <header className="px-5 pt-12 pb-5 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-full border border-ink-200 pressable"
          aria-label="뒤로"
        >
          <ChevronLeft size={18} className="text-ink" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium">COMMUNITY</p>
          <h1 className="text-ink font-bold text-lg tracking-tight leading-tight">자유게시판</h1>
        </div>
        {total > 0 && <span className="text-[11px] text-ink-400 tabular-nums">{total}개의 글</span>}
      </header>

      <div className="px-5 pb-24">
        {loading ? (
          <div className="flex justify-center pt-20">
            <div className="w-8 h-8 border-2 border-ink border-t-transparent rounded-full animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <div className="py-20 text-center" style={{ borderTop: '1.5px solid #111111' }}>
            <p className="text-ink font-bold text-base mt-10">첫 글의 주인공이 되어보세요</p>
            <p className="text-ink-400 text-xs mt-1.5 mb-6">
              검도 이야기, 장비 질문, 대회 후기 무엇이든 좋아요
            </p>
            <button
              onClick={write}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-lime hover:bg-lime-dark text-ink text-sm font-medium rounded-full pressable"
            >
              <PenLine size={14} /> 글쓰기
            </button>
          </div>
        ) : (
          <>
            <div style={{ borderTop: '1.5px solid #111111' }}>
              {posts.map((p, i) => (
                <ScrollReveal key={p.id} delay={Math.min(i, 5) * 0.04}>
                  <PostRow post={p} first={i === 0} />
                </ScrollReveal>
              ))}
            </div>

            {hasMore && (
              <button
                onClick={loadMore}
                disabled={more}
                className="w-full mt-6 py-3 border border-ink text-ink text-sm font-semibold pressable disabled:opacity-50"
              >
                {more ? '불러오는 중…' : '더 보기'}
              </button>
            )}
          </>
        )}
      </div>

      {/* 글쓰기 — 목록이 길어져도 항상 닿는 자리에 둔다. 하단 탭(60px) 위로 띄운다.
          화면 오른쪽 끝이 아니라 본문 칼럼(480px) 오른쪽에 붙인다 —
          넓은 화면에서 그냥 right-5로 두면 글에서 한참 떨어진 구석에 혼자 떠 있다. */}
      {posts.length > 0 && (
        <div className="fixed left-0 right-0 z-30 pointer-events-none" style={{ bottom: 76 }}>
          <div className="mx-auto w-full max-w-mobile px-5 flex justify-end">
            <button
              onClick={write}
              className="pointer-events-auto w-14 h-14 rounded-full bg-lime hover:bg-lime-dark border-2 border-ink flex items-center justify-center pressable"
              aria-label="글쓰기"
            >
              <PenLine size={20} className="text-ink" />
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
