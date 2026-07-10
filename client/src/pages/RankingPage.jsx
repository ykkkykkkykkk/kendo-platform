import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch.js';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { ScrollReveal } from '../components/ScrollReveal.jsx';
import DojoRankingTab from '../components/DojoRankingTab.jsx';
import LoginPrompt from '../components/LoginPrompt.jsx';

function totalMyScore(t) {
  return t.divisions.reduce((s, d) => s + (d.my_score ?? 0), 0);
}

const rankNo = (n) => String(n).padStart(2, '0');

export default function RankingPage({ onLoginRequest }) {
  const { user } = useAuth();
  const myUserId = user?.id ?? null;

  const [mainTab, setMainTab] = useState('individual'); // 'individual' | 'dojo'
  const { data, loading } = useFetch(api.tournamentsWithDivisions);
  const [tab, setTab] = useState('ongoing');
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    if (!data || selectedId) return;
    const first = Array.isArray(data) ? data.find((t) => t.status !== '종료') : null;
    if (first) setSelectedId(first.id);
  }, [data, selectedId]);

  const ongoing = Array.isArray(data) ? data.filter((t) => t.status !== '종료') : [];
  const past    = Array.isArray(data) ? data.filter((t) => t.status === '종료')  : [];

  const { data: rankingData, loading: rankingLoading } = useFetch(
    () => selectedId ? api.tournamentRanking(selectedId) : Promise.resolve(null),
    [selectedId]
  );

  const selectedTournament = ongoing.find((t) => t.id === selectedId) ?? null;
  const ranking = rankingData?.ranking  ?? [];
  const myRank  = rankingData?.my_rank  ?? null;
  const myScore = rankingData?.my_score ?? null;
  const total   = rankingData?.total    ?? 0;

  return (
    <main className="page-body bg-paper min-h-screen">
      {/* 헤더 */}
      <header className="px-5 pt-12 pb-5">
        <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium">RANKING</p>
        <h1 className="text-4xl font-bold text-ink tracking-[-0.04em] leading-[0.95] mt-1">랭킹</h1>
        <p className="text-sm text-ink-400 mt-2">
          {mainTab === 'individual' ? '픽 예측 순위' : '도장 시즌 순위'}
        </p>
      </header>

      {!user ? (
        <LoginPrompt
          eyebrow="RANK"
          title="랭킹에 참여해보세요"
          desc="로그인하고 예측 점수를 쌓아 랭킹에 이름을 올려보세요."
          onLoginRequest={onLoginRequest}
        />
      ) : (
      <>

      {/* 상단 메인 토글: INDIVIDUAL / DOJO */}
      <div className="flex gap-2 mx-5 mb-4">
        {[['individual', '개인 랭킹'], ['dojo', '도장 랭킹']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setMainTab(key)}
            className={`px-4 py-2 rounded-full text-xs font-medium transition-all pressable border ${
              mainTab === key
                ? 'bg-ink text-white border-ink'
                : 'bg-paper text-ink-600 border-ink-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {mainTab === 'dojo' ? (
        <DojoRankingTab />
      ) : (
        <>
          {/* 개인 랭킹 서브탭 */}
          <div className="flex gap-2 mx-5 mb-5">
            {[['ongoing', '진행 대회'], ['past', '종료 대회']].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`text-xs font-medium transition-all pressable pb-1 border-b-2 ${
                  tab === key ? 'text-ink border-ink' : 'text-ink-400 border-transparent'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {loading ? (
            <LoadingSkeleton />
          ) : tab === 'ongoing' ? (
            <OngoingTab
              ongoing={ongoing}
              selectedId={selectedId}
              onSelect={setSelectedId}
              selectedTournament={selectedTournament}
              ranking={ranking}
              myRank={myRank}
              myScore={myScore}
              myUserId={myUserId}
              myNickname={user?.nickname}
              total={total}
              rankingLoading={rankingLoading}
            />
          ) : (
            <PastTab past={past} />
          )}
        </>
      )}
      </>
      )}
    </main>
  );
}

/* ── 랭킹 행 (테이블 문법) ──────────────────────────────────── */
function RankRow({ rank, name, sub, score, isMe, first, big }) {
  return (
    <div className={`flex items-center gap-3 ${big ? 'py-3.5' : 'py-3'} ${first ? '' : 'border-t border-ink-200'}`}>
      <span className={`tabular-nums font-bold flex-none w-8 ${big ? 'text-base text-ink' : 'text-sm text-ink-400'}`}>
        {rankNo(rank)}
      </span>
      <div className="flex-1 min-w-0">
        <p className={`font-bold truncate ${big ? 'text-base' : 'text-sm'} text-ink`}>
          {isMe ? <span className="bg-lime px-1">{name}</span> : name}
        </p>
        {sub && <p className="text-ink-400 text-[11px] mt-0.5 truncate">{sub}</p>}
      </div>
      <p className={`font-bold flex-none tabular-nums ${big ? 'text-lg' : 'text-sm'} text-ink`}>
        {score}
        <span className="text-[10px] text-ink-400 font-medium ml-0.5">점</span>
      </p>
    </div>
  );
}

/* ── 진행 대회 탭 ───────────────────────────────────────────── */
function OngoingTab({
  ongoing, selectedId, onSelect, selectedTournament,
  ranking, myRank, myScore, myUserId, myNickname, total, rankingLoading,
}) {
  if (ongoing.length === 0) {
    return (
      <div className="px-5 py-16 text-center">
        <p className="text-ink-400 text-sm">현재 진행 중인 대회가 없어요</p>
      </div>
    );
  }

  const top10 = ranking.slice(0, 10);
  const myInTop10 = myRank != null && myRank <= 10;

  return (
    <div className="px-5 flex flex-col gap-5 pb-4">
      {/* 대회 선택 (복수일 때만) */}
      {ongoing.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {ongoing.map((t) => (
            <button
              key={t.id}
              onClick={() => onSelect(t.id)}
              className={`flex-none px-3.5 py-2 rounded-full text-xs font-medium transition-all pressable border ${
                selectedId === t.id ? 'bg-ink text-white border-ink' : 'bg-paper text-ink-600 border-ink-200'
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>
      )}

      {/* 현재 대회 */}
      {selectedTournament && (
        <Link to={`/predictions/${selectedTournament.id}`} className="pressable block">
          <div className="flex items-center justify-between py-3" style={{ borderTop: '1.5px solid #111111', borderBottom: '1px solid #E5E5E5' }}>
            <div>
              <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium">NOW</p>
              <p className="text-ink font-bold text-sm mt-0.5 tracking-tight">
                {selectedTournament.name}
              </p>
            </div>
            <div className="text-right">
              <p className="text-ink-400 text-xs">참여 {total > 0 ? `${total}명` : '—'}</p>
              <p className="text-ink text-[10px] font-semibold mt-0.5">픽 보러가기 →</p>
            </div>
          </div>
        </Link>
      )}

      {/* 랭킹 테이블 */}
      {rankingLoading ? (
        <div className="flex flex-col gap-2 animate-pulse">
          {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-12 bg-ink-200/40" />)}
        </div>
      ) : ranking.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-ink-400 text-sm">아직 픽한 사람이 없어요</p>
        </div>
      ) : (
        <div>
          <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium mb-2">TOP 10</p>
          <div style={{ borderTop: '1.5px solid #111111' }}>
            {top10.map((item, i) => (
              <ScrollReveal key={item.user_id} delay={Math.min(i * 0.04, 0.3)}>
                <RankRow
                  rank={item.rank}
                  name={item.nickname}
                  sub={`${item.dojo ?? '소속 없음'} · ${item.divisions_picked}부문 픽`}
                  score={item.total_score}
                  isMe={item.user_id === myUserId}
                  first={i === 0}
                  big={item.rank <= 3}
                />
              </ScrollReveal>
            ))}
          </div>

          {/* 내 위치 (TOP 10 밖) */}
          {myRank != null && !myInTop10 && (
            <div className="mt-6">
              <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium mb-2">MY POSITION</p>
              <div style={{ borderTop: '1.5px solid #111111' }}>
                <RankRow
                  rank={myRank}
                  name={myNickname ?? '나'}
                  score={myScore}
                  isMe
                  first
                  big
                />
              </div>
            </div>
          )}

          {ranking.length >= 10 && (
            <p className="text-center text-ink-400 text-xs pt-4">상위 10명까지 표시</p>
          )}
        </div>
      )}
    </div>
  );
}

/* ── 종료 대회 탭 ───────────────────────────────────────────── */
function PastTab({ past }) {
  if (past.length === 0) {
    return (
      <div className="px-5 py-16 text-center">
        <p className="text-ink-400 text-sm">종료된 대회가 없어요</p>
      </div>
    );
  }

  return (
    <div className="px-5 pb-4">
      <div style={{ borderTop: '1.5px solid #111111' }}>
        {past.map((t, i) => {
          const myScore = totalMyScore(t);
          return (
            <Link key={t.id} to={`/predictions/${t.id}`} className={`pressable flex items-center justify-between py-4 ${i > 0 ? 'border-t border-ink-200' : ''}`}>
              <div className="flex-1 min-w-0 mr-3">
                <p className="text-ink font-semibold text-sm tracking-tight truncate">
                  {t.name}
                </p>
                {t.start_date && (
                  <p className="text-ink-400 text-[11px] mt-0.5">{t.start_date}</p>
                )}
              </div>
              <div className="text-right flex-none">
                <p className="text-ink font-bold text-sm tabular-nums">{myScore}점</p>
                <p className="text-ink-400 text-[10px] mt-0.5">결산 보기 →</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/* ── 로딩 스켈레톤 ──────────────────────────────────────────── */
function LoadingSkeleton() {
  return (
    <div className="px-5 flex flex-col gap-2 animate-pulse">
      <div className="h-14 bg-ink-200/40 mb-2" />
      <div className="h-12 bg-ink-200/40" />
      <div className="h-12 bg-ink-200/40" />
      <div className="h-12 bg-ink-200/40" />
      <div className="h-12 bg-ink-200/40" />
    </div>
  );
}
