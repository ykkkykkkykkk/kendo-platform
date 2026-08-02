import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { ScrollReveal } from '../components/ScrollReveal.jsx';
import PostCard from '../components/PostCard.jsx';

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

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    load();
  }, [user, load]);

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

      <div className="px-5 mt-6">
        {loading ? (
          <div className="space-y-4">
            {[0, 1, 2].map((i) => <div key={i} className="h-40 bg-ink-200 animate-pulse" />)}
          </div>
        ) : posts.length === 0 ? (
          /* 빈 상태 */
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
