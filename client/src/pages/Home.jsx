import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useFetch } from '../hooks/useFetch.js';
import { api } from '../api.js';
import { SkeletonCard } from '../components/Skeleton.jsx';
import PlayerAvatar from '../components/PlayerAvatar.jsx';
import { ScrollReveal } from '../components/ScrollReveal.jsx';

function useDarkBody() {
  useEffect(() => {
    document.body.classList.add('predict-dark');
    return () => document.body.classList.remove('predict-dark');
  }, []);
}

/* ── 이번 주 경기 카드 ─────────────────────────────────── */
function MatchCard({ match }) {
  const total    = (match.predict_a_count ?? 0) + (match.predict_b_count ?? 0);
  const hasVotes = total > 0;
  const aPercent = hasVotes ? Math.round((match.predict_a_count / total) * 100) : 50;
  const bPercent = hasVotes ? 100 - aPercent : 50;

  return (
    <div className="flex-shrink-0 w-64 bg-black-900 border border-black-700 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-semibold text-white/50 bg-black-700 px-2 py-0.5 rounded-full">
          {match.round}
        </span>
        {match.status === '진행중' ? (
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
            <span className="text-xs text-red-400 font-semibold">LIVE</span>
          </div>
        ) : (
          <span className="text-xs text-white/30">{match.scheduled_at?.slice(11, 16) ?? '—'}</span>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex-1 text-center">
          <p className="font-bold text-white text-[14px] leading-tight">{match.player_a_name ?? '미정'}</p>
          <p className="text-white/35 text-[11px] mt-0.5">{match.team_a_name ?? ''}</p>
        </div>
        <span className="text-xs font-black text-white/25 flex-shrink-0">VS</span>
        <div className="flex-1 text-center">
          <p className="font-bold text-white text-[14px] leading-tight">{match.player_b_name ?? '미정'}</p>
          <p className="text-white/35 text-[11px] mt-0.5">{match.team_b_name ?? ''}</p>
        </div>
      </div>

      <div>
        <div className="flex h-1.5 rounded-full overflow-hidden bg-black-700">
          <div className="bg-orange-500 transition-all" style={{ width: `${aPercent}%` }} />
          <div className="bg-white/20 transition-all" style={{ width: `${bPercent}%` }} />
        </div>
        <div className="flex justify-between text-[11px] mt-1">
          <span className="text-orange-500 font-semibold">{aPercent}%</span>
          <span className="text-white/25 text-[10px]">
            {hasVotes ? `${total}명 예측` : '아직 예측 없음'}
          </span>
          <span className="text-white/50 font-semibold">{bPercent}%</span>
        </div>
      </div>
    </div>
  );
}

/* ── 왜 검도 팬덤? 카드 ────────────────────────────────── */
function ReasonCard({ icon, title, desc }) {
  return (
    <div className="flex items-center gap-3 bg-black-900 rounded-xl p-3 border border-black-700">
      <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center flex-shrink-0 text-xl">
        {icon}
      </div>
      <div>
        <p className="font-semibold text-white text-sm">{title}</p>
        <p className="text-xs text-white/40 mt-0.5">{desc}</p>
      </div>
    </div>
  );
}

/* ── 메인 ──────────────────────────────────────────────── */
export default function Home() {
  useDarkBody();
  const navigate = useNavigate();
  const { data: tournaments, loading: tLoad } = useFetch(api.tournaments);
  const { data: players,     loading: pLoad } = useFetch(api.players);

  const firstSlug = tournaments?.[0]?.slug;
  const { data: detail } = useFetch(
    () => firstSlug ? api.tournament(firstSlug) : Promise.resolve(null),
    [firstSlug],
  );

  const featured    = players?.filter((p) => p.bio) ?? [];
  const upcoming    = tournaments?.filter((t) => t.status !== '종료') ?? [];
  const weekMatches = detail?.bracket?.['16강']?.slice(0, 3) ?? [];

  return (
    <main className="page-body bg-black min-h-screen">

      {/* ── 헤더 ────────────────────────────────────── */}
      <header className="px-4 pt-12 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] text-orange-500 font-semibold tracking-[0.2em] uppercase">MINOR STAR</p>
            <h1 className="text-3xl font-bold text-white leading-tight">마이너스타</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/search')}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-black-900 text-white/60 pressable"
              aria-label="선수 검색"
            >
              <Search size={18} />
            </button>
            <div className="w-9 h-9 rounded-full bg-black-800 border border-black-700 flex items-center justify-center">
              <span className="text-orange-500 text-xs font-bold">검</span>
            </div>
          </div>
        </div>
        <div className="border-b border-black-700 mt-4" />
      </header>

      {/* ── 대회 히어로 카드 ─────────────────────────── */}
      <section className="mt-4 px-4">
        <h2 className="text-[10px] font-semibold text-white/35 mb-3 uppercase tracking-[0.18em]">대회</h2>

        {tLoad ? (
          <SkeletonCard className="h-36" />
        ) : upcoming.length === 0 ? (
          <p className="text-white/30 text-sm">진행 중인 대회가 없습니다.</p>
        ) : (
          <div className="flex flex-col gap-3 mb-5">
            {upcoming.map((t, i) => (
              <ScrollReveal key={t.id} delay={i * 0.07}>
              <Link
                to={`/predictions`}
                className="relative overflow-hidden rounded-2xl p-5 pressable flex flex-col gap-2
                           bg-gradient-to-br from-[#1C1400] to-[#251900] border border-orange-500/15"
              >
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500 rounded-l-2xl" />

                <div className="flex items-center justify-between pl-2">
                  <span className="text-[11px] font-semibold bg-orange-500/15 text-orange-500 px-2 py-0.5 rounded-full">
                    {t.status}
                  </span>
                  <span className="text-[11px] border border-orange-500/30 text-orange-500/70 rounded-full px-2 py-0.5">
                    {t.tournament_type}
                  </span>
                </div>

                <p className="text-white font-bold text-xl tracking-tight pl-2 leading-snug">
                  {t.name}
                </p>

                <p className="text-white/50 text-xs pl-2">
                  {t.venue}&nbsp;<span className="text-orange-500/60">·</span>&nbsp;{t.start_date}
                </p>

                <div className="pl-2 mt-1">
                  <span className="text-orange-500 text-xs font-semibold">픽 입력하러 가기 →</span>
                </div>
              </Link>
              </ScrollReveal>
            ))}
          </div>
        )}
      </section>

      {/* ── 주목 선수 ────────────────────────────────── */}
      <section className="mt-2">
        <div className="flex items-center justify-between px-4 mb-3">
          <h2 className="text-[10px] font-semibold text-white/35 uppercase tracking-[0.18em]">주목 선수</h2>
          <button
            onClick={() => navigate('/search')}
            className="text-xs text-orange-500 font-semibold pressable"
          >
            전체 →
          </button>
        </div>

        {pLoad ? (
          <div className="px-4"><SkeletonCard className="h-40" /></div>
        ) : (
          <div className="scroll-x snap-x snap-mandatory flex gap-3 px-4 pb-1">
            {featured.map((p) => (
              <Link
                key={p.id}
                to={`/players/${p.slug}`}
                className="flex-shrink-0 w-36 rounded-2xl overflow-hidden snap-start pressable"
                style={{ background: p.color_primary ?? '#0A1F44' }}
              >
                <div className="relative h-40 p-3 flex flex-col">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                      <span className="text-white/90 text-[11px] font-semibold">{p.dan_grade}단</span>
                    </div>
                  </div>

                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <PlayerAvatar
                      slug={p.slug}
                      name={p.name}
                      color={p.color_primary}
                      size={64}
                      className="opacity-80"
                    />
                  </div>

                  <div className="mt-auto relative z-10">
                    <p className="text-white font-semibold text-[15px] leading-tight">{p.name}</p>
                    <p className="text-white/70 text-xs mt-0.5">{p.team_name}</p>
                    <p className="text-white/40 text-[11px] mt-0.5">
                      팬 {(p.fan_count ?? 0).toLocaleString()}명
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ── 강습 일정 ────────────────────────────────── */}
      <ScrollReveal delay={0.05}>
      <section className="mt-6 px-4">
        <h2 className="text-[10px] font-semibold text-white/35 mb-3 uppercase tracking-[0.18em]">강습 일정</h2>
        <div className="bg-black-900 border border-black-700 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center flex-shrink-0">
            <span className="text-xl">🥋</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-white font-semibold text-sm">강습 신청 오픈 예정</p>
              <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse flex-shrink-0" />
            </div>
            <p className="text-white/40 text-xs mt-0.5">프로 선수 강습 일정을 곧 공개합니다.</p>
          </div>
          <button className="text-orange-500 text-xs font-semibold flex-shrink-0">알림 받기 →</button>
        </div>
      </section>
      </ScrollReveal>

      {/* ── 이번 주 경기 ─────────────────────────────── */}
      <ScrollReveal delay={0.1}>
      <section className="mt-6">
        <h3 className="text-[10px] font-semibold text-white/35 mb-3 uppercase tracking-[0.18em] px-4">
          이번 주 경기
        </h3>

        {weekMatches.length === 0 ? (
          <div className="px-4">
            <div className="bg-black-900 border border-black-700 rounded-2xl p-6 text-white/25 text-sm text-center">
              경기 일정을 불러오는 중…
            </div>
          </div>
        ) : (
          <div className="scroll-x flex gap-3 px-4 pb-1">
            {weekMatches.map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        )}
      </section>
      </ScrollReveal>

      {/* ── 왜 검도 팬덤? ─────────────────────────────── */}
      <section className="mt-6 px-4 pb-4">
        <h3 className="text-[10px] font-semibold text-white/35 mb-3 uppercase tracking-[0.18em]">
          왜 마이너스타?
        </h3>
        <div className="flex flex-col gap-2">
          <ScrollReveal delay={0.0}><ReasonCard icon="🏯" title="선수 응원"   desc="좋아하는 선수에게 직접 닿는다" /></ScrollReveal>
          <ScrollReveal delay={0.08}><ReasonCard icon="🎯" title="예측 + 상품" desc="맞추면 진짜 검도용품을 받는다" /></ScrollReveal>
          <ScrollReveal delay={0.16}><ReasonCard icon="📍" title="도장 매칭"   desc="내 동네 도장과 연결된다" /></ScrollReveal>
        </div>
      </section>

    </main>
  );
}
