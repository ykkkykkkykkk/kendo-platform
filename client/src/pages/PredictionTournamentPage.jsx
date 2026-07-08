import { useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch.js';
import { api } from '../api.js';
import { useToast } from '../context/ToastContext.jsx';
import CountdownTimer from '../components/CountdownTimer.jsx';
import DivisionTypeBadge from '../components/DivisionTypeBadge.jsx';

/* ── 상수 ─────────────────────────────────────────────────── */
const DIV_LABELS = {
  male_individual:   '남자개인',
  male_team:         '남자단체',
  female_individual: '여자개인',
  female_team:       '여자단체',
};

const RANK_SLOTS = [
  { pickKey: 'pick_1st',   resultKey: 'rank_1st',   label: '1등',  no: '01', score: 50 },
  { pickKey: 'pick_2nd',   resultKey: 'rank_2nd',   label: '2등',  no: '02', score: 30 },
  { pickKey: 'pick_3rd_a', resultKey: 'rank_3rd_a', label: '3등A', no: '03', score: 10 },
  { pickKey: 'pick_3rd_b', resultKey: 'rank_3rd_b', label: '3등B', no: '03', score: 10 },
];

/* ── 메인 페이지 ───────────────────────────────────────────── */
export default function PredictionTournamentPage() {
  const { tournament_id } = useParams();
  const navigate = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0);
  const { data: tournament, loading } = useFetch(
    () => api.tournamentFull(tournament_id),
    [tournament_id, refreshKey]
  );
  const [activeTab, setActiveTab] = useState('summary');
  const onRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  /* 로딩 */
  if (loading) {
    return (
      <main className="page-body bg-paper min-h-screen animate-pulse">
        <div className="px-5 pt-12 flex items-center justify-between mb-4">
          <div className="w-9 h-9 bg-ink-200/40 rounded-full" />
          <div className="w-16 h-7 bg-ink-200/40 rounded-full" />
        </div>
        <div className="px-5">
          <div className="h-3 bg-ink-200/40 w-32 mb-2" />
          <div className="h-7 bg-ink-200/40 w-24 mb-6" />
          <div className="flex gap-2 mb-6">
            {[1, 2].map((i) => <div key={i} className="h-9 w-20 bg-ink-200/40 rounded-full" />)}
          </div>
          <div className="h-40 bg-ink-200/40 mb-3" />
          <div className="h-20 bg-ink-200/40" />
        </div>
      </main>
    );
  }

  /* 에러 */
  if (!tournament || tournament.error) {
    return (
      <main className="page-body bg-paper min-h-screen flex flex-col items-center justify-center gap-3">
        <p className="text-ink-400 text-sm">대회를 찾을 수 없습니다</p>
        <button onClick={() => navigate(-1)} className="text-ink text-sm font-semibold pressable">
          돌아가기 →
        </button>
      </main>
    );
  }

  /* 탭 목록: 합산 + 각 부문 */
  const tabs = [
    { id: 'summary', label: '합산' },
    ...tournament.divisions.map((d) => ({
      id:       String(d.id),
      label:    DIV_LABELS[d.division_type] ?? d.division_type,
      division: d,
    })),
  ];

  const activeDivision = tournament.divisions.find((d) => String(d.id) === activeTab) ?? null;

  return (
    <main className="page-body bg-paper min-h-screen">
      {/* ── 헤더 ───────────────────────────────────────── */}
      <div className="px-5 pt-12 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-full border border-ink-200 pressable"
          aria-label="뒤로"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M15 19l-7-7 7-7" stroke="#111111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {tournament.pick_deadline && (
          <span className="text-[11px] font-bold text-ink">
            <CountdownTimer deadline={tournament.pick_deadline} />
          </span>
        )}
      </div>

      {/* ── 타이틀 ─────────────────────────────────────── */}
      <div className="px-5 pt-4 pb-5">
        <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium uppercase">{tournament.name}</p>
        <h1 className="text-4xl font-bold text-ink tracking-[-0.04em] leading-[0.95] mt-1.5">
          {tournament.status === '종료' ? '결산' : '픽 입력'}
        </h1>
      </div>

      {/* ── 탭바 ───────────────────────────────────────── */}
      <div className="scroll-x flex gap-2 px-5 pb-5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-none px-4 py-2 rounded-full text-[13px] font-medium
                        transition-all pressable border ${
              activeTab === tab.id
                ? 'bg-ink text-white border-ink'
                : 'bg-paper text-ink-600 border-ink-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── 탭 콘텐츠 ──────────────────────────────────── */}
      <div className="px-5">
        {activeTab === 'summary' ? (
          <SummaryTab
            tournament={tournament}
            onDivClick={(id) => setActiveTab(String(id))}
          />
        ) : activeDivision ? (
          <DivisionTab
            tournamentId={tournament_id}
            division={activeDivision}
            pickDeadline={tournament.pick_deadline}
            onRefresh={onRefresh}
          />
        ) : null}
      </div>
    </main>
  );
}

/* ── 합산 탭 ───────────────────────────────────────────────── */
function SummaryTab({ tournament, onDivClick }) {
  const { divisions } = tournament;
  const total       = divisions.length;
  const lockedCount = divisions.filter((d) => d.my_pick?.is_locked).length;
  const pickedCount = divisions.filter((d) => d.my_pick && !d.my_pick.is_locked).length;
  const done        = lockedCount + pickedCount;
  const firstUnpicked = divisions.find((d) => !d.my_pick);

  return (
    <div className="flex flex-col gap-6">
      {/* 진행도 — 반전 블록 */}
      <div className="bg-block rounded-2xl p-5">
        <p className="text-[10px] tracking-[0.2em] font-medium" style={{ color: '#D8FF3E' }}>
          MY PROGRESS
        </p>
        <div className="flex items-end gap-2 mt-3 mb-1">
          <span className="text-[52px] font-bold text-white leading-none tracking-[-0.04em] tabular-nums">
            {done}
          </span>
          <span className="text-white/40 text-xl mb-1.5">/ {total} 부문</span>
        </div>
        <p className="text-white/30 text-xs">최대 {total * 100}점</p>
      </div>

      {/* 부문 목록 — 룰 테이블 */}
      {total === 0 ? (
        <div className="py-8 text-center">
          <p className="text-ink-400 text-sm">아직 등록된 부문이 없어요</p>
        </div>
      ) : (
        <div style={{ borderTop: '1.5px solid #111111' }}>
          {divisions.map((d, i) => {
            const myPick   = d.my_pick;
            const isLocked = myPick?.is_locked;
            const isPicked = !!myPick && !isLocked;

            return (
              <button
                key={d.id}
                onClick={() => onDivClick(d.id)}
                className={`pressable w-full text-left flex items-center gap-3 py-4 ${i > 0 ? 'border-t border-ink-200' : ''}`}
              >
                <span className={`w-5 text-center text-sm font-bold flex-none ${
                  isLocked ? 'text-ink' : isPicked ? 'text-ink-600' : 'text-ink-200'
                }`}>
                  {isLocked ? '✓' : isPicked ? '✎' : '+'}
                </span>

                <div className="flex-1 min-w-0">
                  <DivisionTypeBadge type={d.division_type} />
                  <p className="text-[11px] mt-1 text-ink-400">
                    {isLocked ? (
                      <>확정 · <span className="bg-lime text-ink px-1 font-semibold">{myPick.score}점 획득 예정</span></>
                    ) : isPicked ? '저장됨 · 확정 전' : '아직 픽 안 함'}
                  </p>
                </div>

                <span className="text-ink-400 text-lg">→</span>
              </button>
            );
          })}
        </div>
      )}

      {/* 첫 미완료 부문 CTA */}
      {firstUnpicked && (
        <button
          onClick={() => onDivClick(firstUnpicked.id)}
          className="w-full bg-lime hover:bg-lime-dark text-ink font-medium py-3.5 rounded-full pressable"
        >
          남은 부문 픽하기 →
        </button>
      )}
    </div>
  );
}

/* ── 부문 탭 ───────────────────────────────────────────────── */
function DivisionTab({ tournamentId, division, pickDeadline, onRefresh }) {
  const { showToast } = useToast();
  const [locking, setLocking] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const now           = Date.now();
  const deadlinePassed = pickDeadline && now > new Date(pickDeadline).getTime();
  const myPick        = division.my_pick;
  const isLocked      = !!myPick?.is_locked;
  const result        = division.result ?? null;

  const deadlineParam = pickDeadline
    ? `?deadline=${encodeURIComponent(pickDeadline)}`
    : '';

  async function handleLock() {
    setLocking(true);
    try {
      const res = await api.lockPick(division.id);
      const json = await res.json();
      if (!res.ok) { showToast(json.error ?? '확정 실패', 'error'); return; }
      showToast('픽이 확정됐습니다!', 'success');
      setShowConfirm(false);
      onRefresh();
    } catch {
      showToast('네트워크 오류', 'error');
    } finally {
      setLocking(false);
    }
  }

  function getName(id) {
    if (id == null) return '—';
    const p = division.participants?.find((p) => p.id === id);
    return p?.name ?? p?.team_name ?? '알 수 없음';
  }

  function isCorrect(pickValue, slotIndex) {
    if (!result || pickValue == null) return null;
    if (slotIndex === 0) return pickValue === result.rank_1st;
    if (slotIndex === 1) return pickValue === result.rank_2nd;
    const thirds = new Set([result.rank_3rd_a, result.rank_3rd_b].filter(Boolean));
    return thirds.has(pickValue);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 부문 헤더 정보 */}
      <div className="flex items-center gap-2">
        <DivisionTypeBadge type={division.division_type} />
        {division.participant_count != null && (
          <span className="text-ink-400 text-xs">{division.participant_count}명 참가</span>
        )}
      </div>

      {/* ① 픽 없음 */}
      {!myPick && (
        <div className="border border-ink-200 p-8 flex flex-col items-center gap-4">
          <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium">NO PICK YET</p>
          <p className="text-ink-600 text-sm text-center leading-relaxed">
            아직 픽을 입력하지 않았어요
          </p>
          {deadlinePassed ? (
            <p className="text-ink-400 text-xs">픽 마감이 지났습니다</p>
          ) : (
            <Link
              to={`/predictions/${tournamentId}/pick/${division.id}${deadlineParam}`}
              className="bg-lime hover:bg-lime-dark text-ink font-medium px-7 py-3 rounded-full pressable text-sm"
            >
              픽 입력하기 →
            </Link>
          )}
        </div>
      )}

      {/* ② 픽 있음 / 미확정 */}
      {myPick && !isLocked && (
        <div className="flex flex-col gap-3">
          <PickTable title="MY PICK — 미확정">
            {RANK_SLOTS.map(({ pickKey, label, no, score }) => (
              <PickRow
                key={pickKey}
                no={no}
                label={label}
                score={score}
                name={getName(myPick[pickKey])}
              />
            ))}
          </PickTable>

          <div className="flex gap-2">
            <Link
              to={`/predictions/${tournamentId}/pick/${division.id}${deadlineParam}`}
              className="flex-1 border border-ink text-ink font-medium
                         py-3 rounded-full text-center text-sm pressable"
            >
              수정하기
            </Link>
            <button
              className="flex-1 bg-lime hover:bg-lime-dark text-ink font-medium py-3 rounded-full text-sm pressable"
              onClick={() => setShowConfirm(true)}
            >
              확정하기
            </button>
          </div>

          {/* 인라인 확정 확인 */}
          {showConfirm && (
            <div className="border border-ink p-4 flex flex-col gap-3">
              <p className="text-ink text-sm font-bold text-center">
                픽을 확정할까요?
              </p>
              <p className="text-ink-400 text-xs text-center leading-relaxed">
                확정 후에는 수정할 수 없어요.<br />4개 슬롯이 모두 채워져 있어야 합니다.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 border border-ink-200 text-ink-600 font-medium py-3 rounded-full text-sm pressable"
                >
                  취소
                </button>
                <button
                  onClick={handleLock}
                  disabled={locking}
                  className="flex-1 bg-lime hover:bg-lime-dark text-ink font-medium py-3 rounded-full text-sm pressable disabled:opacity-50"
                >
                  {locking ? '확정 중…' : '확정하기'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ③ 픽 확정됨 */}
      {myPick && isLocked && (
        <div className="flex flex-col gap-3">
          <PickTable
            title="MY PICK"
            badge={
              <span className="text-[10px] font-semibold bg-lime text-ink px-2 py-0.5">확정</span>
            }
          >
            {RANK_SLOTS.map(({ pickKey, label, no, score }, i) => {
              const pid     = myPick[pickKey];
              const correct = isCorrect(pid, i);
              return (
                <PickRow
                  key={pickKey}
                  no={no}
                  label={label}
                  score={score}
                  name={getName(pid)}
                  correct={correct}
                />
              );
            })}
          </PickTable>

          {myPick.score > 0 && (
            <div className="border border-ink p-5 text-center">
              <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium mb-1">SCORE</p>
              <p className="text-ink text-4xl font-bold tracking-[-0.04em] tabular-nums">
                {myPick.score}
                <span className="text-lg ml-1 text-ink-400 font-medium">점</span>
              </p>
            </div>
          )}

          <p className="text-center text-ink-400 text-xs">확정된 픽은 수정할 수 없습니다</p>

          {deadlinePassed && (
            <Link
              to={`/predictions/${tournamentId}/picks/${division.id}`}
              className="block w-full border border-ink-200 text-ink-600
                         font-medium py-3 rounded-full text-center text-sm pressable"
            >
              전체 픽 통계 보기
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

/* ── 픽 테이블 컨테이너 ────────────────────────────────────── */
function PickTable({ title, badge, children }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium uppercase">
          {title}
        </p>
        {badge}
      </div>
      <div style={{ borderTop: '1.5px solid #111111' }}>{children}</div>
    </div>
  );
}

/* ── 픽 행 ─────────────────────────────────────────────────── */
function PickRow({ no, label, score, name, correct = null }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-ink-200 last:border-b-0">
      <span className="text-[11px] text-ink-400 tabular-nums font-medium w-6 flex-none">{no}</span>
      <div className="flex-1 min-w-0">
        <p className="text-ink-400 text-[10px]">{label} · {score}점</p>
        <p className={`text-sm font-semibold truncate mt-0.5 ${
          correct === false ? 'text-ink-400 line-through' : 'text-ink'
        }`}>
          {correct === true ? <span className="bg-lime px-1">{name}</span> : name}
          {correct === true && <span className="ml-1.5 text-ink text-xs">✓</span>}
        </p>
      </div>
    </div>
  );
}
