import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch.js';
import { api } from '../api.js';
import { SkeletonList } from '../components/Skeleton.jsx';
import PlayerAvatar from '../components/PlayerAvatar.jsx';
import EmptyState from '../components/EmptyState.jsx';

const POSITION_COLOR = {
  대장: 'bg-navy text-white',
  부장: 'bg-blue-600 text-white',
  중견: 'bg-emerald-600 text-white',
  이봉: 'bg-orange-500 text-white',
  선봉: 'bg-red-500 text-white',
};

export default function PlayerList() {
  const { data: players, loading } = useFetch(api.players);
  const [query, setQuery] = useState('');

  const filtered = players?.filter((p) =>
    p.name.includes(query) || p.team_name.includes(query)
  ) ?? [];

  return (
    <main className="page-body px-4 pt-12">
      <header className="mb-5">
        <p className="text-[10px] text-gold font-medium tracking-[0.2em] uppercase">Players</p>
        <h1 className="text-3xl font-bold text-navy leading-tight">선수 명단</h1>
        <p className="text-ink-400 text-sm mt-1">
          {players ? `총 ${players.length}명` : '국내 검도 실업 선수'}
        </p>
      </header>

      {/* 검색 */}
      <div className="relative mb-5">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-sub" width="16" height="16" viewBox="0 0 24 24" fill="none">
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/>
          <path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="이름 또는 소속팀 검색"
          className="w-full bg-card rounded-xl pl-9 pr-4 py-3 text-sm outline-none text-navy placeholder:text-sub"
        />
      </div>

      {loading ? (
        <SkeletonList count={6} />
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((p) => (
            <Link
              key={p.id}
              to={`/players/${p.slug}`}
              className="bg-card rounded-xl p-4 flex items-center gap-3 active:opacity-70"
            >
              <PlayerAvatar
                slug={p.slug}
                name={p.name}
                color={p.color_primary}
                size={44}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-navy">{p.name}</span>
                  {p.position && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${POSITION_COLOR[p.position] ?? 'bg-gray-200'}`}>
                      {p.position}
                    </span>
                  )}
                </div>
                <p className="text-sub text-xs mt-0.5 truncate">{p.team_name} · {p.dan_grade}단</p>
              </div>
            </Link>
          ))}
          {filtered.length === 0 && (
            <EmptyState
              icon="🔍"
              title="검색 결과가 없습니다"
              desc={`"${query}"와 일치하는 선수 또는 팀이 없습니다`}
              action={
                <button
                  onClick={() => setQuery('')}
                  className="pressable text-xs text-gold font-semibold px-4 py-2 border border-gold rounded-full"
                >
                  초기화
                </button>
              }
            />
          )}
        </div>
      )}
    </main>
  );
}
