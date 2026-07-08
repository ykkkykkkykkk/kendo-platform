import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch.js';
import { api } from '../api.js';
import { useToast } from '../context/ToastContext.jsx';
import CountdownTimer from '../components/CountdownTimer.jsx';

/* ── 상수 ─────────────────────────────────────────────────── */
const DIV_FULL = {
  male_individual:   '남자 개인전',
  male_team:         '남자 단체전',
  female_individual: '여자 개인전',
  female_team:       '여자 단체전',
};

const SLOTS = [
  { key: 'pick_1st',   label: '1등', score: 50, no: '01' },
  { key: 'pick_2nd',   label: '2등', score: 30, no: '02' },
  { key: 'pick_3rd_a', label: '3등', score: 10, no: '03' },
  { key: 'pick_3rd_b', label: '3등', score: 10, no: '03' },
];

const SLOT_BADGE = { pick_1st: '01', pick_2nd: '02', pick_3rd_a: '03', pick_3rd_b: '03' };

/* ── 메인 페이지 ───────────────────────────────────────────── */
export default function PickInputPage() {
  const { tournament_id, division_id } = useParams();
  const navigate     = useNavigate();
  const [params]     = useSearchParams();
  const deadline     = params.get('deadline');
  const { showToast } = useToast();

  const { data: divData,  loading: loadingDiv  } = useFetch(() => api.divisionParticipants(division_id), [division_id]);
  const { data: existingPick, loading: loadingPick } = useFetch(() => api.myPick(division_id), [division_id]);

  const [picks, setPicks] = useState({ pick_1st: null, pick_2nd: null, pick_3rd_a: null, pick_3rd_b: null });
  const [sheetParticipant, setSheetParticipant] = useState(null);
  const [showConfirm, setShowConfirm]           = useState(false);
  const [submitting, setSubmitting]             = useState(false);

  /* 기존 픽 불러오기 */
  useEffect(() => {
    if (existingPick) {
      setPicks({
        pick_1st:   existingPick.pick_1st   ?? null,
        pick_2nd:   existingPick.pick_2nd   ?? null,
        pick_3rd_a: existingPick.pick_3rd_a ?? null,
        pick_3rd_b: existingPick.pick_3rd_b ?? null,
      });
    }
  }, [existingPick]);

  const participants  = divData?.participants ?? [];
  const divisionType  = divData?.division_type ?? '';
  const isTeam        = divisionType.includes('team');
  const divLabel      = DIV_FULL[divisionType] ?? divisionType;
  const filledCount   = Object.values(picks).filter(Boolean).length;
  const allFilled     = filledCount === 4;

  /* 헬퍼: participant id → name */
  function getName(id) {
    if (!id) return null;
    const p = participants.find((p) => p.id === id);
    return p?.name ?? p?.team_name ?? null;
  }

  /* 헬퍼: participant id → 현재 어느 슬롯? */
  function slotOf(participantId) {
    return Object.entries(picks).find(([, v]) => v === participantId)?.[0] ?? null;
  }

  /* 참가자 카드 탭 → 슬롯 선택 시트 */
  function onParticipantTap(participant) {
    setSheetParticipant(participant);
  }

  /* 슬롯 선택 */
  function assignSlot(slotKey) {
    if (!sheetParticipant) return;
    setPicks((prev) => {
      const next = { ...prev };
      for (const k of Object.keys(next)) {
        if (next[k] === sheetParticipant.id) next[k] = null;
      }
      next[slotKey] = sheetParticipant.id;
      return next;
    });
    setSheetParticipant(null);
  }

  /* 슬롯 직접 해제 */
  function clearSlot(slotKey, e) {
    e.stopPropagation();
    setPicks((prev) => ({ ...prev, [slotKey]: null }));
  }

  /* 픽 저장 + 확정 */
  async function handleConfirm() {
    setSubmitting(true);
    try {
      const saveRes  = await api.submitPick(division_id, picks);
      const saveData = await saveRes.json();
      if (!saveRes.ok) throw new Error(saveData.error ?? '저장 실패');

      const lockRes  = await api.lockPick(division_id);
      const lockData = await lockRes.json();
      if (!lockRes.ok) throw new Error(lockData.error ?? '확정 실패');

      showToast('픽이 확정됐습니다!');
      navigate(`/predictions/${tournament_id}`, { replace: true });
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setSubmitting(false);
      setShowConfirm(false);
    }
  }

  /* 임시 저장 (lock 없이) */
  async function handleSave() {
    if (!allFilled) return;
    setSubmitting(true);
    try {
      const res  = await api.submitPick(division_id, picks);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '저장 실패');
      showToast('픽이 저장됐습니다');
      navigate(-1);
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  const loading = loadingDiv || loadingPick;

  return (
    <main className="page-body bg-paper min-h-screen">
      {/* ── 헤더 ───────────────────────────────────────────── */}
      <div className="px-5 pt-12 flex items-center justify-between mb-5">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex-none flex items-center justify-center rounded-full border border-ink-200 pressable"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M15 19l-7-7 7-7" stroke="#111111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <span className="text-ink font-bold text-[14px] tracking-tight flex-1 text-center mx-3 truncate">
          {divLabel || '픽 입력'}
        </span>
        {deadline ? (
          <span className="flex-none text-[11px] font-bold text-ink">
            <CountdownTimer deadline={deadline} />
          </span>
        ) : <div className="w-9" />}
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : (
        <>
          {/* ── 픽 슬롯 ──────────────────────────────────── */}
          <div className="px-5 flex flex-col gap-2 mb-6">
            {/* 1등, 2등: 각각 full-width */}
            {SLOTS.slice(0, 2).map((slot) => (
              <SlotCard
                key={slot.key}
                slot={slot}
                name={getName(picks[slot.key])}
                onClear={(e) => clearSlot(slot.key, e)}
              />
            ))}
            {/* 3등 둘: 2열 그리드 */}
            <div className="grid grid-cols-2 gap-2">
              {SLOTS.slice(2).map((slot) => (
                <SlotCard
                  key={slot.key}
                  slot={slot}
                  name={getName(picks[slot.key])}
                  compact
                  onClear={(e) => clearSlot(slot.key, e)}
                />
              ))}
            </div>
          </div>

          {/* ── 구분선 + 참가자 수 ───────────────────────── */}
          <div className="px-5 flex items-center gap-3 mb-4">
            <div className="flex-1 border-t border-ink" />
            <span className="text-ink-400 text-[10px] tracking-[0.2em] font-medium">
              {isTeam ? `참가 팀 ${participants.length}` : `참가 선수 ${participants.length}`}
            </span>
            <div className="flex-1 border-t border-ink" />
          </div>

          {/* ── 참가자 그리드 ─────────────────────────────── */}
          {participants.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-ink-400 text-sm">아직 참가자가 등록되지 않았어요</p>
            </div>
          ) : (
            <div className="px-5 grid grid-cols-4 gap-2 mb-6">
              {participants.map((p) => {
                const slot = slotOf(p.id);
                return (
                  <ParticipantCard
                    key={p.id}
                    participant={p}
                    slot={slot}
                    isTeam={isTeam}
                    onTap={() => onParticipantTap(p)}
                  />
                );
              })}
            </div>
          )}

          {/* ── 하단 버튼 ─────────────────────────────────── */}
          <div className="px-5 flex flex-col gap-2 pb-2">
            {allFilled ? (
              <>
                <button
                  onClick={() => setShowConfirm(true)}
                  disabled={submitting}
                  className="w-full bg-lime hover:bg-lime-dark text-ink font-medium py-3.5 rounded-full pressable disabled:opacity-50"
                >
                  픽 확정하기 →
                </button>
                <button
                  onClick={handleSave}
                  disabled={submitting}
                  className="w-full border border-ink text-ink font-medium py-3 rounded-full pressable disabled:opacity-50 text-sm"
                >
                  임시 저장 (확정 없이)
                </button>
              </>
            ) : (
              <div className="w-full border border-ink-200 text-ink-400 font-medium py-4 rounded-full text-center text-sm">
                {filledCount === 0
                  ? '선수를 선택해주세요'
                  : `${4 - filledCount}명 더 골라야 확정 가능`}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── 슬롯 선택 바텀시트 ──────────────────────────── */}
      {sheetParticipant && (
        <SlotSelectionSheet
          participant={sheetParticipant}
          picks={picks}
          isTeam={isTeam}
          onSelect={assignSlot}
          onDismiss={() => setSheetParticipant(null)}
        />
      )}

      {/* ── 확정 모달 ─────────────────────────────────── */}
      {showConfirm && (
        <ConfirmModal
          picks={picks}
          getName={getName}
          submitting={submitting}
          onConfirm={handleConfirm}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </main>
  );
}

/* ── 로딩 스켈레톤 ──────────────────────────────────────────── */
function LoadingSkeleton() {
  return (
    <div className="px-5 animate-pulse flex flex-col gap-3">
      <div className="h-16 bg-ink-200/40" />
      <div className="h-16 bg-ink-200/40" />
      <div className="grid grid-cols-2 gap-2">
        <div className="h-14 bg-ink-200/40" />
        <div className="h-14 bg-ink-200/40" />
      </div>
      <div className="h-px bg-ink-200 my-2" />
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="aspect-square bg-ink-200/40" />
        ))}
      </div>
    </div>
  );
}

/* ── 슬롯 카드 ─────────────────────────────────────────────── */
function SlotCard({ slot, name, compact, onClear }) {
  const filled = !!name;
  return (
    <div className={`bg-paper border ${
      filled ? 'border-ink' : 'border-dashed border-ink-200'
    } ${compact ? 'p-3' : 'p-3.5'} flex items-center gap-3`}>
      <span className={`tabular-nums font-bold ${compact ? 'text-sm' : 'text-base'} ${filled ? 'text-ink' : 'text-ink-200'}`}>
        {slot.no}
      </span>

      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-medium text-ink-400">
          {slot.label}&nbsp;&nbsp;<span>+{slot.score}점</span>
        </p>
        {filled ? (
          <p className="text-ink text-sm font-bold truncate leading-snug mt-0.5">{name}</p>
        ) : (
          <p className="text-ink-200 text-sm leading-snug mt-0.5">선택</p>
        )}
      </div>

      {filled && (
        <button
          onClick={onClear}
          className="flex-none w-6 h-6 rounded-full border border-ink-200 flex items-center justify-center pressable text-ink-400 text-xs"
        >
          ×
        </button>
      )}
    </div>
  );
}

/* ── 참가자 칩 (선택 시 반전) ─────────────────────────────── */
function ParticipantCard({ participant, slot, isTeam, onTap }) {
  const name   = participant.name ?? participant.team_name ?? '';
  const sub    = isTeam ? participant.region : participant.team_name;
  const picked = !!slot;
  const badge  = picked ? SLOT_BADGE[slot] : null;

  return (
    <button
      onClick={onTap}
      className={`relative flex flex-col items-center justify-center p-2
                  aspect-square text-center pressable transition-all border ${
        picked
          ? 'bg-ink border-ink'
          : 'bg-paper border-ink-200'
      }`}
    >
      <p className={`text-[11px] font-semibold leading-tight truncate w-full text-center ${
        picked ? 'text-white' : 'text-ink'
      }`}>
        {name}
      </p>
      {sub && (
        <p className={`text-[9px] truncate w-full text-center mt-0.5 ${
          picked ? 'text-white/50' : 'text-ink-400'
        }`}>
          {sub}
        </p>
      )}

      {badge && (
        <span
          className="absolute top-1 right-1 text-[9px] leading-none font-bold tabular-nums bg-lime text-ink px-1 py-0.5"
        >
          {badge}
        </span>
      )}
    </button>
  );
}

/* ── 슬롯 선택 바텀시트 ─────────────────────────────────────── */
function SlotSelectionSheet({ participant, picks, isTeam, onSelect, onDismiss }) {
  const name    = participant.name ?? participant.team_name ?? '';
  const currSlot = Object.entries(picks).find(([, v]) => v === participant.id)?.[0] ?? null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onDismiss} />

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-mobile
                      bg-paper rounded-t-2xl z-50 pb-10 pt-5 px-5"
           style={{ borderTop: '1.5px solid #111111' }}>
        <div className="w-10 h-1 bg-ink-200 rounded-full mx-auto mb-5" />
        <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium text-center mb-1">SELECT RANK</p>
        <p className="text-ink font-bold text-lg text-center mb-5 truncate tracking-tight">{name}</p>

        <div style={{ borderTop: '1.5px solid #111111' }}>
          {SLOTS.map((slot, i) => {
            const isCurrent  = currSlot === slot.key;
            const isTakenBy  = picks[slot.key] != null && picks[slot.key] !== participant.id;
            return (
              <button
                key={slot.key}
                onClick={() => onSelect(slot.key)}
                className={`w-full flex items-center gap-4 py-4 pressable ${i > 0 ? 'border-t border-ink-200' : ''}`}
              >
                <span className="text-sm font-bold tabular-nums text-ink w-6">{slot.no}</span>
                <div className="flex-1 text-left">
                  <p className="text-ink font-semibold text-sm">
                    {isCurrent ? <span className="bg-lime px-1">{slot.label}</span> : slot.label}
                    &nbsp;&nbsp;
                    <span className="text-ink-400 font-normal text-xs">+{slot.score}점</span>
                  </p>
                  {isTakenBy && (
                    <p className="text-ink-400 text-[10px] mt-0.5">
                      현재: 다른 선수 배치됨 (교체됩니다)
                    </p>
                  )}
                </div>
                {isCurrent && (
                  <span className="text-ink text-xs font-bold">현재</span>
                )}
              </button>
            );
          })}
        </div>

        <button
          onClick={onDismiss}
          className="w-full mt-4 py-3 rounded-full border border-ink-200 text-ink-600 text-sm font-medium pressable"
        >
          취소
        </button>
      </div>
    </>
  );
}

/* ── 확정 모달 ──────────────────────────────────────────────── */
function ConfirmModal({ picks, getName, submitting, onConfirm, onCancel }) {
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onCancel} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                      w-[calc(100%-40px)] max-w-[400px] bg-paper border border-ink
                      z-50 p-6">
        <h3 className="text-ink font-bold text-lg text-center mb-1 tracking-tight">픽 확정</h3>
        <p className="text-ink-400 text-xs text-center mb-5">
          확정 후에는 수정할 수 없습니다
        </p>

        <div className="mb-5" style={{ borderTop: '1.5px solid #111111' }}>
          {SLOTS.map((slot, i) => (
            <div key={slot.key} className={`flex items-center gap-3 py-2.5 ${i > 0 ? 'border-t border-ink-200' : ''}`}>
              <span className="text-xs font-bold tabular-nums text-ink-400 w-6">{slot.no}</span>
              <span className="text-ink-400 text-xs w-8 text-right">{slot.label}</span>
              <span className="flex-1 text-ink text-sm font-semibold truncate">
                {getName(picks[slot.key]) ?? '—'}
              </span>
              <span className="text-ink text-xs font-bold tabular-nums">+{slot.score}</span>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={onCancel}
            disabled={submitting}
            className="flex-1 py-3 rounded-full border border-ink-200 text-ink-600 font-medium text-sm pressable"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            disabled={submitting}
            className="flex-1 py-3 rounded-full bg-lime hover:bg-lime-dark text-ink font-medium text-sm pressable disabled:opacity-50"
          >
            {submitting ? '처리 중...' : '확정하기'}
          </button>
        </div>
      </div>
    </>
  );
}
