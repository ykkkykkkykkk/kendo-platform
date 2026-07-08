import { useParams, Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, Search } from 'lucide-react';
import { useFetch } from '../hooks/useFetch.js';
import { api } from '../api.js';
import { SkeletonList } from '../components/Skeleton.jsx';
import PlayerAvatar from '../components/PlayerAvatar.jsx';
import TeamLogo from '../components/TeamLogo.jsx';

export default function TeamDetail() {
  const { slug }   = useParams();
  const navigate   = useNavigate();
  const { data: team, loading } = useFetch(() => api.team(slug), [slug]);

  if (loading) return (
    <main className="page-body bg-paper px-5 pt-14">
      <SkeletonList count={4} />
    </main>
  );

  if (!team) return (
    <main className="page-body bg-paper px-5 flex flex-col items-center justify-center gap-3 min-h-[60vh]">
      <p className="text-ink-400 text-sm">팀을 찾을 수 없습니다.</p>
      <button onClick={() => navigate(-1)} className="text-ink text-sm font-semibold pressable">← 뒤로</button>
    </main>
  );

  const players = team.players ?? [];

  return (
    <main className="page-body bg-paper min-h-screen">
      {/* ── 헤더 내비 ── */}
      <div className="px-5 pt-12 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-full border border-ink-200 pressable"
          aria-label="뒤로"
        >
          <ChevronLeft size={18} className="text-ink" />
        </button>
        <button
          onClick={() => navigate('/search')}
          className="w-9 h-9 flex items-center justify-center rounded-full border border-ink-200 text-ink pressable"
          aria-label="선수 검색"
        >
          <Search size={16} strokeWidth={1.8} />
        </button>
      </div>

      {/* ── 팀 헤드라인 ── */}
      <header className="px-5 pt-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium">TEAM</p>
            <h1 className="text-4xl font-bold text-ink tracking-[-0.04em] leading-[0.95] mt-1">
              {team.name}
            </h1>
            <p className="text-ink-400 text-sm mt-2">{team.region} · 창단 {team.founded_year}</p>
          </div>
          <TeamLogo
            name={team.name}
            color={team.color_primary}
            size={56}
            rounded="2xl"
            className="flex-none mt-1"
          />
        </div>

        {/* 스탯 — 룰 테이블 */}
        <div className="flex mt-6" style={{ borderTop: '1.5px solid #111111', borderBottom: '1px solid #E5E5E5' }}>
          <div className="flex-1 py-3">
            <p className="text-[9px] tracking-[0.2em] text-ink-400 font-medium">WINS</p>
            <p className="text-ink font-bold text-2xl tabular-nums mt-0.5">{team.championships ?? '—'}</p>
          </div>
          <div className="flex-1 py-3 border-l border-ink-200 pl-4">
            <p className="text-[9px] tracking-[0.2em] text-ink-400 font-medium">PLAYERS</p>
            <p className="text-ink font-bold text-2xl tabular-nums mt-0.5">{players.length}</p>
          </div>
        </div>
      </header>

      {/* ── 선수 목록 ── */}
      <section className="px-5 pt-8 pb-6">
        <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium mb-3">ROSTER</p>

        {players.length === 0 ? (
          <p className="text-ink-400 text-sm text-center py-8">등록된 선수가 없습니다.</p>
        ) : (
          <div style={{ borderTop: '1.5px solid #111111' }}>
            {players.map((p, i) => (
              <Link
                key={p.id}
                to={`/players/${p.slug}`}
                className={`pressable flex items-center gap-3 py-3.5 ${i > 0 ? 'border-t border-ink-200' : ''}`}
              >
                <PlayerAvatar slug={p.slug} name={p.name} color={team.color_primary} size={40} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-ink text-[15px]">{p.name}</span>
                    {p.position && (
                      <span className="text-[10px] px-2 py-0.5 border border-ink-200 text-ink-600 font-medium">
                        {p.position}
                      </span>
                    )}
                  </div>
                  <p className="text-ink-400 text-xs mt-0.5">
                    {p.dan_grade}단{p.birth_year ? ` · ${p.birth_year}년생` : ''}
                  </p>
                </div>
                <span className="text-ink-400 text-sm flex-none">→</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
