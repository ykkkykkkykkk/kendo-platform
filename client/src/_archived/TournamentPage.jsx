import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Trophy, RotateCcw } from 'lucide-react';
import { useFetch } from '../hooks/useFetch.js';
import { api, authPost, authGet } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { haptic } from '../utils/haptic.js';
import { SkeletonCard } from '../components/Skeleton.jsx';

/* ═══════════════════════════════════════════════════════════
   브래킷 레이아웃 상수
═══════════════════════════════════════════════════════════ */
const MH = 80;
const MW = 180;
const BU = 92;
const CG = 44;
const PX = 16;
const PY = 36;

const ROUNDS = ['16강', '8강', '4강', '결승'];
const CY_OFF = [40, 86, 178, 362];

function cy(r, i) { return PY + i * (BU * 2 ** r) + CY_OFF[r]; }
function ty(r, i) { return cy(r, i) - MH / 2; }
function lx(r)    { return PX + r * (MW + CG); }

const CHAMP_W  = 100;
const CHAMP_LX = lx(ROUNDS.length);
const BW       = CHAMP_LX + CHAMP_W + PX;
const BH       = PY + 7 * BU + MH + 24;

/* ═══════════════════════════════════════════════════════════
   SVG 연결선
═══════════════════════════════════════════════════════════ */
function BracketLines({ bracket, myPredictions }) {
  const defaultPaths = [];
  const goldPaths    = [];

  ROUNDS.forEach((round, r) => {
    if (r >= ROUNDS.length - 1) return;
    const nextMatches = bracket[ROUNDS[r + 1]] ?? [];
    const srcRx = lx(r) + MW;
    const midX  = srcRx + CG / 2;
    const tgtLx = lx(r + 1);

    nextMatches.forEach((_, j) => {
      const ya  = cy(r, 2 * j);
      const yb  = cy(r, 2 * j + 1);
      const yt  = cy(r + 1, j);
      const tbar  = `M ${srcRx} ${ya} H ${midX} V ${yb}`;
      const hline = `M ${midX} ${yt} H ${tgtLx}`;

      const srcA  = bracket[round]?.[2 * j];
      const srcB  = bracket[round]?.[2 * j + 1];
      const isGold = (srcA && myPredictions[srcA.id] != null) ||
                     (srcB && myPredictions[srcB.id] != null);

      if (isGold) { goldPaths.push(tbar, hline); }
      else        { defaultPaths.push(tbar, hline); }
    });
  });

  const finalCy   = cy(3, 0);
  const finalRx   = lx(3) + MW;
  const champMid  = CHAMP_LX + CHAMP_W / 2;
  const champLine = `M ${finalRx} ${finalCy} H ${champMid}`;
  defaultPaths.push(champLine);

  return (
    <svg className="absolute inset-0 pointer-events-none" width={BW} height={BH}>
      {defaultPaths.map((d, i) => (
        <path key={`d${i}`} d={d} fill="none" stroke="#E2E5EC" strokeWidth="1.5" />
      ))}
      {goldPaths.map((d, i) => (
        <path key={`g${i}`} d={d} fill="none" stroke="#C9A961" strokeWidth="1.5" />
      ))}
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════
   선수 행
═══════════════════════════════════════════════════════════ */
function PlayerRow({ playerId, name, isPicked, isWinner, isLoser, onClick, disabled }) {
  if (!name) return (
    <div className="flex-1 flex items-center px-2.5">
      <span className="text-[11px] text-ink-400/40 italic">TBD</span>
    </div>
  );

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex-1 flex items-center gap-1.5 px-2.5 w-full transition-colors active:opacity-70
        ${isPicked ? 'bg-gold/10' : ''}
        ${isLoser  ? 'opacity-30' : ''}`}
    >
      {isWinner
        ? <Trophy size={8} className="text-gold flex-shrink-0" />
        : isPicked
          ? <div className="w-1 h-1 rounded-full bg-gold flex-shrink-0" />
          : <div className="w-1 h-1 flex-shrink-0" />
      }
      <span className={`text-[13px] truncate leading-tight
        ${isPicked ? 'text-navy-900 font-bold' : isWinner ? 'text-gold font-semibold' : 'text-ink-600 font-medium'}`}>
        {name}
      </span>
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════
   매치 박스
═══════════════════════════════════════════════════════════ */
function MatchBox({ match: m, myPick, onPick }) {
  const time   = m.scheduled_at?.slice(11, 16);
  const isLive = m.status === '진행중';
  const isDone = m.status === '종료';

  function pick(pid) {
    if (isDone || !pid) return;
    onPick(m, pid);
  }

  const statusIcon = isLive ? (
    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
  ) : isDone ? null : myPick != null ? (
    <svg width="10" height="10" viewBox="0 0 10 10">
      <circle cx="5" cy="5" r="4.5" fill="#C9A961" />
      <path d="M3 5.2l1.4 1.4L7 3.5" stroke="white" strokeWidth="1.2"
            fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ) : (
    <svg width="10" height="10" viewBox="0 0 10 10">
      <circle cx="5" cy="5" r="3.8" fill="none" stroke="#8B95A8"
              strokeWidth="1" strokeDasharray="1.8 1.4" />
    </svg>
  );

  return (
    <div
      className="bg-white border border-ink-100 rounded-lg overflow-hidden shadow-sm flex flex-col"
      style={{ width: MW, height: MH }}
    >
      <div
        className="flex items-center justify-between px-2.5 border-b border-ink-100/50 flex-shrink-0"
        style={{ height: 20 }}
      >
        <span className="text-[10px] text-ink-400 truncate">
          {m.bracket_position ? `경기 ${m.bracket_position}` : ''}
          {time ? ` · ${time}` : ''}
        </span>
        <div className="flex-shrink-0 ml-1">{statusIcon}</div>
      </div>

      <PlayerRow
        playerId={m.player_a_id}
        name={m.player_a_name}
        isPicked={myPick === m.player_a_id}
        isWinner={isDone && m.winner_player_id === m.player_a_id}
        isLoser={isDone && m.winner_player_id != null && m.winner_player_id !== m.player_a_id}
        onClick={() => pick(m.player_a_id)}
        disabled={isDone || !m.player_a_id}
      />

      <div className="border-t border-ink-100/50 mx-2.5 flex-shrink-0" />

      <PlayerRow
        playerId={m.player_b_id}
        name={m.player_b_name}
        isPicked={myPick === m.player_b_id}
        isWinner={isDone && m.winner_player_id === m.player_b_id}
        isLoser={isDone && m.winner_player_id != null && m.winner_player_id !== m.player_b_id}
        onClick={() => pick(m.player_b_id)}
        disabled={isDone || !m.player_b_id}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   우승 컬럼 박스
═══════════════════════════════════════════════════════════ */
function ChampBox({ bracket }) {
  const finalMatch = bracket['결승']?.[0];
  const winner     = finalMatch?.winner_name;

  return (
    <div
      className="absolute flex flex-col items-center justify-center rounded-lg overflow-hidden"
      style={{
        left: CHAMP_LX, top: ty(3, 0),
        width: CHAMP_W, height: MH,
        background: 'linear-gradient(135deg, #C9A961 0%, #E8D9A8 100%)',
      }}
    >
      <Trophy size={18} className="text-navy-900 mb-1" />
      {winner ? (
        <span className="text-navy-900 font-black text-[12px] text-center px-1 leading-tight">
          {winner}
        </span>
      ) : (
        <span className="text-navy-900/50 text-[11px] font-semibold">우승</span>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   메인 페이지
═══════════════════════════════════════════════════════════ */
export default function TournamentPage({ onLoginRequest }) {
  const { slug }   = useParams();
  const navigate   = useNavigate();
  const { user }      = useAuth();
  const { showToast } = useToast();

  const { data: tournament, loading } = useFetch(() => api.tournament(slug), [slug]);

  const [myPredictions, setMyPredictions] = useState({});
  const [pendingPick,   setPendingPick]   = useState(null);
  const [swipeHint,     setSwipeHint]     = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setSwipeHint(false), 2500);
    return () => clearTimeout(t);
  }, []);

  // 기존 예측 로드 (로그인 상태일 때)
  useEffect(() => {
    if (!user || !tournament?.id) return;
    authGet(`/predictions/me?tournament_id=${tournament.id}`)
      .then((rows) => {
        if (!Array.isArray(rows)) return;
        const map = {};
        rows.forEach((p) => { map[p.match_id] = p.predicted_winner_player_id; });
        setMyPredictions(map);
      })
      .catch(() => {});
  }, [user?.id, tournament?.id]);

  // 로그인 완료 후 대기 중인 예측 자동 제출
  useEffect(() => {
    if (!user || !pendingPick) return;
    const pp = pendingPick;
    setPendingPick(null);
    submitPrediction(pp.match, pp.playerId);
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── 예측 제출 ── */
  async function submitPrediction(match, playerId) {
    haptic();
    setMyPredictions((prev) => ({ ...prev, [match.id]: playerId }));
    try {
      const res = await authPost('/predictions', {
        matchId:                 match.id,
        predictedWinnerPlayerId: playerId,
      });
      if (res.ok) {
        const playerName = playerId === match.player_a_id
          ? match.player_a_name : match.player_b_name;
        showToast(`${playerName} 선수에게 예측 완료! 🎯`, 'success');
      } else if (res.status === 409) {
        showToast('이미 예측한 경기입니다.', 'info');
      } else {
        setMyPredictions((prev) => {
          const n = { ...prev }; delete n[match.id]; return n;
        });
        showToast('예측 저장에 실패했습니다.', 'error');
      }
    } catch { /* 네트워크 오류 — 로컬 상태 유지 */ }
  }

  /* ── 선수 탭 ── */
  const handlePick = useCallback((match, playerId) => {
    if (myPredictions[match.id] === playerId) {
      setMyPredictions((prev) => { const n = { ...prev }; delete n[match.id]; return n; });
      return;
    }
    if (!user) {
      setPendingPick({ match, playerId });
      onLoginRequest?.();
      return;
    }
    submitPrediction(match, playerId);
  }, [user, myPredictions]); // eslint-disable-line react-hooks/exhaustive-deps

  function resetPredictions() { setMyPredictions({}); }

  function predictableCount(bracket) {
    let total = 0;
    ROUNDS.forEach((r) => {
      (bracket[r] ?? []).forEach((m) => {
        if (m.status === '예정' && m.player_a_id && m.player_b_id) total++;
      });
    });
    return total;
  }

  if (loading) return (
    <main className="page-body px-4 pt-12">
      <SkeletonCard className="h-36 mb-4" />
      <SkeletonCard className="h-64" />
    </main>
  );
  if (!tournament) return (
    <main className="page-body px-4 pt-12">
      <p className="text-ink-400 text-sm">대회를 찾을 수 없습니다.</p>
    </main>
  );

  const { bracket = {} } = tournament;
  const myPickCount      = Object.keys(myPredictions).length;
  const totalPredictable = predictableCount(bracket);

  return (
    <>
      <div className="px-4 pt-12">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-0.5 text-ink-600 mb-3 active:opacity-60"
        >
          <ChevronLeft size={18} />
          <span className="text-sm">뒤로</span>
        </button>
        <div className="mb-4">
          <p className="text-[10px] text-gold font-semibold tracking-[0.2em] uppercase">Predict</p>
          <p className="text-xs text-ink-400 mt-0.5">맞히면 진짜 검도용품을 받아요</p>
        </div>

        <div
          className="relative overflow-hidden rounded-2xl p-5 mb-4"
          style={{ background: 'linear-gradient(135deg, #0A1428 0%, #1A2745 100%)' }}
        >
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gold rounded-l-2xl" />
          <div className="flex items-center justify-between pl-2 mb-2">
            <span className="text-[11px] font-semibold bg-gold/20 text-gold px-2 py-0.5 rounded-full">
              {tournament.status}
            </span>
            <span className="text-[11px] border border-gold/40 text-gold/70 rounded-full px-2 py-0.5">
              {tournament.tournament_type}
            </span>
          </div>
          <p className="text-white font-bold text-xl tracking-tight pl-2 leading-snug">
            {tournament.name}
          </p>
          <p className="text-white/60 text-xs pl-2 mt-1">
            {tournament.venue}&nbsp;<span className="text-gold">·</span>&nbsp;{tournament.start_date}
          </p>
          {user && (
            <p className="text-gold/60 text-[11px] pl-2 mt-1.5">👤 {user.nickname}</p>
          )}
        </div>
      </div>

      <div className="sticky top-0 bg-white/95 backdrop-blur-sm z-20
                      px-4 py-2.5 border-b border-ink-100/50">
        <div className="flex items-center justify-between">
          <div>
            <span className="font-semibold text-navy-900 text-sm">
              내 예측 {myPickCount}/{totalPredictable}
            </span>
            {user ? (
              <p className="text-[11px] text-gold mt-0.5">🎯 맞히면 죽도 1자루!</p>
            ) : (
              <button
                onClick={onLoginRequest}
                className="block text-[11px] text-gold font-semibold mt-0.5 underline underline-offset-2"
              >
                로그인하고 예측 참여 →
              </button>
            )}
          </div>
          <button
            onClick={resetPredictions}
            className="pressable flex items-center gap-1 bg-ink-100 text-ink-600
                       text-xs font-semibold px-3 py-1.5 rounded-full"
          >
            <RotateCcw size={11} />
            초기화
          </button>
        </div>
      </div>

      <div className="relative">
        <div
          className="absolute top-0 right-0 bottom-0 w-12 z-10 pointer-events-none"
          style={{ background: 'linear-gradient(to left, white 10%, transparent)' }}
        />
        {swipeHint && (
          <div className="absolute top-2 right-14 z-20 bg-navy-900/80 text-white text-[11px]
                          font-medium px-3 py-1 rounded-full pointer-events-none animate-pulse">
            ← 가로로 스와이프
          </div>
        )}
        <div className="scroll-x pb-8">
          <div className="relative" style={{ width: BW, height: BH }}>
            <BracketLines bracket={bracket} myPredictions={myPredictions} />
            {ROUNDS.map((round, r) => (
              <div
                key={round}
                className="absolute text-[10px] font-semibold text-ink-400 uppercase tracking-widest"
                style={{ top: 8, left: lx(r), width: MW, textAlign: 'left', paddingLeft: 4 }}
              >
                {round}
              </div>
            ))}
            <div
              className="absolute text-[10px] font-semibold text-gold uppercase tracking-widest"
              style={{ top: 8, left: CHAMP_LX, width: CHAMP_W, textAlign: 'center' }}
            >
              우승
            </div>
            {ROUNDS.map((round, r) => {
              const matches = [...(bracket[round] ?? [])].sort(
                (a, b) => (a.bracket_position ?? 0) - (b.bracket_position ?? 0),
              );
              return matches.map((m, i) => (
                <div key={m.id} className="absolute" style={{ top: ty(r, i), left: lx(r) }}>
                  <MatchBox match={m} myPick={myPredictions[m.id]} onPick={handlePick} />
                </div>
              ));
            })}
            <ChampBox bracket={bracket} />
          </div>
        </div>
      </div>
    </>
  );
}
