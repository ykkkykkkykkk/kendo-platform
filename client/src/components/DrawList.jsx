import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * 대진 목록 (조별 · 라운드별 경기).
 * 공개 대진표(/draw)와 관리자 결과 입력(/admin/tournaments/:id/bracket)이 같이 쓴다.
 * canEdit=true면 이긴 선수를 눌러 결과를 입력한다. 공개 페이지는 항상 false.
 */
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
export function MatchRow({ m, dark = false, canEdit = false, onPick }) {
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

export function GroupView({ group, canEdit, onPick }) {
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

