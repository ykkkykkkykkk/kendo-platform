import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useFetch } from '../hooks/useFetch.js';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { ScrollReveal } from './ScrollReveal.jsx';
import MyDojoCard from './MyDojoCard.jsx';
import DojoChangeModal from './DojoChangeModal.jsx';

const PRIZES = {
  1: '선수 1명 초청 (반일)',
  2: '선수 1명 (2시간 강습)',
  3: '단체 사인 굿즈',
};

const rankNo = (n) => String(n).padStart(2, '0');

/* 시즌 정보 — 얇은 룰 한 줄 */
function SeasonRow({ season }) {
  if (!season) return null;
  return (
    <div className="mb-5">
      <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium mb-2">SEASON</p>
      <div className="pt-3 pb-3" style={{ borderTop: '1.5px solid #111111', borderBottom: '1px solid #E5E5E5' }}>
        <div className="flex items-center gap-3">
          <p className="text-ink font-bold text-base tracking-tight">{season.name}</p>
          <span className="flex-1 border-t border-ink-200" />
          <p className="text-ink font-bold text-lg tabular-nums">D—{season.days_remaining}</p>
        </div>
        <p className="text-ink-400 text-xs mt-2">
          {season.end_date} 마감 · 시즌 종료 시 <span className="bg-lime text-ink px-1 font-semibold">1·2·3위 도장</span>에 선수 초청권 지급
        </p>
      </div>
    </div>
  );
}

/* 도장 랭킹 행 */
function DojoRow({ item, myDojoId, first, delay = 0 }) {
  const isMe = item.dojo_id === myDojoId;
  const big  = item.rank <= 3;
  const prize = PRIZES[item.rank];

  return (
    <ScrollReveal delay={delay}>
      <div className={`flex items-center gap-3 ${big ? 'py-3.5' : 'py-3'} ${first ? '' : 'border-t border-ink-200'}`}>
        <span className={`tabular-nums font-bold flex-none w-8 ${big ? 'text-base text-ink' : 'text-sm text-ink-400'}`}>
          {rankNo(item.rank)}
        </span>
        <div className="flex-1 min-w-0">
          <p className={`font-bold truncate ${big ? 'text-base' : 'text-sm'} text-ink`}>
            {isMe ? <span className="bg-lime px-1">{item.name}</span> : item.name}
          </p>
          <p className="text-ink-400 text-[11px] mt-0.5 truncate">
            {item.member_count}명
            {prize && <> · {prize}</>}
            {item.top_contributors?.length > 0 && <> · {item.top_contributors.join(' · ')}</>}
          </p>
        </div>
        <p className={`font-bold flex-none tabular-nums ${big ? 'text-lg' : 'text-sm'} text-ink`}>
          {item.total_score.toLocaleString()}
          <span className="text-[10px] text-ink-400 font-medium ml-0.5">점</span>
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
        <div className="h-20 bg-ink-200/40" />
        <div className="h-12 bg-ink-200/40" />
        <div className="h-12 bg-ink-200/40" />
        <div className="h-12 bg-ink-200/40" />
      </div>
    );
  }

  const ranking   = data?.ranking  ?? [];
  const myDojo    = data?.my_dojo  ?? null;
  const season    = data?.season   ?? null;
  const myDojoId  = myDojo?.dojo_id ?? null;
  const myInTop10 = myDojo && myDojo.rank != null && myDojo.rank <= 10;

  return (
    <div className="px-5 flex flex-col pb-6">
      {/* 내 도장 카드 */}
      <MyDojoCard onJoinClick={onJoinClick} />

      {/* 시즌 정보 */}
      {season && (
        <SeasonRow season={{
          name: season.name,
          end_date: season.end_date,
          days_remaining: Math.max(0, Math.ceil((new Date(season.end_date) - Date.now()) / 86400000)),
        }} />
      )}

      {ranking.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-ink-400 text-sm">아직 집계된 도장이 없어요</p>
          <p className="text-ink-400/60 text-xs mt-1">5명 이상 도장부터 순위에 오릅니다</p>
        </div>
      ) : (
        <>
          <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium mb-2">DOJO RANKING</p>
          <div style={{ borderTop: '1.5px solid #111111' }}>
            {ranking.map((item, i) => (
              <DojoRow
                key={item.dojo_id}
                item={item}
                myDojoId={myDojoId}
                first={i === 0}
                delay={Math.min(i * 0.04, 0.3)}
              />
            ))}
          </div>

          {/* 내 도장 (TOP 10 밖) */}
          {myDojo && !myInTop10 && (
            <div className="mt-6">
              <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium mb-2">MY DOJO</p>
              <div className="flex items-center gap-3 py-3.5" style={{ borderTop: '1.5px solid #111111' }}>
                <span className="tabular-nums font-bold flex-none w-8 text-base text-ink">
                  {myDojo.rank != null ? rankNo(myDojo.rank) : '—'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-base text-ink truncate">
                    <span className="bg-lime px-1">{myDojo.name}</span>
                  </p>
                  {!myDojo.is_qualified && (
                    <p className="text-ink-400 text-[11px] mt-0.5">{myDojo.member_count} / 5명 — 아직 집계 전</p>
                  )}
                </div>
                <p className="font-bold flex-none tabular-nums text-lg text-ink">
                  {myDojo.total_score.toLocaleString()}
                  <span className="text-[10px] text-ink-400 font-medium ml-0.5">점</span>
                </p>
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
