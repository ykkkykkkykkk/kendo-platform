import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch.js';
import { api } from '../api.js';
import { useToast } from '../context/ToastContext.jsx';
import CountdownTimer from '../components/CountdownTimer.jsx';
import DivisionTypeBadge from '../components/DivisionTypeBadge.jsx';

/* ── 상수 ─────────────────────────────────────────────────── */
const DIV_FULL = {
  male_individual:   '남자 개인전',
  male_team:         '남자 단체전',
  female_individual: '여자 개인전',
  female_team:       '여자 단체전',
};

const SLOTS = [
  { key: 'pick_1st',   label: '1등', score: 50, emoji: '🥇',
    color: '#FFD700', borderCls: 'border-[#FFD700]/30',
    gradCls: 'from-[#201700] to-[#150F00]' },
  { key: 'pick_2nd',   label: '2등', score: 30, emoji: '🥈',
    color: '#C7C7CC', borderCls: 'border-[#C7C7CC]/20',
    gradCls: 'from-[#1C1C1C] to-[#121212]' },
  { key: 'pick_3rd_a', label: '3등', score: 10, emoji: '🥉',
    color: '#CD7F32', borderCls: 'border-[#CD7F32]/25',
    gradCls: 'from-[#1C1200] to-[#120C00]' },
  { key: 'pick_3rd_b', label: '3등', score: 10, emoji: '🥉',
    color: '#CD7F32', borderCls: 'border-[#CD7F32]/25',
    gradCls: 'from-[#1C1200] to-[#120C00]' },
];

const SLOT_BADGE = { pick_1st: '🥇', pick_2nd: '🥈', pick_3rd_a: '🥉', pick_3rd_b: '🥉' };

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

  /* 다크 body */
  useEffect(() => {
    document.body.classList.add('predict-dark');
    return () => document.body.classList.remove('predict-dark');
  }, []);

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

  /* 참가자 카드 탭 → 슬롯 선택 or 해제 */
  function onParticipantTap(participant) {
    const existing = slotOf(participant.id);
    if (existing) {
      setSheetParticipant(participant);
    } else {
      setSheetParticipant(participant);
    }
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

      showToast('픽이 확정됐습니다! 🎯');
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
    <main className="page-body bg-black min-h-screen">
      {/* ── 헤더 ───────────────────────────────────────────── */}
      <div className="px-5 pt-12 flex items-center justify-between mb-5">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex-none flex items-center justify-center rounded-full bg-black-900 pressable"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M15 19l-7-7 7-7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <span className="text-white font-semibold text-[14px] tracking-tight flex-1 text-center mx-3 truncate">
          {divLabel || '픽 입력'}
        </span>
        {deadline ? (
          <span className="flex-none inline-flex items-center gap-1 bg-orange-500/15 text-orange-500 text-[11px] font-bold px-3 py-1.5 rounded-full">
            ⏱&nbsp;<CountdownTimer deadline={deadline} />
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
            <div className="flex-1 h-px bg-black-700" />
            <span className="text-white/30 text-[11px] font-semibold">
              {isTeam ? `참가 팀 ${participants.length}개` : `참가 선수 ${participants.length}명`}
            </span>
            <div className="flex-1 h-px bg-black-700" />
          </div>

          {/* ── 참가자 그리드 ─────────────────────────────── */}
          {participants.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-white/25 text-sm">아직 참가자가 등록되지 않았어요</p>
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
                  className="w-full bg-orange-500 text-black font-bold py-4 rounded-2xl pressable disabled:opacity-50"
                >
                  픽 확정하기 🔒
                </button>
                <button
                  onClick={handleSave}
                  disabled={submitting}
                  className="w-full bg-black-700 text-white/60 font-semibold py-3.5 rounded-2xl pressable disabled:opacity-50 text-sm"
                >
                  임시 저장 (확정 없이)
                </button>
              </>
            ) : (
              <div className="w-full bg-black-700 text-white/25 font-semibold py-4 rounded-2xl text-center text-sm">
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
      <div className="h-16 bg-black-900 rounded-2xl" />
      <div className="h-16 bg-black-900 rounded-2xl" />
      <div className="grid grid-cols-2 gap-2">
        <div className="h-14 bg-black-900 rounded-2xl" />
        <div className="h-14 bg-black-900 rounded-2xl" />
      </div>
      <div className="h-px bg-black-700 my-2" />
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="aspect-square bg-black-900 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

/* ── 슬롯 카드 ─────────────────────────────────────────────── */
function SlotCard({ slot, name, compact, onClear }) {
  const filled = !!name;
  return (
    <div className={`bg-gradient-to-br ${slot.gradCls} border ${
      filled ? slot.borderCls : 'border-dashed border-[#252525]'
    } rounded-2xl ${compact ? 'p-3' : 'p-3.5'} flex items-center gap-3`}>
      <span className={compact ? 'text-lg' : 'text-xl'}>{slot.emoji}</span>

      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold" style={{ color: slot.color }}>
          {slot.label}&nbsp;&nbsp;<span className="opacity-60">+{slot.score}점</span>
        </p>
        {filled ? (
          <p className="text-white text-sm font-bold truncate leading-snug mt-0.5">{name}</p>
        ) : (
          <p className="text-white/20 text-sm leading-snug mt-0.5">선택</p>
        )}
      </div>

      {filled && (
        <button
          onClick={onClear}
          className="flex-none w-6 h-6 rounded-full bg-white/8 flex items-center justify-center pressable text-white/40 text-xs"
        >
          ×
        </button>
      )}
    </div>
  );
}

/* ── 참가자 카드 ──────────────────────────────────────────── */
function ParticipantCard({ participant, slot, isTeam, onTap }) {
  const name   = participant.name ?? participant.team_name ?? '';
  const sub    = isTeam ? participant.region : participant.team_name;
  const picked = !!slot;
  const badge  = picked ? SLOT_BADGE[slot] : null;

  return (
    <button
      onClick={onTap}
      className={`relative flex flex-col items-center justify-center rounded-xl p-2
                  aspect-square text-center pressable transition-all ${
        picked
          ? 'bg-orange-500/10 border border-orange-500/30'
          : 'bg-black-900 border border-black-700'
      }`}
    >
      <p className={`text-[11px] font-semibold leading-tight truncate w-full text-center ${
        picked ? 'text-white' : 'text-white/70'
      }`}>
        {name}
      </p>
      {sub && (
        <p className="text-[9px] text-white/30 truncate w-full text-center mt-0.5">{sub}</p>
      )}

      {badge && (
        <span className="absolute top-1 right-1 text-[13px] leading-none">{badge}</span>
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
      <div className="fixed inset-0 bg-black/60 z-40" onClick={onDismiss} />

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-mobile
                      bg-black-800 border-t border-black-700 rounded-t-3xl z-50 pb-10 pt-5 px-5">
        <div className="w-10 h-1 bg-black-700 rounded-full mx-auto mb-5" />
        <p className="text-white/40 text-xs text-center mb-1">순위 선택</p>
        <p className="text-white font-bold text-lg text-center mb-5 truncate">{name}</p>

        <div className="flex flex-col gap-2">
          {SLOTS.map((slot) => {
            const isCurrent  = currSlot === slot.key;
            const isTakenBy  = picks[slot.key] != null && picks[slot.key] !== participant.id;
            return (
              <button
                key={slot.key}
                onClick={() => onSelect(slot.key)}
                className={`flex items-center gap-4 p-4 rounded-2xl pressable ${
                  isCurrent
                    ? 'bg-orange-500/20 border border-orange-500/40'
                    : 'bg-black-700 border border-transparent'
                }`}
              >
                <span className="text-xl">{slot.emoji}</span>
                <div className="flex-1 text-left">
                  <p className="text-white font-semibold text-sm">
                    {slot.label}&nbsp;&nbsp;
                    <span className="text-white/40 font-normal text-xs">+{slot.score}점</span>
                  </p>
                  {isTakenBy && (
                    <p className="text-white/30 text-[10px] mt-0.5">
                      현재: 다른 선수 배치됨 (교체됩니다)
                    </p>
                  )}
                </div>
                {isCurrent && (
                  <span className="text-orange-500 text-xs font-bold">현재</span>
                )}
              </button>
            );
          })}
        </div>

        <button
          onClick={onDismiss}
          className="w-full mt-3 py-3.5 rounded-xl bg-black-700 text-white/40 text-sm pressable"
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
      <div className="fixed inset-0 bg-black/70 z-40" onClick={onCancel} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                      w-[calc(100%-40px)] max-w-[400px] bg-black-800 border border-black-700
                      rounded-3xl z-50 p-6">
        <h3 className="text-white font-bold text-lg text-center mb-1">픽 확정</h3>
        <p className="text-white/35 text-xs text-center mb-5">
          확정 후에는 수정할 수 없습니다
        </p>

        <div className="bg-black-900 rounded-2xl p-4 mb-5 flex flex-col gap-3">
          {SLOTS.map((slot) => (
            <div key={slot.key} className="flex items-center gap-3">
              <span className="text-base w-6">{slot.emoji}</span>
              <span className="text-white/30 text-xs w-10 text-right">{slot.label}</span>
              <span className="flex-1 text-white text-sm font-semibold truncate">
                {getName(picks[slot.key]) ?? '—'}
              </span>
              <span className="text-orange-500 text-xs font-bold">+{slot.score}</span>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={onCancel}
            disabled={submitting}
            className="flex-1 py-3.5 rounded-xl bg-black-700 text-white/60 font-semibold text-sm pressable"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            disabled={submitting}
            className="flex-1 py-3.5 rounded-xl bg-orange-500 text-black font-bold text-sm pressable disabled:opacity-50"
          >
            {submitting ? '처리 중...' : '확정하기'}
          </button>
        </div>
      </div>
    </>
  );
}
