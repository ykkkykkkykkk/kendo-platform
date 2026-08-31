import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import DojoJoinModal from './DojoJoinModal.jsx';

const SEEN_KEY = 'aug_event_date';
const EVENT_YEAR = 2026;
const EVENT_MONTH = 8;   // 8월에만 노출

/** 로컬 기준 오늘 날짜 'YYYY-MM-DD'. toISOString()은 UTC라 새벽에 하루 밀린다. */
function today() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function inEventPeriod() {
  const d = new Date();
  return d.getFullYear() === EVENT_YEAR && d.getMonth() + 1 === EVENT_MONTH;
}

const ROWS = [
  ['기간', '8/1 ~ 8/31'],
  ['대상', '도장별 총 관원 수'],
  ['발표', '9월 초 도장 랭킹'],
];

/**
 * 8월 도장 유입 이벤트 팝업.
 *
 * 첫 방문 환영 팝업(WelcomeModal)과 달리 한 번 보고 끝이 아니라 하루 한 번 다시 뜬다.
 * localStorage에 마지막으로 본 날짜를 넣고, 날짜가 바뀌면 다시 보여준다.
 *
 * 안 띄우는 경우
 *  - 8월이 아님 (9월 되면 로직 자체를 건너뛴다)
 *  - 오늘 이미 봤음
 *  - 이미 도장에 등록된 회원 (이미 참여 중이라 권할 게 없다)
 *  - 선수 계정 (소속이 팀이라 도장 이벤트 대상이 아니다)
 *  - 첫 방문 환영 팝업이 뜰 차례 (두 개가 겹쳐 보이면 안 된다)
 */
export default function AugustEventPopup({ onRegisterRequest }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [stat, setStat] = useState(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!inEventPeriod()) return;
    if (localStorage.getItem(SEEN_KEY) === today()) return;
    if (user?.role === 'player') return;
    // 환영 팝업이 아직 안 뜬 신규 방문자에게는 그쪽을 먼저 보여준다
    if (!user && localStorage.getItem('welcome_seen') !== 'true') return;

    let alive = true;
    (async () => {
      // 이미 도장이 있으면 참여 중이므로 띄우지 않는다
      if (user) {
        try {
          const mine = await api.myDojo();
          if (mine?.dojo) return;
        } catch { /* 조회 실패 시엔 그냥 띄운다 */ }
      }
      if (!alive) return;
      setOpen(true);
      try {
        const s = await api.augustEvent();
        if (alive && s && !s.error) setStat(s);
      } catch { /* 현황은 없어도 팝업은 뜬다 */ }
    })();
    return () => { alive = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const close = () => {
    localStorage.setItem(SEEN_KEY, today());
    setOpen(false);
  };

  // 로그인 전이면 가입 모달, 로그인했는데 도장만 없으면 도장 등록 모달로 보낸다.
  const start = () => {
    close();
    if (user) setJoining(true);
    else onRegisterRequest?.();
  };

  const leader = stat?.top?.[0];

  return (
    <AnimatePresence>
      {joining && (
        <DojoJoinModal key="dojo-join" onClose={() => setJoining(false)} />
      )}
      {open && (
        <motion.div
          className="fixed inset-0 z-[65] flex items-center justify-center"
          style={{ paddingLeft: 18, paddingRight: 18 }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={close}
        >
          <div className="absolute inset-0 bg-black/50" />

          <motion.div
            className="relative w-full max-w-[300px] bg-paper rounded-[22px] p-6"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            role="dialog" aria-modal="true" aria-label="8월 도장 이벤트"
          >
            <button
              onClick={close}
              aria-label="닫기"
              className="absolute top-4 right-4 w-7 h-7 rounded-full border border-ink-200
                         flex items-center justify-center text-ink-400 pressable"
            >
              <X size={14} />
            </button>

            {/* 상단 */}
            <span className="inline-block bg-lime text-ink text-[10px] font-bold
                             tracking-[0.14em] px-2.5 py-1 rounded-full">
              AUGUST EVENT
            </span>
            <h2 className="text-[23px] font-bold text-ink tracking-[-0.03em] leading-[1.25] mt-3">
              우리 도장<br />다 모여라
            </h2>
            <p className="text-ink-400 text-[12px] leading-[1.55] mt-2">
              관원이 가장 많은<br />도장에게
            </p>

            {/* 상품 */}
            <div className="bg-block rounded-[14px] px-4 py-4 mt-4 text-center">
              <p className="text-[22px] leading-none">🎋</p>
              <p className="text-lime text-[24px] font-bold tracking-[-0.02em] mt-1.5">
                죽도 10자루
              </p>
              <p className="text-white/40 text-[11px] mt-1">우승 도장에 통째로 지급</p>
            </div>

            {/* 정보 */}
            <div className="mt-4">
              {ROWS.map(([k, v]) => (
                <div key={k} className="flex items-center justify-between py-2 border-t border-ink-200">
                  <span className="text-ink-400 text-[11px]">{k}</span>
                  <span className="text-ink text-[12px] font-medium">{v}</span>
                </div>
              ))}
            </div>

            {/* 현황 — 지금 1등이 몇 명인지 보여줘 참여를 자극한다 */}
            {leader && (
              <p className="text-ink-400 text-[11px] mt-3 leading-[1.5]">
                현재 1위{' '}
                <span className="text-ink font-semibold">{leader.name}</span>
                {' '}· 관원{' '}
                <span className="bg-lime text-ink px-1 font-semibold">{leader.new_members}명</span>
                {stat.participating_dojos > 1 && (
                  <span className="text-ink-400/70"> · {stat.participating_dojos}개 도장 참여 중</span>
                )}
              </p>
            )}

            {/* 하단 */}
            <button
              onClick={start}
              className="w-full bg-lime hover:bg-lime-dark text-ink font-bold text-[14px]
                         py-3.5 rounded-full mt-4 pressable"
            >
              우리 도장 등록하고 시작
            </button>
            <p className="text-ink-400 text-[11px] text-center mt-2.5">
              닉네임이랑 도장 이름만 있으면 30초
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
