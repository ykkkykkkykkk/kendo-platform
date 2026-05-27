import { useState, useMemo, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { useFetch } from '../hooks/useFetch.js';
import { api } from '../api.js';
import PlayerAvatar from '../components/PlayerAvatar.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { SkeletonCard } from '../components/Skeleton.jsx';

function useDarkBody() {
  useEffect(() => {
    document.body.classList.add('predict-dark');
    return () => document.body.classList.remove('predict-dark');
  }, []);
}

export default function SearchPage() {
  useDarkBody();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const { data: players, loading } = useFetch(api.players);

  const results = useMemo(() => {
    if (!players || !query.trim()) return [];
    const q = query.trim().toLowerCase();
    return players.filter((p) => p.name.toLowerCase().includes(q));
  }, [players, query]);

  const recommended = useMemo(
    () => players?.filter((p) => p.bio).slice(0, 5) ?? [],
    [players],
  );

  return (
    <main className="page-body bg-black">
      {/* 검색바 헤더 */}
      <div className="sticky top-0 z-40 bg-black px-4 pt-12 pb-3 border-b border-black-700">
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 bg-black-900 rounded-full px-3 py-2.5">
            <Search size={15} className="text-white/40 flex-shrink-0" />
            <input
              autoFocus
              type="text"
              placeholder="선수 이름 검색"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm text-white placeholder:text-white/30 outline-none"
            />
            {query && (
              <button onClick={() => setQuery('')} className="text-white/40 active:opacity-60">
                <X size={14} />
              </button>
            )}
          </div>
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-white/50 font-medium px-1 flex-shrink-0"
          >
            취소
          </button>
        </div>
      </div>

      {/* 본문 */}
      <div className="px-4 pt-4 pb-24">
        {loading ? (
          <div className="flex flex-col gap-2">
            <SkeletonCard className="h-16" />
            <SkeletonCard className="h-16" />
            <SkeletonCard className="h-16" />
          </div>
        ) : query.trim() === '' ? (
          <>
            <p className="text-[11px] text-white/35 font-semibold uppercase tracking-wide mb-3">
              추천 선수
            </p>
            {recommended.length === 0 ? (
              <p className="text-xs text-white/30 text-center py-8">선수 이름을 입력하세요</p>
            ) : (
              <div className="flex flex-col gap-2">
                {recommended.map((p) => (
                  <PlayerRow key={p.id} player={p} />
                ))}
              </div>
            )}
          </>
        ) : results.length === 0 ? (
          <EmptyState
            icon="🔍"
            title={`"${query}" 검색 결과 없음`}
            desc="이름 일부만 입력해도 됩니다"
          />
        ) : (
          <>
            <p className="text-[11px] text-white/35 font-semibold uppercase tracking-wide mb-3">
              검색 결과 {results.length}명
            </p>
            <div className="flex flex-col gap-2">
              {results.map((p) => (
                <PlayerRow key={p.id} player={p} />
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function PlayerRow({ player: p }) {
  return (
    <Link
      to={`/players/${p.slug}`}
      className="flex items-center gap-3 bg-black-900 border border-black-700 rounded-xl p-3 active:opacity-70"
    >
      <PlayerAvatar slug={p.slug} name={p.name} color={p.color_primary} size={44} />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-white text-sm">{p.name}</p>
        <p className="text-xs text-white/40 truncate">{p.team_name ?? '소속팀 없음'}</p>
      </div>
      {p.dan_grade && (
        <span className="text-[11px] text-orange-500 font-semibold flex-shrink-0">{p.dan_grade}단</span>
      )}
    </Link>
  );
}
