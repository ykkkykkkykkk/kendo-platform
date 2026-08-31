import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';

const SEEN_KEY  = 'aug_result_seen';
const OPEN_FROM = '2026-09-01';   // 이벤트가 끝난 다음 날부터
const OPEN_TO   = '2026-09-07';   // 일주일만 띄우고 내린다

/** 오늘(한국 날짜) */
function today() {
  const p = (n) => String(n).padStart(2, '0');
  const d = new Date();
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const MEDAL = ['🥇', '🥈', '🥉'];

/**
 * 8월 도장 이벤트 결과 발표.
 *
 * 8월이 지나면 이벤트 배너·팝업이 스스로 사라진다(EVENT_MONTH=8). 그러면 참여한
 * 79개 도장이 결과를 볼 자리가 없어서, 9월 1일부터 일주일간 이 팝업으로 알린다.
 *
 * 집계는 서버가 8월 말까지 가입한 관원으로 고정해서 준다 — 9월에 새로 가입한
 * 사람 때문에 발표한 순위가 나중에 바뀌면 안 된다.
 *
 * 한 번 보면 다시 뜨지 않는다. 발표는 반복해 조를 일이 아니다.
 */
export default function AugustResultPopup() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [stat, setStat] = useState(null);

  useEffect(() => {
    const t = today();
    if (t < OPEN_FROM || t > OPEN_TO) return;
    if (localStorage.getItem(SEEN_KEY) === 'true') return;

    let alive = true;
    (async () => {
      try {
        const s = await api.augustEvent();
        if (!alive || !s?.top?.length) return;
        setStat(s);
        setOpen(true);
      } catch { /* 못 받으면 조용히 넘어간다 */ }
    })();
    return () => { alive = false; };
  }, [user]);

  const close = () => {
    localStorage.setItem(SEEN_KEY, 'true');
    setOpen(false);
  };

  const top   = stat?.top ?? [];
  const mine  = user?.dojo_id != null ? top.find((t) => t.id === user.dojo_id) : null;
  const first = top[0];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center px-5"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={close}
        >
          <div className="absolute inset-0 bg-black/50" />

          <motion.div
            className="relative w-full max-w-[340px] bg-paper rounded-[20px] p-6"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            role="dialog" aria-modal="true" aria-label="8월 도장 이벤트 결과"
          >
            <button
              onClick={close}
              aria-label="닫기"
              className="absolute top-4 right-4 w-8 h-8 rounded-full border border-ink-200 flex items-center
                         justify-center text-ink-400 pressable"
            >
              <X size={15} />
            </button>

            <span className="inline-block bg-lime text-ink text-[10px] font-bold tracking-[0.12em] px-2 py-1 rounded-full">
              AUGUST EVENT
            </span>
            <h2 className="text-[23px] font-bold text-ink tracking-[-0.03em] leading-[1.25] mt-3">
              8월 죽도 이벤트<br />결과 발표
            </h2>

            {/* 우승 도장 */}
            {first && (
              <div className="bg-block rounded-[14px] px-4 py-4 mt-4 text-center">
                <p className="text-white/40 text-[11px]">우승 도장</p>
                <p className="text-lime text-[24px] font-bold tracking-[-0.02em] mt-1">
                  {first.name}
                </p>
                <p className="text-white/60 text-[12px] mt-1">
                  관원 {first.new_members}명 · 죽도 10자루 🎋
                </p>
              </div>
            )}

            {/* 등수 */}
            <div className="mt-4">
              {top.map((t, i) => {
                const isMine = mine && t.id === mine.id;
                return (
                  <div
                    key={t.id}
                    className={`flex items-center gap-2.5 py-2.5 border-t border-ink-200
                                ${isMine ? 'bg-lime/25 -mx-2 px-2 rounded' : ''}`}
                  >
                    <span className="w-6 flex-none text-center text-[13px]">
                      {MEDAL[t.rank - 1] ?? <span className="text-ink-400 text-[12px]">{t.rank}</span>}
                    </span>
                    <p className={`min-w-0 flex-1 truncate text-[13px] ${i === 0 ? 'font-bold text-ink' : 'text-ink'}`}>
                      {t.name}
                      {isMine && <span className="text-ink-400 text-[11px] font-normal"> · 우리 도장</span>}
                    </p>
                    <span className="flex-none text-ink-400 text-[12px]">{t.new_members}명</span>
                  </div>
                );
              })}
            </div>

            <p className="text-ink-400 text-[11px] leading-[1.5] mt-3">
              8월 31일까지 등록된 관원 수 기준이에요.
              {stat?.participating_dojos > top.length && ` 총 ${stat.participating_dojos}개 도장이 참여했어요.`}
            </p>

            <button
              onClick={close}
              className="w-full bg-ink text-lime font-bold text-[15px] py-3.5 rounded-xl mt-4 pressable"
            >
              확인
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
