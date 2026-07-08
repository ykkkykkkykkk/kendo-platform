import { Link, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useFetch } from '../hooks/useFetch.js';
import { api } from '../api.js';
import { SkeletonCard } from '../components/Skeleton.jsx';
import PlayerAvatar from '../components/PlayerAvatar.jsx';
import { ScrollReveal } from '../components/ScrollReveal.jsx';

/* ── D-day: "D—9" (em dash) ────────────────────────────── */
function dday(dateStr) {
  if (!dateStr) return null;
  const today  = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  const diff   = Math.round((target - today) / 86400000);
  if (diff > 0)  return `D—${diff}`;
  if (diff === 0) return 'D—DAY';
  return null;
}

/* "2026-06-14" → "06.14" */
const mmdd = (d) => (d ? d.slice(5).replace('-', '.') : '');

/* ── 이번 주 경기 카드 (인쇄물 느낌: 1px 룰, 직각) ──────── */
function MatchCard({ match }) {
  const total    = (match.predict_a_count ?? 0) + (match.predict_b_count ?? 0);
  const hasVotes = total > 0;
  const aPercent = hasVotes ? Math.round((match.predict_a_count / total) * 100) : 50;
  const bPercent = hasVotes ? 100 - aPercent : 50;

  return (
    <div className="flex-shrink-0 w-64 bg-paper border border-ink-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] tracking-[0.2em] text-ink-400 font-medium uppercase">
          {match.round}
        </span>
        {match.status === '진행중' ? (
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-lime rounded-full animate-pulse" />
            <span className="text-[10px] tracking-[0.2em] text-ink font-semibold">LIVE</span>
          </div>
        ) : (
          <span className="text-xs text-ink-400">{match.scheduled_at?.slice(11, 16) ?? '—'}</span>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex-1 text-center">
          <p className="font-bold text-ink text-[14px] leading-tight">{match.player_a_name ?? '미정'}</p>
          <p className="text-ink-400 text-[11px] mt-0.5">{match.team_a_name ?? ''}</p>
        </div>
        <span className="text-xs font-black text-ink-200 flex-shrink-0">VS</span>
        <div className="flex-1 text-center">
          <p className="font-bold text-ink text-[14px] leading-tight">{match.player_b_name ?? '미정'}</p>
          <p className="text-ink-400 text-[11px] mt-0.5">{match.team_b_name ?? ''}</p>
        </div>
      </div>

      <div>
        <div className="flex h-[3px] overflow-hidden bg-ink-200">
          <div className="bg-ink transition-all" style={{ width: `${aPercent}%` }} />
        </div>
        <div className="flex justify-between text-[11px] mt-1.5">
          <span className="text-ink font-semibold">{aPercent}%</span>
          <span className="text-ink-400 text-[10px]">
            {hasVotes ? `${total}명 예측` : '아직 예측 없음'}
          </span>
          <span className="text-ink-400 font-semibold">{bPercent}%</span>
        </div>
      </div>
    </div>
  );
}

/* ── 메인 ──────────────────────────────────────────────── */
export default function Home({ onLoginRequest }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: tournaments, loading: tLoad } = useFetch(api.tournaments);
  const { data: players,     loading: pLoad } = useFetch(api.players);
  const { data: myPicks } = useFetch(
    () => (user ? api.myPicks() : Promise.resolve([])),
    [user?.userId],
  );

  const firstSlug = tournaments?.[0]?.slug;
  const { data: detail } = useFetch(
    () => firstSlug ? api.tournament(firstSlug) : Promise.resolve(null),
    [firstSlug],
  );

  const featured    = players?.filter((p) => p.bio) ?? [];
  const upcoming    = tournaments?.filter((t) => t.status !== '종료') ?? [];
  const hero        = upcoming[0];
  const weekMatches = detail?.bracket?.['16강']?.slice(0, 3) ?? [];
  const latestPick  = Array.isArray(myPicks) ? myPicks[0] : null;

  const pickSlots = [
    { label: '1ST', title: '우승',   name: latestPick?.picks?.first  ?? null },
    { label: '2ND', title: '준우승', name: latestPick?.picks?.second ?? null },
    { label: '3RD', title: '3위',    name: latestPick?.picks?.third_a ?? null },
  ];

  return (
    <main className="page-body bg-paper min-h-screen">

      {/* ── 헤더 ────────────────────────────────────── */}
      <header className="px-5 pt-12">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium">SEASON 26 — KUMDO</p>
            <h1 className="text-2xl font-bold text-ink tracking-[-0.04em] leading-tight mt-0.5">
              MINOR—STAR<span className="align-super text-[10px] font-medium">®</span>
            </h1>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => navigate('/search')}
              className="w-9 h-9 flex items-center justify-center rounded-full border border-ink-200 text-ink pressable"
              aria-label="선수 검색"
            >
              <Search size={16} strokeWidth={1.8} />
            </button>
            <button
              onClick={() => user ? navigate('/me') : onLoginRequest?.()}
              className="w-9 h-9 rounded-full border border-ink flex items-center justify-center pressable"
              aria-label="마이페이지"
            >
              <span className="text-ink text-xs font-bold">
                {user?.nickname?.[0] ?? 'M'}
              </span>
            </button>
          </div>
        </div>
        <div className="mt-4" style={{ borderBottom: '1.5px solid #111111' }} />
      </header>

      {/* ── 대회 히어로 (초대형 타이포) ───────────────── */}
      <section className="px-5 pt-7">
        <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium">NEXT TOURNAMENT</p>

        {tLoad ? (
          <SkeletonCard className="h-32 mt-3" />
        ) : !hero ? (
          <p className="text-ink-400 text-sm mt-3">진행 중인 대회가 없습니다.</p>
        ) : (
          <Link to="/predictions" className="block pressable">
            <h2 className="mt-3 text-5xl font-bold text-ink tracking-[-0.04em] leading-[1.02]">
              {hero.name}
            </h2>
            <div className="mt-5 flex items-center gap-3 text-sm">
              <span className="text-ink font-semibold">{mmdd(hero.start_date)}</span>
              <span className="text-ink-600">{hero.venue}</span>
              <span className="flex-1 border-t border-ink" />
              <span className="text-ink font-bold tracking-tight">
                {dday(hero.start_date) ?? hero.status}
              </span>
            </div>
          </Link>
        )}
      </section>

      {/* ── MY PICKS 반전 블록 ────────────────────────── */}
      <ScrollReveal>
      <section className="px-5 mt-8">
        <div className="bg-block rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] tracking-[0.2em] font-medium" style={{ color: '#D8FF3E' }}>
              MY PICKS
            </p>
            <p className="text-[10px] tracking-[0.2em] text-white/40 font-medium uppercase">
              {latestPick?.division_type ?? 'SEASON 26'}
            </p>
          </div>

          <div className="mt-4">
            {pickSlots.map((s, i) => (
              <div
                key={s.label}
                className={`flex items-baseline gap-3 py-2.5 ${i > 0 ? 'border-t border-white/10' : ''}`}
              >
                <span className="text-[10px] tracking-[0.2em] text-white/40 w-8">{s.label}</span>
                <span className="text-white/60 text-xs w-10">{s.title}</span>
                <span className={`flex-1 text-right font-bold text-[15px] ${s.name ? 'text-white' : 'text-white/25'}`}>
                  {s.name ?? '—'}
                </span>
              </div>
            ))}
          </div>

          <button
            onClick={() => user ? navigate('/predictions') : onLoginRequest?.()}
            className="mt-4 w-full bg-lime hover:bg-lime-dark text-ink rounded-full py-3 text-sm font-medium pressable"
          >
            {latestPick ? '내 픽 확인하기 →' : user ? '픽 입력하기 →' : '로그인하고 픽 입력 →'}
          </button>
        </div>
      </section>
      </ScrollReveal>

      {/* ── 주목 선수 (에디토리얼 리스트) ─────────────── */}
      <section className="px-5 mt-10">
        <div className="flex items-end justify-between">
          <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium">FEATURED PLAYERS</p>
          <button
            onClick={() => navigate('/search')}
            className="text-xs text-ink font-semibold pressable"
          >
            전체 →
          </button>
        </div>

        {pLoad ? (
          <SkeletonCard className="h-40 mt-3" />
        ) : (
          <div className="mt-3" style={{ borderTop: '1.5px solid #111111' }}>
            {featured.slice(0, 6).map((p, i) => (
              <Link
                key={p.id}
                to={`/players/${p.slug}`}
                className={`flex items-center gap-3 py-3 pressable ${i > 0 ? 'border-t border-ink-200' : ''}`}
              >
                <span className="text-[11px] text-ink-400 w-7 tabular-nums font-medium">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <PlayerAvatar
                  slug={p.slug}
                  name={p.name}
                  color={p.color_primary}
                  size={36}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-ink font-bold text-[15px] leading-tight truncate">{p.name}</p>
                  <p className="text-ink-400 text-[11px] mt-0.5 truncate">
                    {p.team_name} · {p.dan_grade}단
                  </p>
                </div>
                <span className="text-ink-400 text-[11px] flex-shrink-0">
                  팬 {(p.fan_count ?? 0).toLocaleString()}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ── 강습 일정 ────────────────────────────────── */}
      <ScrollReveal delay={0.05}>
      <section className="px-5 mt-10">
        <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium">CLINIC</p>
        <div className="mt-3 pt-3 flex items-center gap-3" style={{ borderTop: '1.5px solid #111111' }}>
          <div className="flex-1 min-w-0">
            <p className="text-ink font-bold text-sm">
              강습 신청 <span className="bg-lime px-1">오픈 예정</span>
            </p>
            <p className="text-ink-400 text-xs mt-1">프로 선수 강습 일정을 곧 공개합니다.</p>
          </div>
          <button className="text-ink text-xs font-semibold flex-shrink-0 pressable">알림 받기 →</button>
        </div>
      </section>
      </ScrollReveal>

      {/* ── 이번 주 경기 ─────────────────────────────── */}
      <ScrollReveal delay={0.1}>
      <section className="mt-10">
        <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium px-5">THIS WEEK</p>

        {weekMatches.length === 0 ? (
          <div className="px-5 mt-3">
            <div className="border border-ink-200 p-6 text-ink-400 text-sm text-center">
              경기 일정을 준비 중입니다
            </div>
          </div>
        ) : (
          <div className="scroll-x flex gap-3 px-5 mt-3 pb-1">
            {weekMatches.map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        )}
      </section>
      </ScrollReveal>

      {/* ── 왜 마이너스타? (넘버드 리스트) ─────────────── */}
      <section className="px-5 mt-10 pb-6">
        <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium">WHY MINOR—STAR</p>
        <div className="mt-3" style={{ borderTop: '1.5px solid #111111' }}>
          {[
            { no: '01', title: '선수 응원',   desc: '좋아하는 선수에게 직접 닿는다' },
            { no: '02', title: '예측 + 상품', desc: '맞추면 진짜 검도용품을 받는다' },
            { no: '03', title: '도장 매칭',   desc: '내 동네 도장과 연결된다' },
          ].map((r, i) => (
            <ScrollReveal key={r.no} delay={i * 0.08}>
              <div className={`flex items-baseline gap-4 py-3.5 ${i > 0 ? 'border-t border-ink-200' : ''}`}>
                <span className="text-[11px] text-ink-400 tabular-nums font-medium">{r.no}</span>
                <p className="text-ink font-bold text-[15px] w-24 flex-shrink-0">{r.title}</p>
                <p className="text-ink-400 text-xs">{r.desc}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

    </main>
  );
}
