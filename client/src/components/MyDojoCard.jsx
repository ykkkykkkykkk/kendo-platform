import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ChevronRight, Users, Star, Calendar } from 'lucide-react';
import { useFetch } from '../hooks/useFetch.js';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import DojoChangeModal from './DojoChangeModal.jsx';

export default function MyDojoCard({ onJoinClick }) {
  const { user } = useAuth();
  const [showChange, setShowChange] = useState(false);
  const { data, loading, refetch } = useFetch(user ? api.myDojo : null);

  if (!user) return null;
  if (loading) return <div className="h-28 bg-black-900 rounded-2xl animate-pulse mb-4" />;

  // 도장 미가입
  if (!data?.dojo) {
    return (
      <div className="mb-4 bg-black-900 border border-black-700 rounded-2xl px-5 py-4 flex items-center justify-between">
        <div>
          <p className="text-white/50 text-xs uppercase tracking-wider font-semibold">MY DOJO</p>
          <p className="text-white/40 text-sm mt-1">도장에 가입하고 랭킹에 참여하세요!</p>
        </div>
        <button
          onClick={onJoinClick}
          className="px-4 py-2 bg-orange-500 text-black text-xs font-bold rounded-xl pressable flex-none"
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
      <div className="mb-4 bg-gradient-to-br from-[#1A0E00] to-[#0F0800] border border-orange-500/20 rounded-2xl px-5 py-4">
        {/* 헤더 */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-orange-500 text-[10px] uppercase tracking-[0.2em] font-semibold">MY DOJO</p>
            <p className="text-white font-bold text-lg leading-tight mt-0.5">{dojo.name}</p>
          </div>
          <div className="text-right">
            {is_qualified && dojo.current_rank ? (
              <p className="text-orange-400 font-black text-xl leading-none">#{dojo.current_rank}</p>
            ) : (
              <p className="text-white/30 text-xs">미집계</p>
            )}
            {season && (
              <p className="text-white/30 text-[10px] mt-0.5">D-{season.days_remaining}</p>
            )}
          </div>
        </div>

        {/* 통계 */}
        <div className="flex gap-3 mb-3">
          <Stat icon={<Star size={12} />} label="총점" value={`${dojo.total_score.toLocaleString()}점`} />
          <Stat icon={<Users size={12} />} label="회원" value={`${dojo.member_count}명`} />
          <Stat icon={<Calendar size={12} />} label="내 기여" value={`${my_contribution}점`} color="text-orange-400" />
        </div>

        {/* 5명 미만 진행도 */}
        {!is_qualified && (
          <div className="mb-3">
            <div className="flex justify-between text-[10px] mb-1">
              <span className="text-white/40">순위 집계까지</span>
              <span className="text-orange-400 font-semibold">{dojo.member_count} / 5명</span>
            </div>
            <div className="h-1.5 bg-black-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-orange-500 rounded-full transition-all"
                style={{ width: `${memberPct}%` }}
              />
            </div>
            <p className="text-white/30 text-[10px] mt-1">
              {5 - dojo.member_count}명 더 초대하면 순위 집계 시작!
            </p>
          </div>
        )}

        {/* 내 기여 바 */}
        {is_qualified && pct > 0 && (
          <div className="mb-3">
            <div className="flex justify-between text-[10px] mb-1">
              <span className="text-white/40">내 기여도</span>
              <span className="text-orange-400 font-semibold">{pct}%</span>
            </div>
            <div className="h-1 bg-black-700 rounded-full overflow-hidden">
              <div className="h-full bg-orange-500/60 rounded-full" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}

        {/* 하단 버튼 */}
        <div className="flex items-center justify-between pt-2 border-t border-white/5">
          <button
            onClick={() => setShowChange(true)}
            className="text-white/30 text-xs hover:text-white/60 transition-colors"
          >
            도장 변경 요청
          </button>
          <button className="flex items-center gap-1 text-orange-500 text-xs font-semibold">
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

function Stat({ icon, label, value, color = 'text-white' }) {
  return (
    <div className="flex-1 bg-black/30 rounded-xl px-3 py-2">
      <div className="flex items-center gap-1 text-white/30 mb-0.5">
        {icon}
        <span className="text-[9px] uppercase tracking-wider">{label}</span>
      </div>
      <p className={`text-sm font-bold ${color}`}>{value}</p>
    </div>
  );
}
