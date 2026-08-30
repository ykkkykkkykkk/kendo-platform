import { useState, useEffect, useMemo, useCallback } from 'react';
import { useFetch } from '../hooks/useFetch.js';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import BracketDiagram, { RANKS } from '../components/BracketDiagram.jsx';
import { PickSummaryBar, RankPopover } from '../components/BracketPickBar.jsx';

/* 어느 대회를 먼저 보여줄지. 지금 열려 있는 대회가 먼저다 —
   종료된 대회를 기본으로 띄우면 픽을 넣을 수 없는 화면이 첫 화면이 된다. */
const STATUS_ORDER = { 진행: 0, 예정: 1, 종료: 2 };

/* 대진표를 보면서 그 자리에서 우승 예측을 한다.
   따로 픽 화면으로 들어가 명단에서 고르는 것보다, 대진을 보며 고르는 편이 자연스럽다.
   저장은 기존 픽 API를 그대로 쓴다(1등·2등·3등 둘 = 네 자리). */
export default function DrawPage() {
  const { data: tData, loading: tLoading } = useFetch(() => api.tournaments(), []);

  const tournaments = useMemo(() => {
    const list = Array.isArray(tData) ? tData : [];
    return [...list].sort((a, b) =>
      (STATUS_ORDER[a.status] ?? 3) - (STATUS_ORDER[b.status] ?? 3) ||
      String(b.start_date ?? '').localeCompare(String(a.start_date ?? '')));
  }, [tData]);

  const [slug, setSlug] = useState(null);
  useEffect(() => {
    if (slug == null && tournaments.length) setSlug(tournaments[0].slug);
  }, [tournaments, slug]);

  const { data, loading, error } = useFetch(slug ? () => api.draw(slug) : null, [slug]);
  const { user } = useAuth();
  const { showToast } = useToast();

  const [divIdx, setDivIdx] = useState(0);
  const [picks,  setPicks]  = useState({});     // { pick_1st: participantId, ... }
  const [meta,   setMeta]   = useState(null);   // { is_locked, pick_deadline }
  const [popAt,  setPopAt]  = useState(null);   // 팝오버 위치
  const [team,   setTeam]   = useState(null);   // 팝오버 대상 팀
  const [saving, setSaving] = useState(false);
  const [now,    setNow]    = useState(Date.now());

  const divisions = data?.divisions ?? [];
  const division  = divisions[divIdx] ?? null;

  /* 대회를 바꾸면 부문 번호가 그대로 남아 엉뚱한 부문(또는 없는 부문)을 가리킨다 */
  useEffect(() => { setDivIdx(0); }, [slug]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  /* 부문을 바꾸면 그 부문의 내 픽을 다시 불러온다 */
  useEffect(() => {
    setPicks({}); setMeta(null); setPopAt(null);
    if (!division || !user) return;
    let alive = true;
    api.myPick(division.id)
      .then((d) => {
        if (!alive || !d) return;
        const p = d.pick ?? d;
        setPicks({
          pick_1st:   p?.pick_1st   ?? null,
          pick_2nd:   p?.pick_2nd   ?? null,
          pick_3rd_a: p?.pick_3rd_a ?? null,
          pick_3rd_b: p?.pick_3rd_b ?? null,
        });
        setMeta({ is_locked: !!p?.is_locked });
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [division?.id, user]);

  /* 참가자 id → 이름 (요약 바에서 쓴다) */
  const nameById = useMemo(() => {
    const map = new Map();
    for (const g of division?.groups ?? []) {
      for (const m of g.matches) {
        for (const s of [m.a, m.b]) {
          if (s?.kind === 'player' && s.participant_id != null) map.set(s.participant_id, s.name);
        }
      }
    }
    return map;
  }, [division]);

  /* 배지를 그리려면 participant_id → 순위 로 뒤집어야 한다 */
  const byParticipant = useMemo(() => {
    const o = {};
    for (const r of RANKS) if (picks[r.key] != null) o[picks[r.key]] = r.key;
    return o;
  }, [picks]);

  // 마감은 부문마다 다르다(개인전은 끝났는데 단체전은 아직 받는 식)
  const deadline = division?.pick_deadline ? new Date(division.pick_deadline).getTime() : null;
  const closed   = deadline != null && now > deadline;
  const locked   = !!meta?.is_locked;
  const editable = !!user && !closed && !locked;
  const complete = RANKS.every((r) => picks[r.key] != null);

  const tapTeam = useCallback((side, e) => {
    if (!editable) {
      if (!user) showToast('로그인하면 우승 예측을 할 수 있어요.', 'error');
      else if (locked) showToast('이미 확정한 픽입니다.', 'error');
      else if (closed) showToast('픽이 마감됐습니다.', 'error');
      return;
    }
    setTeam(side);
    setPopAt({ x: e.clientX, y: e.clientY });
  }, [editable, user, locked, closed, showToast]);

  /* 한 순위엔 한 팀만. 이미 다른 팀이 그 자리면 밀어내고, 같은 팀이 다른 자리면 옮긴다. */
  const choose = (rankKey) => {
    setPicks((prev) => {
      const next = { ...prev };
      for (const r of RANKS) if (next[r.key] === team.participant_id) next[r.key] = null;
      next[rankKey] = team.participant_id;
      return next;
    });
    setPopAt(null);
  };
  const clear = () => {
    setPicks((prev) => {
      const next = { ...prev };
      for (const r of RANKS) if (next[r.key] === team.participant_id) next[r.key] = null;
      return next;
    });
    setPopAt(null);
  };

  /* 서버는 네 자리를 모두 받아야 저장한다. 확정 버튼에서 저장 후 잠근다. */
  const submit = async () => {
    if (!complete) return;
    setSaving(true);
    try {
      const res = await api.submitPick(division.id, {
        pick_1st: picks.pick_1st, pick_2nd: picks.pick_2nd,
        pick_3rd_a: picks.pick_3rd_a, pick_3rd_b: picks.pick_3rd_b,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) { showToast(body.error ?? '저장에 실패했습니다.', 'error'); return; }

      const lockRes = await api.lockPick(division.id);
      const lockBody = await lockRes.json().catch(() => ({}));
      if (!lockRes.ok) { showToast(lockBody.error ?? '확정에 실패했습니다.', 'error'); return; }

      setMeta((m) => ({ ...(m ?? {}), is_locked: true }));
      showToast('픽이 확정됐습니다!', 'success');
    } finally { setSaving(false); }
  };

  // 대회 목록을 받아 슬러그를 정하기 전까지도 스켈레톤이다 —
  // 여기서 놓치면 '대진표가 없습니다'가 한 번 번쩍이고 지나간다.
  if (tLoading || (slug == null && tournaments.length > 0) || loading) {
    return (
      <main className="page-body bg-paper min-h-screen px-5 pt-12">
        <div className="h-3 w-16 bg-ink-200 animate-pulse" />
        <div className="h-10 w-40 bg-ink-200 animate-pulse mt-3" />
        <div className="mt-8 h-64 bg-ink-200 animate-pulse" />
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

  const hasBracket = division?.groups?.some((g) => g.matches.length > 0);

  return (
    <main className="page-body bg-paper min-h-screen">
      <header className="px-5 pt-12">
        <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium">DRAW · PICK</p>
        <h1 className="text-4xl font-bold text-ink tracking-[-0.04em] leading-[0.95] mt-1">대진표</h1>
        <p className="text-ink-400 text-sm mt-2">
          {data.name}{data.venue && <> · {data.venue}</>}
        </p>
      </header>

      {/* 대회 탭 — 대회가 둘 이상일 때만 보인다 */}
      {tournaments.length > 1 && (
        <div className="flex gap-2 px-5 mt-5 overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
          {tournaments.map((t) => (
            <button
              key={t.slug}
              onClick={() => setSlug(t.slug)}
              className={`flex-none px-3.5 py-2 rounded-full text-[13px] font-medium transition-all pressable border ${
                t.slug === slug ? 'bg-ink text-white border-ink' : 'bg-paper text-ink-600 border-ink-200'
              }`}
            >
              {t.name}
              {t.status === '종료' && <span className="ml-1.5 opacity-60">종료</span>}
            </button>
          ))}
        </div>
      )}

      {/* 부문 탭 */}
      <div className="flex flex-wrap gap-2 px-5 mt-5 mb-3">
        {divisions.map((d, i) => (
          <button
            key={d.id}
            onClick={() => setDivIdx(i)}
            className={`flex-none px-3.5 py-2 rounded-full text-[13px] font-medium transition-all pressable border ${
              i === divIdx ? 'bg-ink text-white border-ink' : 'bg-paper text-ink-600 border-ink-200'
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>

      {/* 픽 요약 — 스크롤해도 위에 붙어 있다 */}
      {user && hasBracket && (
        <PickSummaryBar
          picks={picks}
          nameOf={(id) => (id != null ? nameById.get(id) ?? null : null)}
          remainMs={deadline != null ? deadline - now : null}
          locked={locked} closed={closed}
          onSubmit={submit} saving={saving} complete={complete}
        />
      )}

      {division && (
        <>
          <p className="px-5 mt-3 text-[11px] text-ink-400">
            {division.participant_count}명 참가 · {division.groups.length}개 조 ·{' '}
            {division.groups.reduce((n, g) => n + g.matches.length, 0) + (division.final ? 1 : 0)}경기
            {editable && <> · <span className="text-ink">팀을 눌러 순위를 고르세요</span></>}
          </p>

          {hasBracket ? (
            <div className="mt-3">
              {/* 좁은 화면에서는 줄여 뭉개지 말고 밀어서 보게 한다.
                  넓은 화면에서는 폭이 남아 한 번에 다 보인다. */}
              <div className="bracket-wide overflow-x-auto px-5 pb-2" style={{ WebkitOverflowScrolling: 'touch' }}>
                <BracketDiagram
                  division={division}
                  picks={byParticipant}
                  onTapTeam={tapTeam}
                />
              </div>
              <p className="text-center text-[11px] text-ink-400 mt-1">
                좌우로 밀어서 보세요 · 손가락으로 확대할 수 있어요
              </p>
            </div>
          ) : (
            <p className="px-5 mt-8 text-ink-400 text-sm">이 부문은 아직 대진이 등록되지 않았습니다.</p>
          )}
        </>
      )}

      {popAt && team && (
        <RankPopover
          at={popAt} team={team} picks={picks}
          onPick={choose} onClear={clear} onClose={() => setPopAt(null)}
        />
      )}
    </main>
  );
}
