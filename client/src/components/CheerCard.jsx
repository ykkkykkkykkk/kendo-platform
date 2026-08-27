import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Flame } from 'lucide-react';
import { api } from '../api.js';
import { useToast } from '../context/ToastContext.jsx';
import { haptic } from '../utils/haptic.js';
import FanGradeBadge from './FanGradeBadge.jsx';

/** 'YYYY-MM-DD HH:MM:SS'(UTC) → Date. 서버가 이 형식으로 준다. */
const parseUtc = (s) => new Date(String(s).replace(' ', 'T') + 'Z');

/** 다음 응원까지 남은 시간을 사람 말로. */
function untilText(iso) {
  if (!iso) return '내일 다시 응원할 수 있어요';
  const ms = parseUtc(iso).getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return '지금 응원할 수 있어요';
  const hr  = Math.floor(ms / 3_600_000);
  const min = Math.floor((ms % 3_600_000) / 60_000);
  if (hr >= 1) return `${hr}시간 ${min}분 후 다시 응원할 수 있어요`;
  return `${Math.max(1, min)}분 후 다시 응원할 수 있어요`;
}

/* 하트를 누른 순간 위로 흩어지는 조각들. 순수 장식이라 상태는 갖지 않는다. */
function HeartBurst({ show }) {
  if (!show) return null;
  // 좌우로 조금씩 벌어지게 고정 오프셋을 준다(랜덤이면 렌더마다 튄다)
  const spread = [-26, -14, 0, 14, 26, -6];
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      {spread.map((dx, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0.9, y: 0, x: 0, scale: 0.6 }}
          animate={{ opacity: 0, y: -70 - i * 6, x: dx, scale: 1.15 }}
          transition={{ duration: 0.85, ease: 'easeOut', delay: i * 0.035 }}
          className="absolute text-lg"
        >
          ❤️
        </motion.span>
      ))}
    </div>
  );
}

/**
 * 오늘의 응원 카드 — 하트 버튼 + 누적 일수 + 등급 + 다음 등급까지.
 * 로그인 전에는 상태를 불러오지 않고 안내만 보여준다.
 */
export default function CheerCard({ playerId, playerName, user, onLoginRequest, onGradeUp }) {
  const { showToast } = useToast();

  const [st,      setSt]      = useState(null);   // 서버가 준 내 응원 상태
  const [busy,    setBusy]    = useState(false);
  const [burst,   setBurst]   = useState(false);

  useEffect(() => {
    if (!user || !playerId) { setSt(null); return; }
    let alive = true;
    api.cheerStatus(playerId)
      .then((d) => { if (alive && d && !d.error) setSt(d); })
      .catch(() => {});
    return () => { alive = false; };
  }, [user?.id, playerId]);

  const cheered = !!st?.cheeredToday;
  const days    = st?.days ?? 0;

  async function cheer() {
    if (!user) { onLoginRequest?.(); return; }
    if (busy || cheered) return;

    setBusy(true);
    haptic(12);
    try {
      const res  = await api.cheer(playerId);
      const data = await res.json();

      if (res.status === 409) {          // 다른 기기에서 이미 눌렀을 때
        setSt({ ...data, cheeredToday: true });
        showToast('오늘은 이미 응원했어요', 'info');
        return;
      }
      if (!res.ok) { showToast(data.error ?? '응원에 실패했습니다.', 'error'); return; }

      setSt({ ...data, cheeredToday: true });
      setBurst(true);
      setTimeout(() => setBurst(false), 1000);
      showToast('오늘 응원 완료!', 'success');

      if (data.gradeUp) onGradeUp?.(data);
    } catch {
      showToast('응원에 실패했습니다.', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-8">
      <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium mb-3">TODAY'S CHEER</p>

      <div className="pt-4" style={{ borderTop: '1.5px solid #111111' }}>
        <div className="flex items-center gap-4">
          {/* 하트 버튼 */}
          <div className="relative flex-none">
            <HeartBurst show={burst} />
            <motion.button
              onClick={cheer}
              disabled={busy || cheered}
              whileTap={cheered ? undefined : { scale: 0.88 }}
              aria-label={cheered ? '오늘 응원 완료' : '오늘의 응원 보내기'}
              className={`w-16 h-16 rounded-full flex items-center justify-center border-2 transition-colors ${
                cheered
                  ? 'bg-ink border-ink cursor-default'
                  : 'bg-lime border-ink hover:bg-lime-dark pressable'
              } disabled:opacity-100`}
            >
              <Heart
                size={26}
                strokeWidth={2}
                className={cheered ? 'text-white' : 'text-ink'}
                fill={cheered ? '#FFFFFF' : 'none'}
              />
            </motion.button>
          </div>

          {/* 상태 문구 */}
          <div className="min-w-0 flex-1">
            {!user ? (
              <>
                <p className="text-ink font-bold text-sm">매일 응원하고 팬 등급 올리기</p>
                <p className="text-ink-400 text-xs mt-1">로그인하면 오늘의 응원을 보낼 수 있어요</p>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 flex-wrap">
                  {days > 0 ? (
                    <span className="inline-flex items-center gap-1 text-ink font-bold text-sm">
                      <Flame size={14} className="text-ink" />
                      {days}일째 응원 중
                    </span>
                  ) : (
                    <span className="text-ink font-bold text-sm">첫 응원을 기다리고 있어요</span>
                  )}
                  <FanGradeBadge grade={st?.grade} size="sm" />
                </div>

                <p className="text-ink-400 text-xs mt-1">
                  {cheered
                    ? untilText(st?.nextResetAt)
                    : '하트를 눌러 오늘의 응원을 보내세요'}
                </p>

                {st?.nextLabel && (
                  <p className="text-ink-600 text-xs mt-1.5">
                    <span className="font-semibold text-ink">{st.nextLabel}</span>까지{' '}
                    <span className="font-semibold text-ink tabular-nums">{st.daysToNext}일</span> 남았어요
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {/* 다음 등급까지 진행 막대 — 등급이 있을 때만. 없는 동안은 숫자만으로 충분하다 */}
        {user && st?.nextGrade && days > 0 && (
          <div className="mt-4 h-1 bg-ink-200 overflow-hidden">
            <motion.div
              className="h-full bg-lime"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, (days / (days + st.daysToNext)) * 100)}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>
        )}
      </div>
    </section>
  );
}
