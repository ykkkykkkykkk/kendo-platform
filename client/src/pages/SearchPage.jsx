import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { useFetch } from '../hooks/useFetch.js';
import { api } from '../api.js';
import PlayerAvatar from '../components/PlayerAvatar.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { SkeletonCard } from '../components/Skeleton.jsx';

export default function SearchPage() {
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
    <main className="page-body bg-paper min-h-screen">
      {/* 검색바 헤더 */}
      <div className="sticky top-0 z-40 bg-paper px-5 pt-12 pb-3" style={{ borderBottom: '1.5px solid #111111' }}>
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 border border-ink-200 rounded-full px-3.5 py-2.5">
            <Search size={15} className="text-ink-400 flex-shrink-0" />
            <input
              autoFocus
              type="text"
              placeholder="선수 이름 검색"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink-400 outline-none"
            />
            {query && (
              <button onClick={() => setQuery('')} className="text-ink-400 pressable">
                <X size={14} />
              </button>
            )}
          </div>
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-ink-600 font-medium px-1 flex-shrink-0 pressable"
          >
            취소
          </button>
        </div>
      </div>

      {/* 본문 */}
      <div className="px-5 pt-5 pb-24">
        {loading ? (
          <div className="flex flex-col gap-2">
            <SkeletonCard className="h-16" />
            <SkeletonCard className="h-16" />
            <SkeletonCard className="h-16" />
          </div>
        ) : query.trim() === '' ? (
          <>
            <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium mb-2">
              RECOMMENDED
            </p>
            {recommended.length === 0 ? (
              <p className="text-xs text-ink-400 text-center py-8">선수 이름을 입력하세요</p>
            ) : (
              <div style={{ borderTop: '1.5px solid #111111' }}>
                {recommended.map((p, i) => (
                  <PlayerRow key={p.id} player={p} first={i === 0} />
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
            <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium mb-2">
              RESULTS — {results.length}
            </p>
            <div style={{ borderTop: '1.5px solid #111111' }}>
              {results.map((p, i) => (
                <PlayerRow key={p.id} player={p} first={i === 0} />
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function PlayerRow({ player: p, first }) {
  return (
    <Link
      to={`/players/${p.slug}`}
      className={`flex items-center gap-3 py-3.5 pressable ${first ? '' : 'border-t border-ink-200'}`}
    >
      <PlayerAvatar slug={p.slug} name={p.name} color={p.color_primary} size={40} />
      <div className="flex-1 min-w-0">
        <p className="font-bold text-ink text-sm">{p.name}</p>
        <p className="text-xs text-ink-400 truncate mt-0.5">{p.team_name ?? '소속팀 없음'}</p>
      </div>
      {p.dan_grade && (
        <span className="text-[11px] text-ink-600 font-semibold flex-shrink-0">{p.dan_grade}단</span>
      )}
    </Link>
  );
}
