import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch.js';
import { api } from '../api.js';
import { adminGet, adminPost, adminDelete } from '../admin/adminApi.js';

/* 대회 슬러그 — 지금은 대회가 하나뿐이라 고정. 여러 개가 되면 목록에서 고르게 바꾼다. */
const SLUG = '2026';

const labelOf = (s) => s.kind === 'group_winner' ? `${s.group}조 우승`
                     : s.kind === 'from'         ? `${s.number}경기 승자`
                     :                             '미정';

/* ── 한쪽 대진: 이름은 왼쪽, 팀은 오른쪽 정렬 (전광판처럼 읽히게) ──
   관리자면 이긴 선수를 눌러 결과를 입력한다. 일반 사용자는 선수 프로필로 이동. */
function Side({ s, dark = false, canEdit = false, locked = false, onPick, isWinner = false, isLoser = false }) {
  const navigate = useNavigate();

  if (s.kind !== 'player') {
    return (
      <div className="py-1 pl-2">
        <span className={`text-[13px] ${dark ? 'text-lime' : 'text-ink-400'}`}>{labelOf(s)}</span>
      </div>
    );
  }

  const nameColor = dark ? 'text-white'
                  : isWinner ? 'text-ink'
                  : isLoser  ? 'text-[#aaa]'
                  : 'text-ink';
  const teamColor = dark ? 'text-white/45' : isLoser ? 'text-[#c4c4c4]' : 'text-ink-400';

  return (
    <button
      /* locked: 관리자인데 아직 상대가 안 정해진 경기. 프로필로 튀지 않도록 아예 막는다. */
      onClick={() => (canEdit ? onPick?.(s) : s.slug && navigate(`/players/${s.slug}`))}
      disabled={locked || (!canEdit && !s.slug)}
      className="relative w-full flex items-baseline gap-3 py-1 pl-2 text-left pressable disabled:pointer-events-none"
    >
      {/* 승자 표시: 왼쪽 3px 검정 바 */}
      {isWinner && (
        <span className={`absolute left-0 top-0 bottom-0 w-[3px] ${dark ? 'bg-lime' : 'bg-ink'}`} aria-hidden="true" />
      )}
      <span className={`text-[16px] tracking-[-0.02em] truncate ${isLoser ? 'font-normal' : 'font-bold'} ${nameColor}`}>
        {s.name}
      </span>
      <span className="flex-1" />
      <span className={`text-[11px] shrink-0 ${teamColor}`}>{s.team}</span>
    </button>
  );
}

/* ── 경기 한 건 (양쪽 중 실제 선수가 하나라도 있을 때) ───────── */
function MatchRow({ m, dark = false, canEdit = false, onPick }) {
  const bye = (m.a.kind === 'player') !== (m.b.kind === 'player');
  const w = m.winner_participant_id;
  const decided = w != null;
  const isW = (s) => s.kind === 'player' && s.participant_id === w;
  const isL = (s) => decided && s.kind === 'player' && s.participant_id !== w;

  // 양쪽이 다 정해지기 전에는 결과를 입력할 수 없다.
  const ready    = m.a.kind === 'player' && m.b.kind === 'player';
  const editable = canEdit && ready;

  return (
    <div className="py-2.5">
      <div className="flex items-center gap-2 mb-0.5">
        <span className={`text-[11px] font-bold tabular-nums ${dark ? 'text-lime' : 'text-ink'}`}>
          {m.number}경기
        </span>
        {bye && (
          <span className={`text-[10px] px-1.5 py-px rounded-full border
                            ${dark ? 'border-white/25 text-white/55' : 'border-ink-200 text-ink-400'}`}>
            부전승
          </span>
        )}
        {canEdit && !ready && !decided && (
          <span className="text-[10px] text-ink-400">앞 경기 먼저</span>
        )}
        <span className="flex-1" />
        {m.winner && (
          <span className={`text-[10px] font-bold px-1.5 py-0.5 ${dark ? 'bg-lime text-ink' : 'bg-ink text-white'}`}>
            {m.winner.name} 승
          </span>
        )}
      </div>

      <Side s={m.a} dark={dark} canEdit={editable} locked={canEdit && !ready} onPick={() => onPick?.(m, m.a)}
            isWinner={isW(m.a)} isLoser={isL(m.a)} />
      <div className={`h-px ${dark ? 'bg-white/15' : 'bg-ink-200'}`} />
      <Side s={m.b} dark={dark} canEdit={editable} locked={canEdit && !ready} onPick={() => onPick?.(m, m.b)}
            isWinner={isW(m.b)} isLoser={isL(m.b)} />
    </div>
  );
}

/* ── 양쪽 다 '승자 대기'인 경기 — 한 줄로 압축 ───────────────── */
function PendingRow({ m }) {
  return (
    <div className="flex items-baseline gap-2 py-1.5">
      <span className="w-12 shrink-0 text-[11px] font-bold tabular-nums text-ink-600">{m.number}경기</span>
      <span className="text-[12px] text-ink-400 truncate">
        {labelOf(m.a)} <span className="text-ink-200">·</span> {labelOf(m.b)}
      </span>
    </div>
  );
}

/* ── 조 하나 (라운드별 구간) ────────────────────────────────── */
const hasPlayer = (m) => m.a.kind === 'player' || m.b.kind === 'player';

function RoundSection({ round, canEdit, onPick }) {
  // 실제 이름이 있는 경기만 펼쳐 보여주고, '승자 대기'만 있는 경기는 접어둔다.
  const live    = round.matches.filter(hasPlayer);
  const pending = round.matches.filter((m) => !hasPlayer(m));
  const [open, setOpen] = useState(false);

  return (
    <section className="mb-1">
      <div className="flex items-center gap-2.5 pt-6 pb-1.5">
        <span className="text-[12px] font-bold tracking-[0.1em] text-ink">{round.label}</span>
        <span className="flex-1 h-px bg-ink-200" />
        <span className="text-[10px] text-ink-400 tabular-nums">{round.matches.length}경기</span>
      </div>

      {round.isFinal ? (
        <div className="bg-block rounded-2xl px-4 mt-2">
          {round.matches.map((m) => <MatchRow key={m.id} m={m} dark canEdit={canEdit} onPick={onPick} />)}
        </div>
      ) : (
        <>
          {live.length > 0 && (
            <div className="divide-y divide-ink-200" style={{ borderTop: '1.5px solid #111111' }}>
              {live.map((m) => <MatchRow key={m.id} m={m} canEdit={canEdit} onPick={onPick} />)}
            </div>
          )}

          {pending.length > 0 && (
            <div className={live.length ? 'mt-2' : ''}>
              <button
                onClick={() => setOpen((v) => !v)}
                className="w-full flex items-center gap-1.5 py-2 text-[11px] text-ink-400 pressable"
              >
                <span>{open ? '접기' : `승자 대기 ${pending.length}경기 보기`}</span>
                <span className="text-[9px]">{open ? '▲' : '▼'}</span>
                <span className="flex-1 h-px bg-ink-200" />
              </button>
              {open && (
                <div className="pb-1">
                  {pending.map((m) => <PendingRow key={m.id} m={m} />)}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function GroupView({ group, canEdit, onPick }) {
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
      <div className="flex items-baseline gap-2 pb-1">
        <h2 className="text-2xl font-bold text-ink tracking-[-0.03em]">{group.group}조</h2>
        <span className="text-[11px] text-ink-400">{group.court}</span>
        <span className="flex-1" />
        <span className="text-[11px] text-ink-400">{group.matches.length}경기</span>
      </div>

      {rounds.map((r) => <RoundSection key={r.depth} round={r} canEdit={canEdit} onPick={onPick} />)}
    </div>
  );
}

/* ── 페이지 ────────────────────────────────────────────────── */
export default function DrawPage() {
  const { data, loading, error, refetch } = useFetch(() => api.draw(SLUG), [SLUG]);
  const [divIdx, setDivIdx] = useState(0);
  const [segment, setSegment] = useState(0);   // 0,1 = 조 / 2 = 결승
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  // 관리자 편집 UI는 토큰이 '있다'가 아니라 '유효하다'를 확인하고 켠다.
  // 토큰은 계정이 아니라 기기(localStorage)에 저장되므로, 존재 여부만 보면
  // 예전에 그 브라우저에서 관리자로 들어간 적이 있을 때 일반 계정에도 편집 UI가 보인다.
  const [admin, setAdmin] = useState(false);
  useEffect(() => {
    if (!localStorage.getItem('kendo_admin_token')) return;
    let alive = true;
    adminGet('/bracket/auth')
      .then((r) => {
        if (!alive) return;
        setAdmin(r?.ok === true);
        // 서버가 거부한 토큰은 쓸모없으니 지운다(다음 방문부터 확인 요청도 안 나간다).
        // 네트워크 실패는 catch로 빠지므로 여기서 지워지지 않는다.
        if (r?.error) localStorage.removeItem('kendo_admin_token');
      })
      .catch(() => { if (alive) setAdmin(false); });
    return () => { alive = false; };
  }, []);

  /* 관리자: 이긴 선수 클릭 → 저장 + 자동 진출 / 승자 재클릭 → 결과 취소(연쇄) */
  async function handlePick(m, side) {
    if (!admin || busy || side.kind !== 'player') return;
    setErr('');

    const already = m.winner_participant_id === side.participant_id;
    if (already) {
      if (!window.confirm(`${m.number}경기 결과를 취소할까요?\n이 승자가 올라간 다음 라운드도 함께 취소됩니다.`)) return;
      setBusy(true);
      try {
        const res = await adminDelete(`/bracket/matches/${m.id}/result`);
        if (!res.ok) throw new Error((await res.json()).error ?? '취소 실패');
        await refetch();
      } catch (e) { setErr(e.message); } finally { setBusy(false); }
      return;
    }

    setBusy(true);
    try {
      const res = await adminPost(`/bracket/matches/${m.id}/result`, {
        winner_participant_id: side.participant_id,
      });
      if (!res.ok) throw new Error((await res.json()).error ?? '저장 실패');
      await refetch();
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

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

          {(admin || busy) && (
            <div className="px-5 mt-4 flex items-center gap-2">
              {admin && (
                <span className="text-[10px] font-bold tracking-[0.1em] bg-lime text-ink px-2 py-1">
                  ADMIN · 이긴 선수 클릭
                </span>
              )}
              <span className="flex-1" />
              {busy && <span className="text-[10px] text-ink-400">저장 중…</span>}
            </div>
          )}
          {err && <p className="px-5 mt-2 text-[11px] text-red-600">{err}</p>}

          {segment < division.groups.length ? (
            <div className="px-5 mt-6">
              <GroupView group={division.groups[segment]} canEdit={admin && !busy} onPick={handlePick} />
            </div>
          ) : (
            <div className="px-5 mt-6">
              <div className="flex items-baseline gap-2 pb-3">
                <h2 className="text-2xl font-bold text-ink tracking-[-0.03em]">결승</h2>
                <span className="text-[11px] text-ink-400">A조 우승 vs B조 우승</span>
              </div>
              <div className="bg-block rounded-2xl px-4">
                <MatchRow m={division.final} dark canEdit={admin && !busy} onPick={handlePick} />
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}
