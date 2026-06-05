import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useFetch } from '../hooks/useFetch.js';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { ScrollReveal } from './ScrollReveal.jsx';
import MyDojoCard from './MyDojoCard.jsx';
import DojoChangeModal from './DojoChangeModal.jsx';

const DOJO_MEDAL = {
  1: {
    grad:        'from-[#2A1800] via-[#1F1000] to-[#150A00]',
    border:      'border-amber-400/30',
    glow:        'shadow-[0_0_24px_rgba(255,180,0,0.12)]',
    rankColor:   'text-amber-300',
    scoreColor:  'text-amber-300',
    nameColor:   'text-amber-100',
    medalBg:     'bg-amber-400/15 border-amber-400/30',
    prize:       '🎋 선수 1명 초청 (반일)',
    prizeTier:   'half_day_clinic',
  },
  2: {
    grad:        'from-[#1E1E1E] via-[#181818] to-[#111]',
    border:      'border-gray-400/25',
    glow:        'shadow-[0_0_16px_rgba(200,200,200,0.06)]',
    rankColor:   'text-gray-300',
    scoreColor:  'text-gray-200',
    nameColor:   'text-gray-100',
    medalBg:     'bg-gray-400/10 border-gray-400/25',
    prize:       '🥋 선수 1명 (2시간 강습)',
    prizeTier:   'two_hour_clinic',
  },
  3: {
    grad:        'from-[#1E1005] via-[#160C04] to-[#0F0800]',
    border:      'border-amber-700/25',
    glow:        'shadow-[0_0_16px_rgba(205,127,50,0.08)]',
    rankColor:   'text-amber-600',
    scoreColor:  'text-amber-500',
    nameColor:   'text-amber-200',
    medalBg:     'bg-amber-700/10 border-amber-700/25',
    prize:       '🎁 단체 사인 굿즈',
    prizeTier:   'merchandise',
  },
};

function SeasonCard({ season }) {
  if (!season) return null;
  return (
    <div className="mb-5 bg-black-900 border border-black-700 rounded-2xl px-5 py-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-orange-500 text-[10px] uppercase tracking-[0.2em] font-semibold">SEASON</p>
          <p className="text-white font-bold text-base mt-0.5">{season.name}</p>
        </div>
        <div className="text-right">
          <p className="text-orange-400 font-black text-2xl leading-none">D-{season.days_remaining}</p>
          <p className="text-white/30 text-[10px] mt-0.5">{season.end_date} 마감</p>
        </div>
      </div>
      <p className="text-white/40 text-xs mt-3 leading-relaxed">
        시즌 종료 시 <span className="text-orange-400 font-semibold">1·2·3위 도장</span>에 선수 초청권 지급
      </p>
    </div>
  );
}

function MedalCard({ item, rank, myDojoId }) {
  const m = DOJO_MEDAL[rank];
  const isMe = item.dojo_id === myDojoId;

  return (
    <ScrollReveal delay={(rank - 1) * 0.08}>
      <div className={`bg-gradient-to-br ${m.grad} border ${m.border} ${m.glow} rounded-2xl p-5
                       ${isMe ? 'ring-1 ring-orange-500/40' : ''}`}>
        <div className="flex items-start gap-4">
          {/* 메달 원 */}
          <div className={`w-12 h-12 rounded-full border ${m.medalBg} flex items-center justify-center flex-none`}>
            <span className={`font-black text-xl ${m.rankColor}`}>{rank}</span>
          </div>
          {/* 정보 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className={`font-black text-lg leading-tight truncate ${m.nameColor}`}>
                  {item.name}
                  {isMe && <span className="ml-2 text-[10px] text-orange-500 bg-orange-500/15 px-1.5 py-0.5 rounded-full font-semibold">내 도장</span>}
                </p>
                <p className="text-white/30 text-xs mt-0.5">{item.member_count}명</p>
              </div>
              <div className="text-right flex-none">
                <p className={`font-black text-2xl leading-none ${m.scoreColor}`}>
                  {item.total_score.toLocaleString()}
                </p>
                <p className="text-white/25 text-[10px] mt-0.5">점</p>
              </div>
            </div>
            {item.top_contributors?.length > 0 && (
              <p className="text-white/25 text-[10px] mt-2 truncate">
                {item.top_contributors.join(' · ')}
              </p>
            )}
          </div>
        </div>
        {/* 보상 */}
        <div className={`mt-3 pt-3 border-t ${m.border} flex items-center gap-2`}>
          <span className="text-white/50 text-[11px]">{m.prize}</span>
        </div>
      </div>
    </ScrollReveal>
  );
}

function ListCard({ item, myDojoId, delay }) {
  const isMe = item.dojo_id === myDojoId;
  return (
    <ScrollReveal delay={delay}>
      <div className={`border rounded-xl px-4 py-3 flex items-center gap-3
        ${isMe
          ? 'bg-[#1A0E00] border-orange-500/30 ring-1 ring-orange-500/15'
          : 'bg-black-900 border-black-700'}`}
      >
        <span className="text-white/35 text-sm font-bold w-6 text-center flex-none">{item.rank}</span>
        <div className="flex-1 min-w-0">
          <p className={`font-semibold text-sm truncate ${isMe ? 'text-orange-400' : 'text-white/80'}`}>
            {item.name}
            {isMe && <span className="ml-1.5 text-[10px] text-orange-500 bg-orange-500/12 px-1.5 py-0.5 rounded-full">내 도장</span>}
          </p>
          <p className="text-white/25 text-[10px]">{item.member_count}명</p>
        </div>
        <p className={`font-bold text-sm flex-none ${isMe ? 'text-orange-400' : 'text-white/60'}`}>
          {item.total_score.toLocaleString()}점
        </p>
      </div>
    </ScrollReveal>
  );
}

export default function DojoRankingTab({ onJoinClick }) {
  const { user } = useAuth();
  const { data, loading } = useFetch(api.dojoRanking);
  const [showChange, setShowChange] = useState(false);

  if (loading) {
    return (
      <div className="px-5 flex flex-col gap-3 animate-pulse">
        <div className="h-20 bg-black-900 rounded-2xl" />
        <div className="h-28 bg-black-900 rounded-2xl" />
        <div className="h-28 bg-black-900 rounded-2xl" />
        <div className="h-28 bg-black-900 rounded-2xl" />
      </div>
    );
  }

  const ranking   = data?.ranking  ?? [];
  const myDojo    = data?.my_dojo  ?? null;
  const season    = data?.season   ?? null;
  const top3      = ranking.slice(0, 3);
  const rest      = ranking.slice(3);
  const myDojoId  = myDojo?.dojo_id ?? null;
  const myInTop10 = myDojo && myDojo.rank != null && myDojo.rank <= 10;

  return (
    <div className="px-5 flex flex-col gap-3 pb-6">
      {/* 내 도장 카드 */}
      <MyDojoCard onJoinClick={onJoinClick} />

      {/* 시즌 카드 */}
      {season && (
        <SeasonCard season={{
          name: season.name,
          end_date: season.end_date,
          days_remaining: Math.max(0, Math.ceil((new Date(season.end_date) - Date.now()) / 86400000)),
        }} />
      )}

      {ranking.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-white/25 text-sm">아직 집계된 도장이 없어요</p>
          <p className="text-white/15 text-xs mt-1">5명 이상 도장부터 순위에 오릅니다</p>
        </div>
      ) : (
        <>
          {/* TOP 3 */}
          <div className="flex flex-col gap-3">
            {top3.map((item) => (
              <MedalCard key={item.dojo_id} item={item} rank={item.rank} myDojoId={myDojoId} />
            ))}
          </div>

          {/* 4위~ */}
          {rest.length > 0 && (
            <div className="flex flex-col gap-2 mt-1">
              {rest.map((item, i) => (
                <ListCard key={item.dojo_id} item={item} myDojoId={myDojoId} delay={0.24 + i * 0.04} />
              ))}
            </div>
          )}

          {/* 내 도장 (TOP 10 밖) */}
          {myDojo && !myInTop10 && (
            <div className="mt-2">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex-1 h-px bg-black-700" />
                <p className="text-white/20 text-[10px] font-semibold tracking-wider">내 도장</p>
                <div className="flex-1 h-px bg-black-700" />
              </div>
              <div className={`border rounded-2xl px-4 py-4 bg-[#1A0E00] border-orange-500/25 ring-1 ring-orange-500/15`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-500 font-black text-lg leading-none">
                      {myDojo.rank != null ? `${myDojo.rank}위` : '미집계'}
                    </p>
                    <p className="text-orange-400/80 font-semibold text-sm mt-0.5">{myDojo.name}</p>
                    {!myDojo.is_qualified && (
                      <p className="text-white/30 text-xs mt-0.5">{myDojo.member_count} / 5명 — 아직 집계 전</p>
                    )}
                  </div>
                  <p className="text-orange-400 font-black text-xl">{myDojo.total_score.toLocaleString()}점</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <AnimatePresence>
        {showChange && (
          <DojoChangeModal
            currentDojo={myDojo?.name}
            onClose={() => setShowChange(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
