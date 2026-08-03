import { useState, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import DojoJoinModal from './DojoJoinModal.jsx';

const EVENT_YEAR = 2026;
const EVENT_MONTH = 8;

function inEventPeriod() {
  const d = new Date();
  return d.getFullYear() === EVENT_YEAR && d.getMonth() + 1 === EVENT_MONTH;
}

/**
 * 8월 도장 유입 이벤트 상시 배너.
 *
 * 팝업(AugustEventPopup)은 닫으면 그날은 끝이라 홍보가 약하다. 배너는 홈에 계속 남아
 * 이벤트가 진행 중이라는 걸 알린다. 그래서 팝업과 달리 '닫기'가 없다.
 *
 * 도장이 있는 사람에게도 보여준다 — 팝업은 참여 권유라 뺐지만, 배너는 현황판이라
 * 이미 참여 중인 사람이 자기 도장 순위를 확인하는 쓸모가 있다.
 * 문구만 상황에 맞게 바꾼다.
 */
export default function AugustEventBanner({ onLoginRequest }) {
  const { user } = useAuth();
  const [stat, setStat] = useState(null);
  const [mine, setMine] = useState(null);   // 내 도장 (없으면 null)
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!inEventPeriod()) return;
    let alive = true;
    (async () => {
      try {
        const s = await api.augustEvent();
        if (alive && s && !s.error) setStat(s);
      } catch { /* 현황을 못 받아도 배너는 띄운다 */ }
      if (user && user.role !== 'player') {
        try {
          const m = await api.myDojo();
          if (alive) setMine(m?.dojo ?? null);
        } catch { /* 무시 */ }
      }
    })();
    return () => { alive = false; };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!inEventPeriod()) return null;

  const leader = stat?.top?.[0];
  // 내 도장이 이벤트 순위에 올라 있으면 그 등수를 보여준다
  const myRank = mine && stat?.top?.find((t) => t.id === mine.id);

  return (
    <>
      <section className="px-5 mt-5">
        <button
          onClick={() => {
            if (mine) return;                    // 이미 참여 중 — 현황판일 뿐
            if (user) setJoining(true);          // 로그인했는데 도장만 없음
            else onLoginRequest?.();             // 로그인부터
          }}
          disabled={Boolean(mine)}
          className="w-full text-left bg-block rounded-2xl px-5 py-4 pressable disabled:cursor-default"
        >
          <div className="flex items-center gap-2">
            <span className="bg-lime text-ink text-[9px] font-bold tracking-[0.12em] px-1.5 py-0.5 rounded-full">
              AUGUST EVENT
            </span>
            <span className="text-white/40 text-[10px] tracking-wider">8/1 — 8/31</span>
            <span className="flex-1" />
            {!mine && <ChevronRight size={15} className="text-white/40 flex-none" />}
          </div>

          <p className="text-white font-bold text-[17px] tracking-[-0.02em] mt-2.5 leading-snug">
            8월에 관원 가장 많이 모은 도장<br />
            <span className="text-lime">죽도 10자루</span> 드려요
          </p>

          {/* 현황 한 줄 — 상황에 따라 문구가 달라진다 */}
          <p className="text-white/50 text-[11px] mt-2 leading-[1.5]">
            {myRank ? (
              <>
                우리 도장 <span className="text-lime font-semibold">{mine.name}</span>
                {' '}· 8월 신규 <span className="text-lime font-semibold">{myRank.new_members}명</span>
                {' '}· 현재 {myRank.rank}위
              </>
            ) : mine ? (
              <>
                우리 도장 <span className="text-white/80 font-semibold">{mine.name}</span>
                {' '}· 아직 8월 신규 가입이 없어요. 관원을 초대해보세요
              </>
            ) : leader ? (
              <>
                현재 1위 <span className="text-white/80 font-semibold">{leader.name}</span>
                {' '}· {leader.new_members}명
                {stat.participating_dojos > 1 && ` · ${stat.participating_dojos}개 도장 참여 중`}
                {' — 우리 도장 등록하기'}
              </>
            ) : (
              '우리 도장 등록하고 시작하기'
            )}
          </p>
        </button>
      </section>

      {joining && (
        <DojoJoinModal
          onClose={() => setJoining(false)}
          onSuccess={(d) => setMine(d ?? null)}
        />
      )}
    </>
  );
}
