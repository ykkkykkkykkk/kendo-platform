import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch.js';
import { api } from '../api.js';

/* 대회 슬러그 — 지금은 대회가 하나뿐이라 고정. 여러 개가 되면 목록에서 고르게 바꾼다. */
const SLUG = '2026';

/* ── 한쪽 대진 (선수 / N경기 승자 / 조 우승) ───────────────── */
function Side({ s, dark = false }) {
  const navigate = useNavigate();

  if (s.kind === 'player') {
    return (
      <button
        onClick={() => s.slug && navigate(`/players/${s.slug}`)}
        disabled={!s.slug}
        className="flex items-baseline gap-2 min-w-0 text-left pressable disabled:pointer-events-none"
      >
        <span className={`text-[10px] font-medium tabular-nums shrink-0 ${dark ? 'text-white/35' : 'text-ink-400'}`}>
          {String(s.seed).padStart(2, '0')}
        </span>
        <span className={`text-[15px] font-semibold truncate ${dark ? 'text-white' : 'text-ink'}`}>
          {s.name}
        </span>
        <span className={`text-[11px] truncate ${dark ? 'text-white/45' : 'text-ink-400'}`}>
          {s.team}
        </span>
      </button>
    );
  }

  const text = s.kind === 'group_winner' ? `${s.group}조 우승`
             : s.kind === 'from'         ? `${s.number}경기 승자`
             :                             '미정';
  return (
    <span className={`text-[13px] ${dark ? 'text-lime' : 'text-ink-400'}`}>{text}</span>
  );
}

/* ── 경기 한 건 ────────────────────────────────────────────── */
function MatchRow({ m, dark = false }) {
  const line = dark ? 'bg-white/25' : 'bg-ink-200';
  return (
    <div className="flex items-stretch gap-2.5 py-3">
      <span className={`w-7 shrink-0 pt-0.5 text-right text-[11px] font-bold tabular-nums
                        ${dark ? 'text-lime' : 'text-ink-600'}`}>
        {m.number}
      </span>

      {/* 대진 괄호 모양 ┤ */}
      <div className="relative w-2.5 shrink-0" aria-hidden="true">
        <span className={`absolute left-0 top-[26%] bottom-[26%] w-px ${line}`} />
        <span className={`absolute left-0 top-[26%] w-2.5 h-px ${line}`} />
        <span className={`absolute left-0 bottom-[26%] w-2.5 h-px ${line}`} />
      </div>

      <div className="flex-1 min-w-0 flex flex-col gap-2">
        <Side s={m.a} dark={dark} />
        <Side s={m.b} dark={dark} />
      </div>

      {m.winner && (
        <span className={`shrink-0 self-center text-[10px] font-bold px-1.5 py-0.5
                          ${dark ? 'bg-lime text-ink' : 'bg-ink text-white'}`}>
          {m.winner.name}
        </span>
      )}
    </div>
  );
}

/* ── 조 하나 (라운드별 구간) ────────────────────────────────── */
function GroupView({ group }) {
  const rounds = useMemo(() => {
    const byDepth = new Map();
    for (const m of group.matches) {
      if (!byDepth.has(m.round_depth)) byDepth.set(m.round_depth, []);
      byDepth.get(m.round_depth).push(m);
    }
    return [...byDepth.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([depth, matches]) => ({
        depth,
        matches,
        label: matches.some((m) => m.is_group_final) ? '조 결승' : `${depth}회전`,
        isFinal: matches.some((m) => m.is_group_final),
      }));
  }, [group.matches]);

  return (
    <div>
      <div className="flex items-baseline gap-2 pb-3">
        <h2 className="text-2xl font-bold text-ink tracking-[-0.03em]">{group.group}조</h2>
        <span className="text-[11px] text-ink-400">{group.court}</span>
        <span className="flex-1" />
        <span className="text-[11px] text-ink-400">{group.matches.length}경기</span>
      </div>

      {rounds.map((r) => (
        <section key={r.depth} className="mb-1">
          <div className="flex items-center gap-2 pt-4 pb-1">
            <span className={`text-[10px] font-bold tracking-[0.18em] ${r.isFinal ? 'text-ink' : 'text-ink-400'}`}>
              {r.label}
            </span>
            <span className="flex-1 h-px bg-ink-200" />
            <span className="text-[10px] text-ink-400 tabular-nums">{r.matches.length}</span>
          </div>

          {r.isFinal ? (
            <div className="bg-block rounded-2xl px-4 mt-2">
              {r.matches.map((m) => <MatchRow key={m.id} m={m} dark />)}
            </div>
          ) : (
            <div className="divide-y divide-ink-200" style={{ borderTop: '1.5px solid #111111' }}>
              {r.matches.map((m) => <MatchRow key={m.id} m={m} />)}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}

/* ── 페이지 ────────────────────────────────────────────────── */
export default function DrawPage() {
  const { data, loading, error } = useFetch(() => api.draw(SLUG), [SLUG]);
  const [divIdx, setDivIdx] = useState(0);
  const [segment, setSegment] = useState(0);   // 0,1 = 조 / 2 = 결승

  const divisions = data?.divisions ?? [];
  const division  = divisions[divIdx] ?? null;
  const segments  = division
    ? [...division.groups.map((g) => `${g.group}조`), ...(division.final ? ['결승'] : [])]
    : [];

  if (loading) {
    return (
      <main className="page-body bg-paper min-h-screen px-5 pt-12">
        <div className="h-3 w-16 bg-ink-200 animate-pulse" />
        <div className="h-10 w-40 bg-ink-200 animate-pulse mt-3" />
        <div className="flex gap-2 mt-6">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-8 w-24 rounded-full bg-ink-200 animate-pulse" />)}
        </div>
        <div className="mt-8 space-y-4">
          {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="h-16 bg-ink-200 animate-pulse" />)}
        </div>
      </main>
    );
  }

  if (error || !data || data.error || !divisions.length) {
    return (
      <main className="page-body bg-paper min-h-screen px-5 pt-12">
        <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium">DRAW</p>
        <h1 className="text-4xl font-bold text-ink tracking-[-0.04em] leading-[0.95] mt-1">대진표</h1>
        <p className="text-ink-400 text-sm mt-8">아직 등록된 대진표가 없습니다.</p>
      </main>
    );
  }

  return (
    <main className="page-body bg-paper min-h-screen">
      {/* 헤더 */}
      <header className="px-5 pt-12">
        <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium">DRAW</p>
        <h1 className="text-4xl font-bold text-ink tracking-[-0.04em] leading-[0.95] mt-1">대진표</h1>
        <p className="text-ink-400 text-sm mt-2">
          {data.name}
          {data.venue && <> · {data.venue}</>}
        </p>
      </header>

      {/* 부문 탭 */}
      <div className="flex flex-wrap gap-2 px-5 mt-5">
        {divisions.map((d, i) => (
          <button
            key={d.id}
            onClick={() => { setDivIdx(i); setSegment(0); }}
            className={`flex-none px-3.5 py-2 rounded-full text-[13px] font-medium transition-all pressable border ${
              i === divIdx ? 'bg-ink text-white border-ink' : 'bg-paper text-ink-600 border-ink-200'
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>

      {division && (
        <>
          <p className="px-5 mt-3 text-[11px] text-ink-400">
            {division.participant_count}명 참가 · {division.groups.length}개 조 ·{' '}
            {division.groups.reduce((n, g) => n + g.matches.length, 0) + (division.final ? 1 : 0)}경기
          </p>

          {/* 조 / 결승 세그먼트 */}
          <div className="px-5 mt-4">
            <div className="flex border border-ink-200 rounded-full overflow-hidden">
              {segments.map((label, i) => (
                <button
                  key={label}
                  onClick={() => setSegment(i)}
                  className={`flex-1 py-2 text-[12px] font-semibold transition-colors ${
                    i === segment ? 'bg-ink text-white' : 'bg-paper text-ink-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="px-5 mt-6">
            {segment < division.groups.length ? (
              <GroupView group={division.groups[segment]} />
            ) : (
              <div>
                <div className="flex items-baseline gap-2 pb-3">
                  <h2 className="text-2xl font-bold text-ink tracking-[-0.03em]">결승</h2>
                  <span className="text-[11px] text-ink-400">A조 우승 vs B조 우승</span>
                </div>
                <div className="bg-block rounded-2xl px-4">
                  <MatchRow m={division.final} dark />
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </main>
  );
}
