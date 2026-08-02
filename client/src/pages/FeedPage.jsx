import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { ScrollReveal } from '../components/ScrollReveal.jsx';
import PostCard from '../components/PostCard.jsx';
import { QuestionRow, CommentRow } from '../components/PlayerTodo.jsx';

/** 내가 팔로우한 선수들의 소식 */
export default function FeedPage({ onLoginRequest }) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [posts, setPosts]     = useState([]);
  const [followCount, setFc]  = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [before, setBefore]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [more, setMore]       = useState(false);

  // 선수 계정이면 받은 질문·응원을 함께 띄운다.
  // 선수는 자기 자신을 팔로우하지 않아 피드가 비기 쉬운데, 거기에
  // '선수를 팔로우하세요' 안내를 띄우는 건 선수에게 맞지 않는다.
  const [inbox, setInbox] = useState(null);

  const load = useCallback(async (cursor = null) => {
    cursor ? setMore(true) : setLoading(true);
    const r = await api.feed(cursor);
    if (r?.posts) {
      setPosts((prev) => (cursor ? [...prev, ...r.posts] : r.posts));
      setHasMore(r.has_more);
      setBefore(r.next_before);
      setFc(r.follow_count ?? 0);
    }
    cursor ? setMore(false) : setLoading(false);
  }, []);

  const loadInbox = useCallback(async () => {
    const d = await api.playerInbox();
    if (d && !d.error) setInbox(d);
  }, []);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    load();
    if (user.role === 'player') loadInbox();
  }, [user, load, loadInbox]);

  const isPlayer = user?.role === 'player';
  // 아직 답하지 않은 것 먼저, 그 다음 이미 답한 것
  const qs   = (inbox?.questions ?? []).map((q) => ({ ...q, kind: 'q', pending: !q.answer }));
  const cms  = (inbox?.comments  ?? []).map((c) => ({ ...c, kind: 'c', pending: !c.replied }));
  const todo     = [...qs, ...cms].filter((x) => x.pending);
  const answered = [...qs, ...cms].filter((x) => !x.pending);

  const Header = (
    <header className="px-5 pt-12">
      <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium">FEED</p>
      <h1 className="text-4xl font-bold text-ink tracking-[-0.04em] leading-[0.95] mt-1">소식</h1>
      <p className="text-ink-400 text-sm mt-2">
        {user ? `팔로우한 선수 ${followCount}명의 소식` : '팔로우한 선수들의 소식이 모입니다'}
      </p>
    </header>
  );

  /* 비로그인 */
  if (!user) {
    return (
      <main className="page-body bg-paper min-h-screen">
        {Header}
        <div className="px-5 mt-10 text-center">
          <p className="text-ink-600 text-sm">로그인하면 응원하는 선수의 소식을 볼 수 있어요</p>
          <button onClick={onLoginRequest}
                  className="mt-4 px-5 py-2.5 bg-lime hover:bg-lime-dark text-ink text-sm font-medium rounded-full pressable">
            로그인하기
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="page-body bg-paper min-h-screen">
      {Header}

      {/* 선수 계정이면 글쓰기·질문·응원을 한 곳에서 처리하는 선수 홈으로 안내 */}
      {user.role === 'player' && (
        <div className="px-5 mt-5">
          <button
            onClick={() => navigate('/player')}
            className="w-full flex items-center gap-2 border border-ink px-4 py-3 pressable"
          >
            <span className="text-[10px] font-bold tracking-[0.1em] bg-lime text-ink px-2 py-1">선수</span>
            <span className="text-[13px] text-ink font-medium">소식 올리기 · 질문/응원 답하기</span>
            <span className="flex-1" />
            <span className="text-ink-400 text-sm">→</span>
          </button>
        </div>
      )}

      {/* 선수: 팬이 남긴 질문·응원. 피드가 비어 있어도 여기서 바로 답한다 */}
      {isPlayer && (todo.length > 0 || answered.length > 0) && (
        <div className="px-5 mt-6">
          <div className="flex items-baseline gap-2 mb-1">
            <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium">FROM FANS</p>
            <span className="text-[11px] text-ink-400">팬이 남긴 질문과 응원</span>
            <span className="flex-1" />
            {todo.length > 0 && (
              <span className="text-[10px] font-bold bg-lime text-ink px-1.5 py-0.5">{todo.length}건 대기</span>
            )}
          </div>
          <div style={{ borderTop: '1.5px solid #111111' }}>
            {todo.map((it) => (it.kind === 'q'
              ? <QuestionRow key={`q${it.id}`} q={it} onAnswered={loadInbox} />
              : <CommentRow  key={`c${it.id}`} c={it} onChanged={loadInbox} />))}
            {todo.length === 0 && answered.slice(0, 3).map((it) => (it.kind === 'q'
              ? <QuestionRow key={`q${it.id}`} q={it} onAnswered={loadInbox} />
              : <CommentRow  key={`c${it.id}`} c={it} onChanged={loadInbox} />))}
          </div>
        </div>
      )}

      <div className="px-5 mt-6">
        {loading ? (
          <div className="space-y-4">
            {[0, 1, 2].map((i) => <div key={i} className="h-40 bg-ink-200 animate-pulse" />)}
          </div>
        ) : posts.length === 0 ? (
          /* 빈 상태 — 선수에게는 '선수를 팔로우하세요'가 맞지 않는다 */
          isPlayer ? (
            <div className="py-10 text-center" style={{ borderTop: '1.5px solid #111111' }}>
              <p className="text-ink-400 text-sm mt-6">
                {followCount > 0 ? '팔로우한 선수의 새 소식이 아직 없어요' : '다른 선수를 팔로우하면 그 소식도 여기에 떠요'}
              </p>
              <button onClick={() => navigate('/player')}
                      className="mt-4 px-5 py-2.5 bg-lime hover:bg-lime-dark text-ink text-sm font-medium rounded-full pressable">
                내 소식 올리기
              </button>
            </div>
          ) : (
            <div className="py-16 text-center" style={{ borderTop: '1.5px solid #111111' }}>
              <p className="text-ink text-[15px] font-semibold mt-10">
                응원할 선수를 팔로우하면 여기에 소식이 떠요
              </p>
              <p className="text-ink-400 text-sm mt-2">
                {followCount > 0 ? '아직 올라온 소식이 없어요' : '아직 팔로우한 선수가 없습니다'}
              </p>
              <button onClick={() => navigate('/teams')}
                      className="mt-5 px-5 py-2.5 border border-ink text-ink text-sm font-medium rounded-full pressable">
                선수 둘러보기
              </button>
            </div>
          )
        ) : (
          <>
            {posts.map((p, i) => (
              <ScrollReveal key={p.id} delay={Math.min(i, 6) * 0.04}>
                <PostCard post={p} onChanged={() => load()} onLoginRequest={onLoginRequest} />
              </ScrollReveal>
            ))}

            {hasMore && (
              <button
                onClick={() => load(before)}
                disabled={more}
                className="w-full mt-5 py-3 border border-ink-200 hover:border-ink text-ink-600 text-sm transition-colors disabled:opacity-50"
              >
                {more ? '불러오는 중…' : '20개 더 보기'}
              </button>
            )}
          </>
        )}
      </div>
    </main>
  );
}
