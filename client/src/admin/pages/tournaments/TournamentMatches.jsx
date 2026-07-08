import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Zap, Trash2, X, Save, Trophy } from 'lucide-react';
import { adminGet, adminPost, adminPut, adminDelete } from '../../adminApi.js';

/* ══════════════════════════════════════════════════════
   브래킷 레이아웃 상수 (TournamentPage와 동일)
══════════════════════════════════════════════════════ */
const MH = 88, MW = 188, BU = 100, CG = 52, PX = 20, PY = 40;
const ALL_ROUNDS = ['16강', '8강', '4강', '결승'];
const CY_OFF     = [44, 94, 194, 394];

function cy(r, i) { return PY + i * (BU * 2 ** r) + CY_OFF[r]; }
function ty(r, i) { return cy(r, i) - MH / 2; }
function lx(r)    { return PX + r * (MW + CG); }

const CHAMP_W  = 110;
const CHAMP_LX = (rounds) => lx(rounds.length);
const bracketW  = (rounds) => CHAMP_LX(rounds) + CHAMP_W + PX;
const bracketH  = (rounds) => {
  const r16count = rounds.includes('16강') ? 8 : 4;
  return PY + (r16count - 1) * BU + MH + 24;
};

/* ══════════════════════════════════════════════════════
   SVG 연결선
══════════════════════════════════════════════════════ */
function BracketLines({ rounds, bracket, selectedId }) {
  const paths = [], goldPaths = [];

  rounds.forEach((round, r) => {
    if (r >= rounds.length - 1) return;
    const nextMatches = bracket[rounds[r + 1]] ?? [];
    const srcRx = lx(r) + MW, midX = srcRx + CG / 2, tgtLx = lx(r + 1);

    nextMatches.forEach((_, j) => {
      const ya = cy(r, 2*j), yb = cy(r, 2*j+1), yt = cy(r+1, j);
      const tbar  = `M ${srcRx} ${ya} H ${midX} V ${yb}`;
      const hline = `M ${midX} ${yt} H ${tgtLx}`;
      const srcA  = bracket[round]?.[2*j];
      const srcB  = bracket[round]?.[2*j+1];
      const isGold = (srcA?.id === selectedId) || (srcB?.id === selectedId);
      (isGold ? goldPaths : paths).push(tbar, hline);
    });
  });

  const finalCy  = cy(rounds.length - 1, 0);
  const finalRx  = lx(rounds.length - 1) + MW;
  const champMid = CHAMP_LX(rounds) + CHAMP_W / 2;
  paths.push(`M ${finalRx} ${finalCy} H ${champMid}`);

  return (
    <svg className="absolute inset-0 pointer-events-none"
         width={bracketW(rounds)} height={bracketH(rounds)}>
      {paths.map((d, i)     => <path key={`d${i}`} d={d} fill="none" stroke="#E5E5E5" strokeWidth="1.5" />)}
      {goldPaths.map((d, i) => <path key={`g${i}`} d={d} fill="none" stroke="#D8FF3E" strokeWidth="2.5" />)}
    </svg>
  );
}

/* ══════════════════════════════════════════════════════
   매치 박스
══════════════════════════════════════════════════════ */
function MatchBox({ match: m, selected, onClick }) {
  const isDone     = m.status === '종료';
  const isSelected = selected;
  const noPlayers  = !m.player_a_name && !m.player_b_name;

  const rowCls = (isWinner) =>
    `flex-1 flex items-center px-3 gap-1.5 text-[13px] font-medium truncate
     ${isDone && isWinner ? 'text-ink font-bold bg-lime' : ''}
     ${isDone && !isWinner && m.winner_player_id ? 'opacity-30' : 'text-ink-600'}`;

  return (
    <div
      onClick={() => onClick(m)}
      className={`absolute cursor-pointer overflow-hidden flex flex-col
                  transition-colors border-2
                  ${isSelected ? 'border-ink' : 'border-transparent'}
                  ${isDone ? 'bg-white' : noPlayers ? 'bg-ink-200/10' : 'bg-white hover:border-ink-200'}`}
      style={{ width: MW, height: MH }}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between px-3 border-b border-ink-200 flex-shrink-0"
           style={{ height: 22 }}>
        <span className="text-[10px] text-ink-400">
          {m.round} #{m.bracket_position}
          {m.scheduled_at ? ` · ${m.scheduled_at.slice(11,16)}` : ''}
        </span>
        {isDone && <Trophy size={10} className="text-ink" />}
        {!isDone && m.status === '진행중' && (
          <div className="w-1.5 h-1.5 rounded-full bg-lime animate-pulse" />
        )}
      </div>

      {/* 선수 A */}
      <div className={rowCls(m.winner_player_id === m.player_a_id)}>
        {m.player_a_name ?? <span className="italic text-ink-400">TBD</span>}
      </div>
      <div className="border-t border-ink-200 mx-3 flex-shrink-0" />
      {/* 선수 B */}
      <div className={rowCls(m.winner_player_id === m.player_b_id)}>
        {m.player_b_name ?? <span className="italic text-ink-400">TBD</span>}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   우승 박스
══════════════════════════════════════════════════════ */
function ChampBox({ rounds, bracket }) {
  const final  = bracket['결승']?.[0];
  const winner = final?.winner_name;
  return (
    <div
      className="absolute flex flex-col items-center justify-center overflow-hidden bg-lime"
      style={{
        left: CHAMP_LX(rounds), top: ty(rounds.length - 1, 0),
        width: CHAMP_W, height: MH,
      }}
    >
      <Trophy size={20} className="text-ink mb-1" />
      <span className="text-ink font-black text-[12px] text-center px-2 leading-tight">
        {winner ?? '우승'}
      </span>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   대진표 생성 모달
══════════════════════════════════════════════════════ */
function GenerateModal({ tournamentId, players, onClose, onGenerated }) {
  const [type,    setType]    = useState('16강');
  const [slots,   setSlots]   = useState(Array(16).fill(''));
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const count = type === '16강' ? 16 : 8;
  const currentSlots = slots.slice(0, count);

  const setSlot = (i, v) => {
    setSlots((s) => { const n=[...s]; n[i]=v; return n; });
  };

  const handleGenerate = async () => {
    const chosen = currentSlots.map(Number).filter(Boolean);
    if (chosen.length !== count) {
      setError(`선수 ${count}명을 모두 선택해주세요. (현재 ${chosen.length}명)`);
      return;
    }
    setLoading(true);
    setError('');
    const res  = await adminPost(`/tournaments/${tournamentId}/matches/generate`, {
      type, players: chosen,
    });
    const data = await res.json();
    if (res.ok) { onGenerated(data); onClose(); }
    else        { setError(data.error ?? '생성 실패'); setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-ink-200 w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-200">
          <h2 className="font-bold text-ink text-lg">대진표 생성</h2>
          <button onClick={onClose} className="text-ink-400 hover:text-ink"><X size={20} /></button>
        </div>

        {/* 타입 선택 */}
        <div className="px-6 py-4 border-b border-ink-200">
          <div className="flex gap-3">
            {['16강', '8강'].map((t) => (
              <button
                key={t}
                onClick={() => { setType(t); setSlots(Array(16).fill('')); setError(''); }}
                className={`px-5 py-2.5 rounded-full text-sm font-medium border transition-colors ${
                  type === t
                    ? 'border-ink bg-ink text-white'
                    : 'border-ink-200 text-ink-600 hover:border-ink'
                }`}
              >
                {t} ({t === '16강' ? 16 : 8}명)
              </button>
            ))}
          </div>
        </div>

        {/* 선수 선택 */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium uppercase mb-3">
            시드 순서대로 선수 선택 (1번이 첫 경기 선수 A)
          </p>
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs font-bold text-ink-400 w-5 text-right">{i+1}</span>
                <select
                  value={currentSlots[i] ?? ''}
                  onChange={(e) => setSlot(i, e.target.value)}
                  className="flex-1 border border-ink-200 px-2.5 py-2 text-sm text-ink
                             focus:outline-none focus:border-ink transition-colors"
                >
                  <option value="">— 선택 —</option>
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.team_name})</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>

        {/* 푸터 */}
        <div className="px-6 py-4 border-t border-ink-200">
          {error && <p className="text-red-600 text-xs mb-3">{error}</p>}
          <div className="flex gap-3">
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="flex items-center gap-2 bg-ink text-white px-6 py-2.5
                         rounded-full text-sm font-medium hover:bg-ink/90 disabled:opacity-50 transition-colors"
            >
              <Zap size={15} />
              {loading ? '생성 중...' : `${type} 대진표 생성`}
            </button>
            <button onClick={onClose}
              className="px-6 py-2.5 text-ink border border-ink-200 hover:border-ink rounded-full text-sm transition-colors">
              취소
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   매치 편집 사이드 패널
══════════════════════════════════════════════════════ */
function MatchPanel({ match, players, onClose, onSave }) {
  const [form,    setForm]    = useState({
    status:           match.status,
    scheduled_at:     match.scheduled_at?.slice(0, 16) ?? '',
    player_a_id:      String(match.player_a_id ?? ''),
    player_b_id:      String(match.player_b_id ?? ''),
    winner_player_id: String(match.winner_player_id ?? ''),
    score_a:          String(match.score_a ?? ''),
    score_b:          String(match.score_b ?? ''),
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const isDone = form.status === '종료';
  const playerA = players.find((p) => String(p.id) === form.player_a_id);
  const playerB = players.find((p) => String(p.id) === form.player_b_id);

  const handleSaveInfo = async () => {
    setSaving(true); setError('');
    const res  = await adminPut(`/matches/${match.id}`, {
      scheduled_at: form.scheduled_at || null,
      player_a_id:  Number(form.player_a_id)  || null,
      player_b_id:  Number(form.player_b_id)  || null,
      status:       form.status,
    });
    const data = await res.json();
    if (res.ok) onSave(data);
    else        setError(data.error ?? '저장 실패');
    setSaving(false);
  };

  const handleSaveResult = async () => {
    if (!form.winner_player_id) { setError('승자를 선택해주세요.'); return; }
    setSaving(true); setError('');
    const res  = await adminPut(`/matches/${match.id}/result`, {
      winner_player_id: Number(form.winner_player_id),
      score_a: Number(form.score_a) || 0,
      score_b: Number(form.score_b) || 0,
    });
    const data = await res.json();
    if (res.ok) onSave(data.match, data.advanced);
    else        setError(data.error ?? '저장 실패');
    setSaving(false);
  };

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 320 }}
      className="fixed right-0 top-0 bottom-0 w-[400px] bg-white z-40
                 flex flex-col border-l border-ink-200"
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-ink-200">
        <div>
          <p className="font-bold text-ink">{match.round} · 경기 {match.bracket_position}</p>
          <p className="text-xs text-ink-400 mt-0.5">Match ID: {match.id}</p>
        </div>
        <button onClick={onClose} className="text-ink-400 hover:text-ink p-1">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
        {/* 상태 + 일시 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-ink-600 mb-1 block">상태</label>
            <select value={form.status} onChange={set('status')}
              className="w-full border border-ink-200 px-4 py-3 text-sm text-ink focus:outline-none focus:border-ink transition-colors">
              {['예정','진행중','종료'].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-ink-600 mb-1 block">경기 일시</label>
            <input type="datetime-local" value={form.scheduled_at} onChange={set('scheduled_at')}
              className="w-full border border-ink-200 px-4 py-3 text-sm text-ink focus:outline-none focus:border-ink transition-colors" />
          </div>
        </div>

        {/* 선수 선택 */}
        <div className="space-y-3">
          <p className="text-xs font-medium text-ink-600">선수</p>
          <div>
            <label className="text-xs font-medium text-ink-600 mb-1 block">선수 A</label>
            <select value={form.player_a_id} onChange={set('player_a_id')}
              className="w-full border border-ink-200 px-4 py-3 text-sm text-ink focus:outline-none focus:border-ink transition-colors">
              <option value="">— TBD —</option>
              {players.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.team_name})</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-ink-600 mb-1 block">선수 B</label>
            <select value={form.player_b_id} onChange={set('player_b_id')}
              className="w-full border border-ink-200 px-4 py-3 text-sm text-ink focus:outline-none focus:border-ink transition-colors">
              <option value="">— TBD —</option>
              {players.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.team_name})</option>)}
            </select>
          </div>
        </div>

        <button onClick={handleSaveInfo} disabled={saving}
          className="w-full flex items-center justify-center gap-2 bg-ink text-white
                     py-2.5 rounded-full text-sm font-medium hover:bg-ink/90 disabled:opacity-50 transition-colors">
          <Save size={14} />
          {saving ? '저장 중...' : '정보 저장'}
        </button>

        {/* 결과 입력 */}
        {(form.player_a_id && form.player_b_id) && (
          <div className="pt-4 border-t border-ink-200">
            <p className="text-xs font-medium text-ink-600 mb-3">결과 입력</p>

            {/* 승자 선택 버튼 */}
            <div className="flex gap-2 mb-4">
              {[
                { id: form.player_a_id, name: playerA?.name ?? '선수 A' },
                { id: form.player_b_id, name: playerB?.name ?? '선수 B' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setForm((f) => ({ ...f, winner_player_id: p.id }))}
                  className={`flex-1 py-3 rounded-full text-sm font-semibold border transition-colors ${
                    form.winner_player_id === p.id
                      ? 'border-lime bg-lime text-ink'
                      : 'border-ink-200 text-ink-600 hover:border-ink'
                  }`}
                >
                  {form.winner_player_id === p.id && '🏆 '}{p.name}
                </button>
              ))}
            </div>

            {/* 점수 */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-xs font-medium text-ink-600 mb-1 block">{playerA?.name ?? '선수 A'} 점수</label>
                <input type="number" min="0" max="5" value={form.score_a} onChange={set('score_a')}
                  className="w-full border border-ink-200 px-4 py-3 text-sm text-ink text-center font-bold
                             focus:outline-none focus:border-ink transition-colors" />
              </div>
              <div>
                <label className="text-xs font-medium text-ink-600 mb-1 block">{playerB?.name ?? '선수 B'} 점수</label>
                <input type="number" min="0" max="5" value={form.score_b} onChange={set('score_b')}
                  className="w-full border border-ink-200 px-4 py-3 text-sm text-ink text-center font-bold
                             focus:outline-none focus:border-ink transition-colors" />
              </div>
            </div>

            <button onClick={handleSaveResult} disabled={saving || !form.winner_player_id}
              className="w-full flex items-center justify-center gap-2 bg-lime text-ink
                         py-2.5 rounded-full text-sm font-semibold hover:bg-lime/80
                         disabled:opacity-40 transition-colors">
              <Trophy size={14} />
              {saving ? '저장 중...' : '결과 저장 + 다음 라운드 자동 진출'}
            </button>
          </div>
        )}

        {error && <p className="text-red-600 text-xs">{error}</p>}
      </div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════
   메인 페이지
══════════════════════════════════════════════════════ */
export default function TournamentMatches() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const [tournament, setTournament]   = useState(null);
  const [matches,    setMatches]      = useState([]);
  const [players,    setPlayers]      = useState([]);
  const [selected,   setSelected]     = useState(null);
  const [showGen,    setShowGen]      = useState(false);
  const [loading,    setLoading]      = useState(true);
  const [toast,      setToast]        = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const loadMatches = useCallback(() =>
    adminGet(`/tournaments/${id}/matches`).then(setMatches).catch(console.error),
  [id]);

  useEffect(() => {
    Promise.all([
      adminGet(`/tournaments/${id}`),
      adminGet(`/tournaments/${id}/matches`),
      adminGet('/players'),
    ]).then(([t, m, p]) => {
      setTournament(t);
      setMatches(m);
      setPlayers(p);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  // 브래킷 데이터 구성
  const bracket = matches.reduce((acc, m) => {
    (acc[m.round] = acc[m.round] ?? []).push(m);
    return acc;
  }, {});

  const rounds = ALL_ROUNDS.filter((r) => bracket[r]?.length > 0);

  // 매치 선택
  const handleMatchClick = (m) => {
    setSelected((prev) => prev?.id === m.id ? null : m);
  };

  // 결과 저장 후 UI 업데이트
  const handleSave = (updatedMatch, advanced) => {
    setMatches((prev) => prev.map((m) => {
      if (m.id === updatedMatch.id) return { ...m, ...updatedMatch };
      if (advanced && m.id === advanced.matchId) {
        return { ...m, ...advanced.parent };
      }
      return m;
    }));
    // 선택된 매치도 업데이트
    setSelected((prev) => prev?.id === updatedMatch.id ? { ...prev, ...updatedMatch } : prev);
    if (advanced) showToast(`✅ ${advanced.slot === 'player_a_id' ? '선수 A' : '선수 B'} 자리에 진출자 자동 입력됨`);
    else showToast('✅ 저장 완료');
    loadMatches();
  };

  // 전체 매치 삭제
  const handleDeleteAll = async () => {
    if (!window.confirm('이 대회의 모든 매치를 삭제합니다. 예측 데이터도 삭제됩니다.')) return;
    const res = await adminDelete(`/tournaments/${id}/matches`);
    if (res.ok) { setMatches([]); setSelected(null); showToast('삭제 완료'); }
  };

  if (loading) return <div className="p-8 text-ink-400 text-sm">로딩 중...</div>;
  if (!tournament) return <div className="p-8 text-red-600 text-sm">대회를 찾을 수 없습니다.</div>;

  const hasMatches = matches.length > 0;

  return (
    <div className="flex flex-col h-full">
      {/* 상단 바 */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-ink-200 bg-white flex-shrink-0">
        <button onClick={() => navigate('/admin/tournaments')}
          className="flex items-center gap-1 text-ink-400 hover:text-ink text-sm transition-colors">
          <ChevronLeft size={16} />목록
        </button>
        <div className="flex-1">
          <h1 className="font-bold text-ink">{tournament.name}</h1>
          <p className="text-xs text-ink-400 mt-0.5">
            {tournament.tournament_type} · {tournament.status} · 매치 {matches.length}개
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!hasMatches ? (
            <button
              onClick={() => setShowGen(true)}
              className="flex items-center gap-2 bg-ink text-white px-4 py-2.5
                         rounded-full text-sm font-medium hover:bg-ink/90 transition-colors"
            >
              <Zap size={15} />
              대진표 생성
            </button>
          ) : (
            <>
              <button onClick={() => setShowGen(true)}
                className="flex items-center gap-1.5 text-xs text-ink border border-ink-200
                           hover:border-ink px-2.5 py-1.5 rounded-full transition-colors">
                <Zap size={13} />재생성
              </button>
              <button onClick={handleDeleteAll}
                className="flex items-center gap-1.5 text-xs text-red-600 border border-red-200
                           hover:bg-red-50 px-2.5 py-1.5 rounded-full transition-colors">
                <Trash2 size={13} />전체 삭제
              </button>
            </>
          )}
        </div>
      </div>

      {/* 본문 */}
      {!hasMatches ? (
        <div className="flex-1 flex items-center justify-center text-center">
          <div>
            <div className="text-5xl mb-4">🏆</div>
            <p className="text-ink font-semibold mb-2">아직 대진표가 없습니다</p>
            <p className="text-ink-400 text-sm mb-6">상단 "대진표 생성" 버튼으로 시작하세요</p>
            <button onClick={() => setShowGen(true)}
              className="flex items-center gap-2 bg-ink text-white px-6 py-3
                         rounded-full text-sm font-medium hover:bg-ink/90 mx-auto transition-colors">
              <Zap size={15} />대진표 생성
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto p-6">
          <div className="overflow-x-auto">
            <div className="relative inline-block"
                 style={{ width: bracketW(rounds), height: bracketH(rounds) }}>
              <BracketLines rounds={rounds} bracket={bracket} selectedId={selected?.id} />

              {/* 라운드 레이블 */}
              {rounds.map((round, r) => (
                <div key={round}
                     className="absolute text-[11px] font-semibold text-ink-400 uppercase tracking-widest"
                     style={{ top: 10, left: lx(r), width: MW, textAlign: 'left', paddingLeft: 4 }}>
                  {round}
                </div>
              ))}
              <div className="absolute text-[11px] font-semibold text-ink uppercase tracking-widest"
                   style={{ top: 10, left: CHAMP_LX(rounds), width: CHAMP_W, textAlign: 'center' }}>
                우승
              </div>

              {/* 매치 박스 */}
              {rounds.map((round, r) => {
                const ms = [...(bracket[round] ?? [])].sort((a,b) => (a.bracket_position ?? 0) - (b.bracket_position ?? 0));
                return ms.map((m, i) => (
                  <div key={m.id} className="absolute"
                       style={{ top: ty(r, i), left: lx(r) }}>
                    <MatchBox
                      match={m}
                      selected={selected?.id === m.id}
                      onClick={handleMatchClick}
                    />
                  </div>
                ));
              })}

              <ChampBox rounds={rounds} bracket={bracket} />
            </div>
          </div>
        </div>
      )}

      {/* 사이드 패널 */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-30 bg-black/10"
              onClick={() => setSelected(null)}
            />
            <MatchPanel
              key={selected.id}
              match={selected}
              players={players}
              onClose={() => setSelected(null)}
              onSave={handleSave}
            />
          </>
        )}
      </AnimatePresence>

      {/* 생성 모달 */}
      {showGen && (
        <GenerateModal
          tournamentId={id}
          players={players}
          onClose={() => setShowGen(false)}
          onGenerated={(ms) => { setMatches(ms); setShowGen(false); showToast(`✅ 매치 ${ms.length}개 생성 완료`); }}
        />
      )}

      {/* 토스트 */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="fixed bottom-6 right-6 bg-ink text-white px-5 py-3 rounded-full
                       text-sm font-medium z-50"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
