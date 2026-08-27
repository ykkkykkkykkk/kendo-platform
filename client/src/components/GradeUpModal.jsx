import { motion } from 'framer-motion';
import { styleOf } from '../utils/fanGrade.js';

/**
 * 등급이 오른 순간 한 번 뜨는 축하 모달.
 * 응원은 하루 한 번뿐이고 등급은 세 번밖에 안 오르므로, 이 순간만큼은 크게 띄운다.
 */
export default function GradeUpModal({ data, onClose }) {
  if (!data?.grade) return null;
  const s = styleOf(data.grade);
  if (!s) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 bg-ink/60 flex items-center justify-center px-8"
    >
      <motion.div
        initial={{ scale: 0.85, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 24 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-paper w-full max-w-[320px] p-7 text-center border-2 border-ink"
      >
        <motion.div
          initial={{ scale: 0, rotate: -25 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.12, type: 'spring', stiffness: 260, damping: 14 }}
          className="text-6xl leading-none"
        >
          {s.emoji}
        </motion.div>

        <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium mt-5">GRADE UP</p>
        <p className="text-ink font-bold text-xl mt-2 tracking-tight leading-snug">
          {data.playerName} {s.label}이<br />되었어요!
        </p>
        <p className="text-ink-600 text-sm mt-3">
          <span className="font-bold text-ink tabular-nums">{data.days}일</span> 동안 응원했어요
        </p>

        {data.nextLabel ? (
          <p className="text-ink-400 text-xs mt-4">
            {data.nextLabel}까지 {data.daysToNext}일 남았어요
          </p>
        ) : (
          <p className="text-ink-400 text-xs mt-4">최고 등급이에요. 프로필 찐팬 명단에 이름이 올라갑니다</p>
        )}

        <button
          onClick={onClose}
          className="mt-6 w-full py-3 bg-lime hover:bg-lime-dark text-ink text-sm font-bold pressable"
        >
          계속 응원하기
        </button>
      </motion.div>
    </motion.div>
  );
}
