import { useEffect, useState, useCallback } from 'react';
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
  { pickKey: 'pick_1st',   resultKey: 'rank_1st',   label: '1등',  emoji: '🥇', score: 50 },
  { pickKey: 'pick_2nd',   resultKey: 'rank_2nd',   label: '2등',  emoji: '🥈', score: 30 },
  { pickKey: 'pick_3rd_a', resultKey: 'rank_3rd_a', label: '3등A', emoji: '🥉', score: 10 },
  { pickKey: 'pick_3rd_b', resultKey: 'rank_3rd_b', label: '3등B', emoji: '🥉', score: 10 },
];

function useDarkBody() {
  useEffect(() => {
    document.body.classList.add('predict-dark');
    return () => document.body.classList.remove('predict-dark');
  }, []);
}

/* ── 메인 페이지 ───────────────────────────────────────────── */
export default function PredictionTournamentPage() {
  useDarkBody();
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
      <main className="page-body bg-black min-h-screen animate-pulse">
        <div className="px-5 pt-12 flex items-center justify-between mb-4">
          <div className="w-9 h-9 bg-black-900 rounded-full" />
          <div className="w-16 h-7 bg-black-900 rounded-full" />
        </div>
        <div className="px-5">
          <div className="h-3 bg-black-900 rounded w-32 mb-2" />
          <div className="h-7 bg-black-900 rounded w-24 mb-6" />
          <div className="flex gap-2 mb-6">
            {[1, 2].map((i) => <div key={i} className="h-9 w-20 bg-black-900 rounded-full" />)}
          </div>
          <div className="h-40 bg-black-900 rounded-3xl mb-3" />
          <div className="h-20 bg-black-900 rounded-2xl" />
        </div>
      </main>
    );
  }

  /* 에러 */
  if (!tournament || tournament.error) {
    return (
      <main className="page-body bg-black min-h-screen flex flex-col items-center justify-center gap-3">
        <p className="text-white/30 text-sm">대회를 찾을 수 없습니다</p>
        <button onClick={() => navigate(-1)} className="text-orange-500 text-sm pressable">
          돌아가기
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
    <main className="page-body bg-black min-h-screen">
      {/* ── 헤더 ───────────────────────────────────────── */}
      <div className="px-5 pt-12 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-black-900 pressable"
          aria-label="뒤로"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M15 19l-7-7 7-7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {tournament.pick_deadline && (
          <span className="inline-flex items-center gap-1 bg-orange-500/15 text-orange-500
                           text-[11px] font-bold px-3 py-1.5 rounded-full">
            ⏱&nbsp;<CountdownTimer deadline={tournament.pick_deadline} />
          </span>
        )}
      </div>

      {/* ── 타이틀 ─────────────────────────────────────── */}
      <div className="px-5 pt-3 pb-5">
        <p className="text-white/40 text-[13px] tracking-tight leading-none">{tournament.name}</p>
        <h1 className="text-[26px] font-bold text-white tracking-tight mt-1">
          {tournament.status === '종료' ? '결산' : '픽 입력'}
        </h1>
      </div>

      {/* ── 탭바 ───────────────────────────────────────── */}
      <div className="scroll-x flex gap-2 px-5 pb-5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-none px-4 py-2.5 rounded-full text-[13px] font-semibold
                        transition-all pressable ${
              activeTab === tab.id
                ? 'bg-orange-500 text-black'
                : 'bg-black-700 text-white/55 hover:bg-black-700'
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
    <div className="flex flex-col gap-4">
      {/* 진행도 카드 */}
      <div className="bg-black-900 border border-black-700 rounded-3xl p-5">
        <p className="text-white/35 text-[10px] font-semibold tracking-[0.18em] uppercase mb-3">
          현재 픽 진행도
        </p>
        <div className="flex items-end gap-2 mb-1">
          <span className="text-[52px] font-bold text-white leading-none tracking-tight">
            {done}
          </span>
          <span className="text-white/35 text-xl mb-1.5">/ {total} 부문</span>
        </div>
        <p className="text-white/25 text-xs">최대 {total * 100}점</p>
      </div>

      {/* 부문 카드 목록 */}
      {total === 0 ? (
        <div className="py-8 text-center">
          <p className="text-white/25 text-sm">아직 등록된 부문이 없어요</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {divisions.map((d) => {
            const myPick   = d.my_pick;
            const isLocked = myPick?.is_locked;
            const isPicked = !!myPick && !isLocked;

            return (
              <button
                key={d.id}
                onClick={() => onDivClick(d.id)}
                className="pressable w-full text-left"
              >
                <div className={`rounded-2xl p-4 flex items-center gap-3 border ${
                  isLocked ? 'bg-black-900 border-green-500/25' :
                  isPicked ? 'bg-black-900 border-orange-500/25' :
                  'bg-[#0E0E0E] border-dashed border-[#252525]'
                }`}>
                  {/* 상태 아이콘 */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-none text-base ${
                    isLocked ? 'bg-green-500/12 text-green-400' :
                    isPicked ? 'bg-orange-500/12 text-orange-500' :
                    'bg-black-700 text-white/20'
                  }`}>
                    {isLocked ? '✓' : isPicked ? '✎' : '+'}
                  </div>

                  {/* 정보 */}
                  <div className="flex-1 min-w-0">
                    <DivisionTypeBadge type={d.division_type} dark />
                    <p className={`text-[11px] mt-1 ${
                      isLocked ? 'text-green-400' :
                      isPicked ? 'text-orange-500' :
                      'text-white/25'
                    }`}>
                      {isLocked ? `${myPick.score}점 획득 예정` :
                       isPicked ? '저장됨 · 확정 전' :
                       '아직 픽 안 함'}
                    </p>
                  </div>

                  <span className="text-white/25 text-lg">›</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* 첫 미완료 부문 CTA */}
      {firstUnpicked && (
        <button
          onClick={() => onDivClick(firstUnpicked.id)}
          className="w-full bg-orange-500 text-black font-bold py-4 rounded-2xl pressable mt-1"
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
      showToast('픽이 확정됐습니다! 🔒', 'success');
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
        <DivisionTypeBadge type={division.division_type} dark />
        {division.participant_count != null && (
          <span className="text-white/30 text-xs">{division.participant_count}명 참가</span>
        )}
      </div>

      {/* ① 픽 없음 */}
      {!myPick && (
        <div className="bg-black-900 border border-dashed border-[#252525] rounded-3xl
                        p-8 flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-black-700 flex items-center justify-center text-2xl">
            🎯
          </div>
          <p className="text-white/30 text-sm text-center leading-relaxed">
            아직 픽을 입력하지 않았어요
          </p>
          {deadlinePassed ? (
            <p className="text-white/20 text-xs">픽 마감이 지났습니다</p>
          ) : (
            <Link
              to={`/predictions/${tournamentId}/pick/${division.id}${deadlineParam}`}
              className="bg-orange-500 text-black font-bold px-7 py-3 rounded-xl pressable text-sm"
            >
              픽 입력하기 →
            </Link>
          )}
        </div>
      )}

      {/* ② 픽 있음 / 미확정 */}
      {myPick && !isLocked && (
        <div className="flex flex-col gap-3">
          <PickCard title="내 픽 (미확정)" borderCls="border-orange-500/20">
            {RANK_SLOTS.map(({ pickKey, label, emoji, score }) => (
              <PickRow
                key={pickKey}
                emoji={emoji}
                label={label}
                score={score}
                name={getName(myPick[pickKey])}
              />
            ))}
          </PickCard>

          <div className="flex gap-2">
            <Link
              to={`/predictions/${tournamentId}/pick/${division.id}${deadlineParam}`}
              className="flex-1 bg-black-700 text-white/80 font-semibold
                         py-3.5 rounded-xl text-center text-sm pressable"
            >
              수정하기
            </Link>
            <button
              className="flex-1 bg-orange-500 text-black font-bold py-3.5 rounded-xl text-sm pressable"
              onClick={() => setShowConfirm(true)}
            >
              확정하기
            </button>
          </div>

          {/* 인라인 확정 확인 */}
          {showConfirm && (
            <div className="bg-black-700 border border-orange-500/20 rounded-2xl p-4 flex flex-col gap-3">
              <p className="text-white/80 text-sm font-semibold text-center">
                픽을 확정할까요?
              </p>
              <p className="text-white/35 text-xs text-center leading-relaxed">
                확정 후에는 수정할 수 없어요.<br />4개 슬롯이 모두 채워져 있어야 합니다.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 bg-[#252525] text-white/55 font-semibold py-3 rounded-xl text-sm pressable"
                >
                  취소
                </button>
                <button
                  onClick={handleLock}
                  disabled={locking}
                  className="flex-1 bg-orange-500 text-black font-bold py-3 rounded-xl text-sm pressable disabled:opacity-50"
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
          <PickCard
            title="내 픽"
            badge={<span className="text-green-400 text-[10px] font-semibold bg-green-500/10 px-2 py-1 rounded-full">🔒 확정</span>}
            borderCls="border-green-500/20"
          >
            {RANK_SLOTS.map(({ pickKey, label, emoji, score }, i) => {
              const pid     = myPick[pickKey];
              const correct = isCorrect(pid, i);
              return (
                <PickRow
                  key={pickKey}
                  emoji={emoji}
                  label={label}
                  score={score}
                  name={getName(pid)}
                  correct={correct}
                />
              );
            })}
          </PickCard>

          {myPick.score > 0 && (
            <div className="bg-black-700 rounded-2xl p-4 text-center">
              <p className="text-white/35 text-xs mb-1">이번 부문 점수</p>
              <p className="text-orange-500 text-4xl font-bold tracking-tight">
                {myPick.score}
                <span className="text-lg ml-1 text-white/40">점</span>
              </p>
            </div>
          )}

          <p className="text-center text-white/20 text-xs">확정된 픽은 수정할 수 없습니다</p>

          {deadlinePassed && (
            <Link
              to={`/predictions/${tournamentId}/picks/${division.id}`}
              className="block w-full bg-black-900 border border-black-700 text-white/50
                         font-semibold py-3.5 rounded-xl text-center text-sm pressable"
            >
              전체 픽 통계 보기
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

/* ── 픽 카드 컨테이너 ──────────────────────────────────────── */
function PickCard({ title, badge, borderCls = 'border-black-700', children }) {
  return (
    <div className={`bg-black-900 border rounded-3xl p-5 ${borderCls}`}>
      <div className="flex items-center justify-between mb-4">
        <p className="text-white/35 text-[10px] font-semibold tracking-[0.18em] uppercase">
          {title}
        </p>
        {badge}
      </div>
      <div className="flex flex-col">{children}</div>
    </div>
  );
}

/* ── 픽 행 ─────────────────────────────────────────────────── */
function PickRow({ emoji, label, score, name, correct = null }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-black-700 last:border-0">
      <span className="text-xl w-7 flex-none">{emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="text-white/30 text-[10px]">{label} · {score}점</p>
        <p className={`text-sm font-semibold truncate ${
          correct === true  ? 'text-green-400' :
          correct === false ? 'text-white/40' :
          'text-white'
        }`}>
          {name}
          {correct === true && <span className="ml-1 text-green-400">✓</span>}
        </p>
      </div>
    </div>
  );
}
