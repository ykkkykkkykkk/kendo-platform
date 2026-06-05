import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch.js';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { ScrollReveal } from '../components/ScrollReveal.jsx';
import DojoRankingTab from '../components/DojoRankingTab.jsx';

function useDarkBody() {
  useEffect(() => {
    document.body.classList.add('predict-dark');
    return () => document.body.classList.remove('predict-dark');
  }, []);
}

function totalMyScore(t) {
  return t.divisions.reduce((s, d) => s + (d.my_score ?? 0), 0);
}

const MEDAL = {
  1: { emoji: '🥇', grad: 'from-[#231700] to-[#181000]', border: 'border-amber-400/25',  scoreColor: 'text-amber-300', nameColor: 'text-amber-100' },
  2: { emoji: '🥈', grad: 'from-[#1C1C1C] to-[#131313]', border: 'border-gray-400/25',   scoreColor: 'text-gray-200',  nameColor: 'text-gray-100'  },
  3: { emoji: '🥉', grad: 'from-[#1E1109] to-[#150C05]', border: 'border-amber-700/25',  scoreColor: 'text-amber-500', nameColor: 'text-amber-200' },
};

export default function RankingPage() {
  useDarkBody();
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
    <main className="page-body bg-black min-h-screen">
      {/* 헤더 */}
      <header className="px-5 pt-12 pb-4">
        <p className="text-[10px] text-orange-500 font-semibold tracking-[0.25em] uppercase">RANKING</p>
        <h1 className="text-[32px] font-bold text-white leading-tight tracking-tight mt-0.5">랭킹</h1>
        <p className="text-sm text-white/40 mt-1">
          {mainTab === 'individual' ? '픽 예측 순위' : '도장 시즌 순위'}
        </p>
      </header>

      {/* 상단 메인 토글: INDIVIDUAL / DOJO */}
      <div className="flex gap-1 mx-5 mb-4 bg-black-900 p-1 rounded-2xl">
        {[['individual', '개인 랭킹'], ['dojo', '도장 랭킹']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setMainTab(key)}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold tracking-wider transition-all ${
              mainTab === key
                ? key === 'dojo'
                  ? 'bg-orange-500 text-black'
                  : 'bg-black-700 text-white'
                : 'text-white/35'
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
          <div className="flex gap-1 mx-5 mb-5 bg-black-900 p-1 rounded-2xl">
            {[['ongoing', '진행 대회'], ['past', '종료 대회']].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
                  tab === key ? 'bg-black-700 text-white' : 'text-white/35'
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
    </main>
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
        <p className="text-white/25 text-sm">현재 진행 중인 대회가 없어요</p>
      </div>
    );
  }

  const top3        = ranking.slice(0, 3);
  const rest        = ranking.slice(3, 10);
  const myInTop10   = myRank != null && myRank <= 10;

  return (
    <div className="px-5 flex flex-col gap-4 pb-4">
      {/* 대회 선택 (복수일 때만) */}
      {ongoing.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {ongoing.map((t) => (
            <button
              key={t.id}
              onClick={() => onSelect(t.id)}
              className={`flex-none px-3.5 py-2 rounded-full text-xs font-semibold transition-all pressable ${
                selectedId === t.id ? 'bg-orange-500 text-black' : 'bg-black-700 text-white/55'
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>
      )}

      {/* 현재 대회 카드 */}
      {selectedTournament && (
        <Link to={`/predictions/${selectedTournament.id}`} className="pressable block">
          <div className="bg-black-900 border border-black-700 rounded-2xl px-4 py-3
                          flex items-center justify-between">
            <div>
              <p className="text-white/35 text-[10px] font-semibold tracking-[0.15em] uppercase">
                현재 대회
              </p>
              <p className="text-white font-semibold text-sm mt-0.5 tracking-tight">
                {selectedTournament.name}
              </p>
            </div>
            <div className="text-right">
              <p className="text-white/40 text-xs">참여자 {total > 0 ? `${total}명` : '-'}</p>
              <p className="text-white/25 text-[10px] mt-0.5">픽 보러가기 →</p>
            </div>
          </div>
        </Link>
      )}

      {/* 랭킹 콘텐츠 */}
      {rankingLoading ? (
        <div className="flex flex-col gap-2 animate-pulse">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-black-900 rounded-2xl" />)}
          {[4, 5].map((i) => <div key={i} className="h-12 bg-black-900 rounded-xl" />)}
        </div>
      ) : ranking.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-white/25 text-sm">아직 픽한 사람이 없어요</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {/* ─ TOP 3 메달 카드 ─ */}
          {top3.map((item, i) => {
            const isMe = item.user_id === myUserId;
            const m    = MEDAL[item.rank] ?? MEDAL[3];
            return (
              <ScrollReveal key={item.user_id} delay={i * 0.08}>
              <div
                className={`bg-gradient-to-br ${m.grad} border ${m.border} rounded-2xl p-4
                            ${isMe ? 'ring-1 ring-orange-500/50' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{m.emoji}</span>
                    <div>
                      <p className={`font-bold text-[15px] ${m.nameColor}`}>
                        {item.nickname}
                        {isMe && (
                          <span className="ml-1.5 text-orange-500 text-[10px] font-semibold bg-orange-500/12 px-1.5 py-0.5 rounded-full">
                            나
                          </span>
                        )}
                      </p>
                      <p className="text-white/30 text-[11px] mt-0.5">
                        {item.dojo ?? '소속 없음'} · {item.divisions_picked}부문 픽
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-2xl font-bold leading-none ${m.scoreColor}`}>
                      {item.total_score}
                    </p>
                    <p className="text-white/25 text-[10px] mt-0.5">점</p>
                  </div>
                </div>
              </div>
              </ScrollReveal>
            );
          })}

          {/* ─ 4~10위 ─ */}
          {rest.map((item, i) => {
            const isMe = item.user_id === myUserId;
            return (
              <ScrollReveal key={item.user_id} delay={0.24 + i * 0.05}>
              <div
                className={`border rounded-xl px-4 py-3 flex items-center gap-3 ${
                  isMe
                    ? 'bg-[#1A1400] border-orange-500/30 ring-1 ring-orange-500/20'
                    : 'bg-black-900 border-black-700'
                }`}
              >
                <span className="text-white/35 text-sm font-bold w-6 text-center flex-none">
                  {item.rank}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm truncate ${isMe ? 'text-orange-500' : 'text-white/80'}`}>
                    {item.nickname}
                    {isMe && (
                      <span className="ml-1.5 text-orange-500 text-[10px] font-semibold bg-orange-500/12 px-1.5 py-0.5 rounded-full">
                        나
                      </span>
                    )}
                  </p>
                  <p className="text-white/25 text-[11px]">{item.dojo ?? '소속 없음'}</p>
                </div>
                <p className={`font-bold text-sm flex-none ${isMe ? 'text-orange-500' : 'text-white/60'}`}>
                  {item.total_score}점
                </p>
              </div>
              </ScrollReveal>
            );
          })}

          {/* ─ 내 위치 (TOP 10 밖) ─ */}
          {myRank != null && !myInTop10 && (
            <div className="mt-1 flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-black-700" />
                <p className="text-white/20 text-[10px] font-semibold tracking-wider">내 위치</p>
                <div className="flex-1 h-px bg-black-700" />
              </div>
              <div className="bg-gradient-to-br from-[#1A1200] to-[#120E00]
                              border border-orange-500/25 ring-1 ring-orange-500/15 rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-orange-500 font-bold text-lg w-7 text-center flex-none">
                      {myRank}
                    </span>
                    <div>
                      <p className="text-orange-500 font-bold text-[15px]">
                        {myNickname ?? '나'}
                        <span className="ml-1.5 text-orange-500 text-[10px] font-semibold bg-orange-500/12 px-1.5 py-0.5 rounded-full">
                          나
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-orange-500 text-2xl font-bold leading-none">{myScore}</p>
                    <p className="text-white/25 text-[10px] mt-0.5">점</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {ranking.length >= 10 && (
            <p className="text-center text-white/20 text-xs pt-1">상위 10명까지 표시</p>
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
        <p className="text-white/25 text-sm">종료된 대회가 없어요</p>
      </div>
    );
  }

  return (
    <div className="px-5 flex flex-col gap-2 pb-4">
      {past.map((t) => {
        const myScore = totalMyScore(t);
        return (
          <Link key={t.id} to={`/predictions/${t.id}`} className="pressable block">
            <div className="bg-black-900 border border-black-700 rounded-2xl px-4 py-4
                            flex items-center justify-between">
              <div className="flex-1 min-w-0 mr-3">
                <p className="text-white/60 font-semibold text-sm tracking-tight truncate">
                  {t.name}
                </p>
                {t.start_date && (
                  <p className="text-white/25 text-[11px] mt-0.5">{t.start_date}</p>
                )}
              </div>
              <div className="text-right flex-none">
                <p className="text-white/70 font-bold text-sm">{myScore}점</p>
                <p className="text-white/25 text-[10px] mt-0.5">결산 보기 →</p>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

/* ── 로딩 스켈레톤 ──────────────────────────────────────────── */
function LoadingSkeleton() {
  return (
    <div className="px-5 flex flex-col gap-2 animate-pulse">
      <div className="h-14 bg-black-900 rounded-2xl mb-2" />
      <div className="h-20 bg-black-900 rounded-2xl" />
      <div className="h-20 bg-black-900 rounded-2xl" />
      <div className="h-20 bg-black-900 rounded-2xl" />
      <div className="h-12 bg-black-900 rounded-xl" />
      <div className="h-12 bg-black-900 rounded-xl" />
    </div>
  );
}
