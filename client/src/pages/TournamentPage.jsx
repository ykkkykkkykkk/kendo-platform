import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch.js';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { SkeletonList } from '../components/Skeleton.jsx';
import KakaoLoginModal from '../components/KakaoLoginModal.jsx';
import PredictModal    from '../components/PredictModal.jsx';

const ROUND_ORDER = ['16강', '8강', '4강', '결승'];
const STATUS_STYLE = {
  예정:   'bg-gold/10 text-gold',
  진행중: 'bg-red-100 text-red-600',
  종료:   'bg-gray-100 text-gray-500',
};

export default function TournamentPage() {
  const { slug } = useParams();
  const { user }  = useAuth();
  const { data: tournament, loading } = useFetch(() => api.tournament(slug), [slug]);

  const [activeRound,  setActiveRound]  = useState('16강');
  const [showLogin,    setShowLogin]    = useState(false);
  const [predictMatch, setPredictMatch] = useState(null);
  // matchId → predictedWinnerPlayerId 매핑 (로컬 낙관적 업데이트)
  const [myPredictions, setMyPredictions] = useState({});

  if (loading) return (
    <>
      <PageHeader title="대회" />
      <main className="page-body px-4"><SkeletonList /></main>
    </>
  );
  if (!tournament) return (
    <>
      <PageHeader title="대회" />
      <main className="page-body px-4"><p className="text-sub text-sm">대회를 찾을 수 없습니다.</p></main>
    </>
  );

  const { bracket = {} } = tournament;
  const rounds = ROUND_ORDER.filter((r) => bracket[r]?.length > 0);
  const currentRound = rounds.includes(activeRound) ? activeRound : (rounds[0] ?? '16강');
  const matches = bracket[currentRound] ?? [];

  const handlePredict = (match) => {
    if (!user) { setShowLogin(true); return; }
    setPredictMatch(match);
  };

  const handlePredictSuccess = (prediction) => {
    setMyPredictions((prev) => ({
      ...prev,
      [prediction.match_id]: prediction.predicted_winner_player_id,
    }));
  };

  return (
    <>
      <PageHeader
        title={tournament.name}
        right={
          user ? (
            <span className="text-xs text-sub font-medium">{user.nickname}</span>
          ) : (
            <button
              onClick={() => setShowLogin(true)}
              className="text-xs bg-navy text-white px-3 py-1.5 rounded-full font-medium"
            >
              로그인
            </button>
          )
        }
      />

      <main className="page-body px-4">
        {/* 대회 헤더 */}
        <div className="bg-navy rounded-xl p-4 mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full
              ${tournament.status === '진행' ? 'bg-red-500 text-white'
              : tournament.status === '예정'  ? 'bg-gold text-white'
              : 'bg-gray-500 text-white'}`}>
              {tournament.status}
            </span>
            <span className="text-gray-400 text-xs">{tournament.tournament_type}</span>
          </div>
          <p className="text-white font-black text-lg leading-tight">{tournament.name}</p>
          <p className="text-gray-400 text-sm mt-1">{tournament.venue}</p>
          <p className="text-gray-400 text-xs mt-1">
            📅 {tournament.start_date} ~ {tournament.end_date}
          </p>
          <p className="text-gray-500 text-xs mt-1">주최: {tournament.host_organization}</p>
        </div>

        {/* 라운드 탭 */}
        <div className="scroll-x flex gap-2 mb-4">
          {rounds.map((r) => (
            <button
              key={r}
              onClick={() => setActiveRound(r)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-colors
                ${currentRound === r ? 'bg-navy text-white' : 'bg-card text-sub'}`}
            >
              {r}
            </button>
          ))}
        </div>

        {/* 경기 목록 */}
        <div className="flex flex-col gap-3">
          {matches.map((m) => (
            <MatchCard
              key={m.id}
              match={m}
              myPick={myPredictions[m.id]}
              onPredict={handlePredict}
            />
          ))}
          {matches.length === 0 && (
            <p className="text-sub text-sm text-center py-8">대진이 아직 확정되지 않았습니다.</p>
          )}
        </div>
      </main>

      {showLogin    && <KakaoLoginModal onClose={() => setShowLogin(false)} />}
      {predictMatch && (
        <PredictModal
          match={predictMatch}
          onClose={() => setPredictMatch(null)}
          onSuccess={handlePredictSuccess}
        />
      )}
    </>
  );
}

function MatchCard({ match: m, myPick, onPredict }) {
  const time = m.scheduled_at
    ? new Date(m.scheduled_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
    : null;
  const isDecided  = m.status === '종료';
  const hasPlayers = m.player_a_name || m.player_b_name;
  const alreadyPicked = myPick != null;

  return (
    <div className="bg-card rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sub text-xs">
          {m.bracket_position ? `경기 ${m.bracket_position}` : ''}
        </span>
        <div className="flex items-center gap-2">
          {time && <span className="text-sub text-xs">{time}</span>}
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[m.status]}`}>
            {m.status}
          </span>
        </div>
      </div>

      {hasPlayers ? (
        <div className="flex items-center gap-2">
          <PlayerSlot
            playerId={m.player_a_id}
            name={m.player_a_name}
            slug={m.player_a_slug}
            isWinner={isDecided && m.winner_name === m.player_a_name}
            isLoser={isDecided && m.winner_name && m.winner_name !== m.player_a_name}
            isPicked={myPick === m.player_a_id}
          />

          <div className="flex flex-col items-center flex-shrink-0 w-10">
            <span className="text-sub text-xs font-bold">VS</span>
            {isDecided && (
              <div className="flex gap-1 mt-1 text-xs font-bold">
                <span className="text-navy">{m.score_a}</span>
                <span className="text-sub">:</span>
                <span className="text-navy">{m.score_b}</span>
              </div>
            )}
          </div>

          <PlayerSlot
            playerId={m.player_b_id}
            name={m.player_b_name}
            slug={m.player_b_slug}
            isWinner={isDecided && m.winner_name === m.player_b_name}
            isLoser={isDecided && m.winner_name && m.winner_name !== m.player_b_name}
            isPicked={myPick === m.player_b_id}
            right
          />
        </div>
      ) : (
        <p className="text-sub text-sm text-center py-2">대진 미확정</p>
      )}

      {/* 예측 버튼 */}
      {m.status === '예정' && hasPlayers && (
        alreadyPicked ? (
          <div className="mt-3 w-full bg-gold/10 text-gold text-xs font-semibold
                          py-2 rounded-xl text-center">
            내 예측 :{' '}
            {m.player_a_id === myPick ? m.player_a_name : m.player_b_name}
          </div>
        ) : (
          <button
            onClick={() => onPredict(m)}
            className="w-full mt-3 bg-navy text-white text-sm font-semibold
                       py-2.5 rounded-xl active:opacity-80"
          >
            예측하기
          </button>
        )
      )}
    </div>
  );
}

function PlayerSlot({ name, slug, isWinner, isLoser, isPicked, right }) {
  const content = (
    <div className={`flex-1 flex flex-col ${right ? 'items-end' : 'items-start'}`}>
      <span className={`font-bold text-sm
        ${isWinner ? 'text-gold' : isLoser ? 'text-gray-400 line-through' : 'text-navy'}`}>
        {name ?? 'TBD'}
      </span>
      {isPicked && <span className="text-gold text-xs mt-0.5">내 예측 ✓</span>}
      {isWinner && <span className="text-gold text-xs">🏆 승</span>}
    </div>
  );

  if (slug && name) return <Link to={`/players/${slug}`} className="flex-1">{content}</Link>;
  return <div className="flex-1">{content}</div>;
}
