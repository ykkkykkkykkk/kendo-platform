import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch.js';
import { api } from '../api.js';
import { SkeletonList } from '../components/Skeleton.jsx';

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
      <h1 className="text-2xl font-bold text-navy mb-1">선수</h1>
      <p className="text-sub text-sm mb-4">국내 검도 실업 선수</p>

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
          {filtered.map((p) => {
            const winRate = p.total_matches > 0
              ? Math.round((p.wins / p.total_matches) * 100)
              : null;
            return (
              <Link
                key={p.id}
                to={`/players/${p.slug}`}
                className="bg-card rounded-xl p-4 flex items-center gap-3 active:opacity-70"
              >
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold"
                  style={{ background: p.color_primary ?? '#0A1F44' }}
                >
                  {p.name[0]}
                </div>
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
                {winRate !== null && (
                  <div className="flex-shrink-0 text-right">
                    <p className="text-navy font-bold text-sm">{winRate}%</p>
                    <p className="text-sub text-xs">승률</p>
                  </div>
                )}
              </Link>
            );
          })}
          {filtered.length === 0 && (
            <p className="text-sub text-sm text-center py-8">검색 결과가 없습니다.</p>
          )}
        </div>
      )}
    </main>
  );
}
