import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Loader } from 'lucide-react';
import { adminPost, adminDelete } from '../../adminApi.js';
import { GroupView, MatchRow } from '../../../components/DrawList.jsx';

/**
 * 대진표 결과 입력 (관리자 전용).
 * 공개 페이지(/draw)는 보기만 가능하고, 승자 입력은 여기서만 한다.
 * 목록 렌더링은 공개 페이지와 같은 컴포넌트를 쓰되 canEdit만 켠다.
 */
export default function TournamentBracket() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [divIdx, setDivIdx]   = useState(0);
  const [segment, setSegment] = useState(0);
  const [busy, setBusy]       = useState(false);
  const [err, setErr]         = useState('');

  // 대진 데이터는 공개 엔드포인트를 그대로 쓴다(같은 데이터라 따로 만들 필요가 없다).
  const load = useCallback(async () => {
    const r = await fetch(`/api/tournaments/${id}/draw`);
    const j = await r.json();
    setData(j);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  /* 이긴 선수 클릭 → 저장 + 자동 진출 / 승자 재클릭 → 결과 취소(연쇄) */
  async function handlePick(m, side) {
    if (busy || side.kind !== 'player') return;
    setErr('');

    const already = m.winner_participant_id === side.participant_id;
    if (already) {
      if (!window.confirm(`${m.number}경기 결과를 취소할까요?\n이 승자가 올라간 다음 라운드도 함께 취소됩니다.`)) return;
      setBusy(true);
      try {
        const res = await adminDelete(`/bracket/matches/${m.id}/result`);
        if (!res.ok) throw new Error((await res.json()).error ?? '취소 실패');
        await load();
      } catch (e) { setErr(e.message); } finally { setBusy(false); }
      return;
    }

    setBusy(true);
    try {
      const res = await adminPost(`/bracket/matches/${m.id}/result`, {
        winner_participant_id: side.participant_id,
      });
      if (!res.ok) throw new Error((await res.json()).error ?? '저장 실패');
      await load();
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-ink-400">
        <Loader size={18} className="animate-spin mr-2" /> 불러오는 중…
      </div>
    );
  }

  const divisions = data?.divisions ?? [];
  if (!divisions.length) {
    return (
      <div className="max-w-3xl">
        <button onClick={() => navigate('/admin/tournaments')} className="flex items-center gap-1 text-ink-600 text-sm mb-4">
          <ChevronLeft size={16} /> 대회 목록
        </button>
        <p className="text-ink-400 text-sm">등록된 대진표가 없습니다.</p>
      </div>
    );
  }

  const division = divisions[divIdx];
  const segments = [...division.groups.map((g) => `${g.group}조`), ...(division.final ? ['결승'] : [])];

  const totalMatches = divisions.reduce(
    (n, v) => n + v.groups.reduce((k, g) => k + g.matches.length, 0) + (v.final ? 1 : 0), 0);
  const doneMatches = divisions.reduce(
    (n, v) => n + v.groups.reduce((k, g) => k + g.matches.filter((m) => m.winner_participant_id != null).length, 0)
              + (v.final?.winner_participant_id != null ? 1 : 0), 0);

  return (
    <div className="max-w-3xl">
      <button onClick={() => navigate('/admin/tournaments')} className="flex items-center gap-1 text-ink-600 text-sm mb-4 pressable">
        <ChevronLeft size={16} /> 대회 목록
      </button>

      <div className="flex items-baseline gap-3 mb-1">
        <h1 className="text-2xl font-bold text-ink">대진표 결과 입력</h1>
        {busy && <span className="text-[11px] text-ink-400 flex items-center gap-1"><Loader size={11} className="animate-spin" /> 저장 중…</span>}
      </div>
      <p className="text-ink-400 text-sm mb-1">{data.name}</p>
      <p className="text-[11px] text-ink-400 mb-5">
        전체 진행 {doneMatches}/{totalMatches}경기 · 이긴 선수를 누르면 다음 라운드에 자동으로 올라갑니다.
        승자를 다시 누르면 취소됩니다.
      </p>

      {err && (
        <p className="mb-4 px-3 py-2 border border-red-300 bg-red-50 text-red-700 text-[12px]">{err}</p>
      )}

      {/* 부문 */}
      <div className="flex flex-wrap gap-2 mb-3">
        {divisions.map((d, i) => {
          const dn = d.groups.reduce((k, g) => k + g.matches.filter((m) => m.winner_participant_id != null).length, 0)
                   + (d.final?.winner_participant_id != null ? 1 : 0);
          const dt = d.groups.reduce((k, g) => k + g.matches.length, 0) + (d.final ? 1 : 0);
          return (
            <button
              key={d.id}
              onClick={() => { setDivIdx(i); setSegment(0); }}
              className={`px-3 py-1.5 text-[12px] font-medium border pressable ${
                i === divIdx ? 'bg-ink text-white border-ink' : 'bg-paper text-ink-600 border-ink-200'
              }`}
            >
              {d.label} <span className="opacity-60 tabular-nums">{dn}/{dt}</span>
            </button>
          );
        })}
      </div>

      {/* 조 / 결승 */}
      <div className="flex border border-ink-200 mb-6">
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

      {segment < division.groups.length ? (
        <GroupView group={division.groups[segment]} canEdit={!busy} onPick={handlePick} />
      ) : (
        <div>
          <div className="flex items-baseline gap-2 pb-3">
            <h2 className="text-2xl font-bold text-ink tracking-[-0.03em]">결승</h2>
            <span className="text-[11px] text-ink-400">A조 우승 vs B조 우승</span>
          </div>
          <div className="bg-block rounded-2xl px-4">
            <MatchRow m={division.final} dark canEdit={!busy} onPick={handlePick} />
          </div>
        </div>
      )}
    </div>
  );
}
