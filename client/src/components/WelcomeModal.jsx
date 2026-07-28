import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

const STEPS = [
  { emoji: '🎯', title: '1. 대회 순위를 맞혀요', desc: '대회 전에 1·2·3등을 미리 골라요. 맞히면 점수를 받아요.' },
  { emoji: '❤️', title: '2. 선수를 응원해요',   desc: '좋아하는 선수를 팔로우하면 그 선수 소식과 경기를 볼 수 있어요.' },
  { emoji: '🥋', title: '3. 우리 도장이 겨뤄요', desc: '내가 모은 점수가 우리 도장 점수가 돼요. 1등 도장은 현역 선수를 초청해요.' },
];

// 첫 방문 환영 팝업. open=false 로 바뀌면 AnimatePresence 가 페이드아웃.
export default function WelcomeModal({ open, onClose, onStart }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center px-5"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={onClose}
        >
          {/* 딤 배경 */}
          <div className="absolute inset-0 bg-black/50" />

          {/* 카드 */}
          <motion.div
            className="relative w-full max-w-[340px] bg-paper rounded-[20px] p-6"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* X */}
            <button
              onClick={onClose}
              aria-label="닫기"
              className="absolute top-4 right-4 w-8 h-8 rounded-full border border-ink-200 flex items-center
                         justify-center text-ink-400 pressable"
            >
              <X size={15} />
            </button>

            {/* 상단 */}
            <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium">MINOR—STAR®</p>
            <h2 className="text-[22px] font-bold text-ink tracking-tight leading-snug mt-2">
              검도가 이렇게<br />
              <span className="bg-lime px-1 box-decoration-clone">재밌었나?</span>
            </h2>
            <p className="text-ink-400 text-[13px] leading-relaxed mt-2.5">
              좋아하는 선수를 응원하고, 대회 결과를 맞히고, 우리 도장 순위를 올리는 곳이에요.
            </p>

            {/* 3단계 */}
            <div className="mt-4">
              {STEPS.map((s) => (
                <div key={s.title} className="flex gap-2.5 py-2.5 border-t border-ink-200">
                  <span className="text-[15px] leading-6 flex-shrink-0">{s.emoji}</span>
                  <div className="min-w-0">
                    <p className="text-ink font-bold text-[13px] leading-5">{s.title}</p>
                    <p className="text-ink-400 text-[12px] leading-[1.5] mt-0.5">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* 하단 */}
            <button
              onClick={onStart}
              className="w-full bg-ink text-lime font-bold text-[15px] py-3.5 rounded-xl mt-4 pressable"
            >
              시작하기
            </button>
            <p className="text-ink-400 text-[11px] text-center mt-2.5">
              닉네임이랑 도장 이름만 있으면 30초면 끝나요
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
