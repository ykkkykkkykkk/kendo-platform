import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { useFetch } from '../hooks/useFetch.js';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import DojoChangeModal from './DojoChangeModal.jsx';

export default function MyDojoCard({ onJoinClick }) {
  const { user } = useAuth();
  const [showChange, setShowChange] = useState(false);
  const { data, loading, refetch } = useFetch(user ? api.myDojo : null);

  if (!user) return null;
  if (loading) return <div className="h-28 bg-ink-200/40 animate-pulse mb-4" />;

  // 도장 미가입
  if (!data?.dojo) {
    return (
      <div className="mb-5 bg-block rounded-2xl px-5 py-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] tracking-[0.2em] font-medium" style={{ color: '#D8FF3E' }}>MY DOJO</p>
          <p className="text-white/60 text-sm mt-1">도장에 가입하고 랭킹에 참여하세요!</p>
        </div>
        <button
          onClick={onJoinClick}
          className="px-4 py-2 bg-lime hover:bg-lime-dark text-ink text-xs font-medium rounded-full pressable flex-none"
        >
          가입하기
        </button>
      </div>
    );
  }

  const { dojo, season, is_qualified, my_contribution } = data;
  const pct = dojo.total_score > 0 ? Math.round((my_contribution / dojo.total_score) * 100) : 0;
  const memberPct = Math.min(100, Math.round((dojo.member_count / 5) * 100));

  return (
    <>
      <div className="mb-5 bg-block rounded-2xl px-5 py-4">
        {/* 헤더 */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-[10px] tracking-[0.2em] font-medium" style={{ color: '#D8FF3E' }}>MY DOJO</p>
            <p className="text-white font-bold text-lg leading-tight mt-1 tracking-tight">{dojo.name}</p>
          </div>
          <div className="text-right">
            {is_qualified && dojo.current_rank ? (
              <p className="text-white font-bold text-xl leading-none tabular-nums">
                {String(dojo.current_rank).padStart(2, '0')}
              </p>
            ) : (
              <p className="text-white/40 text-xs">미집계</p>
            )}
            {season && (
              <p className="text-white/40 text-[10px] mt-0.5 tabular-nums">D—{season.days_remaining}</p>
            )}
          </div>
        </div>

        {/* 통계 */}
        <div className="flex border-t border-white/10">
          <Stat label="총점"   value={`${dojo.total_score.toLocaleString()}점`} />
          <Stat label="회원"   value={`${dojo.member_count}명`} divider />
          <Stat label="내 기여" value={`${my_contribution}점`} divider highlight />
        </div>

        {/* 5명 미만 진행도 */}
        {!is_qualified && (
          <div className="mt-3">
            <div className="flex justify-between text-[10px] mb-1.5">
              <span className="text-white/40">순위 집계까지</span>
              <span className="font-semibold" style={{ color: '#D8FF3E' }}>{dojo.member_count} / 5명</span>
            </div>
            <div className="h-[3px] bg-white/10 overflow-hidden">
              <div
                className="h-full bg-lime transition-all"
                style={{ width: `${memberPct}%` }}
              />
            </div>
            <p className="text-white/40 text-[10px] mt-1.5">
              {5 - dojo.member_count}명 더 초대하면 순위 집계 시작!
            </p>
          </div>
        )}

        {/* 내 기여 바 */}
        {is_qualified && pct > 0 && (
          <div className="mt-3">
            <div className="flex justify-between text-[10px] mb-1.5">
              <span className="text-white/40">내 기여도</span>
              <span className="font-semibold" style={{ color: '#D8FF3E' }}>{pct}%</span>
            </div>
            <div className="h-[3px] bg-white/10 overflow-hidden">
              <div className="h-full bg-lime" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}

        {/* 하단 버튼 */}
        <div className="flex items-center justify-between pt-3 mt-3 border-t border-white/10">
          <button
            onClick={() => setShowChange(true)}
            className="text-white/40 text-xs hover:text-white/70 transition-colors"
          >
            도장 변경 요청
          </button>
          <button className="flex items-center gap-1 text-white text-xs font-semibold">
            자세히 보기 <ChevronRight size={12} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showChange && (
          <DojoChangeModal
            currentDojo={dojo.name}
            onClose={() => setShowChange(false)}
            onSuccess={refetch}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function Stat({ label, value, divider, highlight }) {
  return (
    <div className={`flex-1 py-3 ${divider ? 'border-l border-white/10 pl-3' : ''}`}>
      <p className="text-white/40 text-[9px] uppercase tracking-[0.15em] mb-0.5">{label}</p>
      <p className={`text-sm font-bold ${highlight ? '' : 'text-white'}`}
         style={highlight ? { color: '#D8FF3E' } : undefined}>
        {value}
      </p>
    </div>
  );
}
